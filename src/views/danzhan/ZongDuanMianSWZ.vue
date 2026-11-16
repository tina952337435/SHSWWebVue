<template>
  <div class="zdm-swz">
    <div class="zdm-head">
      <span class="zdm-title">{{ sec.name }}</span>
      <span class="zdm-sub">断面数：{{ ptsCount }}</span>
      <span class="zdm-sub">当前水位：{{ sec.level != null ? sec.level.toFixed(2) + ' m' : '—' }}</span>
    </div>

    <div class="zdm-body">
      <div ref="chartEl" class="zdm-chart"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, inject, watchEffect, watch } from 'vue'
import * as echarts from 'echarts'
import { stationByCode } from '@/data/stationNetwork'
import { waterLevelOf } from '@/data/stationProfile'
import { longOf } from '@/data/sectionData'
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
  return st.value ? longOf(st.value, waterLevelOf(st.value)) : { name: '', points: [], level: null, stationDis: null }
})
const ptsCount = computed(() => sec.value.points.length)

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
  const stationDis = sec.value.stationDis

  // 默认视图：以站点断面为中心，左右各 2000 m（对齐深色版）
  const HALF = 2000
  const zoomStart = stationDis != null ? Math.max(xMin, stationDis - HALF) : xMin
  const zoomEnd = stationDis != null ? Math.min(xMax, stationDis + HALF) : xMax

  const bands = u != null ? waterBands(points, u) : []

  // Y 轴按整条剖面的高程范围固定（不随缩放窗口跳动），避免被水面/图元的数值拉偏
  const ys = points.map((p) => p[1])
  if (u != null) ys.push(u)
  const yLo = Math.min(...ys)
  const yHi = Math.max(...ys)
  const yPad = (yHi - yLo) * 0.06
  const yMin = Math.floor(yLo - yPad)
  const yMax = Math.ceil(yHi + yPad)

  const series = []

  series.push({
    name: '河底高程',
    type: 'line',
    data: points,
    smooth: true,
    symbol: 'none',
    lineStyle: { width: 1.5, color: '#7e8d9c' },
    areaStyle: {
      origin: 'start',
      color: stone ? { image: stone, repeat: 'repeat' } : '#d7dde3'
    },
    markLine: stationDis != null
      ? {
          silent: true,
          symbol: ['none', 'triangle'],
          symbolSize: [11, 11],
          animation: false,
          lineStyle: { color: '#017de4', type: 'dashed', width: 1.2, opacity: 0.9 },
          label: {
            show: true,
            position: 'end',
            distance: 8,
            rotate: 0,
            formatter: () => `${sec.value.name}  ${u != null ? u.toFixed(2) : '—'} m`,
            color: '#17324a',
            fontSize: 13,
            backgroundColor: '#ffffff',
            borderColor: '#017de4',
            borderWidth: 1,
            borderRadius: 3,
            padding: [6, 10]
          },
          data: [{ xAxis: stationDis }]
        }
      : undefined,
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
    series.push({
      name: '水位',
      type: 'line',
      data: [[xMin, u], [xMax, u]],
      symbol: 'none',
      lineStyle: { width: 1.4, color: '#017de4' },
      z: 3
    })
  }

  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const arr = Array.isArray(params) ? params : [params]
        const bed = arr.find((x) => x.seriesName === '河底高程')
        if (!bed || !Array.isArray(bed.value)) return ''
        const [x, y] = bed.value
        let html = `距离：${Number(x).toLocaleString('en-US')} m<br/>高程：${Number(y).toFixed(2)} m`
        if (u != null) html += `<br/>水深：${Math.max(0, u - Number(y)).toFixed(2)} m<br/>水位：${u.toFixed(2)} m`
        return html
      }
    },
    grid: { left: 56, right: 46, top: 34, bottom: 54 },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none',
        startValue: zoomStart,
        endValue: zoomEnd,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        left: 16,
        right: 16,
        bottom: 8,
        height: 16,
        startValue: zoomStart,
        endValue: zoomEnd,
        showDetail: false,
        brushSelect: false,
        borderColor: '#d6e2ee',
        backgroundColor: '#f2f6fa',
        fillerColor: 'rgba(1,125,228,0.14)',
        handleSize: 10,
        handleStyle: { color: '#017de4', borderColor: '#017de4' },
        moveHandleSize: 3,
        moveHandleStyle: { color: 'rgba(1,125,228,0.55)' },
        dataBackground: { lineStyle: { color: '#c9d8e6' }, areaStyle: { color: '#eef2f6' } },
        selectedDataBackground: { lineStyle: { color: '#017de4' }, areaStyle: { color: 'rgba(1,125,228,0.14)' } }
      }
    ],
    xAxis: {
      type: 'value',
      min: xMin,
      max: xMax,
      name: '距离(m)',
      nameLocation: 'middle',
      nameGap: 26,
      nameTextStyle: { color: '#8a9aab', fontSize: 11 },
      axisLine: { lineStyle: { color: '#dfe6ee' } },
      axisLabel: {
        color: '#8a9aab',
        fontSize: 11,
        formatter: (v) => Number(v).toLocaleString('en-US')
      },
      splitLine: { lineStyle: { color: '#f1f5f9' } }
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
.zdm-swz { color: #303133; height: 100%; display: flex; flex-direction: column; }
.zdm-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 2px 4px 9px;
  border-bottom: 1px solid #eef2f6;
  flex-wrap: wrap;
}
.zdm-title { font-size: 15px; font-weight: 700; color: #017de4; }
.zdm-sub { font-size: 12.5px; color: #8a9aab; }
.zdm-body { flex: 1; position: relative; min-height: 0; }
.zdm-chart { width: 100%; height: 100%; min-height: 300px; }
</style>
