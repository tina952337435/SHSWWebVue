/**
 * 设施设备管理（站网管理）演示数据
 *
 * 每站 4 类核心设备：遥测终端机 / 雷达水位计 / 翻斗式雨量计 / 太阳能供电系统，
 * 合计 718 × 4 = 2872 条。所有字段由站码哈希确定性生成，刷新不变。
 */
import { STATIONS, hashStr } from './stationNetwork'

export const DEVICE_TYPES = [
  { k: 'rtu', n: '遥测终端机', short: 'RTU', models: ['YDZ-1 型', 'WATER-2000', 'RTU-360', 'KS-WR-20'] },
  { k: 'radar', n: '雷达水位计', short: 'RAD', models: ['RD-800', 'WL-100', 'SEBA-L-2', 'HD-M-26'] },
  { k: 'rain', n: '翻斗式雨量计', short: 'RAIN', models: ['JDZ-05', 'RG-13H', 'SL-3', 'HD-R-03'] },
  { k: 'solar', n: '太阳能供电系统', short: 'SOL', models: ['SP-120W', 'SP-80W', 'SP-150W'] }
]

export const DEVICE_STATUS = ['正常', '待更换', '维护中', '报废']
export const DEVICE_MAKERS = ['南瑞集团', '金水科技', '国电南自', '长委科技', '宁波水表', '北京益都', '杭州亚光', '上海自动化仪表']

function lcg(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

function dateStr(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 生成一条设备 */
function makeDevice(st, type, idx) {
  const h = hashStr(`${st.code}-${type.k}`)
  const r = lcg(h)
  const model = type.models[h % type.models.length]
  const maker = DEVICE_MAKERS[(h >> 3) % DEVICE_MAKERS.length]

  const age = 1 + (h % 9)            // 设备已使用年数 1~9
  const nowYear = 2026
  const installYear = nowYear - age
  const install = dateStr(installYear, 1 + (h % 12), 1 + ((h >> 2) % 28))

  // 上次更换：约 1/3 设备有更换记录
  let replace = null
  let replaceYear = installYear
  if (h % 3 === 0) {
    replaceYear = installYear + 2 + (h % Math.max(1, age - 1))
    replace = dateStr(replaceYear, 1 + ((h >> 4) % 12), 1 + ((h >> 5) % 28))
  }

  // 检定/校准到期：遥测终端和雨量计有检定
  let calib = null
  if (type.k === 'rain' || type.k === 'radar') {
    const calYear = nowYear - (h % 3)  // 最近 3 年内
    calib = dateStr(calYear, 1 + ((h >> 6) % 12), 1 + ((h >> 7) % 28))
  }

  // 状态：报废少量，维护中少量，其余正常/待更换（待更换 = 已用 6 年以上）
  let status
  const rr = r()
  if (rr < 0.02) status = '报废'
  else if (rr < 0.06) status = '维护中'
  else if (age >= 6) status = '待更换'
  else status = '正常'

  const devCode = `${st.code}-${type.short}-${String(idx + 1).padStart(2, '0')}`

  return {
    devCode,
    type: type.k,
    typeName: type.n,
    model,
    maker,
    name: type.n,
    stcd: st.code,
    stnm: st.nm,
    dist: st.dist,
    slp: st.slp,
    unit: st.unit,
    install,
    replace,
    calib,
    age,
    status
  }
}

/** 全量设备台账（按站展开） */
export const DEVICES = (() => {
  const out = []
  for (const st of STATIONS) {
    DEVICE_TYPES.forEach((t, i) => out.push(makeDevice(st, t, i)))
  }
  return out
})()

export const DEVICE_STATS = (() => {
  const byType = {}
  const byStatus = {}
  for (const d of DEVICES) {
    byType[d.typeName] = (byType[d.typeName] || 0) + 1
    byStatus[d.status] = (byStatus[d.status] || 0) + 1
  }
  return {
    total: DEVICES.length,
    byType,
    byStatus,
    pending: DEVICES.filter((d) => d.status === '待更换').length,
    scrap: DEVICES.filter((d) => d.status === '报废').length
  }
})()

export function deviceByCode(code) {
  return DEVICES.find((d) => d.devCode === code) || null
}

/** 设备更换记录（演示：按哈希生成 0~3 条历史更换） */
export function replaceHistory(devCode) {
  const d = deviceByCode(devCode)
  if (!d) return []
  const h = hashStr(devCode + 'hist')
  const r = lcg(h)
  const n = h % 4
  const out = []
  const startYear = Number((d.install || '2020').slice(0, 4))
  for (let i = 0; i < n; i++) {
    const y = startYear + 1 + i + Math.floor(r() * 3)
    out.push({
      id: `GH-${devCode}-${i + 1}`,
      date: dateStr(Math.min(2026, y), 1 + Math.floor(r() * 12), 1 + Math.floor(r() * 28)),
      reason: ['超期服役', '设备故障', '计量失准', '升级换代'][h % 4],
      model: d.model,
      by: ['张伟', '李强', '王磊', '陈晨'][(h + i) % 4]
    })
  }
  return out.reverse()
}
