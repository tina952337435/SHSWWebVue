/**
 * 站网管理 · 建设进展（演示数据）
 *
 * 大屏上的两项核心指标（水文测报能力提升工程、年度测站考核）在中屏做成
 * 可筛选、可下钻的进度页：总进度卡 + 月度完成量 + 责任单位完成率 + 项目明细。
 */

export const PROGRESS_TITLE = '2026 年度站网建设进展'
export const DATA_DATE = '2026-11-14'

/** 重点工程（计划数 / 完成数） */
export const PROJECTS = [
  { id: 'P1', name: '水文测报能力提升工程', plan: 469, done: 352, unit: '上海市水文总站', due: '2026-12', status: '推进中' },
  { id: 'P2', name: '年度测站考核', plan: 214, done: 156, unit: '上海市水文总站', due: '2026-11', status: '推进中' },
  { id: 'P3', name: '测站标准化改造', plan: 86, done: 61, unit: '浦东新区水文站', due: '2026-10', status: '推进中' },
  { id: 'P4', name: '水文自动测报系统升级', plan: 120, done: 98, unit: '青浦区水文站', due: '2026-09', status: '已完成' },
  { id: 'P5', name: '站房及观测场修缮', plan: 74, done: 52, unit: '崇明区水文站', due: '2026-12', status: '推进中' },
  { id: 'P6', name: '应急监测能力建设', plan: 36, done: 28, unit: '上海市水文总站', due: '2026-08', status: '已完成' }
]

/** 月度完成量（合计 = 水文测报能力提升工程完成数 352） */
export const MONTHLY = [18, 25, 30, 28, 35, 40, 32, 38, 30, 33, 24, 19]

/** 两个核心指标（与大屏口径一致） */
export const KEY_METRICS = [
  { k: 'cap', n: '水文测报能力提升工程完成率', plan: 469, done: 352 },
  { k: 'check', n: '年度测站考核完成率', plan: 214, done: 156 }
]

export const UNITS = Array.from(new Set(PROJECTS.map((p) => p.unit)))
export const STATUS = ['推进中', '已完成', '未启动']

export const rate = (done, plan) => (plan ? Number(((done / plan) * 100).toFixed(1)) : 0)

export function unitRows() {
  return UNITS.map((u) => {
    const list = PROJECTS.filter((p) => p.unit === u)
    const plan = list.reduce((a, p) => a + p.plan, 0)
    const done = list.reduce((a, p) => a + p.done, 0)
    return { name: u, plan, done, rate: rate(done, plan) }
  }).sort((a, b) => b.plan - a.plan)
}

export function progressStats(rows) {
  const plan = rows.reduce((a, p) => a + p.plan, 0)
  const done = rows.reduce((a, p) => a + p.done, 0)
  return {
    plan,
    done,
    rate: rate(done, plan),
    running: rows.filter((p) => p.status === '推进中').length,
    finished: rows.filter((p) => p.status === '已完成').length
  }
}
