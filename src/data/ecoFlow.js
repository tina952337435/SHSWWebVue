/**
 * 生态流量（水位）保障断面与月报数据
 * 断面口径取自《水资源评价模块-功能界面设计说明书》P8「生态流量专题库」11 个保障断面
 * 月统计值按「年-月」确定性生成：同一年月每次生成结果一致，不同月份数据不同（demo 演示用）
 */

/**
 * 考核指标 metric：'q' = 生态基流（流量，m³/s），'z' = 生态水位（m）
 * 每个断面只考核其中一个指标：干流控制断面看流量，内河/湖荡断面看水位。
 */
export const ECO_SECTIONS = [
  { river: '黄浦江', name: '松浦大桥', q: 1180, z: 2.85, metric: 'q', owner: '跨省（全国名录）', national: true },
  { river: '淀山湖·元荡', name: '元荡（商榻水位）', q: 680, z: 2.98, metric: 'z', owner: '跨省（全国名录）', national: true },
  { river: '黄浦江', name: '米市渡', q: 980, z: 2.60, metric: 'q', owner: '市级' },
  { river: '黄浦江', name: '沙港', q: 1420, z: 3.20, metric: 'q', owner: '市级' },
  { river: '黄浦江', name: '黄浦公园', q: 1560, z: 3.44, metric: 'q', owner: '市级' },
  { river: '长江', name: '高桥', q: 28500, z: 3.90, metric: 'q', owner: '市级' },
  { river: '长江', name: '堡镇', q: 28800, z: 4.10, metric: 'q', owner: '市级' },
  { river: '苏州河', name: '北新泾', q: 620, z: 3.05, metric: 'z', owner: '市级' },
  { river: '苏州河', name: '赵屯', q: 380, z: 2.88, metric: 'z', owner: '区级' },
  { river: '蕰藻浜', name: '顾村', q: 540, z: 2.95, metric: 'z', owner: '区级' },
  { river: '淀浦河', name: '青浦', q: 460, z: 2.62, metric: 'z', owner: '区级' }
]

export const ECO_YEARS = [2024, 2025, 2026]
export const ECO_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

/** 确定性的伪随机数：同 (year, month, i) 恒等 */
function h(year, month, i) {
  const x = Math.sin(year * 12.9898 + month * 78.233 + i * 37.719) * 43758.5453
  return x - Math.floor(x)
}

const round = (v, d) => Number(v.toFixed(d))

/** 单月断面明细 */
function rowsOf(year, month) {
  return ECO_SECTIONS.map((s, i) => {
    // 堡镇（idx 6）模拟长江口咸潮影响，保障率偏低
    const rate = i === 6
      ? round(92.5 + h(year, month, i) * 5.0, 1)
      : round(93.5 + h(year, month, i) * 6.5, 1)
    const mean = Math.round(s.q * (1 + (rate - 90) / 100))
    const min = Math.round(s.q * (0.975 + h(year, month, i + 100) * 0.02))
    return {
      ...s,
      rate,
      mean,
      min,
      met: rate >= 95
    }
  })
}

/** 单月汇总（供同比/环比复用） */
export function monthSummary(year, month) {
  const rows = rowsOf(year, month)
  const overall = round(rows.reduce((a, r) => a + r.rate, 0) / rows.length, 1)
  const full = rows.filter((r) => r.rate >= 98).length
  const basic = rows.filter((r) => r.rate >= 95 && r.rate < 98).length
  const fail = rows.filter((r) => r.rate < 95).length
  return { rows, overall, full, basic, fail }
}

/** 报告名称（期标题），月报管理与 PDF 纸面共用 */
export function reportName(year, month) {
  return `${year}年${month}月上海地区生态流量（水位）保障情况`
}

/** 生成某年某月的月报数据包 */
export function genEcoReport(year, month) {
  const cur = monthSummary(year, month)
  const prevM = month === 1 ? 12 : month - 1
  const prevY = month === 1 ? year - 1 : year
  const prev = monthSummary(prevY, prevM)
  const lastYear = monthSummary(year - 1, month)

  const completeness = round(97.4 + h(year, month, 900) * 1.8, 1)
  const totalWarn = 3 + Math.floor(h(year, month, 901) * 5)      // 3 ~ 7
  const red = h(year, month, 902) > 0.7 ? 1 : 0
  const orange = 1 + Math.floor(h(year, month, 903) * 2)
  const yellow = Math.max(0, totalWarn - red - orange)

  const failing = cur.rows.filter((r) => !r.met)

  return {
    year,
    month,
    period: `${year}年${month}月`,
    name: reportName(year, month),
    issue: `${year}年第${month}期`,
    date: `${year}年${month + 1 > 12 ? 1 : month + 1}月${month === 12 ? 5 : 5}日`,
    rows: cur.rows,
    overall: cur.overall,
    full: cur.full,
    basic: cur.basic,
    fail: cur.fail,
    completeness,
    warnings: { total: totalWarn, red, orange, yellow },
    momDiff: round(cur.overall - prev.overall, 1),
    yoyDiff: round(cur.overall - lastYear.overall, 1),
    failing
  }
}
