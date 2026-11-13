/**
 * 边界来水监测月报（demo）
 * 来水口门 = 以「入上海」为主的边界断面；月来水量按逐日入流水量累计。
 * 数据由 inOutFlow.calcInOut 确定性生成，同一月份每次结果一致。
 * 记录存 localStorage。
 */
import { ref } from 'vue'
import { calcInOut, IO_STATIONS } from '@/data/inOutFlow'

const KEY = 'shsw-boundary-report-v1'
const pad = (n) => String(n).padStart(2, '0')
const r2 = (v) => Math.round(v * 100) / 100

/** 边界来水口门（dir = -1，以入上海为主） */
export const INFLOW_STATIONS = IO_STATIONS.filter((s) => s.dir === -1)

function monthStartEnd(y, m) {
  const dim = new Date(y, m, 0).getDate()
  return [`${y}-${pad(m)}-01`, `${y}-${pad(m)}-${pad(dim)}`]
}

/** 生成某年月的月报记录 */
export function genBoundaryReport(year, month) {
  const [start, end] = monthStartEnd(year, month)
  const stations = INFLOW_STATIONS.map((s) => {
    const r = calcInOut('month', start, end, [s.k])
    return { name: s.n, group: s.group, inn: r2(r.total.inn) }
  })
  const total = r2(stations.reduce((a, s) => a + s.inn, 0))
  const top = stations.reduce((a, b) => (b.inn > a.inn ? b : a), stations[0] || { name: '—' })
  const days = new Date(year, month, 0).getDate()
  return {
    id: `${year}${pad(month)}`,
    year,
    month,
    period: `${year}-${pad(month)}`,
    name: `上海市边界来水监测月报（${year}年${month}月）`,
    issue: `沪水文·边界来水〔${year}〕第${month}期`,
    total,
    daily: r2(total / days),
    days,
    top: top ? top.name : '—',
    stations,
    savedAt: ''
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length) return arr
    }
  } catch (e) {
    /* 忽略损坏的本地数据 */
  }
  // 首次进入：预置近 3 个月月报
  return [
    { y: 2026, m: 10, at: '2026-11-03 09:12' },
    { y: 2026, m: 9, at: '2026-10-09 10:05' },
    { y: 2026, m: 8, at: '2026-09-02 09:38' }
  ].map((s) => ({ ...genBoundaryReport(s.y, s.m), savedAt: s.at }))
}

export const boundaryReports = ref(load())

function persist() { localStorage.setItem(KEY, JSON.stringify(boundaryReports.value)) }

/** 生成并保存（同月份覆盖旧记录） */
export function saveBoundaryReport(year, month, savedAt) {
  const rec = genBoundaryReport(year, month)
  rec.savedAt = savedAt || now()
  const i = boundaryReports.value.findIndex((r) => r.id === rec.id)
  if (i >= 0) boundaryReports.value.splice(i, 1, rec)
  else boundaryReports.value.unshift(rec)
  boundaryReports.value.sort((a, b) => (a.period < b.period ? 1 : -1))
  persist()
  return rec
}

export function removeBoundaryReport(id) {
  const i = boundaryReports.value.findIndex((r) => r.id === id)
  if (i >= 0) { boundaryReports.value.splice(i, 1); persist() }
}

function now() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
