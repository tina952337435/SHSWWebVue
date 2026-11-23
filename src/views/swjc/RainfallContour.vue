<template>
  <div class="rc">
    <!-- ============ 顶部条件栏 ============ -->
    <div class="rc-bar">
      <div class="rc-brand">
        <div class="rc-ic">☂</div>
        <div class="rc-tt">
          <div class="t1">降水等值线图</div>
          <div class="t2">全上海雨量站 · 反距离加权插值 · 等值线 / 等值面</div>
        </div>
      </div>

      <div class="rc-cond">
        <div class="rc-fld">
          <label>统计月份</label>
          <input v-model="month" type="month" />
        </div>

        <div class="rc-dim">
          <span v-for="d in DIMS" :key="d.k" :class="{ on: dim === d.k }" @click="setDim(d.k)">{{ d.n }}</span>
        </div>

        <select v-if="dim !== 'all'" v-model="dimSel" class="rc-sel">
          <option v-for="o in dimOptions" :key="o" :value="o">{{ o }}</option>
        </select>

        <div class="rc-dim">
          <span v-for="m in MODES" :key="m.k" :class="{ on: mode === m.k }" @click="mode = m.k">{{ m.n }}</span>
        </div>
      </div>

      <div class="rc-cnt">共 {{ stations.length }} 个雨量站</div>
    </div>

    <!-- ============ 地图 ============ -->
    <div class="rc-map" ref="mapWrap">
      <svg
        ref="mapRef"
        :viewBox="vb"
        preserveAspectRatio="xMidYMid meet"
        :style="{ cursor: dragging ? 'grabbing' : 'grab' }"
        @wheel.prevent="onWheel"
        @mousedown.prevent="onDown"
        @dblclick="resetView"
      >
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

        <!-- 等值面（按网格单元着色） -->
        <g v-if="showFace">
          <rect
            v-for="(c, i) in cells"
            :key="i"
            :x="c.x.toFixed(1)"
            :y="c.y.toFixed(1)"
            :width="(c.w + 0.4).toFixed(2)"
            :height="(c.h + 0.4).toFixed(2)"
            :fill="c.fill"
          />
        </g>

        <!-- 等值线 -->
        <g v-if="showLine">
          <path
            v-for="c in contourShapes"
            :key="c.level"
            :d="c.path"
            fill="none"
            stroke="#08306b"
            stroke-width="0.9"
            vector-effect="non-scaling-stroke"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity=".85"
          />
          <!-- 等值线数值标注 -->
          <g
            v-for="c in contourShapes"
            :key="'lbl' + c.level"
            :transform="`translate(${c.label.x.toFixed(1)} ${c.label.y.toFixed(1)}) scale(${scaleK}) translate(${(-c.label.x).toFixed(1)} ${(-c.label.y).toFixed(1)})`"
            pointer-events="none"
          >
            <text :x="c.label.x.toFixed(1)" :y="(c.label.y + 3).toFixed(1)" font-size="8" fill="#08306b" stroke="#fff" stroke-width="1.6" paint-order="stroke" text-anchor="middle" font-weight="700">{{ c.level }}</text>
          </g>
        </g>

        <!-- 雨量站 -->
        <g
          v-for="p in stationPoints"
          :key="p.code"
          style="cursor: pointer"
          :transform="`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${scaleK}) translate(${(-p.x).toFixed(1)} ${(-p.y).toFixed(1)})`"
          @mouseenter="showTip(p, $event)"
          @mouseleave="hideTip"
        >
          <circle :cx="p.x.toFixed(1)" :cy="p.y.toFixed(1)" r="2.6" :fill="p.color" stroke="#fff" stroke-width="0.8" />
        </g>
      </svg>

      <!-- 页面标题 -->
      <div class="rc-title">
        <div class="rt-main">上海市降水量等值线</div>
        <div class="rt-sub">{{ ym.y }} 年 {{ ym.m }} 月 · {{ dim === 'all' ? '全上海' : dimSel }} · {{ modeName }}</div>
      </div>

      <!-- 图例：色带 -->
      <div class="rc-legend">
        <div class="rc-lg-hd">月降水量 (mm)</div>
        <div class="rc-lg-bar" :style="barStyle"></div>
        <div class="rc-lg-ticks">
          <span v-for="l in RAIN_LEVELS" :key="l">{{ l }}</span>
        </div>
      </div>

      <div class="map-north" title="正北"><i></i><span>N</span></div>
      <div v-if="scaleBar" class="map-scale">
        <span class="num">{{ scaleBar.label }}</span>
        <i :style="{ width: scaleBar.w + 'px' }"></i>
      </div>

      <!-- 悬停提示 -->
      <div v-if="tip.show" class="map-tip" :style="{ left: tip.left + 'px', top: tip.top + 'px', display: 'block' }">
        <b>{{ tip.s.nm }}</b> <span style="opacity:.7">{{ tip.s.dist }}</span><br />
        月降水量 <b style="color:#0b4d8f">{{ tip.s.v }} mm</b>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { DISTRICTS, ALL_SLPS } from '@/data/stationNetwork'
