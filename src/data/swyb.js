/**
 * 水情预报模块演示数据（确定性 mock，无接口）
 * 所有随机量由站点/台风键哈希派生，同一输入多次调用结果一致。
 */

/* ---------------- 确定性随机 ---------------- */
export function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function lcg(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}
const r1 = (n) => Math.round(n * 10) / 10
const r2 = (n) => Math.round(n * 100) / 100

/* ---------------- 基础字典 ---------------- */
export const DISTRICTS = [
  '黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '闵行区',
  '宝山区', '嘉定区', '浦东新区', '金山区', '松江区', '青浦区', '奉贤区', '崇明区'
]

export const SLP_NAMES = [
  '中心城', '蕰南片', '嘉宝北片', '浦东片', '浦南东片', '浦南西片',
  '青松片', '淀南片', '淀北片', '商榻片', '太北片', '太南片',
  '崇明片', '长兴岛片', '横沙岛片'
]

/* ---------------- 控制站点 ---------------- */
export const SW_STATIONS = [
  { k: 'spd', n: '松浦大桥', r: '黄浦江', d: '松江区', p: '青松片', wz: 3.80, base: 3.12, tide: false },
  { k: 'msd', n: '米市渡', r: '黄浦江', d: '松江区', p: '青松片', wz: 3.60, base: 2.95, tide: false },
  { k: 'sg', n: '沙港', r: '黄浦江', d: '奉贤区', p: '浦南东片', wz: 3.50, base: 2.88, tide: false },
  { k: 'hpgy', n: '黄浦公园', r: '黄浦江', d: '黄浦区', p: '中心城', wz: 4.20, base: 3.35, tide: true },
  { k: 'gq', n: '高桥', r: '长江口', d: '浦东新区', p: '浦东片', wz: 4.50, base: 3.62, tide: true },
  { k: 'bz', n: '堡镇', r: '长江口', d: '崇明区', p: '崇明片', wz: 4.30, base: 3.48, tide: true },
  { k: 'wjg', n: '五号沟闸', r: '长江口', d: '浦东新区', p: '浦东片', wz: 4.10, base: 3.25, tide: true },
  { k: 'jp', n: '金泽', r: '太浦河', d: '青浦区', p: '淀南片', wz: 3.20, base: 2.52, tide: false },
  { k: 'zt', n: '赵屯', r: '苏州河', d: '青浦区', p: '青松片', wz: 2.90, base: 2.28, tide: false },
  { k: 'gdc', n: '顾村', r: '蕰藻浜', d: '宝山区', p: '嘉宝北片', wz: 3.00, base: 2.40, tide: false },
  { k: 'bjx', n: '北新泾', r: '苏州河', d: '长宁区', p: '中心城', wz: 3.00, base: 2.42, tide: false },
  { k: 'yd', n: '元荡', r: '淀山湖', d: '青浦区', p: '淀南片', wz: 2.80, base: 2.22, tide: false }
]

/** 实时水情一览 */
export function liveSummary() {
  return SW_STATIONS.map((s) => {
    const rnd = lcg(hashStr('live' + s.k))
    // 约 1/4 的站处于超警状态，保证总览有真实可讲的「超警站」
    const flooded = rnd() < 0.27
    const z = flooded
      ? r2(s.wz + 0.06 + rnd() * 0.22)
      : r2(s.base + (rnd() - 0.35) * 0.5)
    const rain = rnd() < 0.55 ? 0 : r1(rnd() * 42)
    const tide = s.tide ? r2(s.base + 0.12 + rnd() * 0.38) : null
    const over = r2(z - s.wz)
    return { ...s, z, rain, tide, over, status: over > 0 ? '超警' : '正常' }
  })
}

