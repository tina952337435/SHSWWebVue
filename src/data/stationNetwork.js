/**
 * 上海市水文监测站网台账（演示数据）
 *
 * 以现有 35 个真实站中带经纬度的站为种子（基本站），其余按区县多边形确定性生成，
 * 站点类型收敛为「基本站 / 专用站」两类（区管站、共享站作为属性标签保留），
 * 合计 718 个，对应站网管理科"718 个测站全量汇聚"的口径。
 * 所有随机量均由站码哈希派生，刷新页面结果不变。
 */
import { STN } from './stations'
import { DIST } from './districts'
import { cjX, cjY } from '@/utils/mapProj'

export const TOTAL_STATIONS = 718

/* ---------------- 确定性随机 ---------------- */
export function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function lcg(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length) % arr.length]

/* ---------------- 区县字典 ---------------- */
const PLACES = {
  黄浦区: ['外滩', '南京东路', '豫园', '半淞园路', '小东门', '五里桥', '打浦桥', '淮海中路', '瑞金二路', '老西门'],
  徐汇区: ['徐家汇', '田林', '漕河泾', '长桥', '凌云路', '龙华', '枫林路', '斜土路', '湖南路', '康健'],
  长宁区: ['华阳路', '江苏路', '新华路', '周家桥', '天山路', '仙霞新村', '虹桥', '程家桥', '北新泾', '新泾'],
  静安区: ['静安寺', '曹家渡', '江宁路', '石门二路', '南京西路', '大宁路', '彭浦新村', '临汾路', '芷江西路', '共和新路'],
  普陀区: ['长寿路', '曹杨新村', '长风新村', '宜川路', '甘泉路', '石泉路', '真如镇', '长征镇', '桃浦镇', '万里'],
  虹口区: ['四川北路', '提篮桥', '欧阳路', '广中路', '嘉兴路', '凉城新村', '曲阳路', '北外滩', '江湾镇'],
  杨浦区: ['定海路', '平凉路', '江浦路', '四平路', '控江路', '长白新村', '延吉新村', '殷行', '大桥', '五角场'],
  闵行区: ['莘庄', '七宝', '虹桥', '华漕', '江川路', '马桥', '吴泾', '浦江', '颛桥', '梅陇', '新虹', '古美'],
  宝山区: ['罗店', '大场', '顾村', '月浦', '杨行', '庙行', '高境', '淞南', '友谊路', '吴淞', '张庙', '罗泾'],
  嘉定区: ['安亭', '马陆', '南翔', '江桥', '外冈', '徐行', '华亭', '新成路', '真新', '嘉定镇', '菊园新区'],
  浦东新区: ['川沙新镇', '高桥', '金桥', '张江', '北蔡', '三林', '周浦', '康桥', '航头', '新场', '大团', '惠南', '宣桥', '老港', '书院', '万祥', '泥城', '南汇新城', '高东', '唐镇'],
  金山区: ['朱泾', '枫泾', '张堰', '亭林', '朱行', '吕巷', '廊下', '山阳', '金山卫', '漕泾', '石化街道'],
  松江区: ['泗泾', '佘山', '车墩', '新桥', '洞泾', '九亭', '小昆山', '石湖荡', '新浜', '泖港', '叶榭', '中山', '永丰'],
  青浦区: ['朱家角', '练塘', '金泽', '白鹤', '重固', '华新', '赵巷', '徐泾', '香花桥', '盈浦', '夏阳'],
  奉贤区: ['南桥', '奉城', '庄行', '金汇', '四团', '青村', '柘林', '海湾', '西渡', '奉浦'],
  崇明区: ['城桥', '堡镇', '新河', '庙镇', '三星', '向化', '竖新', '东平', '建设', '港沿', '中兴', '长兴', '横沙']
}

