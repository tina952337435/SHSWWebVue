<template>
  <div class="query">
    <!-- 查询条件 -->
    <div class="q-cond">
      <h3>查询条件</h3>
      <div class="q-grid">
        <div class="q-fld">
          <div class="lb">年份区间</div>
          <div class="yr-sel">
            <select v-model.number="QS.y0" @change="onYearChange">
              <option v-for="y in RES_YEARS" :key="y" :value="y">{{ y }} 年</option>
            </select>
            <span class="arw">至</span>
            <select v-model.number="QS.y1" @change="onYearChange">
              <option v-for="y in RES_YEARS" :key="y" :value="y">{{ y }} 年</option>
            </select>
          </div>
        </div>
        <div class="q-fld">
          <div class="lb">统计指标</div>
          <div class="chk-grid">
            <label
              v-for="m in METRICS"
              :key="m.k"
              class="chk"
              :class="{ on: QS.metric === m.k }"
              @click="selectMetric(m.k)"
            >
              <span class="box"></span>{{ m.n }}<span class="u">{{ m.u }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- 页签：维度 + 指标 -->
    <div class="q-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        :class="{ on: QS.tab === t.key }"
        @click="QS.tab = t.key"
      >
        {{ t.n }}
      </button>
      <div class="q-tabs-ops"><ExportButton @export="exportCsv" /></div>
    </div>

    <!-- 内容 -->
    <div class="q-body">
      <div v-if="!activeTab" class="empty">请至少选择一个统计指标</div>
      <template v-else>
        <div v-for="(c, i) in charts" :key="i" class="chart-box">
          <div class="ct">{{ c.title }}</div>
          <BarChart :option="c.option" :height="300" />
        </div>
        <div v-html="tableHtml"></div>
        <div v-if="noteHtml" v-html="noteHtml"></div>
        <div v-if="activeTab.dim === 'th' || activeTab.dim === 'cj'" class="legend-note">
          <span>● 过境水资源量单独统计，<b>不计入本地水资源总量</b>（本地总量 = 地表水资源量 + 地下水与地表水资源不重复量）。</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import BarChart from '@/components/BarChart.vue'
import ExportButton from '@/components/ExportButton.vue'
import { RES } from '@/data/waterResources'
import { AREA_ADM, AREA_ZONE, KM2_TO_YIM3 } from '@/data/area'
import { downloadCsv } from '@/utils/csv'

const METRICS = [
  { k: 'p', n: '降水量', u: 'mm' },
  { k: 'ev', n: '蒸发量', u: 'mm' },
  { k: 's', n: '地表水资源量', u: '亿m³' },
  { k: 'g', n: '地下水资源量', u: '亿m³' },
  { k: 't', n: '本地水资源总量', u: '亿m³' },
  { k: 'in', n: '来水量', u: '亿m³' }
]

const DIM_N = { city: '全市', adm: '行政分区', zone: '水资源分区', th: '太湖流域', cj: '长江干流' }

// 指标 → 该指标下可用的统计维度
const MET_DIMS = {
  p: ['city', 'adm', 'zone'],
  ev: ['city'],
  s: ['city', 'adm', 'zone'],
  g: ['city', 'adm', 'zone'],
  t: ['city', 'adm', 'zone'],
  in: ['th', 'cj']
}

const ADM_NAMES = ['中心城区', '浦东新区', '闵行区', '宝山区', '嘉定区', '金山区', '松江区', '青浦区', '奉贤区', '崇明区']
const ZONE_NAMES = ['黄浦江区', '杭嘉湖区', '武阳区', '通南及崇明岛诸河']

const RES_YEARS = RES.years
const QS = reactive({ y0: 2021, y1: 2023, metric: 'p', tab: 'p:city' })

const COLORS = ['#017de4', '#67c23a', '#e6a23c', '#9b59b6', '#00a0a8', '#f56c6c']
const AVG_COLOR = '#f59e0b'

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}
function nf(v, d = 2) { return (v == null || isNaN(v)) ? '—' : Number(v).toFixed(d) }
function cell(v, d) { return v != null ? nf(v, d) : '<span class="muted">—</span>' }

/* ================= 页签 ================= */
const tabs = computed(() => {
  const m = METRICS.find((x) => x.k === QS.metric)
  if (!m) return []
  return (MET_DIMS[m.k] || []).map((d) => ({ key: `${m.k}:${d}`, n: `${DIM_N[d]}${m.n}`, m, dim: d }))
})

