<template>
  <div class="bs720">
    <header class="bs-hd">
      <div class="bs-tt"><span class="bs-bar"></span>上海市水文监测一张图</div>
      <div class="bs-time">{{ now }}</div>
    </header>

    <div class="bs-body">
      <div class="bs-map">
        <svg :viewBox="`0 0 ${MW} ${MH}`" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="bs-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <!-- 网格 -->
          <g stroke="rgba(87,230,255,.06)" stroke-width="1">
            <line v-for="x in gridX" :key="'gx' + x" :x1="x" y1="0" :x2="x" :y2="MH" />
            <line v-for="y in gridY" :key="'gy' + y" x1="0" :y1="y" :x2="MW" :y2="y" />
          </g>

          <!-- 行政区 -->
          <g v-for="(ring, name) in DIST" :key="name">
            <path :d="pathOf(ring)" fill="rgba(87,230,255,.05)" stroke="rgba(120,210,255,.32)" stroke-width=".8" />
          </g>

          <!-- 区名 -->
          <text
            v-for="l in distLabels"
            :key="l.n"
            :x="l.x.toFixed(1)"
            :y="l.y.toFixed(1)"
            fill="#7fa8c4"
            font-size="13"
            text-anchor="middle"
            style="pointer-events: none"
          >{{ l.n }}</text>

          <!-- 监测点 -->
          <g v-for="p in pts" :key="p.type + p.nm">
            <circle
              :cx="p.x.toFixed(1)"
              :cy="p.y.toFixed(1)"
              :r="4.2"
              :fill="colorOf(p.type)"
              :stroke="'rgba(4,22,40,.85)'"
              stroke-width="1"
              filter="url(#bs-glow)"
            >
              <title>{{ p.nm }} · {{ typeName(p.type) }}<template v-if="p.value != null"> {{ p.value }}{{ p.unit }}</template></title>
            </circle>
          </g>
        </svg>
      </div>

      <aside class="bs-side">
        <div class="bs-lg-title">监测类型</div>
        <div v-for="t in MON_TYPES" :key="t.k" class="bs-lg-item">
          <i :style="{ background: t.color }"></i>
          <span>{{ t.n }}</span>
          <b>{{ MON_COUNT[t.k] }}</b>
        </div>
        <div class="bs-lg-total">
          <span>站点总数</span>
          <b>{{ MON_POINTS.length }}</b>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { DIST } from '@/data/districts'
import { MON_TYPES, MON_TYPE_MAP, MON_POINTS, MON_COUNT } from '@/data/monitorMap'

const BBOX = { x0: 120.82, x1: 122.28, y0: 30.64, y1: 31.9 }
const MW = 1000
const MH = 700

function proj(lon, lat) {
  const x = ((lon - BBOX.x0) / (BBOX.x1 - BBOX.x0)) * MW
  const y = ((BBOX.y1 - lat) / (BBOX.y1 - BBOX.y0)) * MH
  return [x, y]
}
function pathOf(ring) {
  let d = ''
  ring.forEach((p, i) => {
    const xy = proj(p[0], p[1])
    d += (i ? 'L' : 'M') + xy[0].toFixed(1) + ',' + xy[1].toFixed(1)
  })
  return d + 'Z'
}

const DIST_LABELS = {
  '嘉定区': [121.27, 31.4], '宝山区': [121.46, 31.44], '浦东新区': [121.78, 31.16],
  '金山区': [121.36, 30.73], '松江区': [121.22, 31.02], '青浦区': [121.1, 31.16],
  '奉贤区': [121.47, 30.91], '崇明区': [121.5, 31.53]
}
const distLabels = computed(() => Object.keys(DIST_LABELS).map((n) => {
  const [x, y] = proj(DIST_LABELS[n][0], DIST_LABELS[n][1])
  return { n, x, y }
}))

const pts = computed(() => MON_POINTS.map((p) => {
  const [x, y] = proj(p.lon, p.lat)
  return { ...p, x, y }
}))

const colorOf = (k) => (MON_TYPE_MAP[k] ? MON_TYPE_MAP[k].color : '#9aa')
const typeName = (k) => (MON_TYPE_MAP[k] ? MON_TYPE_MAP[k].n : k)

const gridX = Array.from({ length: MW / 50 + 1 }, (_, i) => i * 50)
const gridY = Array.from({ length: MH / 50 + 1 }, (_, i) => i * 50)

const now = ref('')
let timer = null
function pad(n) { return String(n).padStart(2, '0') }
function tick() {
  const d = new Date()
  now.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
onMounted(() => { tick(); timer = setInterval(tick, 1000) })
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.bs720 {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: radial-gradient(120% 120% at 50% 0%, #0b2a4a 0%, #06203a 45%, #041628 100%);
  font-family: "Microsoft YaHei", "PingFang SC", -apple-system, sans-serif;
  color: #dbeafe;
}
.bs-hd {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 22px;
  background: linear-gradient(180deg, rgba(11, 42, 74, .6), rgba(11, 42, 74, 0));
}
.bs-tt {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 3px;
}
.bs-bar {
  width: 5px;
  height: 22px;
  border-radius: 3px;
  background: linear-gradient(180deg, #57e6ff, #4aa8ff);
}
.bs-time { font-size: 14px; color: #8fb6d6; letter-spacing: 1px; font-variant-numeric: tabular-nums; }

.bs-body { flex: 1; min-height: 0; display: flex; padding: 0 22px 20px; gap: 18px; }
.bs-map {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(120, 210, 255, .18);
  border-radius: 8px;
  background: rgba(6, 32, 58, .55);
  overflow: hidden;
}
.bs-map svg { width: 100%; height: 100%; }

.bs-side {
  width: 200px;
  flex: none;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 16px;
  border: 1px solid rgba(120, 210, 255, .18);
  border-radius: 8px;
  background: rgba(6, 32, 58, .55);
}
.bs-lg-title { font-size: 15px; font-weight: 600; letter-spacing: 2px; margin-bottom: 12px; color: #dbeafe; }
.bs-lg-item { display: flex; align-items: center; gap: 10px; height: 34px; font-size: 14px; color: #cfe6f7; }
.bs-lg-item i { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.bs-lg-item span { flex: 1; }
.bs-lg-item b { font-size: 16px; font-weight: 700; color: #eaf6ff; font-variant-numeric: tabular-nums; }
.bs-lg-total {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(120, 210, 255, .2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: #9fc3dd;
}
.bs-lg-total b { font-size: 20px; color: #57e6ff; }
</style>
