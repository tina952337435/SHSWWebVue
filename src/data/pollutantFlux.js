/**
 * 省市边界污染物通量分析（demo）
 * 通量 = 流量 × 浓度 × 时段长度，单位统一为吨（t）
 * 断面：沪苏边界 3 / 沪浙边界 4 / 入江入海 4，共 11 个
 * 年度基准负荷取自设计稿 P4；月度按「汛期高、冬春低」的确定性曲线分摊，
 * 氯化物（咸潮）单独按「冬春高、夏季低」分摊，保证同一年每月的计算结果稳定可复现。
 */

const hsh = (a, b) => {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453
  return x - Math.floor(x)
}
const round1 = (v) => Math.round(v * 10) / 10
const round2 = (v) => Math.round(v * 100) / 100

export const FLUX_FACTORS = [
  { k: 'cod', n: 'COD', unit: 't', color: '#017de4' },
  { k: 'nh3', n: '氨氮', unit: 't', color: '#26a869' },
  { k: 'tp', n: '总磷', unit: 't', color: '#7b8cff' },
  { k: 'tn', n: '总氮', unit: 't', color: '#16b8b0' },
  { k: 'cl', n: '氯化物（咸潮）', unit: 't', color: '#2b4c8c' }
]
export const FLUX_FACTOR_MAP = Object.fromEntries(FLUX_FACTORS.map((f) => [f.k, f]))

/* 原始年度负荷：站名 / 河道 / 分组 / COD / 氨氮 / 总磷 / 氯化物，总氮·石油类·挥发酚按比例派生 */
const RAW = [
  ['jz', '金泽', '太浦河', 'hs', 3860, 214, 62.4, 18600],
  ['md', '泖甸', '拦路港', 'hs', 2940, 168, 48.6, 14200],
  ['st2', '商榻', '急水港', 'hs', 1780, 104, 29.8, 8600],
  ['fw', '枫围', '黄良浦港', 'hz', 1420, 82, 23.4, 6200],
  ['zj', '洙泾', '掘石港', 'hz', 1180, 68, 19.2, 5100],
  ['dt', '东团', '大蒸塘', 'hz', 860, 52, 14.6, 3800],
  ['zy', '张堰', '张泾河', 'hz', 520, 31, 8.4, 2300],
  ['jds', '九段沙', '长江口', 'rj', 4120, 236, 71.2, 22800],
  ['nhz', '南汇嘴', '杭州湾', 'rj', 1240, 74, 18.6, 9400],
  ['lcg', '芦潮港', '杭州湾', 'rj', 980, 58, 14.2, 7600],
  ['jsz', '金山嘴', '杭州湾', 'rj', 640, 38, 9.4, 5200]
]

const GROUP_NAME = { hs: '沪苏边界', hz: '沪浙边界', rj: '入江入海' }
// 入通量占比（出通量 = 1 - 入）；上游沪苏/沪浙以「入」为主，入江入海以「出」为主
const GROUP_IN_RATIO = { hs: 0.82, hz: 0.76, rj: 0.15 }
// 同一断面上不同因子的入/出倾向略有差异：氯化物受咸潮上游来水影响更偏「入」
const FACTOR_IN_SHIFT = { cod: 0.02, nh3: -0.01, tp: -0.03, tn: 0.01, cl: 0.08 }
// 各断面年水量（亿 m³，demo，用于反推水质指标平均值）
const WATER = { jz: 6, md: 4, st2: 2.5, fw: 2, zj: 2.5, dt: 1.5, zy: 1, jds: 8, nhz: 3, lcg: 2.5, jsz: 1.5 }

export const FLUX_STATIONS = RAW.map((r, i) => {
  const [k, n, river, g, cod, nh3, tp, cl] = r
  return {
    k,
    n,
    river,
    groupK: g,
    group: GROUP_NAME[g],
    idx: i,
    water: WATER[k],
    base: {
      cod,
      nh3,
      tp,
      cl,
      tn: round1(nh3 * 3.4)
    }
  }
})
export const FLUX_STATION_MAP = Object.fromEntries(FLUX_STATIONS.map((s) => [s.k, s]))
export const FLUX_KEYS = FLUX_STATIONS.map((s) => s.k)

