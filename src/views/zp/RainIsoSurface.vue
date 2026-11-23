<template>
  <div class="ris">
    <div id="arcgisMap" class="ag-map"></div>

    <!-- 左上标题 -->
    <div class="ris-title">
      <div class="t1">上海市降雨等值面</div>
      <div class="t2">{{ startDate }} {{ startHour }}时 — {{ endDate }} {{ endHour }}时 · 单位 mm</div>
    </div>

    <!-- 左下：分级图例 -->
    <div class="lg-legend">
      <div class="lg-hd">图例</div>
      <label v-for="b in bands" :key="b.level" class="lg-row">
        <input v-model="b.on" type="checkbox" @change="redraw" />
        <i :style="{ background: b.color }"></i>
        <span class="nm">{{ b.name }}</span>
        <em>({{ b.count }})</em>
      </label>
    </div>

    <!-- 右下：色阶 -->
    <div class="cb">
      <div v-for="(l, i) in colorBar" :key="i" class="cb-row">
        <span>{{ l.v }}</span>
        <i :style="{ background: l.c }"></i>
      </div>
    </div>

    <!-- 右侧条件面板 -->
    <aside class="side">
      <div class="sd-block">
        <div class="sd-hd">条件选择</div>
        <div class="sd-fld">
          <label>开始：</label>
          <input v-model="startDate" type="date" />
          <select v-model.number="startHour">
            <option v-for="h in 24" :key="h" :value="h - 1">{{ h - 1 }}</option>
          </select>
        </div>
        <div class="sd-fld">
          <label>结束：</label>
          <input v-model="endDate" type="date" />
          <select v-model.number="endHour">
            <option v-for="h in 24" :key="h" :value="h - 1">{{ h - 1 }}</option>
          </select>
        </div>
        <div class="sd-ops">
          <button class="sd-query" type="button" @click="query">查询</button>
          <button class="sd-dl" type="button" title="导出" @click="exportCsv">⬇</button>
        </div>
      </div>

      <div class="sd-block">
        <div class="sd-hd">雨量区间</div>
        <div v-for="(b, i) in bands" :key="b.level" class="sd-range">
          <span class="no">{{ i + 1 }}:</span>
          <input :value="rangeOf(i).min" type="text" readonly />
          <input :value="rangeOf(i).max" type="text" readonly />
          <input v-model="b.color" class="sd-color" type="color" @change="redraw" />
        </div>
        <div class="sd-ops sd-ops2">
          <button class="sd-plain" type="button" @click="addHint">添加条件</button>
          <button class="sd-plain" type="button" @click="addHint">删除条件</button>
        </div>
      </div>

      <div class="sd-actions">
        <button class="sd-station" type="button" @click="addHint">站点筛选</button>
        <button class="sd-draw" type="button" @click="query">绘制等值面</button>
      </div>

      <div v-if="loading" class="sd-tip">等值面加载中…</div>
      <div v-if="error" class="sd-err">{{ error }}</div>
    </aside>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'

const ISO_LEVELS = [0.01, 10, 25, 50, 100, 200]
const ISO_COLORS = ['#A6F28E', '#007B00', '#3DBCF9', '#0000F9', '#FB3DFA', '#7B0000']
const ISO_NAMES = ['0 ~ 10', '10 ~ 25', '25 ~ 50', '50 ~ 100', '100 ~ 200', '≥ 200']

const TILE_BASE = 'https://service-api.onemap.sh.cegn.cn/OneMapServer/rest/services/j01_basemap_normal/MapServer/tile'
const TILE_TOKEN = 'd01b7f932ff44c04bd0b026e9daaae97'

const loading = ref(false)
const error = ref('')

const startDate = ref('2026-08-12')
const startHour = ref(8)
const endDate = ref('2026-08-16')
const endHour = ref(12)

const bands = ref(ISO_LEVELS.map((lv, i) => ({
  level: lv, name: ISO_NAMES[i], color: ISO_COLORS[i], count: 0, on: true
})))

