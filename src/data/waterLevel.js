/**
 * 生态流量（水位）实时监测 demo 数据
 * 12 个控制断面：9 个上海市重点河道（水位考核）+ 3 个国家重点河湖（流量/水位）
 * 每个断面都有「目标值」：水位断面看目标水位，流量断面看目标流量，统一参与达标 / 低于目标判定。
 */

/** 9 个上海市重点河道（水位考核） */
export const WL_SECTIONS = [
  { name: '邬家路桥', district: '浦东新区', lon: 121.560, lat: 31.120, z: 3.02, target: 2.98 },
  { name: '北桥', district: '闵行区', lon: 121.445, lat: 31.025, z: 2.74, target: 2.80 },
  { name: '罗店', district: '宝山区', lon: 121.340, lat: 31.410, z: 2.55, target: 2.50 },
  { name: '嘉定南门', district: '嘉定区', lon: 121.255, lat: 31.385, z: 2.62, target: 2.58 },
  { name: '张堰', district: '金山区', lon: 121.245, lat: 30.805, z: 2.98, target: 2.95 },
  { name: '陈坊桥', district: '松江区', lon: 121.220, lat: 31.070, z: 2.46, target: 2.52 },
  { name: '青浦南门', district: '青浦区', lon: 121.110, lat: 31.150, z: 2.90, target: 2.85 },
  { name: '南桥', district: '奉贤区', lon: 121.460, lat: 30.910, z: 2.38, target: 2.35 },
  { name: '崇明新城', district: '崇明区', lon: 121.400, lat: 31.620, z: 3.10, target: 3.05 }
]

/**
 * 3 个国家重点河湖：
 * 大通（长江上游，日均流量）、松浦大桥（日均流量 + 氯离子）、淀山湖·元荡（水位，4 站平均）
 * 大通上游站在上海境外，图上落位到西侧上游方向示意。
 */
export const WL_AUX = [
  { name: '大通', kind: 'q', lon: 120.86, lat: 31.52, q: 28500, tq: 26000, note: '长江上游 · 日均流量' },
  { name: '松浦大桥', kind: 'qc', lon: 121.306333, lat: 30.969583, q: 124, tq: 100, cl: 58, note: '黄浦江 · 日均流量 · 氯离子' },
  { name: '淀山湖·元荡', kind: 'z', lon: 120.905, lat: 31.110, z: 2.99, target: 2.98, note: '水位（4 站平均）' }
]

/** 监测时间（演示用固定时间戳） */
export const WL_TIME = '2026-11-12 10:30:00'

/** 统一取某站的考核指标：{ kind:'z'|'q', cur, tgt, unit, below } */
export function stationMetric(s) {
  if (s.z != null && s.target != null) {
    return { kind: 'z', cur: s.z, tgt: s.target, unit: 'm', below: s.z < s.target }
  }
  if (s.q != null && s.tq != null) {
    return { kind: 'q', cur: s.q, tgt: s.tq, unit: 'm³/s', below: s.q < s.tq }
  }
  return null
}

/** 是否低于目标值（水位或流量统一判定） */
export function isBelow(s) {
  const m = stationMetric(s)
  return !!m && m.below
}

/** 全部 12 个控制断面 */
export const WL_ALL = [...WL_SECTIONS, ...WL_AUX]

const fmt = (v, d = 2) => (v == null ? '—' : Number(v).toFixed(d))

/** 明细表行（9 个上海市重点河道） */
export function sectionRows() {
  return WL_SECTIONS.map((s, i) => ({
    idx: i + 1,
    ...s,
    below: isBelow(s),
    diff: s.z == null || s.target == null ? null : Number((s.z - s.target).toFixed(2))
  }))
}

/** 明细表行（3 个国家重点河湖） */
export function auxRows() {
  return WL_AUX.map((a) => {
    const m = stationMetric(a)
    return {
      name: a.name,
      metric: m.kind === 'z' ? '水位' : '日均流量',
      cur: m.cur,
      tgt: m.tgt,
      unit: m.unit,
      below: m.below,
      cl: a.cl,
      note: a.note
    }
  })
}