const RIVERS = {
  黄浦区: ['黄浦江', '苏州河', '日晖港', '肇嘉浜'],
  徐汇区: ['黄浦江', '漕河泾港', '蒲汇塘', '淀浦河'],
  长宁区: ['苏州河', '新泾港', '周家浜', '外环西河'],
  静安区: ['苏州河', '彭越浦', '走马塘', '东茭泾'],
  普陀区: ['苏州河', '桃浦河', '真如港', '西虬江'],
  虹口区: ['苏州河', '虹口港', '沙泾港', '俞泾浦'],
  杨浦区: ['黄浦江', '杨树浦港', '虬江', '东走马塘'],
  闵行区: ['黄浦江', '淀浦河', '北横泾', '曹家港', '跃进河', '浦南运河'],
  宝山区: ['蕰藻浜', '练祁河', '马路河', '潘泾', '杨盛河', '顾泾'],
  嘉定区: ['苏州河', '蕰藻浜', '练祁河', '横沥', '盐铁塘', '顾浦', '吴塘'],
  浦东新区: ['川杨河', '大治河', '张家浜', '白莲泾', '赵家沟', '随塘河', '浦东运河'],
  金山区: ['秀州塘', '胥浦塘', '六里塘', '张泾河', '中官塘', '新张泾', '掘石港'],
  松江区: ['黄浦江', '斜塘', '园泄泾', '油墩港', '大涨泾', '古浦塘', '泖河'],
  青浦区: ['太浦河', '淀浦河', '拦路港', '西大盈港', '东大盈港', '急水港', '朱泖河', '泖河'],
  奉贤区: ['金汇港', '南竹港', '浦南运河', '沙港', '大浦泾', '东西中心河'],
  崇明区: ['南横引河', '北横引河', '堡镇港', '庙港', '鸽龙港', '张网港']
}

const SUFFIXES = [
  { s: '水位站', cat: '水位', elem: '水位' },
  { s: '雨量站', cat: '降水', elem: '雨量' },
  { s: '水文站', cat: '水文', elem: '流速' },
  { s: '闸(闸内)', cat: '水文', elem: '水位' },
  { s: '泵站', cat: '水文', elem: '水位' }
]

/** 站别（对应站网GIS 表头的“站别”列） */
export const STATION_CATS = ['水文', '水位', '降水', '地下水', '水质']
/** 监测项目（对应站网GIS 表头的“监测项目”列） */
export const ALL_ELEMENTS = ['雨量', '水位', '流速', '潮位', '水质', '地下水']

const CENTRAL = ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区']

/* ---------------- 水利片区 ---------------- */
/** 由行政区与经纬度近似归片（演示用，真实系统按水利片区矢量判断） */
export function slpOf(dist, lon, lat) {
  if (CENTRAL.includes(dist)) return '中心城'
  switch (dist) {
    case '宝山区': return '蕰南片'
    case '嘉定区': return '嘉宝北片'
    case '浦东新区': return '浦东片'
    case '金山区': return '浦南西片'
    case '奉贤区': return '浦南东片'
    case '松江区': return lat > 31.02 ? '青松片' : '浦南西片'
    case '闵行区': return lat > 31.06 ? '淀南片' : '浦南西片'
    case '青浦区':
      if (lon < 121.05) return '商榻片'
      if (lat > 31.12) return '太北片'
      if (lat < 31.02) return '太南片'
      return '淀北片'
    case '崇明区':
      if (lon > 121.85 && lat < 31.45) return '横沙岛片'
      if (lon > 121.55 && lon < 121.85 && lat < 31.48) return '长兴岛片'
      return '崇明片'
    default: return '中心城'
  }
}

/** 水系：按行政区近似归并（演示用） */
export const WATER_SYSTEMS = ['黄浦江水系', '长江口水系', '杭州湾水系']
export function systemOf(dist) {
  if (dist === '崇明区') return '长江口水系'
  if (dist === '金山区' || dist === '奉贤区') return '杭州湾水系'
  return '黄浦江水系'
}

/** 站类管理：国家基本站分重点/一般，专用站分专用/已验收未分类 */
export const MGMT_TYPES = ['国家基本水文站（重点）', '国家基本水文站（一般）', '专用水文站', '已验收未分类']