const activeTab = computed(() => tabs.value.find((t) => t.key === QS.tab) || tabs.value[0] || null)

const years = computed(() => {
  const a = []
  for (let y = QS.y0; y <= QS.y1; y++) if (RES_YEARS.includes(y)) a.push(y)
  return a
})

function onYearChange() {
  if (QS.y0 > QS.y1) { const t = QS.y0; QS.y0 = QS.y1; QS.y1 = t }
}

function selectMetric(k) {
  if (QS.metric === k) return
  QS.metric = k
  QS.tab = tabs.value[0] ? tabs.value[0].key : ''
}

function cityVal(c, k) {
  if (k === 'p') return c.p
  if (k === 'ev') return c.ev
  if (k === 's') return c.s
  if (k === 'g') return c.g
  if (k === 't') return c.t
  return null
}
function dec(m) { return m.k === 'p' || m.k === 'ev' ? 1 : 2 }
// 某年是否有明细数据（2019/2020 的行政分区是空对象，不能按 truthy 判断）
function hasY(src, y) { return !!src[y] && Object.keys(src[y]).length > 0 }

/* ================= 表格 ================= */
const tableHtml = computed(() => {
  const t = activeTab.value
  const ys = years.value
  if (!t || !ys.length) return ''
  if (t.dim === 'city') return renderCity(t.m, ys)
  if (t.dim === 'adm') return renderAdm(t.m, ys)
  if (t.dim === 'zone') return renderZone(t.m, ys)
  if (t.dim === 'th' || t.dim === 'cj') return renderFlow(ys, t.dim)
  return ''
})

/* 展示列：降水量额外带一列「折合水量（亿立方米）」 */
function cols(m) {
  if (m.k === 'p') {
    return [
      { k: 'p', n: '降水量', u: '毫米', d: 1 },
      { k: 'pw', n: '折合水量', u: '亿立方米', d: 2 }
    ]
  }
  return [{ k: m.k, n: m.n, u: m.u, d: dec(m) }]
}

function headHtml(label, width, cs, ys) {
  let h = '<table class="dt"><thead>'
  if (cs.length > 1) {
    h += `<tr><th style="width:${width}px" rowspan="2">${label}</th>`
    ys.forEach((y) => { h += `<th class="num" colspan="${cs.length}" style="text-align:center">${y} 年</th>` })
    h += '</tr><tr>'
    ys.forEach(() => {
      cs.forEach((c) => {
        h += `<th class="num" style="min-width:104px">${c.n}<br><span style="font-weight:400;color:#909399;font-size:10.5px">（${c.u}）</span></th>`
      })
    })
    h += '</tr>'
  } else {
    h += `<tr><th style="width:${width}px">${label}</th>`
    ys.forEach((y) => { h += `<th class="num" style="min-width:110px">${y} 年（${cs[0].u}）</th>` })
    h += '</tr>'
  }
  return h + '</thead>'
}

function cells(cs, ys, get) {
  let h = ''
  ys.forEach((y) => {
    cs.forEach((c) => {
      const v = get(y, c.k)
      h += `<td class="num">${v == null ? '<span class="muted">—</span>' : nf(v, c.d)}</td>`
    })
  })
  return h
}

// 全市行：取公报全市值
function cityGet(y, key) {
  if (key === 'pw') return RES.citypw[y]
  const c = RES.city[y]
  return c ? cityVal(c, key) : null
}

// 分区行：折合水量 = 降水量 × 面积
function unitGet(src, areaMap, n) {
  return (y, key) => {
    const d = (src[y] || {})[n]
    if (!d) return null
    if (key === 'pw') return d.p != null && areaMap[n] ? d.p * areaMap[n] * KM2_TO_YIM3 : null
    return d[key]
  }
}

function renderCity(m, ys) {
  const cs = cols(m)
  return headHtml('统计单元', 200, cs, ys)
    + '<tbody><tr class="sumrow"><td><b>全市</b></td>' + cells(cs, ys, cityGet) + '</tr></tbody></table>'
}

function renderAdm(m, ys) {
  const cs = cols(m)
  let h = headHtml('行政区', 140, cs, ys) + '<tbody>'
  h += '<tr class="sumrow"><td><b>全市</b></td>' + cells(cs, ys, cityGet) + '</tr>'
  ADM_NAMES.forEach((n) => { h += `<tr><td>${n}</td>` + cells(cs, ys, unitGet(RES.adm, AREA_ADM, n)) + '</tr>' })
  return h + '</tbody></table>'
}

