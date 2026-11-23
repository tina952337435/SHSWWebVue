# 水情预报模块：顶栏悬浮下拉 + 五个功能页

- 日期：2026-11-23
- 状态：待实现
- 影响范围：仅「水情预报」模块；其余模块与现有交互不动

## 1. 背景与目标

「水情预报」是功能较多的大模块。客户希望顶栏大菜单悬浮时直接弹出子菜单，点击子项后才进入「左侧菜单 + 右侧功能页」的布局（与「水资源评价」「站网管理」同构）。

本次交付：

1. 顶栏「水情预报」悬浮下拉（其他模块不加，行为完全不变）。
2. 水情预报下 5 个可演示的功能页：水情综合应用、洪水预报、台风暴雨监视、历史台风水情特征分析、预报预警发布。

## 2. 交互设计

### 2.1 开关字段

`src/config/menu.js` 的 `MODULES` 中，仅 `swyb` 一项新增：

```js
{ k: 'swyb', n: '水情预报', ..., drop: true }
```

`MainLayout.vue` 只对 `m.drop === true` 的顶栏项渲染下拉；其余模块点击照旧直接进入模块首个页面。后续任何模块想加下拉，加一个 `drop: true` 即可。

### 2.2 悬浮行为

- `mouseenter` 顶栏项 → 立即展开面板；`mouseleave` 后延迟 120ms 收起（从按钮移入面板时不会闪断）。
- 点击顶栏「水情预报」文字本身 → 与现状一致，跳到第一个子项（`/swyb/zh`）。
- 点击下拉项 → `router.push('/swyb/<k>')`，左侧菜单出现并高亮对应项。
- 当前模块 / 子项高亮沿用现有 `activeModule` / `activeSub` 逻辑。
- 触屏 / 无 hover 场景：点击顶栏项仍可进入模块，不影响可用性。

### 2.3 面板样式（浅色体系，不用截图里的深蓝）

- 定位：`position: absolute`，挂在一级项下方，`top: 65px` 附近，与一级项左对齐。
- 白底 `#fff`，边框 `#e4e7ed`，圆角 4px，阴影 `0 4px 16px rgba(0,0,0,.12)`，宽 220px，内边距 4px。
- 每项：高 42px，左侧 EP 图标 16px（蓝色 `#017de4`），文字 14px。
- hover：背景 `#f8f9fa`；当前项：背景 `#ecf5ff`、文字 `#017de4`、字重 600。
- 面板自身不留三角箭头；顶部项进入 `hover` 态时不改变一级项背景（保持现有规范）。

## 3. 信息架构与路由

`SUBMENUS.swyb`（顺序即下拉顺序）：

| key | 名称 | 说明（下拉可显示，与 zp 一致带 `s`） | 图标 |
|---|---|---|---|
| `zh` | 水情综合应用 | 全市雨情 / 水位 / 潮位实时总览与超警提示 | `Odometer` |
| `hsyb` | 洪水预报 | 控制断面预报作业 · 实测+预报过程 | `TrendCharts` |
| `tfjc` | 台风暴雨监视 | 台风影响 · 过程雨量 · 潮位增水 | `Cloudy` |
| `tffx` | 历史台风水情特征分析 | 多场次对比 · 特征值统计 | `DataAnalysis` |
| `yjfb` | 预报预警发布 | 预警发布 / 解除 · 发布记录 | `Bell` |

路由（`src/router/index.js`）：

```
{ path: 'swyb', redirect: '/swyb/zh' }
swyb/zh   → views/swyb/WaterInfoApp.vue
swyb/hsyb → views/swyb/FloodForecast.vue
swyb/tfjc → views/swyb/TyphoonMonitor.vue
swyb/tffx → views/swyb/TyphoonHistory.vue
swyb/yjfb → views/swyb/ForecastWarning.vue
```

全部 `meta: { mod: 'swyb', sub: '<key>', title: '<名称>' }`。`SUBMENUS.swyb` 存在后，现有 `goModule()` 会自动把点击顶栏导向 `/swyb/zh`，无需改导航逻辑。

## 4. 页面规格

统一约束（沿用项目规范）：

- 内容字号 14px；表格 `table.dt` 居中；每个表格右上角一个 `ExportButton`，导出走 `downloadCsv`。
- 布局顺序：条件栏（白卡）→ 统计卡 → 图表（`BarChart`，`src/components/BarChart.vue`）→ 表格。
- 图表配色用蓝 `#017de4` / 绿 `#26a869` / 青 `#16b8b0` / 紫 `#7b8cff` / 深蓝 `#2b4c8c`；**橙色/红色仅用于预警等级徽标**（沿用 `.lv.red/.orange/.yellow/.green` 既有语义色）。
- 页面高度铺满，内部滚动，不出现整页纵向滚动条。

### 4.1 水情综合应用 `WaterInfoApp.vue`

- 顶部条件栏：统计维度「行政区 / 水利片区」连体切换 + 对应下拉；更新时间只读显示「最新 08:00」。
- 4 张统计卡：实时监测站数 / 超警戒水位站数 / 今日最大雨量站 / 最高潮位站。
- 主体：左侧「实时水情」表格（占 2/3，限高内部滚动 + 表头 sticky；列：序号 / 站名 / 河道 / 水位(m) / 警戒水位(m) / 超警(m) / 雨量(mm) / 潮位(m) / 状态），超警行状态用黄色「超警」徽标；右侧 1/3 竖排三个 TOP5 小榜：雨量排行、水位涨幅排行、潮位排行。
- 导出当前表格。

### 4.2 洪水预报 `FloodForecast.vue`

