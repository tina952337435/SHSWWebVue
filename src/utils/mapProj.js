/**
 * 上海「一张图」地图公共投影与瓦片配置
 *
 * 一张图的瓦片缓存按上海本地格网（上海2000城建坐标，单位米）编号，底图本身也是在
 * 这个平面上渲染的。矢量数据必须换算到同一套城建坐标再画，才能和底图严丝合缝；
 * 用经纬度 + 墨卡托投影叠上去，越往外围偏得越多（墨卡托在 31°N 放大约 1.17 倍）。
 * 经纬度 → 城建坐标 的一阶变换由参考工程里同一套水利片区的「经纬度版」与
 * 「2000 版」逐点拟合得到，残差 < 5 m。
 *
 * 供「主要断面流量实时感知」与「站网GIS」共用。
 */

export const CJ = { ax: 95192.4, bx: -28.79, cx: -11561907.8, ay: 50.97, by: 110872.1, cy: -3469339.4 }
const CJ_DET = CJ.ax * CJ.by - CJ.bx * CJ.ay

export const cjX = (lon, lat) => CJ.ax * lon + CJ.bx * lat + CJ.cx
export const cjY = (lon, lat) => CJ.ay * lon + CJ.by * lat + CJ.cy
export const cjLon = (x, y) => (CJ.by * (x - CJ.cx) - CJ.bx * (y - CJ.cy)) / CJ_DET
export const cjLat = (x, y) => (CJ.ax * (y - CJ.cy) - CJ.ay * (x - CJ.cx)) / CJ_DET

// 城建坐标范围（米）
export const BBOX = { x0: -88000, x1: 82500, y0: -76000, y1: 79500 }
export const MW = 1000
export const X0 = BBOX.x0
export const Y0 = BBOX.y1
export const XS = BBOX.x1 - X0
export const YS = Y0 - BBOX.y0
export const MH = Math.round((MW * YS) / XS) // 保持 1:1 比例，避免底图拉伸

/** 经纬度 → 视口 SVG 坐标 [x, y] */
export function proj(lon, lat) {
  return [((cjX(lon, lat) - X0) / XS) * MW, ((Y0 - cjY(lon, lat)) / YS) * MH]
}

/* ================= OneMap 底图瓦片 ================= */
export const TILE_BASE = 'https://service-api.onemap.sh.cegn.cn/OneMapServer/rest/services/j01_basemap_normal/MapServer/tile'
export const TILE_TOKEN = 'd01b7f932ff44c04bd0b026e9daaae97'
// 一张图缓存把城建坐标（米）直接铺在与 Web 墨卡托同尺寸的世界格网上编号：
//   col = (x + 20037508.34) / 世界宽 × 2^级别
//   row = (20037508.34 − y) / 世界宽 × 2^级别
// 所以行列号直接由城建坐标算出，不需要任何额外偏移。
export const WORLD = 40075016.69
export const WORLD_HALF = 20037508.342787
export const tileUrl = (z, r, c) => `${TILE_BASE}/${z}/${r}/${c}?jcmp-token=${TILE_TOKEN}`

// 备用浅色底图（标准 Web 墨卡托）：OneMap 不可用时自动顶上，按经纬度反算位置贴上
export const TILE_FALLBACK = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile'
export const fallbackUrl = (z, x, y) => `${TILE_FALLBACK}/${z}/${y}/${x}`
