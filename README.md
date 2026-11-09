# SHSWWebVue · 上海市水文行业综合业务管理系统（演示版）

基于 `TBASWWebVue` 框架技术栈（Vue3 + Vite + Element Plus + ECharts + Pinia + Vue Router）搭建的演示版，
**无接口、无登录**，数据全部前端内置。

## 运行

```bash
npm install
npm run dev      # http://localhost:5176
npm run build    # 打包到 dist/
```

## 已实现

| 模块 | 功能 | 说明 |
|---|---|---|
| 平台首页 | 门户 + 7 张业务模块卡片 | 水资源评价卡片标注本批次进度 |
| 水资源评价 | 主要断面流量实时感知 | 左 SVG 地图（16 区边界 + 35 站，实时流量/流向箭头）+ 右统计卡/筛选/明细表 |
| 水资源评价 | 历年水资源量查询 | 年份区间 + 6 指标多选 → 5 个页签联动（柱状图 + 表格） |

其余 5 个一级模块、以及水资源评价下 4 个「待设计」子菜单为占位页。

## 数据来源

- 站点：`流量站.txt`（35 站，2026-11-05 快照），存于 `src/data/stations.js`
- 行政区边界：16 区边界多边形，存于 `src/data/districts.js`
- 水资源公报数据（2019–2023）：存于 `src/data/waterResources.js`

## 目录结构

```
src/
├── config/menu.js            # 一级/二级菜单结构
├── data/                     # 内置数据（站点/边界/公报）
├── layout/MainLayout.vue     # 顶栏 + 侧栏布局
├── router/index.js           # hash 路由
├── views/
│   ├── Home.vue              # 平台首页
│   ├── ModuleStub.vue        # 其他一级模块占位
│   ├── SubStub.vue           # 水资源评价「待设计」子菜单占位
│   └── zp/
│       ├── RealtimePerception.vue   # 主要断面流量实时感知
│       └── WaterResourceQuery.vue   # 历年水资源量查询
└── styles/common.css         # 全局样式
```
