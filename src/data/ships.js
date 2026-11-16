/**
 * 水文巡测车船管理演示数据
 *
 * 对应站网管理科需求：船舶基础信息统一登记、证件临期换新提示、
 * 用船申请线上化与用船统计。
 */
import { hashStr } from './stationNetwork'

export const SHIPS = [
  { id: '沪水文01', no: '沪水监 01-2018', team: '松浦监测中队', year: 2018, crew: 6, status: '在航', captain: '张伟', ton: 28.6 },
  { id: '沪水文02', no: '沪水监 02-2019', team: '苏州河监测中队', year: 2019, crew: 5, status: '停泊', captain: '李强', ton: 21.2 },
  { id: '沪水文03', no: '沪水监 03-2017', team: '吴淞监测中队', year: 2017, crew: 6, status: '在航', captain: '王磊', ton: 32.4 },
  { id: '沪水文05', no: '沪水监 05-2020', team: '青浦监测中队', year: 2020, crew: 4, status: '停泊', captain: '陈晨', ton: 16.8 },
  { id: '沪水文06', no: '沪水监 06-2015', team: '崇明监测中队', year: 2015, crew: 5, status: '维修', captain: '刘洋', ton: 24.0 },
  { id: '沪水文07', no: '沪水监 07-2021', team: '松浦监测中队', year: 2021, crew: 6, status: '在航', captain: '赵敏', ton: 30.2 },
  { id: '沪水文08', no: '沪水监 08-2016', team: '吴淞监测中队', year: 2016, crew: 4, status: '停泊', captain: '周涛', ton: 18.5 },
  { id: '沪水文09', no: '沪水监 09-2022', team: '崇明监测中队', year: 2022, crew: 5, status: '停泊', captain: '吴迪', ton: 26.3 }
]

export const CERT_TYPES = ['船舶检验证书', '船舶适航证书', '船员适任证书', '船舶无线电证书']

// 演示基准日：与系统其它模块的“今日”保持一致
export const TODAY = '2026-11-14'

export function daysBetween(a, b) {
  const t1 = Date.parse(a + 'T00:00:00')
  const t2 = Date.parse(b + 'T00:00:00')
  return Math.round((t2 - t1) / 86400000)
}

/** 证件清单：每船 4 类，部分临期 */
export const CERTS = (() => {
  const out = []
  for (const s of SHIPS) {
    CERT_TYPES.forEach((type, i) => {
      const h = hashStr(s.id + type)
      // 让第 3、4 类证件落在 7 / 30 天窗口内，制造预警演示效果
      let offset
      if (i === 2) offset = 4 + (h % 12)
      else if (i === 3) offset = 16 + (h % 50)
      else offset = 120 + (h % 700)
      const d = new Date(Date.parse(TODAY + 'T00:00:00') + offset * 86400000)
      out.push({
        ship: s.id,
        type,
        no: `${['SHJY', 'SHHX', 'SHCY', 'SHWX'][i]}-${2026 - (i % 2)}-${String((h % 900) + 100)}`,
        expire: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        days: offset
      })
    })
  }
  return out
})()

export function certsOf(shipId) {
  return CERTS.filter((c) => c.ship === shipId).sort((a, b) => a.days - b.days)
}

/** 临期分级：<=7 紧急，<=30 临期 */
export function certLevel(days) {
  if (days <= 7) return { k: 'urgent', n: '7 天内到期' }
  if (days <= 30) return { k: 'near', n: '30 天内到期' }
  return { k: 'ok', n: '正常' }
}

export function shipAlerts() {
  let urgent = 0
  let near = 0
  for (const c of CERTS) {
    if (c.days <= 7) urgent++
    else if (c.days <= 30) near++
  }
  return { urgent, near, total: urgent + near }
}

/* ---------------- 用船申请 ---------------- */
const APPLICANTS = ['张伟', '李强', '王磊', '陈晨', '刘洋', '赵敏', '周涛', '吴迪']
const REASONS = ['常规断面流量测验', '水质采样', '应急监测', '设备巡检维护', '水文调查', '省市边界同步监测']
const ROUTES = ['松浦大桥—米市渡', '苏州河黄渡—北新泾', '吴淞口—高桥', '淀山湖—金泽', '长江口南支—堡镇']
const APPROVERS = ['分管副主任', '总站站长']

export const APPLICATIONS = (() => {
  const out = []
  for (let i = 0; i < 16; i++) {
    const h = hashStr('apply' + i)
    const ship = SHIPS[h % SHIPS.length]
    const m = 1 + (h % 11)
    const day = 1 + (h % 26)
    const status = ['已完成', '已完成', '已出航', '已审批', '待审批', '已驳回'][h % 6]
    const hours = 4 + (h % 9)
    out.push({
      id: `YC2026${String(i + 1).padStart(3, '0')}`,
      applicant: APPLICANTS[h % APPLICANTS.length],
      team: ship.team,
      ship: ship.id,
      reason: REASONS[h % REASONS.length],
      route: ROUTES[h % ROUTES.length],
      crew: 2 + (h % 4),
      start: `2026-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')} 08:30`,
      end: `2026-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(8 + hours).padStart(2, '0')}:30`,
      hours,
      status,
      approver: APPROVERS[h % APPROVERS.length],
      month: m
    })
  }
  return out.sort((a, b) => (a.start < b.start ? 1 : -1))
})()

export function shipStats(rows) {
  const byMonth = []
  for (let m = 1; m <= 12; m++) {
    const list = rows.filter((a) => a.month === m)
    byMonth.push({ name: `${m}月`, times: list.length, hours: list.reduce((a, b) => a + b.hours, 0) })
  }
  const teams = Array.from(new Set(SHIPS.map((s) => s.team)))
  const byTeam = teams.map((t) => {
    const list = rows.filter((a) => a.team === t)
    return {
      team: t,
      times: list.length,
      hours: list.reduce((a, b) => a + b.hours, 0),
      done: list.filter((a) => a.status === '已完成').length
    }
  })
  return {
    byMonth,
    byTeam,
    total: rows.length,
    hours: rows.reduce((a, b) => a + b.hours, 0),
    doneRate: rows.length ? ((rows.filter((a) => a.status === '已完成').length / rows.length) * 100).toFixed(1) : '0.0'
  }
}