- 条件栏：预报断面（原生 `select`，8 个控制断面）→ 预报方案（方案一 / 方案二）→ 预见期连体选项卡（24h / 48h）→ 蓝色「开始预报」按钮（点击后图表与表格重算，按钮短暂显示「计算中」，纯前端模拟 400ms）。
- 4 张统计卡：当前水位 / 预报最高水位 / 最高出现时间 / 超警戒幅度。
- 折线图：过去 24h 实测（蓝实线 + 渐变面积）+ 未来 24/48h 预报（虚线，同蓝）；警戒水位 `markLine` 灰红虚线。
- 表格：序号 / 时间 / 预报水位(m) / 预报流量(m³/s) / 较当前(m) / 状态；导出。
- 数据由 `src/data/swyb.js` 的 `forecast(station, scheme, hours)` 确定性生成。

### 4.3 台风暴雨监视 `TyphoonMonitor.vue`

- 条件栏：台风场次下拉（当前场次默认第一个），显示「编号 + 名称 + 影响时段」。
- 信息条（白卡）：编号 / 名称 / 中心位置 / 最大风力 / 移动速度 / 距上海距离 / 当前预警等级徽标。
- 图表：逐小时过程雨量柱状 + 累计雨量折线（双 y 轴；只展示雨量一个指标，累计作辅助线）。
- 表格：行政区 / 平均雨量(mm) / 最大雨量站 / 最大雨量(mm) / 暴雨站数 / 大暴雨站数；导出。
- 预警等级只用 `.lv` 徽标。

### 4.4 历史台风水情特征分析 `TyphoonHistory.vue`

- 条件栏：台风场次多选 chips（2–4 个，至少 1 个）+ 重置。
- 3 张统计卡：对比场次数 / 平均过程雨量 / 最大潮位增水。
- 指标页签（连体选项卡，默认「过程雨量」）：过程雨量 / 最高水位 / 潮位增水。每个页签一张分组柱状图（横轴 = 场次，柱 = 该指标值），保持「一个指标一张图」。
- 表格：台风编号 / 名称 / 影响时段 / 过程雨量(mm) / 最大日雨量(mm) / 最高水位(m) / 潮位增水(m) / 超警站数；导出。
- 选中场次变化时图表与统计卡联动。

### 4.5 预报预警发布 `ForecastWarning.vue`

- 条件栏：预警类型 chips（洪水 / 暴雨 / 潮位）+ 状态 chips（生效中 / 已解除 / 全部）+ 日期范围。
- 4 张统计卡：本月发布 / 生效中 / 已解除 / 覆盖站点。
- 工具栏：「+ 发布预警」蓝色按钮；表格：预警编号 / 类型 / 等级徽标 / 发布对象 / 发布人 / 发布时间 / 状态 / 操作（详情、解除）。
- 发布弹窗（`el-dialog` 440px）：类型、等级（蓝/黄/橙/红选项，预览徽标）、发布对象（多选行政区 / 全区）、预警内容（textarea）、通知方式（政务群 / 短信 / 电话）。提交后插入列表顶部并提示「已发布」。
- 解除操作二次确认后状态改为「已解除」并记录解除时间。
- 详情弹窗只读展示完整字段。
- 新增/解除状态保存在组件内（刷新即恢复预置数据），与「水利 demo」定位一致；导出预置字段。

## 5. 数据层

新增 `src/data/swyb.js`（纯前端、确定性 mock，不引接口）：

- `SW_STATIONS`：复用/派生自 `stationNetwork.js` 的站名、河道，赋水位、警戒、雨量、潮位字段。
- `TYPHOONS`：8 个历史/当前台风场次，含编号、名称、影响时段、过程雨量、最大日雨量、最高水位、潮位增水、超警站数。
- `districtRain(typhoonId)`：各区雨量统计。
- `liveSummary()`：当前实时一览。
- `forecast(stationKey, scheme, hours)`：返回 `{ past:[{t,v}], future:[{t,v,q}], stats }`。
- 所有随机量用「种子 + LCG / sin 哈希」，同一输入多次调用结果一致。

## 6. 文件清单

新增：

- `src/views/swyb/WaterInfoApp.vue`
- `src/views/swyb/FloodForecast.vue`
- `src/views/swyb/TyphoonMonitor.vue`
- `src/views/swyb/TyphoonHistory.vue`
- `src/views/swyb/ForecastWarning.vue`
- `src/data/swyb.js`
- `docs/superpowers/specs/2026-11-23-swyb-menu-design.md`（本文档）

修改：

- `src/config/menu.js`：`MODULES` 的 swyb 加 `drop: true`；新增 `SUBMENUS.swyb`；补充 `MOD_DESC.swyb`（已有，按需微调）。
- `src/layout/MainLayout.vue`：下拉容器、hover 计时器、图标映射补充。
- `src/styles/common.css`：`.nav-drop` 样式与过渡。
- `src/router/index.js`：5 条子路由 + `/swyb` 重定向。

## 7. 非目标

- 不改其他模块的顶栏与左侧菜单行为。
- 不接真实接口、预报模型、地图服务。
- 不新增登录/权限。
- 不改造全局布局宽度与配色。

## 8. 验收标准

1. 悬浮「水情预报」出现下拉，移开 120ms 后收起；其他顶栏项无下拉。
2. 点击 5 个下拉项均进入对应页面，左侧菜单正确高亮；点击顶栏「水情预报」进入「水情综合应用」。
3. 每个页面具备条件栏、统计卡、图表、表格、导出，数据刷新不变。
4. 无控制台报错；`npm run build` 通过。
5. 除预警等级徽标外不出现橙色/红色。
