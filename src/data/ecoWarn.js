/**
 * 生态流量（水位）监测预警 demo 数据
 * 断面口径与生态流量月报一致（ECO_SECTIONS 的 12 个保障断面）。
 * 逐日水位按「断面-日期」确定性生成：平时略高于生态目标水位，
 * 偶发「低水位过程」（持续 2—4 天、偏低 0.02—0.08 m），据此形成预警事件。
 */
import { ECO_SECTIONS } from './ecoFlow'

const MS = 86400000
const pad = (n) => String(n).padStart(2, '0')
const round2 = (v) => Math.round(v * 100) / 100
const round1 = (v) => Math.round(v * 10) / 10
const round3 = (v) => Math.round(v * 1000) / 1000

/** 统计尺度 */
export const EW_SCALES = [
  { k: 'day', n: '日' },
  { k: 'xun', n: '旬' },
  { k: 'month', n: '月' },
  { k: 'year', n: '年' }
]

export const EW_DATE_MIN = '2024-01-01'
export const EW_DATE_MAX = '2026-12-31'

/** 预警等级（高 → 低） */
export const EW_LEVELS = [
  { k: 'red', n: '红色', color: '#d94a3d' },
  { k: 'orange', n: '橙色', color: '#e08a2e' },
  { k: 'yellow', n: '黄色', color: '#c9a227' }
]
export const EW_LEVEL_MAP = Object.fromEntries(EW_LEVELS.map((l) => [l.k, l]))

function hsh(a, b, c) {
  const x = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453
  return x - Math.floor(x)
}

const dayNum = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / MS)

/** 'YYYY-MM-DD' → { y, m, d } */
export function parseDate(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || ''))
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return { y, m: mo, d }
}

/** 某断面某日是否处于低水位过程，返回偏低幅度（m），0 表示正常 */
function eventDepth(idx, dn) {
  for (let back = 0; back <= 3; back++) {
    const start = dn - back
    if (hsh(idx + 1, start, 11) < 0.018) {
      const len = 2 + Math.floor(hsh(idx + 2, start, 23) * 3) // 持续 2—4 天
      // 偏低幅度 0.02—0.08 m，平方分布：轻度过程多、重度过程少
      if (back < len) {
        const u = hsh(idx + 3, start, 37)
        return 0.02 + u * u * 0.06
      }
    }
  }
  return 0
}

/** 某断面某日水位（m） */
export function levelOf(idx, y, m, d) {
  const s = ECO_SECTIONS[idx]
  const dn = dayNum(y, m, d)
  // 汛期略高、枯期略低
  const season = 0.02 * Math.sin(((m - 4) / 12) * Math.PI * 2)
  const wave = 0.012 * Math.sin((dn / 11) * Math.PI * 2 + idx * 0.9)
  const noise = (hsh(idx, dn, 5) - 0.5) * 0.012
  const base = s.z + 0.045 + season + wave + noise
  const drop = eventDepth(idx, dn)
  if (!drop) return round2(base)
  return round2(Math.min(base, s.z - drop + (hsh(idx, dn, 7) - 0.5) * 0.004))
}

