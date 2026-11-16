/**
 * 测站「单站详情」假数据（供可视化测站的基础信息 / 横断面 / 纵断面 / 测站示意图使用）
 *
 * 原 danzhan 组件只服务太浦河、望虞河沿线的少数真实站，本文件为任意站（718 个）
 * 确定性生成等价结构的假数据：字段口径对齐 st_base.json / SWZHD.json / SWZPM.json。
 * 所有随机量由站码哈希派生，刷新不变。
 */
import { hashStr } from './stationNetwork'

function lcg(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}
const rndOf = (code, salt = '') => lcg(hashStr(code + salt))

/* ---------------- 基础信息（对齐 basicInformation 模板的 11 个区块） ---------------- */

const BASIN = { 黄浦江水系: '太湖流域', 长江口水系: '长江流域', 杭州湾水系: '东南沿海诸河' }
const FLOOD_LEVELS = ['国家重点报汛站', '省级重点报汛站', '一般报汛站', '非常年报汛站']
const FLOW_CAPS = ['H-ADCP 在线测流', '缆道流速仪测流', '桥测流速仪', '人工涉水测流']
const FLOW_ITEMS = ['防汛测报', '水资源监测', '水量平衡监测', '生态流量监测']
const DATUM = ['吴淞高程基面', '1985 国家高程基准', '冻结基面']
const FUNCS = ['基本水文测报', '巡测', '驻测', '综合监测']
const EXP_ITEMS = ['水面蒸发观测试验', '遥测对比试验', '测流方式比测试验']
const SWZ_GOALS = ['率定水位流量关系', '验证新型监测设备', '研究城市雨洪规律']

export function baseInfo(st) {
  const r = rndOf(st.code, 'base')
  const h = hashStr(st.code)
  const waterBody = st.cat === '地下水' ? '地下水'
    : st.elems.includes('潮位') ? '感潮河段'
      : st.tags.includes('闸站') ? '闸泵站' : '河道'
  return {
    stcd: st.code,
    stnm: st.nm,
    bsnm: BASIN[st.system] || '太湖流域',
    rvnm: st.system,
    stcl: st.cat,
    st_estb: `${st.year}年${1 + (h % 12)}月`,
    flood_level: FLOOD_LEVELS[h % FLOOD_LEVELS.length],
    flood_stcd: st.code,
    river_name: st.riv || st.nm,
    type: waterBody,
    lgtd: st.lon,
    lttd: st.lat,
    st_type: st.mgmt,
    add_id: String(310000 + (h % 999)).padStart(6, '0'),
    base_mode: h % 3 === 0 ? '自动观测' : '人工观测',
    area: (2 + r() * 3200).toFixed(1),
    st_is_exp: h % 17 === 0 ? '是' : '否',
    env_protect: h % 3 === 0 ? '已划定' : '未划定',
    is_sec: st.elems.includes('流速') || st.elems.includes('水位') ? '是' : '否',
    rfd_stcd: st.elems.includes('流速') ? st.code : '',
    test_item: st.elems.join('、'),
    address: `${st.dist}${st.riv ? ' ' + st.riv : ''}${st.loc || ''}`,
    st_item: FUNCS[h % FUNCS.length],
    // 水位流量站特征
    flow_type: h % 2 ? '一类站' : '二类站',
    flow_cap: FLOW_CAPS[h % FLOW_CAPS.length],
    flow_item: FLOW_ITEMS[h % FLOW_ITEMS.length],
    // 高程信息
    gc_datum_name: DATUM[h % DATUM.length],
    gc_datum_off: (0.5 + r() * 3).toFixed(2),
    gc_bm_nm: `BM${String(1000 + (h % 9000))}`,
    gc_bm_elevation: (2 + r() * 6).toFixed(3),
    // 建设标准
    build_flood_std: ['50 年一遇', '100 年一遇', '20 年一遇'][h % 3],
    build_flood_meas: ['50 年一遇', '100 年一遇', '20 年一遇'][(h + 1) % 3],
    // 管理单位
    manage_attr: h % 4 === 0 ? '委托管理' : '自管',
    manage_sw_name: '上海市水务局',
    manage_sw_brname: st.unit,
    manage_sw_team: `${st.dist.replace('区', '')}水文勘测队`,
    staff_num: 2 + (h % 5),
    agent_num: h % 4,
    // 国家基本流量站
    country_mode: h % 2 ? '自动监测' : '自动为主、人工校核',
    country_way: FLOW_CAPS[h % FLOW_CAPS.length],
    // 地下水站
    stcl_type: ['孔隙水', '岩溶水', '裂隙水'][h % 3],
    stcl_layer: ['第Ⅱ承压含水层', '第Ⅲ承压含水层', '潜水含水层'][h % 3],
    stcl_way: '自动监测',
    stcl_item: '水位、水温',
    // 水质站（地表水）
    sz_is_comb: h % 5 === 0 ? '是' : '否',
    sz_way: h % 2 ? '自动监测' : '人工采样',
    // 墒情站
    soil_way: ['自动墒情监测', '人工取土烘干'][h % 2],
    // 水文实验站
    swz_item: EXP_ITEMS[h % EXP_ITEMS.length],
    swz_goal: SWZ_GOALS[h % SWZ_GOALS.length],
    swz_is_basic: h % 2 ? '是' : '否',
    // 专用站
    zyz_is_auto: st.tags.includes('自动站') ? '是' : '否',
    zyz_flow_attr: st.cls === '专用站' ? '区县水务局' : '—',
    zyz_sw_attr: st.cls === '专用站' ? '区县水务局' : '—',
    zyz_rain_attr: st.cls === '专用站' ? '区县水务局' : '—'
  }
}