function renderZone(m, ys) {
  const cs = cols(m)
  let h = headHtml('水资源分区', 190, cs, ys) + '<tbody>'
  h += '<tr class="sumrow"><td><b>全市</b></td>' + cells(cs, ys, cityGet) + '</tr>'
  ZONE_NAMES.forEach((n) => { h += `<tr><td>${n}</td>` + cells(cs, ys, unitGet(RES.zone, AREA_ZONE, n)) + '</tr>' })
  return h + '</tbody></table>'
}

function renderFlow(ys, kind) {
  const data = kind === 'th' ? RES.taihui : RES.changjiang
  const label = kind === 'th'
    ? { n: '太湖流域来水量', site: '黄浦江松浦大桥断面', more: [{ y: 2021, v: '576 m³/s（年平均净泄流量）' }, { y: 2022, v: '580 m³/s' }, { y: 2023, v: '620 m³/s' }] }
    : { n: '长江干流来水量', site: '长江徐六泾水文站', more: [{ y: 2021, v: '31 600 m³/s（年平均流量）' }, { y: 2022, v: '23 500 m³/s' }, { y: 2023, v: '22 086 m³/s' }] }
  let h = '<table class="dt"><thead><tr><th style="width:190px">统计指标</th><th style="width:170px">计量断面</th>'
  ys.forEach((y) => { h += `<th class="num" style="min-width:96px">${y} 年</th>` })
  h += '</tr></thead><tbody>'
  h += `<tr><td><b>${label.n}</b></td><td>${label.site}</td>`
  ys.forEach((y) => { h += `<td class="num">${cell(data[y], 2)}</td>` })
  h += '</tr>'
  h += `<tr><td style="color:#606266">对应断面年平均流量</td><td>${label.site}</td>`
  ys.forEach((y) => { const m = label.more.find((x) => x.y === y); h += `<td class="num">${m ? esc(m.v) : '<span class="muted">—</span>'}</td>` })
  h += '</tr></tbody></table>'
  return h
}

const noteHtml = computed(() => {
  const t = activeTab.value
  if (!t) return ''
  const ys = years.value
  if (t.dim === 'adm') {
    const miss = ys.filter((y) => !hasY(RES.adm, y))
    if (miss.length) return `<div class="warnbox">提示：${miss.join('、')} 年各行政区明细表未纳入本次数据集（该年度公报为扫描版，暂缺表结构），已以"—"占位。正式建设时由数据库按年度补齐。</div>`
  }
  if (t.dim === 'zone') {
    const miss = ys.filter((y) => !hasY(RES.zone, y))
    if (miss.length) return `<div class="warnbox">提示：${miss.join('、')} 年水资源分区明细暂缺，已以"—"占位。</div>`
  }
  return ''
})

/* ================= 导出 ================= */
function exportCsv() {
  const t = activeTab.value
  const ys = years.value
  if (!t || !ys.length) return
  const m = t.m

  if (t.dim === 'th' || t.dim === 'cj') {
    const kind = t.dim
    const data = kind === 'th' ? RES.taihui : RES.changjiang
    const label = kind === 'th'
      ? { n: '太湖流域来水量', site: '黄浦江松浦大桥断面', more: [{ y: 2021, v: '576 m³/s（年平均净泄流量）' }, { y: 2022, v: '580 m³/s' }, { y: 2023, v: '620 m³/s' }] }
      : { n: '长江干流来水量', site: '长江徐六泾水文站', more: [{ y: 2021, v: '31 600 m³/s（年平均流量）' }, { y: 2022, v: '23 500 m³/s' }, { y: 2023, v: '22 086 m³/s' }] }
    const head = ['统计指标', '计量断面', ...ys.map((y) => `${y} 年`)]
    const row1 = [label.n, label.site, ...ys.map((y) => (data[y] != null ? nf(data[y], 2) : '—'))]
    const row2 = ['对应断面年平均流量', label.site, ...ys.map((y) => { const x = label.more.find((z) => z.y === y); return x ? x.v : '—' })]
    downloadCsv(`历年水资源量_${label.n}.csv`, head, [row1, row2])
    return
  }

  const cs = cols(m)
  const head = [
    t.dim === 'city' ? '统计单元' : t.dim === 'adm' ? '行政区' : '水资源分区',
    ...ys.flatMap((y) => cs.map((c) => `${y}年${c.n}（${c.u}）`))
  ]
  const names = t.dim === 'city' ? ['全市'] : t.dim === 'adm' ? ['全市', ...ADM_NAMES] : ['全市', ...ZONE_NAMES]
  const rows = names.map((n) => {
    const getter = n === '全市' ? cityGet : (t.dim === 'adm' ? unitGet(RES.adm, AREA_ADM, n) : unitGet(RES.zone, AREA_ZONE, n))
    return [n, ...ys.flatMap((y) => cs.map((c) => { const v = getter(y, c.k); return v == null ? '—' : nf(v, c.d) }))]
  })
  downloadCsv(`历年水资源量_${DIM_N[t.dim]}_${m.n}.csv`, head, rows)
}

