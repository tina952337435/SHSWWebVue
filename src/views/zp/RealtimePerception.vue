<template>
  <div class="realtime" :class="{ 'side-open': sideOpen }">
    <!-- ============ 地图（上海「一张图」OneMap 实景底图） ============ -->
    <div class="mapwrap" ref="mapWrap">
      <svg
        ref="mapRef"
        :viewBox="vb"
        preserveAspectRatio="xMidYMid meet"
        :style="{ cursor: dragging ? 'grabbing' : 'grab' }"
        @wheel.prevent="onWheel"
        @mousedown.prevent="onDown"
        @click="onMapClick"
        @dblclick="resetView"
      >
        <defs>
          <!-- 站点外发光 -->
          <radialGradient id="stGlow">
            <stop offset="0%" stop-color="#3ba4f2" stop-opacity=".4" />
            <stop offset="45%" stop-color="#3ba4f2" stop-opacity=".13" />
            <stop offset="100%" stop-color="#3ba4f2" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- 底图瓦片（上海城建坐标格网，与 OneMap tiled 服务一致） -->
        <rect :width="MW" :height="MH" fill="#e9eef4" />
        <image
          v-for="t in tiles"
          :key="t.k"
          :href="t.url"
          :x="t.x"
          :y="t.y"
          :width="t.w"
          :height="t.h"
          preserveAspectRatio="none"
          @load="onTileLoad"
          @error="onTileError"
        />

        <!-- 水利片区边界：常显，水利片区维度下高亮选中项 -->
        <g v-for="p in SLP" :key="p.n">
          <path
            :d="slpPath[p.n]"
            :fill="slpFill(p.n)"
            :stroke="slpStroke(p.n)"
            :stroke-width="slpWidth(p.n)"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
          <!-- 边界流动虚线：只在选中该片区时出现，避免满图虚线 -->
          <path
            v-if="slpOn(p.n)"
            :d="slpPath[p.n]"
            fill="none"
            stroke="#4aa9f0"
            stroke-width="1.3"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
            class="slp-flow"
          />
        </g>

        <!-- 行政区：底图自带区界，这里只叠加选中区的高亮，不重复画一套边界 -->
        <g v-if="FS.dim === 'adm'">
          <path
            v-for="name in admSel"
            :key="name"
            :d="distPath[name]"
            fill="rgba(1,125,228,.14)"
            stroke="#017de4"
            stroke-width="1.6"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </g>

        <!-- 片区名 -->
        <text
          v-for="l in slpLabels"
          :key="l.n"
          :x="l.x.toFixed(1)"
          :y="l.y.toFixed(1)"
          fill="#245c85"
          :font-size="8.5 * scaleK"
          text-anchor="middle"
          style="paint-order: stroke; stroke: #fff; stroke-width: 2.6px; pointer-events: none"
        >{{ l.n }}</text>

        <!-- 站点 -->
        <g
          v-for="(d, i) in rendered"
          :key="d.st.nm"
          style="cursor: pointer"
          :transform="`translate(${d.x.toFixed(1)} ${d.y.toFixed(1)}) scale(${scaleK}) translate(${(-d.x).toFixed(1)} ${(-d.y).toFixed(1)})`"
          @mouseenter="showTip(d.st, $event)"
          @mouseleave="hideTip"
          @click.stop="openProc(d.st)"
        >
          <circle :cx="d.x.toFixed(1)" :cy="d.y.toFixed(1)" :r="d.r + 8" fill="transparent" />

          <!-- 站点外发光（呼吸） -->
          <circle
            :cx="d.x.toFixed(1)"
            :cy="d.y.toFixed(1)"
            :r="(d.r * 2.4).toFixed(1)"
            fill="url(#stGlow)"
            class="st-glow"
            :style="{ animationDelay: ((i % 7) * 0.28).toFixed(2) + 's' }"
            pointer-events="none"
          />

          <!-- 流向：光晕拖尾 + 流动虚线 + 箭头 -->
          <g
            v-if="d.arrowRot != null"
            :transform="`translate(${d.x.toFixed(1)},${d.y.toFixed(1)}) rotate(${d.arrowRot})`"
            pointer-events="none"
          >
            <path :d="`M0,${-d.r - 1} L0,-20`" :stroke="d.c" stroke-width="4.2" stroke-linecap="round" opacity=".14" />
            <path class="fi-dash" :d="`M0,${-d.r - 1} L0,-20`" :stroke="d.c" stroke-width="1.6" stroke-linecap="round" />
            <path d="M0,-24 L3.1,-18.4 L-3.1,-18.4 Z" :fill="d.c" />
          </g>

          <!-- 选中圈 -->
          <circle
            v-if="d.on"
            :cx="d.x.toFixed(1)"
            :cy="d.y.toFixed(1)"
            :r="d.r + 5"
            fill="none"
            stroke="#017de4"
            stroke-width="1.4"
            opacity=".9"
          >
            <animate attributeName="r" :values="`${d.r + 3};${d.r + 8};${d.r + 3}`" dur="1.8s" repeatCount="indefinite" />
          </circle>

          <circle :cx="d.x.toFixed(1)" :cy="d.y.toFixed(1)" :r="d.r" :fill="d.c" stroke="#fff" stroke-width="1.2" />

          <!-- 标签 -->
          <g v-if="d.label" pointer-events="none">
            <rect
              :x="d.label[0].toFixed(1)"
              :y="(d.label[1] - 1).toFixed(1)"
              :width="d.w.toFixed(1)"
              :height="d.h"
              rx="2"
              :fill="d.on ? 'rgba(255,255,255,.97)' : 'rgba(255,255,255,.92)'"
              :stroke="d.on ? '#017de4' : 'rgba(1,125,228,.28)'"
              :stroke-width="d.on ? 1 : .6"
            />
            <text :x="(d.label[0] + 3.5).toFixed(1)" :y="(d.label[1] + 8.5).toFixed(1)" font-size="8" fill="#17324a">{{ d.st.nm }}</text>
            <text v-if="d.qt != null" :x="(d.label[0] + 3.5).toFixed(1)" :y="(d.label[1] + 18.5).toFixed(1)" font-size="8" :fill="d.qc">{{ d.qt }} m³/s</text>
          </g>
        </g>
      </svg>

      <!-- 图例：默认收起，点击展开 -->
      <div class="map-legend" :class="{ open: legendOpen }" @click.stop="legendOpen = !legendOpen">
        <div class="tl">图例 <span class="ar">{{ legendOpen ? '▾' : '▸' }}</span></div>
        <div v-show="legendOpen" class="lg-body">
          <div class="row"><i></i> 自有站</div>
          <div class="row"><i class="sh"></i> 共享站（外省市边界站）</div>
          <div class="row"><i class="rg"></i> 水利片区</div>
          <div class="row"><i class="arw"></i> 流向</div>
        </div>
      </div>

      <!-- 指北针 / 比例尺 -->
      <div class="map-north" title="正北"><i></i><span>N</span></div>
      <div v-if="scaleBar" class="map-scale">
        <span class="num">{{ scaleBar.label }}</span>
        <i :style="{ width: scaleBar.w + 'px' }"></i>
      </div>

      <!-- 悬停提示 -->
      <div v-if="tip.show" class="map-tip" :style="{ left: tip.left + 'px', top: tip.top + 'px', display: 'block' }">
        <b>{{ tip.st.nm }}</b> <span style="opacity: .7">{{ tip.st.riv || '—' }}</span><br />
        实时流量 <b>{{ tip.st.q == null ? '—' : nf(tip.st.q, 2) + ' m³/s' }}</b><br />
        <template v-if="tip.st.wrz != null">
          水位 <b>{{ nf(tip.st.wrz, 2) }} m</b>（警戒 {{ nf(tip.st.grz, 2) }} m）<br />
        </template>
        流向 <b>{{ tip.st.dir || '—' }}</b>{{ tip.st.dist ? '　' + tip.st.dist : '' }}<br />
        水利片区 <b>{{ slpIndex[tip.st.nm] || '—' }}</b>
      </div>

      <!-- 点击监测点：流量过程弹窗 -->
      <div v-if="proc.show" class="proc-mask" @click.self="closeProc">
        <div class="proc-pop" @click.stop>
          <div class="proc-hd">
            <div class="proc-title">
              <b>{{ proc.st.nm }}</b>
              <span>{{ proc.st.riv || '—' }} · {{ proc.st.code }}</span>
            </div>
            <button class="proc-x" type="button" title="关闭" @click="closeProc">×</button>
          </div>

          <div class="proc-tabs3">
            <span
              v-for="m in PROC_METRICS"
              :key="m.k"
              :class="{ on: proc.metric === m.k }"
              @click="proc.metric = m.k"
            >{{ m.n }}</span>
          </div>

          <div class="proc-cond">
            <label>
              开始
              <input v-model="proc.start" type="datetime-local" @change="onTimeChange('start')" />
            </label>
            <label>
              结束
              <input v-model="proc.end" type="datetime-local" @change="onTimeChange('end')" />
            </label>
            <div class="sc-tabs proc-step">
              <span
                v-for="s in PROC_STEPS"
                :key="s.k"
                class="sc-item"
                :class="{ on: proc.step === s.k }"
                @click="setStep(s.k)"
              >{{ s.n }}</span>
            </div>
          </div>

          <BarChart v-if="procData" :option="procOption" :height="240" />
          <div v-else class="proc-empty">{{ procEmptyText }}</div>

          <div class="proc-foot">
            <span v-if="procData">
              均值 {{ nf(procData.stats.avg, procMetric.dec) }}　最大 {{ nf(procData.stats.max, procMetric.dec) }}　最小 {{ nf(procData.stats.min, procMetric.dec) }}　最新 {{ nf(procData.stats.last, procMetric.dec) }} {{ procMetric.unit }}
            </span>
            <span class="tm">监测时间 {{ proc.st.tm || (SZ[0] && SZ[0].tm) }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧明细表伸缩按钮 -->
      <button
        class="side-tab"
        type="button"
        :title="sideOpen ? '收起明细表' : '展开明细表'"
        @click.stop="sideOpen = !sideOpen"
      >
        <span class="ico">{{ sideOpen ? '›' : '‹' }}</span>
        <span class="lb">{{ sideOpen ? '收起' : '明细' }}</span>
      </button>
    </div>

    <!-- ============ 右侧 ============ -->
    <div class="rt-side" v-show="sideOpen">
      <div class="stat-row">
        <div class="stat"><div class="k">断面总数</div><div class="v">{{ STN.length }}<small>个</small></div></div>
        <div class="stat"><div class="k">自有站</div><div class="v">{{ SZ.length }}<small>个</small></div></div>
        <div class="stat"><div class="k">共享站</div><div class="v">{{ OUT.length }}<small>个</small></div></div>
      </div>

      <div class="filterbar">
        <!-- 行政区 / 水利片区 二选一 -->
        <div class="fb-row">
          <span class="lb">维度</span>
          <div class="sc-tabs dimsw">
            <span
              v-for="d in DIMS"
              :key="d.k"
              class="sc-item"
              :class="{ on: FS.dim === d.k }"
              @click="setDim(d.k)"
            >{{ d.n }}</span>
          </div>
          <span class="fb-note">共 {{ visible.length }} / {{ STN.length }} 个断面</span>
        </div>

        <div class="fb-row">
          <span class="lb">{{ FS.dim === 'adm' ? '行政区' : '水利片区' }}</span>
          <div class="ms" :class="{ open: openMs === 'dim' }">
            <button class="ms-btn" type="button" @click.stop="toggleMs('dim')">{{ dimBtnText }} <i>▾</i></button>
            <div class="ms-panel">
              <label v-for="o in dimOptions" :key="o" class="ms-item">
                <input type="checkbox" :checked="curSel.includes(o)" @change="toggleFilter(o)" />
                <span>{{ o }}</span>
              </label>
              <label v-if="!dimOptions.length" class="ms-item muted">
                <span>{{ FS.dim === 'slp' ? '片区边界加载中…' : '暂无数据' }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="fb-row">
          <span class="lb">搜索</span>
          <input type="text" v-model="FS.kw" placeholder="站名 / 站码 / 河道" style="flex: 1" />
        </div>
      </div>

      <div class="card" style="flex: 1">
        <div class="hd">断面实时监测明细<span class="tag">监测时间 {{ SZ[0] && SZ[0].tm }}</span><ExportButton @export="exportCsv" style="margin-left:10px" /></div>
        <div class="bd" style="padding: 0">
          <table class="dt">
            <thead>
              <tr>
                <th style="width: 64px">序号</th>
                <th>断面名称</th>
                <th class="num" style="width: 120px">流量(m³/s)</th>
                <th>所在河道</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, i) in visible" :key="s.nm" :class="{ sel: FS.sel === s.nm }" @click="selectRow(s.nm)">
                <td class="muted">{{ i + 1 }}</td>
                <td><b>{{ s.nm }}</b></td>
                <td class="num">{{ s.q == null ? '—' : nf(s.q, 2) }}</td>
                <td>{{ s.riv || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { STN } from '@/data/stations'
import { DIST } from '@/data/districts'
import ExportButton from '@/components/ExportButton.vue'
import BarChart from '@/components/BarChart.vue'
import { downloadCsv } from '@/utils/csv'

const SZ = STN.filter((s) => s.sz)
const OUT = STN.filter((s) => !s.sz)

/* ================= 投影：上海2000 城建坐标（与一张图瓦片格网一致） ================= */
// 一张图的瓦片缓存按上海本地格网（城建坐标，单位米）编号，底图本身也是在这个
// 平面上渲染的。矢量数据必须换算到同一套城建坐标再画，才能和底图严丝合缝；
// 用经纬度 + 墨卡托投影叠上去，越往外围偏得越多（墨卡托在 31°N 放大约 1.17 倍）。
// 经纬度 → 城建坐标 的一阶变换由参考工程里同一套水利片区的「经纬度版」与
// 「2000 版」逐点拟合得到，残差 < 5 m。
const CJ = { ax: 95192.4, bx: -28.79, cx: -11561907.8, ay: 50.97, by: 110872.1, cy: -3469339.4 }
const CJ_DET = CJ.ax * CJ.by - CJ.bx * CJ.ay
const cjX = (lon, lat) => CJ.ax * lon + CJ.bx * lat + CJ.cx
const cjY = (lon, lat) => CJ.ay * lon + CJ.by * lat + CJ.cy
const cjLon = (x, y) => (CJ.by * (x - CJ.cx) - CJ.bx * (y - CJ.cy)) / CJ_DET
const cjLat = (x, y) => (CJ.ax * (y - CJ.cy) - CJ.ay * (x - CJ.cx)) / CJ_DET

const BBOX = { x0: -88000, x1: 82500, y0: -76000, y1: 79500 }  // 城建坐标范围（米）
const MW = 1000
const X0 = BBOX.x0                       // 视口左边界
const Y0 = BBOX.y1                       // 视口上边界（城建 y 最大）
const XS = BBOX.x1 - X0
const YS = Y0 - BBOX.y0
const MH = Math.round((MW * YS) / XS)    // 保持 1:1 比例，避免底图拉伸

function proj(lon, lat) {
  return [((cjX(lon, lat) - X0) / XS) * MW, ((Y0 - cjY(lon, lat)) / YS) * MH]
}
function pathOf(ring) {
  let d = ''
  ring.forEach((p, i) => {
    const xy = proj(p[0], p[1])
    d += (i ? 'L' : 'M') + xy[0].toFixed(2) + ',' + xy[1].toFixed(2)
  })
  return d + 'Z'
}

/* ================= OneMap 底图瓦片 ================= */
const TILE_BASE = 'https://service-api.onemap.sh.cegn.cn/OneMapServer/rest/services/j01_basemap_normal/MapServer/tile'
const TILE_TOKEN = 'd01b7f932ff44c04bd0b026e9daaae97'
// 一张图缓存把城建坐标（米）直接铺在与 Web 墨卡托同尺寸的世界格网上编号：
//   col = (x + 20037508.34) / 世界宽 × 2^级别
//   row = (20037508.34 − y) / 世界宽 × 2^级别
// 所以行列号直接由城建坐标算出，不需要任何额外偏移。
const WORLD = 40075016.69
const WORLD_HALF = 20037508.342787
const tileUrl = (z, r, c) => `${TILE_BASE}/${z}/${r}/${c}?jcmp-token=${TILE_TOKEN}`
// 备用浅色底图（标准 Web 墨卡托）：OneMap 不可用时自动顶上，按经纬度反算位置贴上
const TILE_FALLBACK = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile'
const fallbackUrl = (z, x, y) => `${TILE_FALLBACK}/${z}/${y}/${x}`
const tileErr = ref(0)
const tileOk = ref(false)
// 只有一张都没加载成功时才判定服务不可用；平移出上海范围导致的零星 404 不切底图
const useFallback = computed(() => !tileOk.value && tileErr.value >= 3)
function onTileError() { if (!tileOk.value) tileErr.value += 1 }
function onTileLoad() { tileOk.value = true }

/* ================= 地图缩放 / 平移 ================= */
const mapRef = ref(null)
const mapWrap = ref(null)
// 右侧明细表默认收起，只留地图；点地图右边缘的小标签拉出/收起
const sideOpen = ref(false)
// 图例默认收起，避免左下角常驻一大块白底
const legendOpen = ref(false)
const view = reactive({ x: 0, y: 0, w: MW, h: MH })
const vb = computed(() => `${view.x.toFixed(1)} ${view.y.toFixed(1)} ${view.w.toFixed(1)} ${view.h.toFixed(1)}`)
const scaleK = computed(() => Number((view.w / MW).toFixed(4)))
// 比例尺：按当前视口换算“米/像素”，取贴近 90px 的常用刻度
const scaleBar = computed(() => {
  if (!px.w || !view.w) return null
  const mPerPx = ((XS / MW) * view.w) / px.w
  if (!isFinite(mPerPx) || mPerPx <= 0) return null
  const steps = [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 50000, 100000, 200000]
  let best = steps[0]
  for (const s of steps) if (Math.abs(s / mPerPx - 90) < Math.abs(best / mPerPx - 90)) best = s
  return { w: Math.max(44, Math.round(best / mPerPx)), label: best >= 1000 ? `${best / 1000} km` : `${best} m` }
})
const ZMIN = 0.15        // 最小可视宽度（相对 MW）
const dragging = ref(false)
const drag = { sx: 0, sy: 0, vx: 0, vy: 0, moved: false }

// svg 实际像素尺寸（用于换算瓦片级别与拖拽比例）
const px = reactive({ w: 0, h: 0 })
function measure() {
  const el = mapRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  px.w = r.width
  px.h = r.height
  if (!fitted && px.w && px.h) { fitted = true; fitView() } else if (fitted) setAspect()
}
// 视口比例跟随容器：否则 SVG 会按数据范围留出上下/左右空白
function viewAR() {
  if (!px.w || !px.h) return MW / MH
  return px.w / px.h
}
let fitted = false
// 自适应：宽度取数据范围，高度按容器比例；容器更扁时反过来
function fitView() {
  const ar = viewAR()
  const pad = 0.9           // 默认视野比数据范围略小，等于往里放大一级
  let w = MW * pad
  let h = w / ar
  if (h < MH * pad) { h = MH * pad; w = h * ar }
  view.w = w
  view.h = h
  view.x = (MW - w) / 2
  view.y = (MH - h) / 2
}
// 容器尺寸变了：保持中心和宽度，只改高度
function setAspect() {
  const ar = viewAR()
  const cx = view.x + view.w / 2
  const cy = view.y + view.h / 2
  view.h = view.w / ar
  view.x = cx - view.w / 2
  view.y = cy - view.h / 2
  clampView()
}
// 当前「每绘制单位对应多少屏幕像素」
function fitScale() {
  if (!px.w || !px.h) return 1
  return Math.min(px.w / view.w, px.h / view.h)
}
// 视口可以比数据范围大（多露一点海面），数据始终留在视口内
function clampAxis(v, size, box) {
  if (size <= box) return Math.min(Math.max(0, v), box - size)
  return Math.min(Math.max(box - size, v), 0)
}
function clampView() {
  view.x = clampAxis(view.x, view.w, MW)
  view.y = clampAxis(view.y, view.h, MH)
}
function onWheel(e) {
  const el = mapRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const s = fitScale()
  const ox = (r.width - view.w * s) / 2
  const oy = (r.height - view.h * s) / 2
  // 鼠标位置换算成 SVG 坐标
  const cx = view.x + (e.clientX - r.left - ox) / s
  const cy = view.y + (e.clientY - r.top - oy) / s

  const ar = viewAR()
  // 最大缩放不能小于「铺满容器」的初始视口
  const wmax = Math.max(MW, MH * ar)
  const nw = Math.min(wmax, Math.max(MW * ZMIN, view.w * (e.deltaY < 0 ? 0.82 : 1.22)))
  const f = nw / view.w
  if (Math.abs(f - 1) < 1e-4) return
  view.x = cx - (cx - view.x) * f
  view.y = cy - (cy - view.y) * f
  view.w = nw
  view.h = nw / ar
  clampView()
}
function onDown(e) {
  if (e.button !== 0) return
  dragging.value = true
  drag.sx = e.clientX; drag.sy = e.clientY
  drag.vx = view.x; drag.vy = view.y
  drag.moved = false
}
function onMove(e) {
  if (!dragging.value) return
  const dx = e.clientX - drag.sx
  const dy = e.clientY - drag.sy
  if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return
  drag.moved = true
  const s = fitScale()
  view.x = drag.vx - dx / s
  view.y = drag.vy - dy / s
  clampView()
}
function onUp() { dragging.value = false }
function resetView() { fitView() }

/* 瓦片级别：让一张 256px 瓦片在屏幕上约等于 256px，宁可清晰不模糊 */
const tileZ = computed(() => {
  // 屏幕上「1 城建米」占多少像素 → 一张 256px 瓦片该用哪一级
  const v = Math.log2(((fitScale() * MW) / XS) * (WORLD / 256))
  return Math.max(3, Math.min(17, Math.ceil(v)))
})
// 视口四角换算成城建坐标（供底图取瓦片、备用底图定位共用）
function viewBoxCJ() {
  const gx0 = X0 + (view.x / MW) * XS
  const gx1 = X0 + ((view.x + view.w) / MW) * XS
  const gy1 = Y0 - (view.y / MH) * YS
  const gy0 = Y0 - ((view.y + view.h) / MH) * YS
  return { gx0, gx1, gy0, gy1 }
}
const tiles = computed(() => {
  const z = tileZ.value
  const n = 2 ** z
  const out = []
  const { gx0, gx1, gy0, gy1 } = viewBoxCJ()

  if (useFallback.value) {
    // 备用底图是标准 Web 墨卡托瓦片：按经纬度反算它在城建平面上该摆的位置
    const toLon = (c) => (c / n) * 360 - 180
    const toLat = (r) => {
      const m = 0.5 - r / n
      return (Math.atan(Math.sinh(m * 2 * Math.PI)) * 180) / Math.PI
    }
    const mX = (lon) => (lon + 180) / 360
    const mY = (lat) => {
      const s = Math.sin((lat * Math.PI) / 180)
      return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)
    }
    const lonW = cjLon(gx0, (gy0 + gy1) / 2)
    const lonE = cjLon(gx1, (gy0 + gy1) / 2)
    const latN = cjLat((gx0 + gx1) / 2, gy1)
    const latS = cjLat((gx0 + gx1) / 2, gy0)
    const tx0 = Math.floor(mX(lonW) * n)
    const tx1 = Math.floor(mX(lonE) * n)
    const ty0 = Math.floor(mY(latN) * n)
    const ty1 = Math.floor(mY(latS) * n)
    for (let ty = Math.max(0, ty0); ty <= Math.min(n - 1, ty1); ty++) {
      for (let tx = Math.max(0, tx0); tx <= Math.min(n - 1, tx1); tx++) {
        const lonL = toLon(tx), lonR = toLon(tx + 1)
        const latT = toLat(ty), latB = toLat(ty + 1)
        const mLon = (lonL + lonR) / 2, mLat = (latT + latB) / 2
        const xL = cjX(lonL, mLat), xR = cjX(lonR, mLat)
        const yT = cjY(mLon, latT), yB = cjY(mLon, latB)
        out.push({
          k: `f${z}/${tx}/${ty}`,
          url: fallbackUrl(z, tx, ty),
          x: ((xL - X0) / XS) * MW,
          y: ((Y0 - yT) / YS) * MH,
          w: ((xR - xL) / XS) * MW + 0.4,
          h: ((yT - yB) / YS) * MH + 0.4
        })
      }
    }
    return out
  }

  // 一张瓦片覆盖 t 米（城建坐标），行列号直接由城建坐标换算
  const t = WORLD / n
  const c0 = Math.floor((gx0 + WORLD_HALF) / t)
  const c1 = Math.floor((gx1 + WORLD_HALF) / t)
  const r0 = Math.floor((WORLD_HALF - gy1) / t)
  const r1 = Math.floor((WORLD_HALF - gy0) / t)
  const bw = (t / XS) * MW
  const bh = (t / YS) * MH
  for (let cr = Math.max(0, r0); cr <= Math.min(n - 1, r1); cr++) {
    for (let cc = Math.max(0, c0); cc <= Math.min(n - 1, c1); cc++) {
      out.push({
        k: `${z}/${cr}/${cc}`,
        url: tileUrl(z, cr, cc),
        x: (((cc * t - WORLD_HALF) - X0) / XS) * MW,
        y: ((Y0 - (WORLD_HALF - cr * t)) / YS) * MH,
        w: bw + 0.4,
        h: bh + 0.4
      })
    }
  }
  return out
})

/* ================= 水利片区（上海市水利片区边界） ================= */
const SLP = ref([])
const slpPath = computed(() => {
  const m = {}
  for (const p of SLP.value) m[p.n] = pathOf(p.r)
  return m
})
function inRing(ring, lon, lat) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
// 站点 → 水利片区（点面判断；落在水面上/界外的按最近片中心兜底）
const slpIndex = computed(() => {
  const map = {}
  if (!SLP.value.length) return map
  const cents = SLP.value.map((p) => {
    const n = p.r.length - 1
    let sx = 0, sy = 0
    for (let i = 0; i < n; i++) { sx += p.r[i][0]; sy += p.r[i][1] }
    return [sx / n, sy / n]
  })
  for (const s of STN) {
    if (s.lon == null || s.lat == null) continue
    let name = null
    for (const p of SLP.value) {
      if (inRing(p.r, s.lon, s.lat)) { name = p.n; break }
    }
    if (!name) {
      let bd = Infinity
      SLP.value.forEach((p, i) => {
        const d = Math.hypot(cents[i][0] - s.lon, cents[i][1] - s.lat)
        if (d < bd) { bd = d; name = p.n }
      })
    }
    map[s.nm] = name
  }
  return map
})
const SLPS = computed(() => SLP.value.map((p) => p.n))

// 片区名：默认不显示（满图片区名也是杂乱的来源之一），放大到约 2 倍或选中该片区时才出现
const slpLabels = computed(() => {
  const k = view.w / MW
  const zoomed = view.w <= MW * 0.5
  const placed = []
  const out = []
  for (const p of SLP.value) {
    if (!zoomed && !slpOn(p.n)) continue
    const n = p.r.length - 1
    let sx = 0, sy = 0
    for (let i = 0; i < n; i++) { sx += p.r[i][0]; sy += p.r[i][1] }
    const [x, y] = proj(sx / n, sy / n)
    const w = (p.n.length * 11 + 8) * k
    const h = 14 * k
    let ok = true
    for (const r of placed) {
      if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) { ok = false; break }
    }
    if (!ok) continue
    placed.push({ x, y, w, h })
    out.push({ n: p.n, x, y })
  }
  return out
})

/* 片区 / 行政区 着色 */
const slpOn = (n) => FS.dim === 'slp' && FS.slp.includes(n)
function slpFill(n) {
  if (slpOn(n)) return 'rgba(1,125,228,.14)'
  return 'transparent'
}
function slpStroke(n) {
  if (FS.dim === 'slp' && FS.slp.length) return slpOn(n) ? '#017de4' : 'rgba(1,125,228,.12)'
  return 'rgba(1,125,228,.26)'
}
function slpWidth(n) { return slpOn(n) ? 1.8 : 1 }
// 只画选中的行政区（底图已有区界），没选时不出任何行政区图层
const admSel = computed(() => (FS.dim === 'adm' ? FS.adm.filter((n) => DIST[n]) : []))

const distPath = {}
for (const [name, ring] of Object.entries(DIST)) distPath[name] = pathOf(ring)

function nf(v, d = 2) { return (v == null || isNaN(v)) ? '—' : Number(v).toFixed(d) }
// 图上站点统一配色，不再按流量正负 / 超警戒区分
const DOT_COLOR = '#017de4'

/* ================= 筛选 ================= */
const ADMS = Array.from(new Set(SZ.map((s) => s.dist).filter(Boolean))).sort()

const DIMS = [{ k: 'adm', n: '行政区' }, { k: 'slp', n: '水利片区' }]
const FS = reactive({ dim: 'adm', adm: [], slp: [], kw: '', sel: null })

// 行政区与水利片区互斥：切换维度时清空另一维度的选择
function setDim(k) {
  if (FS.dim === k) return
  FS.dim = k
  FS.adm.splice(0)
  FS.slp.splice(0)
  openMs.value = null
}

const curSel = computed(() => (FS.dim === 'adm' ? FS.adm : FS.slp))
const dimOptions = computed(() => (FS.dim === 'adm' ? ADMS : SLPS.value))
const dimBtnText = computed(() => {
  const n = curSel.value.length
  return n ? `已选 ${n} 项` : (FS.dim === 'adm' ? '全部' : '全部')
})

const visible = computed(() => STN.filter((s) => {
  if (FS.dim === 'adm' && FS.adm.length && !FS.adm.includes(s.dist)) return false
  if (FS.dim === 'slp' && FS.slp.length && !FS.slp.includes(slpIndex.value[s.nm])) return false
  if (FS.kw) {
    const k = FS.kw.toLowerCase()
    const hit = s.nm.toLowerCase().includes(k)
      || String(s.code).includes(k)
      || (s.riv || '').toLowerCase().includes(k)
    if (!hit) return false
  }
  return true
}))

// 地图上只画有坐标的站（外省市边界站无经纬度，仅在明细表中列出）
const mapStations = computed(() => visible.value.filter((s) => s.lon != null && s.lat != null))

// 站点图形按 k 反向缩放：放大地图时，站点/文字在屏幕上保持同样大小，密集区标签自动散开
// 估算 8px 字号下的文字宽度（中文按 8px、西文按 4.6px），用于标签避让
function textW(s) {
  let w = 0
  for (const ch of s) w += ch.charCodeAt(0) > 255 ? 8 : 4.6
  return w
}

const rendered = computed(() => {
  const k = view.w / MW
  // 概览时只标站名，放大到 1.2 倍以内才带流量，避免标签过宽糊满地图
  const showVal = view.w <= MW * 1.2
  const placed = []
  const tryPlace = (x, y, w, h, skip) => {
    for (let i = 0; i < placed.length; i++) {
      if (i === skip) continue
      const r = placed[i]
      if (x < r.x + r.w + 5 && x + w + 5 > r.x && y < r.y + r.h + 4 && y + h + 4 > r.y) return false
    }
    placed.push({ x, y, w, h }); return true
  }
  const pts = mapStations.value.map((st) => {
    const [x, y] = proj(st.lon, st.lat)
    return { st, x, y }
  })
  // 先把所有站点占位，标签不压别的站点（半径随 k 换算到 svg 坐标）
  for (const p of pts) {
    const rr = (p.st.q == null ? 2.6 : 3.2) + 5
    placed.push({ x: p.x - rr * k, y: p.y - rr * k, w: rr * 2 * k, h: rr * 2 * k })
  }
  return pts.map(({ st, x, y }, idx) => {
    const c = DOT_COLOR
    const on = FS.sel === st.nm
    const r = on ? 5 : (st.q == null ? 2.6 : 3.2)
    const arrowRot = st.deg != null ? st.deg : null

    const nmw = textW(st.nm) + 7
    const qt = showVal && st.q != null ? nf(st.q, st.q % 1 ? 2 : 0) : null
    const qw = qt != null ? textW(qt + ' m³/s') + 7 : 0
    const w = Math.max(nmw, qw)
    const h = qt != null ? 23 : 13
    // 碰撞检测用「视觉坐标」（已乘 k）
    const bw = w * k
    const bh = h * k
    // 四个对角候选位（右上/左上/右下/左下）；选中站点圆点更大，标签再外移一点
    const g = on ? 2 : 0
    const cands = [
      { ox: 7 + g, oy: -15 - g, v: [1, -1] },
      { ox: -w - 7 - g, oy: -15 - g, v: [-1, -1] },
      { ox: 7 + g, oy: 5 + g, v: [1, 1] },
      { ox: -w - 7 - g, oy: 5 + g, v: [-1, 1] }
    ]
    // 有流向箭头的站：标签优先放箭头反方向，避免盖住箭头
    if (arrowRot != null) {
      const rad = (arrowRot * Math.PI) / 180
      const ax = Math.sin(rad), ay = -Math.cos(rad)
      cands.sort((a, b) => (a.v[0] * ax + a.v[1] * ay) - (b.v[0] * ax + b.v[1] * ay))
    }
    let pos = null
    for (const c of cands) {
      if (tryPlace(x + c.ox * k, y + c.oy * k, bw, bh, idx)) { pos = c; break }
    }
    if (!pos && on) pos = cands[0]
    // 绘制坐标 = 站点 + 标签偏移（outer group 内会再按 k 缩放，屏幕偏移即 ox/oy）
    const label = pos ? [x + pos.ox, y + pos.oy] : null
    const qc = '#0b6bb5'
    return { st, x, y, c, r, on, arrowRot, qt, qc, w, h, label }
  })
})

// 筛选下拉
const openMs = ref(null)
function toggleMs(k) { openMs.value = openMs.value === k ? null : k }
function toggleFilter(v) {
  const arr = curSel.value
  const i = arr.indexOf(v)
  if (i >= 0) arr.splice(i, 1)
  else arr.push(v)
}

// 选中高亮（放大 + 脉冲圈 + 表格行）只保留 SEL_MS，几秒后自动消失；改时长只改这一处
const SEL_MS = 3000
let selTimer = null
function clearSel() {
  if (selTimer) { clearTimeout(selTimer); selTimer = null }
  FS.sel = null
}
function setSel(nm) {
  if (selTimer) { clearTimeout(selTimer); selTimer = null }
  FS.sel = FS.sel === nm ? null : nm
  if (FS.sel != null) {
    selTimer = setTimeout(() => { FS.sel = null; selTimer = null }, SEL_MS)
  }
}

/* ================= 点击监测点：流量过程弹窗 ================= */
// maxDays 限制单次查询跨度，避免 5 分钟粒度一次取太多点
const PROC_STEPS = [
  { k: '5min', n: '5分钟', step: 5 * 60 * 1000, maxDays: 7 },
  { k: 'day', n: '日均', step: 24 * 60 * 60 * 1000, maxDays: 365 * 5 }
]
// 过程线页签：流量 / 水位 / 降雨
const PROC_METRICS = [
  { k: 'q', n: '流量过程', s: '流量', unit: 'm³/s', color: '#017de4', dec: 2 },
  { k: 'z', n: '水位过程', s: '水位', unit: 'm', color: '#26a869', dec: 2 },
  { k: 'rain', n: '降雨过程', s: '降雨', unit: 'mm', color: '#16b8b0', dec: 1 }
]
const proc = reactive({ show: false, st: null, start: '', end: '', step: '5min', metric: 'q' })

function p2(v) { return String(v).padStart(2, '0') }
// datetime-local 需要 YYYY-MM-DDTHH:mm
function toInput(d) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`
}
// 以监测时间作为默认结束时间
function procNow() {
  const st = proc.st
  const tm = (st && st.tm) || (SZ[0] && SZ[0].tm)
  const d = tm ? new Date(String(tm).replace(' ', 'T')) : new Date()
  return isNaN(d.getTime()) ? new Date() : d
}
const procStep = computed(() => PROC_STEPS.find((s) => s.k === proc.step) || PROC_STEPS[0])
// 起止时间 → 毫秒；不合法（空、结束 ≤ 开始）时不出图
const procSpan = computed(() => {
  const s = new Date(proc.start).getTime()
  const e = new Date(proc.end).getTime()
  if (isNaN(s) || isNaN(e) || e <= s) return null
  return { s, e }
})
const procMetric = computed(() => PROC_METRICS.find((m) => m.k === proc.metric) || PROC_METRICS[0])
const procEmptyText = computed(() => {
  if (proc.metric === 'q' && proc.st && proc.st.q == null) return '该断面暂无流量监测数据'
  return '请选择有效的起止时间'
})

function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
// 线性同余，保证同一断面的过程线每次打开一致
function rng(seed) {
  let s = seed >>> 0
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
}

// 演示版没有历史表：以当前值（流量 q / 水位 wrz）为锚点生成确定性过程；
// 降雨没有实时值，按「站码 + 绝对时间」生成雨强，5 分钟看时段雨量、日均看日雨量。
// 正式版换成历史数据接口即可（结构不变）。
const procData = computed(() => {
  const st = proc.st
  const span = procSpan.value
  const m = procMetric.value
  if (!st || !span) return null
  if (m.k === 'q' && st.q == null) return null
  const cfg = procStep.value
  const count = Math.min(Math.floor((span.e - span.s) / cfg.step) + 1, 2100)
  const salt = hashStr(String(st.code || st.nm))
  const rand = rng(salt)
  const isDay = cfg.k === 'day'
  const tidal = !isDay && /长江|黄浦江|苏州河|吴淞江|蕴藻浜|淀浦河/.test(st.riv || '')
  const phase = rand() * Math.PI * 2
  const phase2 = rand() * Math.PI * 2
  // 5 分钟粒度：流量按比例起伏，水位按米数起伏；潮汐站加 12.42h 分量
  const amp5 = m.k === 'z' ? 0.05 + rand() * 0.08 : 0.08 + rand() * 0.07
  const tide5 = m.k === 'z'
    ? (tidal ? 0.18 + rand() * 0.35 : 0.02 + rand() * 0.03)
    : (tidal ? 0.05 + rand() * 0.05 : 0.015)
  const noise5 = m.k === 'z' ? 0.008 + rand() * 0.01 : 0.012 + rand() * 0.012

  const pts = []
  let prevF = null
  for (let i = 0; i < count; i++) {
    const hoursBefore = ((count - 1 - i) * cfg.step) / 3600000
    const t = new Date(span.e - hoursBefore * 3600000)
    let f
    if (isDay) {
      // 日均：日变化被平均掉，留下多日涨落
      f = (m.k === 'z' ? 0.12 : 0.10) * Math.sin((hoursBefore / (24 * 11)) * Math.PI * 2 + phase)
        + (m.k === 'z' ? 0.08 : 0.06) * Math.sin((hoursBefore / (24 * 29)) * Math.PI * 2 + phase2)
        + (rand() - 0.5) * (m.k === 'z' ? 0.04 : 0.03)
    } else {
      f = amp5 * Math.sin((hoursBefore / 24) * Math.PI * 2 + phase)
        + tide5 * Math.sin((hoursBefore / 12.42) * Math.PI * 2 + phase2)
        + (rand() - 0.5) * 2 * noise5
      f = prevF == null ? f : f * 0.55 + prevF * 0.45  // 平滑，避免锯齿
      prevF = f
    }
    pts.push({ t, f })
  }

  let vals
  if (m.k === 'rain') {
    // 逐小时雨强：约 8% 的小时下雨，雨峰集中在少数时次
    const rateOf = (ms) => {
      const hr = Math.floor(ms / 3600000)
      const r = rng(hashStr(`rain:${salt}:${hr}`))()
      return r > 0.92 ? Math.pow((r - 0.92) / 0.08, 2) * 12 : 0
    }
    if (isDay) {
      // 日雨量 = 当天 24 个逐小时雨强之和
      vals = pts.map(({ t }) => {
        // 用本地零点，避免 UTC 日界与 x 轴日期错一天
        const dayStart = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()
        let sum = 0
        for (let h = 0; h < 24; h++) sum += rateOf(dayStart + h * 3600000)
        return sum
      })
    } else {
      // 5 分钟雨量（mm）= 小时雨强 × 时段长度，雨峰内再拉开差距
      vals = pts.map(({ t }) => {
        const rate = rateOf(t.getTime())
        const jitter = 0.55 + rng(hashStr(`rainp:${salt}:${t.getTime()}`))() * 0.9
        return rate * (cfg.step / 3600000) * jitter
      })
    }
  } else {
    // 水位是加成（米），流量是比例变化；末点回到当前监测值
    const base = m.k === 'z' ? (st.wrz != null ? Number(st.wrz) : 2.2 + rand() * 1.6) : Number(st.q)
    const lastF = pts[pts.length - 1].f
    vals = pts.map((p) => (m.k === 'z' ? base + (p.f - lastF) : base * (1 + p.f - lastF)))
  }

  const sum = vals.reduce((a, b) => a + b, 0)
  const multiDay = span.e - span.s > 2 * 864e5
  const sameYear = new Date(span.s).getFullYear() === new Date(span.e).getFullYear()
  const labels = pts.map(({ t }) => {
    const md = `${p2(t.getMonth() + 1)}-${p2(t.getDate())}`
    if (isDay) return sameYear ? md : `${t.getFullYear()}-${md}`
    return multiDay ? `${md} ${p2(t.getHours())}:${p2(t.getMinutes())}` : `${p2(t.getHours())}:${p2(t.getMinutes())}`
  })
  return {
    labels,
    vals,
    stats: {
      avg: sum / vals.length,
      max: Math.max(...vals),
      min: Math.min(...vals),
      last: vals[vals.length - 1]
    }
  }
})

function niceStep(raw) {
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const n = raw / mag
  const k = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return k * mag
}
function flowAxis(vals, allowNeg = true) {
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  if (!isFinite(lo) || !isFinite(hi)) return { min: 0, max: 1, interval: 0.2, dec: 1 }
  if (!allowNeg) lo = Math.max(0, lo)
  if (hi - lo < 1e-6) {
    const d = Math.max(Math.abs(hi) * 0.2, allowNeg ? Math.abs(lo) * 0.05 : 0.5, 0.5)
    if (allowNeg) lo -= d
    hi += d
  }
  const pad = (hi - lo) * 0.12
  if (allowNeg) { lo -= pad; hi += pad } else { lo = Math.max(0, lo - pad); hi += pad }
  const step = niceStep((hi - lo) / 4)
  const dec = step >= 1 ? 0 : step >= 0.1 ? 1 : 2
  return {
    min: allowNeg ? Math.floor(lo / step) * step : Math.max(0, Math.floor(lo / step) * step),
    max: Math.ceil(hi / step) * step,
    interval: step,
    dec
  }
}

function hexA(hex, a) {
  const v = parseInt(String(hex).slice(1), 16)
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`
}

