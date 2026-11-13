/**
 * 生态流量（水位）保障断面与月报数据
 * 12 个保障断面 = 9 个上海市重点河道（水位考核）+ 3 个国家重点河湖（大通/松浦大桥/淀山湖·元荡）
 * 月统计值按「年-月」确定性生成：同一年月每次生成结果一致，不同月份数据不同（demo 演示用）
 */

/**
 * 考核指标 metric：'q' = 生态基流（流量，m³/s），'z' = 生态水位（m）
 * 每个断面只考核其中一个指标：干流控制断面看流量，内河/湖荡断面看水位。
 */
export const ECO_SECTIONS = [
  { river: '浦东新区', name: '邬家路桥', q: 420, z: 2.98, metric: 'z', owner: '市级' },
  { river: '闵行区', name: '北桥', q: 360, z: 2.80, metric: 'z', owner: '市级' },
  { river: '宝山区', name: '罗店', q: 300, z: 2.50, metric: 'z', owner: '市级' },
  { river: '嘉定区', name: '嘉定南门', q: 320, z: 2.58, metric: 'z', owner: '市级' },
  { river: '金山区', name: '张堰', q: 280, z: 2.95, metric: 'z', owner: '区级' },
  { river: '松江区', name: '陈坊桥', q: 340, z: 2.52, metric: 'z', owner: '区级' },
  { river: '青浦区', name: '青浦南门', q: 380, z: 2.85, metric: 'z', owner: '区级' },
  { river: '奉贤区', name: '南桥', q: 400, z: 2.35, metric: 'z', owner: '区级' },
  { river: '崇明区', name: '崇明新城', q: 450, z: 3.05, metric: 'z', owner: '区级' },
  { river: '长江', name: '大通', q: 28500, z: 14.40, metric: 'q', owner: '跨省（全国名录）', national: true },
  { river: '黄浦江', name: '松浦大桥', q: 1180, z: 2.85, metric: 'q', owner: '跨省（全国名录）', national: true },
  { river: '淀山湖', name: '元荡', q: 680, z: 2.98, metric: 'z', owner: '跨省（全国名录）', national: true }
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
    // idx 6 模拟保障率偏低，便于演示达标/未达标差异
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
    warnings: { total: totalWarn },
    momDiff: round(cur.overall - prev.overall, 1),
    yoyDiff: round(cur.overall - lastYear.overall, 1),
    failing
  }
}