/* ---------------- 几何 ---------------- */
function inPoly(ring, lon, lat) {
  let c = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (((yi > lat) !== (yj > lat)) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

function ringBox(ring) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9
  for (const [x, y] of ring) {
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  return { x0, x1, y0, y1, area: (x1 - x0) * (y1 - y0) }
}

export const DISTRICTS = Object.keys(DIST)

/** 各行政区面积（km²，按多边形鞋带公式 + 中纬度缩放近似计算） */
export const DISTRICT_AREA = (() => {
  const m = {}
  for (const [name, ring] of Object.entries(DIST)) {
    if (!Array.isArray(ring) || !ring.length) { m[name] = 0; continue }
    let area = 0
    const n = ring.length
    let latSum = 0
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      area += ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1]
      latSum += ring[i][1]
    }
    area = Math.abs(area) / 2 // 平方度
    const midLat = (latSum / n) * Math.PI / 180
    const km2 = area * 111.32 * 111.32 * Math.cos(midLat)
    m[name] = Number(km2.toFixed(1))
  }
  return m
})()

/* ---------------- 生成 ---------------- */
function build() {
  const seeds = STN.filter((s) => s.lon != null && s.lat != null)

  // 按区县 bbox 面积分配站数（不少于 10）
  const boxes = {}
  let sum = 0
  for (const d of DISTRICTS) {
    const b = ringBox(DIST[d])
    boxes[d] = b
    sum += b.area
  }
  const alloc = {}
  let used = 0
  for (const d of DISTRICTS) {
    const n = Math.max(10, Math.round(((TOTAL_STATIONS - seeds.length) * boxes[d].area) / sum))
    alloc[d] = n
    used += n
  }
  // 修正到精确总数
  let diff = TOTAL_STATIONS - seeds.length - used
  const order = [...DISTRICTS].sort((a, b) => boxes[b].area - boxes[a].area)
  let oi = 0
  while (diff !== 0 && oi < 10000) {
    const d = order[oi % order.length]
    if (diff > 0) { alloc[d]++; diff-- } else if (alloc[d] > 10) { alloc[d]--; diff++ }
    oi++
  }

  const list = []
  const names = new Set()
  const codes = new Set()

  /* 1) 真实站种子 */
  seeds.forEach((s, i) => {
    const d = s.dist && DIST[s.dist] ? s.dist : nearestDist(s.lon, s.lat)
    const elems = []
    if (s.wrz != null || s.q != null) elems.push('水位')
    if (s.q != null) elems.push('流速')
    if (s.riv && /长江|随塘河/.test(s.riv)) elems.push('潮位')
    if (!elems.length) elems.push('水位')
    const nm = s.nm
    names.add(nm)
    codes.add(s.code)
    list.push({
      code: s.code,
      nm,
      cls: s.sz ? '基本站' : '专用站',
      tags: s.sz ? ['基本站', '国家基本站', '自动站', '视频站'] : ['专用站', '共享站', '省界站'],
      elems: Array.from(new Set(elems)),
      cat: s.q != null ? '水文' : '水位',
      main: s.q != null ? '流速' : '水位',
      riv: s.riv || '',
      dist: d,
      slp: slpOf(d, s.lon, s.lat),
      system: systemOf(d),
      mgmt: s.sz ? '国家基本水文站（重点）' : '专用水文站',
      unit: s.sz ? '上海市水文总站' : '外省市水文部门',
      lon: s.lon,
      lat: s.lat,
      year: 1952 + (hashStr(s.code) % 40),
      aux: s.sz ? ['降水量', '水温'] : [],
      status: '在线',
      q: s.q,
      wrz: s.wrz,
      grz: s.grz,
      rain: null,
      startYear: 1952 + (hashStr(s.code) % 40),
      end: null,
      seed: true,
      idx: i
    })
  })

  /* 2) 生成站 */
  const rnd = lcg(20261114)
  for (const d of DISTRICTS) {
    const ring = DIST[d]
    const box = boxes[d]
    const rivers = RIVERS[d] || ['河道']
    const places = PLACES[d] || ['城厢']
    for (let k = 0; k < alloc[d]; k++) {
      // 区内采样：bbox 内拒绝采样，200 次不中取中心
      let lon = (box.x0 + box.x1) / 2
      let lat = (box.y0 + box.y1) / 2
      for (let t = 0; t < 200; t++) {
        const x = box.x0 + rnd() * (box.x1 - box.x0)
        const y = box.y0 + rnd() * (box.y1 - box.y0)
        if (inPoly(ring, x, y)) { lon = x; lat = y; break }
      }

      const place = places[k % places.length]
      const river = pick(rnd, rivers)
      const sf = SUFFIXES[(hashStr(d + '#' + k + '#' + place) >>> 0) % SUFFIXES.length]
      let nm = `${place}${sf.s}`
      if (names.has(nm)) nm = `${river}${place}${sf.s}`
      let nn = 2
      while (names.has(nm)) nm = `${place}${sf.s}${nn++}`
      names.add(nm)

      let code = String(61000000 + (hashStr(d + k + nm) % 999999)).slice(0, 8)
      let bump = 1
      while (codes.has(code)) code = String(61000000 + ((hashStr(d + k + nm) + bump++) % 999999)).slice(0, 8)
      codes.add(code)
      const h = hashStr(code)
      const r2 = lcg(h)
      const cls = h % 100 < 18 ? '基本站' : '专用站'
      const tags = [cls, '自动站']
      if (cls === '专用站' && h % 5 === 0) tags.push('区管站')
      if (h % 7 === 0) tags.push('闸站')
      if (h % 11 === 0) tags.push('视频站')
      if (h % 23 === 0) tags.push('省界站')

      let main = sf.elem
      let cat = sf.cat
      let elems = [main]
      if (sf.s === '水文站') elems.push('水位')
      if (h % 19 === 0) { main = '潮位'; cat = '水文'; elems.push('潮位') }
      if (h % 13 === 0) { main = '水质'; cat = '水质'; elems = ['水质'] }
      if (h % 31 === 0) { main = '地下水'; cat = '地下水'; elems = ['地下水'] }

      const status = h % 100 < 4 ? '离线' : h % 100 < 6 ? '维护' : '在线'
      const q = elems.includes('流速') ? Number((2 + r2() * 480).toFixed(2)) : null
      const wrz = main !== '雨量' && main !== '地下水' ? Number((1.9 + r2() * 2.0).toFixed(2)) : null

      list.push({
        code,
        nm,
        cls,
        tags,
        elems: Array.from(new Set(elems)),
        cat,
        main,
        riv: river,
        dist: d,
        slp: slpOf(d, lon, lat),
        system: systemOf(d),
        mgmt: cls === '基本站'
          ? (h % 3 === 0 ? '国家基本水文站（重点）' : '国家基本水文站（一般）')
          : (h % 20 === 0 ? '已验收未分类' : '专用水文站'),
        unit: cls === '基本站' ? '上海市水文总站' : (h % 5 === 0 ? (d.endsWith('新区') ? `${d}水文站` : `${d.replace('区', '')}区水文站`) : `${river}河道管理所`),
        lon,
        lat,
        year: 1958 + (h % 55),
        startYear: 1958 + (h % 55),
        end: null,
        aux: [['降水量', '水温', '蒸发', '风向风速'][h % 4]].slice(0, h % 3 === 0 ? 0 : 1),
        status,
        q,
        wrz,
        grz: wrz == null ? null : Number((wrz + 1.0).toFixed(2)),
        rain: main === '雨量' ? Number((r2() * 26).toFixed(1)) : null,
        seed: false,
        idx: list.length
      })
    }
  }

  // 补城建坐标
  for (const s of list) {
    s.cx = Math.round(cjX(s.lon, s.lat))
    s.cy = Math.round(cjY(s.lon, s.lat))
  }
  return list
}