/* ---------------- 台风场次 ---------------- */
export const TYPHOONS = [
  { id: '1909', n: '利奇马', period: '2019-08-09 ~ 08-11', rain: 204.6, maxDay: 118.2, maxLevel: 4.02, surge: 1.35, over: 9, level: 'orange', center: '浙江温岭', wind: 16, speed: 22, dist: 210, current: false },
  { id: '2106', n: '烟花', period: '2021-07-24 ~ 07-27', rain: 318.4, maxDay: 146.8, maxLevel: 4.18, surge: 1.62, over: 14, level: 'red', center: '浙江舟山', wind: 15, speed: 16, dist: 180, current: false },
  { id: '2212', n: '梅花', period: '2022-09-14 ~ 09-15', rain: 186.2, maxDay: 132.5, maxLevel: 4.25, surge: 1.88, over: 11, level: 'orange', center: '浙江舟山', wind: 14, speed: 22, dist: 150, current: false },
  { id: '2311', n: '海葵', period: '2023-09-03 ~ 09-05', rain: 162.8, maxDay: 96.4, maxLevel: 3.96, surge: 1.12, over: 7, level: 'yellow', center: '福建东山', wind: 13, speed: 18, dist: 320, current: false },
  { id: '2403', n: '格美', period: '2024-07-25 ~ 07-27', rain: 142.6, maxDay: 88.2, maxLevel: 3.78, surge: 0.96, over: 4, level: 'yellow', center: '福建莆田', wind: 13, speed: 20, dist: 280, current: false },
  { id: '2413', n: '贝碧嘉', period: '2024-09-16', rain: 226.7, maxDay: 226.7, maxLevel: 4.32, surge: 2.05, over: 13, level: 'red', center: '上海浦东', wind: 14, speed: 25, dist: 0, current: false },
  { id: '2414', n: '普拉桑', period: '2024-09-19', rain: 118.3, maxDay: 118.3, maxLevel: 3.88, surge: 1.28, over: 6, level: 'yellow', center: '上海奉贤', wind: 10, speed: 30, dist: 0, current: false },
  { id: '2518', n: '桦加沙', period: '2025-09-23 ~ 09-25', rain: 268.5, maxDay: 156.4, maxLevel: 4.36, surge: 2.18, over: 15, level: 'red', center: '浙江宁波', wind: 17, speed: 20, dist: 120, current: true }
]

/** 指定台风的分区雨量统计 */
export function districtRain(id) {
  const t = TYPHOONS.find((x) => x.id === id) || TYPHOONS[0]
  return DISTRICTS.map((d) => {
    const rnd = lcg(hashStr(id + d))
    const factor = 0.55 + rnd() * 0.9
    const avg = r1(t.rain * factor * 0.55)
    const maxRain = r1(avg * (1.15 + rnd() * 0.45))
    return {
      d,
      avg,
      maxStation: d + '国家站',
      maxRain,
      heavy: Math.round(t.over * factor * 0.55),
      big: Math.round(t.over * factor * 0.18)
    }
  })
}

/** 逐小时过程雨量（固定 24 个整点） */
export function hourlyRain(id) {
  const t = TYPHOONS.find((x) => x.id === id) || TYPHOONS[0]
  const rnd = lcg(hashStr('rain' + id))
  const out = []
  let sum = 0
  for (let i = 0; i < 24; i++) {
    const h = String((16 + i) % 24).padStart(2, '0')
    const peak = Math.exp(-Math.pow((i - 9) / 5.2, 2))
    const v = r1(i < 3 ? 0 : (t.maxDay / 6) * peak * (0.55 + rnd() * 0.9))
    sum = r1(sum + v)
    out.push({ t: `${h}:00`, v, sum })
  }
  return out
}