import { rainPoints } from '@/data/rainContour'
import { idwGrid, allContours, bandColor, RAIN_LEVELS, RAIN_COLORS } from '@/utils/contour'

/* ================= 投影：上海2000 城建坐标 ================= */
const CJ = { ax: 95192.4, bx: -28.79, cx: -11561907.8, ay: 50.97, by: 110872.1, cy: -3469339.4 }
const CJ_DET = CJ.ax * CJ.by - CJ.bx * CJ.ay
const cjX = (lon, lat) => CJ.ax * lon + CJ.bx * lat + CJ.cx
const cjY = (lon, lat) => CJ.ay * lon + CJ.by * lat + CJ.cy
const cjLon = (x, y) => (CJ.by * (x - CJ.cx) - CJ.bx * (y - CJ.cy)) / CJ_DET
const cjLat = (x, y) => (CJ.ax * (y - CJ.cy) - CJ.ay * (x - CJ.cx)) / CJ_DET
const BBOX = { x0: -88000, x1: 82500, y0: -76000, y1: 79500 }
const MW = 1000
const X0 = BBOX.x0
const Y0 = BBOX.y1
const XS = BBOX.x1 - X0
const YS = Y0 - BBOX.y0
const MH = Math.round((MW * YS) / XS)
function proj(lon, lat) {
  return [((cjX(lon, lat) - X0) / XS) * MW, ((Y0 - cjY(lon, lat)) / YS) * MH]
}

/* ================= OneMap 底图瓦片 ================= */
const TILE_BASE = 'https://service-api.onemap.sh.cegn.cn/OneMapServer/rest/services/j01_basemap_normal/MapServer/tile'
const TILE_TOKEN = 'd01b7f932ff44c04bd0b026e9daaae97'
const WORLD = 40075016.69
const WORLD_HALF = 20037508.342787
const tileUrl = (z, r, c) => `${TILE_BASE}/${z}/${r}/${c}?jcmp-token=${TILE_TOKEN}`
const TILE_FALLBACK = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile'
const fallbackUrl = (z, x, y) => `${TILE_FALLBACK}/${z}/${y}/${x}`
const tileErr = ref(0)
const tileOk = ref(false)
const useFallback = computed(() => !tileOk.value && tileErr.value >= 3)
function onTileError() { if (!tileOk.value) tileErr.value += 1 }
function onTileLoad() { tileOk.value = true }

/* ================= 缩放 / 平移 ================= */
const mapRef = ref(null)
const mapWrap = ref(null)
const view = reactive({ x: 0, y: 0, w: MW, h: MH })
const vb = computed(() => `${view.x.toFixed(1)} ${view.y.toFixed(1)} ${view.w.toFixed(1)} ${view.h.toFixed(1)}`)
const scaleK = computed(() => Number((view.w / MW).toFixed(4)))
const scaleBar = computed(() => {
  if (!px.w || !view.w) return null
  const mPerPx = ((XS / MW) * view.w) / px.w
  if (!isFinite(mPerPx) || mPerPx <= 0) return null
  const steps = [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 50000, 100000, 200000]
  let best = steps[0]
  for (const s of steps) if (Math.abs(s / mPerPx - 90) < Math.abs(best / mPerPx - 90)) best = s
  return { w: Math.max(44, Math.round(best / mPerPx)), label: best >= 1000 ? `${best / 1000} km` : `${best} m` }
})
const ZMIN = 0.15
const dragging = ref(false)
const drag = { sx: 0, sy: 0, vx: 0, vy: 0 }

