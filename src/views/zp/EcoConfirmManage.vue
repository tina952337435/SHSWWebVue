<template>
  <div class="rm">
    <div class="rm-bar">
      <div class="l"><span class="ico">▤</span>生态水位质控管理</div>
      <div class="r">
        <span>日期</span>
        <input v-model="start" type="date" />
        <span>至</span>
        <input v-model="end" type="date" />
        <span class="cnt">共 {{ rows.length }} 天</span>
        <ExportButton @export="exportCsv" />
      </div>
    </div>

    <div class="rm-body">
      <div class="rm-card">
        <table class="dt">
          <thead>
            <tr>
              <th style="width:64px">序号</th>
              <th style="width:150px">日期</th>
              <th style="width:190px">进度</th>
              <th style="width:180px">下发时间</th>
              <th style="width:120px">状态</th>
              <th style="width:220px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in rows" :key="r.date">
              <td class="muted">{{ i + 1 }}</td>
              <td><b>{{ r.date }}</b></td>
              <td>
                <div class="qc-prog">
                  <div class="qc-bar"><i :style="{ width: (r.confirmed / 9 * 100) + '%' }"></i></div>
                  <span>{{ r.confirmed }}/9 区</span>
                </div>
              </td>
              <td class="tm">{{ r.issuedAt || '—' }}</td>
              <td><span class="qc-tag" :class="r.status.k">{{ r.status.n }}</span></td>
              <td>
                <button class="qc-op" type="button" @click="copyLink(r)">复制</button>
                <button class="qc-op" type="button" @click="openDetail(r)">查看</button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="6" class="empty">请选择日期范围</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'
import { ECO_SECTIONS } from '@/data/ecoFlow'
import { confirmOf } from '@/store/ecoConfirm'
import { taskOf, issueTask } from '@/store/ecoTask'

const SH = ECO_SECTIONS.filter((s) => !s.national) // 9 个断面 = 9 个区

const router = useRouter()

function pad(n) { return String(n).padStart(2, '0') }
function dateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''))
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null
}
function shift(s, n) {
  const p = parseDate(s)
  if (!p) return s
  const d = new Date(p.y, p.m - 1, p.d + n)
  return dateStr(d)
}

const today = dateStr(new Date())
const start = ref(shift(today, -14)) // 最近 15 天
const end = ref(today)

function listDates(s, e) {
  const a = parseDate(s)
  const b = parseDate(e)
  const out = []
  if (!a || !b) return out
  const cur = new Date(a.y, a.m - 1, a.d)
  const last = new Date(b.y, b.m - 1, b.d)
  let g = 0
  while (cur <= last && g++ < 400) {
    out.push(dateStr(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

/**
 * 状态：待确认（未全部确认）→ 待归档（9 区全确认）→ 已归档（归档完成）
 */
const rows = computed(() =>
  listDates(start.value, end.value).map((d) => {
    const task = taskOf(d)
    const confirmed = SH.filter((s) => confirmOf(s.name, d)).length
    const approved = SH.filter((s) => { const c = confirmOf(s.name, d); return c && c.status === 'approved' }).length

    let status
    if (approved >= SH.length) status = { k: 'done', n: '已归档' }
    else if (confirmed >= SH.length) status = { k: 'archive', n: '待归档' }
    else status = { k: 'pending', n: '待确认' }

    return { date: d, confirmed, issuedAt: task ? task.issuedAt : '', status }
  })
)

function openDetail(r) { router.push(`/zp/qrsj?date=${r.date}`) }

async function copyLink(r) {
  issueTask(r.date) // 记录下发时间
  const link = `${location.href.split('#')[0]}#/zp/qrsj?date=${r.date}`
  try {
    await navigator.clipboard.writeText(link)
  } catch (e) {
    const ta = document.createElement('textarea')
    ta.value = link
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  ElMessage.success({ message: `已复制 ${r.date} 填报链接`, offset: 78 })
}

function exportCsv() {
  const head = ['序号', '日期', '进度', '下发时间', '状态']
  const lines = rows.value.map((r, i) => [
    i + 1, r.date, `${r.confirmed}/9 区`, r.issuedAt || '—', r.status.n
  ])
  downloadCsv('生态水位质控管理.csv', head, lines)
}
</script>

<style scoped>
.rm-bar .r input[type="date"] {
  height: 30px; border: 1px solid #dcdfe6; border-radius: 3px; padding: 0 8px;
  font-size: 14px; font-family: inherit; color: #303133; background: #fff; outline: none;
}
.rm-bar .r input[type="date"]:focus { border-color: #017de4; }

.tm { color: #8a94a3; font-size: 13px; font-variant-numeric: tabular-nums; }

.qc-tag {
  display: inline-block; padding: 1px 10px; border-radius: 10px;
  font-size: 12px; line-height: 1.7; font-weight: 500;
}
.qc-tag.pending { color: #0b6bb5; background: #e8f2fc; }
.qc-tag.archive { color: #c0802a; background: #fdf3e4; }
.qc-tag.done { color: #1f9d62; background: #e8f6ee; }

.qc-prog { display: flex; align-items: center; gap: 8px; justify-content: center; }
.qc-bar {
  width: 92px; height: 6px; border-radius: 3px; background: #eef2f7; overflow: hidden;
}
.qc-bar i { display: block; height: 100%; background: linear-gradient(90deg, #4d93d0, #017de4); border-radius: 3px; }
.qc-prog span { font-size: 12px; color: #5b6b7b; font-variant-numeric: tabular-nums; }

.qc-op {
  padding: 3px 12px; border: 1px solid #017de4; border-radius: 4px;
  background: #fff; color: #017de4; font-size: 12.5px; font-family: inherit;
  cursor: pointer; transition: background .15s, color .15s;
}
.qc-op + .qc-op { margin-left: 8px; }
.qc-op:hover { background: #eaf4fe; }
.qc-op.primary { background: #017de4; color: #fff; }
.qc-op.primary:hover { background: #0b6bb5; }
</style>
