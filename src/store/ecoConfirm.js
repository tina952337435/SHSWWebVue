/**
 * 质控数据（demo）
 * 区县对 9 个上海市重点河道断面的日均水位 / 最低水位进行校核，可修改后提交；
 * 提交后进入「待审核」，市局审核通过后数据锁定，需「撤回审核」才能再次修改。
 * 每次提交、审核均留痕（时间），存 localStorage。
 */
import { ref } from 'vue'

const KEY = 'shsw-eco-confirm-v2'

/** 状态：submitted 待审核 / approved 已审核 */
export const CONFIRM_STATUS = {
  submitted: '待审核',
  approved: '已审核'
}

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
  return []
}

/** 确认记录：{ section, date, avg, min, time, status, auditor, auditTime } */
export const confirms = ref(load())

function persist() { localStorage.setItem(KEY, JSON.stringify(confirms.value)) }

/** 某断面某日的确认记录 */
export function confirmOf(section, date) {
  return confirms.value.find((c) => c.section === section && c.date === date) || null
}

/** 是否已审核锁定 */
export function isApproved(section, date) {
  const c = confirmOf(section, date)
  return !!c && c.status === 'approved'
}

/** 提交确认：新建或更新数值，状态回到「待审核」，同时清空上一轮审核痕迹 */
export function submitConfirm(section, date, avg, min) {
  const existing = confirmOf(section, date)
  if (existing && existing.status === 'approved') return false
  const time = now()
  if (existing) {
    existing.avg = avg
    existing.min = min
    existing.time = time
    existing.status = 'submitted'
    existing.auditor = ''
    existing.auditTime = ''
  } else {
    confirms.value.push({
      section, date, avg, min, time,
      status: 'submitted', auditor: '', auditTime: ''
    })
  }
  persist()
  return true
}

/** 审核通过 */
export function approveConfirm(section, date, auditor = '管理员') {
  const c = confirmOf(section, date)
  // 必须先「提交确认」，处于待审核状态才允许审核
  if (!c || c.status !== 'submitted') return false
  c.status = 'approved'
  c.auditor = auditor
  c.auditTime = now()
  persist()
  return true
}

/** 撤回审核：回到「待审核」，可再次修改 */
export function revokeConfirm(section, date) {
  const c = confirmOf(section, date)
  if (!c) return false
  c.status = 'submitted'
  c.auditor = ''
  c.auditTime = ''
  persist()
  return true
}
