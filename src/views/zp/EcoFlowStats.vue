<template>
  <div class="ew">
    <!-- 顶部条件：先选断面，再选时间 -->
    <div class="io-cond">
      <div class="io-fld">
        <label>断面</label>
        <select v-model.number="sectionIdx" style="width: 200px">
          <option v-for="(s, i) in ECO_SECTIONS" :key="s.name" :value="i">{{ s.river }}·{{ s.name }}</option>
        </select>
      </div>
      <div class="io-fld" style="margin-left: 12px">
        <label>开始时间</label>
        <input v-model="start" type="date" :min="EW_DATE_MIN" :max="EW_DATE_MAX" />
      </div>
      <div class="io-fld">
        <label>结束时间</label>
        <input v-model="end" type="date" :min="EW_DATE_MIN" :max="EW_DATE_MAX" />
      </div>
      <div class="io-scale">
        <div class="sc-tabs">
          <span
            v-for="s in EW_SCALES"
            :key="s.k"
            class="sc-item"
            :class="{ on: scale === s.k }"
            @click="scale = s.k"
          >{{ s.n }}</span>
        </div>
      </div>
    </div>

    <div class="ew-body">
      <div class="io-stats">
        <div class="io-stat">
          <div class="st-l">时段均值</div>
          <div class="st-v">{{ overall ? overall.avg.toFixed(2) : '—' }}<span class="st-u">m</span></div>
        </div>
        <div class="io-stat">
          <div class="st-l">期间最高</div>
          <div class="st-v">{{ overall ? overall.max.toFixed(2) : '—' }}<span class="st-u">m</span></div>
          <div v-if="overall" class="st-d">{{ overall.maxLabel }}</div>
        </div>
        <div class="io-stat">
          <div class="st-l">期间最低</div>
          <div class="st-v">{{ overall ? overall.min.toFixed(2) : '—' }}<span class="st-u">m</span></div>
          <div v-if="overall" class="st-d">{{ overall.minLabel }}</div>
        </div>
        <div class="io-stat">
          <div class="st-l">达标率（日均 ≥ 生态目标）</div>
          <div class="st-v">{{ overall ? overall.rate.toFixed(1) : '—' }}<span class="st-u">%</span></div>
        </div>
      </div>

      <div class="card ew-chart">
        <div class="bd">
          <BarChart v-if="periods.length" :option="chartOption" :height="210" />
          <div v-else class="io-empty">请选择统计时段</div>
        </div>
      </div>

      <div class="card ew-table">
        <div class="ew-toolbar">
          <span class="ew-tip">{{ cur.river }} · {{ cur.name }} · 生态目标 {{ cur.z.toFixed(2) }} m · 共 {{ periods.length }} 个{{ scaleUnit }}<template v-if="scale !== 'day'">（{{ days }} 天）</template></span>
          <span class="ew-ops"><ExportButton @export="exportCsv" /></span>
        </div>
        <div class="bd">
          <table class="dt">
            <thead>
              <tr>
                <th style="width:60px">序号</th>
                <th>时段</th>
                <th v-if="scale !== 'day'" style="width:90px">天数</th>
                <th>{{ AVG_NAME[scale] }}（m）</th>
                <th>最大值（m）</th>
                <th>最小值（m）</th>
                <th>较目标（m）</th>
                <th style="width:110px">达标率</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in periods" :key="p.label">
                <td>{{ i + 1 }}</td>
                <td>{{ p.label }}</td>
                <td v-if="scale !== 'day'" class="num">{{ p.days }}</td>
                <td class="num">{{ p.avg.toFixed(2) }}</td>
                <td class="num">{{ p.max.toFixed(2) }}</td>
                <td class="num">{{ p.min.toFixed(2) }}</td>
                <td class="num">{{ p.diff > 0 ? '+' : '' }}{{ p.diff.toFixed(2) }}</td>
                <td class="num">{{ p.rate.toFixed(1) }}%</td>
              </tr>
              <tr v-if="!periods.length">
                <td colspan="8" class="empty">请选择统计时段</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import BarChart from '@/components/BarChart.vue'
import { ECO_SECTIONS } from '@/data/ecoFlow'
import { EW_SCALES, EW_DATE_MIN, EW_DATE_MAX, periodStats, rangeStats } from '@/data/ecoWarn'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'

const start = ref('2026-01-01')
const end = ref('2026-10-31')
const scale = ref('month')
const sectionIdx = ref(0)

const AVG_NAME = { day: '日均值', xun: '旬均值', month: '月均值', year: '年均值' }
const SCALE_UNIT = { day: '日', xun: '旬', month: '月', year: '年' }

const cur = computed(() => ECO_SECTIONS[sectionIdx.value])
const scaleUnit = computed(() => SCALE_UNIT[scale.value] || '时段')