const px = reactive({ w: 0, h: 0 })
function measure() {
  const el = mapRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  px.w = r.width
  px.h = r.height
  if (!fitted && px.w && px.h) { fitted = true; fitView() } else if (fitted) setAspect()
}
function viewAR() { return px.w && px.h ? px.w / px.h : MW / MH }
let fitted = false
function fitView() {
  const ar = viewAR()
  const pad = 0.92
  let w = MW * pad
  let h = w / ar
  if (h < MH * pad) { h = MH * pad; w = h * ar }
  view.w = w
  view.h = h
  view.x = (MW - w) / 2
  view.y = (MH - h) / 2
}
function setAspect() {
  const ar = viewAR()
  const cx = view.x + view.w / 2
  const cy = view.y + view.h / 2
  view.h = view.w / ar
  view.x = cx - view.w / 2
  view.y = cy - view.h / 2
  clampView()
}
function fitScale() {
  if (!px.w || !px.h) return 1
  return Math.min(px.w / view.w, px.h / view.h)
}
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
  const cx = view.x + (e.clientX - r.left - ox) / s
  const cy = view.y + (e.clientY - r.top - oy) / s
  const ar = viewAR()
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
}
function onMove(e) {
  if (!dragging.value) return
  const dx = e.clientX - drag.sx
  const dy = e.clientY - drag.sy
  const s = fitScale()
  view.x = drag.vx - dx / s
  view.y = drag.vy - dy / s
  clampView()
}
function onUp() { dragging.value = false }
function resetView() { fitView() }

const tileZ = computed(() => {
  const v = Math.log2(((fitScale() * MW) / XS) * (WORLD / 256))
  return Math.max(3, Math.min(17, Math.ceil(v)))
})
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

/* ================= 条件 / 数据 ================= */
const DIMS = [
  { k: 'all', n: '全部' },
  { k: 'adm', n: '行政区' },
  { k: 'slp', n: '水利片' }
]
const MODES = [
  { k: 'both', n: '线+面' },
  { k: 'face', n: '等值面' },
  { k: 'line', n: '等值线' }
]

const month = ref('2026-10')
const dim = ref('all')
const dimSel = ref('')
const mode = ref('both')

const ym = computed(() => {
  const m = /^(\d{4})-(\d{2})$/.exec(month.value || '')
  return m ? { y: Number(m[1]), m: Number(m[2]) } : { y: 2026, m: 10 }
})
const dimOptions = computed(() => (dim.value === 'adm' ? DISTRICTS : ALL_SLPS))
function setDim(k) {
  dim.value = k
  if (k !== 'all') dimSel.value = dimOptions.value[0] || ''
}
const modeName = computed(() => (MODES.find((m) => m.k === mode.value) || {}).n || '')
const showFace = computed(() => mode.value === 'both' || mode.value === 'face')
const showLine = computed(() => mode.value === 'both' || mode.value === 'line')

const stations = computed(() => {
  const { y, m } = ym.value
  const list = rainPoints(y, m)
  if (dim.value === 'adm') return list.filter((s) => s.dist === dimSel.value)
  if (dim.value === 'slp') return list.filter((s) => s.slp === dimSel.value)
  return list
})

const stationPoints = computed(() =>
  stations.value.map((s) => {
    const [x, y] = proj(s.lon, s.lat)
    return { ...s, x, y, color: bandColor(s.v) }
  })
)

/* ================= 等值线 / 等值面 ================= */
const GX = 80
const GY = 73
const gridInfo = computed(() => {
  const pts = stationPoints.value
  if (pts.length < 3) return null
  return idwGrid(
    pts.map((p) => ({ x: p.x, y: p.y, v: p.v })),
    { nx: GX, ny: GY, x0: 0, y0: 0, x1: MW, y1: MH }
  )
})

const cells = computed(() => {
  const g = gridInfo.value
  if (!g) return []
  const out = []
  for (let j = 0; j < g.ny - 1; j++) {
    for (let i = 0; i < g.nx - 1; i++) {
      const v = (g.grid[j][i] + g.grid[j][i + 1] + g.grid[j + 1][i] + g.grid[j + 1][i + 1]) / 4
      out.push({ x: i * g.dx, y: j * g.dy, w: g.dx, h: g.dy, fill: bandColor(v) })
    }
  }
  return out
})

function labelPoint(segs) {
  let best = segs[0]
  let bx = -Infinity
  for (const s of segs) {
    const mx = (s.x1 + s.x2) / 2
    if (mx > bx) { bx = mx; best = s }
  }
  return { x: (best.x1 + best.x2) / 2, y: (best.y1 + best.y2) / 2 }
}

const contourShapes = computed(() => {
  if (!gridInfo.value) return []
  return allContours(gridInfo.value)
    .map((c) => ({
      level: c.level,
      path: c.segs.map((s) => `M${s.x1.toFixed(1)} ${s.y1.toFixed(1)}L${s.x2.toFixed(1)} ${s.y2.toFixed(1)}`).join(''),
      label: labelPoint(c.segs)
    }))
})

const barStyle = computed(() => `background: linear-gradient(to right, ${RAIN_COLORS.join(',')})`)

