<template>
  <div class="ew">
    <!-- 顶部操作条 -->
    <div class="cf-bar">
      <div class="cf-brand">
        <div class="cf-ic"><el-icon><EditPen /></el-icon></div>
        <div class="cf-tt">
          <div class="t1">质控数据</div>
          <div class="t2">上海市重点河道 · 9 个控制断面 · 分区填报确认</div>
        </div>
      </div>

      <div class="cf-ops">
        <div class="cf-date">
          <label for="cf-date">时间</label>
          <input id="cf-date" v-model="date" type="date" :max="today" @change="loadDate" />
        </div>
        <div class="cf-date">
          <label>当前区县</label>
          <select v-model="curDistrict" class="cf-dist">
            <option v-for="d in SH_DISTRICTS" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <button class="cf-submit" type="button" @click="submitOwn">
          <span class="ck">✓</span>提交确认
        </button>
        <button class="cf-audit" type="button" :disabled="!pendingCount" @click="archiveAll">
          <span class="ck">✓</span>一键归档
        </button>
      </div>
    </div>

    <div class="ew-body cf-body">
      <div class="card cf-card">
        <div class="hd">
          断面水位质控
          <span class="tag">共 {{ rows.length }} 个断面</span>
        </div>
        <div class="bd">
          <table class="dt cf-table">
            <thead>
              <tr>
                <th style="width:58px">序号</th>
                <th>断面</th>
                <th class="num" style="width:140px">日均水位 (m)</th>
                <th class="num" style="width:140px">最低水位 (m)</th>
                <th style="width:110px">状态</th>
                <th style="width:150px">提交时间</th>
                <th style="width:150px">归档时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in rows" :key="r.section" :class="{ locked: !editable(r) }">
                <td class="idx">{{ i + 1 }}</td>
                <td class="sec">
                  <span class="nm">{{ r.section }}</span>
                  <span class="dist">{{ r.river }}</span>
                </td>
                <td class="num">
                  <span class="cf-ed">
                    <input v-model="r.avg" type="text" inputmode="decimal" class="cf-in" :disabled="!editable(r)" @blur="fix2(r, 'avg')" />
                    <i>m</i>
                  </span>
                </td>
                <td class="num">
                  <span class="cf-ed">
                    <input v-model="r.min" type="text" inputmode="decimal" class="cf-in" :disabled="!editable(r)" @blur="fix2(r, 'min')" />
                    <i>m</i>
                  </span>
                </td>
                <td>
                  <span class="cf-status" :class="r.status">
                    <i class="dot"></i>{{ statusText(r) }}
                  </span>
                </td>
                <td class="num tm">{{ r.time || '—' }}</td>
                <td class="num tm">{{ r.auditTime || '—' }}</td>
              </tr>
              <tr v-if="!rows.length">
                <td colspan="7" class="empty">请选择时间</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="cf-legend">
        <span><i class="dot draft"></i>待确认</span>
        <span><i class="dot submitted"></i>待归档</span>
        <span><i class="dot approved"></i>已归档</span>
        <span class="src">各区仅可填报本区断面，其余断面只读</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { EditPen } from '@element-plus/icons-vue'
import { ECO_SECTIONS } from '@/data/ecoFlow'
import { dayStats, parseDate } from '@/data/ecoWarn'
import { confirmOf, submitConfirm, approveConfirm } from '@/store/ecoConfirm'

// 9 个上海市重点河道断面，river 即所属区县
const SH_SECTIONS = ECO_SECTIONS.filter((s) => !s.national)
const SH_DISTRICTS = SH_SECTIONS.map((s) => s.river)

const STATUS_TEXT = { draft: '待确认', submitted: '待归档', approved: '已归档' }

const route = useRoute()

function pad(n) { return String(n).padStart(2, '0') }
function dateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return dateStr(d)
}

const today = dateStr(new Date())
const date = ref(yesterdayStr())
const curDistrict = ref(SH_DISTRICTS[0])
const rows = ref([])

/** 统一保留 2 位小数 */
function d2(v) { return Number(v).toFixed(2) }

/** 失焦时把输入值规整为 2 位小数 */
function fix2(r, k) {
  const v = parseFloat(r[k])
  r[k] = Number.isFinite(v) ? d2(v) : ''
}

