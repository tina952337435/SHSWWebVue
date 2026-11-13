<template>
  <div class="ef">
    <!-- 左侧：生成配置 -->
    <aside class="ef-side">
      <div class="ef-fld">
        <label>年份选择</label>
        <select v-model.number="year">
          <option v-for="y in YEARS" :key="y" :value="y">{{ y }}年</option>
        </select>
      </div>

      <div class="ef-fld">
        <label>月份选择</label>
        <select v-model.number="month">
          <option v-for="m in MONTHS" :key="m" :value="m">{{ m }}月</option>
        </select>
      </div>

      <button class="ef-gen" :disabled="loading" @click="generate">
        <span class="ico">{{ report ? '⟳' : '⚡' }}</span>
        {{ loading ? '生成中…' : (report ? '重新生成' : '生成报告') }}
      </button>

      <div class="ef-tip">
        <span class="ti">💡</span>
        <span>请先选择年份和月份，点击「生成报告」后右侧将显示 PDF 预览，确认无误后点击「保存记录」入库，可在「边界来水监测月报」中查看。</span>
      </div>
    </aside>

    <!-- 右侧：预览区 -->
    <section class="ef-main">
      <div v-if="!report" class="ef-empty">
        <div class="clip">
          <svg viewBox="0 0 64 64" width="60" height="60" aria-hidden="true">
            <rect x="16" y="10" width="32" height="44" rx="4" fill="#e9e2d8" stroke="#8d8175" stroke-width="2" />
            <rect x="24" y="6" width="16" height="8" rx="3" fill="#cbbfae" stroke="#8d8175" stroke-width="2" />
            <g stroke="#8d8175" stroke-width="2" stroke-linecap="round">
              <line x1="23" y1="24" x2="41" y2="24" />
              <line x1="23" y1="31" x2="41" y2="31" />
              <line x1="23" y1="38" x2="35" y2="38" />
            </g>
          </svg>
        </div>
        <div class="t1">暂无报告</div>
        <div class="t2">请在左侧选择年份和月份<br />点击「生成报告」即可预览月报</div>
      </div>

      <template v-else>
        <div class="ef-bar">
          <div class="l">
            <span class="bar-ico">≋</span>
            边界来水监测月报 · {{ report.period }}
          </div>
          <div class="r">
            <button class="btn-dl" @click="download">⬇ 下载文档</button>
            <button class="btn-save" @click="save">✓ 保存记录</button>
          </div>
        </div>

        <div class="ef-pdf">
          <!-- 仿 PDF 阅读器工具条 -->
          <div class="pdf-tool">
            <span class="pt-item">▣ {{ report.period }}边界来水监测月报.pdf</span>
            <span class="pt-group">
              <i>‹</i><span class="pg">1 / 1</span><i>›</i>
            </span>
            <span class="pt-group">
              <i>−</i><span class="pg">100%</span><i>+</i>
            </span>
          </div>

          <!-- A4 纸面 -->
          <div class="pdf-scroll">
            <BoundaryReportPaper :report="report" />
          </div>
        </div>
      </template>
    </section>

    <!-- 打印区：仅打印时显示 -->
    <Teleport to="body">
      <div class="print-root">
        <BoundaryReportPaper v-if="printReport" :report="printReport" />
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import BoundaryReportPaper from './components/BoundaryReportPaper.vue'
import { IO_YEARS } from '@/data/inOutFlow'
import { genBoundaryReport, saveBoundaryReport } from '@/store/boundaryReport'

const YEARS = IO_YEARS
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

const year = ref(2026)
const month = ref(10)
const report = ref(null)
const printReport = ref(null)
const loading = ref(false)

/** 生成报告：模拟汇总耗时，生成后按钮换文案为「重新生成」 */
function generate() {
  if (loading.value) return
  loading.value = true
  setTimeout(() => {
    report.value = genBoundaryReport(year.value, month.value)
    loading.value = false
  }, 500)
}

/** 下载：以浏览器打印方式导出 A4 PDF */
async function download() {
  printReport.value = report.value
  await nextTick()
  window.addEventListener('afterprint', () => { printReport.value = null }, { once: true })
  window.print()
}

/** 保存记录：写入月报记录表 */
function save() {
  const rec = saveBoundaryReport(report.value.year, report.value.month)
  ElMessage.success({
    message: `${rec.period}边界来水监测月报已保存，可在「边界来水监测月报」中查看`,
    offset: 78
  })
}
</script>