/* ================= 悬停提示 ================= */
const tip = reactive({ show: false, left: 0, top: 0, s: null })
function showTip(s, e) {
  tip.s = s
  tip.show = true
  const wr = mapWrap.value.getBoundingClientRect()
  let left = e.clientX - wr.left + 14
  let top = e.clientY - wr.top + 12
  if (left + 210 > wr.width) left = e.clientX - wr.left - 210
  tip.left = left
  tip.top = top
}
function hideTip() { tip.show = false }

let ro = null
onMounted(() => {
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
  measure()
  if (window.ResizeObserver && mapRef.value) {
    ro = new ResizeObserver(measure)
    ro.observe(mapRef.value)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseup', onUp)
  if (ro) ro.disconnect()
})
</script>

<style scoped>
.rc { display: flex; flex-direction: column; height: 100%; background: #e9eef4; }

/* ---------- 顶栏 ---------- */
.rc-bar {
  flex: none; display: flex; align-items: center; gap: 18px;
  height: 64px; padding: 0 18px; background: #fff; border-bottom: 1px solid var(--bnd);
}
.rc-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
.rc-ic {
  width: 34px; height: 34px; flex: none; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 18px; background: linear-gradient(135deg, #4da3e0, #1f6fb5);
  box-shadow: 0 4px 10px rgba(31, 111, 181, .26);
}
.rc-tt .t1 { font-size: 16px; font-weight: 700; color: #1f2d3d; line-height: 1.3; }
.rc-tt .t2 { font-size: 12px; color: #8a94a3; line-height: 1.4; }

.rc-cond { margin-left: 6px; display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.rc-fld { display: flex; align-items: center; gap: 8px; }
.rc-fld label { font-size: 13px; color: #5b6b7b; white-space: nowrap; }
.rc-fld input {
  width: 148px; height: 32px; padding: 0 10px; border: 1px solid #dbe2ea; border-radius: 6px;
  font-size: 14px; font-family: inherit; color: #303133; outline: none; background: #fff;
}
.rc-fld input:focus { border-color: #1f6fb5; box-shadow: 0 0 0 3px rgba(31, 111, 181, .12); }

.rc-dim { display: inline-flex; border: 1px solid #dbe2ea; border-radius: 6px; overflow: hidden; }
.rc-dim span {
  height: 32px; line-height: 32px; padding: 0 14px; font-size: 13px; color: #5b6b7b;
  cursor: pointer; user-select: none; background: #fff; border-left: 1px solid #dbe2ea;
  white-space: nowrap; transition: background .12s, color .12s;
}
.rc-dim span:first-child { border-left: none; }
.rc-dim span.on { background: #1f6fb5; color: #fff; }

.rc-sel {
  height: 32px; border: 1px solid #dbe2ea; border-radius: 6px; padding: 0 8px;
  font-size: 13px; font-family: inherit; color: #303133; background: #fff; outline: none; cursor: pointer;
}
.rc-sel:focus { border-color: #1f6fb5; }

.rc-cnt { flex: none; font-size: 13px; color: #8296a8; white-space: nowrap; }

/* ---------- 地图 ---------- */
.rc-map { flex: 1; position: relative; overflow: hidden; }
.rc-map svg { width: 100%; height: 100%; display: block; }
.rc-map image { filter: saturate(1.15) contrast(1.02) brightness(1.02); }
.rc-map::after {
  content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 4;
  box-shadow: inset 0 0 46px rgba(23, 88, 150, .13);
}

.rc-title {
  position: absolute; left: 12px; top: 12px; z-index: 6; pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, .97), rgba(255, 255, 255, .88));
  border: 1px solid rgba(31, 111, 181, .22); border-left: 3px solid #1f6fb5;
  border-radius: 6px; padding: 9px 14px; box-shadow: 0 3px 14px rgba(23, 50, 74, .12);
}
.rc-title .rt-main { font-size: 15px; font-weight: 700; color: #17324a; letter-spacing: .5px; }
.rc-title .rt-sub { font-size: 11px; color: #8296a8; margin-top: 3px; }

/* 图例 */
.rc-legend {
  position: absolute; left: 12px; bottom: 12px; z-index: 6;
  background: rgba(255, 255, 255, .94); border: 1px solid rgba(31, 111, 181, .22);
  border-radius: 6px; padding: 9px 12px 8px; box-shadow: 0 2px 10px rgba(23, 50, 74, .1);
}
.rc-lg-hd { font-size: 12px; font-weight: 700; color: #35506a; margin-bottom: 6px; }
.rc-lg-bar { width: 220px; height: 12px; border-radius: 2px; border: 1px solid #dbe2ea; }
.rc-lg-ticks { display: flex; justify-content: space-between; margin-top: 4px; }
.rc-lg-ticks span { font-size: 10px; color: #8296a8; font-variant-numeric: tabular-nums; }
</style>
