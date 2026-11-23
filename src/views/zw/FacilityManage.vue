<template>
  <div class="fm">
    <!-- 条件栏 -->
    <div class="fm-cond">
      <div class="fc-row">
        <label class="fc-item">
          <span class="fc-lb">关键字</span>
          <input v-model="q.kw" type="text" placeholder="设备名称 / 设备编码 / 测站" />
        </label>
        <label class="fc-item">
          <span class="fc-lb">行政区</span>
          <select v-model="q.dist">
            <option value="">全部</option>
            <option v-for="d in DISTRICTS" :key="d" :value="d">{{ d }}</option>
          </select>
        </label>
        <div class="fc-ops">
          <button class="btn-line" type="button" @click="resetQ">重置</button>
          <ExportButton @export="exportList" />
        </div>
      </div>

      <div class="fc-row chips-row">
        <span class="fc-lb wide">设备类型</span>
        <div class="chips">
          <span class="chip" :class="{ on: !q.type }" @click="q.type = ''">全部</span>
          <span v-for="t in DEVICE_TYPES" :key="t.k" class="chip" :class="{ on: q.type === t.k }" @click="q.type = t.k">{{ t.n }}</span>
        </div>
      </div>

      <div class="fc-row chips-row">
        <span class="fc-lb wide">设备状态</span>
        <div class="chips">
          <span class="chip" :class="{ on: !q.status }" @click="q.status = ''">全部</span>
          <span v-for="s in DEVICE_STATUS" :key="s" class="chip" :class="{ on: q.status === s }" @click="q.status = s">{{ s }}</span>
        </div>
      </div>
    </div>

    <!-- 统计卡 -->
    <div class="io-stats">
      <div class="io-stat"><div class="st-l">设备总数</div><div class="st-v">{{ stats.total }}<span class="st-u">台</span></div></div>
      <div class="io-stat"><div class="st-l">正常运行</div><div class="st-v">{{ stats.normal }}<span class="st-u">台</span></div></div>
      <div class="io-stat"><div class="st-l">待更换</div><div class="st-v c-orange">{{ stats.pending }}<span class="st-u">台</span></div></div>
      <div class="io-stat"><div class="st-l">已报废</div><div class="st-v">{{ stats.scrap }}<span class="st-u">台</span></div></div>
    </div>

    <!-- 图表 + 表格 -->
    <div class="fm-main">
      <div class="card fm-chart">
        <div class="hd">设备类型构成<span class="tag">按设备类型统计（{{ DEVICE_TYPES.length }} 类）</span></div>
        <div class="bd"><BarChart :option="typeOpt" :height="230" /></div>
      </div>

      <div class="card fm-table">
        <div class="bd" style="padding: 0">
          <table class="dt">
            <thead>
              <tr>
                <th style="width: 56px">序号</th>
                <th style="width: 150px">设备编码</th>
                <th style="width: 120px">设备名称</th>
                <th style="width: 110px">型号</th>
                <th style="width: 170px">所属测站</th>
                <th style="width: 100px">安装日期</th>
                <th style="width: 100px">上次更换</th>
                <th style="width: 96px">检定到期</th>
                <th style="width: 80px">状态</th>
                <th style="width: 90px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in pageRows" :key="d.devCode">
                <td class="muted">{{ (page - 1) * PAGE + i + 1 }}</td>
                <td>{{ d.devCode }}</td>
                <td><b>{{ d.name }}</b></td>
                <td>{{ d.model }}</td>
                <td>{{ d.stnm }}</td>
                <td class="num">{{ d.install || '—' }}</td>
                <td class="num">{{ d.replace || '—' }}</td>
                <td class="num" :class="{ warn: d.calib && d.calib < TODAY && d.status !== '报废' }">{{ d.calib || '—' }}</td>
                <td><span class="st" :class="stKey(d.status)">{{ d.status }}</span></td>
                <td><a class="lnk" @click="openDetail(d)">详情</a></td>
              </tr>
              <tr v-if="!pageRows.length">
                <td colspan="10" class="empty">没有符合条件的设备</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="fm-page">
          <span class="pg-info">第 {{ page }} / {{ pages }} 页，共 {{ rows.length }} 台</span>
          <button class="pg" type="button" :disabled="page === 1" @click="page--">上一页</button>
          <button class="pg" type="button" :disabled="page === pages" @click="page++">下一页</button>
        </div>
      </div>
    </div>

    <!-- 设备详情 -->
    <el-drawer v-model="det.open" title="设备详情" size="420px" append-to-body>
      <template v-if="det.d">
        <div class="dd-hd">
          <b>{{ det.d.name }}</b>
          <span class="st" :class="stKey(det.d.status)">{{ det.d.status }}</span>
        </div>
        <table class="dd-tb">
          <tr><th>设备编码</th><td>{{ det.d.devCode }}</td></tr>
          <tr><th>设备型号</th><td>{{ det.d.model }}</td></tr>
          <tr><th>制造商</th><td>{{ det.d.maker }}</td></tr>
          <tr><th>所属测站</th><td>{{ det.d.stnm }}（{{ det.d.stcd }}）</td></tr>
          <tr><th>行政区</th><td>{{ det.d.dist }} · {{ det.d.slp }}</td></tr>
          <tr><th>管理单位</th><td>{{ det.d.unit }}</td></tr>
          <tr><th>安装日期</th><td>{{ det.d.install }}</td></tr>
          <tr><th>上次更换</th><td>{{ det.d.replace || '—' }}</td></tr>
          <tr><th>检定/校准</th><td>{{ det.d.calib || '—' }}</td></tr>
          <tr><th>使用年限</th><td>{{ det.d.age }} 年</td></tr>
        </table>

        <div class="dd-sec">更换记录</div>
        <div v-if="hist.length" class="dd-hist">
          <div v-for="h in hist" :key="h.id" class="dh-item">
            <span class="dh-date">{{ h.date }}</span>
            <span class="dh-reason">{{ h.reason }}</span>
            <span class="dh-by">{{ h.by }}</span>
          </div>
        </div>
        <div v-else class="dd-empty">暂无更换记录</div>

        <div class="dd-note">设备更换信息由运维系统自动同步，与工单系统联动。</div>
      </template>
      <template #footer>
        <button
          v-if="det.d && (det.d.status === '待更换' || det.d.status === '维护中')"
          class="btn-exp"
          type="button"
          @click="createOrder(det.d)"
        >生成更换工单</button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DEVICES, DEVICE_TYPES, DEVICE_STATUS, replaceHistory } from '@/data/devices'
