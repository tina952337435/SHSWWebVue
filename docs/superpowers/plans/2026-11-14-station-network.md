# 站网管理模块 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 SHSWWebVue 纯前端演示版中新增"站网管理"模块的 5 个功能页面（站网GIS、测站管理、水文统计调查、工单系统、船舶管理）。

**Architecture:** 沿用现有 Vue3 + Vite + Element Plus + ECharts 结构；新增数据文件全部为确定性 mock 生成；地图投影常量抽成共享工具；页面样式复用 `src/styles/common.css` 的既有类，页面私有样式写在 `scoped` 块。

**Tech Stack:** Vue 3.5、Vite 5、Element Plus 2.9、ECharts 5.5、原生 SVG 地图。

**测试方式：** 项目无单元测试框架。数据层用 `node` 脚本做断言（`node --input-type=module -e "..."`），页面层用 `npm run build` + 开发服务器人工核对。

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `src/utils/mapProj.js`（新建） | 城建坐标投影、视口常量、瓦片 URL，供两个地图页共用 |
| `src/utils/exportImage.js`（新建） | SVG 字符串 → PNG Blob / 下载 |
| `src/data/stationNetwork.js`（新建） | 718 站台账、筛选统计、上下游、特征值、设备、巡检历史 |
| `src/data/stationSurvey.js`（新建） | 年报章节、指标行、审核规则与结果、历年序列 |
| `src/data/workOrders.js`（新建） | 工单、巡检模板与记录、多维统计 |
| `src/data/ships.js`（新建） | 船舶、证件、用船申请、统计 |
| `src/store/shipApply.js`（新建） | 用船申请状态（localStorage 持久化） |
| `src/views/zw/StationGIS.vue`（新建） | 站网一张图 + 可视化测站侧栏 + 专题图导出 |
| `src/views/zw/StationLedger.vue`（新建） | 测站台账 + 自定义统计报表 |
| `src/views/zw/StationSurvey.vue`（新建） | 水文统计调查三页签 |
| `src/views/zw/WorkOrder.vue`（新建） | 工单系统三页签 |
| `src/views/zw/ShipManage.vue`（新建） | 船舶管理三页签 |
| `src/config/menu.js`（修改） | 增加 `SUBMENUS.zw` |
| `src/router/index.js`（修改） | 增加 5 条路由与 `/zw` 重定向 |
| `src/layout/MainLayout.vue`（修改） | 增加二级菜单图标 |
| `src/views/zp/RealtimePerception.vue`（修改） | 改为引用 `mapProj.js`，行为不变 |

---

### Task 1: 抽取地图投影工具

**Files:** Create `src/utils/mapProj.js`; Modify `src/views/zp/RealtimePerception.vue:339-378`

- [ ] 新建 `src/utils/mapProj.js`，导出：

```js
export const CJ = { ax: 95192.4, bx: -28.79, cx: -11561907.8, ay: 50.97, by: 110872.1, cy: -3469339.4 }
const CJ_DET = CJ.ax * CJ.by - CJ.bx * CJ.ay
export const cjX = (lon, lat) => CJ.ax * lon + CJ.bx * lat + CJ.cx
export const cjY = (lon, lat) => CJ.ay * lon + CJ.by * lat + CJ.cy
export const cjLon = (x, y) => (CJ.by * (x - CJ.cx) - CJ.bx * (y - CJ.cy)) / CJ_DET
export const cjLat = (x, y) => (CJ.ax * (y - CJ.cy) - CJ.ay * (x - CJ.cx)) / CJ_DET
export const BBOX = { x0: -88000, x1: 82500, y0: -76000, y1: 79500 }
export const MW = 1000
export const XS = BBOX.x1 - BBOX.x0
export const YS = BBOX.y1 - BBOX.y0
export const MH = Math.round((MW * YS) / XS)
export const proj = (lon, lat) => ({ x: cjX(lon, lat) - BBOX.x0, y: BBOX.y1 - cjY(lon, lat) })
export const TILE_BASE = 'https://service-api.onemap.sh.cegn.cn/OneMapServer/rest/services/j01_basemap_normal/MapServer/tile'
export const TILE_TOKEN = 'd01b7f932ff44c04bd0b026e9daaae97'
export const tileUrl = (z, r, c) => `${TILE_BASE}/${z}/${r}/${c}?jcmp-token=${TILE_TOKEN}`
export const WORLD = 40075016.69
export const WORLD_HALF = 20037508.342787
export const FALLBACK_TILE = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile'
export const fallbackUrl = (z, x, y) => `${FALLBACK_TILE}/${z}/${y}/${x}`
```