function loadDate() {
  const d = parseDate(date.value)
  if (!d) { rows.value = []; return }
  rows.value = SH_SECTIONS.map((s, i) => {
    const st = dayStats(i, d.y, d.m, d.d)
    const conf = confirmOf(s.name, date.value)
    return {
      section: s.name,
      river: s.river,
      avg: d2(conf ? conf.avg : st.avg),
      min: d2(conf ? conf.min : st.min),
      status: conf ? conf.status || 'submitted' : 'draft',
      time: conf ? conf.time : '',
      auditTime: conf ? conf.auditTime || '' : ''
    }
  })
}

/** 权限：仅本区、且未归档的断面可编辑 */
function editable(r) {
  return r.river === curDistrict.value && r.status !== 'approved'
}

function statusText(r) { return STATUS_TEXT[r.status] }

/** 提交：只提交本区断面 */
function submitOwn() {
  if (!rows.value.length) return
  const r = rows.value.find((x) => x.river === curDistrict.value)
  if (!r) { ElMessage.warning({ message: '请选择区县', offset: 78 }); return }
  if (r.status === 'approved') {
    ElMessage.warning({ message: '本区断面已归档，不能修改', offset: 78 })
    return
  }
  if (!Number.isFinite(parseFloat(r.avg)) || !Number.isFinite(parseFloat(r.min))) {
    ElMessage.warning({ message: '请填写本区断面的日均水位和最低水位', offset: 78 })
    return
  }
  submitConfirm(r.section, date.value, Number(d2(r.avg)), Number(d2(r.min)))
  loadDate()
  ElMessage.success({ message: `已提交「${r.section}」质控数据，等待归档`, offset: 78 })
}

/** 可归档条数（已提交待归档的断面） */
const pendingCount = computed(() => rows.value.filter((r) => r.status === 'submitted').length)

/** 一键归档：归档当日全部已提交断面 */
function archiveAll() {
  if (!pendingCount.value) {
    ElMessage.warning({ message: '当前没有待归档的数据', offset: 78 })
    return
  }
  ElMessageBox.confirm(
    `确认归档 ${date.value} 的 ${pendingCount.value} 个断水质控数据？归档后不可修改。`,
    '一键归档',
    { confirmButtonText: '全部归档', cancelButtonText: '取消', type: 'info' }
  )
    .then(() => {
      const list = rows.value.filter((r) => r.status === 'submitted')
      list.forEach((r) => approveConfirm(r.section, date.value))
      loadDate()
      ElMessage.success({ message: `${list.length} 个断面已归档`, offset: 78 })
    })
    .catch(() => {})
}

onMounted(() => {
  // 从复制链接直达：?date=YYYY-MM-DD 预选时间
  const q = route.query.date
  if (q && /^\d{4}-\d{2}-\d{2}$/.test(String(q))) date.value = String(q)
  loadDate()
})
</script>

