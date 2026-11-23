<template>
  <div class="sw-page">
    <div class="sw-cond">
      <label>预报断面</label>
      <select v-model="stKey">
        <option v-for="s in SW_STATIONS" :key="s.k" :value="s.k">{{ s.n }}（{{ s.r }}）</option>
      </select>
      <label>预报方案</label>
      <select v-model.number="scheme">
        <option :value="1">方案一 · 常规调度</option>
        <option :value="2">方案二 · 预泄调度</option>
      </select>
      <label>预见期</label>
      <div class="sc-tabs">
        <span class="sc-item" :class="{ on: hours === 24 }" @click="hours = 24">24 小时</span>
        <span class="sc-item" :class="{ on: hours === 48 }" @click="hours = 48">48 小时</span>
      </div>
      <button class="btn-dl" type="button" :disabled="busy" @click="run">
        {{ busy ? '计算中…' : '开始预报' }}
      </button>
      <span class="sw-cond-right">{{ data.station.n }} · {{ scheme === 1 ? '方案一' : '方案二' }}</span>
    </div>

    <div class="sw-cards">
      <div v-for="c in cards" :key="c.l" class="io-stat">
        <div class="st-l">{{ c.l }}</div>
        <div class="st-v">{{ c.v }}<span v-if="c.u" class="st-u">{{ c.u }}</span></div>
        <div class="st-d">{{ c.d }}</div>
      </div>
    </div>

    <div class="card">
      <div class="hd">实测 + 预报水位过程<span class="tag">警戒水位 {{ data.station.wz.toFixed(2) }} m</span></div>
      <div class="bd">
        <BarChart :option="chartOption" :height="286" />
      </div>
    </div>

    <div class="card sw-table">
      <div class="hd">预报成果表<span class="tag">未来 {{ hours }} 小时</span></div>
      <div class="sw-toolbar">
        <div class="ops"><ExportButton @export="exportCsv" /></div>
      </div>
      <div class="bd">
        <table class="dt">
          <thead>
            <tr>
              <th>序号</th><th>时间</th><th>预报水位(m)</th><th>预报流量(m³/s)</th>
              <th>较当前(m)</th><th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in data.future" :key="r.t">
              <td>{{ i + 1 }}</td>
              <td>{{ r.t }}</td>
              <td class="num">{{ r.v.toFixed(2) }}</td>
              <td class="num">{{ r.q.toLocaleString() }}</td>
              <td class="num">{{ (r.v - data.stats.current >= 0 ? '+' : '') + (r.v - data.stats.current).toFixed(2) }}</td>
              <td>
                <span class="lv" :class="r.v >= data.station.wz ? 'yellow' : 'green'">
                  {{ r.v >= data.station.wz ? '超警戒' : '正常' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import BarChart from '@/components/BarChart.vue'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'
import { SW_STATIONS, forecast } from '@/data/swyb'

const stKey = ref('spd')
const scheme = ref(1)
const hours = ref(24)
const busy = ref(false)
const data = ref(forecast(stKey.value, scheme.value, hours.value))

watch([stKey, scheme, hours], () => {
  data.value = forecast(stKey.value, scheme.value, hours.value)
})

function run() {
  busy.value = true
  setTimeout(() => {
    data.value = forecast(stKey.value, scheme.value, hours.value)
    busy.value = false
  }, 400)
}

const cards = computed(() => {
  const s = data.value.stats
  const diff = s.peak - s.current
  return [
    { l: '当前水位', v: s.current.toFixed(2), u: 'm', d: '08:00 实测' },
    { l: '预报最高水位', v: s.peak.toFixed(2), u: 'm', d: `较当前 +${diff.toFixed(2)} m` },
    { l: '最高出现时间', v: s.peakTime, u: '', d: `未来 ${hours.value} 小时` },
    {
      l: '超警戒幅度',
      v: s.overWarn > 0 ? `+${s.overWarn.toFixed(2)}` : s.overWarn.toFixed(2),
      u: 'm',
      d: s.overWarn > 0 ? '超过警戒水位' : '低于警戒水位'
    }
  ]
})

const chartOption = computed(() => {
  const { past, future, station } = data.value
  const times = [...past.map((p) => p.t), ...future.map((f) => f.t)]
  const measured = [...past.map((p) => p.v), ...future.map(() => null)]
  const fc = [
    ...past.slice(0, -1).map(() => null),
    past[past.length - 1].v,
    ...future.map((f) => f.v)
  ]
  return {
    grid: { left: 48, right: 24, top: 30, bottom: 62 },
    tooltip: { trigger: 'axis', valueFormatter: (v) => (v == null ? '—' : `${v} m`) },
    legend: { top: 2, right: 16, data: ['实测', '预报'], textStyle: { color: '#606266' } },
    xAxis: {
      type: 'category',
      data: times,
      axisLabel: { interval: Math.max(1, Math.floor(times.length / 12)), fontSize: 12, color: '#606266' },
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      name: '水位(m)',
      nameTextStyle: { color: '#909399' },
      axisLabel: { color: '#909399' },
      splitLine: { lineStyle: { color: '#f0f2f5' } },
      min: (v) => Math.floor((Math.min(v.min, station.wz) - 0.2) * 10) / 10,
      max: (v) => Math.ceil((Math.max(v.max, station.wz) + 0.2) * 10) / 10
    },
    series: [
      {
        name: '实测',
        type: 'line',
        data: measured,
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 2, color: '#017de4' },
        itemStyle: { color: '#017de4' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(1,125,228,.22)' },
              { offset: 1, color: 'rgba(1,125,228,0)' }
            ]
          }
        }
      },
      {
        name: '预报',
        type: 'line',
        data: fc,
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 2, type: 'dashed', color: '#017de4' },
        itemStyle: { color: '#017de4' },
        markLine: {
          symbol: 'none',
          silent: true,
          data: [
            {
              yAxis: station.wz,
              lineStyle: { color: '#8a94a3', type: 'dashed' },
              label: {
                formatter: `警戒 ${station.wz.toFixed(2)} m`,
                position: 'insideEndTop',
                color: '#8a94a3'
              }
            }
          ]
        }
      }
    ]
  }
})

function exportCsv() {
  downloadCsv(
    `洪水预报-${data.value.station.n}.csv`,
    ['序号', '时间', '预报水位(m)', '预报流量(m³/s)', '较当前(m)', '状态'],
    data.value.future.map((r, i) => [
      i + 1, r.t, r.v.toFixed(2), r.q, (r.v - data.value.stats.current).toFixed(2),
      r.v >= data.value.station.wz ? '超警戒' : '正常'
    ])
  )
}
</script>

<style scoped>
.sw-cond .btn-dl { margin-left: 4px; }
</style>
