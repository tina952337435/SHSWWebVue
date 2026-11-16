<template>
  <div class="sa">
    <div class="sa-cond">
      <span class="lb">年度</span>
      <select v-model.number="year">
        <option v-for="y in SURVEY_YEARS" :key="y" :value="y">{{ y }} 年</option>
      </select>
      <span class="lb">填报单位</span>
      <select v-model="unit">
        <option v-for="u in SURVEY_UNITS" :key="u" :value="u">{{ u }}</option>
      </select>
      <span class="hint">审核规则共 {{ rules.length }} 条，本次校核发现 {{ list.length }} 条问题</span>
      <div class="sa-ops">
        <button class="btn-line" type="button" @click="runAudit">一键审核</button>
        <button class="btn-exp" type="button" @click="exportList">导出</button>
      </div>
    </div>

    <div class="io-stats">
      <div class="io-stat"><div class="st-l">强制性错误</div><div class="st-v c-err">{{ nForced }}</div></div>
      <div class="io-stat"><div class="st-l">合理性问题</div><div class="st-v c-warn">{{ nReasonable }}</div></div>
      <div class="io-stat"><div class="st-l">已处理</div><div class="st-v">{{ nDone }}</div></div>
      <div class="io-stat"><div class="st-l">审核状态</div><div class="st-v s-small">{{ statusText }}</div></div>
    </div>

    <div class="sa-main">
      <div class="card sa-rules">
        <div class="hd">
          审核规则
          <button class="add-rule" type="button" @click="ruleDlg = true">+ 新增</button>
        </div>
        <div class="bd">
          <div v-for="r in rules" :key="r.k" class="rule">
            <div class="rn">
              <input v-model="r.on" type="checkbox" />
              <span>{{ r.n }}</span>
            </div>
            <div class="rd">{{ r.d }}</div>
          </div>
        </div>
      </div>

      <div class="card sa-res">
        <div class="hd">校核结果<span class="tag">{{ year }} 年度 · {{ unit }}</span></div>
        <div class="bd" style="padding: 0">
          <table class="dt">
            <thead>
              <tr>
                <th style="width: 58px">序号</th>
                <th style="width: 96px">错误等级</th>
                <th style="width: 140px">规则</th>
                <th>错误描述</th>
                <th style="width: 120px">当前值</th>
                <th style="width: 220px">处理建议</th>
                <th style="width: 88px">状态</th>
                <th style="width: 76px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in list" :key="i" :class="{ done: r.done }">
                <td class="muted">{{ i + 1 }}</td>
                <td><span class="lv" :class="r.level === '强制' ? 'err' : 'warn'">{{ r.level === '强制' ? '强制性错误' : '合理性问题' }}</span></td>
                <td>{{ r.item }}</td>
                <td style="text-align: left; padding-left: 10px; white-space: normal">{{ r.desc }}</td>
                <td class="num">{{ r.value }}</td>
                <td style="text-align: left; padding-left: 10px; white-space: normal">{{ r.advice }}</td>
                <td><span class="lv" :class="r.done ? 'done-lv' : 'todo'">{{ r.done ? '已处理' : '待处理' }}</span></td>
                <td><a class="lnk" @click="toggle(r)">{{ r.done ? '撤销' : '标记处理' }}</a></td>
              </tr>
              <tr v-if="!list.length">
                <td colspan="8" class="empty">未发现校核问题</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <el-dialog v-model="ruleDlg" title="新增审核规则" width="520px" append-to-body>
      <div class="rd-form">
        <label><span>规则名称</span><input v-model="newRule.n" type="text" placeholder="如：极值阈值校验" /></label>
        <label><span>规则说明</span><textarea v-model="newRule.d" rows="3" placeholder="描述规则适用指标与判断条件" /></label>
      </div>
      <template #footer>
        <button class="btn-line" type="button" @click="ruleDlg = false">取消</button>
        <button class="btn-exp" type="button" @click="addRule">保存</button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { SURVEY_YEARS, SURVEY_UNITS, AUDIT_RULES, auditResults } from '@/data/stationSurvey'
import { downloadCsv } from '@/utils/csv'

const year = ref(2026)
const unit = ref(SURVEY_UNITS[0])
const list = ref([])

