/**
 * 生态水位质控任务（demo）
 * 每条日期一条质控记录，记录「下发时间」（首次复制链接的时刻）。
 * 区里点链接直达质控数据页填报，9 个区各确认本区断面后归档。
 * 存 localStorage。
 */
import { ref } from 'vue'

const KEY = 'shsw-eco-task-v2'

function pad(n) { return String(n).padStart(2, '0') }
function now() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const a = JSON.parse(raw)
      if (Array.isArray(a)) return a
    }
  } catch (e) {
    /* 忽略损坏的本地数据 */
  }
  return []
}

/** 任务：{ id, date, issuedAt } */
export const tasks = ref(load())
function persist() { localStorage.setItem(KEY, JSON.stringify(tasks.value)) }

export function taskOf(date) {
  return tasks.value.find((t) => t.date === date) || null
}

/** 记录下发时间（首次复制链接时调用），同日期覆盖为最新 */
export function issueTask(date) {
  const t0 = taskOf(date)
  if (t0) {
    t0.issuedAt = now()
    persist()
    return t0
  }
  const t = { id: `task-${date}`, date, issuedAt: now() }
  tasks.value.unshift(t)
  persist()
  return t
}