function nearestDist(lon, lat) {
  let best = '黄浦区', bd = Infinity
  for (const d of DISTRICTS) {
    const b = ringBox(DIST[d])
    const cx = (b.x0 + b.x1) / 2
    const cy = (b.y0 + b.y1) / 2
    const dd = (cx - lon) ** 2 + (cy - lat) ** 2
    if (dd < bd) { bd = dd; best = d }
  }
  return best
}

export const STATIONS = build()

/* ---------------- 站点沿革：1949—2026 ---------------- */
/** 历史上已撤销的站点（不计入 718 个在册站，只在沿革时间轴上出现） */
export const CLOSED_STATIONS = (() => {
  const out = []
  const used = new Set()
  const r = lcg(19491001)
  for (let i = 0; i < 26; i++) {
    const s = STATIONS[(i * 29 + 11) % STATIONS.length]
    const start = 1950 + Math.floor(r() * 36) // 1950–1985
    const end = Math.min(2019, Math.max(start + 6, 1992 + Math.floor(r() * 26)))
    const base = s.nm.replace(/站$|\(.*\)$/, '')
    let nm = `${base}老站`
    while (used.has(nm)) nm = `${base}老站${i}`
    used.add(nm)
    out.push({
      ...s,
      code: '9' + String(1000000 + i * 7919 + (hashStr(s.code) % 900000)).slice(-7),
      nm,
      year: start,
      startYear: start,
      end,
      endYear: end,
      status: '已撤销',
      q: null,
      wrz: null,
      grz: null,
      rain: null,
      tags: ['已撤销', ...s.tags.filter((t) => t !== '基本站' && t !== '专用站')]
    })
  }
  return out
})()

