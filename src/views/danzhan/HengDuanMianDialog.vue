<template>
  <div class="hdm-dialog">
    <div class="hdm-head">
      <span class="hdm-title">{{ riverTitle }}横断面</span>
      <span class="hdm-sttp">断面编号：{{ typeid }}</span>
      <span v-if="disText" class="hdm-sttp">距离：{{ disText }}km</span>
    </div>

    <div class="hdm-body">
      <div v-show="loading" class="hdm-state">数据加载中...</div>
      <div v-show="noData && !loading" class="hdm-state">暂无该断面数据</div>
      <div ref="chartEl" class="hdm-chart" v-show="!noData"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import * as echarts from "echarts";
import dayjs from "dayjs";
import { service as request } from "@/utils/request.js";

// 沿线测站（站名 / 站码 / 距离 km），太浦河与望虞河
const STATIONS = {
  TPZ: [
    { name: "太浦河河口", stcd: "63205300", dis: 0 },
    { name: "太浦闸", stcd: "63205311", dis: 2.8 },
    { name: "平望", stcd: "63205350", dis: 15.7 },
    { name: "金泽", stcd: "63403200", dis: 40.3 },
    { name: "练塘", stcd: "63403220", dis: 53.9 },
  ],
  WYH: [
    { name: "望亭(太)", stcd: "63201300", dis: 0 },
    { name: "望亭枢纽", stcd: "63202911", dis: 1.6 },
    { name: "琳桥", stcd: "63201320", dis: 12.9 },
    { name: "甘露", stcd: "63204250", dis: 21.8 },
    { name: "张桥", stcd: "63204260", dis: 31.5 },
    { name: "望虞闸", stcd: "63204301", dis: 62.3 },
  ],
};

const props = defineProps({
  // 河流标识：TPZ=太浦河，WYH=望虞河
  pathname: { type: String, default: "" },
  // 断面编号（对应数据里的 STTP 字段）
  typeid: { type: [String, Number], default: "" },
  // 距离 / 桩号（对应数据里的 DIS 字段，单位 km）
  dis: { type: [String, Number], default: "" },
});

const chartEl = ref(null);
const loading = ref(false);
const noData = ref(false);
let chart = null;

const riverTitle = computed(() => (props.pathname === "WYH" ? "望虞河" : "太浦河"));

const stationKey = computed(() => (props.pathname === "WYH" ? "WYH" : "TPZ"));

const disText = computed(() => {
  const d = Number(props.dis);
  return isFinite(d) ? String(d) : "";
});

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

// 水纹纹理图片（取自 TPHGCHPM.html 的 barImage），dev /images，prod 回退 /led/images
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
        fb.src = "/led/images/hdm-water-pattern.jpg";
      };
      img.src = "/images/hdm-water-pattern.jpg";
    });
  }
  return _patternImgPromise;
}

// 查询沿线测站实时水位（接口 mxsqbin/MXSQ_HDWATERSel，经 /tba226 代理 → 10.8.2.26）
// 返回 { stations, map }，map: stcd -> 水位数值
async function loadStationWaterLevel() {
  const stations = STATIONS[stationKey.value] || [];
  const map = {};
  if (!stations.length) return { stations, map };

  const now = dayjs();
  const datasource = JSON.stringify({
    stime: now.format("YYYY-MM-DD 00:00:00"),
    etime: now.format("YYYY-MM-DD 23:59:59"),
    stcd: stations.map((s) => s.stcd).join(","),
  });

  // 接口返回的原始水位（可能缺某些站）
  const raw = {};
  try {
    // 走 utils/request.js 的 service：自动带 Authorization，401 时自动刷新 token 并重试
    const res = await request.post(
      "/tba226/apiserver/QreqyPostParam",
      {
        method: "mxsqbin/MXSQ_HDWATERSel",
        datasource: datasource,
        encrypt: "false",
      },
      { baseURL: "" } // 覆盖默认 /api/ 前缀，保持 /tba226 原路径
    );

    const body = res && res.result;
    const list = Array.isArray(body)
      ? body
      : body && Array.isArray(body.rows)
      ? body.rows
      : [];
    list.forEach((item) => {
      const code = String(item.STCD != null ? item.STCD : item.stcd);
      const upz = pickUpz(item);
      if (code && upz != null) raw[code] = upz;
    });
  } catch (e) {
    console.error("[横断面] 水位接口加载失败:", e);
  }

  // 缺失的测站用「前一个站的水位」顶替，首个缺失则用 0
  let lastUpz = null;
  stations.forEach((s) => {
    const v = raw[s.stcd];
    if (v != null) {
      map[s.stcd] = v;
      lastUpz = v;
    } else {
      map[s.stcd] = lastUpz != null ? lastUpz : 0;
    }
  });

  return { stations, map };
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

// 有水位数据的测站，按距离升序排列为 [{ dis, upz }]
function sortedStations(stations, map) {
  return stations
    .filter((s) => map[s.stcd] != null)
    .map((s) => ({ dis: Number(s.dis), upz: map[s.stcd] }))
    .sort((a, b) => a.dis - b.dis);
}

// 在按距离升序的测站数组里，线性插值出 d(km) 处的水位
function interpAt(sorted, d) {
  if (!sorted.length) return null;
  if (d <= sorted[0].dis) return sorted[0].upz;
  const last = sorted[sorted.length - 1];
  if (d >= last.dis) return last.upz;
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (d >= a.dis && d <= b.dis) {
      if (b.dis === a.dis) return a.upz;
      return a.upz + (b.upz - a.upz) * ((d - a.dis) / (b.dis - a.dis));
    }
  }
  return sorted[0].upz;
}

