/**
 * 出入境水资源量计算的断面树与水量数据（demo）
 * 一级节点 = 边界分组（沪苏 / 沪浙 / 入江入海），二级节点 = 测站／断面
 * dir = 1 表示该断面以出上海为主，-1 表示以入上海为主
 * flip  = 偶尔倒流的断面（感潮河段）；tidal = 长江口涌潮倒灌概率
 * 按「年-月-日-站」确定性生成，同一天每次计算结果一致
 */

export const IO_TREE = [
  {
    k: 'g-hs',
    n: '沪苏边界',
    children: [
      { k: 'st-jz', n: '太浦河·金泽', q: 120, dir: 1 },
      { k: 'st-zt', n: '苏州河·赵屯', q: 55, dir: -1, flip: true },
      { k: 'st-lhz', n: '浏河·浏河闸', q: 70, dir: -1 },
      { k: 'st-gc', n: '蕰藻浜·顾村', q: 45, dir: 1 },
      { k: 'st-hd', n: '吴淞江·黄渡', q: 60, dir: -1, flip: true }
    ]
  },
  {
    k: 'g-hz',
    n: '沪浙边界',
    children: [
      { k: 'st-spdq', n: '黄浦江·松浦大桥', q: 310, dir: 1 },
      { k: 'st-msd', n: '平申线·米市渡', q: 95, dir: 1 },
      { k: 'st-zj', n: '胥浦塘·朱泾', q: 40, dir: 1 },
      { k: 'st-fj', n: '六里塘·枫泾', q: 35, dir: -1 },
      { k: 'st-lt', n: '红旗塘·练塘', q: 28, dir: 1 }
    ]
  },
  {
    k: 'g-rj',
    n: '入江入海',
    children: [
      { k: 'st-gq', n: '长江口·高桥', q: 520, dir: 1, tidal: 0.4 },
      { k: 'st-bz', n: '长江口·堡镇', q: 480, dir: 1, tidal: 0.4 },
      { k: 'st-ws', n: '吴淞口·吴淞', q: 260, dir: 1 },
      { k: 'st-js', n: '杭州湾·金山', q: 150, dir: 1 }
    ]
  }
]

/** 展平的站点表：k → { ...station, group } */
export const IO_STATIONS = IO_TREE.flatMap((g) =>
  g.children.map((s, i) => ({ ...s, group: g.n, groupK: g.k, idx: i }))
)
export const IO_STATION_MAP = Object.fromEntries(IO_STATIONS.map((s) => [s.k, s]))
export const IO_LEAF_KEYS = IO_STATIONS.map((s) => s.k)

/** 统计尺度 */
export const SCALES = [
  { k: 'day', n: '日', unit: '天', maxName: '单日' },
  { k: 'xun', n: '旬', unit: '旬', maxName: '单旬' },
  { k: 'month', n: '月', unit: '月', maxName: '单月' },
  { k: 'year', n: '年', unit: '年', maxName: '单年' }
]
export const SCALE_MAP = Object.fromEntries(SCALES.map((s) => [s.k, s]))

/** 可选日期范围的上下限 */
export const IO_YEARS = [2024, 2025, 2026]
export const IO_DATE_MIN = '2024-01-01'
export const IO_DATE_MAX = '2026-12-31'

/** 确定性伪随机：同 (year, month, day, idx) 恒等 */
function h(year, month, day, idx) {
  const x = Math.sin(year * 19.331 + month * 47.177 + day * 11.713 + idx * 71.913) * 43758.5453
  return x - Math.floor(x)
}

const round2 = (v) => Math.round(v * 100) / 100
const daysInMonth = (y, m) => new Date(y, m, 0).getDate()
const pad = (n) => String(n).padStart(2, '0')

/** 某站某日的净流量（m³/s，正 = 出上海，负 = 入上海） */
function signedFlow(st, year, month, day) {
  // 汛期（6—9 月）偏大
  const season = 1 + 0.3 * Math.sin(((month - 4) / 12) * Math.PI * 2)
  const noise = 0.88 + h(year, month, day, st.idx) * 0.24
  let dir = st.dir
  let amp = 1
  // 长江口涌潮倒灌：同一潮汛日各口门同时由出转入
  if (st.tidal && h(year, month, day, 777) < st.tidal) {
    dir = -1
    amp = 1.15
  }
  // 感潮河段偶尔倒流
  if (st.flip && h(year, month, day, st.idx + 40) > 0.55) dir = -dir
  return st.q * season * noise * dir * amp
}

/** 某站某日的水量（亿 m³，正 = 出，负 = 入） */
function volumeOf(st, year, month, day) {
  return (signedFlow(st, year, month, day) * 86400) / 1e8
}

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

/** 'YYYY-MM' → { y, m } */
export function parseMonth(str) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(str || ''))
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  if (mo < 1 || mo > 12) return null
  return { y, m: mo }
}

/** 'YYYY' → { y } */
export function parseYear(str) {
  const m = /^(\d{4})$/.exec(String(str || ''))
  return m ? { y: Number(m[1]) } : null
}

