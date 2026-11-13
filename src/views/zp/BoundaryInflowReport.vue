<template>
  <div class="rm">
    <div class="rm-bar">
      <div class="l"><span class="ico">≋</span>边界来水监测月报</div>
      <div class="r">
        <span>年份</span>
        <select v-model="fYear">
          <option value="all">全部</option>
          <option v-for="y in years" :key="y" :value="y">{{ y }}年</option>
        </select>
        <span>月份</span>
        <select v-model="fMonth">
          <option value="all">全部</option>
          <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
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
              <th style="width:190px">期号</th>
              <th style="width:110px">统计月份</th>
              <th class="num" style="width:140px">来水总量(亿m³)</th>
              <th style="width:150px">主要来水口门</th>
              <th style="width:150px">生成时间</th>
              <th style="width:170px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in rows" :key="r.id">
              <td>{{ i + 1 }}</td>
              <td class="left">{{ r.name }}</td>
              <td>{{ r.issue }}</td>
              <td>{{ r.period }}</td>
              <td class="num bold">{{ Number(r.total).toFixed(2) }}</td>
              <td>{{ r.top }}</td>
              <td class="muted">{{ r.savedAt }}</td>
              <td>
                <span class="op" @click="preview(r)">预览</span>
                <span class="op" @click="download(r)">下载</span>
                <span class="op del" @click="remove(r)">删除</span>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="8" class="empty">暂无月报记录，点击右上角「＋ 添加」生成</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 预览：月报明细 -->
    <el-dialog v-model="pvVisible" title="月报预览" width="760px" append-to-body>
      <div v-if="pv" class="br-pv">
        <div class="br-pv-hd">
          <div class="t">{{ pv.name }}</div>
          <div class="s">{{ pv.issue }} · 生成于 {{ pv.savedAt }}</div>
        </div>

        <div class="br-sum">
          <div class="bs">
            <span>来水总量</span>
            <b>{{ Number(pv.total).toFixed(2) }}<i>亿m³</i></b>
          </div>
          <div class="bs">
            <span>日均来水</span>
            <b>{{ Number(pv.daily).toFixed(2) }}<i>亿m³</i></b>
          </div>
          <div class="bs">
            <span>来水口门</span>
            <b>{{ pv.stations.length }}<i>处</i></b>
          </div>
        </div>

        <table class="dt br-tb">
          <thead>
            <tr>
              <th style="width:56px">序号</th>
              <th>来水口门</th>
              <th style="width:120px">所属边界</th>
              <th class="num" style="width:150px">月来水量(亿m³)</th>
              <th style="width:200px">占比</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, i) in pv.stations" :key="s.name">
              <td class="muted">{{ i + 1 }}</td>
              <td class="left">{{ s.name }}</td>
              <td class="muted">{{ s.group }}</td>
              <td class="num bold">{{ Number(s.inn).toFixed(2) }}</td>
              <td>
                <div class="br-share">
                  <i :style="{ width: share(s.inn) + '%' }"></i>
                  <span>{{ share(s.inn).toFixed(1) }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="tot">
              <td colspan="3">合计</td>
              <td class="num">{{ Number(pv.total).toFixed(2) }}</td>
              <td>100.0%</td>
            </tr>
          </tfoot>
        </table>

        <p class="br-note">
          注：来水量为各口门逐日入上海水量累计，统计期为 {{ pv.period }}（{{ pv.days }} 天）；数据来源为出入境水资源量计算结果。
        </p>
      </div>
      <template #footer>
        <button class="btn-plain" @click="pvVisible = false">关闭</button>
        <button class="btn-dl" @click="download(pv)">⬇ 下载报表</button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'
import { boundaryReports, removeBoundaryReport } from '@/store/boundaryReport'

const router = useRouter()

/** 添加：跳到月报生成页 */
function addReport() { router.push('/zp/brgen') }

const fYear = ref('all')
const fMonth = ref('all')

const years = computed(() => [...new Set(boundaryReports.value.map((r) => r.year))].sort((a, b) => b - a))
const rows = computed(() =>
  boundaryReports.value.filter(
    (r) => (fYear.value === 'all' || r.year === fYear.value) && (fMonth.value === 'all' || r.month === fMonth.value)
  )
)

/* ---------- 预览 / 下载 / 删除 ---------- */
const pvVisible = ref(false)
const pv = ref(null)

function preview(r) {
  pv.value = r
  pvVisible.value = true
}

function share(v) {
  if (!pv.value || !pv.value.total) return 0
  return (Number(v) / Number(pv.value.total)) * 100
}

function download(r) {
  if (!r) return
  const head = ['序号', '来水口门', '所属边界', '月来水量(亿m³)']
  const lines = r.stations.map((s, i) => [i + 1, s.name, s.group, Number(s.inn).toFixed(2)])
  lines.push(['', '合计', '', Number(r.total).toFixed(2)])
  downloadCsv(`边界来水监测月报-${r.period}.csv`, head, lines)
}

function exportCsv() {
  const head = ['序号', '报告名称', '期号', '统计月份', '来水总量(亿m³)', '主要来水口门', '生成时间']
  const lines = rows.value.map((r, i) => [
    i + 1, r.name, r.issue, r.period, Number(r.total).toFixed(2), r.top, r.savedAt
  ])
  downloadCsv('边界来水监测月报记录.csv', head, lines)
}

function remove(r) {
  ElMessageBox.confirm(`确定删除「${r.period}」边界来水监测月报吗？`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'info'
  })
    .then(() => {
      removeBoundaryReport(r.id)
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
table.dt .left { text-align: left; padding-left: 14px; }
table.dt .bold { font-weight: 700; font-variant-numeric: tabular-nums; }

/* 预览 */
.br-pv-hd { border-bottom: 1px solid #ebeef5; padding-bottom: 12px; }
.br-pv-hd .t { font-size: 16px; font-weight: 700; color: #14497e; text-align: center; }
.br-pv-hd .s { margin-top: 5px; font-size: 12px; color: #8a94a3; text-align: center; }

.br-sum { display: flex; gap: 10px; margin: 14px 0 4px; }
.br-sum .bs {
  flex: 1; padding: 10px 14px; border: 1px solid #dde8f7; border-radius: 6px;
  background: linear-gradient(180deg, #f5f9ff 0%, #eaf2fd 100%);
}
.br-sum .bs > span { display: block; font-size: 12.5px; color: #7f8a99; }
.br-sum .bs > b {
  display: block; margin-top: 2px; font-size: 22px; line-height: 1.3;
  color: #1a7ae0; font-variant-numeric: tabular-nums;
}
.br-sum .bs > b i { font-size: 12px; font-weight: 400; font-style: normal; margin-left: 3px; opacity: .8; }

.br-tb { margin-top: 10px; }
.br-tb th { height: 36px; }
.br-tb td { height: 36px; }
.br-tb tfoot td { background: #f0f7ff; font-weight: 700; color: var(--nav); }
.br-share { display: flex; align-items: center; justify-content: center; gap: 6px; }
.br-share > i { display: block; flex: none; height: 6px; max-width: 110px; background: #017de4; border-radius: 3px; }
.br-share > span { font-size: 11.5px; color: var(--txt3); font-variant-numeric: tabular-nums; min-width: 38px; text-align: right; }

.br-note { margin-top: 12px; font-size: 12px; color: #8a94a3; line-height: 1.8; }
</style>
