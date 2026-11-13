/**
 * 预警发布记录（demo）
 * 「监测总览 → 预警发布」提交的记录统一存到这里，供「预警记录」页展示。
 * 每条记录带一条上报流程状态：预警发布 → 区县确认 → 会商处置 → 归档。
 */
import { ref } from 'vue'

const KEY = 'shsw-eco-warn-records-v1'

/** 上报流程环节（顺序即流程顺序） */
export const WARN_FLOW = [
  { k: 'published', n: '预警发布' },
  { k: 'confirm', n: '区县确认' },
  { k: 'handle', n: '会商处置' },
  { k: 'archive', n: '归档' }
]

/** 演示用初始记录（覆盖各流程环节） */
const SEED = [
  { id: 'w1', section: '北桥', level: '2.74', desc: '防汛预降，闸门预泄，水位低于生态目标。', time: '2026-11-08 09:20', status: 'archive' },
  { id: 'w2', section: '陈坊桥', level: '2.46', desc: '水利工程挡水调度，临时降低水位。', time: '2026-11-10 08:45', status: 'handle' },
  { id: 'w3', section: '罗店', level: '2.53', desc: '突发水污染应急处置，降低水位配合采样。', time: '2026-11-11 10:05', status: 'confirm' },
  { id: 'w4', section: '青浦南门', level: '2.88', desc: '防汛预降，配合台风期排水。', time: '2026-11-12 10:30', status: 'published' }
]

function pad(n) { return String(n).padStart(2, '0') }
function now() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr
    }
  } catch (e) {
    /* 忽略损坏的本地数据 */
  }
  return SEED.map((r) => ({ ...r }))
}

export const records = ref(load())

function persist() { localStorage.setItem(KEY, JSON.stringify(records.value)) }

/** 新增一条预警发布记录（默认处于「预警发布」环节） */
export function publish({ section, level, desc }) {
  const r = {
    id: `w${Date.now()}`,
    section,
    level: level || '',
    desc: desc || '—',
    time: now(),
    status: 'published'
  }
  records.value.unshift(r)
  persist()
  return r
}

/** 流程环节名 */
export function flowName(status) {
  const s = WARN_FLOW.find((x) => x.k === status)
  return s ? s.n : '—'
}

/** 推进到下一环节（归档为终点，不再推进） */
export function advanceRecord(id) {
  const r = records.value.find((x) => x.id === id)
  if (!r) return
  const idx = WARN_FLOW.findIndex((s) => s.k === r.status)
  if (idx >= 0 && idx < WARN_FLOW.length - 1) {
    r.status = WARN_FLOW[idx + 1].k
    persist()
  }
}
