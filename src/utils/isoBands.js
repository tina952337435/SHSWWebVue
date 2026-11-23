/**
 * 等值面多边形生成（对齐参考页 rainfallMultiIsosurfaces 返回的 isosurfaces.polygons）
 *
 * 流程：散点 → IDW 插值网格 → 外围补一圈「低于所有等级」的栅格（保证等值线一定闭合）
 *      → marching squares 提取等值线 → 拼接成闭合环 → SVG 路径。
 * 前端按等级从低到高依次填充，高等级覆盖低等级，得到和接口一致的矢量色带。
 */
import { marchingSquares } from './contour'

/**
 * @param {Array<{x:number,y:number,v:number}>} points 已投影到 SVG 坐标的散点
 * @param {number[]} levels 等级阈值（升序）
 * @param {{nx?:number, blur?:number, pad?:number}} opts
 * @returns {{levels:Array<{level:number, d:string, loops:number}>, bbox:{x0,y0,x1,y1}}}
 */
export function buildIsoBands(points, levels, opts = {}) {
  const pts = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.v))
  if (pts.length < 3) return { levels: [], bbox: null }

  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  pts.forEach((p) => {
    if (p.x < x0) x0 = p.x
    if (p.x > x1) x1 = p.x
    if (p.y < y0) y0 = p.y
    if (p.y > y1) y1 = p.y
  })
  const padX = (x1 - x0) * 0.06
  const padY = (y1 - y0) * 0.06
  x0 -= padX; x1 += padX; y0 -= padY; y1 += padY

  const nx = opts.nx || 260
  const ny = Math.max(32, Math.round((nx * (y1 - y0)) / (x1 - x0)))
  const dx = (x1 - x0) / (nx - 1)
  const dy = (y1 - y0) / (ny - 1)
  const eps = opts.blur || 1e5

  /* ---------- IDW 插值（空间分桶加速） ---------- */
  const B = Math.max(1500, (x1 - x0) / 14)
  const nbx = Math.ceil((x1 - x0) / B) + 1
  const nby = Math.ceil((y1 - y0) / B) + 1
  const buckets = new Map()
  pts.forEach((p) => {
    const bi = Math.min(nbx - 1, Math.max(0, Math.floor((p.x - x0) / B)))
    const bj = Math.min(nby - 1, Math.max(0, Math.floor((p.y - y0) / B)))
    const k = bj * nbx + bi
    let arr = buckets.get(k)
    if (!arr) { arr = []; buckets.set(k, arr) }
    arr.push(p)
  })

  const near = []
  const inner = []
  for (let j = 0; j < ny; j++) {
    const gy = y0 + j * dy
    const bj = Math.min(nby - 1, Math.max(0, Math.floor((gy - y0) / B)))
    const row = new Array(nx)
    for (let i = 0; i < nx; i++) {
      const gx = x0 + i * dx
      const bi = Math.min(nbx - 1, Math.max(0, Math.floor((gx - x0) / B)))
      near.length = 0
      for (let dj = -1; dj <= 1; dj++) {
        const jj = bj + dj
        if (jj < 0 || jj >= nby) continue
        for (let di = -1; di <= 1; di++) {
          const ii = bi + di
          if (ii < 0 || ii >= nbx) continue
          const arr = buckets.get(jj * nbx + ii)
          if (arr) for (let n = 0; n < arr.length; n++) near.push(arr[n])
        }
      }
      if (near.length < 4) {
        for (let dj = -2; dj <= 2; dj++) {
          const jj = bj + dj
          if (jj < 0 || jj >= nby) continue
          for (let di = -2; di <= 2; di++) {
            const ii = bi + di
            if (ii < 0 || ii >= nbx) continue
            const arr = buckets.get(jj * nbx + ii)
            if (arr) for (let n = 0; n < arr.length; n++) near.push(arr[n])
          }
        }
      }
      let num = 0
      let den = 0
      for (let k = 0; k < near.length; k++) {
        const p = near[k]
        const ddx = gx - p.x
        const ddy = gy - p.y
        const w = 1 / (ddx * ddx + ddy * ddy + eps)
        num += w * p.v
        den += w
      }
      row[i] = den ? num / den : 0
    }
    inner.push(row)
  }

  /* ---------- 外围补一圈低值栅格，保证等值线闭合 ---------- */
  const PAD = 2
  const SNX = nx + PAD * 2
  const SNY = ny + PAD * 2
  const grid = []
  for (let j = 0; j < SNY; j++) {
    const row = new Array(SNX)
    for (let i = 0; i < SNX; i++) {
      const si = i - PAD
      const sj = j - PAD
      row[i] = si >= 0 && si < nx && sj >= 0 && sj < ny ? inner[sj][si] : -1
    }
    grid.push(row)
  }
  const info = { grid, dx, dy, nx: SNX, ny: SNY }
  const ox = x0 - PAD * dx
  const oy = y0 - PAD * dy

  const out = levels.map((level) => {
    const segs = marchingSquares(info, level).map((s) => ({
      x1: s.x1 + ox, y1: s.y1 + oy,
      x2: s.x2 + ox, y2: s.y2 + oy
    }))
    const loops = stitch(segs)
      .filter((loop) => loop.length >= 4 && loopArea(loop) > 4)
    return {
      level,
      loops: loops.map((loop) => loop.map((p) => [p.x, p.y])),
      d: loops.map(loopToPath).join('')
    }
  })

  return { levels: out, bbox: { x0, y0, x1, y1 } }
}

/* ---------------- 线段拼环 ---------------- */
function stitch(segs) {
  if (!segs.length) return []
  const TOL = 0.02 // 合并容差（SVG 单位，约 3 米）
  const key = (x, y) => `${Math.round(x / TOL)}_${Math.round(y / TOL)}`

  const at = new Map() // 端点 → 线段引用
  const add = (k, ref) => {
    let arr = at.get(k)
    if (!arr) { arr = []; at.set(k, arr) }
    arr.push(ref)
  }
  segs.forEach((s, i) => {
    add(key(s.x1, s.y1), { i, end: 0 })
    add(key(s.x2, s.y2), { i, end: 1 })
  })

  const used = new Array(segs.length).fill(false)
  const loops = []

  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue
    used[i] = true
    const s = segs[i]
    const loop = [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }]
    let cx = s.x2
    let cy = s.y2
    let guard = 0
    let closed = false

    while (guard++ < segs.length + 8) {
      if (Math.abs(cx - loop[0].x) < TOL && Math.abs(cy - loop[0].y) < TOL) {
        closed = true
        break
      }
      const refs = at.get(key(cx, cy)) || []
      let nextRef = null
      for (let r = 0; r < refs.length; r++) {
        if (!used[refs[r].i]) { nextRef = refs[r]; break }
      }
      if (!nextRef) break
      used[nextRef.i] = true
      const seg = segs[nextRef.i]
      cx = nextRef.end === 0 ? seg.x2 : seg.x1
      cy = nextRef.end === 0 ? seg.y2 : seg.y1
      loop.push({ x: cx, y: cy })
    }

    if (closed && loop.length >= 4) loops.push(loop)
  }
  return loops
}

/** 环面积（用于过滤零碎小环） */
function loopArea(loop) {
  let a = 0
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    a += loop[j].x * loop[i].y - loop[i].x * loop[j].y
  }
  return Math.abs(a / 2)
}

function loopToPath(loop) {
  let d = ''
  loop.forEach((p, i) => {
    d += (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)
  })
  return d + 'Z'
}