/**
 * 列出统计分期，每期统一成 { label, y, m0, m1, d0, d1 }
 * 起止一律为 YYYY-MM-DD，按尺度切成 day / 旬(xun) / month / year，并裁剪到起止日期。
 */
export function listPeriods(scale, start, end) {
  const a = parseDate(start)
  const b = parseDate(end)
  if (!a || !b) return []
  const out = []

  if (scale === 'day') {
    const cur = new Date(a.y, a.m - 1, a.d)
    const last = new Date(b.y, b.m - 1, b.d)
    let guard = 0
    while (cur <= last && guard++ < 2000) {
      const y = cur.getFullYear()
      const m = cur.getMonth() + 1
      const d = cur.getDate()
      out.push({ label: `${y}-${pad(m)}-${pad(d)}`, y, m0: m, m1: m, d0: d, d1: d })
      cur.setDate(cur.getDate() + 1)
    }
    return out
  }

  if (scale === 'xun') {
    const XUN = [{ n: '上', d0: 1, d1: 10 }, { n: '中', d0: 11, d1: 20 }, { n: '下', d0: 21, d1: 31 }]
    let y = a.y
    let m = a.m
    let guard = 0
    while ((y < b.y || (y === b.y && m <= b.m)) && guard++ < 600) {
      const dim = daysInMonth(y, m)
      for (const x of XUN) {
        let d0 = x.d0
        let d1 = x.n === '下' ? dim : x.d1
        if (y === a.y && m === a.m) d0 = Math.max(d0, a.d)
        if (y === b.y && m === b.m) d1 = Math.min(d1, b.d)
        if (d0 <= d1) out.push({ label: `${y}-${pad(m)}${x.n}`, y, m0: m, m1: m, d0, d1 })
      }
      m += 1
      if (m > 12) { m = 1; y += 1 }
    }
    return out
  }

  if (scale === 'month') {
    let y = a.y
    let m = a.m
    let guard = 0
    while ((y < b.y || (y === b.y && m <= b.m)) && guard++ < 600) {
      let d0 = 1
      let d1 = daysInMonth(y, m)
      if (y === a.y && m === a.m) d0 = a.d
      if (y === b.y && m === b.m) d1 = Math.min(d1, b.d)
      if (d0 <= d1) out.push({ label: `${y}-${pad(m)}`, y, m0: m, m1: m, d0, d1 })
      m += 1
      if (m > 12) { m = 1; y += 1 }
    }
    return out
  }

  // year
  let guard = 0
  for (let y = a.y; y <= b.y && guard++ < 60; y++) {
    let m0 = 1
    let d0 = 1
    let m1 = 12
    let d1 = 31
    if (y === a.y) { m0 = a.m; d0 = a.d }
    if (y === b.y) { m1 = b.m; d1 = b.d }
    if (m0 <= m1) out.push({ label: String(y), y, m0, m1, d0, d1 })
  }
  return out
}

/**
 * 计算所选尺度、时段、站点的出入境水量
 * @returns {{
 *   rows: Array<{label:string,out:number,inn:number,net:number}>,
 *   total: {out:number,inn:number,net:number},
 *   max: {value:number,label:string,net:number}|null,
 *   count: number
 * }}
 */
export function calcInOut(scale, start, end, keys) {
  const periods = listPeriods(scale, start, end)
  const sts = keys.map((k) => IO_STATION_MAP[k]).filter(Boolean)

  const rows = periods.map((p) => {
    let out = 0
    let inn = 0
    const stationNets = sts.map(() => 0)
    for (let m = p.m0; m <= p.m1; m++) {
      const from = m === p.m0 ? p.d0 : 1
      const to = m === p.m1 ? p.d1 : daysInMonth(p.y, m)
      for (let d = from; d <= to; d++) {
        sts.forEach((st, si) => {
          const v = volumeOf(st, p.y, m, d)
          if (v >= 0) out += v
          else inn -= v
          stationNets[si] += v
        })
      }
    }
    const stationNetsRounded = stationNets.map(round2)
    return {
      label: p.label,
      out: round2(out),
      inn: round2(inn),
      net: round2(stationNetsRounded.reduce((a, b) => a + b, 0)),
      stationNets: stationNetsRounded
    }
  })

  const total = rows.reduce(
    (a, r) => ({
      out: a.out + r.out,
      inn: a.inn + r.inn,
      net: a.net + r.net,
      stationNets: a.stationNets.map((v, i) => v + (r.stationNets[i] || 0))
    }),
    { out: 0, inn: 0, net: 0, stationNets: sts.map(() => 0) }
  )
  total.out = round2(total.out)
  total.inn = round2(total.inn)
  total.stationNets = total.stationNets.map(round2)
  total.net = round2(total.stationNets.reduce((a, b) => a + b, 0))

  // 净水量绝对值最大的一期
  let max = null
  rows.forEach((r) => {
    if (!max || Math.abs(r.net) > Math.abs(max.net)) max = r
  })

  return {
    rows,
    total,
    max: max ? { value: Math.abs(max.net), label: max.label, net: max.net } : null,
    count: periods.length,
    stationNames: sts.map((s) => s.n)
  }
}
