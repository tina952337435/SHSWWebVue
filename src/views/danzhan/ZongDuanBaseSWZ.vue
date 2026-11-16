<template>
  <div class="zdb-swz">
    <div class="zdb-head">
      <span class="zdb-title">{{ stationName }}{{ typeName }}纵断面</span>
      <span v-if="pointCount" class="zdb-sub">测点数：{{ pointCount }}</span>
    </div>

    <div class="zdb-body">
      <div v-show="loading" class="zdb-state">数据加载中...</div>
      <div v-show="noData && !loading" class="zdb-state">暂无该站点数据</div>
      <div ref="chartEl" class="zdb-chart" v-show="!noData"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from "vue";
import * as echarts from "echarts";
import dayjs from "dayjs";
import { SetNull } from "@/api/ComUnit.js";
import { service as request } from "@/utils/request.js";

const props = defineProps({
  // 站点名（街口水文站 / 思源水文站 / 太师桥水文站）
  station: { type: String, default: "" },
  // 站点码（SWZHD.json 里的 stcd，也用于查水位）
  stcd: { type: String, default: "" },
  // 站名（如 太师桥 / 思源 / 街口）
  stnm: { type: String, default: "" },
  // 点击的是哪条线：左基点 / 右基点（仅用于标题展示）
  typeid: { type: String, default: "" },
});

const typeName = computed(() => props.typeid || "");

// 站点名兜底：优先 stnm，其次 station
const stationName = computed(() => {
  if (props.stnm) return props.stnm;
  return (props.station || "").replace(/水文站$/, "");
});

// 站点名 -> 水位站码（stcd 没传时兜底）
const STATION_STCD = {
  太师桥水文站: "63304700",
  思源水文站: "63304650",
  街口水文站: "70111400",
};

// 站点所在断面桩号（用于在纵断面上标注站点位置竖线）
const STATION_SECTION = {
  "70111400": { sttp: "JK005+846", dis: 5904.06 },   // 街口
  "63304650": { sttp: "SY005+039", dis: 5176.65 },   // 思源
  "63304700": { sttp: "TSQ004+871", dis: 5100.41 },  // 太师桥
};

const chartEl = ref(null);
const loading = ref(false);
const noData = ref(false);
const pointCount = ref(0);
let chart = null;

// public 目录 json：dev /json，prod 回退 /led/json
const _cache = {};
function loadJSON(name) {
  if (!_cache[name]) {
    _cache[name] = fetch("/json/" + name)
      .then((r) => {
        if (!r.ok) throw new Error("load " + name + " failed: " + r.status);
        return r.json();
      })
      .catch(() => fetch("/led/json/" + name).then((r) => r.json()));
  }
  return _cache[name];
}

// 水纹纹理图片（与 ZongDuanMianSWZ.vue 一致）
let _patternImgPromise = null;
function loadPatternImage() {
  if (!_patternImgPromise) {
    _patternImgPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        const fb = new Image();
        fb.onload = () => resolve(fb);
        fb.onerror = () => resolve(null);
        fb.src = "/led/images/riverjd.png";
      };
      img.src = "/images/riverjd.png";
    });
  }
  return _patternImgPromise;
}

// 兼容多种水位字段名（UPZ / Z / SW）
function pickUpz(item) {
  const keys = ["UPZ", "upz", "Z", "z", "SW", "sw"];
  for (const k of keys) {
    if (item[k] != null && item[k] !== "") {
      const v = Number(item[k]);
      if (isFinite(v)) return v;
    }
  }
  return null;
}

// 查询当前站点实时水位
async function loadWaterLevel(stcd) {
  if (!stcd) return null;
  const now = dayjs();
  const datasource = JSON.stringify({
    stime: now.format("YYYY-MM-DD 00:00:00"),
    etime: now.format("YYYY-MM-DD 23:59:59"),
    stcd: stcd,
  });
  try {
    const res = await request.post(
      "/tba226/apiserver/QreqyPostParam",
      {
        method: "rtsqbin/RTSQ_HDWATERSel",
        datasource: datasource,
        encrypt: "false",
      },
      { baseURL: "" }
    );
    const body = res && res.result;
    const list = Array.isArray(body)
      ? body
      : body && Array.isArray(body.rows)
      ? body.rows
      : [];
    for (const item of list) {
      const upz = pickUpz(item);
      if (upz != null) return upz;
    }
    return null;
  } catch (e) {
    console.error("[纵断面基点SWZ] 水位接口加载失败:", e);
    return null;
  }
}