const procOption = computed(() => {
  const d = procData.value
  if (!d) return {}
  const m = procMetric.value
  const ax = flowAxis(d.vals, m.k !== 'q')
  const hasNeg = m.k === 'q' && ax.min < 0
  const c = m.color
  return {
    animationDuration: 400,
    grid: { left: 56, right: 18, top: 18, bottom: 32 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: 'rgba(1,125,228,.45)', type: 'dashed' } },
      formatter: (arr) => `${arr[0].axisValue}<br/>${m.s}：<b>${nf(arr[0].value, m.dec)}</b> ${m.unit}`
    },
    xAxis: {
      type: 'category',
      boundaryGap: m.k === 'rain',
      data: d.labels,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisLabel: { fontSize: 11, color: '#606266', margin: 10, hideOverlap: true }
    },
    yAxis: {
      type: 'value',
      min: ax.min,
      max: ax.max,
      interval: ax.interval,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 11, color: '#606266', formatter: (v) => Number(v).toFixed(ax.dec) },
      splitLine: { lineStyle: { color: '#f0f2f5' } }
    },
    series: [
      m.k === 'rain'
        ? {
            type: 'bar',
            barMaxWidth: procStep.value.k === 'day' ? 16 : 6,
            itemStyle: { color: c, borderRadius: [2, 2, 0, 0] },
            data: d.vals
          }
        : {
            type: 'line',
            smooth: 0.3,
            showSymbol: false,
            symbolSize: 5,
            lineStyle: { width: 2, color: c },
            itemStyle: { color: c },
            areaStyle: {
              color: {
                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: hexA(c, 0.22) },
                  { offset: 1, color: hexA(c, 0.02) }
                ]
              }
            },
            // 流量为负（倒流）时画一条 0 线，方向变化一眼可见
            markLine: hasNeg
              ? { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: '#c0c4cc', type: 'dashed', width: 1 }, data: [{ yAxis: 0 }] }
              : undefined,
            data: d.vals
          }
    ]
  }
})