- [ ] `RealtimePerception.vue` 删除 339–378 行的本地定义，改为 `import { cjX, cjY, cjLon, cjLat, BBOX, MW, MH, XS, YS, proj, tileUrl, WORLD, WORLD_HALF, fallbackUrl } from '@/utils/mapProj'`，删除本地 `proj` 函数，其余逻辑不动。
- [ ] 运行 `npm run build`，预期成功；浏览器打开 `#/swjc/rt`，确认底图、站点、弹窗与改动前一致。

### Task 2: 718 站数据

**Files:** Create `src/data/stationNetwork.js`

- [ ] 以 `STN`（35 站）为种子，补充地名/河道字典（按区），用种子 LCG 在 `DIST` 多边形内采样，生成合计 718 条。

核心实现要点（完整实现）：

```js
import { STN } from './stations'
import { DIST } from './districts'
import { cjX, cjY } from '@/utils/mapProj'

const TOTAL = 718
// hashStr / LCG 与 src/data/inOutFlow.js 一致的确定性随机
export const STATIONS = buildAll()
export function stationByCode(code) { ... }
export function upDown(code) { /* 同河道按 lon 排序取前后 */ }
export function feat5y(code) { /* hash 派生 5 年特征值 */ }
export function deviceList(code) { /* 4 条设备 */ }
export function inspectHistory(code) { /* 最近 5 条 */ }
export const STATION_STATS = { total, basic, special, offline, byDist, byElem }
```

字段：`code,nm,cls,tags[],elems[],riv,dist,slp,unit,lon,lat,cx,cy,year,aux[],status,q,wrz,grz,rain,main`。
约束：`STATIONS.length === 718`；`lon/lat` 均在区内；站名唯一；`slp` 取自 `public/data/slp.json` 点面判断，界外取最近质心。

- [ ] 校验：`node --input-type=module -e "const m=await import('./src/data/stationNetwork.js'); console.log(m.STATIONS.length, new Set(m.STATIONS.map(s=>s.nm)).size)"`，预期 `718 718`。

### Task 3: 菜单与路由

**Files:** Modify `src/config/menu.js`, `src/router/index.js`, `src/layout/MainLayout.vue`

- [ ] `SUBMENUS.zw` 增加 5 项（k/n/s/st），路由 `/zw/gis|stations|tjdc|gd|cb`，`/zw` 重定向 `/zw/gis`（放在 `:mod` 之前）。
- [ ] `SUB_ICONS` 增加 `gis: Location, stations: OfficeBuilding, tjdc: Document, gd: Tickets, cb: Ship`（从 `@element-plus/icons-vue` 引入）。
- [ ] `npm run build` 通过；点击顶栏"站网管理"进入 `/zw/gis`，左侧 5 项可切换（此时页面可为空壳）。

### Task 4: 站网GIS 地图主体

**Files:** Create `src/views/zw/StationGIS.vue`

- [ ] 地图容器与 `RealtimePerception` 同构（SVG + 瓦片 + 拖拽缩放 + 比例尺 + 指北针），数据改用 `STATIONS` 与筛选条件。
- [ ] 条件栏：站类 / 要素 / 行政区 / 水利片区 / 关键字；图层开关：基本站、专用站、区管站、共享站、片区、行政区、站名。
- [ ] 分级：`view.w > MW*0.42` 显示行政区聚合气泡（数量 + 点击缩放）；否则显示单站；`view.w <= MW*0.14` 显示站名。
- [ ] 符号：水位 ● 蓝 `#017de4`、雨量 ■ 青 `#16b8b0`、水质 ◆ 紫 `#7b8cff`、流量 ▲ 绿 `#26a869`；离线灰 `#909399`；共享站空心。
- [ ] 悬停 `.map-tip` 显示 8 个字段；图例卡分区显示点/面/线。
- [ ] 校验：`npm run build`；页面可平移缩放，筛选后站点数量变化正确。