const range = computed(() => {
  let s = String(start.value || '')
  let e = String(end.value || '')
  if (!s || !e) return null
  if (s > e) [s, e] = [e, s]
  return { s, e }
})

const periods = computed(() =>
  range.value ? periodStats(sectionIdx.value, scale.value, range.value.s, range.value.e) : []
)

const overall = computed(() =>
  range.value ? rangeStats(sectionIdx.value, range.value.s, range.value.e) : null
)

const days = computed(() => (overall.value ? overall.value.days : 0))

function exportCsv() {
  const s = cur.value
  const head = ['序号', '时段', ...(scale.value !== 'day' ? ['天数'] : []),
    `${AVG_NAME[scale.value]}（m）`, '最大值（m）', '最小值（m）', '较目标（m）', '达标率']
  const lines = periods.value.map((p, i) => [
    i + 1, p.label,
    ...(scale.value !== 'day' ? [p.days] : []),
    p.avg.toFixed(2), p.max.toFixed(2), p.min.toFixed(2),
    (p.diff > 0 ? '+' : '') + p.diff.toFixed(2), p.rate.toFixed(1) + '%'
  ])
  downloadCsv(`生态流量统计分析_${s.name}_${range.value.s}~${range.value.e}.csv`, head, lines)
}

const SERIES_NAME = { day: '日均水位（m）', xun: '旬均水位（m）', month: '月均水位（m）', year: '年均水位（m）' }
const seriesName = computed(() => SERIES_NAME[scale.value] || '实测水位（m）')

// y 轴按数据范围收紧（避免只有几个等值点时轴被拉得过宽），并按“整齐步长”取整，保证刻度是等距两位数
const axisRange = computed(() => {
  const vals = periods.value.map((p) => p.avg)
  if (!vals.length) return { min: undefined, max: undefined, interval: undefined }
  const lo = Math.min(...vals, cur.value.z)
  const hi = Math.max(...vals, cur.value.z)
  const pad = Math.max((hi - lo) * 0.18, 0.02)
  const a = lo - pad
  const b = hi + pad
  // 步长取 1/2/2.5/5/10 × 10^n
  const raw = (b - a) / 5 || 0.01
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const n = raw / mag
  const k = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  const step = Math.max(k * mag, 0.01)
  const r2 = (v) => Math.round(v * 100) / 100
  return {
    min: r2(Math.floor(a / step) * step),
    max: r2(Math.ceil(b / step) * step),
    interval: r2(step)
  }
})

const chartOption = computed(() => {
  const s = cur.value
  const list = periods.value
  const singleYear = new Set(list.map((p) => p.label.slice(0, 4))).size === 1
  const dailyLike = scale.value === 'day' || scale.value === 'xun'
  const xData = list.map((p) => (dailyLike && singleYear ? p.label.slice(5) : p.label))
  const many = list.length > 40
  return {
    grid: { left: 52, right: 24, top: 34, bottom: 36 },
    legend: {
      top: 0,
      right: 6,
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 16,
      icon: 'roundRect',
      textStyle: { fontSize: 12, color: '#606266' }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (ps) => {
        const p = list[ps[0].dataIndex]
        if (!p) return ''
        const diff = p.avg - s.z
        const tip = diff >= 0 ? `高于目标 ${diff.toFixed(2)} m` : `低于目标 ${Math.abs(diff).toFixed(2)} m`
        return `${p.label}<br/>${AVG_NAME[scale.value]}：<b>${p.avg.toFixed(2)}</b> m`
          + `<br/>最大值：${p.max.toFixed(2)} m　最小值：${p.min.toFixed(2)} m`
          + `<br/>${tip}　达标率 ${p.rate.toFixed(1)}%`
      }
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisLabel: { fontSize: 11, color: '#606266', margin: 10, hideOverlap: true }
    },
    yAxis: {
      type: 'value',
      min: axisRange.value.min,
      max: axisRange.value.max,
      interval: axisRange.value.interval,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 11, color: '#606266', formatter: (v) => v.toFixed(2) },
      splitLine: { lineStyle: { color: '#f0f2f5' } }
    },
    series: [
      {
        name: seriesName.value,
        type: 'line',
        smooth: 0.25,
        showSymbol: !many,
        symbolSize: 5,
        lineStyle: { width: 2, color: '#017de4' },
        itemStyle: { color: '#017de4' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(1,125,228,.22)' },
              { offset: 1, color: 'rgba(1,125,228,.02)' }
            ]
          }
        },
        data: list.map((p) => p.avg),
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#26a869', type: 'dashed', width: 1.5 },
          label: {
            formatter: `生态目标 ${s.z.toFixed(2)} m`,
            position: 'insideEndTop',
            color: '#26a869',
            fontSize: 11
          },
          data: [{ yAxis: s.z }]
        }
      }
    ]
  }
})
</script>
