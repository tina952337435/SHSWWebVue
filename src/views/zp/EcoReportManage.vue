<template>
  <div class="rm">
    <div class="rm-bar">
      <div class="l"><span class="ico">▤</span>生态流量月报管理</div>
      <div class="r">
        <span>年份</span>
        <select v-model="fYear">
          <option value="all">全部</option>
          <option v-for="y in years" :key="y" :value="y">{{ y }}年</option>
        </select>
        <span>月份</span>
        <select v-model="fMonth">
          <option value="all">全部</option>
          <option v-for="m in ECO_MONTHS" :key="m" :value="m">{{ m }}月</option>
        </select>
        <span class="cnt">共 {{ rows.length }} 份</span>
        <ExportButton @export="exportCsv" />
        <button class="btn-dl rm-add" type="button" @click="addReport">＋ 添加</button>
      </div>
    </div>

    <div class="rm-body">
      <div class="rm-card">
        <table class="dt">
          <thead>
            <tr>
              <th style="width:64px">序号</th>
              <th>报告名称</th>
              <th style="width:120px">期号</th>
              <th style="width:110px">统计月份</th>
              <th style="width:100px">目标保障率</th>
              <th style="width:150px">生成时间</th>
              <th style="width:170px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in rows" :key="r.id">
              <td>{{ i + 1 }}</td>
              <td>{{ r.name }}</td>
              <td>{{ r.issue }}</td>
              <td>{{ r.period }}</td>
              <td class="num">{{ Number(r.rate).toFixed(1) }}%</td>
              <td>{{ r.savedAt }}</td>
              <td>
                <span class="op" @click="preview(r)">预览</span>
                <span class="op" @click="download(r)">下载</span>
                <span class="op del" @click="remove(r)">删除</span>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="7" class="empty">暂无月报记录，点击右上角「＋ 添加」生成月报</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 预览弹窗 -->
    <el-dialog v-model="pvVisible" title="月报预览" width="880px" append-to-body>
      <div class="rm-pv">
        <ReportPaper v-if="pvReport" :report="pvReport" />
      </div>
      <template #footer>
        <button class="btn-plain" @click="pvVisible = false">关闭</button>
        <button class="btn-dl" @click="download(pvRecord)">⬇ 下载文档</button>
      </template>
    </el-dialog>

    <!-- 打印区：仅打印时显示 -->
    <Teleport to="body">
      <div class="print-root">
        <ReportPaper v-if="printReport" :report="printReport" />
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import ReportPaper from './components/ReportPaper.vue'
import ExportButton from '@/components/ExportButton.vue'
import { ECO_MONTHS, genEcoReport } from '@/data/ecoFlow'
import { ecoReports, removeEcoReport } from '@/store/ecoReport'
import { downloadCsv } from '@/utils/csv'

const router = useRouter()

const fYear = ref('all')
const fMonth = ref('all')

/** 添加：跳到月报生成页 */
function addReport() { router.push('/zp/stlrb') }

const years = computed(() => [...new Set(ecoReports.value.map((r) => r.year))].sort((a, b) => b - a))
const rows = computed(() =>
  ecoReports.value.filter(
    (r) => (fYear.value === 'all' || r.year === fYear.value) && (fMonth.value === 'all' || r.month === fMonth.value)
  )
)

const pvVisible = ref(false)
const pvRecord = ref(null)
const pvReport = ref(null)
const printReport = ref(null)

function preview(rec) {
  pvRecord.value = rec
  pvReport.value = genEcoReport(rec.year, rec.month)
  pvVisible.value = true
}

async function download(rec) {
  printReport.value = genEcoReport(rec.year, rec.month)
  await nextTick()
  window.addEventListener('afterprint', () => { printReport.value = null }, { once: true })
  window.print()
}

function exportCsv() {
  const head = ['序号', '报告名称', '期号', '统计月份', '目标保障率', '生成时间']
  const lines = rows.value.map((r, i) => [
    i + 1, r.name, r.issue, r.period, Number(r.rate).toFixed(1) + '%', r.savedAt
  ])
  downloadCsv('生态流量月报记录.csv', head, lines)
}

function remove(rec) {
  ElMessageBox.confirm(`确定删除「${rec.period}」月报记录吗？`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'info'
  })
    .then(() => {
      removeEcoReport(rec.id)
      ElMessage.success({ message: '月报记录已删除', offset: 78 })
    })
    .catch(() => {})
}
</script>

<style scoped>
.rm-add {
  height: 30px; padding: 0 14px; font-size: 13px; font-weight: 600;
  white-space: nowrap; margin-left: 2px;
}
</style>
