/**
 * 降水等值线 / 等值面计算（纯前端 demo）
 * - idwGrid：散点（站点）值反距离加权插值到规则网格
 * - marchingSquares：从网格提取等值线
 * - 分级色带：蓝色系（避开橙/红预警色），供等值面填充与图例使用
 */

export const RAIN_LEVELS = [25, 50, 75, 100, 125, 150, 175, 200]

/** 分级色带：低于 25 到高于 200，共 9 档（蓝→深蓝，不用橙红） */
export const RAIN_COLORS = [
  '#f3f9ff', '#d6e9fa', '#aad0f0', '#79b4e3', '#4d93d0',
  '#2671b8', '#10549a', '#0a3c75', '#06284f'
]

/** 数值 → 色带档位下标（0..8） */
export function bandIndex(v) {
  let i = 0
  while (i < RAIN_LEVELS.length && v >= RAIN_LEVELS[i]) i++
  return i
}
export function bandColor(v) { return RAIN_COLORS[bandIndex(v)] }

/** 等值线颜色（线模式下统一的蓝） */
export const LINE_COLOR = '#2671b8'

/**
 * 反距离加权插值到规则网格
 * @param {Array<{x:number,y:number,v:number}>} points 散点（已投影到目标坐标空间）
 * @param {{nx:number,ny:number,x0:number,y0:number,x1:number,y1:number}} o
 * @returns {{grid:number[][],dx:number,dy:number,nx:number,ny:number}}
 */
export function idwGrid(points, { nx, ny, x0, y0, x1, y1 }) {
  const dx = (x1 - x0) / (nx - 1)
  const dy = (y1 - y0) / (ny - 1)
  const grid = []
  for (let j = 0; j < ny; j++) {
    const gy = y0 + j * dy
    const row = new Array(nx)
    for (let i = 0; i < nx; i++) {
      const gx = x0 + i * dx
      let num = 0
      let den = 0
      for (let k = 0; k < points.length; k++) {
        const p = points[k]
        const d2 = (gx - p.x) * (gx - p.x) + (gy - p.y) * (gy - p.y)
        const w = 1 / (d2 + 400) // 幂次≈2，+400 让近站不过度尖刺
        num += w * p.v
        den += w
      }
      row[i] = den ? num / den : 0
    }
    grid.push(row)
  }
  return { grid, dx, dy, nx, ny }
}

/* ---------------- Marching Squares ---------------- */

// 角点序：b0=左上 b1=右上 b2=右下 b3=左下，边 0顶 1右 2底 3左
const SEG_TABLE = [
  [],                  // 0
  [[3, 2]],            // 1
  [[2, 1]],            // 2
  [[3, 1]],            // 3
  [[0, 1]],            // 4
  [[0, 3], [1, 2]],    // 5 鞍点
  [[0, 2]],            // 6
  [[0, 3]],            // 7
  [[0, 3]],            // 8
  [[0, 2]],            // 9
  [[0, 1], [3, 2]],    // 10 鞍点
  [[0, 1]],            // 11
  [[3, 1]],            // 12
  [[1, 2]],            // 13
  [[3, 2]],            // 14
  []                   // 15
]

function t(a, b, lvl) {
  const d = b - a
  return d === 0 ? 0 : (lvl - a) / d
}

/**
 * 从网格提取某等值线的线段
 * @returns {Array<{x1:number,y1:number,x2:number,y2:number}>}
 */
export function marchingSquares(gridInfo, level) {
  const { grid, dx, dy, nx, ny } = gridInfo
  const segs = []
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const b0 = grid[j][i]
      const b1 = grid[j][i + 1]
      const b2 = grid[j + 1][i + 1]
      const b3 = grid[j + 1][i]
      let c = 0
      if (b0 >= level) c |= 8
      if (b1 >= level) c |= 4
      if (b2 >= level) c |= 2
      if (b3 >= level) c |= 1
      const pairs = SEG_TABLE[c]
      if (!pairs.length) continue

      const x = i * dx
      const y = j * dy
      // 四条边的交点
      const pt = (e) => {
        if (e === 0) return { x: x + dx * t(b0, b1, level), y }
        if (e === 1) return { x: x + dx, y: y + dy * t(b1, b2, level) }
        if (e === 2) return { x: x + dx * t(b3, b2, level), y: y + dy }
        return { x, y: y + dy * t(b0, b3, level) }
      }
      for (const [ea, eb] of pairs) {
        const a = pt(ea)
        const b = pt(eb)
        segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
      }
    }
  }
  return segs
}

/** 全部等值线：{ level, segs }[]，仅保留有线段的档 */
export function allContours(gridInfo) {
  return RAIN_LEVELS
    .map((level) => ({ level, segs: marchingSquares(gridInfo, level) }))
    .filter((c) => c.segs.length)
}
