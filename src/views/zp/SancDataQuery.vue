<template>
  <div class="query">
    <div class="q-cond">
      <h3>查询条件</h3>
      <div class="q-grid">
        <div class="q-fld">
          <div class="lb">年份区间</div>
          <div class="yr-sel">
            <select v-model.number="y0" @change="onYearChange">
              <option v-for="y in SANC_YEARS" :key="y" :value="y">{{ y }} 年</option>
            </select>
            <span class="arw">至</span>
            <select v-model.number="y1" @change="onYearChange">
              <option v-for="y in SANC_YEARS" :key="y" :value="y">{{ y }} 年</option>
            </select>
          </div>
        </div>
        <div class="q-fld">
          <div class="lb">统计指标</div>
          <div class="chk-grid">
            <label
              v-for="m in metrics"
              :key="m.k"
              class="chk"
              :class="{ on: metric === m.k }"
              @click="metric = m.k"
            >
              <span class="box"></span>{{ m.n }}<span class="u">{{ m.u }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="q-tabs">
      <button
        v-for="d in SANC_DIMS"
        :key="d.k"
        :class="{ on: dim === d.k }"
        @click="dim = d.k"
      >{{ d.n }}</button>
      <div class="q-tabs-ops"><ExportButton @export="exportCsv" /></div>
    </div>

    <div class="q-body">
      <div class="io-stats">
        <div class="io-stat"><div class="st-l">多年平均</div><div class="st-v">{{ fmt(st.avg) }}<span class="st-u">{{ unit }}</span></div></div>
        <div class="io-stat"><div class="st-l">最大</div><div class="st-v">{{ fmt(st.max) }}<span class="st-u">{{ unit }}</span></div><div class="st-d">{{ st.maxY }} 年</div></div>
        <div class="io-stat"><div class="st-l">最小</div><div class="st-v">{{ fmt(st.min) }}<span class="st-u">{{ unit }}</span></div><div class="st-d">{{ st.minY }} 年</div></div>
        <div class="io-stat"><div class="st-l">系列长度</div><div class="st-v">{{ ys.length }}<span class="st-u">年</span></div></div>
      </div>

      <div class="chart-box">
        <div class="ct">{{ chartTitle }}</div>
        <BarChart :option="chartOption" :height="300" />
      </div>

      <table class="dt" style="margin-top:10px">
        <thead>
          <tr v-if="dim === 'total'">
            <th style="width:60px">序号</th>
            <th>年份</th>
            <th class="num">{{ metricName }}（{{ unit }}）</th>
            <th class="num">较多年平均</th>
          </tr>
          <tr v-else>
            <th style="width:60px">序号</th>
            <th>{{ dimName }}</th>
            <th class="num">多年平均（{{ unit }}）</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="dim === 'total'">
            <tr v-for="(r, i) in totalRows" :key="r.year">
              <td class="muted">{{ i + 1 }}</td>
              <td>{{ r.year }}</td>
              <td class="num">{{ fmt(r.v) }}</td>
              <td class="num muted">{{ r.diff > 0 ? '+' : '' }}{{ fmt(r.diff) }}</td>
            </tr>
          </template>
          <template v-else>
            <tr v-for="(r, i) in partRows" :key="r.name">
              <td class="muted">{{ i + 1 }}</td>
              <td>{{ r.name }}</td>
              <td class="num">{{ fmt(r.avg) }}</td>
            </tr>
          </template>
        </tbody>
      </table>

      <div class="q-hint">三调数据（全国第三次水资源调查评价，1956—2016 年，正延长至 2025 年）为演示生成口径，正式建设导入三调成果表并建立数据血缘。</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BarChart from '@/components/BarChart.vue'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'
import {
  SANC_YEARS, SANC_METRICS, SANC_DIMS, SANC_DIM_METRICS,
  decOf, valueOf, statsOf, partAvg
} from '@/data/sancData'

const y0 = ref(1956)
const y1 = ref(2016)
const metric = ref('p')
const dim = ref('total')

/** 当前维度可选的指标（行政分区 3 项、水资源分区 2 项） */
const metrics = computed(() => {
  const keys = SANC_DIM_METRICS[dim.value] || []
  return keys.map((k) => SANC_METRICS.find((x) => x.k === k)).filter(Boolean)
})

// 切维度时如果当前指标不适用，自动切到该维度第一个指标
watch(dim, () => {
  const keys = SANC_DIM_METRICS[dim.value] || []
  if (!keys.includes(metric.value) && keys.length) metric.value = keys[0]
})

const m = computed(() => SANC_METRICS.find((x) => x.k === metric.value))
const metricName = computed(() => (m.value ? m.value.n : ''))
const unit = computed(() => (m.value ? m.value.u : ''))
const dimName = computed(() => (SANC_DIMS.find((x) => x.k === dim.value) || {}).n || '')

function onYearChange() {
  if (y0.value > y1.value) { const t = y0.value; y0.value = y1.value; y1.value = t }
}

const ys = computed(() => {
  const a = []
  for (let y = y0.value; y <= y1.value; y++) if (SANC_YEARS.includes(y)) a.push(y)
  return a
})

const st = computed(() => statsOf(metric.value, ys.value))
const dec = computed(() => decOf(metric.value))
function fmt(v) { return v == null ? '—' : Number(v).toFixed(dec.value) }

const totalRows = computed(() =>
  ys.value.map((y) => ({ year: y, v: valueOf(metric.value, y), diff: valueOf(metric.value, y) - st.value.avg }))
)
const partRows = computed(() => partAvg(metric.value, ys.value, dim.value))

const chartTitle = computed(() =>
  dim.value === 'total'
    ? `${metricName.value}历年过程（${y0.value}—${y1.value}）`
    : `各${dimName.value}${metricName.value}多年平均`
)

const chartOption = computed(() => {
  if (dim.value === 'total') {
    const data = ys.value.map((y) => valueOf(metric.value, y))
    const avgVal = st.value.avg
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      grid: { left: 66, right: 24, top: 44, bottom: 44 },
      xAxis: { type: 'category', data: ys.value.map(String), axisLabel: { hideOverlap: true, color: '#606266', fontSize: 11 } },
      yAxis: { type: 'value', name: unit.value, nameTextStyle: { fontSize: 11, color: '#909399' } },
      series: [
        {
          name: metricName.value,
          type: 'line',
          smooth: 0.15,
          showSymbol: false,
          lineStyle: { color: '#017de4', width: 2 },
          itemStyle: { color: '#017de4' },
          data
        },
        {
          name: '多年平均',
          type: 'line',
          data: ys.value.map(() => avgVal),
          symbol: 'none',
          lineStyle: { color: '#f59e0b', width: 2, type: 'dashed' },
          itemStyle: { color: '#f59e0b' }
        }
      ]
    }
  }
  const parts = partAvg(metric.value, ys.value, dim.value)
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 66, right: 24, top: 32, bottom: 44 },
    xAxis: { type: 'category', data: parts.map((p) => p.name), axisLabel: { interval: 0, color: '#606266' } },
    yAxis: { type: 'value', name: unit.value, nameTextStyle: { fontSize: 11, color: '#909399' } },
    series: [{ type: 'bar', data: parts.map((p) => p.avg), barMaxWidth: 42, itemStyle: { color: '#017de4' } }]
  }
})

function exportCsv() {
  const head = dim.value === 'total'
    ? ['序号', '年份', `${metricName.value}（${unit.value}）`, '较多年平均']
    : ['序号', dimName.value, `多年平均（${unit.value}）`]
  const lines = dim.value === 'total'
    ? totalRows.value.map((r, i) => [i + 1, r.year, fmt(r.v), (r.diff > 0 ? '+' : '') + fmt(r.diff)])
    : partRows.value.map((r, i) => [i + 1, r.name, fmt(r.avg)])
  downloadCsv(`三调数据查询_${metricName.value}_${dimName.value}.csv`, head, lines)
}
</script>