const rules = ref(AUDIT_RULES.map((r) => ({ ...r, on: true })))
const ruleDlg = ref(false)
const newRule = ref({ n: '', d: '' })
function addRule() {
  if (!newRule.value.n.trim()) { ElMessage.warning('请填写规则名称'); return }
  rules.value.push({ k: 'custom' + rules.value.length, n: newRule.value.n.trim(), d: newRule.value.d.trim() || '自定义规则', on: true })
  newRule.value = { n: '', d: '' }
  ruleDlg.value = false
  ElMessage.success('规则已新增，下次审核生效')
}

function load() {
  list.value = auditResults(year.value, unit.value)
}
watch([year, unit], load, { immediate: true })

const nForced = computed(() => list.value.filter((r) => r.level === '强制' && !r.done).length)
const nReasonable = computed(() => list.value.filter((r) => r.level === '合理' && !r.done).length)
const nDone = computed(() => list.value.filter((r) => r.done).length)
const statusText = computed(() => {
  if (!list.value.length) return '通过'
  if (nForced.value) return '未通过'
  return '待复核'
})

function runAudit() {
  list.value = auditResults(year.value, unit.value)
  ElMessage.success('已完成校核，共发现 ' + list.value.length + ' 条问题')
}
function toggle(r) { r.done = !r.done }

function exportList() {
  const head = ['序号', '错误等级', '规则', '错误描述', '当前值', '处理建议', '状态']
  const lines = list.value.map((r, i) => [
    i + 1, r.level === '强制' ? '强制性错误' : '合理性问题', r.item, r.desc, r.value, r.advice, r.done ? '已处理' : '待处理'
  ])
  downloadCsv(`水文统计调查_校核结果_${year.value}.csv`, head, lines)
}
</script>

<style scoped>
.sa { display: flex; flex-direction: column; gap: 10px; }
.sa-cond {
  flex: none; background: #fff; border: 1px solid var(--bnd); border-radius: 4px;
  padding: 9px 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.sa-cond .lb { font-size: 12.5px; color: #7a8fa5; }
.sa-cond select { height: 28px; border: 1px solid #d6dfe9; border-radius: 3px; padding: 0 6px; font-size: 12.5px; outline: none; background: #fff; }
.sa-cond .hint { font-size: 12px; color: #8a9aab; margin-left: 8px; }
.sa-ops { margin-left: auto; display: flex; gap: 8px; }
.btn-line { height: 30px; padding: 0 12px; border: 1px solid #017de4; border-radius: 3px; background: #fff; color: #017de4; font-size: 13px; cursor: pointer; }
.btn-line:hover { background: #f2f8ff; }
.c-err { color: #f56c6c; }
.c-warn { color: #e6a23c; }
.st-v.s-small { font-size: 17px; line-height: 2; }
.sa-main { flex: 1; min-height: 0; display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 10px; }
.sa-rules .bd { padding: 4px 8px; }
.rule { padding: 9px 8px; border-bottom: 1px dashed #edf1f6; }
.rule:last-child { border-bottom: none; }
.rn { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; color: #245c85; }
.rn input { accent-color: #017de4; }
.add-rule { margin-left: auto; border: 1px solid #017de4; background: #fff; color: #017de4; font-size: 11.5px; border-radius: 2px; padding: 1px 8px; cursor: pointer; font-weight: 400; }
.add-rule:hover { background: #f2f8ff; }
.rd-form { display: flex; flex-direction: column; gap: 12px; }
.rd-form label { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: #5b6b7b; }
.rd-form input, .rd-form textarea { border: 1px solid #d6dfe9; border-radius: 3px; padding: 6px 8px; font-size: 13px; outline: none; font-family: inherit; }
.rd-form input:focus, .rd-form textarea:focus { border-color: #017de4; }
.rd { font-size: 11.5px; color: #8a9aab; line-height: 1.7; margin-top: 2px; }
.sa-res .bd { overflow: auto; }
.lv { font-size: 11px; padding: 1px 6px; border-radius: 2px; white-space: nowrap; }
.lv.err { color: #f56c6c; background: #fef0f0; }
.lv.warn { color: #b8860b; background: #fdf8e8; }
.lv.todo { color: #8a94a3; background: #f4f5f7; }
.lv.done-lv { color: #26a869; background: #eef8f2; }
.lnk { color: #017de4; cursor: pointer; font-size: 12.5px; }
.lnk:hover { text-decoration: underline; }
tr.done td { color: #a8b3bd; }
.empty { color: #93a4b5; padding: 26px 0 !important; }
</style>
