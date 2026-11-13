<template>
  <div class="realtime" :class="{ 'side-open': sideOpen }">
    <!-- ============ 地图 ============ -->
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
          <radialGradient id="wlGlow">
            <stop offset="0%" stop-color="#017de4" stop-opacity=".4" />
            <stop offset="45%" stop-color="#017de4" stop-opacity=".13" />
            <stop offset="100%" stop-color="#017de4" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="wlWarnGlow">
            <stop offset="0%" stop-color="#e5484d" stop-opacity=".45" />
            <stop offset="50%" stop-color="#e5484d" stop-opacity=".15" />
            <stop offset="100%" stop-color="#e5484d" stop-opacity="0" />
          </radialGradient>
          <filter id="wlMark" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.1" flood-color="#17324a" flood-opacity="0.3" />
          </filter>
        </defs>

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

        <!-- 站点 -->
        <g
          v-for="(d, i) in rendered"
          :key="d.s.name"
          style="cursor: pointer"
          :transform="`translate(${d.x.toFixed(1)} ${d.y.toFixed(1)}) scale(${scaleK}) translate(${(-d.x).toFixed(1)} ${(-d.y).toFixed(1)})`"
          @mouseenter="showTip(d.s, $event)"
          @mouseleave="hideTip"
          @click.stop="selectRow(d.s.name)"
        >
          <!-- 外发光 -->
          <circle
            :cx="d.x.toFixed(1)"
            :cy="d.y.toFixed(1)"
            :r="(d.r * 2.5).toFixed(1)"
            :fill="d.warn ? 'url(#wlWarnGlow)' : 'url(#wlGlow)'"
            class="st-glow"
            :style="{ animationDelay: ((i % 7) * 0.3).toFixed(2) + 's' }"
            pointer-events="none"
          />

          <!-- 低于目标：填充扩散脉冲 + 外圈 -->
          <g v-if="d.warn" pointer-events="none">
            <circle :cx="d.x.toFixed(1)" :cy="d.y.toFixed(1)" fill="rgba(229,72,77,.20)" :r="(d.r + 2).toFixed(1)">
              <animate attributeName="r" :values="`${d.r};${d.r + 16};${d.r}`" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values=".85;0;.85" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle :cx="d.x.toFixed(1)" :cy="d.y.toFixed(1)" fill="none" stroke="#e5484d" stroke-width="1.6" :r="(d.r + 2).toFixed(1)">
              <animate attributeName="r" :values="`${d.r + 2};${d.r + 16};${d.r + 2}`" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values=".95;0;.95" dur="1.6s" repeatCount="indefinite" />
            </circle>
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

          <!-- 点：国家重点河湖用菱形，上海市重点河道用圆 -->
          <template v-if="d.diamond">
            <rect
              :x="(d.x - d.r).toFixed(1)"
              :y="(d.y - d.r).toFixed(1)"
              :width="(d.r * 2).toFixed(1)"
              :height="(d.r * 2).toFixed(1)"
              :fill="d.c"
              stroke="#fff"
              stroke-width="1.2"
              filter="url(#wlMark)"
              :transform="`rotate(45 ${d.x.toFixed(1)} ${d.y.toFixed(1)})`"
            />
          </template>
          <circle v-else :cx="d.x.toFixed(1)" :cy="d.y.toFixed(1)" :r="d.r" :fill="d.c" stroke="#fff" stroke-width="1.2" filter="url(#wlMark)" />

          <!-- 标签 -->
          <g v-if="d.label" pointer-events="none">
            <rect
              :x="d.label[0].toFixed(1)"
              :y="(d.label[1] - 1).toFixed(1)"
              :width="d.w.toFixed(1)"
              :height="d.h"
              rx="2"
              :fill="d.on ? 'rgba(255,255,255,.97)' : 'rgba(255,255,255,.92)'"
              :stroke="d.warn ? 'rgba(229,72,77,.5)' : d.on ? '#017de4' : 'rgba(1,125,228,.28)'"
              :stroke-width="d.on ? 1 : .6"
            />
            <text :x="(d.label[0] + 3.5).toFixed(1)" :y="(d.label[1] + 8.5).toFixed(1)" font-size="8" fill="#17324a">{{ d.s.name }}</text>
            <text v-if="d.val != null" :x="(d.label[0] + 3.5).toFixed(1)" :y="(d.label[1] + 18.5).toFixed(1)" font-size="8" :fill="d.warn ? '#d43d42' : '#0b6bb5'">{{ d.val }}</text>
          </g>
        </g>
      </svg>

      <!-- 页面标题 -->
      <div class="wl-title">
        <div class="wt-main">河湖生态流量（水位）实时监测</div>
        <div class="wt-sub">上海市重点河道 9 · 国家重点河湖 3 · 监测时间 {{ WL_TIME }}</div>
      </div>

      <!-- 图例 -->
      <div class="map-legend" :class="{ open: legendOpen }" @click.stop="legendOpen = !legendOpen">
        <div class="tl">图例 <span class="ar">{{ legendOpen ? '▾' : '▸' }}</span></div>
        <div v-show="legendOpen" class="lg-body">
          <div class="row"><i class="ok"></i> 达标断面</div>
          <div class="row"><i class="warn"></i> 低于目标（跳动）</div>
          <div class="row"><i class="aux"></i> 国家重点河湖</div>
        </div>
      </div>

      <div class="map-north" title="正北"><i></i><span>N</span></div>
      <div v-if="scaleBar" class="map-scale">
        <span class="num">{{ scaleBar.label }}</span>
        <i :style="{ width: scaleBar.w + 'px' }"></i>
      </div>

      <!-- 悬停提示 -->
      <div v-if="tip.show" class="map-tip" :style="{ left: tip.left + 'px', top: tip.top + 'px', display: 'block' }">
        <b>{{ tip.s.name }}</b> <span style="opacity: .7">{{ tip.s.district || tip.s.note || '—' }}</span><br />
        <template v-if="tip.m">
          {{ tip.m.kind === 'z' ? '水位' : '日均流量' }}
          <b :style="{ color: tip.m.below ? '#d43d42' : '#017de4' }">{{ fmt(tip.m.cur, tip.m.kind === 'q' ? 0 : 2) }} {{ tip.m.unit }}</b>
          （目标 {{ fmt(tip.m.tgt, tip.m.kind === 'q' ? 0 : 2) }} {{ tip.m.unit }}）<br />
          <span :style="tip.m.below ? 'color:#d43d42' : 'color:#26a869'">{{ tip.m.below ? '▼ 低于目标' : '▲ 达标' }}</span>
          <template v-if="tip.s.cl != null">　·　氯离子 <b>{{ fmt(tip.s.cl, 0) }} mg/L</b></template>
        </template>
      </div>

      <!-- 明细表伸缩按钮 -->
      <button class="side-tab" type="button" :title="sideOpen ? '收起明细表' : '展开明细表'" @click.stop="sideOpen = !sideOpen">
        <span class="ico">{{ sideOpen ? '›' : '‹' }}</span>
        <span class="lb">{{ sideOpen ? '收起' : '明细' }}</span>
      </button>

      <!-- 预警发布按钮 -->
      <button class="wl-pub" type="button" @click.stop="openWarn">⚠ 预警发布</button>

      <!-- 预警发布弹窗 -->
      <div v-if="warnModal.show" class="wl-mask" @click.self="closeWarn">
        <div class="wl-pop" @click.stop>
          <div class="wl-pop-hd">
            <div>
              <div class="wl-pop-title">⚠ 预警发布</div>
              <div class="wl-pop-sub">对低于目标或预降水位的断面发布预警通知</div>
            </div>
            <button class="wl-x" type="button" @click="closeWarn">×</button>
          </div>
          <div class="wl-pop-bd">
            <div class="wl-field">
              <label>断面</label>
              <select v-model="warnModal.section">
                <option value="" disabled>请选择断面</option>
                <optgroup label="上海市重点河道">
                  <option v-for="s in WL_SECTIONS" :key="s.name" :value="s.name">{{ s.name }}（{{ s.district }}）</option>
                </optgroup>
                <optgroup label="国家重点河湖">
                  <option v-for="s in WL_AUX" :key="s.name" :value="s.name">{{ s.name }}</option>
                </optgroup>
              </select>
            </div>
            <div class="wl-field">
              <label>预降水位</label>
              <input v-model="warnModal.level" type="number" step="0.01" min="0" placeholder="0.00" />
              <span class="wl-unit">m</span>
            </div>
            <div class="wl-field">
              <label>情况说明</label>
              <textarea v-model="warnModal.desc" rows="4" placeholder="请说明预降原因（防汛预降 / 工程调度 / 突发水污染等）"></textarea>
            </div>
          </div>
          <div class="wl-pop-ft">
            <button class="wl-btn" type="button" @click="closeWarn">取消</button>
            <button class="wl-btn primary" type="button" :disabled="!warnModal.section" @click="submitWarn">发布</button>
          </div>
        </div>
      </div>

      <!-- 操作提示 toast -->
      <div v-if="toast.show" class="wl-toast">{{ toast.text }}</div>
    </div>

    <!-- ============ 右侧明细表 ============ -->
    <div class="rt-side" v-show="sideOpen">
      <div class="stat-row">
        <div class="stat"><div class="k">控制断面</div><div class="v">{{ WL_SECTIONS.length + WL_AUX.length }}<small>个</small></div></div>
        <div class="stat"><div class="k">达标</div><div class="v" style="color:#26a869">{{ meetCount }}<small>个</small></div></div>
        <div class="stat"><div class="k">低于目标</div><div class="v" style="color:#e5484d">{{ warnCount }}<small>个</small></div></div>
      </div>

      <div class="card" style="flex: none">
        <div class="hd">国家重点河湖<span class="tag">监测时间 {{ WL_TIME }}</span></div>
        <div class="bd" style="padding: 0">
          <table class="dt">
            <thead>
              <tr><th>站点</th><th>指标</th><th class="num">当前值</th><th class="num">目标值</th><th>状态</th></tr>
            </thead>
            <tbody>
              <tr v-for="a in auxRows()" :key="a.name">
                <td style="text-align:left">
                  <b>{{ a.name }}</b>
                  <div v-if="a.cl != null" class="muted" style="font-size:11px">氯离子 {{ fmt(a.cl, 0) }} mg/L</div>
                </td>
                <td class="muted">{{ a.metric }}</td>
                <td class="num">{{ fmt(a.cur, a.unit === 'm' ? 2 : 0) }} {{ a.unit }}</td>
                <td class="num">{{ fmt(a.tgt, a.unit === 'm' ? 2 : 0) }} {{ a.unit }}</td>
                <td><span :class="['tag', a.below ? 'warn' : 'ok']">{{ a.below ? '低于目标' : '达标' }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="flex: 1">
        <div class="hd">上海市重点河道<span class="tag">监测时间 {{ WL_TIME }}</span></div>
        <div class="bd" style="padding: 0">
          <table class="dt">
            <thead>
              <tr>
                <th style="width: 44px">序号</th>
                <th>断面名称</th>
                <th>所属区</th>
                <th class="num">水位(m)</th>
                <th class="num">目标(m)</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in sectionRows()" :key="r.name" :class="{ sel: FS.sel === r.name }" @click="selectRow(r.name)">
                <td class="muted">{{ r.idx }}</td>
                <td><b>{{ r.name }}</b></td>
                <td>{{ r.district }}</td>
                <td class="num" :class="{ neg: r.below }">{{ fmt(r.z, 2) }}</td>
                <td class="num">{{ fmt(r.target, 2) }}</td>
                <td>
                  <span v-if="r.below" class="tag warn">低于目标</span>
                  <span v-else class="tag ok">达标</span>
                </td>
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
import { WL_SECTIONS, WL_AUX, WL_ALL, WL_TIME, isBelow, stationMetric, sectionRows, auxRows } from '@/data/waterLevel'
import { publish } from '@/store/ecoWarnRecords'

/* ================= 投影：上海2000 城建坐标（与一张图瓦片格网一致） ================= */
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
const sideOpen = ref(false)
const legendOpen = ref(false)
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
const drag = { sx: 0, sy: 0, vx: 0, vy: 0, moved: false }

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
  const pad = 0.9
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

/* ================= 站点渲染 ================= */
// 地图上 = 9 个上海市重点河道 + 3 个国家重点河湖（大通 / 松浦大桥 / 淀山湖·元荡）
const mapAux = WL_AUX.filter((a) => a.lon != null && a.lat != null)
const allStations = [
  ...WL_SECTIONS.map((s) => ({ ...s, diamond: false })),
  ...mapAux.map((a) => ({ ...a, diamond: true }))
]

const FS = reactive({ sel: null })
const SEL_MS = 3000
let selTimer = null
function clearSel() {
  if (selTimer) { clearTimeout(selTimer); selTimer = null }
  FS.sel = null
}
function setSel(nm) {
  if (selTimer) { clearTimeout(selTimer); selTimer = null }
  FS.sel = FS.sel === nm ? null : nm
  if (FS.sel != null) selTimer = setTimeout(() => { FS.sel = null; selTimer = null }, SEL_MS)
}

function textW(s) {
  let w = 0
  for (const ch of s) w += ch.charCodeAt(0) > 255 ? 8 : 4.6
  return w
}

const meetCount = WL_ALL.filter((s) => !isBelow(s)).length
const warnCount = WL_ALL.filter((s) => isBelow(s)).length

const rendered = computed(() => {
  const k = view.w / MW
  const showVal = view.w <= MW * 1.6
  const placed = []
  const tryPlace = (x, y, w, h, skip) => {
    for (let i = 0; i < placed.length; i++) {
      if (i === skip) continue
      const r = placed[i]
      if (x < r.x + r.w + 5 && x + w + 5 > r.x && y < r.y + r.h + 4 && y + h + 4 > r.y) return false
    }
    placed.push({ x, y, w, h }); return true
  }
  const pts = allStations.map((s) => {
    const [x, y] = proj(s.lon, s.lat)
    return { s, x, y }
  })
  for (const p of pts) {
    const rr = (p.s.diamond ? 4 : 3.6) + 6
    placed.push({ x: p.x - rr * k, y: p.y - rr * k, w: rr * 2 * k, h: rr * 2 * k })
  }
  return pts.map(({ s, x, y }, idx) => {
    const m = stationMetric(s)
    const warn = !!m && m.below
    const c = warn ? '#e5484d' : s.diamond ? '#26a869' : '#017de4'
    const on = FS.sel === s.name
    const r = on ? 5 : s.diamond ? 4 : 3.6
    const val = m
      ? `${fmt(m.cur, m.kind === 'q' ? 0 : 2)} ${m.unit} · 目标 ${fmt(m.tgt, m.kind === 'q' ? 0 : 2)} ${m.unit}`
      : null
    const nmw = textW(s.name) + 7
    const vw = showVal && val ? textW(val) + 7 : 0
    const w = Math.max(nmw, vw)
    const h = showVal && val ? 23 : 13
    const bw = w * k
    const bh = h * k
    const g = on ? 2 : 0
    const cands = [
      { ox: 7 + g, oy: -15 - g },
      { ox: -w - 7 - g, oy: -15 - g },
      { ox: 7 + g, oy: 5 + g },
      { ox: -w - 7 - g, oy: 5 + g }
    ]
    let pos = null
    for (const c of cands) {
      if (tryPlace(x + c.ox * k, y + c.oy * k, bw, bh, idx)) { pos = c; break }
    }
    if (!pos && on) pos = cands[0]
    const label = pos ? [x + pos.ox, y + pos.oy] : null
    return { s, x, y, c, r, on, warn, diamond: s.diamond, val: (showVal ? val : null), w, h, label }
  })
})

function fmt(v, d = 2) { return (v == null || isNaN(v)) ? '—' : Number(v).toFixed(d) }

function onMapClick() {
  if (drag.moved) { drag.moved = false; return }
  clearSel()
}
function selectRow(nm) { setSel(nm) }

/* ================= 预警发布 ================= */
const warnModal = reactive({ show: false, section: '', level: '', desc: '' })
function openWarn() {
  warnModal.section = ''
  warnModal.level = ''
  warnModal.desc = ''
  warnModal.show = true
}
function closeWarn() { warnModal.show = false }
function submitWarn() {
  if (!warnModal.section) return
  publish({ section: warnModal.section, level: warnModal.level, desc: warnModal.desc })
  closeWarn()
  showToast(`预警已发布：${warnModal.section}${warnModal.level ? '（预降 ' + warnModal.level + ' m）' : ''}`)
}

const toast = reactive({ show: false, text: '' })
let toastTimer = null
function showToast(text) {
  toast.text = text
  toast.show = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.show = false }, 2400)
}