/* ---------------- 横断面（对齐 SWZPM.json 结构） ---------------- */

/** 生成一个河槽横断面的剖面点云：左岸高点 → 河底 → 右岸高点 */
export function crossSection(st, width = 120, points = 32) {
  const r = rndOf(st.code, 'cs')
  const bank = 2 + r() * 3          // 两岸青坎高程
  const bed = -(1 + r() * 2.5)      // 河底高程
  const half = width / 2
  const sttp = `DM${String(hashStr(st.code) % 1000).padStart(3, '0')}+000`
  const baseLon = st.lon
  const baseLat = st.lat
  const out = []
  for (let i = 0; i <= points; i++) {
    const x = -half + (width * i) / points
    // 河槽形状：中间深、两侧高，用三次曲线 + 噪声；左岸/右岸略高于河底
    const t = Math.abs(x) / half
    let elev = bed + (bank - bed) * Math.pow(t, 1.4)
    if (t < 0.3) elev += (0.3 - t) * 1.2 * r() // 近岸小起伏
    elev += (r() - 0.5) * 0.3
    const typeid = i === 0 ? '左基点' : i === points ? '右基点' : '测点'
    out.push({
      station: `${st.nm}水文站`,
      stcd: st.code,
      stnm: st.nm,
      rowid: i + 1,
      typeid,
      lgtd: Number((baseLon + (x / 111320) * 0.8).toFixed(6)),
      lttd: Number((baseLat - (Math.abs(x) / 110540) * 0.3).toFixed(6)),
      高程: Number(elev.toFixed(3)),
      sttp,
      dis: Number((x + half).toFixed(1))
    })
  }
  return out
}

/* ---------------- 纵断面（对齐 SWZHD.json 结构） ---------------- */

/** 生成沿河道桩号的河底深泓线：上游 → 下游，缓慢下降 + 波动 */
export function longSection(st, km = 8, sections = 26) {
  const r = rndOf(st.code, 'ls')
  const startElev = 0.5 + r() * 1.5
  const trend = 0.12 + r() * 0.3   // 每 km 下降量
  const out = []
  const baseDis = 3000
  for (let i = 0; i < sections; i++) {
    const dis = Number((baseDis + ((km * i) / (sections - 1)) * 1000).toFixed(1))
    const val = Number((startElev - trend * (dis / 1000) + Math.sin(i / 3.1) * 0.5 + (r() - 0.5) * 0.4).toFixed(3))
    out.push({
      station: `${st.nm}水文站`,
      stcd: st.code,
      stnm: st.nm,
      rowid: i + 1,
      typeid: '测点',
      lgtd: Number((st.lon - (km * 0.5 * i) / (sections - 1) / 111.32).toFixed(6)),
      lttd: Number((st.lat + Math.sin(i / 4) * 0.004).toFixed(6)),
      val: String(val),
      sttp: `ZC${String(hashStr(st.code) % 900 + 100).slice(-3)}+${String(i * 31 % 999).padStart(3, '0')}`,
      dis,
      spoint: i + 1
    })
  }
  return out
}

/** 站点当前水位（供横纵断面画水位线），直接用台账实时水位 */
export function waterLevelOf(st) {
  if (st.wrz != null) return st.wrz
  return Number((2.2 + (hashStr(st.code) % 100) / 100).toFixed(2))
}