function openProc(st) {
  if (drag.moved) { drag.moved = false; return }
  tip.show = false
  proc.st = st
  proc.metric = 'q'
  proc.step = '5min'
  const end = procNow()
  proc.end = toInput(end)
  proc.start = toInput(new Date(end.getTime() - 24 * 3600 * 1000))
  proc.show = true
  setSel(st.nm)
}

// 换粒度时把过短的区间自动拉长（日均至少看 7 天），并压到最大跨度内
function setStep(k) {
  if (proc.step === k) return
  proc.step = k
  const cfg = PROC_STEPS.find((s) => s.k === k) || PROC_STEPS[0]
  let s = new Date(proc.start).getTime()
  const e = new Date(proc.end).getTime()
  if (isNaN(s) || isNaN(e)) return
  if (k === 'day' && e - s < 7 * 864e5) s = e - 30 * 864e5
  if (e - s > cfg.maxDays * 864e5) s = e - cfg.maxDays * 864e5
  proc.start = toInput(new Date(s))
}

// 改起止时间：保证结束晚于开始，并把跨度限制在粒度允许的范围内
function onTimeChange(which) {
  const cfg = procStep.value
  const maxSpan = cfg.maxDays * 864e5
  let s = new Date(proc.start).getTime()
  let e = new Date(proc.end).getTime()
  if (isNaN(s) || isNaN(e)) return
  if (which === 'start') {
    if (s >= e) e = s + cfg.step
    if (e - s > maxSpan) e = s + maxSpan
    proc.end = toInput(new Date(e))
  } else {
    if (e <= s) s = e - cfg.step
    if (e - s > maxSpan) s = e - maxSpan
    proc.start = toInput(new Date(s))
  }
}

