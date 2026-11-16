<template>
  <div class="ol">
    <div class="ol-cond">
      <span class="lb">日期</span>
      <input v-model="q.start" type="date" />
      <span class="to">至</span>
      <input v-model="q.end" type="date" />
      <span class="lb">类型</span>
      <select v-model="q.type">
        <option value="">全部</option>
        <option v-for="t in ORDER_TYPES" :key="t" :value="t">{{ t }}</option>
      </select>
      <span class="lb">状态</span>
      <select v-model="q.status">
        <option value="">全部</option>
        <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
      </select>
      <span class="lb">中队</span>
      <select v-model="q.team">
        <option value="">全部</option>
        <option v-for="t in TEAMS" :key="t" :value="t">{{ t }}</option>
      </select>
      <input v-model="q.kw" class="kw" type="text" placeholder="工单号 / 测站" />
      <div class="ol-ops">
        <button class="btn-line" type="button" @click="openNew">+ 新建工单</button>
        <ExportButton @export="exportList" />
      </div>
    </div>

    <div class="io-stats">
      <div class="io-stat"><div class="st-l">本期工单</div><div class="st-v">{{ rows.length }}<span class="st-u">单</span></div></div>
      <div class="io-stat"><div class="st-l">待处理</div><div class="st-v">{{ nTodo }}<span class="st-u">单</span></div></div>
      <div class="io-stat"><div class="st-l">处理中</div><div class="st-v">{{ nDoing }}<span class="st-u">单</span></div></div>
      <div class="io-stat"><div class="st-l">完成率</div><div class="st-v">{{ rate }}<span class="st-u">%</span></div></div>
    </div>

    <div class="card ol-table">
      <div class="bd" style="padding: 0">
        <table class="dt">
          <thead>
            <tr>
              <th style="width: 60px">序号</th>
              <th style="width: 130px">工单号</th>
              <th style="width: 92px">类型</th>
              <th style="width: 170px">测站</th>
              <th style="width: 130px">所属中队</th>
              <th style="width: 80px">发布人</th>
              <th style="width: 150px">发布时间</th>
              <th style="width: 80px">办理人</th>
              <th style="width: 86px">状态</th>
              <th style="width: 80px">耗时(h)</th>
              <th style="width: 70px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(o, i) in pageRows" :key="o.id">
              <td class="muted">{{ (page - 1) * 12 + i + 1 }}</td>
              <td>{{ o.id }}</td>
              <td>{{ o.type }}</td>
              <td>{{ o.stName }}</td>
              <td>{{ o.team }}</td>
              <td>{{ o.publisher }}</td>
              <td class="num">{{ o.publish }}</td>
              <td>{{ o.assignee }}</td>
              <td><span class="st" :class="stKey(o.status)">{{ o.status }}</span></td>
              <td class="num">{{ o.hours }}</td>
              <td><a class="lnk" @click="openDetail(o)">详情</a></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="ol-page">
        <span class="pg-info">第 {{ page }} / {{ pages }} 页，共 {{ rows.length }} 单</span>
        <button class="pg" type="button" :disabled="page === 1" @click="page--">上一页</button>
        <button class="pg" type="button" :disabled="page === pages" @click="page++">下一页</button>
      </div>
    </div>

    <!-- 新建工单 -->
    <el-dialog v-model="nf.open" title="新建工单" width="560px" append-to-body>
      <div class="nf">
        <label><span>工单类型</span>
          <select v-model="nf.type">
            <option v-for="t in ORDER_TYPES" :key="t" :value="t">{{ t }}</option>
          </select>
        </label>
        <label><span>测站</span>
          <select v-model="nf.stCode">
            <option v-for="s in STATIONS" :key="s.code" :value="s.code">{{ s.nm }}（{{ s.code }}）</option>
          </select>
        </label>
        <label><span>所属中队</span>
          <select v-model="nf.team">
            <option v-for="t in TEAMS" :key="t" :value="t">{{ t }}</option>
          </select>
        </label>
        <label><span>办理人</span><input v-model="nf.assignee" type="text" /></label>
        <label><span>要求完成</span><input v-model="nf.due" type="date" /></label>
        <label class="full"><span>问题描述</span><textarea v-model="nf.desc" rows="3"></textarea></label>
      </div>
      <template #footer>
        <button class="btn-line" type="button" @click="nf.open = false">取消</button>
        <button class="btn-exp" type="button" @click="createOrder">提交</button>
      </template>
    </el-dialog>

    <!-- 工单详情 -->
    <el-drawer v-model="det.open" title="工单详情" size="420px" append-to-body>
      <template v-if="det.o">
        <div class="dd-hd">
          <b>{{ det.o.id }}</b>
          <span class="st" :class="stKey(det.o.status)">{{ det.o.status }}</span>
        </div>
        <table class="dd-tb">
          <tr><th>工单类型</th><td>{{ det.o.type }}</td></tr>
          <tr><th>测站</th><td>{{ det.o.stName }}（{{ det.o.stCode }}）</td></tr>
          <tr><th>所属中队</th><td>{{ det.o.team }}</td></tr>
          <tr><th>发布人</th><td>{{ det.o.publisher }}</td></tr>
          <tr><th>发布时间</th><td>{{ det.o.publish }}</td></tr>
          <tr><th>办理人</th><td>{{ det.o.assignee }}</td></tr>
          <tr><th>耗时</th><td>{{ det.o.hours }} 小时</td></tr>
          <tr><th>问题描述</th><td>{{ det.o.desc }}</td></tr>
        </table>

        <div class="dd-sec">办理流程</div>
        <div class="tl">
          <div v-for="(t, i) in timeline(det.o)" :key="i" class="tl-i" :class="{ done: t.done }">
            <span class="tl-dot"></span>
            <div class="tl-c">
              <b>{{ t.n }}</b>
              <small>{{ t.tm }}</small>
              <p>{{ t.d }}</p>
            </div>
          </div>
        </div>

        <div class="dd-sec">附件</div>
        <div class="dd-file">巡检照片.jpg　·　设备更换记录.pdf</div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ORDERS, ORDER_TYPES, TEAMS } from '@/data/workOrders'