function onKey(e) {
  if (e.key !== 'Escape') return
  if (warnModal.show) { closeWarn(); return }
  clearSel()
}
function onDocClick(e) { if (!e.target.closest('.ms')) openMs.value = null }
const openMs = ref(null)

let ro = null
onMounted(() => {
  document.addEventListener('click', onDocClick)
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
  window.addEventListener('keydown', onKey)
  measure()
  if (window.ResizeObserver && mapRef.value) {
    ro = new ResizeObserver(measure)
    ro.observe(mapRef.value)
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseup', onUp)
  window.removeEventListener('keydown', onKey)
  if (selTimer) { clearTimeout(selTimer); selTimer = null }
  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null }
  if (ro) ro.disconnect()
})

// 悬停提示
const tip = reactive({ show: false, left: 0, top: 0, s: null, m: null })
function showTip(s, e) {
  tip.s = s
  tip.m = stationMetric(s)
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

<style scoped>
/* 地图标题 */
.wl-title {
  position: absolute; left: 12px; top: 12px; z-index: 6; pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, .97), rgba(255, 255, 255, .88));
  border: 1px solid rgba(1, 125, 228, .22); border-left: 3px solid #017de4;
  border-radius: 6px; padding: 9px 14px; box-shadow: 0 3px 14px rgba(23, 50, 74, .12);
}
.wl-title .wt-main { font-size: 15px; font-weight: 700; color: #17324a; letter-spacing: .5px; }
.wl-title .wt-sub { font-size: 11px; color: #8296a8; margin-top: 3px; }

/* 图例补充配色 */
.map-legend i.ok { background: #017de4; box-shadow: 0 0 0 2px rgba(1, 125, 228, .14); }
.map-legend i.warn { background: #e5484d; box-shadow: 0 0 0 2px rgba(229, 72, 77, .16); }
.map-legend i.aux {
  width: 9px; height: 9px; border-radius: 0; background: #26a869; transform: rotate(45deg);
  box-shadow: 0 0 0 2px rgba(38, 168, 105, .16); margin: 1px;
}

/* 表格状态标签 */
.tag.warn,
.tag.ok {
  display: inline-block; padding: 1px 8px; border-radius: 10px;
  font-size: 12px; line-height: 1.6; font-weight: 500;
}
.tag.warn { color: #d43d42; background: #fdecec; }
.tag.ok { color: #1f9d62; background: #e8f6ee; }

/* 预警发布按钮 */
.wl-pub {
  position: absolute; right: 10px; top: 58px; z-index: 6;
  display: flex; align-items: center; gap: 4px; height: 30px; padding: 0 15px;
  background: linear-gradient(180deg, #f5584e, #e5484d); color: #fff;
  font-size: 13px; font-weight: 700; border: none; border-radius: 15px; cursor: pointer;
  box-shadow: 0 3px 10px rgba(229, 72, 77, .35);
  transition: filter .15s ease;
}
.wl-pub:hover { filter: brightness(1.06); }

/* 预警发布弹窗 */
.wl-mask {
  position: absolute; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center;
  padding: 22px; background: rgba(13, 35, 58, .36);
}
.wl-pop {
  width: min(580px, 96%); overflow: hidden; background: #fff;
  border-radius: 10px; box-shadow: 0 24px 60px rgba(10, 35, 60, .4);
}
.wl-pop-hd {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 20px 24px 16px;
  background: linear-gradient(135deg, #f5594f, #d9382f);
  color: #fff;
}
.wl-pop-title { font-size: 18px; font-weight: 700; letter-spacing: .5px; }
.wl-pop-sub { font-size: 12px; opacity: .85; margin-top: 5px; line-height: 1.5; }
.wl-x {
  width: 28px; height: 28px; padding: 0; flex: none;
  border: 1px solid rgba(255, 255, 255, .5); border-radius: 50%;
  background: rgba(255, 255, 255, .12); color: #fff; font-size: 18px; line-height: 1; cursor: pointer;
}
.wl-x:hover { background: rgba(255, 255, 255, .28); }
.wl-pop-bd { padding: 24px 24px 6px; display: flex; flex-direction: column; gap: 18px; }
.wl-field { display: flex; align-items: flex-start; gap: 14px; }
.wl-field label { flex: none; width: 72px; padding-top: 8px; font-size: 14px; color: #3a4a5a; font-weight: 500; }
.wl-field select, .wl-field input, .wl-field textarea {
  flex: 1; border: 1px solid #dcdfe6; border-radius: 6px; padding: 8px 12px;
  font-size: 14px; font-family: inherit; color: #303133; outline: none; background: #fff;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.wl-field select, .wl-field input { height: 40px; }
.wl-field textarea { resize: vertical; line-height: 1.6; min-height: 92px; }
.wl-field select:focus, .wl-field input:focus, .wl-field textarea:focus {
  border-color: #017de4; box-shadow: 0 0 0 3px rgba(1, 125, 228, .12);
}
.wl-unit { align-self: center; color: #8296a8; font-size: 14px; }
.wl-pop-ft { display: flex; justify-content: flex-end; gap: 12px; padding: 18px 24px 24px; }
.wl-btn {
  height: 40px; padding: 0 30px; border: 1px solid #dcdfe6; border-radius: 6px;
  background: #fff; color: #5b6b7b; font-size: 14px; cursor: pointer;
}
.wl-btn.primary {
  border-color: #e5484d; background: linear-gradient(180deg, #f5584e, #e5484d);
  color: #fff; font-weight: 600; box-shadow: 0 4px 14px rgba(229, 72, 77, .32);
}
.wl-btn.primary:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }

/* toast */
.wl-toast {
  position: absolute; left: 50%; top: 16px; transform: translateX(-50%); z-index: 50;
  background: rgba(23, 50, 74, .92); color: #fff; font-size: 13px;
  padding: 8px 16px; border-radius: 4px; box-shadow: 0 6px 18px rgba(23, 50, 74, .28);
}
</style>
