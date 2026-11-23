<template>
  <div class="sw-page">
    <div class="sw-cond">
      <label>统计维度</label>
      <div class="sc-tabs">
        <span class="sc-item" :class="{ on: dim === 'd' }" @click="setDim('d')">行政区</span>
        <span class="sc-item" :class="{ on: dim === 'p' }" @click="setDim('p')">水利片区</span>
      </div>
      <select v-model="pick">
        <option value="全部">全部</option>
        <option v-for="o in options" :key="o" :value="o">{{ o }}</option>
      </select>
      <span class="sw-cond-right">更新时间：2026-11-23 08:00</span>
    </div>

    <div class="sw-cards">
      <div v-for="c in cards" :key="c.l" class="io-stat">
        <div class="st-l">{{ c.l }}</div>
        <div class="st-v">{{ c.v }}<span class="st-u">{{ c.u }}</span></div>
        <div class="st-d">{{ c.d }}</div>
      </div>
    </div>

    <div class="card">
      <div class="hd">各监测站今日雨量<span class="tag">单位：mm</span></div>
      <div class="bd">
        <BarChart :option="rainOption" :height="186" />
      </div>
    </div>

    <div class="sw-main">
      <div class="card sw-table">
        <div class="hd">实时水情一览<span class="tag">共 {{ list.length }} 站</span></div>
        <div class="sw-toolbar">
          <div class="ops"><ExportButton @export="exportCsv" /></div>
        </div>
        <div class="bd">
          <table class="dt">
            <thead>
              <tr>
                <th>序号</th><th>站名</th><th>河道</th><th>行政区</th>
                <th>水位(m)</th><th>警戒水位(m)</th><th>超警(m)</th>
                <th>雨量(mm)</th><th>潮位(m)</th><th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in list" :key="r.k">
                <td>{{ i + 1 }}</td>
                <td>{{ r.n }}</td>
                <td>{{ r.r }}</td>
                <td>{{ r.d }}</td>
                <td class="num">{{ r.z.toFixed(2) }}</td>
                <td class="num">{{ r.wz.toFixed(2) }}</td>
                <td class="num">{{ r.over.toFixed(2) }}</td>
                <td class="num">{{ r.rain.toFixed(1) }}</td>
                <td class="num">{{ r.tide == null ? '—' : r.tide.toFixed(2) }}</td>
                <td>
                  <span class="lv" :class="r.over > 0 ? 'yellow' : 'green'">{{ r.status }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="sw-side">
        <div class="card">
          <div class="hd">雨量排行 TOP5</div>
          <div class="sw-top5">
            <div
              v-for="(r, i) in topRain"
              :key="r.k"
              class="it"
              :class="'top' + (i + 1)"
            >
              <span class="no">{{ i + 1 }}</span>
              <span class="nm">{{ r.n }}</span>
              <span class="vl">{{ r.rain.toFixed(1) }} mm</span>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="hd">水位涨幅 TOP5</div>
          <div class="sw-top5">
            <div
              v-for="(r, i) in topRise"
              :key="r.k"
              class="it"
              :class="'top' + (i + 1)"
            >
              <span class="no">{{ i + 1 }}</span>
              <span class="nm">{{ r.n }}</span>
              <span class="vl">+{{ (r.z - r.base).toFixed(2) }} m</span>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="hd">潮位排行 TOP5</div>
          <div class="sw-top5">
            <div
              v-for="(r, i) in topTide"
              :key="r.k"
              class="it"
              :class="'top' + (i + 1)"
            >
              <span class="no">{{ i + 1 }}</span>
              <span class="nm">{{ r.n }}</span>
              <span class="vl">{{ r.tide.toFixed(2) }} m</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import BarChart from '@/components/BarChart.vue'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'
import { DISTRICTS, SLP_NAMES, liveSummary } from '@/data/swyb'

const rows = liveSummary()
const dim = ref('d')
const pick = ref('全部')

const options = computed(() => (dim.value === 'd' ? DISTRICTS : SLP_NAMES))
const list = computed(() => {
  if (pick.value === '全部') return rows
  return rows.filter((r) => (dim.value === 'd' ? r.d : r.p) === pick.value)
})

function setDim(v) {
  dim.value = v
  pick.value = '全部'
}

const cards = computed(() => {
  const over = list.value.filter((r) => r.over > 0)
  const maxRain = [...list.value].sort((a, b) => b.rain - a.rain)[0] || { rain: 0, n: '—' }
  const tides = list.value.filter((r) => r.tide != null)
  const maxTide = [...tides].sort((a, b) => b.tide - a.tide)[0] || { tide: null, n: '—' }
  return [
    { l: '实时监测站数', v: list.value.length, u: '站', d: '水位 / 雨量 / 潮位' },
    { l: '超警戒水位站数', v: over.length, u: '站', d: over.map((r) => r.n).join('、') || '当前无水站超警' },
    { l: '最大雨量站', v: maxRain.rain.toFixed(1), u: 'mm', d: maxRain.n },
    { l: '最高潮位站', v: maxTide.tide == null ? '—' : maxTide.tide.toFixed(2), u: 'm', d: maxTide.n }
  ]
})

const rainOption = computed(() => ({
  grid: { left: 46, right: 18, top: 18, bottom: 46 },
  tooltip: { trigger: 'axis', valueFormatter: (v) => `${v} mm` },
  xAxis: {
    type: 'category',
    data: list.value.map((r) => r.n),
    axisLabel: { interval: 0, rotate: 22, fontSize: 12, color: '#606266' },
    axisLine: { lineStyle: { color: '#dcdfe6' } },
    axisTick: { show: false }
  },
  yAxis: {
    type: 'value',
    name: 'mm',
    nameTextStyle: { color: '#909399' },
    axisLabel: { color: '#909399' },
    splitLine: { lineStyle: { color: '#f0f2f5' } }
  },
  series: [
    {
      type: 'bar',
      data: list.value.map((r) => r.rain),
      barWidth: 20,
      itemStyle: { color: '#017de4', borderRadius: [3, 3, 0, 0] }
    }
  ]
}))

const topRain = computed(() => [...list.value].sort((a, b) => b.rain - a.rain).slice(0, 5))
const topRise = computed(() =>
  [...list.value].sort((a, b) => (b.z - b.base) - (a.z - a.base)).slice(0, 5)
)
const topTide = computed(() =>
  list.value.filter((r) => r.tide != null).sort((a, b) => b.tide - a.tide).slice(0, 5)
)

function exportCsv() {
  downloadCsv(
    '水情综合应用.csv',
    ['序号', '站名', '河道', '行政区', '水位(m)', '警戒水位(m)', '超警(m)', '雨量(mm)', '潮位(m)', '状态'],
    list.value.map((r, i) => [
      i + 1, r.n, r.r, r.d, r.z.toFixed(2), r.wz.toFixed(2), r.over.toFixed(2),
      r.rain.toFixed(1), r.tide == null ? '—' : r.tide.toFixed(2), r.status
    ])
  )
}
</script>

<style scoped>
.sw-cond select { min-width: 130px; }
</style>
