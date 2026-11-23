/**
 * 降水等值线 demo 数据
 * 站点 = 站网台账里的「雨量站」（main === '雨量'）。
 * 各站月降水量按「站点-年月」确定性生成：季节基值 × 平滑空间场 × 站点噪声，
 * 使等值线出现自然的多个高低值中心（演示用，正式版换逐站观测数据）。
 */
import { STATIONS, hashStr } from './stationNetwork'

/** 上海逐月降水量基准（mm），汛期（6—9 月）明显偏大 */
const MONTH_BASE = [58, 62, 78, 88, 102, 148, 160, 155, 112, 82, 66, 56]

export const RAIN_STATIONS = STATIONS.filter((s) => s.main === '雨量')

/** 某站某月降水量（mm），确定性 */
export function rainValue(s, year, month) {
  const seasonal = MONTH_BASE[(month - 1 + 12) % 12]
  const lon = s.lon
  const lat = s.lat
  // 平滑空间场：几个不同波长的起伏叠加，制造“多中心”的雨区分布
  const spatial =
    Math.sin(lon * 9 + 1.3) * Math.cos(lat * 11 - 0.7) * 0.28 +
    Math.sin(lon * 3.7 + lat * 5.1) * 0.22 +
    Math.cos((lon - 121.4) * 7 + (lat - 31.1) * 6) * 0.18
  const h = hashStr(`${s.code}#${year}-${month}`)
  const noise = (h % 1000) / 1000 // 0..1
  const v = seasonal * (0.55 + 0.9 * noise) * (1 + spatial)
  return Math.max(5, Math.round(v))
}

/** 某年月的站点值列表（含站名/区县/片区/经纬度） */
export function rainPoints(year, month) {
  return RAIN_STATIONS.map((s) => ({ ...s, v: rainValue(s, year, month) }))
}