// 读取主题 CSS 变量
function cssVar(name, fallback) {
  if (typeof window === "undefined" || !document.documentElement) return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function onResize() {
  if (chart) chart.resize();
}

onMounted(async () => {
  await nextTick();
  if (chartEl.value) {
    chart = echarts.init(chartEl.value);
    await renderChart();
    setTimeout(onResize, 250);
    window.addEventListener("resize", onResize);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
  if (chart) {
    chart.dispose();
    chart = null;
  }
});

async function renderChart() {
  loading.value = true;
  noData.value = false;
  try {
    const curStcd = SetNull(props.stcd) !== "" ? props.stcd : STATION_STCD[props.station] || "";

    const [list, patternImg, upz] = await Promise.all([
      loadJSON("SWZHD.json"),
      loadPatternImage(),
      loadWaterLevel(curStcd),
    ]);

    // 按 stcd 过滤；stcd 没传时退回按站点名过滤
    let pts = (Array.isArray(list) ? list : []).filter((p) => {
      if (curStcd) return String(p.stcd) === String(curStcd);
      return String(p.station) === props.station || String(p.stnm) === stationName.value;
    });

    if (!pts.length) {
      noData.value = true;
      return;
    }

    // 顺序 dis（桩号）
    pts = pts.sort((a, b) => Number(a.dis) - Number(b.dis));
    pointCount.value = pts.length;

    const disVals = pts.map((p) => Number(p.dis) || 0);
    const bedVals = pts.map((p) => Number(p.val));
    const xMin = Math.min(...disVals);
    const xMax = Math.max(...disVals);

    // 站点位置：优先按断面编号在数据里定位，匹配不到时回退到已知桩号
    const secCfg = STATION_SECTION[curStcd];
    let stationDis = null;
    if (secCfg) {
      const hit = pts.find((p) => String(p.sttp) === secCfg.sttp);
      stationDis = hit ? Number(hit.dis) : secCfg.dis;
    }

    // 默认视图：以站点竖线为中心，左右各 2000m；没有站点定位时展示全部
    const HALF_WINDOW = 2000;
    let zoomStart = xMin;
    let zoomEnd = xMax;
    if (stationDis != null) {
      zoomStart = Math.max(xMin, stationDis - HALF_WINDOW);
      zoomEnd = Math.min(xMax, stationDis + HALF_WINDOW);
    }

    const series = [];

    // 当前水位：横贯纵断面的水平水位线 + 蓝色水面填充（垫底，z:0）
    if (upz != null && isFinite(Number(upz))) {
      const upzNum = Number(upz);
      series.push({
        name: "水位",
        type: "line",
        data: [
          [xMin, upzNum],
          [xMax, upzNum],
        ],
        symbol: "none",
        lineStyle: { width: 2, color: "#00B0F0" },
        itemStyle: { color: "#00B0F0" },
        areaStyle: {
          origin: "start",
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(62,202,235,0.55)" },
            { offset: 1, color: "rgba(61,153,255,0.25)" },
          ]),
        },
        z: 0,
      });
    }

    // 河底高程纵断面（顺序 dis）
    series.push({
      name: "河底高程",
      type: "line",
      data: disVals.map((d, i) => [d, bedVals[i]]),
      smooth: true,
      symbol: "none",
      lineStyle: { width: 2 },
      itemStyle: patternImg
        ? { color: { image: patternImg, repeat: "repeat" } }
        : { color: "#3BE1F6" },
      areaStyle: {
        origin: "start",
        color: patternImg
          ? { image: patternImg, repeat: "repeat", opacity: 0.8 }
          : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(62,202,235,0.35)" },
              { offset: 1, color: "rgba(61,153,255,0.05)" },
            ]),
      },
      // 站点位置：一条与 y 轴平行的竖线，顶端是三角标 + 站点名称
      markLine:
        stationDis != null
          ? {
              silent: true, // 不参与点击
              symbol: ["none", "triangle"],
              symbolSize: [14, 14],
              animation: false,
              lineStyle: { color: "#00a3ff", type: "dashed", width: 1.5, opacity: 0.9 },
              label: {
                show: true,
                position: "end",
                distance: 6,
                rotate: 0,
                // 站点标签 + 当前水位放在一起
                formatter: () => {
                  let text = stationName.value;
                  if (upz != null && isFinite(Number(upz))) {
                    text += " {v|" + Number(upz).toFixed(2) + "}m";
                  }
                  return text;
                },
                rich: {
                  v: {
                    fontFamily: "number",
                    fontWeight: 600,
                    fontSize: 20,
                    color: cssVar("--mtablecolor", "#def1ff"),
                    padding: [0, 4, 0, 4],
                  },
                },
                color: cssVar("--mtablecolor", "#def1ff"),
                fontSize: 14,
                borderColor: "#3D99FF",
                borderWidth: 1,
                borderRadius: 3,
                padding: [6, 10, 4, 10],
              },
              data: [{ xAxis: stationDis }],
            }
          : undefined,
      z: 1,
    });

    chart.setOption(
      {
        backgroundColor: "transparent",
        tooltip: {
          trigger: "axis",
          formatter: (params) => {
            const arr = Array.isArray(params) ? params : [params];
            const bed = arr.find((d) => d.seriesName === "河底高程");
            if (!bed || bed.value == null) return "";
            const dis = bed.value[0];
            const val = bed.value[1];
            let html = "";
            html += "距离：" + dis + "m<br/>";
            html += "高程：" + Number(val).toFixed(2) + "m<br/>";
            if (upz != null && isFinite(Number(upz))) {
              html += "水位：" + Number(upz).toFixed(2) + "m<br/>";
              html += "水深：" + (Number(upz) - Number(val)).toFixed(2) + "m";
            }
            return html;
          },
        },
        grid: { left: 56, right: 30, top: 34, bottom: 64 },
        xAxis: {
          type: "value",
          min: xMin,
          max: xMax,
          name: "距离(m)",
          nameLocation: "middle",
          nameGap: 30,
          nameTextStyle: { color: "#9aa7b5" },
          axisLine: { lineStyle: { color: "#3a5566" } },
          axisLabel: { color: "#c9d4de", fontSize: 11, hideOverlap: true },
          splitLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
        },
        yAxis: {
          type: "value",
          scale: true,
          name: "高程(m)",
          nameTextStyle: { color: "#9aa7b5" },
          axisLine: { lineStyle: { color: "#3a5566" } },
          axisLabel: { color: "#c9d4de", fontSize: 11, hideOverlap: true },
          splitLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
        },
        dataZoom: [
          {
            type: "inside",
            xAxisIndex: 0,
            filterMode: "none",
            startValue: zoomStart,
            endValue: zoomEnd,
            zoomOnMouseWheel: true,
            moveOnMouseMove: true,
            moveOnMouseWheel: false,
          },
          {
            type: "slider",
            xAxisIndex: 0,
            left: 56,
            right: 30,
            bottom: 10,
            height: 24,
            startValue: zoomStart,
            endValue: zoomEnd,
            showDetail: false,
            brushSelect: false,
            borderColor: "rgba(59,225,246,0.45)",
            borderWidth: 1,
            backgroundColor: "rgba(10,32,52,0.55)",
            fillerColor: "rgba(59,225,246,0.22)",
            handleSize: 12,
            handleStyle: {
              color: "#3BE1F6",
              borderColor: "#3BE1F6",
              shadowBlur: 0,
            },
            moveHandleSize: 4,
            moveHandleStyle: { color: "rgba(59,225,246,0.65)" },
            dataBackground: {
              lineStyle: { color: "rgba(59,225,246,0.35)", width: 1 },
              areaStyle: { color: "rgba(59,225,246,0.1)" },
            },
            selectedDataBackground: {
              lineStyle: { color: "#3BE1F6", width: 1 },
              areaStyle: { color: "rgba(59,225,246,0.25)" },
            },
            textStyle: { color: "#9aa7b5", fontSize: 10 },
          },
        ],
        series,
      },
      true
    );
    chart.resize();

    if (document.fonts && document.fonts.load) {
      document.fonts
        .load('600 20px "number"')
        .then(() => chart && chart.resize())
        .catch(() => {});
    }
  } catch (e) {
    noData.value = true;
    console.error("[纵断面基点SWZ] 弹窗数据加载失败:", e);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.zdb-swz {
  color: #fff;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.zdb-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 2px 4px 8px;
  border-bottom: 1px solid rgba(59, 225, 246, 0.25);
}
.zdb-title {
  font-size: 16px;
  font-weight: bold;
  color: #3be1f6;
}
.zdb-sub {
  font-size: 13px;
  color: #9aa7b5;
}
.zdb-body {
  flex: 1;
  position: relative;
  min-height: 0;
}
.zdb-chart {
  width: 100%;
  height: 95%;
  min-height: 300px;
}
.zdb-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9aa7b5;
  font-size: 14px;
}
</style>
