/**
 * 慧水模型成果提取（demo 数据）
 * 流程：选年月 → 点「提取」取回模型当月计算结果；结果不合理时点「重算」，
 * 后台重新计算后再次提取（结果随之变化）。
 * 数据按「年月-日-小时-版本」确定性生成，同一版本结果稳定。
 */
import { AREA_ADM } from './area'
import { SLP_NAMES, AREA_SLP } from './slpResources'

const pad = (n) => String(n).padStart(2, '0')

/** 统计维度 */
export const DIMS = [
  { k: 'adm', n: '行政区' },
  { k: 'slp', n: '水利片' }
]

/** 提取口径 */
export const MODES = [
  { k: '5min', n: '5 分钟' },
  { k: 'hour', n: '1 小时' }
]

export const YEARS = [2024, 2025, 2026]
export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function hv(key) {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

/** 某年月天数与起止日期 */
export function monthRange(y, m) {
  const days = new Date(y, m, 0).getDate()
  return {
    days,
    start: `${y}-${pad(m)}-01`,
    end: `${y}-${pad(m)}-${pad(days)}`
  }
}

/** 单小时水资源量（亿m³），seed 为计算版本 */
function hourVolume(day, hour, mode, seed) {
  const sd = seed ? `#s${seed}` : ''
  const h = hv(`${day}#${hour}#v${sd}`)
  const m = Number(day.slice(5, 7))
  const season = 1 + 0.24 * Math.sin(((m - 4) / 12) * Math.PI * 2)
  const tide = 1 + 0.12 * Math.sin((hour / 12.42) * Math.PI * 2)
  const base = 0.0041 * (0.78 + h * 0.44) * season * tide
  return mode === '5min' ? base * (0.995 + hv(`${day}#${hour}#m${sd}`) * 0.01) : base
}

/** 同小时的传统算法值（对比用） */
function hourRef(day, hour, seed) {
  const sd = seed ? `#s${seed}` : ''
  return hourVolume(day, hour, 'hour', seed) * (0.9 + hv(`${day}#${hour}#r${sd}`) * 0.16)
}

/** 按维度拆分当月总量 */
function splitByDim(total, refTotal, dimKey, seed) {
  const areas = dimKey === 'slp' ? SLP_NAMES : Object.keys(AREA_ADM)
  const areaMap = dimKey === 'slp' ? AREA_SLP : AREA_ADM
  const sum = areas.reduce((a, n) => a + areaMap[n], 0)
  return areas.map((n, i) => {
    const share = areaMap[n] / sum
    const jitter = 0.86 + hv(`${n}#${dimKey}#${seed}`) * 0.28
    const v = +(total * share * jitter).toFixed(3)
    const ref = +(refTotal * share * jitter * (0.94 + hv(`${n}#${dimKey}#r${seed}`) * 0.1)).toFixed(3)
    return {
      idx: i + 1,
      name: n,
      share: +(share * 100).toFixed(1),
      v,
      ref,
      diff: ref ? +(((v - ref) / ref) * 100).toFixed(1) : 0
    }
  })
}

/**
 * 提取某年月的模型成果
 * @returns {{ daily, total, refTotal, runs, hours, summary, days }}
 */
export function extractMonth(year, month, mode, dimKey, seed = 0) {
  const { days, start } = monthRange(year, month)
  const daily = []
  let total = 0
  let refTotal = 0
  for (let d = 1; d <= days; d++) {
    const day = `${year}-${pad(month)}-${pad(d)}`
    let v = 0
    let ref = 0
    for (let h = 0; h < 24; h++) {
      v += hourVolume(day, h, mode, seed)
      ref += hourRef(day, h, seed)
    }
    daily.push({ date: `${d}日`, label: `${month}/${d}`, v: +v.toFixed(3), ref: +ref.toFixed(3) })
    total += v
    refTotal += ref
  }
  return {
    days,
    start,
    daily,
    total: +total.toFixed(3),
    refTotal: +refTotal.toFixed(3),
    runs: days * (mode === '5min' ? 288 : 24),
    hours: days * 24,
    summary: splitByDim(total, refTotal, dimKey, seed)
  }
}
