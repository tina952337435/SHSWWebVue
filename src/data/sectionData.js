/**
 * 横 / 纵断面数据源
 *
 * 优先使用项目里已有的实测剖面：
 *   - src/assets/json/SWZPM.json  横断面点云（街口 / 思源 / 太师桥）
 *   - src/assets/json/SWZHD.json  纵断面河底高程（街口 / 思源 / 太师桥）
 * 没有实测数据的站，回退到 stationProfile.js 的确定性生成数据。
 */
import SWZPM from '@/assets/json/SWZPM.json'
import SWZHD from '@/assets/json/SWZHD.json'
import { crossSection, longSection } from './stationProfile'

const norm = (s) => String(s || '').replace(/水文站$/, '').trim()

/* ---------------- 索引 ---------------- */
const PM = new Map() // 站名 -> 该站全部横断面点
const HD = new Map() // 站名 -> 该站全部纵断面点

for (const r of SWZPM) {
  const k = norm(r.station)
  if (!PM.has(k)) PM.set(k, [])
  PM.get(k).push(r)
}
for (const r of SWZHD) {
  const k = norm(r.station)
  if (!HD.has(k)) HD.set(k, [])
  HD.get(k).push(r)
}

export const REAL_STATIONS = Array.from(new Set([...PM.keys(), ...HD.keys()]))

function meters(a, b) {
  const lat1 = (Number(a.lttd) * Math.PI) / 180
  const dx = (Number(b.lgtd) - Number(a.lgtd)) * 111320 * Math.cos(lat1)
  const dy = (Number(b.lttd) - Number(a.lttd)) * 110540
  return Math.sqrt(dx * dx + dy * dy)
}

/** 水位：实测剖面按断面形态取一个合理水位，生成数据用台账水位 */
export function levelOf(points, fallback) {
  if (!points.length) return fallback
  const ys = points.map((p) => p[1])
  const bed = Math.min(...ys)
  const bank = Math.min(points[0][1], points[points.length - 1][1])
  if (bank > bed) return Number((bed + (bank - bed) * 0.35).toFixed(2))
  return fallback
}

/** 演示版统一使用的实测剖面（设计稿用法：所有站点都展示太师桥的数据） */
const FALLBACK_STATION = '太师桥'

/** 演示统一水位（用户指定：所有断面水位都按 3.32 m 展示） */
const FIXED_LEVEL = 3.32

/** 各站默认展示的断面（与深色版一致：街口 JK005+310 / 思源 SY005+039 / 太师桥 TSQ004+871） */
const PREFERRED_STTP = {
  街口: 'JK005+310',
  思源: 'SY005+039',
  太师桥: 'TSQ004+871'
}

/**
 * 横断面
 * 站点有实测数据就用本站的，没有就统一用街口实测剖面（设计演示口径）。
 * @returns {{sttp:string, name:string, points:Array<[number,number]>, level:number}}
 */
export function crossOf(st, fallbackLevel) {
  const key = norm(st.nm)
  let usedKey = key
  let rows = PM.get(key)
  if (!rows || !rows.length) { usedKey = FALLBACK_STATION; rows = PM.get(FALLBACK_STATION) }
  if (!rows || !rows.length) {
    // 兜底：连街口都没有时用生成数据
    const list = crossSection(st)
    const points = list.map((p) => [Number(p.dis), Number(p['高程'])])
    return { sttp: list[0].sttp, name: `${st.nm}水文站`, points, level: FIXED_LEVEL }
  }

  const pref = PREFERRED_STTP[usedKey]
  const sttp = pref && rows.some((r) => r.sttp === pref) ? pref : rows[0].sttp
  const list = rows.filter((r) => r.sttp === sttp).sort((a, b) => Number(a.rowid) - Number(b.rowid))
  const points = []
  let acc = 0
  list.forEach((p, i) => {
    if (i > 0) acc += meters(list[i - 1], p)
    points.push([Number(acc.toFixed(1)), Number(p['高程'])])
  })
  return {
    sttp,
    name: `${st.nm}水文站`,
    points,
    level: FIXED_LEVEL
  }
}

/**
 * 纵断面
 * 同上：优先本站实测，没有则统一用 FALLBACK_STATION（当前太师桥）的实测剖面。
 * @returns {{name:string, points:Array<[number,number]>, level:number, stationDis:number}}
 */
export function longOf(st, fallbackLevel) {
  const key = norm(st.nm)
  let rows = HD.get(key)
  if (!rows || !rows.length) rows = HD.get(FALLBACK_STATION)
  if (!rows || !rows.length) {
    const list = longSection(st)
    const points = list.map((p) => [Number(p.dis), Number(p.val)]).sort((a, b) => a[0] - b[0])
    return {
      name: `${st.nm}水文站`,
      points,
      level: FIXED_LEVEL,
      stationDis: points.length ? points[Math.floor(points.length * 0.55)][0] : null
    }
  }

  const points = rows
    .map((p) => [Number(p.dis), Number(p.val)])
    .sort((a, b) => a[0] - b[0])
  return {
    name: `${st.nm}水文站`,
    points,
    level: FIXED_LEVEL,
    stationDis: points.length ? points[Math.floor(points.length * 0.55)][0] : null
  }
}
