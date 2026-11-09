/**
 * 大屏「监测一张图」监测点（demo）
 * 5 类：水位 / 流量 / 水质 / 蒸发 / 雨量
 * 流量、水位站复用 stations.js 里真实的上海自有站坐标；
 * 水质 / 蒸发 / 雨量站为演示用确定性布点（各区分区/代表断面）。
 */
import { STN } from './stations'

export const MON_TYPES = [
  { k: 'sw', n: '水位', color: '#57e6ff' },
  { k: 'll', n: '流量', color: '#4aa8ff' },
  { k: 'sz', n: '水质', color: '#34d399' },
  { k: 'zf', n: '蒸发', color: '#c084fc' },
  { k: 'yl', n: '雨量', color: '#5eead4' }
]
export const MON_TYPE_MAP = Object.fromEntries(MON_TYPES.map((t) => [t.k, t]))

// 水位站：有 wrz 的上海自有站（优先按水位归类）
const levelStn = STN.filter((s) => s.sz && s.wrz != null && s.lon != null)
  .map((s) => ({ nm: s.nm, river: s.riv, lon: s.lon, lat: s.lat, type: 'sw', value: s.wrz, unit: 'm' }))
// 流量站：其余有 q 的上海自有站
const levelNames = new Set(levelStn.map((s) => s.nm))
const flowStn = STN.filter((s) => s.sz && s.q != null && s.lon != null && !levelNames.has(s.nm))
  .map((s) => ({ nm: s.nm, river: s.riv, lon: s.lon, lat: s.lat, type: 'll', value: s.q, unit: 'm³/s' }))

// 水质站（代表断面 / 水源地）
const qualityStn = [
  ['青草沙水库', '长江口', 121.62, 31.43, 'Ⅱ'],
  ['陈行水库', '长江口', 121.48, 31.35, 'Ⅱ'],
  ['金泽', '太浦河', 120.897, 31.02, 'Ⅲ'],
  ['松浦大桥', '黄浦江', 121.306, 30.97, 'Ⅲ'],
  ['米市渡', '黄浦江', 121.25, 30.98, 'Ⅲ'],
  ['苏州河', '苏州河', 121.42, 31.22, 'Ⅳ']
].map(([nm, river, lon, lat, value]) => ({ nm, river, lon, lat, type: 'sz', value, unit: '类' }))

// 蒸发站（代表站，较少）
const evapStn = [
  ['龙华', '徐汇', 121.45, 31.16, 2.8],
  ['徐家汇', '徐汇', 121.44, 31.19, 2.6],
  ['闵行', '闵行', 121.38, 31.11, 3.1],
  ['松江', '松江', 121.22, 31.03, 3.4]
].map(([nm, river, lon, lat, value]) => ({ nm, river, lon, lat, type: 'zf', value, unit: 'mm' }))

// 雨量站（按区布点）
const rainStn = [
  ['崇明', '崇明区', 121.40, 31.62, 6.2],
  ['宝山', '宝山区', 121.49, 31.40, 4.8],
  ['嘉定', '嘉定区', 121.27, 31.40, 5.1],
  ['青浦', '青浦区', 121.10, 31.16, 7.6],
  ['松江', '松江区', 121.22, 31.03, 8.9],
  ['金山', '金山区', 121.36, 30.73, 9.4],
  ['奉贤', '奉贤区', 121.47, 30.91, 10.2],
  ['浦东', '浦东新区', 121.78, 31.16, 3.7],
  ['中心城区', '市区', 121.47, 31.23, 4.1]
].map(([nm, river, lon, lat, value]) => ({ nm, river, lon, lat, type: 'yl', value, unit: 'mm' }))

export const MON_POINTS = [...levelStn, ...flowStn, ...qualityStn, ...evapStn, ...rainStn]

export const MON_COUNT = MON_TYPES.reduce((a, t) => {
  a[t.k] = MON_POINTS.filter((p) => p.type === t.k).length
  return a
}, {})