/** 在册站 + 历史撤站 */
export const ALL_STATIONS = [...STATIONS, ...CLOSED_STATIONS]

/** 指定年份的站网布局：当年已建、且尚未撤销的站 */
export function stationsAtYear(year) {
  if (year >= 2026) return STATIONS
  return ALL_STATIONS.filter((s) => s.year <= year && (s.end == null || s.end > year))
}

/** 沿革事件（建站 / 迁站 / 更名 / 撤站），按年份倒序 */
export const EVOLUTION_EVENTS = (() => {
  const out = []
  for (const s of ALL_STATIONS) {
    out.push({
      year: s.year,
      type: '建站',
      nm: s.nm,
      code: s.code,
      desc: `建于${s.dist}${s.riv ? ' · ' + s.riv : ''}`
    })
    if (s.end != null) {
      out.push({
        year: s.end,
        type: '撤站',
        nm: s.nm,
        code: s.code,
        desc: '因河道整治或站网优化撤销'
      })
      continue
    }
    const h = hashStr(s.code + 'evo')
    if (h % 9 === 0) {
      out.push({
        year: Math.min(2025, s.year + 8 + (h % 18)),
        type: '迁站',
        nm: s.nm,
        code: s.code,
        desc: '站址迁移，GPS 经纬度与城建坐标已更新'
      })
    }
    if (h % 11 === 0) {
      out.push({
        year: Math.min(2025, s.year + 6 + (h % 16)),
        type: '更名',
        nm: s.nm,
        code: s.code,
        desc: '站名规范化调整，站码不变'
      })
    }
  }
  return out.sort((a, b) => b.year - a.year || a.nm.localeCompare(b.nm))
})()

/* ---------------- 查询辅助 ---------------- */
export const STATION_STATS = (() => {
  const byDist = {}
  const byElem = Object.fromEntries(ALL_ELEMENTS.map((e) => [e, 0]))
  const byCls = { 基本站: 0, 专用站: 0 }
  for (const s of STATIONS) {
    byDist[s.dist] = (byDist[s.dist] || 0) + 1
    byCls[s.cls] = (byCls[s.cls] || 0) + 1
    for (const e of s.elems) byElem[e] = (byElem[e] || 0) + 1
  }
  return {
    total: STATIONS.length,
    byDist,
    byCls,
    byElem,
    offline: STATIONS.filter((s) => s.status !== '在线').length
  }
})()

export const ALL_CLASSES = ['基本站', '专用站']
export const ALL_SLPS = Array.from(new Set(STATIONS.map((s) => s.slp))).sort()

export function stationByCode(code) {
  return ALL_STATIONS.find((s) => s.code === code) || null
}

/** 同河道上下游：按经度排序取前后站 */
export function upDown(code) {
  const s = stationByCode(code)
  if (!s || !s.riv) return { up: null, down: null }
  const same = STATIONS.filter((x) => x.riv === s.riv && x.code !== s.code).sort((a, b) => a.lon - b.lon)
  const before = same.filter((x) => x.lon <= s.lon).slice(-1)[0] || null
  const after = same.find((x) => x.lon > s.lon) || null
  return { up: before, down: after }
}