function onResize() {
  if (chart) chart.resize();
}

onMounted(async () => {
  await nextTick();
  if (chartEl.value) {
    chart = echarts.init(chartEl.value);
    await renderChart();
    // 弹窗有过渡动画，延后一次 resize 保证尺寸正确
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
    const [data, patternImg, wl] = await Promise.all([
      loadData(),
      loadPatternImage(),
      loadStationWaterLevel(),
    ]);
    const { distances, elevations, markerSeries } = data;
    if (!distances.length) {
      noData.value = true;
      return;
    }

    // 当前断面水位（按桩号在相邻测站间插值）
    const disNum = Number(props.dis);
    const hasDis = props.dis !== "" && props.dis != null && isFinite(disNum);
    const upz = hasDis
      ? interpAt(sortedStations(wl.stations, wl.map), disNum)
      : null;

    chart.setOption(
      buildSectionOption(distances, elevations, markerSeries, patternImg, upz),
      true
    );
    chart.resize();
  } catch (e) {
    noData.value = true;
    console.error("[横断面] 弹窗数据加载失败:", e);
  } finally {
    loading.value = false;
  }
}

async function loadData() {
  const typeid = String(props.typeid);

  if (props.pathname === "WYH") {
    // 望虞河：剖面点云 + 高程/青坎标注（WYHHD.json）
    const [list, markerList] = await Promise.all([
      loadJSON("WYHPM.json"),
      loadJSON("WYHHD.json"),
    ]);
    const pts = list
      .filter((p) => String(p.sttp) === typeid)
      .sort((a, b) => Number(a.x) - Number(b.x));
    const markers = markerList.filter((p) => String(p.STTP) === typeid);
    return buildProfile(pts, "WYH", markers);
  }

  // 太浦河：剖面点云 + 高程/青坎标注
  const [list, markerList] = await Promise.all([
    loadJSON("TPHPM.json"),
    loadJSON("TPHPMMAX.json"),
  ]);
  const pts = list
    .filter((p) => String(p.sttp) === typeid)
    .sort((a, b) => Number(a.x) - Number(b.x));
  const markers = markerList.filter((p) => String(p.STTP) === typeid);
  return buildProfile(pts, "TPZ", markers);
}

function buildProfile(pts, river, markers) {
  const distances = pts.map((p) => Number(p.x));
  const elevations = pts.map((p) => Number(p.y));

  // pointid -> 索引（用于把 SPOINT 对到断面横坐标）
  const idxByPointid = {};
  pts.forEach((p, i) => {
    idxByPointid[String(p.pointid)] = i;
  });

  // 太浦河：左岸=北岸、右岸=南岸；望虞河：保持左岸/右岸
  const leftName = river === "TPZ" ? "北岸" : "左岸";
  const rightName = river === "TPZ" ? "南岸" : "右岸";

  const markerSeries = [];
  const mk = (label, color, arr, position) =>
    markerSeries.push({ label, color, data: arr, position: position || "top" });

  const leftGC = Array(pts.length).fill(null);
  const rightGC = Array(pts.length).fill(null);
  const leftQK = Array(pts.length).fill(null);
  const rightQK = Array(pts.length).fill(null);

  // 太浦河高程标注取「最高值」，望虞河取「高程」
  const gcLeft = river === "TPZ" ? "左岸最高值" : "高程";
  const gcRight = river === "TPZ" ? "右岸最高值" : "高程";

  (markers || []).forEach((m) => {
    const idx = idxByPointid[String(m.SPOINT)];
    if (idx === undefined) return;
    const val = Number(m.VAL);
    if (m.NAME === "左岸" && m.TYPEID === gcLeft) {
      leftGC[idx] = val;
    } else if (m.NAME === "右岸" && m.TYPEID === gcRight) {
      rightGC[idx] = val;
    } else if (m.NAME === "左岸" && m.TYPEID === "青坎") {
      leftQK[idx] = val;
    } else if (m.NAME === "右岸" && m.TYPEID === "青坎") {
      rightQK[idx] = val;
    }
  });

  mk(leftName + "高程", "#FF5A5A", leftGC, "top");
  mk(rightName + "高程", "#FF5A5A", rightGC, "top");
  mk(leftName + "青坎", "#F6A129", leftQK, "bottom");
  mk(rightName + "青坎", "#F6A129", rightQK, "bottom");

  return { distances, elevations, markerSeries };
}

// 横断面图：高程剖面 + 高程/青坎标注 + 当前水位标注（水位线 + 蓝色水面）
function buildSectionOption(distances, elevations, markerSeries, patternImg, upz) {
  const series = [];
  // 当前水位：横贯断面的水平水位线 + 蓝色水面填充（垫底）
  if (upz != null && isFinite(Number(upz))) {
    const upzNum = Number(upz);
    series.push({
      name: "水位",
      type: "line",
      data: distances.map(() => upzNum.toFixed(2)),
      smooth: true,
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
      markLine: {
        silent: true,
        symbol: "none",
        lineStyle: { color: "#00B0F0", type: "dashed", width: 1 },
        label: {
          show: true,
          position: "middle",
          formatter: "当前水位 " + upzNum.toFixed(2) + "m",
          color: "#fff",
          fontSize: 13,
          backgroundColor: "#3D99FF",
          borderRadius: 4,
          padding: [6, 10],
        },
        data: [{ yAxis: upzNum.toFixed(2) }],
      },
      z: 0,
    });
  }

  series.push({
    name: "高程",
    type: "line",
    data: elevations,
    smooth: true,
    symbol: "none",
    itemStyle: patternImg
      ? { color: { image: patternImg, repeat: "repeat" } }
      : { color: "#00B0F0" },
    lineStyle: { width: 2 },
    areaStyle: {
      origin: "start",
      color: patternImg
        ? { image: patternImg, repeat: "repeat", opacity: 0.8 }
        : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(62,202,235,0.6)" },
            { offset: 1, color: "rgba(61,153,255,0.08)" },
          ]),
    },
    z: 1,
  });
  series.push(
    ...markerSeries.map((m) => ({
      name: m.label,
      type: "line",
      data: m.data,
      symbol: "triangle",
      symbolSize: [20, 20],
      symbolRotate: 180,
      showSymbol: true,
      showAllSymbol: true,
      itemStyle: { color: m.color },
      lineStyle: { opacity: 0 },
      label: {
        show: true,
        position: m.position,
        color: "#ffffff",
        fontSize: 12,
        formatter: (d) => m.label + "：" + Number(d.value).toFixed(2) + "m",
      },
      z: 3,
    }))
  );

  return {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross", label: { backgroundColor: "#6a7985" } },
    },
    grid: { left: 48, right: 30, top: 34, bottom: 42 },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: distances.map((d) => d.toFixed(1)),
      name: "距离(m)",
      nameTextStyle: { color: cssVar("--mtablecolor", "#def1ff") },
      axisLine: { lineStyle: { color: "#3a5566" } },
      axisLabel: { color: cssVar("--mtablecolor", "#def1ff"), fontSize: 11, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      scale: true,
      name: "高程(m)",
      nameTextStyle: { color: cssVar("--mtablecolor", "#def1ff") },
      axisLine: { lineStyle: { color: "#3a5566" } },
      axisLabel: { color: cssVar("--mtablecolor", "#def1ff"), fontSize: 11, hideOverlap: true },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
    },
    series,
  };
}
</script>

<style scoped>
.hdm-dialog {
  color: #fff;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.hdm-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 2px 4px 8px;
  border-bottom: 1px solid rgba(59, 225, 246, 0.25);
}
.hdm-title {
  font-size: 16px;
  font-weight: bold;
  color: #3be1f6;
}
.hdm-sttp {
  font-size: 13px;
  color: var(--mtablecolor);
}
.hdm-body {
  flex: 1;
  position: relative;
  min-height: 0;
}
.hdm-chart {
  width: 100%;
  height: 100%;
  min-height: 320px;
}
.hdm-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--mtablecolor);
  font-size: 14px;
}
</style>
