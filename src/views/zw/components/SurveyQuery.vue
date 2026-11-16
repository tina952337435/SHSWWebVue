<template>
  <div class="sq">
    <div class="sq-cond">
      <span class="lb">年度</span>
      <select v-model.number="year">
        <option v-for="y in SURVEY_YEARS" :key="y" :value="y">{{ y }} 年</option>
      </select>
      <span class="lb">填报单位</span>
      <select v-model="unit">
        <option v-for="u in SURVEY_UNITS" :key="u" :value="u">{{ u }}</option>
      </select>
      <span class="hint">按水文统计年报格式展示，可直接导出归档</span>
      <div class="sq-ops"><ExportButton @export="exportReport" /></div>
    </div>

    <div class="sq-main">
      <div class="card sq-table">
        <div class="hd">{{ year }} 年度水文统计年报<span class="tag">{{ unit }}</span></div>
        <div class="bd" style="padding: 0">
          <table class="dt">
            <thead>
              <tr>
                <th style="width: 60px">序号</th>
                <th style="width: 300px">指标名称</th>
                <th style="width: 90px">单位</th>
                <th style="width: 150px">上年</th>
                <th style="width: 150px">本年</th>
                <th style="width: 100px">同比</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="sec in SURVEY_SECTIONS" :key="sec.k">
                <tr class="sec-row">
                  <td colspan="6">{{ sec.n }}</td>
                </tr>
                <tr v-for="(r, i) in rowsOf(sec.k)" :key="r.k">
                  <td class="muted">{{ i + 1 }}</td>
                  <td style="text-align: left; padding-left: 22px">{{ r.n }}</td>
                  <td>{{ r.u }}</td>
                  <td class="num">{{ fmt(r.last) }}</td>
                  <td class="num bold">{{ fmt(r.value) }}</td>
                  <td class="num" :class="{ warn: Math.abs(r.yoy) > 30 }">{{ r.yoy > 0 ? '+' : '' }}{{ r.yoy.toFixed(1) }}%</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card sq-chart">
        <div class="hd">
          自定义指标历年对比
          <span class="tag">最多选 4 项</span>
        </div>
        <div class="bd">
          <div class="chips">
            <span
              v-for="it in ALL_ITEMS"
              :key="it.k"
              class="chip"
              :class="{ on: picked.includes(it.k) }"
              @click="togglePick(it.k)"
            >{{ it.n }}</span>
          </div>
          <div class="charts">
            <div v-for="s in series.rows" :key="s.k" class="one">
              <div class="one-t">{{ s.n }}<small>（{{ s.u }}）</small></div>
              <BarChart :option="optOf(s)" :height="150" />
            </div>
            <div v-if="!series.rows.length" class="none">请选择需要对比的指标</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  SURVEY_YEARS, SURVEY_UNITS, SURVEY_SECTIONS, ALL_ITEMS, surveyRows, historySeries
} from '@/data/stationSurvey'
import BarChart from '@/components/BarChart.vue'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'

const year = ref(2026)
const unit = ref(SURVEY_UNITS[0])

const rowsMap = computed(() => {
  const m = {}
  for (const s of SURVEY_SECTIONS) m[s.k] = surveyRows(year.value, unit.value, s.k)
  return m
})
const rowsOf = (k) => rowsMap.value[k] || []
const fmt = (v) => (v == null ? '—' : Number(v).toLocaleString('en-US'))

const picked = ref(['total', 'z', 'r', 'q'])
function togglePick(k) {
  const i = picked.value.indexOf(k)
  if (i >= 0) picked.value.splice(i, 1)
  else if (picked.value.length >= 4) ElMessage.warning('最多对比 4 项指标')
  else picked.value.push(k)
}
const series = computed(() => historySeries(picked.value))

function optOf(s) {
  const avg = s.data.reduce((a, b) => a + b, 0) / (s.data.length || 1)
  return {
    grid: { left: 46, right: 14, top: 18, bottom: 26 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: series.value.years.map((y) => String(y)),
      axisLabel: { fontSize: 10, color: '#8a9aab' },
      axisLine: { lineStyle: { color: '#dfe6ee' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: '#8a9aab' },
      splitLine: { lineStyle: { color: '#eef2f6' } }
    },
    series: [
      {
        name: s.n,
        type: 'bar',
        data: s.data,
        barMaxWidth: 20,
        itemStyle: { color: '#017de4', borderRadius: [2, 2, 0, 0] }
      },
      {
        name: '多年平均',
        type: 'line',
        data: s.data.map(() => Number(avg.toFixed(1))),
        symbol: 'none',
        lineStyle: { color: '#909399', type: 'dashed', width: 1 }
      }
    ]
  }
}

function exportReport() {
  const head = ['章节', '指标名称', '单位', '上年', '本年', '同比(%)']
  const lines = []
  for (const sec of SURVEY_SECTIONS) {
    for (const r of rowsOf(sec.k)) lines.push([sec.n, r.n, r.u, r.last, r.value, r.yoy.toFixed(1)])
  }
  downloadCsv(`水文统计调查_${year.value}_${unit.value}.csv`, head, lines)
}
</script>

<style scoped>
.sq { display: flex; flex-direction: column; gap: 10px; }
.sq-cond {
  flex: none; background: #fff; border: 1px solid var(--bnd); border-radius: 4px;
  padding: 9px 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.sq-cond .lb { font-size: 12.5px; color: #7a8fa5; }
.sq-cond select { height: 28px; border: 1px solid #d6dfe9; border-radius: 3px; padding: 0 6px; font-size: 12.5px; outline: none; background: #fff; }
.sq-cond .hint { font-size: 12px; color: #8a9aab; margin-left: 8px; }
.sq-ops { margin-left: auto; }
.sq-main { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 10px; }
.sq-table .bd { overflow: auto; }
.sec-row td { background: #f5f9fe; color: #245c85; font-weight: 700; text-align: left; padding-left: 14px !important; }
.bold { font-weight: 700; }
.warn { color: #b8860b; }
.sq-chart .bd { overflow: auto; }
.chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.chip { font-size: 12px; padding: 2px 10px; border: 1px solid #d6dfe9; border-radius: 12px; color: #5b6b7b; cursor: pointer; background: #fff; }
.chip:hover { border-color: #7bb8ee; color: #017de4; }
.chip.on { background: #017de4; border-color: #017de4; color: #fff; }
.charts { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; }
.one { border: 1px solid #eef2f6; border-radius: 4px; padding: 6px 6px 0; }
.one-t { font-size: 12px; color: #245c85; font-weight: 700; padding-left: 4px; }
.one-t small { color: #93a4b5; font-weight: 400; }
.none { grid-column: 1 / -1; text-align: center; color: #93a4b5; font-size: 13px; padding: 30px 0; }
</style>
