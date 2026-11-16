/**
 * 水文统计调查（年报）演示数据
 *
 * 章节 = 年报报表章节；指标 = 报表行；数值按「年度 + 单位 + 指标」哈希确定性生成。
 * 部分指标标注 auto（可从站网台账自动带数），对应需求「部分统计数据可选择关联
 * 站网管理元数据进行自动填报」。
 */
import { STATION_STATS } from './stationNetwork'

export const SURVEY_YEARS = [2024, 2025, 2026]

export const SURVEY_UNITS = [
  '上海市水文总站',
  '浦东新区水文站',
  '闵行区水文站',
  '宝山区水文站',
  '嘉定区水文站',
  '松江区水文站',
  '青浦区水文站',
  '金山区水文站',
  '奉贤区水文站',
  '崇明区水文站',
  '中心城区水文站'
]

export const SURVEY_SECTIONS = [
  {
    k: 'basic',
    n: '一、测站基本情况',
    items: [
      { k: 'total', n: '测站总数', u: '个', auto: true },
      { k: 'basic', n: '基本站', u: '个', auto: true },
      { k: 'special', n: '专用站', u: '个', auto: true },
      { k: 'z', n: '水位站', u: '个', auto: true },
      { k: 'r', n: '雨量站', u: '个', auto: true },
      { k: 'q', n: '流量站', u: '个', auto: true }
    ]
  },
  {
    k: 'observe',
    n: '二、水文要素观测',
    items: [
      { k: 'zYear', n: '水位观测站年', u: '站年' },
      { k: 'rYear', n: '雨量观测站年', u: '站年' },
      { k: 'qTimes', n: '流量测验次数', u: '次' },
      { k: 'sedTimes', n: '悬移质输沙测验次数', u: '次' },
      { k: 'wqSect', n: '水质监测断面数', u: '个' }
    ]
  },
  {
    k: 'compile',
    n: '三、资料整编成果',
    items: [
      { k: 'cYear', n: '整编站年', u: '站年' },
      { k: 'cZ', n: '水位资料整编', u: '站年' },
      { k: 'cQ', n: '流量资料整编', u: '站年' },
      { k: 'cR', n: '降雨资料整编', u: '站年' }
    ]
  },
  {
    k: 'staff',
    n: '四、人员与经费',
    items: [
      { k: 'staff', n: '在职职工', u: '人' },
      { k: 'tech', n: '专业技术人员', u: '人' },
      { k: 'fund', n: '运行维护经费', u: '万元' }
    ]
  }
]

function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** 单位系数：市总站 1.0，各区按站数大致缩放 */
function unitFactor(unit) {
  if (unit === '上海市水文总站') return 1
  const m = {
    浦东新区水文站: 0.16, 闵行区水文站: 0.09, 宝山区水文站: 0.08,
    嘉定区水文站: 0.08, 松江区水文站: 0.09, 青浦区水文站: 0.09,
    金山区水文站: 0.08, 奉贤区水文站: 0.08, 崇明区水文站: 0.13,
    中心城区水文站: 0.12
  }
  return m[unit] || 0.08
}

/** 自动带数：直接取自站网台账统计 */
function autoValue(key, unit) {
  const f = unitFactor(unit)
  const S = STATION_STATS
  const base = {
    total: S.total,
    basic: S.byCls['基本站'] || 0,
    special: S.byCls['专用站'] || 0,
    z: S.byElem['水位'] || 0,
    r: S.byElem['雨量'] || 0,
    q: S.byElem['流速'] || 0
  }[key]
  if (base == null) return null
  return Math.round(base * f)
}

/** 普通指标：按哈希生成，年份间平滑增长 */
function genValue(year, unit, key, item) {
  const h = hashStr(`${year}-${unit}-${key}`)
  const f = unitFactor(unit)
  const scale = {
    total: 718, basic: 60, special: 210, z: 430, r: 300, q: 180,
    zYear: 430, rYear: 300, qTimes: 2600, sedTimes: 120, wqSect: 180,
    cYear: 680, cZ: 420, cQ: 170, cR: 290,
    staff: 186, tech: 142, fund: 4200
  }[key] || 100
  const growth = 1 + (year - 2019) * (key === 'fund' || key === 'qTimes' ? 0.045 : 0.008)
  const noise = 0.94 + ((h % 1000) / 1000) * 0.12
  const v = scale * f * growth * noise
  return Math.round(v * (key === 'fund' ? 10 : 1)) / (key === 'fund' ? 10 : 1)
}

