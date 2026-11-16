/**
 * 断面图的材质贴图（纯前端生成，不依赖图片资源）
 *
 * 原项目用 /images/*.png 的石纹、水纹贴图；本项目没有这些资源，
 * 这里用 canvas 生成等价的「浅灰石纹」图案，缓存后供 ECharts 的
 * areaStyle.color = { image, repeat: 'repeat' } 使用。
 */

let stonePromise = null

export function stoneTexture() {
  if (stonePromise) return stonePromise
  stonePromise = new Promise((resolve) => {
    if (typeof document === 'undefined') { resolve(null); return }
    const size = 64
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const ctx = c.getContext('2d')
    if (!ctx) { resolve(null); return }

    // 底色（石灰色）
    ctx.fillStyle = '#d7dde3'
    ctx.fillRect(0, 0, size, size)

    // 确定性噪点，模拟石纹/砾石质感（密度和对比度对齐深色版）
    let seed = 20261115
    const rnd = () => {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0
      return seed / 4294967296
    }
    for (let i = 0; i < 3600; i++) {
      const g = 90 + Math.floor(rnd() * 95)
      const a = 0.22 + rnd() * 0.42
      ctx.fillStyle = `rgba(${g},${g},${g},${a.toFixed(3)})`
      const w = rnd() < 0.18 ? 2 : 1
      ctx.fillRect(rnd() * size, rnd() * size, w, w)
    }

    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = c.toDataURL('image/png')
  })
  return stonePromise
}