import { DISTRICTS } from '@/data/stationNetwork'
import BarChart from '@/components/BarChart.vue'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'

const PAGE = 14
const TODAY = '2026-11-19'

const q = reactive({ kw: '', dist: '', type: '', status: '' })
function resetQ() { Object.assign(q, { kw: '', dist: '', type: '', status: '' }); page.value = 1 }

const rows = computed(() => DEVICES.filter((d) => {
  if (q.kw) {
    const k = q.kw.trim()
    if (!(d.name.includes(k) || d.devCode.includes(k) || d.stnm.includes(k))) return false
  }
  if (q.dist && d.dist !== q.dist) return false
  if (q.type && d.type !== q.type) return false
  if (q.status && d.status !== q.status) return false
  return true
}))

const stats = computed(() => ({
  total: rows.value.length,
  normal: rows.value.filter((d) => d.status === '正常').length,
  pending: rows.value.filter((d) => d.status === '待更换').length,
  scrap: rows.value.filter((d) => d.status === '报废').length
}))

const page = ref(1)
const pages = computed(() => Math.max(1, Math.ceil(rows.value.length / PAGE)))
const pageRows = computed(() => rows.value.slice((page.value - 1) * PAGE, page.value * PAGE))
watch(q, () => { page.value = 1 })

const stKey = (s) => ({ 正常: 'ok', 待更换: 'warn', 维护中: 'doing', 报废: 'off' }[s] || '')

const typeOpt = computed(() => {
  const m = {}
  for (const d of rows.value) m[d.typeName] = (m[d.typeName] || 0) + 1
  const data = DEVICE_TYPES.map((t) => ({ name: t.n, value: m[t.n] || 0 }))
  const total = data.reduce((a, b) => a + b.value, 0)
  const map = Object.fromEntries(data.map((x) => [x.name, x.value]))
  return {
    title: { text: String(total), subtext: '台', left: '36%', top: '40%', textAlign: 'center', textStyle: { fontSize: 22, fontWeight: 700, color: '#17324a' }, subtextStyle: { fontSize: 11, color: '#8a9aab' } },
    tooltip: { trigger: 'item', formatter: '{b}：{c} 台（{d}%）' },
    legend: { type: 'scroll', orient: 'vertical', right: 10, top: 'middle', itemWidth: 9, itemHeight: 9, itemGap: 10, textStyle: { fontSize: 11.5, color: '#5b6b7b' }, formatter: (n) => `${n}(${map[n] || 0})` },
    series: [{
      type: 'pie',
      radius: ['46%', '70%'],
      center: ['36%', '50%'],
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: data.map((x, i) => ({ ...x, itemStyle: { color: ['#017de4', '#16b8b0', '#26a869', '#7b8cff'][i % 4] } }))
    }]
  }
})

/* 详情 */
const det = reactive({ open: false, d: null })
const hist = ref([])
function openDetail(d) {
  det.d = d
  hist.value = replaceHistory(d.devCode)
  det.open = true
}

async function createOrder(d) {
  try {
    await ElMessageBox.confirm(`确认为「${d.stnm}」的「${d.name}」生成设备更换工单？`, '生成工单', { type: 'info', confirmButtonText: '生成', cancelButtonText: '取消' })
  } catch (e) { return }
  ElMessage.success(`已生成设备更换工单 GD2026${String(9000 + hashNum(d.devCode)).slice(-4)}，可在工单系统查看`)
  d.status = '维护中'
}

