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
                <span class="op" @click="openTemplate">下载</span>
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

    <!-- 预览弹窗：显示收集到的官方模板 PDF -->
    <div v-if="pvVisible" class="pv-mask" @click.self="pvVisible = false">
      <div class="pv-box">
        <div class="pv-hd">
          <span>月报预览</span>
          <button class="pv-x" type="button" @click="pvVisible = false">×</button>
        </div>
        <div class="pv-bd">
          <iframe v-if="pvOk === true" :src="TEMPLATE_URL" class="pv-frame" />
          <div v-else-if="pvOk === false" class="pv-miss">
            <div class="t1">未找到月报模板文件</div>
            <div class="t2">
              请把《上海市河湖生态流量（水位）监测月报（2026年9月）.pdf》<br />
              复制到项目 <code>public/templates/</code> 目录，并命名为 <code>eco-monthly.pdf</code>
            </div>
          </div>
          <div v-else class="pv-loading">正在加载模板…</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import ExportButton from '@/components/ExportButton.vue'
import { ECO_MONTHS } from '@/data/ecoFlow'
import { ecoReports, removeEcoReport } from '@/store/ecoReport'
import { downloadCsv } from '@/utils/csv'

const TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/eco-monthly.pdf`

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
const pvOk = ref(null) // null=检测中 true=可预览 false=文件缺失

/** 打开预览：先确认模板文件确实存在且是 PDF（避免 404 时 iframe 渲染成首页） */
async function preview() {
  pvVisible.value = true
  pvOk.value = null
  try {
    const res = await fetch(TEMPLATE_URL)
    const buf = await res.arrayBuffer()
    const sig = new TextDecoder().decode(buf.slice(0, 4))
    pvOk.value = res.ok && sig === '%PDF'
  } catch (e) {
    pvOk.value = false
  }
}

function openTemplate() { window.open(TEMPLATE_URL, '_blank', 'noopener,noreferrer') }

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
/* 预览弹窗：整屏居中 */
.pv-mask {
  position: fixed; inset: 0; z-index: 2000;
  display: flex; align-items: center; justify-content: center;
  padding: 24px; background: rgba(13, 35, 58, .45);
}
.pv-box {
  width: min(1400px, 94vw); height: 92vh;
  display: flex; flex-direction: column;
  background: #fff; border-radius: 10px; overflow: hidden;
  box-shadow: 0 24px 60px rgba(10, 35, 60, .4);
}
.pv-hd {
  flex: none; display: flex; align-items: center; justify-content: space-between;
  height: 52px; padding: 0 18px; border-bottom: 1px solid #ebeef5;
  font-size: 16px; font-weight: 700; color: #1f2d3d;
}
.pv-x {
  width: 28px; height: 28px; padding: 0; border: none; border-radius: 50%;
  background: transparent; color: #909399; font-size: 20px; line-height: 1; cursor: pointer;
}
.pv-x:hover { background: #f2f4f7; color: #017de4; }
.pv-bd { flex: 1; min-height: 0; padding: 0; background: #f5f7fa; }
.pv-frame { width: 100%; height: 100%; border: none; background: #fff; display: block; }

.pv-loading { height: 100%; display: flex; align-items: center; justify-content: center; color: #8a94a3; font-size: 13px; }
.pv-miss {
  height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 24px; text-align: center;
}
.pv-miss .t1 { font-size: 15px; font-weight: 700; color: #5b6b7b; }
.pv-miss .t2 { font-size: 12.5px; line-height: 2; color: #8296a8; }
.pv-miss code { padding: 1px 6px; border-radius: 3px; background: #eaf1f9; color: #1f6fb5; font-size: 12px; }
</style>
