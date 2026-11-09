<template>
  <div class="pf">
    <div class="pf-tabs">
      <span :class="{ on: tab === 'single' }" @click="tab = 'single'">单指标</span>
      <span :class="{ on: tab === 'multi' }" @click="tab = 'multi'">多指标</span>
    </div>

    <!-- 单指标 -->
    <template v-if="tab === 'single'">
      <div class="io-cond">
        <div class="io-fld">
          <label>统计年份</label>
          <select v-model.number="sYear" style="width: 104px">
            <option v-for="y in FLUX_YEARS" :key="y" :value="y">{{ y }}年</option>
          </select>
        </div>
        <div class="io-scale">
          <div class="sc-tabs">
            <span
              v-for="s in FLUX_SCALES"
              :key="s.k"
              class="sc-item"
              :class="{ on: sScale === s.k }"
              @click="sScale = s.k"
            >{{ s.n }}</span>
          </div>
        </div>
        <div class="io-fld" v-if="sScale === 'month'">
          <label>月份</label>
          <select v-model.number="sMonth" style="width: 90px">
            <option v-for="m in 12" :key="m" :value="m - 1">{{ m }}月</option>
          </select>
        </div>
        <div class="io-fld" v-if="sScale === 'quarter'">
          <label>季度</label>
          <select v-model.number="sQuarter" style="width: 104px">
            <option v-for="q in 4" :key="q" :value="q - 1">第{{ '一二三四'[q - 1] }}季度</option>
          </select>
        </div>
        <div class="io-fld">
          <label>污染物因子</label>
          <div class="pf-chips">
            <span
              v-for="f in FLUX_FACTORS"
              :key="f.k"
              class="pf-chip"
              :class="{ on: singleFactor === f.k }"
              @click="singleFactor = f.k"
            >
              <i :style="{ background: f.color }"></i>{{ f.n }}
            </span>
          </div>
        </div>
      </div>

      <div class="pf-body">
        <div class="pf-charts pf-charts2">
          <div class="card pf-donut">
            <div class="ew-toolbar">
              <span class="pf-ct">出污染物通量</span>
              <span class="ew-tip pf-right">{{ sPeriodLabel }} · 吨</span>
            </div>
            <div class="bd">
              <BarChart :option="outPieOption" :height="222" />
            </div>
          </div>
          <div class="card pf-donut">
            <div class="ew-toolbar">
              <span class="pf-ct">入污染物通量</span>
              <span class="ew-tip pf-right">{{ sPeriodLabel }} · 吨</span>
            </div>
            <div class="bd">
              <BarChart :option="inPieOption" :height="222" />
            </div>
          </div>
        </div>

        <div class="card ew-table">
          <div class="ew-toolbar">
            <!-- <span class="ew-tip">水质指标（平均值）= 通量 ÷ 水量 ÷ 100 · 沪苏/沪浙以「入」为主，入江入海以「出」为主</span> -->
            <span class="ew-ops"><ExportButton @export="exportSingleCsv" /></span>
          </div>
          <div class="bd">
            <table class="dt">
              <thead>
                <tr>
                  <th style="width:60px">序号</th>
                  <th>分析对象</th>
                  <th>水质指标（平均值，mg/L）</th>
                  <th>水量（亿 m³）</th>
                  <th>通量（t）</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(g, i) in single.groups" :key="g.k">
                  <td>{{ i + 1 }}</td>
                  <td>{{ g.name }}</td>
                  <td class="num">{{ g.conc.toFixed(2) }}</td>
                  <td class="num">{{ g.water.toFixed(1) }}</td>
                  <td class="num">{{ fmt(g.flux) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="tot">
                  <td>—</td>
                  <td>合计</td>
                  <td class="num">—</td>
                  <td class="num">{{ single.total.water.toFixed(1) }}</td>
                  <td class="num">{{ fmt(single.total.flux) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- 多指标：单个断面 + 多个因子，选定方向（出 / 入）看各因子构成，点扇区看该因子过程 -->
    <template v-else>
    <!-- 分析条件 -->
    <div class="pf-cond">
      <div class="pf-row">
        <div class="io-fld">
          <label>统计年份</label>
          <select v-model.number="year" style="width: 104px">
            <option v-for="y in FLUX_YEARS" :key="y" :value="y">{{ y }}年</option>
          </select>
        </div>
        <div class="io-scale">
          <div class="sc-tabs">
            <span
              v-for="s in FLUX_SCALES"
              :key="s.k"
              class="sc-item"
              :class="{ on: scale === s.k }"
              @click="scale = s.k"
            >{{ s.n }}</span>
          </div>
        </div>
        <div class="io-fld">
          <label>断面</label>
          <select v-model="station" style="width: 208px">
            <optgroup v-for="g in FLUX_TREE" :key="g.k" :label="g.n">
              <option v-for="s in g.children" :key="s.k" :value="s.k">{{ s.n }}（{{ s.river }}）</option>
            </optgroup>
          </select>
        </div>
        <div class="io-fld">
          <label>方向</label>
          <div class="sc-tabs">
            <span class="sc-item" :class="{ on: dir === 'out' }" @click="dir = 'out'">出</span>
            <span class="sc-item" :class="{ on: dir === 'in' }" @click="dir = 'in'">入</span>
          </div>
        </div>
      </div>

      <div class="pf-row pf-row2">
        <label class="pf-lb">污染物因子</label>
        <div class="pf-chips">
          <span
            v-for="f in FLUX_FACTORS"
            :key="f.k"
            class="pf-chip"
            :class="{ on: factors.includes(f.k) }"
            @click="toggleFactor(f.k)"
          >
            <i :style="{ background: factors.includes(f.k) ? f.color : '#cbd2db' }"></i>{{ f.n }}
          </span>
        </div>
        <!-- <span class="pf-hint">可多选；左侧饼图每 3 秒轮换一个因子，右侧过程线跟随；也可点扇区手动切换</span> -->
      </div>
    </div>

    <div class="pf-body">
      <!-- 图表 -->
      <div class="pf-charts">
        <div class="card pf-donut" @mouseenter="pauseCycle" @mouseleave="resumeCycle">
          <div class="ew-toolbar">
            <span class="pf-ct">{{ dirLabel }}污染物通量构成</span>
          </div>
          <div class="bd">
            <BarChart v-if="viewRows.length" :option="multiPieOption" :height="240" @pick="onPiePick" />
            <div v-else class="io-empty">请选择污染物因子</div>
          </div>
        </div>
        <div class="card pf-trend">
          <div class="ew-toolbar">
            <span class="pf-ct">{{ pickedRow ? pickedRow.n + ' ' + dirLabel + '通量过程' : '通量过程' }}</span>
          </div>
          <div class="bd">
            <BarChart v-if="pickedRow && multi.periods.length" :option="trendOption" :height="240" />
            <div v-else class="io-empty">请选择污染物因子</div>
          </div>
        </div>
      </div>

      <!-- 明细：按时间列出各指标通量 -->
      <div class="card ew-table">
        <div class="ew-toolbar">
          <span class="ew-ops"><ExportButton @export="exportCsv" /></span>
        </div>
        <div class="bd">
          <table class="dt">
            <thead>
              <tr>
                <th style="width: 56px">序号</th>
                <th style="width: 140px">时间</th>
                <th>水量（亿 m³）</th>
                <th v-for="f in multi.factors" :key="f.k">{{ f.n }}（t）</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in multi.periods" :key="p.label">
                <td>{{ i + 1 }}</td>
                <td>{{ p.label }}</td>
                <td class="num">{{ periodWater(p).toFixed(2) }}</td>
                <td v-for="f in multi.factors" :key="f.k" class="num">{{ fmt(periodFlux(p, f.k)) }}</td>
              </tr>
              <tr v-if="!multi.periods.length">
                <td :colspan="3 + multi.factors.length" class="empty">请选择污染物因子</td>
              </tr>
            </tbody>
            <tfoot v-if="multi.periods.length">
              <tr class="tot">
                <td>—</td>
                <td>合计</td>
                <td class="num">{{ tableTotals.water.toFixed(2) }}</td>
                <td v-for="f in multi.factors" :key="f.k" class="num">{{ fmt(tableTotals.values[f.k]) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import BarChart from '@/components/BarChart.vue'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'
import {
  FLUX_FACTORS,
  FLUX_TREE,
  FLUX_YEARS,
  FLUX_SCALES,
  calcMultiFlux,
  calcSingleFlux
} from '@/data/pollutantFlux'

const year = ref(2025)
const scale = ref('month')
const station = ref('jz')
const dir = ref('out')
const factors = ref(['cod', 'nh3', 'tp', 'tn'])

const dirLabel = computed(() => (dir.value === 'out' ? '出' : '入'))

const multi = computed(() =>
  calcMultiFlux(station.value, {
    year: year.value,
    scale: scale.value,
    factors: factors.value
  })
)

// 当前方向下各因子通量，按大小倒序（饼图、表格同序）
const viewRows = computed(() =>
  multi.value.rows
    .map((r) => ({ ...r, dirVal: dir.value === 'out' ? r.outFlux : r.inFlux }))
    .sort((a, b) => b.dirVal - a.dirVal)
)
const dirTotal = computed(() => viewRows.value.reduce((a, r) => a + r.dirVal, 0))

// 当前在过程线里展示的因子；默认取占比最大的那个
const pick = ref('')
const pickedKey = computed(() => {
  const rows = viewRows.value
  if (!rows.length) return ''
  return rows.some((r) => r.k === pick.value) ? pick.value : rows[0].k
})
const pickedRow = computed(() => viewRows.value.find((r) => r.k === pickedKey.value) || null)

// 明细表：按时间分期，出/入按各因子入占比折算
const ratioByKey = computed(() => {
  const map = {}
  for (const r of multi.value.rows) {
    map[r.k] = dir.value === 'out' ? 1 - r.inRatio / 100 : r.inRatio / 100
  }
  return map
})
// 期间水量 = 年水量 × 期间月数 / 12
function periodWater(p) {
  const n = p.months && p.months.length ? p.months.length : 12
  return multi.value.water * (n / 12)
}
function periodFlux(p, k) {
  return (p.values[k] || 0) * (ratioByKey.value[k] || 0)
}
const tableTotals = computed(() => {
  const values = {}
  let water = 0
  for (const p of multi.value.periods) {
    water += periodWater(p)
    for (const f of multi.value.factors) values[f.k] = (values[f.k] || 0) + periodFlux(p, f.k)
  }
  return { water, values }
})

function onPiePick(p) {
  const f = FLUX_FACTORS.find((x) => x.n === p.name)
  if (!f) return
  pick.value = f.k
  startCycle() // 手动点选后重新计时，从该因子继续轮播
}

function toggleFactor(k) {
  const i = factors.value.indexOf(k)
  if (i >= 0) {
    if (factors.value.length === 1) return
    factors.value.splice(i, 1)
  } else {
    factors.value.push(k)
  }
}

const fmt = (v) => {
  if (v == null || Number.isNaN(v)) return '—'
  if (v === 0) return '0'
  if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString('en-US')
  if (Math.abs(v) >= 100) return v.toFixed(1)
  if (Math.abs(v) >= 1) return v.toFixed(2)
  return v.toFixed(3)
}
/* ---------- 单指标 ---------- */
const tab = ref('single')
const singleFactor = ref('cod')
const sYear = ref(2025)
const sScale = ref('year')
const sMonth = ref(0)
const sQuarter = ref(0)

const single = computed(() => calcSingleFlux(singleFactor.value, {
  year: sYear.value,
  scale: sScale.value,
  period: sScale.value === 'month' ? sMonth.value : sScale.value === 'quarter' ? sQuarter.value : 0
}))

const sPeriodLabel = computed(() => {
  if (sScale.value === 'month') return `${sYear.value}年${sMonth.value + 1}月`
  if (sScale.value === 'quarter') return `${sYear.value}年第${'一二三四'[sQuarter.value]}季度`
  return `${sYear.value}年`
})

const GROUP_COLORS = { hs: '#017de4', hz: '#26a869', rj: '#7b8cff' }

function pieOption(data, centerText) {
  return {
    tooltip: {
      trigger: 'item',
      formatter: (p) => `${p.name}<br/><b>${fmt(p.value)}</b> t　占比 ${p.percent}%`
    },
    legend: {
      orient: 'vertical',
      right: 4,
      top: 'middle',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 12,
      icon: 'roundRect',
      textStyle: { fontSize: 12, color: '#606266' },
      formatter: (n) => {
        const d = data.find((x) => x.name === n)
        return d ? `${n}　${fmt(d.value)} t` : n
      }
    },
    graphic: [
      {
        type: 'text',
        left: '27%',
        top: '41%',
        style: { text: centerText, fontSize: 18, fontWeight: 700, fill: '#017de4', textAlign: 'center' }
      },
      {
        type: 'text',
        left: '27%',
        top: '55%',
        style: { text: '吨', fontSize: 11, fill: '#8a94a3', textAlign: 'center' }
      }
    ],
    series: [
      {
        type: 'pie',
        radius: ['48%', '70%'],
        center: ['28%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        data: data.map((d) => ({ name: d.name, value: d.value, itemStyle: { color: d.color } }))
      }
    ]
  }
}

const outPieOption = computed(() => pieOption(
  single.value.groups.map((g) => ({ name: g.name, value: g.outFlux, color: GROUP_COLORS[g.k] })),
  fmt(single.value.total.outFlux)
))
const inPieOption = computed(() => pieOption(
  single.value.groups.map((g) => ({ name: g.name, value: g.inFlux, color: GROUP_COLORS[g.k] })),
  fmt(single.value.total.inFlux)
))

function exportSingleCsv() {
  const s = single.value
  const head = ['序号', '分析对象', '水质指标（平均值，mg/L）', '水量（亿 m³）', '通量（t）']
  const lines = s.groups.map((g, i) => [i + 1, g.name, g.conc.toFixed(2), g.water.toFixed(1), g.flux.toFixed(1)])
  lines.push(['—', '合计', '—', s.total.water.toFixed(1), s.total.flux.toFixed(1)])
  downloadCsv(`省市边界污染物通量_单指标_${s.factor.n}.csv`, head, lines)
  ElMessage.success('报表已导出')
}

/* ---------- 多指标：方向通量构成饼图（点扇区切换过程线因子） ---------- */
const multiPieOption = computed(() => {
  const rows = viewRows.value
  return {
    tooltip: {
      trigger: 'item',
      formatter: (p) => `${p.name}（${dirLabel.value}）<br/><b>${fmt(p.value)}</b> t　占比 ${p.percent}%`
    },
    legend: {
      orient: 'vertical',
      right: 4,
      top: 'middle',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 12,
      icon: 'roundRect',
      textStyle: { fontSize: 12, color: '#606266' },
      formatter: (n) => {
        const d = rows.find((x) => x.n === n)
        return d ? `${n}　${fmt(d.dirVal)} t` : n
      }
    },
    graphic: [
      {
        type: 'text',
        left: '27%',
        top: '41%',
        style: { text: fmt(dirTotal.value), fontSize: 18, fontWeight: 700, fill: '#017de4', textAlign: 'center' }
      },
      {
        type: 'text',
        left: '27%',
        top: '55%',
        style: { text: `${dirLabel.value}通量（吨）`, fontSize: 11, fill: '#8a94a3', textAlign: 'center' }
      }
    ],
    series: [
      {
        type: 'pie',
        radius: ['48%', '70%'],
        center: ['28%', '50%'],
        avoidLabelOverlap: true,
        selectedMode: 'single',
        selectedOffset: 8,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        data: rows.map((r) => ({
          name: r.n,
          value: Math.round(r.dirVal),
          selected: r.k === pickedKey.value,
          itemStyle: { color: r.color }
        }))
      }
    ]
  }
})

/* ---------- 趋势 ---------- */
function niceAxis(vals) {
  const lo = Math.min(0, ...vals)
  const hi = Math.max(...vals, 1)
  const raw = (hi - lo) / 5 || 1
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const n = raw / mag
  const k = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  const step = Math.max(k * mag, 1)
  return { min: Math.floor(lo / step) * step, max: Math.ceil(hi / step) * step, interval: step }
}

function hexA(hex, a) {
  const v = parseInt(String(hex).slice(1), 16)
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`
}

// 过程线：只画当前选中的那一个因子，颜色跟随因子；量级按方向折算
const trendOption = computed(() => {
  const row = pickedRow.value
  const ps = multi.value.periods
  if (!row || !ps.length) return {}
  const ratio = dir.value === 'out' ? 1 - row.inRatio / 100 : row.inRatio / 100
  const vals = ps.map((p) => (p.values[row.k] || 0) * ratio)
  const ax = niceAxis(vals)
  const many = ps.length > 8
  const c = row.color
  return {
    grid: { left: 60, right: 20, top: 16, bottom: 30 },
    tooltip: {
      trigger: 'axis',
      formatter: (arr) => {
        const p = ps[arr[0].dataIndex]
        if (!p) return ''
        return `${p.label}<br/>${row.n} ${dirLabel.value}通量：<b>${fmt(arr[0].value)}</b> t`
      }
    },
    xAxis: {
      type: 'category',
      data: ps.map((p) => p.label),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisLabel: { fontSize: 11, color: '#606266', margin: 10 }
    },
    yAxis: {
      type: 'value',
      min: ax.min,
      max: ax.max,
      interval: ax.interval,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 11, color: '#606266', formatter: (v) => fmt(v) },
      splitLine: { lineStyle: { color: '#f0f2f5' } }
    },
    series: [
      {
        name: `${row.n}（${dirLabel.value}）`,
        type: 'line',
        smooth: 0.25,
        showSymbol: !many,
        symbolSize: 5,
        lineStyle: { width: 2, color: c },
        itemStyle: { color: c },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: hexA(c, 0.22) },
              { offset: 1, color: hexA(c, 0.02) }
            ]
          }
        },
        data: vals
      }
    ]
  }
})

/* ---------- 导出 CSV ---------- */
function exportCsv() {
  const r = multi.value
  if (!r.factors.length) {
    ElMessage.warning('请先选择污染物因子')
    return
  }
  const num = (v) => (Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(2))
  const head = ['序号', '时间', '水量（亿 m³）', ...r.factors.map((f) => `${f.n}${dirLabel.value}通量（t）`)]
  const lines = r.periods.map((p, i) => [
    i + 1, p.label, periodWater(p).toFixed(2),
    ...r.factors.map((f) => num(periodFlux(p, f.k)))
  ])
  lines.push(['—', '合计', tableTotals.value.water.toFixed(2),
    ...r.factors.map((f) => num(tableTotals.value.values[f.k]))])
  downloadCsv(`省市边界污染物通量_多指标_${r.station.n}_${r.year}年_${dirLabel.value}.csv`, head, lines)
  ElMessage.success('报表已导出')
}

/* ---------- 多指标：左侧饼图每 3 秒轮换一个因子，右侧过程线跟随 ---------- */
let cycleTimer = null
let cyclePaused = false
function stopCycle() {
  if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null }
}
function startCycle() {
  stopCycle()
  if (tab.value !== 'multi' || cyclePaused) return
  cycleTimer = setInterval(() => {
    if (cyclePaused) return
    const rows = viewRows.value
    if (rows.length < 2) return
    const i = rows.findIndex((r) => r.k === pickedKey.value)
    pick.value = rows[(i + 1) % rows.length].k
  }, 3000)
}
// 鼠标停在饼图上时暂停轮播，离开后重新计时
function pauseCycle() { cyclePaused = true; stopCycle() }
function resumeCycle() { cyclePaused = false; startCycle() }
watch(
  [tab, () => factors.value.length, () => station.value, () => dir.value],
  () => {
    if (tab.value === 'multi' && viewRows.value.length > 1) startCycle()
    else stopCycle()
  },
  { immediate: true }
)
onBeforeUnmount(stopCycle)
</script>