const colorBar = computed(() =>
  bands.value.map((b, i) => ({ v: i === 0 ? '0' : String(b.level), c: b.color })).reverse()
)

function rangeOf(i) {
  const next = ISO_LEVELS[i + 1]
  return { min: i === 0 ? '0' : String(ISO_LEVELS[i]), max: next == null ? '' : String(next) }
}

/* ================= ArcGIS ================= */
let map = null
let isoLayer = null
let stationLayer = null
let esriNS = null
let surfaces = []
let stations = []

/** 生成雨滴图标（dataURL），按颜色缓存 */
const dropCache = new Map()
function dropIcon(color) {
  if (dropCache.has(color)) return dropCache.get(color)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="18" viewBox="0 0 14 18">
    <path d="M7 1.2C7 1.2 1.4 8 1.4 11.4a5.6 5.6 0 0 0 11.2 0C12.6 8 7 1.2 7 1.2z"
      fill="${color}" stroke="#ffffff" stroke-width="1.1"/>
  </svg>`
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  dropCache.set(color, url)
  return url
}

let sdkPromise = null
function ensureSDK() {
  if (window.require && window.esri) return Promise.resolve()
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise((resolve, reject) => {
    const base = import.meta.env.BASE_URL
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = `${base}ArcGis/3.31/esri/css/esri.css`
    document.head.appendChild(css)
    const s = document.createElement('script')
    s.src = `${base}ArcGis/3.31/init.js`
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('ArcGIS SDK 加载失败'))
    document.head.appendChild(s)
  })
  return sdkPromise
}

function requireModules(mods) {
  return new Promise((resolve, reject) => {
    if (!window.require) { reject(new Error('ArcGIS SDK 未加载')); return }
    try {
      window.require(mods, (...args) => resolve(args))
      setTimeout(() => reject(new Error('ArcGIS 模块加载超时')), 15000)
    } catch (e) {
      reject(e)
    }
  })
}

function createOneMapLayer() {
  return new Promise((resolve, reject) => {
    try {
      window.require(['dojo/_base/declare', 'esri/layers/tiled'], (declare) => {
        const Layer = declare(esri.layers.TiledMapServiceLayer, {
          constructor: function () {
            this.id = 'onemap'
            this.spatialReference = new esri.SpatialReference({ wkid: 3857 })
            this.initialExtent = this.fullExtent = new esri.geometry.Extent(
              -20037508.342787, -20037508.342787, 20037508.342787, 20037508.342787, this.spatialReference
            )
            const lods = []
            for (let i = 0; i <= 18; i++) {
              const res = 156543.03392800014 / Math.pow(2, i)
              lods.push({ level: i, resolution: res, scale: res * 96 / 0.0254 })
            }
            this.tileInfo = new esri.layers.TileInfo({
              rows: 256, cols: 256,
              origin: { x: -20037508.342787, y: 20037508.342787 },
              spatialReference: { wkid: 3857 },
              lods
            })
            this.loaded = true
            this.onLoad(this)
          },
          getTileUrl: function (level, row, col) {
            return `${TILE_BASE}/${level}/${row}/${col}?jcmp-token=${TILE_TOKEN}`
          }
        })
        resolve(new Layer())
      })
    } catch (e) {
      reject(e)
    }
  })
}

async function initMap() {
  await ensureSDK()
  const [
    Map, GraphicsLayer, Polygon, Graphic,
    SimpleFillSymbol, SimpleLineSymbol, Color, Extent, SpatialReference,
    PictureMarkerSymbol, Point
  ] = await requireModules([
    'esri/map',
    'esri/layers/GraphicsLayer',
    'esri/geometry/Polygon',
    'esri/graphic',
    'esri/symbols/SimpleFillSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/Color',
    'esri/geometry/Extent',
    'esri/SpatialReference',
    'esri/symbols/PictureMarkerSymbol',
    'esri/geometry/Point',
    'dojo/domReady!'
  ])
  esriNS = { Polygon, Graphic, SimpleFillSymbol, SimpleLineSymbol, Color, PictureMarkerSymbol, Point }

  // 上海范围（城建坐标）
  const sr = new SpatialReference({ wkid: 3857 })
  const extent = new Extent(-90000, -80000, 86000, 81000, sr)
  map = new Map('arcgisMap', {
    logo: false,
    slider: false,
    extent,
    maxZoom: 17,
    minZoom: 6,
    showLabels: false
  })

  const onemap = await createOneMapLayer()
  map.addLayer(onemap)

  isoLayer = new GraphicsLayer({ id: 'isoLayer' })
  isoLayer.setOpacity(0.6)
  map.addLayer(isoLayer)

  stationLayer = new GraphicsLayer({ id: 'stationLayer' })
  map.addLayer(stationLayer)
}

/** 画雨量站点：按雨量等级上色，图例勾选控制显示/隐藏 */
function drawStations() {
  if (!map || !stationLayer) return
  const { Graphic, PictureMarkerSymbol, Point } = esriNS || {}
  if (!Graphic) return
  stationLayer.clear()
  const symCache = new Map()

  stations.forEach((s) => {
    const v = Number(s.drp)
    if (!Number.isFinite(v)) return
    const idx = bandIndex(v)
    const band = bands.value[idx]
    if (!band || band.on === false) return

    let sym = symCache.get(idx)
    if (!sym) {
      sym = new PictureMarkerSymbol({
        url: dropIcon(band.color),
        width: 8,
        height: 10,
        type: 'esriPMS'
      })
      symCache.set(idx, sym)
    }
    stationLayer.add(new Graphic(new Point(Number(s.lgtd), Number(s.lttd), map.spatialReference), sym))
  })
}

/** 雨量值 → 档位下标 */
function bandIndex(v) {
  let idx = -1
  for (let i = 0; i < ISO_LEVELS.length; i++) {
    if (v >= ISO_LEVELS[i]) idx = i
    else break
  }
  return idx < 0 ? 0 : idx
}

/** 把 polygons 归一化成「环」数组（兼容 ring / rings 嵌套） */
function toRings(polys) {
  const out = []
  if (!Array.isArray(polys)) return out
  const isPt = (v) => Array.isArray(v) && v.length >= 2 && typeof v[0] === 'number'
  polys.forEach((el) => {
    if (!Array.isArray(el) || !el.length) return
    if (isPt(el[0])) out.push(el)
    else el.forEach((r) => { if (Array.isArray(r) && r.length && isPt(r[0])) out.push(r) })
  })
  return out
}

/** 按等级绘制等值面（低等级先画，高等级覆盖） */
function drawSurfaces() {
  if (!map || !isoLayer) return
  const { Polygon, Graphic, SimpleFillSymbol, SimpleLineSymbol, Color } = esriNS || {}
  if (!Polygon) return
  isoLayer.clear()

  const sorted = surfaces.slice().sort((a, b) => Number(a.level) - Number(b.level))
  sorted.forEach((u) => {
    const level = Number(u.level)
    let idx = ISO_LEVELS.findIndex((l) => l >= level)
    if (idx < 0) idx = ISO_LEVELS.length - 1
    const band = bands.value[idx]
    if (band && band.on === false) return

    const color = new Color(band ? band.color : ISO_COLORS[idx])
    const symbol = new SimpleFillSymbol(
      SimpleFillSymbol.STYLE_SOLID,
      new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, color, 0.8),
      color
    )
    toRings(u.polygons).forEach((ring) => {
      const pts = ring
        .map((p) => [Number(p[0]), Number(p[1])])
        .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))
      if (pts.length < 3) return
      const a = pts[0]
      const z = pts[pts.length - 1]
      if (Math.abs(a[0] - z[0]) > 0.01 || Math.abs(a[1] - z[1]) > 0.01) pts.push([a[0], a[1]])
      try {
        isoLayer.add(new Graphic(new Polygon({ rings: [pts], spatialReference: map.spatialReference }), symbol))
      } catch (e) { /* 跳过非法环 */ }
    })
  })
}

/* ================= 数据 ================= */
async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const base = import.meta.env.BASE_URL
    const [isoResp, stResp] = await Promise.all([
      fetch(`${base}data/dzm.json`),
      fetch(`${base}data/dzmstation.json`)
    ])
    if (!isoResp.ok) throw new Error(`读取 dzm.json 失败（${isoResp.status}）`)

    const json = await isoResp.json()
    const data = json.data || {}
    surfaces = []
    Object.keys(data).forEach((k) => {
      const arr = (data[k] && data[k].isosurfaces) || []
      arr.forEach((u) => surfaces.push(u))
    })
    if (!surfaces.length) throw new Error('dzm.json 中没有 isosurfaces 数据')

    if (stResp.ok) {
      const st = await stResp.json()
      stations = Array.isArray(st.data) ? st.data : []
    }

    // 图例数字 = 该档的站点数
    const counts = new Array(ISO_LEVELS.length).fill(0)
    stations.forEach((s) => {
      const v = Number(s.drp)
      if (Number.isFinite(v)) counts[bandIndex(v)] += 1
    })
    bands.value = bands.value.map((b, i) => ({ ...b, count: counts[i] }))

    drawSurfaces()
    drawStations()
  } catch (e) {
    error.value = e.message || '等值面加载失败'
  } finally {
    loading.value = false
  }
}

/* ================= 交互 ================= */
function redraw() {
  drawSurfaces()
  drawStations()
}

function query() {
  if (!surfaces.length) { loadData(); return }
  redraw()
}

function addHint() {
  ElMessage.info({ message: '演示版：条件编辑与站点筛选暂未接入', offset: 78 })
}

function exportCsv() {
  ElMessage.info({ message: '演示版：导出暂未接入', offset: 78 })
}

onMounted(async () => {
  try {
    await initMap()
    await loadData()
  } catch (e) {
    error.value = `初始化失败：${e.message || e}`
    loading.value = false
  }
  window.addEventListener('resize', onResize)
})

function onResize() {
  if (!map) return
  try { map.resize(); map.reposition() } catch (e) { /* 忽略 */ }
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.ris { position: relative; height: 100%; background: #eef1f5; }
.ag-map { position: absolute; left: 0; top: 0; right: 0; bottom: 0; }

/* 左上标题 */
.ris-title {
  position: absolute; left: 12px; top: 12px; z-index: 6; pointer-events: none;
  background: rgba(255, 255, 255, .95); border: 1px solid rgba(1, 125, 228, .22);
  border-left: 3px solid #017de4; border-radius: 4px; padding: 8px 12px;
  box-shadow: 0 3px 12px rgba(23, 50, 74, .12);
}
.ris-title .t1 { font-size: 15px; font-weight: 700; color: #17324a; }
.ris-title .t2 { margin-top: 3px; font-size: 11px; color: #8296a8; }

/* 左下分级图例 */
.lg-legend {
  position: absolute; left: 10px; bottom: 10px; z-index: 6;
  width: 186px; padding: 5px 8px;
  background: rgba(255, 255, 255, .96); border: 1px solid #cfe0ef; border-radius: 3px;
  box-shadow: 0 2px 10px rgba(23, 50, 74, .12);
}
.lg-hd {
  font-size: 11.5px; font-weight: 700; color: #fff;
  background: #017de4; margin: -5px -8px 4px; padding: 3px 8px;
}
.lg-row {
  display: flex; align-items: center; gap: 5px; font-size: 11px; line-height: 1.75; color: #3a4a5a;
  cursor: pointer;
}
.lg-row input { width: 11px; height: 11px; margin: 0; accent-color: #017de4; }
.lg-row i { width: 11px; height: 9px; border-radius: 2px; flex: none; border: 1px solid rgba(0,0,0,.08); }
.lg-row .nm { flex: 1; }
.lg-row em { font-style: normal; color: #7f8fa4; font-size: 10.5px; font-variant-numeric: tabular-nums; }

/* 右下色阶 */
.cb {
  position: absolute; right: 340px; bottom: 12px; z-index: 6;
  background: rgba(255, 255, 255, .96); border: 1px solid #cfe0ef; border-radius: 3px;
  padding: 6px 8px; box-shadow: 0 2px 10px rgba(23, 50, 74, .12);
}
.cb-row { display: flex; align-items: center; gap: 6px; line-height: 1.5; }
.cb-row span { font-size: 11px; color: #5b6b7b; width: 26px; text-align: right; font-variant-numeric: tabular-nums; }
.cb-row i { width: 20px; height: 12px; border-radius: 2px; }

/* 右侧条件面板 */
.side {
  position: absolute; right: 0; top: 0; bottom: 0; z-index: 8; width: 320px;
  background: #fff; border-left: 1px solid #e2e8ee; padding: 14px 16px 20px;
  overflow: auto; box-shadow: -2px 0 12px rgba(23, 50, 74, .06);
}
.sd-block { margin-bottom: 14px; }
.sd-hd {
  font-size: 14px; font-weight: 700; color: #1f2d3d; padding-left: 8px;
  border-left: 3px solid #017de4; margin-bottom: 10px;
}
.sd-fld { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.sd-fld label { font-size: 13px; color: #5b6b7b; white-space: nowrap; }
.sd-fld input {
  flex: 1; min-width: 0; height: 30px; padding: 0 8px; border: 1px solid #dcdfe6;
  border-radius: 3px; font-size: 13px; font-family: inherit; color: #303133; outline: none;
}
.sd-fld select {
  width: 55px; height: 30px; border: 1px solid #dcdfe6; border-radius: 3px;
  font-size: 13px; color: #303133; background: #fff; outline: none;
}
.sd-fld input:focus, .sd-fld select:focus { border-color: #017de4; }

.sd-ops { display: flex; justify-content: flex-end; gap: 8px; }
.sd-query {
  height: 30px; padding: 0 18px; border: none; border-radius: 3px;
  background: #2f8ee6; color: #fff; font-size: 13px; cursor: pointer;
}
.sd-query:hover { background: #1f7ad6; }
.sd-dl {
  width: 30px; height: 30px; border: 1px solid #dcdfe6; border-radius: 3px;
  background: #fff; color: #2f8ee6; font-size: 14px; cursor: pointer;
}

.sd-range { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.sd-range .no { width: 18px; font-size: 12.5px; color: #5b6b7b; }
.sd-range input {
  flex: 1; min-width: 0; height: 30px; padding: 0 8px; border: 1px solid #dcdfe6;
  border-radius: 3px; font-size: 13px; color: #303133; background: #fafbfc; outline: none;
  text-align: center;
}
.sd-range .sd-color {
  width: 34px; height: 24px; padding: 0; border: 1px solid #dcdfe6; border-radius: 2px;
  flex: none; background: #fff; cursor: pointer;
}
.sd-range .sd-color::-webkit-color-swatch-wrapper { padding: 2px; }
.sd-range .sd-color::-webkit-color-swatch { border: none; border-radius: 1px; }

.sd-ops2 { justify-content: center; margin-top: 10px; }
.sd-plain {
  height: 30px; padding: 0 12px; border: 1px solid #cfdae8; border-radius: 3px;
  background: #fff; color: #5b6b7b; font-size: 13px; cursor: pointer;
}
.sd-plain:hover { border-color: #2f8ee6; color: #2f8ee6; }

.sd-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 6px; }
.sd-station, .sd-draw {
  height: 36px; border: none; border-radius: 4px; color: #fff; font-size: 14px;
  font-family: inherit; cursor: pointer;
}
.sd-station { background: #f59e0b; }
.sd-station:hover { background: #e08c05; }
.sd-draw { background: #2f8ee6; }
.sd-draw:hover { background: #1f7ad6; }

.sd-tip { margin-top: 12px; font-size: 12px; color: #8a94a3; line-height: 1.7; }
.sd-err { margin-top: 8px; font-size: 12px; color: #c0392b; line-height: 1.7; }
</style>