export const FLUX_TREE = ['hs', 'hz', 'rj'].map((g) => ({
  k: 'g-' + g,
  n: GROUP_NAME[g],
  children: FLUX_STATIONS.filter((s) => s.groupK === g).map((s) => ({ k: s.k, n: s.n, river: s.river }))
}))

export const FLUX_YEARS = [2023, 2024, 2025]
export const FLUX_SCALES = [
  { k: 'month', n: '月' },
  { k: 'quarter', n: '季' },
  { k: 'year', n: '年' }
]
export const FLUX_SOURCES = [
  { k: 'online', n: '在线监测（实时）', w: 1 },
  { k: 'manual', n: '人工监测（汇交成果）', w: 0.94 },
  { k: 'mix', n: '在线+人工融合', w: 0.99 }
]
export const FLUX_SOURCE_MAP = Object.fromEntries(FLUX_SOURCES.map((s) => [s.k, s]))

/** 月度权重：常规因子汛期（7 月）最高，氯化物受咸潮影响冬春（2 月）最高 */
function monthWeight(idx, m, factorKey) {
  const season = factorKey === 'cl'
    ? 0.85 + 0.40 * Math.cos(((m - 2) / 12) * Math.PI * 2)
    : 0.85 + 0.32 * Math.cos(((m - 7) / 12) * Math.PI * 2)
  const noise = 0.88 + hsh(idx + (factorKey === 'cl' ? 41 : 7), m) * 0.24
  return season * noise
}

const PERIOD_NAME = {
  month: (i) => `${i + 1}月`,
  quarter: (i) => `第${'一二三四'[i]}季度`,
  year: () => '全年'
}
const PERIOD_MONTHS = {
  month: (i) => [i + 1],
  quarter: (i) => [i * 3 + 1, i * 3 + 2, i * 3 + 3],
  year: () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
}
const PERIOD_COUNT = { month: 12, quarter: 4, year: 1 }

/**
 * 计算通量
 * @param {object} p
 * @param {number} p.year     统计年份
 * @param {'month'|'quarter'|'year'} p.scale  趋势图时间粒度
 * @param {string[]} p.keys   选中断面
 * @param {string[]} p.factors 选中污染物因子
 * @param {string} p.source   浓度来源
 */
export function calcFlux({ year = 2025, scale = 'month', keys = FLUX_KEYS, factors = ['cod', 'nh3', 'tp', 'cl'], source = 'mix' } = {}) {
  const fs = FLUX_FACTORS.filter((f) => factors.includes(f.k))
  const sts = FLUX_STATIONS.filter((s) => keys.includes(s.k))
  const srcW = (FLUX_SOURCE_MAP[source] || FLUX_SOURCE_MAP.mix).w

  // 每站每因子 → 12 个月的负荷（年度总量 = 基准 × 年际波动）
  const monthlyOf = (s, y) => {
    const yf = 1 + (hsh(y + 17, s.idx + 5) - 0.5) * 0.14
    const out = {}
    for (const f of fs) {
      const w = []
      for (let m = 1; m <= 12; m++) w.push(monthWeight(s.idx, m, f.k))
      const sum = w.reduce((a, b) => a + b, 0)
      out[f.k] = w.map((x) => (s.base[f.k] * yf * x) / sum)
    }
    return out
  }
  const monthly = sts.map((s) => ({ s, out: monthlyOf(s, year) }))

  // 趋势：月度 / 季度取统计年份；年度取各年份对比（年际变化）
  const periods = []
  if (scale === 'year') {
    for (const y of FLUX_YEARS) {
      const values = {}
      let total = 0
      for (const f of fs) {
        let v = 0
        for (const s of sts) v += monthlyOf(s, y)[f.k].reduce((a, b) => a + b, 0)
        values[f.k] = v
        total += v
      }
      periods.push({ label: `${y}年`, months: [], values, total })
    }
  } else {
    const n = PERIOD_COUNT[scale] || 12
    for (let i = 0; i < n; i++) {
      const months = PERIOD_MONTHS[scale](i)
      const values = {}
      let total = 0
      for (const f of fs) {
        let v = 0
        for (const row of monthly) for (const m of months) v += row.out[f.k][m - 1]
        values[f.k] = v
        total += v
      }
      periods.push({ label: PERIOD_NAME[scale](i), months, values, total })
    }
  }

  // 断面明细
  const rows = monthly.map(({ s, out }) => {
    const values = {}
    let total = 0
    for (const f of fs) {
      const v = out[f.k].reduce((a, b) => a + b, 0)
      values[f.k] = v
      total += v
    }
    return {
      k: s.k,
      n: s.n,
      river: s.river,
      group: s.group,
      groupK: s.groupK,
      values,
      total,
      cred: round1(BASE_CRED[s.idx] * srcW),
      share: 0
    }
  })

  const grand = rows.reduce((a, r) => a + r.total, 0)
  rows.forEach((r) => { r.share = grand ? (r.total / grand) * 100 : 0 })
  rows.sort((a, b) => b.total - a.total)

  const totals = {}
  for (const f of fs) totals[f.k] = rows.reduce((a, r) => a + r.values[f.k], 0)

  const top = rows[0] || null
  const clTotal = totals.cl || 0

  return {
    factors: fs,
    rows,
    periods,
    totals,
    grand,
    top: top ? { n: top.n, total: top.total, share: top.share } : null,
    clShare: grand ? (clTotal / grand) * 100 : 0,
    stationCount: rows.length,
    year,
    scale,
    source: (FLUX_SOURCE_MAP[source] || FLUX_SOURCE_MAP.mix).n
  }
}