/** 列出 [start, end] 之间的每一天 */
export function listDays(start, end) {
  const a = parseDate(start)
  const b = parseDate(end)
  const out = []
  if (!a || !b) return out
  const cur = new Date(a.y, a.m - 1, a.d)
  const last = new Date(b.y, b.m - 1, b.d)
  let guard = 0
  while (cur <= last && guard++ < 1600) {
    const y = cur.getFullYear()
    const m = cur.getMonth() + 1
    const d = cur.getDate()
    out.push({ y, m, d, label: `${y}-${pad(m)}-${pad(d)}` })
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

const xunOf = (d) => (d <= 10 ? '上旬' : d <= 20 ? '中旬' : '下旬')

/** 按统计尺度切分分期，每期带自己的日序列 */
export function listPeriods(scale, start, end) {
  const days = listDays(start, end)
  if (scale === 'day' || days.length === 0) return days.map((d) => ({ label: d.label, days: [d] }))
  const map = new Map()
  days.forEach((d) => {
    const key =
      scale === 'year' ? `${d.y}年`
        : scale === 'month' ? `${d.y}-${pad(d.m)}`
          : `${d.y}-${pad(d.m)}${xunOf(d.d)}`
    if (!map.has(key)) map.set(key, { label: key, days: [] })
    map.get(key).days.push(d)
  })
  return [...map.values()]
}

/** 某日的日均 / 日最高 / 日最低（日内起伏按确定性小幅波动模拟） */
export function dayStats(idx, y, m, d) {
  const avg = levelOf(idx, y, m, d)
  const amp = 0.006 + hsh(idx, dayNum(y, m, d), 61) * 0.02
  return { avg, max: round2(avg + amp), min: round2(avg - amp) }
}

/**
 * 分时段统计：按所选尺度（日 / 旬 / 月 / 年）给出
 * 时段均值、时段最高、时段最低、与生态目标的差值、达标天数占比。
 */
export function periodStats(idx, scale, start, end) {
  const s = ECO_SECTIONS[idx]
  return listPeriods(scale, start, end).map((p) => {
    const ds = p.days.map((d) => dayStats(idx, d.y, d.m, d.d))
    const avg = ds.reduce((a, x) => a + x.avg, 0) / ds.length
    const max = Math.max(...ds.map((x) => x.max))
    const min = Math.min(...ds.map((x) => x.min))
    const met = ds.filter((x) => x.avg >= s.z).length
    return {
      label: p.label,
      days: ds.length,
      avg: round2(avg),
      max: round2(max),
      min: round2(min),
      diff: round2(avg - s.z),
      rate: round1((met / ds.length) * 100)
    }
  })
}

/** 整个时段的统计：均值、最高（含日期）、最低（含日期）、达标天数占比 */
export function rangeStats(idx, start, end) {
  const s = ECO_SECTIONS[idx]
  const days = listDays(start, end)
  if (!days.length) return null
  let sum = 0
  let hi = -Infinity
  let hiLabel = ''
  let lo = Infinity
  let loLabel = ''
  let met = 0
  days.forEach((d) => {
    const st = dayStats(idx, d.y, d.m, d.d)
    sum += st.avg
    if (st.max > hi) { hi = st.max; hiLabel = d.label }
    if (st.min < lo) { lo = st.min; loLabel = d.label }
    if (st.avg >= s.z) met += 1
  })
  return {
    days: days.length,
    avg: round2(sum / days.length),
    max: round2(hi),
    maxLabel: hiLabel,
    min: round2(lo),
    minLabel: loLabel,
    rate: round1((met / days.length) * 100)
  }
}

/** 某断面在所选尺度下的水位序列（均值） */
export function seriesOf(idx, scale, start, end) {
  return periodStats(idx, scale, start, end).map((p) => ({ label: p.label, value: p.avg }))
}

/**
 * 预警事件识别：连续低于目标水位的过程合并为一条记录，
 * 按当前规则阈值判定等级（深度 + 持续天数都满足才算该等级）。
 */
export function detectWarnings(start, end, rules) {
  const days = listDays(start, end)
  if (!days.length) return []
  const endLabel = days[days.length - 1].label
  const events = []

  rules.filter((r) => r.enabled).forEach((rule) => {
    const idx = ECO_SECTIONS.findIndex((s) => s.name === rule.section)
    if (idx < 0) return

    let run = null
    const flush = () => {
      if (!run) return
      const depth = round3(rule.target - run.min)
      const len = run.n
      let level = null
      if (depth >= rule.red && len >= rule.days) level = 'red'
      else if (depth >= rule.orange && len >= rule.days) level = 'orange'
      else if (depth >= rule.yellow && len >= rule.days) level = 'yellow'
      if (level) {
        events.push({
          id: `${rule.id}-${run.start.label}`,
          section: rule.section,
          river: rule.river,
          start: run.start.label,
          end: run.endLabel,
          days: len,
          target: rule.target,
          min: round2(run.min),
          depth: round2(depth),
          level,
          status: run.endLabel === endLabel ? 'active' : 'done'
        })
      }
      run = null
    }

    days.forEach((d) => {
      const v = levelOf(idx, d.y, d.m, d.d)
      if (v < rule.target) {
        if (!run) run = { start: d, n: 0, min: v, endLabel: d.label }
        run.n += 1
        run.endLabel = d.label
        if (v < run.min) run.min = v
      } else {
        flush()
      }
    })
    flush()
  })

  return events.sort((a, b) => (a.start < b.start ? 1 : a.start > b.start ? -1 : 0))
}

/** 流量（m³/s）：由当日水位与生态目标水位的比值折算，保证同表内水位与流量一一对应 */
function flowFor(idx, lv) {
  const s = ECO_SECTIONS[idx]
  return Math.round(s.q * (lv / s.z))
}

/** 某断面某日的日流量（m³/s） */
export function flowOf(idx, y, m, d) {
  return flowFor(idx, levelOf(idx, y, m, d))
}

/** 今日日期 'YYYY-MM-DD' */
export function todayStr(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * 监测总览（最新状态）：每个断面按其考核指标（生态基流 / 生态水位）取
 * date 当日的日均值与最低值，并统计「该年 1 月 1 日 ~ date」的日均最小值
 * 与低于生态目标的累计天数。
 */
export function latestOverview(date) {
  const t = parseDate(date) || parseDate(todayStr())
  const day = `${t.y}-${pad(t.m)}-${pad(t.d)}`
  const days = listDays(`${t.y}-01-01`, day)

  return ECO_SECTIONS.map((s, idx) => {
    const st = dayStats(idx, t.y, t.m, t.d)

    let lowDays = 0
    let yMinZ = Infinity
    let yMinQ = null
    let yMinDate = ''
    days.forEach((d) => {
      const ds = dayStats(idx, d.y, d.m, d.d)
      if (ds.avg < s.z) lowDays += 1
      if (ds.avg < yMinZ) {
        yMinZ = ds.avg
        yMinQ = flowFor(idx, ds.avg)
        yMinDate = d.label
      }
    })

    // 每个断面只考核一个指标：流量断面看生态基流，水位断面看生态水位
    const isQ = s.metric === 'q'
    return {
      ...s,
      time: `${day} 08:00`,
      unit: isQ ? 'm³/s' : 'm',
      avg: isQ ? flowFor(idx, st.avg) : st.avg,
      min: isQ ? flowFor(idx, st.min) : st.min,
      yMin: isQ ? yMinQ : round2(yMinZ),
      yMinDate,
      lowDays,
      yearDays: days.length,
      rate: days.length ? round1(((days.length - lowDays) / days.length) * 100) : null,
      meet: st.avg >= s.z
    }
  })
}

/** 断面总览：期间最高 / 最低水位、保障率、预警次数、最近一次预警等级 */
export function overview(start, end, rules) {
  const days = listDays(start, end)
  const events = detectWarnings(start, end, rules)
  return ECO_SECTIONS.map((s, idx) => {
    let met = 0
    let hi = -Infinity
    let lo = Infinity
    days.forEach((d) => {
      const st = dayStats(idx, d.y, d.m, d.d)
      if (st.avg >= s.z) met += 1
      if (st.max > hi) hi = st.max
      if (st.min < lo) lo = st.min
    })
    // events 已按开始时间倒序，取最近一次预警的等级
    const evs = events.filter((e) => e.section === s.name)
    const status = evs.length ? evs[0].level : null
    return {
      ...s,
      max: days.length ? round2(hi) : null,
      min: days.length ? round2(lo) : null,
      rate: days.length ? round1((met / days.length) * 100) : null,
      latest: days.length ? levelOf(idx, days[days.length - 1].y, days[days.length - 1].m, days[days.length - 1].d) : null,
      warnCount: evs.length,
      status
    }
  })
}