import { STATIONS } from '@/data/stationNetwork'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'

const STATUSES = ['待派遣', '处理中', '待确认', '已完成', '已超期']
const PAGE = 12

const q = reactive({ start: '2026-01-01', end: '2026-11-14', type: '', status: '', team: '', kw: '' })
const all = ref([...ORDERS])

const rows = computed(() => all.value.filter((o) => {
  const d = o.publish.slice(0, 10)
  if (q.start && d < q.start) return false
  if (q.end && d > q.end) return false
  if (q.type && o.type !== q.type) return false
  if (q.status && o.status !== q.status) return false
  if (q.team && o.team !== q.team) return false
  if (q.kw && !(o.id.includes(q.kw) || o.stName.includes(q.kw) || o.stCode.includes(q.kw))) return false
  return true
}))

const nTodo = computed(() => rows.value.filter((o) => o.status === '待派遣' || o.status === '待确认').length)
const nDoing = computed(() => rows.value.filter((o) => o.status === '处理中' || o.status === '已超期').length)
const rate = computed(() => (rows.value.length ? ((rows.value.filter((o) => o.status === '已完成').length / rows.value.length) * 100).toFixed(1) : '0.0'))

const page = ref(1)
const pages = computed(() => Math.max(1, Math.ceil(rows.value.length / PAGE)))
const pageRows = computed(() => rows.value.slice((page.value - 1) * PAGE, page.value * PAGE))
watch(rows, () => { page.value = 1 })

const stKey = (s) => ({
  已完成: 'ok', 处理中: 'doing', 待派遣: 'todo', 待确认: 'todo', 已超期: 'late'
}[s] || '')

const nf = reactive({ open: false, type: '巡检', stCode: '', team: TEAMS[0], assignee: '', due: '2026-11-20', desc: '' })
function openNew() {
  nf.stCode = STATIONS[0].code
  nf.assignee = ''
  nf.desc = ''
  nf.open = true
}
function createOrder() {
  const st = STATIONS.find((s) => s.code === nf.stCode)
  if (!nf.assignee || !nf.desc) { ElMessage.warning('请填写办理人与问题描述'); return }
  const now = new Date()
  const p = (n) => String(n).padStart(2, '0')
  all.value.unshift({
    id: `GD2026${String(9000 + all.value.length).slice(-4)}`,
    type: nf.type,
    stName: st.nm,
    stCode: st.code,
    team: nf.team,
    publisher: '管理员',
    publish: `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}`,
    assignee: nf.assignee,
    status: '待派遣',
    hours: 0,
    desc: nf.desc,
    month: now.getMonth() + 1
  })
  nf.open = false
  ElMessage.success('工单已创建并进入派遣流程')
}

const det = reactive({ open: false, o: null })
function openDetail(o) { det.o = o; det.open = true }

function timeline(o) {
  const done = { 待派遣: 1, 处理中: 3, 待确认: 4, 已完成: 5, 已超期: 3 }[o.status] || 1
  const base = o.publish
  return [
    { n: '工单生成', tm: base, d: '系统按巡检计划生成工单', done: done >= 1 },
    { n: '工单派遣', tm: base, d: `派遣至${o.team}，办理人 ${o.assignee}`, done: done >= 2 },
    { n: '工单确认', tm: base, d: '办理人确认接单', done: done >= 3 },
    { n: '工单办理', tm: base, d: `现场处理，累计耗时 ${o.hours} 小时`, done: done >= 4 },
    { n: '任务反馈', tm: base, d: o.status === '已完成' ? '已反馈并归档' : '待反馈', done: done >= 5 }
  ]
}

