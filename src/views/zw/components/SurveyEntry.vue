<template>
  <div class="se">
    <div class="se-cond">
      <span class="lb">年度</span>
      <select v-model.number="year">
        <option v-for="y in SURVEY_YEARS" :key="y" :value="y">{{ y }} 年</option>
      </select>
      <span class="lb">填报单位</span>
      <select v-model="unit">
        <option v-for="u in SURVEY_UNITS" :key="u" :value="u">{{ u }}</option>
      </select>
      <label class="sw"><input v-model="compare" type="checkbox" />对比上年</label>
      <span class="stat" :class="statusKey">{{ statusText }}</span>
      <div class="se-ops">
        <button class="btn-line" type="button" @click="autoFill">从站网自动带数</button>
        <button class="btn-line" type="button" @click="saveDraft">保存草稿</button>
        <button class="btn-exp" type="button" @click="submit">提交审核</button>
      </div>
    </div>

    <div class="se-main">
      <aside class="se-tree">
        <div
          v-for="s in SURVEY_SECTIONS"
          :key="s.k"
          class="tr"
          :class="{ on: section === s.k }"
          @click="section = s.k"
        >
          <span>{{ s.n }}</span>
          <small>{{ s.items.length }} 项</small>
        </div>
        <div class="se-tip">
          自动带入指标取自站网管理台账，手工填报指标按上年数据预填，可直接修改。
        </div>
      </aside>

      <div class="card se-card">
        <div class="hd">
          {{ curSection.n }}
          <span class="tag">{{ year }} 年度 · {{ unit }}</span>
        </div>
        <div class="bd" style="padding: 0">
          <table class="dt">
            <thead>
              <tr>
                <th style="width: 54px">序号</th>
                <th style="width: 260px">指标名称</th>
                <th style="width: 80px">单位</th>
                <th v-if="compare" style="width: 140px">上年同期</th>
                <th style="width: 170px">本年填报</th>
                <th v-if="compare" style="width: 90px">同比</th>
                <th style="width: 110px">数据来源</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in rows" :key="r.k">
                <td class="muted">{{ i + 1 }}</td>
                <td style="text-align: left; padding-left: 18px">{{ r.n }}</td>
                <td>{{ r.u }}</td>
                <td v-if="compare" class="num">{{ fmt(r.last) }}</td>
                <td>
                  <input
                    v-model.number="r.value"
                    class="cell"
                    type="number"
                    min="0"
                    step="any"
                    @change="r.yoy = r.last ? Number((((r.value - r.last) / r.last) * 100).toFixed(1)) : 0"
                  />
                </td>
                <td v-if="compare" class="num" :class="{ warn: Math.abs(r.yoy) > 30 }">{{ r.yoy > 0 ? '+' : '' }}{{ r.yoy.toFixed(1) }}%</td>
                <td>
                  <span class="src" :class="{ auto: r.source === '自动带入' }">{{ r.source }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="se-foot">
          <span>共 {{ rows.length }} 项指标；{{ autoCount }} 项由站网台账自动带入</span>
          <span class="saved" v-if="savedAt">草稿已于 {{ savedAt }} 保存</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { SURVEY_YEARS, SURVEY_UNITS, SURVEY_SECTIONS, surveyRows } from '@/data/stationSurvey'

const year = ref(2026)
const unit = ref(SURVEY_UNITS[0])
const section = ref(SURVEY_SECTIONS[0].k)
const compare = ref(true)
const rows = ref([])
const savedAt = ref('')
const state = ref('draft') // draft | submitted

const curSection = computed(() => SURVEY_SECTIONS.find((s) => s.k === section.value))
const autoCount = computed(() => rows.value.filter((r) => r.source === '自动带入').length)
const statusText = computed(() => (state.value === 'submitted' ? '已提交审核' : '草稿'))
const statusKey = computed(() => (state.value === 'submitted' ? 'ok' : 'draft'))

function load() {
  rows.value = surveyRows(year.value, unit.value, section.value)
  savedAt.value = ''
  state.value = 'draft'
}
watch([year, unit, section], load, { immediate: true })

function fmt(v) {
  return v == null ? '—' : Number(v).toLocaleString('en-US')
}

function autoFill() {
  const fresh = surveyRows(year.value, unit.value, section.value)
  const m = new Map(fresh.map((r) => [r.k, r.value]))
  let n = 0
  for (const r of rows.value) {
    if (r.source === '自动带入') { r.value = m.get(r.k); n++ }
  }
  ElMessage.success(`已从站网台账刷新 ${n} 项自动带入指标`)
}

function saveDraft() {
  const d = new Date()
  const p = (x) => String(x).padStart(2, '0')
  savedAt.value = `${p(d.getHours())}:${p(d.getMinutes())}`
  state.value = 'draft'
  ElMessage.success('录入状态已保存')
}

function submit() {
  state.value = 'submitted'
  ElMessage.success('已提交审核，可在「数据审核」页查看校核结果')
}
</script>

<style scoped>
.se { display: flex; flex-direction: column; gap: 10px; }
.se-cond {
  flex: none; background: #fff; border: 1px solid var(--bnd); border-radius: 4px;
  padding: 9px 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.se-cond .lb { font-size: 12.5px; color: #7a8fa5; }
.se-cond select { height: 28px; border: 1px solid #d6dfe9; border-radius: 3px; padding: 0 6px; font-size: 12.5px; outline: none; background: #fff; }
.se-cond select:focus { border-color: #017de4; }
.sw { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; color: #5b6b7b; margin-left: 6px; }
.sw input { accent-color: #017de4; }
.stat { font-size: 11.5px; padding: 2px 8px; border-radius: 2px; }
.stat.draft { color: #8a6d3b; background: #fdf8e8; }
.stat.ok { color: #26a869; background: #eef8f2; }
.se-ops { margin-left: auto; display: flex; gap: 8px; }
.btn-line {
  height: 30px; padding: 0 12px; border: 1px solid #017de4; border-radius: 3px;
  background: #fff; color: #017de4; font-size: 13px; cursor: pointer;
}
.btn-line:hover { background: #f2f8ff; }

.se-main { flex: 1; min-height: 0; display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 10px; }
.se-tree { background: #fff; border: 1px solid var(--bnd); border-radius: 4px; padding: 8px; overflow: auto; }
.tr {
  padding: 10px 11px; border-radius: 3px; font-size: 13px; color: #35506a;
  cursor: pointer; display: flex; align-items: center; justify-content: space-between;
}
.tr small { color: #93a4b5; font-size: 11px; }
.tr:hover { background: #f5f9fe; }
.tr.on { background: #e8f3fd; color: #017de4; font-weight: 700; }
.se-tip { margin-top: 10px; padding: 8px 9px; font-size: 11.5px; line-height: 1.8; color: #6b7c8f; background: #f7fafd; border: 1px dashed #dbe6f1; border-radius: 3px; }
.se-card { min-height: 0; }
.se-card .bd { overflow: auto; }
.cell {
  width: 128px; height: 28px; border: 1px solid #d6dfe9; border-radius: 3px;
  padding: 0 8px; font-size: 13px; text-align: right; outline: none; font-variant-numeric: tabular-nums;
}
.cell:focus { border-color: #017de4; box-shadow: 0 0 0 2px rgba(1,125,228,.1); }
.src { font-size: 11px; padding: 1px 6px; border-radius: 2px; background: #f2f4f7; color: #6b7c8f; }
.src.auto { background: #eef6fe; color: #017de4; }
.num.warn { color: #b8860b; font-weight: 700; }
.se-foot { flex: none; display: flex; align-items: center; gap: 18px; padding: 7px 12px; border-top: 1px solid #eef2f6; font-size: 12px; color: #8a9aab; }
.se-foot .saved { margin-left: auto; color: #26a869; }
</style>
