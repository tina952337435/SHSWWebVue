/** 导出 CSV（UTF-8 带 BOM，Excel 直接打开不乱码） */
function csvCell(v) {
  let s = String(v == null ? '' : v)
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"'
  return s
}

/**
 * @param {string} filename 文件名（不含路径）
 * @param {string[]} header 表头
 * @param {Array<Array<*>>} rows 数据行（二维数组）
 */
export function downloadCsv(filename, header, rows) {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(','))
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}
