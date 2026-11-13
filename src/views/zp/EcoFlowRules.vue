<template>
  <div class="ew">
    <div class="io-cond">
      <span class="ew-note">水位低于目标水位、且持续天数满足时触发预警</span>
      <div class="ew-ops">
        <ExportButton @export="exportCsv" />
        <span @click="openAdd">+ 新增规则</span>
        <span @click="reset">恢复默认</span>
      </div>
    </div>

    <div class="ew-body">
      <div class="card ew-table">
        <div class="bd">
          <table class="dt">
            <thead>
              <tr>
                <th style="width:60px">序号</th>
                <th>断面</th>
                <th>所在河道</th>
                <th>目标水位（m）</th>
                <th>持续天数</th>
                <th style="width:80px">启用</th>
                <th style="width:110px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in rules" :key="r.id">
                <td>{{ i + 1 }}</td>
                <td>{{ r.section }}</td>
                <td>{{ r.river }}</td>
                <td class="num">{{ r.target.toFixed(2) }}</td>
                <td class="num">{{ r.days }} 天</td>
                <td><el-switch v-model="r.enabled" size="small" @change="toggle(r)" /></td>
                <td>
                  <span class="op" @click="openEdit(r)">编辑</span>
                  <span class="op del" @click="remove(r)">删除</span>
                </td>
              </tr>
              <tr v-if="!rules.length">
                <td colspan="7" class="empty">暂无预警规则，可点击右上角「新增规则」</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <el-dialog v-model="show" :title="editingId ? '编辑预警规则' : '新增预警规则'" width="420px">
      <div class="rl-form">
        <div class="rl-row">
          <label>断面</label>
          <select v-model="form.section" :disabled="!!editingId" class="rl-sel" @change="onSectionChange">
            <option v-for="s in sectionOptions" :key="s.name" :value="s.name">{{ s.river }}·{{ s.name }}</option>
          </select>
        </div>
        <div class="rl-row">
          <label>目标水位</label>
          <div class="rl-val">{{ form.target.toFixed(2) }} m</div>
        </div>
        <div class="rl-row">
          <label>持续天数</label>
          <el-input-number v-model="form.days" :min="1" :max="15" :step="1" />
          <span class="rl-tip">低于目标水位连续达该天数即触发预警</span>
        </div>
        <div class="rl-row">
          <label>启用</label>
          <el-switch v-model="form.enabled" />
        </div>
      </div>
      <template #footer>
        <el-button @click="show = false">取消</el-button>
        <el-button type="primary" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ECO_SECTIONS } from '@/data/ecoFlow'
import { rules, addRule, updateRule, removeRule, resetRules } from '@/store/ecoRules'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'

const show = ref(false)
const editingId = ref(null)
const form = reactive({
  section: '',
  target: 0,
  days: 1,
  enabled: true
})

const sectionOptions = computed(() => {
  if (editingId.value) return ECO_SECTIONS
  const used = new Set(rules.value.map((r) => r.section))
  return ECO_SECTIONS.filter((s) => !used.has(s.name))
})

function onSectionChange() {
  const s = ECO_SECTIONS.find((x) => x.name === form.section)
  if (s) form.target = s.z
}

function openAdd() {
  if (!sectionOptions.value.length) {
    ElMessage.info({ message: '所有断面均已配置预警规则', offset: 78 })
    return
  }
  const s = sectionOptions.value[0]
  Object.assign(form, { section: s.name, target: s.z, days: 1, enabled: true })
  editingId.value = null
  show.value = true
}

function openEdit(r) {
  Object.assign(form, {
    section: r.section, target: r.target, days: r.days, enabled: r.enabled
  })
  editingId.value = r.id
  show.value = true
}

function submit() {
  if (editingId.value) {
    updateRule(editingId.value, { days: form.days, enabled: form.enabled })
    ElMessage.success({ message: '规则已更新', offset: 78 })
  } else {
    addRule(form.section, { days: form.days, enabled: form.enabled })
    ElMessage.success({ message: '规则已新增', offset: 78 })
  }
  show.value = false
}

function exportCsv() {
  const head = ['序号', '断面', '所在河道', '目标水位（m）', '持续天数', '启用']
  const lines = rules.value.map((r, i) => [
    i + 1, r.section, r.river, r.target.toFixed(2), r.days, r.enabled ? '启用' : '停用'
  ])
  downloadCsv('生态流量预警规则.csv', head, lines)
}

function toggle(r) {
  updateRule(r.id, { enabled: r.enabled })
}

function remove(r) {
  ElMessageBox.confirm(`确定删除「${r.section}」的预警规则？删除后该断面不再产生预警。`, '删除规则', {
    type: 'info', confirmButtonText: '删除', cancelButtonText: '取消'
  })
    .then(() => {
      removeRule(r.id)
      ElMessage.success({ message: '规则已删除', offset: 78 })
    })
    .catch(() => {})
}

function reset() {
  ElMessageBox.confirm('恢复为默认预警规则？当前修改将全部丢失。', '恢复默认', {
    type: 'info', confirmButtonText: '恢复', cancelButtonText: '取消'
  })
    .then(() => {
      resetRules()
      ElMessage.success({ message: '已恢复默认规则', offset: 78 })
    })
    .catch(() => {})
}
</script>

<style scoped>
.rl-tip { margin-left: 12px; font-size: 12px; color: #8296a8; }
</style>
