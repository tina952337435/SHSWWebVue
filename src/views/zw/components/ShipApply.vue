<template>
  <div class="ap">
    <div class="ap-cond">
      <span class="lb">日期</span>
      <input v-model="q.start" type="date" />
      <span class="to">至</span>
      <input v-model="q.end" type="date" />
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
      <input v-model="q.kw" class="kw" type="text" placeholder="申请单号 / 申请人" />
      <div class="ap-ops">
        <button class="btn-line" type="button" @click="openNew">+ 新建用船申请</button>
        <ExportButton @export="exportList" />
      </div>
    </div>

    <div class="io-stats">
      <div class="io-stat"><div class="st-l">申请总数</div><div class="st-v">{{ rows.length }}<span class="st-u">单</span></div></div>
      <div class="io-stat"><div class="st-l">待审批</div><div class="st-v">{{ nWait }}<span class="st-u">单</span></div></div>
      <div class="io-stat"><div class="st-l">已出航 / 已完成</div><div class="st-v">{{ nSail }}<span class="st-u">单</span></div></div>
      <div class="io-stat"><div class="st-l">累计航行时长</div><div class="st-v">{{ totalHours }}<span class="st-u">小时</span></div></div>
    </div>

    <div class="card ap-table">
      <div class="bd" style="padding: 0">
        <table class="dt">
          <thead>
            <tr>
              <th style="width: 56px">序号</th>
              <th style="width: 108px">申请单号</th>
              <th style="width: 76px">申请人</th>
              <th style="width: 130px">所属中队</th>
              <th style="width: 90px">船舶</th>
              <th style="width: 160px">用船事由</th>
              <th style="width: 140px">出航时间</th>
              <th style="width: 140px">返航时间</th>
              <th style="width: 150px">航线</th>
              <th style="width: 64px">人数</th>
              <th style="width: 86px">状态</th>
              <th style="width: 96px">审批人</th>
              <th style="width: 88px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(a, i) in pageRows" :key="a.id">
              <td class="muted">{{ (page - 1) * 12 + i + 1 }}</td>
              <td>{{ a.id }}</td>
              <td>{{ a.applicant }}</td>
              <td>{{ a.team }}</td>
              <td>{{ a.ship }}</td>
              <td>{{ a.reason }}</td>
              <td class="num">{{ a.start }}</td>
              <td class="num">{{ a.end }}</td>
              <td>{{ a.route }}</td>
              <td class="num">{{ a.crew }}</td>
              <td><span class="st" :class="stKey(a.status)">{{ a.status }}</span></td>
              <td>{{ a.approver }}</td>
              <td>
                <template v-if="a.status === '待审批'">
                  <a class="lnk" @click="review(a, true)">通过</a>
                  <a class="lnk rej" @click="review(a, false)">驳回</a>
                </template>
                <span v-else class="muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="ap-page">
        <span class="pg-info">第 {{ page }} / {{ pages }} 页，共 {{ rows.length }} 单</span>
        <button class="pg" type="button" :disabled="page === 1" @click="page--">上一页</button>
        <button class="pg" type="button" :disabled="page === pages" @click="page++">下一页</button>
      </div>
    </div>

    <el-dialog v-model="nf.open" title="新建用船申请" width="600px" append-to-body>
      <div class="nf">
        <label><span>申请人</span><input v-model="nf.applicant" type="text" /></label>
        <label><span>所属中队</span>
          <select v-model="nf.team">
            <option v-for="t in TEAMS" :key="t" :value="t">{{ t }}</option>
          </select>
        </label>
        <label><span>船舶</span>
          <select v-model="nf.ship">
            <option v-for="s in SHIPS" :key="s.id" :value="s.id">{{ s.id }}（{{ s.team }}）</option>
          </select>
        </label>
        <label><span>随船人数</span><input v-model.number="nf.crew" type="number" min="1" max="8" /></label>
        <label><span>出航时间</span><input v-model="nf.start" type="datetime-local" /></label>
        <label><span>返航时间</span><input v-model="nf.end" type="datetime-local" /></label>
        <label class="full"><span>用船事由</span>
          <select v-model="nf.reason">
            <option v-for="r in REASONS" :key="r" :value="r">{{ r }}</option>
          </select>
        </label>
        <label class="full"><span>航线</span>
          <select v-model="nf.route">
            <option v-for="r in ROUTES" :key="r" :value="r">{{ r }}</option>
          </select>
        </label>
        <label class="full"><span>审批领导</span>
          <select v-model="nf.approver">
            <option>分管副主任</option>
            <option>总站站长</option>
          </select>
        </label>
      </div>
      <template #footer>
        <button class="btn-line" type="button" @click="nf.open = false">取消</button>
        <button class="btn-exp" type="button" @click="create">提交申请</button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { SHIPS } from '@/data/ships'
import { useShipApply } from '@/store/shipApply'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'

const { list, addApplication, reviewApplication } = useShipApply()

const STATUSES = ['待审批', '已审批', '已出航', '已完成', '已驳回']
const TEAMS = Array.from(new Set(SHIPS.map((s) => s.team)))
const REASONS = ['常规断面流量测验', '水质采样', '应急监测', '设备巡检维护', '水文调查', '省市边界同步监测']
const ROUTES = ['松浦大桥—米市渡', '苏州河黄渡—北新泾', '吴淞口—高桥', '淀山湖—金泽', '长江口南支—堡镇']

const q = reactive({ start: '2026-01-01', end: '2026-12-31', status: '', team: '', kw: '' })

