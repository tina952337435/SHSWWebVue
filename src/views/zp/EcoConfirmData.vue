<template>
  <div class="ew">
    <!-- 顶部操作条 -->
    <div class="cf-bar">
      <div class="cf-brand">
        <div class="cf-ic"><el-icon><EditPen /></el-icon></div>
        <div class="cf-tt">
          <div class="t1">质控数据</div>
          <div class="t2">上海市重点河道 · 9 个控制断面 · 日均水位 / 最低水位校核</div>
        </div>
      </div>

      <div class="cf-ops">
        <div class="cf-date">
          <label for="cf-date">确认日期</label>
          <input id="cf-date" v-model="date" type="date" :max="today" @change="loadDate" />
        </div>
        <button class="cf-audit" type="button" :disabled="!pendingCount" @click="approveAll">
          <span class="ck">✓</span>一键审核
        </button>
        <button class="cf-submit" type="button" @click="submitAll">
          <span class="ck">✓</span>提交确认
        </button>
      </div>
    </div>

    <div class="ew-body cf-body">
      <div class="cf-hint">
        <span class="hk">说明</span>
        默认确认昨日数据；修改日均/最低水位后点击「提交确认」，数据才进入「待审核」，此时可逐条或一键审核；审核通过即锁定，需撤回审核才能再次修改。
      </div>

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
                <th style="width:100px">状态</th>
                <th style="width:140px">提交时间</th>
                <th style="width:140px">审核时间</th>
                <th style="width:92px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in rows" :key="r.section" :class="{ locked: r.status === 'approved' }">
                <td class="idx">{{ i + 1 }}</td>
                <td class="sec">
                  <span class="nm">{{ r.section }}</span>
                  <span class="dist">{{ r.river }}</span>
                </td>
                <td class="num">
                  <span class="cf-ed">
                    <input
                      v-model="r.avg" type="text" inputmode="decimal" class="cf-in"
                      :disabled="r.status === 'approved'" @blur="fix2(r, 'avg')"
                    />
                    <i>m</i>
                  </span>
                </td>
                <td class="num">
                  <span class="cf-ed">
                    <input
                      v-model="r.min" type="text" inputmode="decimal" class="cf-in"
                      :disabled="r.status === 'approved'" @blur="fix2(r, 'min')"
                    />
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
                <td>
                  <button
                    v-if="r.status === 'submitted'"
                    class="cf-op" type="button"
                    :disabled="isDirty(r)"
                    :title="isDirty(r) ? '数值已修改，需先「提交确认」才能审核' : ''"
                    @click="approve(r)"
                  >审核</button>
                  <button v-else-if="r.status === 'approved'" class="cf-op revoke" type="button" @click="revoke(r)">撤回</button>
                  <span v-else class="nop">—</span>
                </td>
              </tr>
              <tr v-if="!rows.length">
                <td colspan="8" class="empty">请选择确认日期</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="cf-legend">
        <span><i class="dot draft"></i>未提交</span>
        <span><i class="dot submitted"></i>待审核</span>
        <span><i class="dot approved"></i>已审核（锁定）</span>
        <span class="src">数据来源：水文自动测报系统 · 提交后进入区县级确认，市级审核通过后归档</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { EditPen } from '@element-plus/icons-vue'
import { ECO_SECTIONS } from '@/data/ecoFlow'
import { dayStats, parseDate } from '@/data/ecoWarn'
import { confirmOf, submitConfirm, approveConfirm, revokeConfirm } from '@/store/ecoConfirm'

// 9 个上海市重点河道断面（非国家重点河湖）
const SH_SECTIONS = ECO_SECTIONS.filter((s) => !s.national)

const STATUS_TEXT = { draft: '未提交', submitted: '待审核', approved: '已审核' }

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
      // 已提交入库的数值，用于判断页面上的数值是否被改过
      savedAvg: conf ? Number(conf.avg) : null,
      savedMin: conf ? Number(conf.min) : null,
      status: conf ? conf.status || 'submitted' : 'draft',
      time: conf ? conf.time : '',
      auditTime: conf ? conf.auditTime || '' : ''
    }
  })
}

/** 待审核但数值已被改动：必须先重新提交确认，才能审核 */
function isDirty(r) {
  if (r.status !== 'submitted') return false
  return Number(r.avg) !== r.savedAvg || Number(r.min) !== r.savedMin
}

function statusText(r) {
  if (isDirty(r)) return '待重新提交'
  return STATUS_TEXT[r.status]
}

