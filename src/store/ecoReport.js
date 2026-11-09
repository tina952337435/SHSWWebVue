/**
 * 生态流量月报记录（demo 用本地存储模拟后台记录表）
 * 保存后「月报管理」可查看 / 预览 / 下载 / 删除，刷新页面不丢失
 */
import { ref } from 'vue'
import { genEcoReport, reportName } from '@/data/ecoFlow'

const KEY = 'shsw-eco-reports-v2'
const pad = (n) => String(n).padStart(2, '0')

function now() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 由「年-月」生成一条记录（同期号唯一，重新保存即覆盖） */
function makeRecord(year, month, savedAt) {
  const r = genEcoReport(year, month)
  return {
    id: `eco-${year}-${pad(month)}`,
    year,
    month,
    period: `${year}年${month}月`,
    issue: r.issue,
    name: reportName(year, month),
    rate: r.overall,
    savedAt
  }
}

function hsh(a, b) {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** 生成时间：一般在该月次月 3—5 日的工作时段 */
function savedAtOf(y, m) {
  const d = new Date(y, m, 5) // 月份传 m 正好落到次月 5 日
  d.setDate(d.getDate() + Math.floor(hsh(y, m) * 4) - 3) // 次月 2—5 日，不超过当天
  const hh = 8 + Math.floor(hsh(y + 1, m) * 8)
  const mi = Math.floor(hsh(y + 2, m) * 60)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(hh)}:${pad(mi)}`
}

/** 首次进入预置 2024 年以来逐月记录，避免列表空白 */
function seed() {
  const out = []
  for (let y = 2024; y <= 2026; y++) {
    const lastMonth = y === 2026 ? 10 : 12
    for (let m = 1; m <= lastMonth; m++) out.push(makeRecord(y, m, savedAtOf(y, m)))
  }
  return out
}

const sortList = (list) => list.sort((a, b) => b.year - a.year || b.month - a.month)

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list) && list.length) return sortList(list)
    }
  } catch (e) {
    // 数据损坏时回落到预置记录
  }
  const list = sortList(seed())
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch (e) { /* 忽略 */ }
  return list
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(ecoReports.value)) } catch (e) { /* 忽略 */ }
}

export const ecoReports = ref(load())

/** 保存记录：同年月已存在则刷新生成时间 */
export function saveEcoReport(year, month) {
  const rec = makeRecord(year, month, now())
  const i = ecoReports.value.findIndex((r) => r.id === rec.id)
  if (i > -1) ecoReports.value.splice(i, 1, rec)
  else ecoReports.value.unshift(rec)
  sortList(ecoReports.value)
  persist()
  return { created: i === -1, record: rec }
}

export function removeEcoReport(id) {
  ecoReports.value = ecoReports.value.filter((r) => r.id !== id)
  persist()
}