/** 一行数据：指标、单位、上年值、本年填报值、数据来源 */
export function surveyRows(year, unit, sectionKey) {
  const sec = SURVEY_SECTIONS.find((s) => s.k === sectionKey) || SURVEY_SECTIONS[0]
  return sec.items.map((item) => {
    const auto = item.auto && unit === '上海市水文总站'
    const value = auto ? autoValue(item.k, unit) : genValue(year, unit, item.k, item)
    const last = auto
      ? Math.round(autoValue(item.k, unit) * 0.985)
      : genValue(year - 1, unit, item.k, item)
    const yoy = last ? Number((((value - last) / last) * 100).toFixed(1)) : 0
    return {
      k: item.k,
      n: item.n,
      u: item.u,
      last,
      value,
      yoy,
      source: auto ? '自动带入' : '手工填报'
    }
  })
}

/** 全部章节的行（供综合查询） */
export function allRows(year, unit) {
  return SURVEY_SECTIONS.flatMap((s) => surveyRows(year, unit, s.k).map((r) => ({ ...r, sec: s.n })))
}

/** 审核规则 */
export const AUDIT_RULES = [
  { k: 'required', n: '必填项校验', d: '年报所有指标不得为空' },
  { k: 'range', n: '数值区间校验', d: '指标须落在合理区间（如人数 ≤ 500、经费 ≤ 20000 万元）' },
  { k: 'yoy', n: '同比异常校验', d: '同比变动超过 ±30% 需说明原因' },
  { k: 'sum', n: '分项合计校验', d: '基本站 + 专用站 = 测站总数；各要素站数 ≤ 测站总数' },
  { k: 'ledger', n: '与站网台账一致性', d: '自动带入指标须与站网台账统计结果一致' },
  { k: 'last', n: '上年数据衔接', d: '上年填报值与本年度「上年同期」一致' }
]

/** 审核结果：3 条强制性错误 + 5 条合理性问题 */
export function auditResults(year, unit) {
  const list = []
  const rows = allRows(year, unit)
  const get = (k) => rows.find((r) => r.k === k) || { value: 0, n: k }
  const total = get('total')
  const basic = get('basic')
  const special = get('special')

  list.push({
    level: '强制', k: 'sum', item: '分项合计校验',
    desc: `基本站（${basic.value}）+ 专用站（${special.value}）≠ 测站总数（${total.value}）`,
    value: `${basic.value + special.value} / ${total.value}`,
    advice: '核对专用站口径后重新填报', done: false
  })
  list.push({
    level: '强制', k: 'required', item: '必填项校验',
    desc: '「悬移质输沙测验次数」未填报',
    value: '空值',
    advice: '若无该项业务请填 0', done: false
  })
  list.push({
    level: '强制', k: 'ledger', item: '与站网台账一致性',
    desc: `水位站数（${get('z').value}）与站网台账统计值不一致`,
    value: String(get('z').value),
    advice: '点击「从站网自动带数」刷新', done: false
  })

  const yoy = get('qTimes')
  list.push({
    level: '合理', k: 'yoy', item: '同比异常校验',
    desc: `流量测验次数同比变动 ${yoy.yoy}%，超过 ±30% 阈值`,
    value: String(yoy.value),
    advice: '补充说明本年测验任务增加原因', done: false
  })
  list.push({
    level: '合理', k: 'range', item: '数值区间校验',
    desc: '运行维护经费明显高于近三年均值',
    value: `${get('fund').value} 万元`,
    advice: '确认是否包含一次性专项经费', done: false
  })
  list.push({
    level: '合理', k: 'last', item: '上年数据衔接',
    desc: '「在职职工」上年同期与 2025 年报不一致（相差 3 人）',
    value: `${get('staff').value} 人`,
    advice: '核实人员变动情况', done: false
  })
  list.push({
    level: '合理', k: 'sum', item: '分项合计校验',
    desc: '专业技术人员占在职职工比例超过 90%',
    value: `${get('tech').value} / ${get('staff').value}`,
    advice: '确认是否将工勤人员计入', done: false
  })
  list.push({
    level: '合理', k: 'yoy', item: '同比异常校验',
    desc: '整编站年同比变动超过 ±30%',
    value: String(get('cYear').value),
    advice: '核实新增整编站点', done: false
  })
  return list
}

/** 历年序列（综合查询用） */
export function historySeries(keys) {
  const years = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
  const AUTO_KEYS = ['total', 'basic', 'special', 'z', 'r', 'q']
  const rows = keys.map((k) => {
    const item = SURVEY_SECTIONS.flatMap((s) => s.items).find((i) => i.k === k) || { k, n: k, u: '' }
    // 站网类指标以台账当前值为 2026 年基准，向前按年递减，保证与数据录入一致
    let data
    if (AUTO_KEYS.includes(k)) {
      const end = autoValue(k, '上海市水文总站') || 0
      data = years.map((y) => Math.round(end * (1 - (2026 - y) * 0.012)))
    } else {
      data = years.map((y) => genValue(y, '上海市水文总站', k, item))
    }
    return { k, n: item.n, u: item.u, data }
  })
  return { years, rows }
}

/** 指标字典 */
export const ALL_ITEMS = SURVEY_SECTIONS.flatMap((s) =>
  s.items.map((i) => ({ ...i, sec: s.n }))
)
