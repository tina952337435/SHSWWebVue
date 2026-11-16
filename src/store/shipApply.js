import { ref } from 'vue'
import { APPLICATIONS } from '@/data/ships'

const KEY = 'shsw-ship-apply-v1'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    /* 忽略损坏的本地数据，回落到预置申请 */
  }
  return APPLICATIONS.map((a) => ({ ...a }))
}

const list = ref(load())

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.value))
  } catch (e) {
    /* 演示环境忽略配额异常 */
  }
}

/** 新建用船申请 */
export function addApplication(a) {
  const now = new Date()
  const p = (n) => String(n).padStart(2, '0')
  const item = {
    id: `YC2026${String(100 + list.value.length).slice(-3)}`,
    status: '待审批',
    start: a.start,
    end: a.end,
    hours: a.hours,
    month: Number(a.start.slice(5, 7)) || now.getMonth() + 1,
    ...a
  }
  list.value.unshift(item)
  save()
  return item
}

/** 审批：passed = true 通过，false 驳回 */
export function reviewApplication(id, passed) {
  const o = list.value.find((a) => a.id === id)
  if (!o) return
  o.status = passed ? '已审批' : '已驳回'
  save()
}

export function useShipApply() {
  return { list, addApplication, reviewApplication }
}