/* 各断面在线浓度观测完整率（越低说明插值比例越高，可信度越低） */
const BASE_CRED = [97.8, 96.4, 94.2, 93.6, 95.1, 91.4, 89.2, 98.6, 96.9, 95.5, 93.1]

/**
 * 单指标：按分析对象（边界分组）汇总某个因子的 出/入通量、水质指标均值、水量
 * 水质指标（平均浓度，mg/L）= 通量(吨) / (水量(亿m³) × 100)
 * 每个分析对象同时有「出」和「入」两个方向的通量（出 = 总 × (1 - 入占比)）
 * @param {string} factor 因子
 * @param {object} [p] { year, scale('year'|'quarter'|'month'), period(季/月的索引 0 起) }
 */
export function calcSingleFlux(factor, { year = 2025, scale = 'year', period = 0 } = {}) {
  const f = FLUX_FACTOR_MAP[factor] || FLUX_FACTORS[0]
  const months = periodMonths(scale, period)
  const ratio = months.length / 12 // 水量按期间月数占全年比例折算
  const groups = ['hs', 'hz', 'rj'].map((g) => {
    const sts = FLUX_STATIONS.filter((s) => s.groupK === g)
    const water = round2(sts.reduce((a, s) => a + s.water, 0) * ratio)
    const flux = round1(sts.reduce((a, s) => {
      const mf = monthlyOfFactor(s, year, f.k)
      return a + months.reduce((b, m) => b + mf[m - 1], 0)
    }, 0))
    const inFlux = round1(flux * GROUP_IN_RATIO[g])
    const outFlux = round1(flux - inFlux)
    // 水量同样按入/出占比拆分（浓度两向一致，故与通量拆分的比例相同）
    const inWater = round2(water * GROUP_IN_RATIO[g])
    const outWater = round2(water - inWater)
    return {
      k: g,
      name: GROUP_NAME[g],
      water,
      inWater,
      outWater,
      flux,
      conc: round2(flux / (water * 100)),
      inFlux,
      outFlux
    }
  })
  const total = {
    flux: round1(groups.reduce((a, g) => a + g.flux, 0)),
    inFlux: round1(groups.reduce((a, g) => a + g.inFlux, 0)),
    outFlux: round1(groups.reduce((a, g) => a + g.outFlux, 0)),
    water: round2(groups.reduce((a, g) => a + g.water, 0)),
    inWater: round2(groups.reduce((a, g) => a + g.inWater, 0)),
    outWater: round2(groups.reduce((a, g) => a + g.outWater, 0))
  }
  return { factor: f, groups, total, year, scale, period }
}

