<template>
  <div class="hdm-swz">
    <div class="swz-head">
      <span class="swz-title">{{ sec.name }}</span>
      <span class="swz-sttp">断面编号：{{ sec.sttp || '—' }}</span>
      <span class="swz-sttp">断面宽度：{{ widthM }} m</span>
      <span class="swz-sttp">当前水位：{{ sec.level != null ? sec.level.toFixed(2) + ' m' : '—' }}</span>
    </div>

    <div class="swz-body">
      <div ref="chartEl" class="swz-chart"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, inject, watchEffect, watch } from 'vue'
import * as echarts from 'echarts'
import { stationByCode } from '@/data/stationNetwork'
import { waterLevelOf } from '@/data/stationProfile'
import { crossOf } from '@/data/sectionData'
import { waterBands } from '@/utils/sectionGeom'
import { stoneTexture } from '@/utils/chartTexture'

const props = defineProps({
  stcd: { type: String, default: '' },
  stnm: { type: String, default: '' }
})

const pStcd = inject('stcd', null)
const pStnm = inject('stnm', null)

const stcd = ref('')
const stnm = ref('')
const st = computed(() => stationByCode(stcd.value))

watchEffect(() => {
  stcd.value = props.stcd || (pStcd && pStcd.value) || ''
  stnm.value = props.stnm || (pStnm && pStnm.value) || ''
})

const sec = computed(() => {
  return st.value ? crossOf(st.value, waterLevelOf(st.value)) : { name: '', sttp: '', points: [], level: null }
})
const widthM = computed(() => (sec.value.points.length ? sec.value.points[sec.value.points.length - 1][0].toFixed(1) : 0))

const chartEl = ref(null)
let chart = null
let stone = null

function onResize() { if (chart) chart.resize() }

onMounted(async () => {
  await nextTick()
  if (!chartEl.value) return
  chart = echarts.init(chartEl.value)
  stone = await stoneTexture()
  renderChart()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (chart) { chart.dispose(); chart = null }
})
watch(sec, () => renderChart())

function renderChart() {
  const points = sec.value.points
  if (!chart || !points.length) return
  const xMin = points[0][0]
  const xMax = points[points.length - 1][0]
  const u = sec.value.level

  const bands = u != null ? waterBands(points, u) : []

  // Y 轴按断面高程范围固定，避免被水面图元的数值拉偏
  const ys = points.map((p) => p[1])
  if (u != null) ys.push(u)
  const yLo = Math.min(...ys)
  const yHi = Math.max(...ys)
  const yPad = (yHi - yLo) * 0.06
  const yMin = Math.floor(yLo - yPad)
  const yMax = Math.ceil(yHi + yPad)

  const series = []

  series.push({
    name: '高程',
    type: 'line',
    data: points,
    smooth: false,
    symbol: 'none',
    lineStyle: { width: 1.5, color: '#7e8d9c' },
    areaStyle: {
      origin: 'start',
      color: stone ? { image: stone, repeat: 'repeat' } : '#d7dde3'
    },
    z: 1
  })

  if (bands.length) {
    series.push({
      type: 'custom',
      silent: true,
      clip: true,
      encode: { x: -1, y: -1 },
      z: 2,
      data: bands.map((_, i) => i),
      renderItem: (params, api) => {
        const band = bands[params.dataIndex]
        const shapePts = band.pts.map(([x, y]) => api.coord([x, y]))
        return {
          type: 'polygon',
          shape: { points: shapePts },
          style: { fill: 'rgba(20,110,175,0.34)', stroke: 'none' }
        }
      }
    })
  }

  if (u != null && isFinite(u)) {
    series.push({
      name: '水位',
      type: 'line',
      data: [[xMin, u], [xMax, u]],
      symbol: 'none',
      lineStyle: { width: 1.6, color: '#017de4' },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: '#017de4', type: 'dashed', width: 1 },
        label: {
          show: true,
          position: 'middle',
          formatter: `${sec.value.name}  ${u.toFixed(2)} m`,
          color: '#17324a',
          fontSize: 13,
          backgroundColor: '#ffffff',
          borderColor: '#017de4',
          borderWidth: 1,
          borderRadius: 3,
          padding: [6, 10]
        },
        data: [{ yAxis: u }]
      },
      z: 3
    })
  }

  const bases = [
    { name: '左基点', idx: 0, color: '#017de4' },
    { name: '右基点', idx: points.length - 1, color: '#7b8cff' }
  ]
  bases.forEach((b) => {
    series.push({
      name: b.name,
      type: 'scatter',
      data: [points[b.idx]],
      symbol: 'triangle',
      symbolSize: 13,
      symbolRotate: 180,
      itemStyle: { color: b.color },
      label: {
        show: true,
        position: 'top',
        color: '#35506a',
        fontSize: 12,
        formatter: (d) => `${b.name} ${Number(d.value[1]).toFixed(2)}m`
      },
      z: 4
    })
  })

  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const arr = Array.isArray(params) ? params : [params]
        const elev = arr.find((x) => x.seriesName === '高程')
        if (!elev || !Array.isArray(elev.value)) return ''
        const [x, y] = elev.value
        let html = `距离：${Number(x).toFixed(1)} m<br/>高程：${Number(y).toFixed(2)} m`
        if (u != null) html += `<br/>水深：${Math.max(0, u - Number(y)).toFixed(2)} m<br/>水位：${u.toFixed(2)} m`
        return html
      }
    },
    grid: { left: 56, right: 46, top: 34, bottom: 44 },
    dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    xAxis: {
      type: 'value',
      min: xMin,
      max: xMax,
      name: '距离(m)',
      nameLocation: 'middle',
      nameGap: 26,
      nameTextStyle: { color: '#8a9aab', fontSize: 11 },
      axisLine: { lineStyle: { color: '#dfe6ee' } },
      axisLabel: { color: '#8a9aab', fontSize: 11 },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      min: yMin,
      max: yMax,
      name: '高程(m)',
      nameTextStyle: { color: '#8a9aab', fontSize: 11 },
      axisLine: { lineStyle: { color: '#dfe6ee' } },
      axisLabel: { color: '#8a9aab', fontSize: 11 },
      splitLine: { lineStyle: { color: '#e8eef4' } }
    },
    series
  }, true)
  chart.resize()
}
</script>

<style scoped>
.hdm-swz { color: #303133; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
.swz-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 2px 4px 9px;
  border-bottom: 1px solid #eef2f6;
  flex-wrap: wrap;
}
.swz-title { font-size: 15px; font-weight: 700; color: #017de4; }
.swz-sttp { font-size: 12.5px; color: #8a9aab; }
.swz-body { flex: 1; position: relative; min-height: 0; }
.swz-chart { width: 100%; height: 100%; min-height: 300px; }
</style>