function exportList() {
  const head = ['序号', '工单号', '类型', '测站', '所属中队', '发布人', '发布时间', '办理人', '状态', '耗时(h)']
  const lines = rows.value.map((o, i) => [i + 1, o.id, o.type, o.stName, o.team, o.publisher, o.publish, o.assignee, o.status, o.hours])
  downloadCsv('测站运维工单.csv', head, lines)
}
</script>

<style scoped>
.ol { display: flex; flex-direction: column; gap: 10px; }
.ol-cond { flex: none; background: #fff; border: 1px solid var(--bnd); border-radius: 4px; padding: 9px 12px; display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.ol-cond .lb { font-size: 12.5px; color: #7a8fa5; }
.ol-cond .to { font-size: 12px; color: #8a9aab; }
.ol-cond input, .ol-cond select { height: 28px; border: 1px solid #d6dfe9; border-radius: 3px; padding: 0 6px; font-size: 12.5px; outline: none; background: #fff; color: #303133; }
.ol-cond input[type="date"] { width: 128px; }
.ol-cond .kw { width: 150px; }
.ol-cond input:focus, .ol-cond select:focus { border-color: #017de4; }
.ol-ops { margin-left: auto; display: flex; gap: 8px; align-items: center; }
.btn-line { height: 30px; padding: 0 12px; border: 1px solid #017de4; border-radius: 3px; background: #fff; color: #017de4; font-size: 13px; cursor: pointer; }
.btn-line:hover { background: #f2f8ff; }

.ol-table { flex: 1; min-height: 0; }
.ol-table .bd { overflow: auto; }
.st { font-size: 11px; padding: 1px 6px; border-radius: 2px; white-space: nowrap; }
.st.ok { color: #26a869; background: #eef8f2; }
.st.doing { color: #017de4; background: #eef6fe; }
.st.todo { color: #8a94a3; background: #f4f5f7; }
.st.late { color: #f56c6c; background: #fef0f0; }
.lnk { color: #017de4; cursor: pointer; }
.lnk:hover { text-decoration: underline; }
.ol-page { flex: none; display: flex; align-items: center; justify-content: flex-end; gap: 5px; padding: 6px 10px; border-top: 1px solid #eef2f6; }
.pg-info { font-size: 12px; color: #8a9aab; margin-right: 8px; }
.pg { min-width: 28px; height: 26px; border: 1px solid #d6dfe9; background: #fff; border-radius: 3px; font-size: 12px; color: #5b6b7b; cursor: pointer; padding: 0 8px; }
.pg:hover:not(:disabled) { border-color: #017de4; color: #017de4; }
.pg:disabled { opacity: .45; cursor: default; }

.nf { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }
.nf label { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: #5b6b7b; }
.nf label.full { grid-column: 1 / -1; }
.nf select, .nf input, .nf textarea { border: 1px solid #d6dfe9; border-radius: 3px; padding: 6px 8px; font-size: 13px; outline: none; font-family: inherit; }
.nf select:focus, .nf input:focus, .nf textarea:focus { border-color: #017de4; }

.dd-hd { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.dd-hd b { font-size: 15px; color: #17324a; }
.dd-tb { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.dd-tb th, .dd-tb td { border: 1px solid #edf1f6; padding: 6px 9px; text-align: left; }
.dd-tb th { background: #fafcfe; color: #7a8fa5; font-weight: 400; width: 88px; white-space: nowrap; }
.dd-sec { font-size: 12.5px; font-weight: 700; color: #245c85; margin: 16px 0 9px; padding-left: 7px; border-left: 3px solid #017de4; }
.tl { padding-left: 4px; }
.tl-i { position: relative; padding: 0 0 16px 20px; border-left: 1px dashed #dbe6f1; }
.tl-i:last-child { border-left-color: transparent; padding-bottom: 0; }
.tl-dot { position: absolute; left: -4.5px; top: 2px; width: 9px; height: 9px; border-radius: 50%; background: #d6dfe9; }
.tl-i.done .tl-dot { background: #017de4; box-shadow: 0 0 0 3px rgba(1,125,228,.12); }
.tl-c b { font-size: 12.5px; color: #17324a; }
.tl-c small { margin-left: 8px; font-size: 11px; color: #93a4b5; }
.tl-c p { font-size: 11.5px; color: #8a9aab; margin-top: 2px; }
.dd-file { font-size: 12.5px; color: #017de4; }
</style>