function closeProc() { proc.show = false }

// 点击地图空白处立即取消选中；拖动地图结束后的那次 click 不处理
function onMapClick() {
  if (drag.moved) { drag.moved = false; return }
  clearSel()
}

// 表格行点击不受地图拖拽状态影响（否则拖过地图后第一次点表格会被吞掉）
function selectRow(nm) {
  setSel(nm)
}

// Esc：先关过程弹窗，没有弹窗时再取消选中
function onKey(e) {
  if (e.key !== 'Escape') return
  if (proc.show) { closeProc(); return }
  clearSel()
}

function exportCsv() {
  const head = ['序号', '断面名称', '流量（m³/s）', '所在河道']
  const lines = visible.value.map((s, i) => [
    i + 1, s.nm, s.q == null ? '—' : nf(s.q, 2), s.riv || '—'
  ])
  downloadCsv('主要断面流量实时感知明细.csv', head, lines)
}

// 关闭下拉
function onDocClick(e) {
  if (!e.target.closest('.ms')) openMs.value = null
}

let ro = null
onMounted(async () => {
  document.addEventListener('click', onDocClick)
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
  window.addEventListener('keydown', onKey)
  measure()
  if (window.ResizeObserver && mapRef.value) {
    ro = new ResizeObserver(measure)
    ro.observe(mapRef.value)
  }
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/slp.json`)
    if (res.ok) SLP.value = await res.json()
  } catch (e) {
    // 片区边界不可用时，地图与其余筛选照常工作
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseup', onUp)
  window.removeEventListener('keydown', onKey)
  if (selTimer) { clearTimeout(selTimer); selTimer = null }
  if (ro) ro.disconnect()
})

// 悬停提示
const tip = reactive({ show: false, left: 0, top: 0, st: null })
function showTip(st, e) {
  tip.st = st
  tip.show = true
  const wr = mapWrap.value.getBoundingClientRect()
  let left = e.clientX - wr.left + 14
  let top = e.clientY - wr.top + 12
  if (left + 230 > wr.width) left = e.clientX - wr.left - 230
  tip.left = left
  tip.top = top
}
function hideTip() { tip.show = false }
</script>
