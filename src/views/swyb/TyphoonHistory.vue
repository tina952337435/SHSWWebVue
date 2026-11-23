<template>
  <div class="sw-page">
    <div class="sw-cond">
      <label>对比场次</label>
      <div class="sw-chips">
        <span
          v-for="t in TYPHOONS"
          :key="t.id"
          class="sw-chip"
          :class="{ on: picked.includes(t.id) }"
          @click="toggle(t.id)"
        >
          {{ t.id }} {{ t.n }}
        </span>
      </div>
      <button class="btn-plain" type="button" @click="reset">重置</button>
      <span class="sw-cond-right">至少选择 1 场</span>
    </div>

    <div class="sw-cards">
      <div v-for="c in cards" :key="c.l" class="io-stat">
        <div class="st-l">{{ c.l }}</div>
        <div class="st-v">{{ c.v }}<span class="st-u">{{ c.u }}</span></div>
        <div class="st-d">{{ c.d }}</div>
      </div>
    </div>

    <div class="ewt-tabs">
      <span
        v-for="m in METRICS"
        :key="m.k"
        :class="{ on: metric === m.k }"
        @click="metric = m.k"
      >
        {{ m.n }}
      </span>
    </div>

    <div class="card">
      <div class="hd">{{ cur.n }}对比<span class="tag">单位：{{ cur.u }}</span></div>
      <div class="bd">
        <BarChart :option="chartOption" :height="248" />
      </div>
    </div>

    <div class="card sw-table">
      <div class="hd">台风特征值对比<span class="tag">共 {{ selected.length }} 场</span></div>
      <div class="sw-toolbar">
        <div class="ops"><ExportButton @export="exportCsv" /></div>
      </div>
      <div class="bd">
        <table class="dt">
          <thead>
            <tr>
              <th>序号</th><th>台风编号</th><th>名称</th><th>影响时段</th>
              <th>过程雨量(mm)</th><th>最大日雨量(mm)</th><th>最高水位(m)</th>
              <th>潮位增水(m)</th><th>超警站数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(t, i) in selected" :key="t.id">
              <td>{{ i + 1 }}</td>
              <td>{{ t.id }}</td>
              <td>{{ t.n }}</td>
              <td>{{ t.period }}</td>
              <td class="num">{{ t.rain.toFixed(1) }}</td>
              <td class="num">{{ t.maxDay.toFixed(1) }}</td>
              <td class="num">{{ t.maxLevel.toFixed(2) }}</td>
              <td class="num">{{ t.surge.toFixed(2) }}</td>
              <td class="num">{{ t.over }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import BarChart from '@/components/BarChart.vue'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'
import { TYPHOONS } from '@/data/swyb'

const DEFAULT = ['2106', '2413', '2518']
const picked = ref([...DEFAULT])
const metric = ref('rain')

const METRICS = [
  { k: 'rain', n: '过程雨量', u: 'mm', color: '#017de4' },
  { k: 'maxLevel', n: '最高水位', u: 'm', color: '#26a869' },
  { k: 'surge', n: '潮位增水', u: 'm', color: '#7b8cff' }
]

const cur = computed(() => METRICS.find((m) => m.k === metric.value) || METRICS[0])
const selected = computed(() => TYPHOONS.filter((t) => picked.value.includes(t.id)))

function toggle(id) {
  const i = picked.value.indexOf(id)
  if (i >= 0) {
    if (picked.value.length <= 1) return
    picked.value.splice(i, 1)
  } else {
    picked.value.push(id)
  }
}

function reset() {
  picked.value = [...DEFAULT]
  metric.value = 'rain'
}

const cards = computed(() => {
  const n = selected.value.length
  const avgRain = n ? selected.value.reduce((a, t) => a + t.rain, 0) / n : 0
  const maxSurge = n
    ? selected.value.reduce((a, t) => (t.surge > a.surge ? t : a), selected.value[0])
    : { surge: 0, n: '—' }
  return [
    { l: '对比场次数', v: n, u: '场', d: '可增删对比场次' },
    { l: '平均过程雨量', v: avgRain.toFixed(1), u: 'mm', d: '所选场次均值' },
    { l: '最大潮位增水', v: maxSurge.surge.toFixed(2), u: 'm', d: maxSurge.n }
  ]
})

const chartOption = computed(() => {
  const m = cur.value
  const digits = m.k === 'rain' ? 1 : 2
  return {
    grid: { left: 54, right: 24, top: 30, bottom: 42 },
    tooltip: { trigger: 'axis', valueFormatter: (v) => `${Number(v).toFixed(digits)} ${m.u}` },
    xAxis: {
      type: 'category',
      data: selected.value.map((t) => t.n),
      axisLabel: { fontSize: 13, color: '#606266' },
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      name: m.u,
      nameTextStyle: { color: '#909399' },
      axisLabel: { color: '#909399' },
      splitLine: { lineStyle: { color: '#f0f2f5' } }
    },
    series: [
      {
        type: 'bar',
        data: selected.value.map((t) => t[m.k]),
        barWidth: 44,
        itemStyle: { color: m.color, borderRadius: [3, 3, 0, 0] },
        label: {
          show: true,
          position: 'top',
          color: '#606266',
          formatter: (p) => Number(p.value).toFixed(digits)
        }
      }
    ]
  }
})

function exportCsv() {
  downloadCsv(
    '历史台风水情特征分析.csv',
    ['序号', '台风编号', '名称', '影响时段', '过程雨量(mm)', '最大日雨量(mm)', '最高水位(m)', '潮位增水(m)', '超警站数'],
    selected.value.map((t, i) => [
      i + 1, t.id, t.n, t.period, t.rain.toFixed(1), t.maxDay.toFixed(1),
      t.maxLevel.toFixed(2), t.surge.toFixed(2), t.over
    ])
  )
}
</script>

<style scoped>
.sw-cond { flex-wrap: wrap; row-gap: 8px; }
</style>
