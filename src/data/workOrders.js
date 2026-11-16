/**
 * 测站运维工单 / 巡检记录演示数据
 *
 * 对应站网管理科需求：测站巡检记录表模板更新、工单数据多维统计。
 */
import { STATIONS, hashStr } from './stationNetwork'

export const TEAMS = ['松浦监测中队', '苏州河监测中队', '吴淞监测中队', '青浦监测中队', '崇明监测中队']
export const ORDER_TYPES = ['巡检', '维修', '设备更换', '应急抢修']

const PEOPLE = ['张伟', '李强', '王磊', '陈晨', '刘洋', '赵敏', '周涛', '吴迪', '徐峰', '孙悦']

function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

const STATUS = ['已完成', '已完成', '已完成', '处理中', '待派遣', '待确认', '已超期', '已完成']

function buildOrders() {
  const out = []
  for (let i = 0; i < 64; i++) {
    const h = hashStr('wo' + i)
    const r = seeded(h)
    const st = STATIONS[(h * 7) % STATIONS.length]
    const type = ORDER_TYPES[h % ORDER_TYPES.length]
    const team = TEAMS[h % TEAMS.length]
    const month = 1 + Math.floor(r() * 11)
    const day = 1 + Math.floor(r() * 27)
    const status = STATUS[h % STATUS.length]
    const publish = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(8 + (h % 9)).padStart(2, '0')}:${String((h % 6) * 10).padStart(2, '0')}`
    const hours = 2 + Math.round(r() * 46)
    out.push({
      id: `GD2026${String(i + 1).padStart(4, '0')}`,
      type,
      stName: st.nm,
      stCode: st.code,
      team,
      publisher: PEOPLE[(h + 1) % PEOPLE.length],
      publish,
      assignee: PEOPLE[(h + 3) % PEOPLE.length],
      status,
      hours,
      desc: {
        巡检: '按月度巡检计划开展测站设施设备巡检',
        维修: '遥测终端数据间断，现场检查通信模块',
        设备更换: '雨量计翻斗磨损，更换计量部件',
        应急抢修: '强降雨期间水位计异常，紧急处置'
      }[type],
      month
    })
  }
  return out.sort((a, b) => (a.publish < b.publish ? 1 : -1))
}

export const ORDERS = buildOrders()

export function orderStats(orders) {
  const byType = ORDER_TYPES.map((t) => ({ name: t, v: orders.filter((o) => o.type === t).length }))
  const byTeam = TEAMS.map((t) => ({ name: t, v: orders.filter((o) => o.team === t).length }))
  const byMonth = []
  for (let m = 1; m <= 12; m++) {
    byMonth.push({ name: `${m}月`, v: orders.filter((o) => o.month === m).length })
  }
  const done = orders.filter((o) => o.status === '已完成').length
  const avgHours = orders.length ? orders.reduce((a, o) => a + o.hours, 0) / orders.length : 0
  return {
    byType,
    byTeam,
    byMonth,
    total: orders.length,
    done,
    rate: orders.length ? ((done / orders.length) * 100).toFixed(1) : '0.0',
    avgHours: avgHours.toFixed(1)
  }
}

/** 巡检记录表模板（对应《上海市水文测站巡检记录表》） */
export const INSPECT_TEMPLATE = [
  {
    g: '站房环境',
    items: ['站房结构及屋面完好', '门窗、锁具完好', '站房内外整洁、无积水', '防雷接地装置完好']
  },
  {
    g: '观测设施',
    items: ['水位观测设施完好', '水尺零点高程校核', '观测道路及护栏完好', '断面标志桩齐全']
  },
  {
    g: '仪器设备',
    items: ['水位计运行正常', '雨量计运行正常', '遥测终端在线', '备用电源可用']
  },
  {
    g: '通信与供电',
    items: ['4G / 北斗通信正常', '市电供电稳定', '太阳能板及控制器正常', '蓄电池电压正常']
  },
  {
    g: '安全生产',
    items: ['消防器材有效', '安全警示标志齐全', '临水作业防护到位', '周边环境无隐患']
  }
]

/** 某站的历史巡检记录（含逐项结果） */
export function inspectRecords(code) {
  const h = hashStr(code + 'insp')
  const out = []
  for (let i = 0; i < 3; i++) {
    const r = seeded(h + i)
    const month = 10 - i * 2
    const groups = INSPECT_TEMPLATE.map((g) => ({
      g: g.g,
      items: g.items.map((n) => ({
        n,
        v: r() > 0.12 ? '正常' : r() > 0.5 ? '异常' : '不适用'
      }))
    }))
    const abnormal = groups.flatMap((g) => g.items).filter((x) => x.v === '异常').length
    out.push({
      id: `XJ-2026${String(month).padStart(2, '0')}-${String((h % 80) + 11)}`,
      date: `2026-${String(month).padStart(2, '0')}-${String((h % 20) + 6).padStart(2, '0')}`,
      man: PEOPLE[(h + i) % PEOPLE.length],
      team: TEAMS[(h + i) % TEAMS.length],
      weather: ['晴', '多云', '阴', '小雨'][(h + i) % 4],
      groups,
      abnormal,
      conclusion: abnormal ? `发现 ${abnormal} 项异常，已现场处理或列入工单` : '各检查项正常'
    })
  }
  return out
}
