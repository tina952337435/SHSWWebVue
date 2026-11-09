<template>
  <div class="ew">
    <div class="io-cond">
      <div class="io-fld">
        <label>开始时间</label>
        <input v-model="start" type="date" :min="EW_DATE_MIN" :max="EW_DATE_MAX" />
      </div>
      <div class="io-fld">
        <label>结束时间</label>
        <input v-model="end" type="date" :min="EW_DATE_MIN" :max="EW_DATE_MAX" />
      </div>
      <div class="io-fld">
        <label>断面</label>
        <select v-model="section" style="width: 200px">
          <option value="">全部断面</option>
          <option v-for="s in ECO_SECTIONS" :key="s.name" :value="s.name">{{ s.river }}·{{ s.name }}</option>
        </select>
      </div>
      <div class="io-fld">
        <label>预警等级</label>
        <select v-model="level" style="width: 120px">
          <option value="">全部等级</option>
          <option v-for="l in EW_LEVELS" :key="l.k" :value="l.k">{{ l.n }}预警</option>
        </select>
      </div>
    </div>

    <div class="ew-body">
      <div class="io-stats">
        <div class="io-stat">
          <div class="st-l">红色预警</div>
          <div class="st-v c-red">{{ counts.red }}<span class="st-u">次</span></div>
        </div>
        <div class="io-stat">
          <div class="st-l">橙色预警</div>
          <div class="st-v c-orange">{{ counts.orange }}<span class="st-u">次</span></div>
        </div>
        <div class="io-stat">
          <div class="st-l">黄色预警</div>
          <div class="st-v c-yellow">{{ counts.yellow }}<span class="st-u">次</span></div>
        </div>
        <div class="io-stat">
          <div class="st-l">预警合计</div>
          <div class="st-v">{{ counts.total }}<span class="st-u">次</span></div>
        </div>
      </div>

      <div class="card ew-table">
        <div class="ew-toolbar">
          <span class="ew-tip">共 {{ list.length }} 条预警记录</span>
          <span class="ew-ops"><ExportButton @export="exportCsv" /></span>
        </div>
        <div class="bd">
          <table class="dt">
            <thead>
              <tr>
                <th style="width:60px">序号</th>
                <th>开始时间</th>
                <th>结束时间</th>
                <th>断面</th>
                <th>所在河道</th>
                <th>目标水位（m）</th>
                <th>实测最低（m）</th>
                <th>偏低（m）</th>
                <th>持续天数</th>
                <th style="width:90px">等级</th>
                <th style="width:90px">状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(w, i) in list" :key="w.id">
                <td>{{ i + 1 }}</td>
                <td>{{ w.start }}</td>
                <td>{{ w.end }}</td>
                <td>{{ w.section }}</td>
                <td>{{ w.river }}</td>
                <td class="num">{{ w.target.toFixed(2) }}</td>
                <td class="num">{{ w.min.toFixed(2) }}</td>
                <td class="num">{{ w.depth.toFixed(2) }}</td>
                <td class="num">{{ w.days }}</td>
                <td><span class="lv" :class="w.level">{{ levelName(w.level) }}</span></td>
                <td>
                  <span v-if="w.status === 'active'" class="lv orange">处理中</span>
                  <span v-else class="lv green">已恢复</span>
                </td>
              </tr>
              <tr v-if="!list.length">
                <td colspan="11" class="empty">所选条件下暂无预警记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ECO_SECTIONS } from '@/data/ecoFlow'
import { EW_LEVELS, EW_LEVEL_MAP, EW_DATE_MIN, EW_DATE_MAX, detectWarnings } from '@/data/ecoWarn'
import { rules } from '@/store/ecoRules'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'

const start = ref('2026-09-01')
const end = ref('2026-10-31')
const section = ref('')
const level = ref('')

const range = computed(() => {
  let s = String(start.value || '')
  let e = String(end.value || '')
  if (!s || !e) return null
  if (s > e) [s, e] = [e, s]
  return { s, e }
})

const all = computed(() => (range.value ? detectWarnings(range.value.s, range.value.e, rules.value) : []))

const list = computed(() =>
  all.value.filter((w) => (!section.value || w.section === section.value) && (!level.value || w.level === level.value))
)

const counts = computed(() => {
  const c = { red: 0, orange: 0, yellow: 0, total: list.value.length }
  list.value.forEach((w) => { c[w.level] = (c[w.level] || 0) + 1 })
  return c
})

const levelName = (k) => (EW_LEVEL_MAP[k] ? EW_LEVEL_MAP[k].n : k)

function exportCsv() {
  const head = ['序号', '开始时间', '结束时间', '断面', '所在河道', '目标水位（m）', '实测最低（m）', '偏低（m）', '持续天数', '等级', '状态']
  const lines = list.value.map((w, i) => [
    i + 1, w.start, w.end, w.section, w.river,
    w.target.toFixed(2), w.min.toFixed(2), w.depth.toFixed(2), w.days,
    levelName(w.level), w.status === 'active' ? '处理中' : '已恢复'
  ])
  downloadCsv(`生态流量预警记录_${range.value.s}~${range.value.e}.csv`, head, lines)
}
</script>
