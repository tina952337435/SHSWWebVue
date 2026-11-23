/**
 * 降雨等值面生成（纯前端）
 * 散点（上海城建坐标 + 雨量值）→ 反距离加权插值到高分辨率网格 → 按等级取色 →
 * 按行政边界裁剪 → 输出可直接放进 SVG 的 dataURL。
 *
 * 为了既快又细，用「空间分桶」加速：每个像素只取附近桶内的站点参与插值，
 * 避免 60 万像素 × 600 站点的全量计算。
 */

/**
 * @param {Array<{lon:number,lat:number,value:number}>} stations 城建坐标散点
 * @param {number[]} levels 等级阈值（升序）
 * @param {string[]} colors 与等级一一对应的颜色
 * @param {{X0:number,Y0:number,XS:number,YS:number,MW:number,MH:number}} geo 图幅换算参数
 * @param {{rings?:Array<Array<[number,number]>>, cols?:number, blur?:number}} opts
 *        rings：裁剪用的闭合环（SVG 坐标）；blur：平滑半径（米²），越小越贴近实测
 * @returns {{href:string,x:number,y:number,w:number,h:number}|null}
 */
export function buildIsoSurface(stations, levels, colors, geo, opts = {}) {
  const { X0, Y0, XS, YS, MW, MH } = geo
  if (!stations || !stations.length || !levels || !levels.length) return null

  // 城建坐标 → SVG 坐标
  const pts = stations
    .filter((s) => Number.isFinite(s.lon) && Number.isFinite(s.lat) && Number.isFinite(s.value))
    .map((s) => ({
      x: ((s.lon - X0) / XS) * MW,
      y: ((Y0 - s.lat) / YS) * MH,
      v: Number(s.value)
    }))
  if (pts.length < 3) return null

  // 覆盖范围：站点外包框外扩，再裁到图幅内
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  pts.forEach((p) => {
    if (p.x < x0) x0 = p.x
    if (p.x > x1) x1 = p.x
    if (p.y < y0) y0 = p.y
    if (p.y > y1) y1 = p.y
  })
  const padX = (x1 - x0) * 0.05
  const padY = (y1 - y0) * 0.05
  x0 = Math.max(0, x0 - padX)
  x1 = Math.min(MW, x1 + padX)
  y0 = Math.max(0, y0 - padY)
  y1 = Math.min(MH, y1 + padY)
  if (x1 <= x0 || y1 <= y0) return null

  // 高分辨率网格：每格约 350—500 米，等级带才不会糊成块
  const cols = opts.cols || 420
  const rows = Math.max(32, Math.round((cols * (y1 - y0)) / (x1 - x0)))

  /* ---- 空间分桶：加速邻近站点检索 ---- */
  // 桶宽取图幅的 1/14（约 10–12 km），保证 3×3 邻域内通常有 20—40 个站点
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

  const canvas = document.createElement('canvas')
  canvas.width = cols
  canvas.height = rows
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(cols, rows)
  const bandColors = colors.map(hexToRgb)

  const dx = (x1 - x0) / (cols - 1)
  const dy = (y1 - y0) / (rows - 1)
  const eps = opts.blur || 1e5 // 平滑半径（米²）：1e5 ≈ 320 米，既贴合实测又不过度抖动

  const near = []
  for (let j = 0; j < rows; j++) {
    const gy = y0 + j * dy
    const bj = Math.min(nby - 1, Math.max(0, Math.floor((gy - y0) / B)))
    for (let i = 0; i < cols; i++) {
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
      // 周围站点太少时扩大一圈，避免边缘出现空值
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
        const d2 = ddx * ddx + ddy * ddy
        const w = 1 / (d2 + eps) // 反距离平方加权
        num += w * p.v
        den += w
      }
      const v = den ? num / den : 0
      const idx = (j * cols + i) * 4
      const rgb = colorOf(v, levels, bandColors)
      if (rgb) {
        img.data[idx] = rgb[0]
        img.data[idx + 1] = rgb[1]
        img.data[idx + 2] = rgb[2]
        img.data[idx + 3] = 242
      } else {
        img.data[idx + 3] = 0
      }
    }
  }
  ctx.putImageData(img, 0, 0)

  // 按行政边界裁剪：环外透明
  if (opts.rings && opts.rings.length) {
    const sx = cols / (x1 - x0)
    const sy = rows / (y1 - y0)
    ctx.globalCompositeOperation = 'destination-in'
    ctx.beginPath()
    opts.rings.forEach((ring) => {
      ring.forEach((p, i) => {
        const cx = (p[0] - x0) * sx
        const cy = (p[1] - y0) * sy
        if (i === 0) ctx.moveTo(cx, cy)
        else ctx.lineTo(cx, cy)
      })
      ctx.closePath()
    })
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }

  // 可选：轻微放大平滑，消除网格台阶（不影响等级边界位置）
  if (opts.smooth && opts.smooth > 1) {
    const big = document.createElement('canvas')
    big.width = cols * opts.smooth
    big.height = rows * opts.smooth
    const bctx = big.getContext('2d')
    bctx.imageSmoothingEnabled = true
    bctx.imageSmoothingQuality = 'high'
    bctx.drawImage(canvas, 0, 0, big.width, big.height)
    return {
      href: big.toDataURL('image/png'),
      x: x0,
      y: y0,
      w: x1 - x0,
      h: y1 - y0
    }
  }

  return {
    href: canvas.toDataURL('image/png'),
    x: x0,
    y: y0,
    w: x1 - x0,
    h: y1 - y0
  }
}

/** 按等级取色：取 ≤ v 的最大等级；低于最低等级不绘制 */
function colorOf(v, levels, bandColors) {
  let idx = -1
  for (let i = 0; i < levels.length; i++) {
    if (v >= levels[i]) idx = i
    else break
  }
  return idx >= 0 ? bandColors[idx] : null
}

function hexToRgb(hex) {
  const h = String(hex).replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
