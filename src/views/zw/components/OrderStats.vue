<template>
  <div class="os">
    <div class="os-cond">
      <span class="lb">日期</span>
      <input v-model="q.start" type="date" />
      <span class="to">至</span>
      <input v-model="q.end" type="date" />
      <span class="lb">所属中队</span>
      <select v-model="q.team">
        <option value="">全部</option>
        <option v-for="t in TEAMS" :key="t" :value="t">{{ t }}</option>
      </select>
      <span class="lb">工单类型</span>
      <select v-model="q.type">
        <option value="">全部</option>
        <option v-for="t in ORDER_TYPES" :key="t" :value="t">{{ t }}</option>
      </select>
      <div class="os-ops"><ExportButton @export="exportTable" /></div>
    </div>

    <div class="os-grid">
      <div class="card">
        <div class="hd">工单类型分布</div>
        <div class="bd"><BarChart :option="typeOpt" :height="220" /></div>
      </div>
      <div class="card">
        <div class="hd">各中队工单量</div>
        <div class="bd"><BarChart :option="teamOpt" :height="220" /></div>
      </div>
      <div class="card">
        <div class="hd">月度工单趋势</div>
        <div class="bd"><BarChart :option="monthOpt" :height="220" /></div>
      </div>
    </div>

    <div class="card os-table">
      <div class="hd">分类统计<span class="tag">共 {{ stats.total }} 单 · 完成率 {{ stats.rate }}% · 平均耗时 {{ stats.avgHours }} 小时</span></div>
      <div class="bd" style="padding: 0">
        <table class="dt">
          <thead>
            <tr>
              <th style="width: 70px">序号</th>
              <th style="width: 200px">工单类型</th>
              <th style="width: 140px">工单数</th>
              <th style="width: 140px">已完成</th>
              <th style="width: 140px">完成率</th>
              <th>平均耗时(h)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in byTypeRows" :key="r.name">
              <td class="muted">{{ i + 1 }}</td>
              <td>{{ r.name }}</td>
              <td class="num">{{ r.n }}</td>
              <td class="num">{{ r.done }}</td>
              <td class="num">{{ r.rate }}%</td>
              <td class="num">{{ r.avg }}</td>
            </tr>
            <tr class="tot">
              <td colspan="2">合计</td>
              <td class="num">{{ stats.total }}</td>
              <td class="num">{{ stats.done }}</td>
              <td class="num">{{ stats.rate }}%</td>
              <td class="num">{{ stats.avgHours }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { ORDERS, ORDER_TYPES, TEAMS } from '@/data/workOrders'
import BarChart from '@/components/BarChart.vue'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'

const q = reactive({ start: '2026-01-01', end: '2026-11-14', team: '', type: '' })

const rows = computed(() => ORDERS.filter((o) => {
  const d = o.publish.slice(0, 10)
  if (q.start && d < q.start) return false
  if (q.end && d > q.end) return false
  if (q.team && o.team !== q.team) return false
  if (q.type && o.type !== q.type) return false
  return true
}))

const stats = computed(() => {
  const total = rows.value.length
  const done = rows.value.filter((o) => o.status === '已完成').length
  const avg = total ? rows.value.reduce((a, o) => a + o.hours, 0) / total : 0
  return {
    total,
    done,
    rate: total ? ((done / total) * 100).toFixed(1) : '0.0',
    avgHours: avg.toFixed(1)
  }
})

const typeOpt = computed(() => {
  const names = ORDER_TYPES
  const vals = names.map((t) => rows.value.filter((o) => o.type === t).length)
  return bar(names, vals, '#017de4')
})
const teamOpt = computed(() => {
  const names = TEAMS
  const vals = names.map((t) => rows.value.filter((o) => o.team === t).length)
  return {
    grid: { left: 104, right: 34, top: 12, bottom: 24 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#8a9aab' }, splitLine: { lineStyle: { color: '#eef2f6' } } },
    yAxis: { type: 'category', data: names, axisLabel: { fontSize: 11, color: '#5b6b7b' }, axisLine: { lineStyle: { color: '#dfe6ee' } }, axisTick: { show: false } },
    series: [{ type: 'bar', data: vals, barMaxWidth: 15, itemStyle: { color: '#7b8cff', borderRadius: [0, 2, 2, 0] }, label: { show: true, position: 'right', fontSize: 10, color: '#5b6b7b' } }]
  }
})
const monthOpt = computed(() => {
  const names = []
  const vals = []
  for (let m = 1; m <= 12; m++) {
    names.push(`${m}月`)
    vals.push(rows.value.filter((o) => o.month === m).length)
  }
  return bar(names, vals, '#16b8b0')
})

function bar(names, vals, color) {
  return {
    grid: { left: 42, right: 14, top: 18, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: names, axisLabel: { fontSize: 10, color: '#8a9aab' }, axisLine: { lineStyle: { color: '#dfe6ee' } }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#8a9aab' }, splitLine: { lineStyle: { color: '#eef2f6' } } },
    series: [{ type: 'bar', data: vals, barMaxWidth: 22, itemStyle: { color, borderRadius: [2, 2, 0, 0] } }]
  }
}

const byTypeRows = computed(() => ORDER_TYPES.map((t) => {
  const list = rows.value.filter((o) => o.type === t)
  const done = list.filter((o) => o.status === '已完成').length
  const avg = list.length ? list.reduce((a, o) => a + o.hours, 0) / list.length : 0
  return {
    name: t,
    n: list.length,
    done,
    rate: list.length ? ((done / list.length) * 100).toFixed(1) : '0.0',
    avg: avg.toFixed(1)
  }
}))

function exportTable() {
  const head = ['工单类型', '工单数', '已完成', '完成率(%)', '平均耗时(h)']
  const lines = byTypeRows.value.map((r) => [r.name, r.n, r.done, r.rate, r.avg])
  lines.push(['合计', stats.value.total, stats.value.done, stats.value.rate, stats.value.avgHours])
  downloadCsv('工单分类统计.csv', head, lines)
}
</script>

<style scoped>
.os { display: flex; flex-direction: column; gap: 10px; }
.os-cond { flex: none; background: #fff; border: 1px solid var(--bnd); border-radius: 4px; padding: 9px 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.os-cond .lb { font-size: 12.5px; color: #7a8fa5; }
.os-cond .to { font-size: 12px; color: #8a9aab; }
.os-cond input, .os-cond select { height: 28px; border: 1px solid #d6dfe9; border-radius: 3px; padding: 0 6px; font-size: 12.5px; outline: none; background: #fff; }
.os-cond input[type="date"] { width: 128px; }
.os-ops { margin-left: auto; }
.os-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; flex: none; }
.os-grid .card .bd { padding: 2px 6px 0; }
.os-table { flex: 1; min-height: 0; }
.os-table .bd { overflow: auto; }
.os-table tr.tot td { background: #f7fafd; font-weight: 700; }
</style>