/* ---------------- 洪水预报 ---------------- */
const T0 = Date.UTC(2026, 10, 23, 8, 0, 0) // 2026-11-23 08:00
function fmtHour(ts) {
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:00`
}
function flowOf(z) {
  return Math.max(0, Math.round((z - 1.6) * 520))
}

/**
 * 预报过程
 * @param {string} key 站点 k
 * @param {number} scheme 1 | 2
 * @param {number} hours 24 | 48
 */
export function forecast(key, scheme = 1, hours = 24) {
  const s = SW_STATIONS.find((x) => x.k === key) || SW_STATIONS[0]
  const rnd = lcg(hashStr(`${key}-${scheme}-${hours}`))
  const past = []
  const base = s.base + 0.15
  for (let i = 0; i < 24; i++) {
    const ts = T0 - (23 - i) * 3600e3
    const v = r2(base + 0.12 * Math.sin(i / 3.8) + (rnd() - 0.5) * 0.06)
    past.push({ t: fmtHour(ts), v, q: flowOf(v) })
  }
  const curr = past[past.length - 1].v
  const amp = scheme === 2 ? 0.92 : 0.58
  const peakAt = Math.round(hours * (scheme === 2 ? 0.55 : 0.65))
  const future = []
  for (let i = 1; i <= hours; i++) {
    const ts = T0 + i * 3600e3
    let v
    if (i <= peakAt) {
      v = curr + amp * Math.sin((i / peakAt) * Math.PI / 2)
    } else {
      v = curr + amp - amp * 0.6 * ((i - peakAt) / (hours - peakAt))
    }
    v = r2(v + (rnd() - 0.5) * 0.03)
    future.push({ t: fmtHour(ts), v, q: flowOf(v) })
  }
  const peak = future.reduce((a, b) => (b.v > a.v ? b : a), future[0])
  return {
    station: s,
    past,
    future,
    stats: {
      current: curr,
      peak: peak.v,
      peakTime: peak.t,
      overWarn: r2(peak.v - s.wz)
    }
  }
}

/* ---------------- 预置预警记录 ---------------- */
export const WARN_TYPES = [
  { k: 'flood', n: '洪水' },
  { k: 'rain', n: '暴雨' },
  { k: 'tide', n: '潮位' }
]

export const WARN_LEVELS = [
  { k: 'blue', n: '蓝色' },
  { k: 'yellow', n: '黄色' },
  { k: 'orange', n: '橙色' },
  { k: 'red', n: '红色' }
]

export const WARN_SEED = [
  { id: 'YJ20261123001', type: 'flood', level: 'yellow', target: '黄浦江上游', publisher: '市水文总站', time: '2026-11-23 09:30', status: 'active', content: '黄浦江上游松浦大桥断面水位持续上涨，预计未来 12 小时超过警戒水位 0.3 米。' },
  { id: 'YJ20261123002', type: 'rain', level: 'blue', target: '浦东新区', publisher: '市水文总站', time: '2026-11-23 08:10', status: 'active', content: '浦东新区 3 小时累计雨量已达 35 毫米，预计降雨仍将持续。' },
  { id: 'YJ20261122005', type: 'tide', level: 'orange', target: '长江口', publisher: '市水文总站', time: '2026-11-22 16:20', status: 'active', content: '受天文大潮影响，长江口高桥站潮位预计超过警戒潮位 0.4 米。' },
  { id: 'YJ20261121003', type: 'flood', level: 'blue', target: '青浦区', publisher: '青浦区水文站', time: '2026-11-21 14:05', status: 'released', content: '淀山湖水位回落至警戒水位以下，解除洪水蓝色预警。' },
  { id: 'YJ20261120002', type: 'rain', level: 'yellow', target: '奉贤区', publisher: '奉贤区水文站', time: '2026-11-20 10:40', status: 'released', content: '奉贤区强降雨过程结束，解除暴雨黄色预警。' },
  { id: 'YJ20261118004', type: 'flood', level: 'yellow', target: '松江区', publisher: '松江区水文站', time: '2026-11-18 19:15', status: 'released', content: '米市渡断面水位回落至警戒水位以下。' },
  { id: 'YJ20261116001', type: 'tide', level: 'blue', target: '长江口', publisher: '市水文总站', time: '2026-11-16 07:50', status: 'released', content: '长江口潮位恢复正常，解除潮位蓝色预警。' },
  { id: 'YJ20261112003', type: 'rain', level: 'blue', target: '崇明区', publisher: '崇明区水文站', time: '2026-11-12 15:25', status: 'released', content: '崇明区降雨过程结束。' },
  { id: 'YJ20261109002', type: 'flood', level: 'blue', target: '宝山区', publisher: '宝山区水文站', time: '2026-11-09 11:10', status: 'released', content: '蕰藻浜水位回落。' },
  { id: 'YJ20261105001', type: 'tide', level: 'yellow', target: '长江口', publisher: '市水文总站', time: '2026-11-05 18:35', status: 'released', content: '潮位回落，解除潮位黄色预警。' }
]