<style scoped>
/* ---------- 顶部操作条 ---------- */
.cf-bar {
  flex: none; display: flex; align-items: center; gap: 16px;
  height: 68px; padding: 0 18px; background: #fff; border-bottom: 1px solid var(--bnd);
}
.cf-brand { display: flex; align-items: center; gap: 11px; min-width: 0; }
.cf-ic {
  width: 36px; height: 36px; flex: none; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 18px;
  background: linear-gradient(135deg, #2f9bf0, #017de4);
  box-shadow: 0 4px 10px rgba(1, 125, 228, .28);
}
.cf-tt .t1 { font-size: 16px; font-weight: 700; color: #1f2d3d; line-height: 1.3; }
.cf-tt .t2 { font-size: 12px; color: #8a94a3; line-height: 1.5; margin-top: 1px; }

.cf-ops { margin-left: auto; display: flex; align-items: center; gap: 16px; }
.cf-date { display: flex; align-items: center; gap: 8px; }
.cf-date label { font-size: 13px; color: #5b6b7b; white-space: nowrap; }
.cf-date input {
  width: 156px; height: 34px; padding: 0 10px;
  border: 1px solid #dbe2ea; border-radius: 6px; background: #fff;
  font-size: 14px; font-family: inherit; color: #303133; outline: none;
  font-variant-numeric: tabular-nums; cursor: pointer;
  transition: border-color .15s, box-shadow .15s;
}
.cf-date input:hover { border-color: #b9cde3; }
.cf-date input:focus { border-color: var(--nav); box-shadow: 0 0 0 3px rgba(1, 125, 228, .12); }

.cf-dist {
  width: 130px; height: 34px; padding: 0 8px; border: 1px solid #dbe2ea; border-radius: 6px;
  font-size: 14px; font-family: inherit; color: #303133; background: #fff; outline: none; cursor: pointer;
}
.cf-dist:focus { border-color: var(--nav); }

.cf-submit {
  display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 20px; border: none; border-radius: 6px;
  background: linear-gradient(180deg, #1c86e8, #017de4); color: #fff;
  font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer;
  box-shadow: 0 4px 12px rgba(1, 125, 228, .26);
  transition: filter .15s, transform .08s;
}
.cf-submit:hover { filter: brightness(1.06); }
.cf-submit:active { transform: translateY(1px); }
.cf-submit .ck { font-size: 13px; font-weight: 700; }

.cf-audit {
  display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 18px; border: 1px solid #b7ddc7; border-radius: 6px;
  background: #f2fbf6; color: #1f9d62;
  font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer;
  transition: background .15s, border-color .15s;
}
.cf-audit:hover:not(:disabled) { background: #e6f7ee; border-color: #8ecfaa; }
.cf-audit:disabled { color: #b6c0ca; border-color: #e2e8ee; background: #f7f9fb; cursor: not-allowed; }
.cf-audit .ck { font-size: 13px; font-weight: 700; }

/* ---------- 内容区 ---------- */
.cf-body { padding: 14px 16px 20px; gap: 12px; }

.cf-card { flex: none; }
.cf-card .hd { height: 42px; font-size: 14px; }
.cf-card .bd { padding: 0; }

/* ---------- 表格 ---------- */
.cf-table th { height: 42px; background: #f7f9fc; color: #64748b; font-size: 12.5px; letter-spacing: .3px; border-bottom: 1px solid #e6ebf2; }
.cf-table td { height: 54px; border-bottom: 1px solid #f1f4f8; }

.cf-table .idx { color: #b0bcc9; font-size: 13px; font-variant-numeric: tabular-nums; }

.cf-table .sec { text-align: left; padding-left: 20px; }
.cf-table .sec .nm { font-size: 14px; font-weight: 600; color: #1f2d3d; }
.cf-table .sec .dist {
  display: inline-block; margin-left: 8px; padding: 0 8px; border-radius: 10px;
  font-size: 11.5px; line-height: 19px; color: #7b8794; background: #eef2f7;
}
.cf-table .tm { color: #9aa5b1; font-size: 12.5px; }

/* 数值输入：右侧留出单位位置 */
.cf-ed { position: relative; display: inline-block; }
.cf-in {
  width: 104px; height: 32px; padding: 0 24px 0 10px;
  border: 1px solid #dbe2ea; border-radius: 6px; background: #fff;
  font-size: 14px; font-family: inherit; color: #1f2d3d; text-align: right;
  font-variant-numeric: tabular-nums; outline: none;
  transition: border-color .15s, box-shadow .15s, background .15s;
  appearance: textfield; -moz-appearance: textfield;
}
.cf-in::-webkit-outer-spin-button,
.cf-in::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.cf-in:hover:not(:disabled) { border-color: #b9cde3; }
.cf-in:focus { border-color: var(--nav); box-shadow: 0 0 0 3px rgba(1, 125, 228, .12); }
.cf-in:disabled {
  background: #f5f7fa; border-color: #e6ebf2; color: #97a3b0;
  cursor: not-allowed; box-shadow: none;
}
.cf-ed i {
  position: absolute; right: 9px; top: 50%; transform: translateY(-50%);
  font-style: normal; font-size: 12px; color: #9aa3ad; pointer-events: none;
}

/* 状态 */
.cf-status {
  display: inline-flex; align-items: center;
  padding: 2px 11px; border-radius: 11px; font-size: 12.5px; font-weight: 500;
}
.cf-status .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; margin-right: 5px; }
.cf-status.draft { color: #7b8794; background: #eef2f7; }
.cf-status.submitted { color: #c0802a; background: #fdf3e4; }
.cf-status.approved { color: #1f9d62; background: #e8f6ee; }

/* 非本区 / 已归档：整行置灰 */
.cf-table tr.locked .sec .nm { color: #64748b; }

/* ---------- 图例 ---------- */
.cf-legend {
  flex: none; display: flex; align-items: center; gap: 20px;
  padding: 2px 4px; font-size: 12px; color: #8494a6;
}
.cf-legend span { display: inline-flex; align-items: center; gap: 6px; }
.cf-legend .dot { width: 7px; height: 7px; border-radius: 50%; }
.cf-legend .dot.draft { background: #b0bcc9; }
.cf-legend .dot.submitted { background: #e0a33e; }
.cf-legend .dot.approved { background: #1f9d62; }
.cf-legend .src { margin-left: auto; color: #a7b2bf; }
</style>