function hashNum(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

function exportList() {
  const head = ['序号', '设备编码', '设备名称', '型号', '制造商', '所属测站', '行政区', '安装日期', '上次更换', '检定到期', '状态']
  const lines = rows.value.map((d, i) => [i + 1, d.devCode, d.name, d.model, d.maker, d.stnm, d.dist, d.install || '', d.replace || '', d.calib || '', d.status])
  downloadCsv('设施设备台账.csv', head, lines)
}
</script>

<style scoped>
.fm { height: 100%; padding: 10px; display: flex; flex-direction: column; gap: 10px; overflow: hidden; }

.fm-cond { flex: none; background: #fff; border: 1px solid var(--bnd); border-radius: 4px; padding: 9px 12px 7px; }
.fc-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.fc-row + .fc-row { margin-top: 7px; padding-top: 7px; border-top: 1px dashed #eef2f6; }
.fc-item { display: flex; align-items: center; gap: 6px; }
.fc-lb { font-size: 12.5px; color: #7a8fa5; }
.fc-lb.wide { width: 62px; flex: none; font-weight: 700; color: #35506a; }
.fc-item input, .fc-item select { height: 28px; border: 1px solid #d6dfe9; border-radius: 3px; padding: 0 8px; font-size: 12.5px; outline: none; background: #fff; color: #303133; }
.fc-item input { width: 220px; }
.fc-item select { width: 130px; }
.fc-item input:focus, .fc-item select:focus { border-color: #017de4; }
.fc-ops { margin-left: auto; display: flex; gap: 8px; align-items: center; }
.btn-line { height: 29px; padding: 0 13px; border: 1px solid #d6dfe9; border-radius: 3px; background: #fff; color: #4a5a6a; font-size: 12.5px; cursor: pointer; }
.btn-line:hover { border-color: #017de4; color: #017de4; }

.chips-row { align-items: flex-start; flex-wrap: nowrap; }
.chips { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; gap: 5px; }
.chip { font-size: 12.5px; line-height: 24px; padding: 0 12px; border: 1px solid #dbe4ee; border-radius: 3px; color: #4a5a6a; cursor: pointer; background: #fff; white-space: nowrap; }
.chip:hover { border-color: #7bb8ee; color: #017de4; }
.chip.on { background: #017de4; border-color: #017de4; color: #fff; }

.io-stat .c-orange { color: #e6a23c; }

.fm-main { flex: 1; min-height: 0; display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 10px; }
.fm-chart .bd { padding: 2px 6px 0; }
.fm-table { min-height: 0; }
.fm-table .bd { overflow: auto; }
.fm-table .nm { text-align: left; }
.st { font-size: 11px; padding: 1px 7px; border-radius: 2px; white-space: nowrap; }
.st.ok { color: #26a869; background: #eef8f2; }
.st.warn { color: #b8860b; background: #fdf8e8; }
.st.doing { color: #017de4; background: #eef6fe; }
.st.off { color: #8a94a3; background: #f4f5f7; }
.lnk { color: #017de4; cursor: pointer; font-size: 12.5px; }
.lnk:hover { text-decoration: underline; }
.num.warn { color: #b8860b; font-weight: 700; }
.empty { color: #93a4b5; padding: 26px 0 !important; }

.fm-page { flex: none; display: flex; align-items: center; justify-content: flex-end; gap: 5px; padding: 6px 10px; border-top: 1px solid #eef2f6; }
.pg-info { font-size: 12px; color: #8a9aab; margin-right: 8px; }
.pg { min-width: 28px; height: 26px; border: 1px solid #d6dfe9; background: #fff; border-radius: 3px; font-size: 12px; color: #5b6b7b; cursor: pointer; padding: 0 8px; }
.pg:hover:not(:disabled) { border-color: #017de4; color: #017de4; }
.pg:disabled { opacity: .45; cursor: default; }

.dd-hd { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.dd-hd b { font-size: 15px; color: #17324a; }
.dd-tb { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.dd-tb th, .dd-tb td { border: 1px solid #edf1f6; padding: 6px 9px; text-align: left; }
.dd-tb th { background: #fafcfe; color: #7a8fa5; font-weight: 400; width: 88px; white-space: nowrap; }
.dd-sec { font-size: 12.5px; font-weight: 700; color: #245c85; margin: 16px 0 9px; padding-left: 7px; border-left: 3px solid #017de4; }
.dd-hist { display: flex; flex-direction: column; }
.dh-item { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px dashed #eef2f6; font-size: 12.5px; }
.dh-date { width: 82px; flex: none; color: #017de4; font-weight: 600; }
.dh-reason { flex: 1; color: #35506a; }
.dh-by { color: #93a4b5; }
.dd-empty { color: #93a4b5; font-size: 12.5px; padding: 10px 0; }
.dd-note { margin-top: 16px; font-size: 11.5px; color: #93a4b5; background: #f7fafd; border: 1px solid #e6eef7; border-radius: 3px; padding: 7px 10px; }
</style>