/* ================= 图表 ================= */
function avg(vals) {
  const arr = vals.filter((v) => v != null)
  if (!arr.length) return null
  const m = arr.reduce((a, b) => a + b, 0) / arr.length
  return Number(m.toFixed(m >= 100 ? 1 : 2))
}

function barOption(xLabels, series) {
  return {
    tooltip: { trigger: 'axis' },
    legend: series.length > 1 ? { top: 0 } : undefined,
    grid: { left: 64, right: 24, top: series.length > 1 ? 44 : 32, bottom: 44 },
    xAxis: { type: 'category', data: xLabels, axisLabel: { interval: 0, rotate: xLabels.length > 6 ? 25 : 0 } },
    yAxis: { type: 'value' },
    series: series.map((s, i) => {
      if (s.name === '多年平均') {
        return {
          name: s.name,
          type: 'line',
          data: s.data,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: AVG_COLOR, width: 2 },
          itemStyle: { color: AVG_COLOR }
        }
      }
      return {
        name: s.name,
        type: 'bar',
        data: s.data,
        barMaxWidth: 42,
        itemStyle: s.itemStyle || { color: s.color || COLORS[i % COLORS.length] }
      }
    })
  }
}

// 时间序列型图（全市 / 太湖 / 长江）：柱 = 逐年，线 = 多年平均
function timeBarOption(ys, name, data) {
  const avgVal = avg(data)
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 64, right: 24, top: 44, bottom: 44 },
    xAxis: { type: 'category', data: ys.map(String), axisLabel: { interval: 0, rotate: ys.length > 6 ? 25 : 0 } },
    yAxis: { type: 'value' },
    series: [
      { name, type: 'bar', data, barMaxWidth: 42, itemStyle: { color: '#017de4' } },
      {
        name: '多年平均',
        type: 'line',
        data: ys.map(() => avgVal),
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: AVG_COLOR, width: 2 },
        itemStyle: { color: AVG_COLOR },
        z: 5
      }
    ]
  }
}

const charts = computed(() => {
  const t = activeTab.value
  const ys = years.value
  if (!t || !ys.length) return []
  const m = t.m

  if (t.dim === 'city') {
    const data = ys.map((y) => { const c = RES.city[y]; return c ? cityVal(c, m.k) : null })
    if (!data.some((v) => v != null)) return []
    return [{ title: `全市历年${m.n}（${m.u}）`, option: timeBarOption(ys, m.n, data) }]
  }

  if (t.dim === 'adm' || t.dim === 'zone') {
    const isAdm = t.dim === 'adm'
    const names = isAdm ? ADM_NAMES : ZONE_NAMES
    const src = isAdm ? RES.adm : RES.zone
    const ys2 = ys.filter((y) => hasY(src, y))
    if (!ys2.length) return []
    const series = ys2.map((y, i) => ({
      name: `${y} 年`,
      color: COLORS[i % COLORS.length],
      data: names.map((n) => { const d = (src[y] || {})[n]; return d && d[m.k] != null ? d[m.k] : null })
    }))
    series.push({
      name: '多年平均',
      color: AVG_COLOR,
      data: names.map((n) => avg(ys2.map((y) => { const d = (src[y] || {})[n]; return d && d[m.k] != null ? d[m.k] : null })))
    })
    return [{ title: `${isAdm ? '各行政区' : '各水资源分区'} ${m.n}（${m.u}）`, option: barOption(names, series) }]
  }

  if (t.dim === 'th' || t.dim === 'cj') {
    const data = t.dim === 'th' ? RES.taihui : RES.changjiang
    const name = t.dim === 'th' ? '太湖流域来水量' : '长江干流来水量'
    const vals = ys.map((y) => (data[y] != null ? data[y] : null))
    return [{ title: `${name}历年（亿m³）`, option: timeBarOption(ys, name, vals) }]
  }

  return []
})
</script>