/**
 * 多指标：单个断面下多个污染物因子的「出 / 入」通量对比
 * 入通量 = 总通量 × 该边界入占比，出通量 = 总通量 − 入通量
 * @param {string} stationKey 断面
 * @param {object} [p] { year, scale('month'|'quarter'|'year'), factors, source }
 */
export function calcMultiFlux(stationKey, { year = 2025, scale = 'month', factors = FLUX_FACTORS.map((f) => f.k), source = 'mix' } = {}) {
  const s = FLUX_STATION_MAP[stationKey] || FLUX_STATIONS[0]
  const fs = FLUX_FACTORS.filter((f) => factors.includes(f.k))
  const srcW = (FLUX_SOURCE_MAP[source] || FLUX_SOURCE_MAP.mix).w
  const inRatio = GROUP_IN_RATIO[s.groupK]

  const monthly = {}
  for (const f of fs) monthly[f.k] = monthlyOfFactor(s, year, f.k)

  const rows = fs.map((f) => {
    const total = monthly[f.k].reduce((a, b) => a + b, 0)
    const ratio = Math.min(0.95, Math.max(0.05, inRatio + (FACTOR_IN_SHIFT[f.k] || 0)))
    const inFlux = round1(total * ratio)
    return {
      k: f.k,
      n: f.n,
      color: f.color,
      total: round1(total),
      inFlux,
      outFlux: round1(total - inFlux),
      inRatio: round1(ratio * 100),
      conc: round2(total / (s.water * 100)),
      share: 0
    }
  })
  const grand = rows.reduce((a, r) => a + r.total, 0)
  rows.forEach((r) => { r.share = grand ? (r.total / grand) * 100 : 0 })
  const total = {
    total: round1(grand),
    inFlux: round1(rows.reduce((a, r) => a + r.inFlux, 0)),
    outFlux: round1(rows.reduce((a, r) => a + r.outFlux, 0))
  }

  // 趋势：年度 → 各年度对比；月 / 季 → 所选年份内分期
  const periods = []
  if (scale === 'year') {
    for (const y of FLUX_YEARS) {
      const values = {}
      let t = 0
      for (const f of fs) {
        const v = monthlyOfFactor(s, y, f.k).reduce((a, b) => a + b, 0)
        values[f.k] = v
        t += v
      }
      periods.push({ label: `${y}年`, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], values, total: t })
    }
  } else {
    for (let i = 0; i < (PERIOD_COUNT[scale] || 12); i++) {
      const months = PERIOD_MONTHS[scale](i)
      const values = {}
      let t = 0
      for (const f of fs) {
        let v = 0
        for (const m of months) v += monthly[f.k][m - 1]
        values[f.k] = v
        t += v
      }
      periods.push({ label: PERIOD_NAME[scale](i), months, values, total: t })
    }
  }

  return {
    station: s,
    factors: fs,
    rows,
    periods,
    total,
    grand,
    water: s.water,
    inRatio,
    cred: round1(BASE_CRED[s.idx] * srcW),
    year,
    scale,
    source: (FLUX_SOURCE_MAP[source] || FLUX_SOURCE_MAP.mix).n
  }
}

/** 某站某因子的 12 个月负荷（年度总量 = 基准 × 年际波动） */
function monthlyOfFactor(s, y, factorKey) {
  const yf = 1 + (hsh(y + 17, s.idx + 5) - 0.5) * 0.14
  const w = []
  for (let m = 1; m <= 12; m++) w.push(monthWeight(s.idx, m, factorKey))
  const sum = w.reduce((a, b) => a + b, 0)
  return w.map((x) => (s.base[factorKey] * yf * x) / sum)
}

/** 单指标统计的月份集合（1-based） */
function periodMonths(scale, period) {
  if (scale === 'month') return [period + 1]
  if (scale === 'quarter') return [period * 3 + 1, period * 3 + 2, period * 3 + 3]
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
}

export const FLUX_CRED_TIP = '数据完整率 = 实测浓度占比，缺测部分按同期上下游线性插值补齐；完整率低于 70% 的断面标记为低可信度。'
