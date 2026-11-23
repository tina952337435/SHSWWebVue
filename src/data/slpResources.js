/**
 * 水利片区水资源量（演示派生口径）
 * 上海 15 个水利片区，面积合计 ≈ 全市 6340.5 km²。
 * 各片水资源量由全市公报值按「面积占比 × 确定性扰动」折算，正式建设按水利片区矢量统计入库。
 */
import { RES } from './waterResources'

export const SLP_NAMES = [
  '中心城', '蕰南片', '嘉宝北片', '浦东片', '浦南东片', '浦南西片',
  '青松片', '淀南片', '淀北片', '商榻片', '太北片', '太南片',
  '崇明片', '长兴岛片', '横沙岛片'
]

export const AREA_SLP = {
  中心城: 306.0,
  蕰南片: 271.4,
  嘉宝北片: 464.6,
  浦东片: 1210.1,
  浦南东片: 691.2,
  浦南西片: 800.0,
  青松片: 400.0,
  淀南片: 300.0,
  淀北片: 180.0,
  商榻片: 150.0,
  太北片: 180.0,
  太南片: 160.0,
  崇明片: 1087.2,
  长兴岛片: 88.0,
  横沙岛片: 52.0
}

const TOTAL = SLP_NAMES.reduce((a, n) => a + AREA_SLP[n], 0)

function h(s) {
  let x = 0
  for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0
  return (x % 1000) / 1000
}

function build() {
  const out = {}
  for (const y of RES.years) {
    const c = RES.city[y]
    out[y] = {}
    for (const n of SLP_NAMES) {
      const share = AREA_SLP[n] / TOTAL
      const p = +(c.p * (0.82 + h(`${n}#${y}#p`) * 0.36)).toFixed(1)   // 降水量 mm
      const s = +(c.s * share * (0.85 + h(`${n}#${y}#s`) * 0.3)).toFixed(2) // 地表水 亿m³
      const g = +(c.g * share * (0.8 + h(`${n}#${y}#g`) * 0.4)).toFixed(2)  // 地下水 亿m³
      const nr = +(g * 0.7).toFixed(2)                                  // 不重复量
      const t = +(s + nr).toFixed(2)                                     // 总量
      out[y][n] = { p, s, g, nr, t }
    }
  }
  return out
}

export const SLP_RES = build()