/** 提交：已审核的断面跳过（锁定） */
function submitAll() {
  if (!rows.value.length) return
  const editable = rows.value.filter((r) => r.status !== 'approved')
  if (!editable.length) {
    ElMessage.warning({ message: '当日数据均已审核，需先撤回审核才能修改', offset: 78 })
    return
  }
  const bad = editable.find((r) => !Number.isFinite(parseFloat(r.avg)) || !Number.isFinite(parseFloat(r.min)))
  if (bad) { ElMessage.warning({ message: `请填写「${bad.section}」的日均水位和最低水位`, offset: 78 }); return }
  editable.forEach((r) => {
    submitConfirm(r.section, date.value, Number(d2(r.avg)), Number(d2(r.min)))
  })
  loadDate()
  ElMessage.success({
    message: `已提交 ${editable.length} 个断面（${date.value}），等待审核`,
    offset: 78
  })
}

/** 可审核条数（待审核且数值未改动） */
const pendingCount = computed(() => rows.value.filter((r) => r.status === 'submitted' && !isDirty(r)).length)

/** 一键审核：审核当日全部待审核断面 */
function approveAll() {
  if (!pendingCount.value) {
    ElMessage.warning({ message: '当前没有待审核的数据', offset: 78 })
    return
  }
  ElMessageBox.confirm(
    `确认一键审核通过 ${date.value} 的 ${pendingCount.value} 个断水质控数据？审核后数据将被锁定。`,
    '一键审核',
    { confirmButtonText: '全部审核', cancelButtonText: '取消', type: 'info' }
  )
    .then(() => {
      const list = rows.value.filter((r) => r.status === 'submitted' && !isDirty(r))
      list.forEach((r) => approveConfirm(r.section, date.value))
      loadDate()
      ElMessage.success({ message: `${list.length} 个断面已审核通过，数据已锁定`, offset: 78 })
    })
    .catch(() => {})
}

/** 审核通过：通过后数据锁定 */
function approve(r) {
  if (isDirty(r)) {
    ElMessage.warning({ message: '数值已修改，请先「提交确认」再审核', offset: 78 })
    return
  }
  ElMessageBox.confirm(
    `确认审核通过「${r.section}」${date.value} 的质控数据？审核后数据将被锁定。`,
    '审核确认',
    { confirmButtonText: '审核通过', cancelButtonText: '取消', type: 'info' }
  )
    .then(() => {
      approveConfirm(r.section, date.value)
      loadDate()
      ElMessage.success({ message: `「${r.section}」已审核通过，数据已锁定`, offset: 78 })
    })
    .catch(() => {})
}

/** 撤回审核：回到待审核，可再次修改 */
function revoke(r) {
  ElMessageBox.confirm(
    `确认撤回「${r.section}」${date.value} 的审核？撤回后可再次修改并重新提交。`,
    '撤回审核',
    { confirmButtonText: '撤回', cancelButtonText: '取消', type: 'warning' }
  )
    .then(() => {
      revokeConfirm(r.section, date.value)
      loadDate()
      ElMessage.success({ message: `已撤回审核，「${r.section}」可重新修改`, offset: 78 })
    })
    .catch(() => {})
}

onMounted(loadDate)
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

.cf-ops { margin-left: auto; display: flex; align-items: center; gap: 14px; }
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

/* ---------- 内容区 ---------- */
.cf-body { padding: 14px 16px 20px; gap: 12px; }

.cf-hint {
  flex: none; display: flex; align-items: center; gap: 9px;
  padding: 9px 13px; font-size: 13px; line-height: 1.7; color: #5a6b7d;
  background: #f5f9ff; border: 1px solid #dbe8fa; border-radius: 6px;
}
.cf-hint .hk {
  flex: none; padding: 0 8px; border-radius: 4px; font-size: 12px; line-height: 19px;
  color: #fff; background: #7fb2e8;
}

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
.cf-in:hover { border-color: #b9cde3; }
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

/* 已审核行：输入框置灰，数值不可改 */
.cf-table tr.locked .sec .nm { color: #64748b; }

/* 行操作 */
.cf-op {
  padding: 3px 11px; border: 1px solid var(--nav); border-radius: 4px;
  background: #fff; color: var(--nav); font-size: 12.5px; font-family: inherit;
  cursor: pointer; transition: background .15s, color .15s;
}
.cf-op:hover:not(:disabled) { background: #eaf4fe; }
.cf-op:disabled {
  border-color: #dfe6ee; color: #b6c0ca; background: #f7f9fb; cursor: not-allowed;
}
.cf-op.revoke { border-color: #c9d2dd; color: #6b7885; }
.cf-op.revoke:hover:not(:disabled) { background: #f4f6f9; border-color: #aab6c4; }
.nop { color: #c0c9d4; }

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