### Task 5: 可视化测站侧栏

**Files:** Modify `src/views/zw/StationGIS.vue`

- [ ] 右侧 480px 浮层，默认收起，`position:absolute`，开合不改变地图视野。
- [ ] 五个页签：基础信息（含双坐标、辅助观测项目、上下游可点切换）、实时工况（3 张卡 + 24h `BarChart` + 设备在线列表）、视频监控（2×2 占位）、特征值（3 个大数 + 5 年表）、设备与巡检（设备表 + 巡检记录表）。
- [ ] 校验：点击任意站点，五个页签均有数据；点击上下游站名可切换。

### Task 6: 专题图导出

**Files:** Create `src/utils/exportImage.js`; Modify `src/views/zw/StationGIS.vue`

- [ ] `exportImage.js`：

```js
export function svgToPng(svg, w, h, scale = 2) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = w * scale; c.height = h * scale
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('svg load failed')) }
    img.src = url
  })
}
export function downloadBlob(blob, name) { /* a[download] + click */ }
```

- [ ] 弹窗：标题、范围、要素复选、A4 预览；导出 PNG（`svgToPng`）与 SVG（Blob）。
- [ ] 校验：导出文件能打开，图面含标题、图例、比例尺、站点。

### Task 7: 测站管理

**Files:** Create `src/views/zw/StationLedger.vue`

- [ ] 条件栏 + 4 统计卡 + 2 张柱状图 + 台账表（分页 20）+ 详情弹窗 + 自定义统计报表弹窗 + 导出。
- [ ] 校验：718 条可翻页；筛选条件叠加正确；两种导出可用。

### Task 8: 水文统计调查

**Files:** Create `src/data/stationSurvey.js`, `src/views/zw/StationSurvey.vue`

- [ ] 数据：4 章 18 项指标，2019–2026 历年值；`auditResults` 生成 3 条强制错误 + 5 条合理性问题。
- [ ] 页面三页签（keep-alive）：录入（章节树 + 可编辑表 + 自动带数 + 保存草稿）、审核（4 卡 + 规则 + 错误表）、查询（年报表 + 指标多选趋势图 + 导出）。
- [ ] 校验：改值后草稿状态变化；一键审核结果刷新；切换年度趋势图变化。

### Task 9: 工单系统

**Files:** Create `src/data/workOrders.js`, `src/views/zw/WorkOrder.vue`

- [ ] 数据：60 条工单、巡检模板 5 组 20 项、统计函数。
- [ ] 页面三页签：工单管理（筛选/新建/详情时间轴）、巡检记录（模板勾选 + 导出）、统计分析（3 图 + 表）。
- [ ] 校验：新建工单出现在列表首位；统计图随筛选变化。

### Task 10: 船舶管理

**Files:** Create `src/data/ships.js`, `src/store/shipApply.js`, `src/views/zw/ShipManage.vue`

- [ ] 数据：8 艘船、证件（含 30/7 天临期）、12 条用船申请。
- [ ] 页面三页签：台账（预警条 + 证件展开 + 导出）、用船申请（新建/审批/持久化）、统计分析（月度双系列柱 + 中队表）。
- [ ] 校验：临期筛选数量与预警条一致；审批后刷新仍保持（localStorage）。

### Task 11: 整体验收

- [ ] `npm run build` 通过；`npm run dev` 逐页走查。
- [ ] 回归：水资源评价 7 个菜单、水文监测实时感知地图、平台首页均正常。
- [ ] 控制台无报错；所有表格均有导出。