/** 近 5 年特征值 */
export function feat5y(code) {
  const s = stationByCode(code)
  if (!s) return []
  const baseZ = s.wrz != null ? s.wrz : 2.4
  const baseQ = s.q != null ? Math.abs(s.q) : 120
  const r = lcg(hashStr(code + 'feat'))
  const out = []
  const nowY = new Date().getFullYear()
  for (let i = 0; i < 5; i++) {
    const y = nowY - i
    out.push({
      year: y,
      zMax: Number((baseZ + 0.45 + r() * 0.7).toFixed(2)),
      zMin: Number((baseZ - 0.9 - r() * 0.5).toFixed(2)),
      qMax: Number((baseQ * (1.3 + r() * 0.9)).toFixed(1))
    })
  }
  return out
}

/** 站点特征值（历史极值） */
export function extremes(code) {
  const rows = feat5y(code)
  const zMax = rows.reduce((a, b) => (b.zMax > a.zMax ? b : a), rows[0])
  const zMin = rows.reduce((a, b) => (b.zMin < a.zMin ? b : a), rows[0])
  const qMax = rows.reduce((a, b) => (b.qMax > a.qMax ? b : a), rows[0])
  return {
    zMax: { v: zMax.zMax, tm: `${zMax.year}-08-${String(10 + (hashStr(code) % 18)).padStart(2, '0')}` },
    zMin: { v: zMin.zMin, tm: `${zMin.year}-01-${String(5 + (hashStr(code) % 20)).padStart(2, '0')}` },
    qMax: { v: qMax.qMax, tm: `${qMax.year}-07-${String(8 + (hashStr(code) % 20)).padStart(2, '0')}` }
  }
}

/** 设备台账 */
export function deviceList(code) {
  const h = hashStr(code + 'dev')
  const r = lcg(h)
  const models = [
    { n: '遥测终端机', m: 'YDZ-1 型' },
    { n: '雷达水位计', m: 'RD-800' },
    { n: '翻斗式雨量计', m: 'JDZ-05' },
    { n: '太阳能供电系统', m: 'SP-120W' }
  ]
  return models.map((d, i) => ({
    ...d,
    devCode: `${code}-${String(i + 1).padStart(2, '0')}`,
    install: `${2018 + (h % 6)}-0${(h % 9) + 1}-${String((h % 27) + 1).padStart(2, '0')}`,
    replace: `${2022 + (h % 3)}-0${(h % 9) + 1}-${String((h % 27) + 1).padStart(2, '0')}`,
    status: r() > 0.12 ? '正常' : '待更换'
  }))
}

/** 最近巡检记录 */
export function inspectHistory(code) {
  const h = hashStr(code + 'ins')
  const r = lcg(h)
  const out = []
  for (let i = 0; i < 5; i++) {
    const m = 10 - i * 2
    out.push({
      id: `XJ-2026${String(m).padStart(2, '0')}-${String((h % 90) + 10)}`,
      tm: `2026-${String(m).padStart(2, '0')}-${String((h % 20) + 5).padStart(2, '0')}`,
      man: ['张伟', '李强', '王磊', '陈晨', '刘洋'][(h + i) % 5],
      result: r() > 0.15 ? '正常' : '发现异常',
      note: r() > 0.7 ? '清理雨量计承水器' : '—'
    })
  }
  return out
}

/** 近 24 小时过程（用于可视化测站迷你曲线） */
export function last24h(code) {
  const r = lcg(hashStr(code + '24h'))
  const s = stationByCode(code)
  const base = s && s.wrz != null ? s.wrz : 2.6
  const out = []
  for (let i = 23; i >= 0; i--) {
    out.push({
      t: `${String(23 - i).padStart(2, '0')}:00`,
      v: Number((base + Math.sin((23 - i) / 3.2) * 0.18 + (r() - 0.5) * 0.06).toFixed(2))
    })
  }
  return out
}
