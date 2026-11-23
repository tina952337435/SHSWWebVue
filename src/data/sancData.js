/**
 * 三调历史数据（demo）
 * 全国第三次水资源调查评价：1956—2016 年水资源量系列（正延长至 2025 年）。
 * 按「指标-年份」确定性生成，含缓慢上升趋势 + 丰枯周期 + 噪声；分区值按面积占比由流域值折算。
 * 正式建设导入三调成果表并建立数据血缘。
 */

export const SANC_YEARS = Array.from({ length: 61 }, (_, i) => 1956 + i)

export const SANC_METRICS = [
  { k: 'p', n: '降水量', u: 'mm' },
  { k: 's', n: '地表水资源量', u: '亿m³' },
  { k: 't', n: '水资源总量', u: '亿m³' },
  { k: 'cross', n: '出入国境水量', u: '亿m³' }
]

export const SANC_DIMS = [
  { k: 'total', n: '全市' },
  { k: 'zone', n: '水资源分区' },
  { k: 'adm', n: '行政分区' }
]

/**
 * 各维度可查的指标（按三调成果表口径）
 * 行政分区：降水量 / 地表水资源量 / 水资源总量
 * 水资源分区：水资源总量 / 出入国境水量
 */
export const SANC_DIM_METRICS = {
  total: ['p', 's', 't'],
  adm: ['p', 's', 't'],
  zone: ['t', 'cross']
}

export const SANC_ZONES = ['黄浦江区', '杭嘉湖区', '武阳区', '通南及崇明岛诸河']
export const SANC_ADMS = ['中心城区', '浦东新区', '闵行区', '宝山区', '嘉定区', '金山区', '松江区', '青浦区', '奉贤区', '崇明区']

function h(key) {
  let x = 0
  for (let i = 0; i < key.length; i++) x = (x * 31 + key.charCodeAt(i)) >>> 0
  return (x % 1000) / 1000
}

// 出入国境水量 = 长江口出入境及入海水量，量级远大于本地水资源量
const BASE = { p: 1180, s: 150, t: 175, cross: 8600 }

export function decOf(metric) { return metric === 'p' ? 0 : 2 }

/** 某年某指标值 */
export function valueOf(metric, year) {
  const i = year - 1956
  const base = BASE[metric]
  const trend = 1 + i * 0.0006
  const cycle = 1 + 0.16 * Math.sin(i / 6.8 + 1.2)
  const noise = 1 + (h(`${metric}#${year}`) - 0.5) * 0.2
  const raw = base * trend * cycle * noise
  return metric === 'p' ? Math.round(raw) : Number(raw.toFixed(2))
}

/** 区间特征值 */
export function statsOf(metric, ys) {
  let max = -Infinity
  let min = Infinity
  let sum = 0
  let maxY = 0
  let minY = 0
  ys.forEach((y) => {
    const v = valueOf(metric, y)
    sum += v
    if (v > max) { max = v; maxY = y }
    if (v < min) { min = v; minY = y }
  })
  return { avg: sum / ys.length, max, maxY, min, minY, n: ys.length }
}

/** 分区多年平均（选定区间内，按面积占比由流域总量折算） */
export function partAvg(metric, ys, dim) {
  const names = dim === 'zone' ? SANC_ZONES : SANC_ADMS
  const st = statsOf(metric, ys)
  const total = st.avg * ys.length
  let sum = 0
  const raw = names.map((n) => {
    const s = 1 + (h(`${dim}#${n}`) - 0.5) * 0.6
    sum += s
    return { name: n, s }
  })
  const d = decOf(metric)
  return raw.map((r) => ({
    name: r.name,
    avg: Number((total * (r.s / sum) / ys.length).toFixed(d))
  }))
}
