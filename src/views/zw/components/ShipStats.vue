<template>
  <div class="ss">
    <div class="ss-cond">
      <span class="lb">统计年度</span>
      <span class="year">2026 年</span>
      <span class="lb">所属中队</span>
      <select v-model="team">
        <option value="">全部</option>
        <option v-for="t in TEAMS" :key="t" :value="t">{{ t }}</option>
      </select>
      <span class="hint">用船统计为运行管理报告的组成部分，可直接导出归档</span>
      <div class="ss-ops">
        <button class="btn-line" type="button" @click="exportReport">导出运行管理报告（用船）</button>
      </div>
    </div>

    <div class="io-stats">
      <div class="io-stat"><div class="st-l">用船申请</div><div class="st-v">{{ stats.total }}<span class="st-u">单</span></div></div>
      <div class="io-stat"><div class="st-l">累计航行时长</div><div class="st-v">{{ stats.hours }}<span class="st-u">小时</span></div></div>
      <div class="io-stat"><div class="st-l">完成率</div><div class="st-v">{{ stats.doneRate }}<span class="st-u">%</span></div></div>
      <div class="io-stat"><div class="st-l">在航船舶</div><div class="st-v">{{ sailCount }}<span class="st-u">艘</span></div></div>
    </div>

    <div class="ss-grid">
      <div class="card">
        <div class="hd">月度用船次数与航行时长</div>
        <div class="bd"><BarChart :option="monthOpt" :height="260" /></div>
      </div>
      <div class="card">
        <div class="hd">各中队用船情况</div>
        <div class="bd" style="padding: 0">
          <table class="dt">
            <thead>
              <tr><th>序号</th><th>所属中队</th><th>申请数</th><th>航行时长(h)</th><th>完成数</th></tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in stats.byTeam" :key="r.team">
                <td class="muted">{{ i + 1 }}</td>
                <td>{{ r.team }}</td>
                <td class="num">{{ r.times }}</td>
                <td class="num">{{ r.hours }}</td>
                <td class="num">{{ r.done }}</td>
              </tr>
              <tr class="tot">
                <td colspan="2">合计</td>
                <td class="num">{{ stats.total }}</td>
                <td class="num">{{ stats.hours }}</td>
                <td class="num">{{ sumDone }}</td>
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
import { SHIPS, shipStats } from '@/data/ships'
import { useShipApply } from '@/store/shipApply'
import BarChart from '@/components/BarChart.vue'
import { downloadCsv } from '@/utils/csv'

const { list } = useShipApply()
const year = 2026
const team = ref('')
const TEAMS = Array.from(new Set(SHIPS.map((s) => s.team)))

const rows = computed(() => list.value.filter((a) => !team.value || a.team === team.value))

const stats = computed(() => shipStats(rows.value))
const sumDone = computed(() => stats.value.byTeam.reduce((a, b) => a + b.done, 0))
const sailCount = computed(() => SHIPS.filter((s) => s.status === '在航').length)

const monthOpt = computed(() => {
  const m = stats.value.byMonth
  return {
    grid: { left: 44, right: 46, top: 34, bottom: 28 },
    tooltip: { trigger: 'axis' },
    legend: { top: 6, itemWidth: 10, itemHeight: 8, textStyle: { fontSize: 11, color: '#5b6b7b' } },
    xAxis: {
      type: 'category',
      data: m.map((x) => x.name),
      axisLabel: { fontSize: 10, color: '#8a9aab' },
      axisLine: { lineStyle: { color: '#dfe6ee' } },
      axisTick: { show: false }
    },
    yAxis: [
      { type: 'value', name: '次', nameTextStyle: { fontSize: 10, color: '#8a9aab' }, axisLabel: { fontSize: 10, color: '#8a9aab' }, splitLine: { lineStyle: { color: '#eef2f6' } } },
      { type: 'value', name: '小时', nameTextStyle: { fontSize: 10, color: '#8a9aab' }, axisLabel: { fontSize: 10, color: '#8a9aab' }, splitLine: { show: false } }
    ],
    series: [
      { name: '用船次数', type: 'bar', data: m.map((x) => x.times), barMaxWidth: 20, itemStyle: { color: '#017de4', borderRadius: [2, 2, 0, 0] } },
      { name: '航行时长', type: 'line', yAxisIndex: 1, data: m.map((x) => x.hours), smooth: true, symbolSize: 5, lineStyle: { color: '#26a869', width: 1.8 }, itemStyle: { color: '#26a869' } }
    ]
  }
})

function exportReport() {
  const head = ['月份', '用船次数', '航行时长(h)']
  const lines = stats.value.byMonth.map((x) => [x.name, x.times, x.hours])
  lines.push(['合计', stats.value.total, stats.value.hours])
  downloadCsv(`运行管理报告_用船统计_${year}.csv`, head, lines)
}
</script>

<style scoped>
.ss { display: flex; flex-direction: column; gap: 10px; }
.ss-cond { flex: none; background: #fff; border: 1px solid var(--bnd); border-radius: 4px; padding: 9px 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ss-cond .lb { font-size: 12.5px; color: #7a8fa5; }
.ss-cond select { height: 28px; border: 1px solid #d6dfe9; border-radius: 3px; padding: 0 6px; font-size: 12.5px; outline: none; background: #fff; }
.ss-cond .hint { font-size: 12px; color: #8a9aab; }
.ss-cond .year { font-size: 13px; color: #17324a; font-weight: 700; }
.ss-ops { margin-left: auto; }
.btn-line { height: 30px; padding: 0 12px; border: 1px solid #017de4; border-radius: 3px; background: #fff; color: #017de4; font-size: 13px; cursor: pointer; }
.btn-line:hover { background: #f2f8ff; }
.ss-grid { flex: 1; min-height: 0; display: grid; grid-template-columns: 1.15fr 1fr; gap: 10px; }
.ss-grid .card .bd { overflow: auto; }
.ss-grid .card:first-child .bd { padding: 2px 8px 0; }
tr.tot td { background: #f7fafd; font-weight: 700; }
</style>