const rows = computed(() => list.value.filter((a) => {
  const d = a.start.slice(0, 10)
  if (q.start && d < q.start) return false
  if (q.end && d > q.end) return false
  if (q.status && a.status !== q.status) return false
  if (q.team && a.team !== q.team) return false
  if (q.kw && !(a.id.includes(q.kw) || a.applicant.includes(q.kw))) return false
  return true
}))

const nWait = computed(() => list.value.filter((a) => a.status === '待审批').length)
const nSail = computed(() => list.value.filter((a) => a.status === '已出航' || a.status === '已完成').length)
const totalHours = computed(() => list.value.reduce((a, b) => a + b.hours, 0))

const page = ref(1)
const pages = computed(() => Math.max(1, Math.ceil(rows.value.length / 12)))
const pageRows = computed(() => rows.value.slice((page.value - 1) * 12, page.value * 12))
watch(rows, () => { page.value = 1 })

const stKey = (s) => ({
  待审批: 'wait', 已审批: 'ok', 已出航: 'sail', 已完成: 'done', 已驳回: 'rej'
}[s] || '')

function review(a, passed) {
  reviewApplication(a.id, passed)
  ElMessage.success(passed ? '已通过审批，可安排出航' : '已驳回申请')
}

const nf = reactive({
  open: false, applicant: '', team: TEAMS[0], ship: SHIPS[0].id, crew: 3,
  start: '2026-11-20T08:30', end: '2026-11-20T16:30', reason: REASONS[0], route: ROUTES[0], approver: '分管副主任'
})
function openNew() {
  nf.applicant = ''
  nf.open = true
}
function create() {
  if (!nf.applicant) { ElMessage.warning('请填写申请人'); return }
  const h1 = Date.parse(nf.start)
  const h2 = Date.parse(nf.end)
  if (!(h2 > h1)) { ElMessage.warning('返航时间须晚于出航时间'); return }
  addApplication({
    applicant: nf.applicant,
    team: nf.team,
    ship: nf.ship,
    crew: nf.crew,
    start: nf.start.replace('T', ' '),
    end: nf.end.replace('T', ' '),
    reason: nf.reason,
    route: nf.route,
    approver: nf.approver,
    hours: Math.round(((h2 - h1) / 3600000) * 10) / 10
  })
  nf.open = false
  ElMessage.success('申请已提交，等待审批')
}

function exportList() {
  const head = ['申请单号', '申请人', '所属中队', '船舶', '用船事由', '出航时间', '返航时间', '航线', '人数', '状态', '审批人']
  const lines = rows.value.map((a) => [a.id, a.applicant, a.team, a.ship, a.reason, a.start, a.end, a.route, a.crew, a.status, a.approver])
  downloadCsv('用船申请.csv', head, lines)
}
</script>

<style scoped>
.ap { display: flex; flex-direction: column; gap: 10px; }
.ap-cond { flex: none; background: #fff; border: 1px solid var(--bnd); border-radius: 4px; padding: 9px 12px; display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.ap-cond .lb { font-size: 12.5px; color: #7a8fa5; }
.ap-cond .to { font-size: 12px; color: #8a9aab; }
.ap-cond input, .ap-cond select { height: 28px; border: 1px solid #d6dfe9; border-radius: 3px; padding: 0 6px; font-size: 12.5px; outline: none; background: #fff; }
.ap-cond input[type="date"] { width: 128px; }
.ap-cond .kw { width: 160px; }
.ap-ops { margin-left: auto; display: flex; gap: 8px; align-items: center; }
.btn-line { height: 30px; padding: 0 12px; border: 1px solid #017de4; border-radius: 3px; background: #fff; color: #017de4; font-size: 13px; cursor: pointer; }
.btn-line:hover { background: #f2f8ff; }
.ap-table { flex: 1; min-height: 0; }
.ap-table .bd { overflow: auto; }
.st { font-size: 11px; padding: 1px 6px; border-radius: 2px; white-space: nowrap; }
.st.wait { color: #b8860b; background: #fdf8e8; }
.st.ok { color: #017de4; background: #eef6fe; }
.st.sail { color: #26a869; background: #eef8f2; }
.st.done { color: #26a869; background: #eef8f2; }
.st.rej { color: #8a94a3; background: #f4f5f7; }
.lnk { color: #017de4; cursor: pointer; margin: 0 3px; }
.lnk.rej { color: #f56c6c; }
.lnk:hover { text-decoration: underline; }
.muted { color: #a8b3bd; }
.ap-page { flex: none; display: flex; align-items: center; justify-content: flex-end; gap: 5px; padding: 6px 10px; border-top: 1px solid #eef2f6; }
.pg-info { font-size: 12px; color: #8a9aab; margin-right: 8px; }
.pg { min-width: 28px; height: 26px; border: 1px solid #d6dfe9; background: #fff; border-radius: 3px; font-size: 12px; color: #5b6b7b; cursor: pointer; padding: 0 8px; }
.pg:hover:not(:disabled) { border-color: #017de4; color: #017de4; }
.pg:disabled { opacity: .45; cursor: default; }

.nf { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }
.nf label { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: #5b6b7b; }
.nf label.full { grid-column: 1 / -1; }
.nf input, .nf select { border: 1px solid #d6dfe9; border-radius: 3px; padding: 6px 8px; font-size: 13px; outline: none; }
.nf input:focus, .nf select:focus { border-color: #017de4; }
</style>
