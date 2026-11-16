/**
 * 断面图几何：求「低于水位」的区段，用于绘制水面多边形。
 *
 * 参考大屏版断面的画法：水只填在河槽里（地形低于水面处），
 * 而不是整幅宽度铺一条蓝带，所以需要先做折线与水平线的求交。
 */

/**
 * @param {Array<[number, number]>} points 按 x 升序的地形折线 [x, elev]
 * @param {number} level 水位高程
 * @returns {Array<{pts: Array<[number, number]>}>} 每段水面的多边形顶点（顺时针，已闭合）
 */
export function waterBands(points, level) {
  if (!points || points.length < 2) return []
  const out = []
  let cur = null

  const lerpX = (a, b) => {
    const dy = b[1] - a[1]
    if (Math.abs(dy) < 1e-9) return a[0]
    return a[0] + ((level - a[1]) / dy) * (b[0] - a[0])
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const da = a[1] - level
    const db = b[1] - level

    if (da >= 0 && db >= 0) {
      if (cur) { out.push(cur); cur = null }
      continue
    }

    if (!cur) {
      // 进入水下
      const x = da < 0 ? a[0] : lerpX(a, b)
      cur = { left: x, pts: [] }
    }

    if (cur.pts.length === 0) cur.pts.push([cur.left, level])
    cur.pts.push([b[0], b[1]])

    if (db >= 0) {
      // 浮出水面
      const x = lerpX(a, b)
      cur.pts.push([x, level])
      cur.right = x
      out.push(cur)
      cur = null
    }
  }
  if (cur) {
    const last = points[points.length - 1]
    cur.right = last[0]
    cur.pts.push([last[0], last[1]])
    out.push(cur)
  }

  // 组成闭合多边形：水面左端 → 水面右端 → 沿地形折回
  return out
    .filter((b) => b.pts.length > 2 && Math.abs(b.right - b.left) > 1e-6)
    .map((b) => {
      const poly = [[b.left, level], [b.right, level]]
      for (let i = b.pts.length - 1; i >= 0; i--) {
        const p = b.pts[i]
        if (p[0] > b.left && p[0] < b.right) poly.push(p)
      }
      return { pts: poly }
    })
}
