<template>
  <div class="bp">
    <!-- 条件栏 -->
    <div class="bp-cond">
      <span class="ttl">{{ PROGRESS_TITLE }}</span>
      <span class="date">数据截至 {{ DATA_DATE }}</span>
      <span class="lb">责任单位</span>
      <select v-model="f.unit">
        <option value="">全部责任单位</option>
        <option v-for="u in UNITS" :key="u" :value="u">{{ u }}</option>
      </select>
      <div class="chips">
        <span class="chip" :class="{ on: !f.status }" @click="f.status = ''">全部状态</span>
        <span
          v-for="s in STATUS"
          :key="s"
          class="chip"
          :class="{ on: f.status === s }"
          @click="f.status = s"
        >{{ s }}</span>
      </div>
      <div class="bp-ops"><button class="btn-exp" type="button" @click="exportList">导出</button></div>
    </div>

    <!-- 核心指标 -->
    <div class="bp-keys">
      <div v-for="(m, i) in keyCards" :key="m.k" class="bp-key" :class="'k' + i">
        <div class="bk-l">{{ m.n }}</div>
        <div class="bk-row">
          <b>{{ m.done }}</b><em>/ {{ m.plan }}</em><i>{{ m.rate }}%</i>
        </div>
        <div class="bk-bar"><span :style="{ width: m.rate + '%' }"></span></div>
        <div class="bk-f">{{ m.unit }} · 计划完成 {{ m.due }}</div>
      </div>
    </div>

    <!-- 图表 -->
    <div class="bp-charts">
      <div class="card">
        <div class="hd">月度完成量<span class="tag">单位：个</span></div>
        <div class="bd"><BarChart :option="monthOpt" :height="230" /></div>
      </div>
      <div class="card">
        <div class="hd">责任单位完成率<span class="tag">完成数 / 计划数</span></div>
        <div class="bd"><BarChart :option="unitOpt" :height="230" /></div>
      </div>
    </div>

    <!-- 项目明细 -->
    <div class="card bp-table">
      <div class="hd">项目进度明细<span class="tag">共 {{ rows.length }} 个项目</span></div>
      <div class="bd" style="padding: 0">
        <table class="dt">
          <thead>
            <tr>
              <th style="width: 56px">序号</th>
              <th style="width: 300px">项目名称</th>
              <th style="width: 100px">计划数</th>
              <th style="width: 100px">已完成</th>
              <th style="width: 240px">完成率</th>
              <th style="width: 180px">责任单位</th>
              <th style="width: 110px">计划完成</th>
              <th style="width: 100px">状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, i) in rows" :key="p.id">
              <td class="muted">{{ i + 1 }}</td>
              <td class="nm">{{ p.name }}</td>
              <td class="num">{{ p.plan }}</td>
              <td class="num">{{ p.done }}</td>
              <td>
                <div class="mini-bar">
                  <span class="mb-track"><i :style="{ width: pRate(p) + '%' }"></i></span>
                  <b>{{ pRate(p) }}%</b>
                </div>
              </td>
              <td>{{ p.unit }}</td>
              <td class="num">{{ p.due }}</td>
              <td><span class="st" :class="p.status === '已完成' ? 'ok' : 'ing'">{{ p.status }}</span></td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="8" class="empty">当前筛选条件下没有项目</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import {
  PROGRESS_TITLE, DATA_DATE, PROJECTS, MONTHLY, KEY_METRICS, UNITS, STATUS, rate
} from '@/data/progress'
import BarChart from '@/components/BarChart.vue'
import { downloadCsv } from '@/utils/csv'

const f = reactive({ unit: '', status: '' })
const pRate = (p) => rate(p.done, p.plan)

const rows = computed(() => PROJECTS.filter((p) => {
  if (f.unit && p.unit !== f.unit) return false
  if (f.status && p.status !== f.status) return false
  return true
}))

const keyCards = computed(() => KEY_METRICS.map((m, i) => ({
  ...m,
  rate: rate(m.done, m.plan),
  unit: PROJECTS[i].unit,
  due: PROJECTS[i].due
})))

const monthOpt = computed(() => ({
  grid: { left: 42, right: 14, top: 20, bottom: 28 },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  xAxis: {
    type: 'category',
    data: MONTHLY.map((_, i) => `${i + 1}月`),
    axisLabel: { fontSize: 10, color: '#8a9aab' },
    axisLine: { lineStyle: { color: '#dfe6ee' } },
    axisTick: { show: false }
  },
  yAxis: {
    type: 'value',
    axisLabel: { fontSize: 10, color: '#8a9aab' },
    splitLine: { lineStyle: { color: '#eef2f6' } }
  },
  series: [{
    type: 'bar',
    data: MONTHLY,
    barMaxWidth: 22,
    itemStyle: { color: '#017de4', borderRadius: [2, 2, 0, 0] }
  }]
}))

const unitOpt = computed(() => {
  const list = UNITS.map((u) => {
    const ps = PROJECTS.filter((p) => p.unit === u)
    const plan = ps.reduce((a, p) => a + p.plan, 0)
    const done = ps.reduce((a, p) => a + p.done, 0)
    return { name: u, plan, done, rate: rate(done, plan) }
  }).sort((a, b) => b.rate - a.rate)
  return {
    grid: { left: 118, right: 62, top: 12, bottom: 22 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (ps) => {
        const r = list[ps[0].dataIndex]
        return `${r.name}<br/>完成 ${r.done} / ${r.plan}<br/>完成率 ${r.rate}%`
      }
    },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { fontSize: 10, color: '#8a9aab', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#eef2f6' } }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: list.map((r) => r.name),
      axisLabel: { fontSize: 11, color: '#5b6b7b' },
      axisLine: { lineStyle: { color: '#dfe6ee' } },
      axisTick: { show: false }
    },
    series: [{
      type: 'bar',
      data: list.map((r) => r.rate),
      barMaxWidth: 16,
      itemStyle: { color: '#16b8b0', borderRadius: [0, 2, 2, 0] },
      label: { show: true, position: 'right', fontSize: 10, color: '#5b6b7b', formatter: '{c}%' }
    }]
  }
})

function exportList() {
  const head = ['序号', '项目名称', '计划数', '已完成', '完成率(%)', '责任单位', '计划完成', '状态']
  const lines = rows.value.map((p, i) => [
    i + 1, p.name, p.plan, p.done, rate(p.done, p.plan), p.unit, p.due, p.status
  ])
  downloadCsv('站网建设进展.csv', head, lines)
}
</script>

<style scoped>
.bp { height: 100%; overflow: auto; padding: 10px; display: flex; flex-direction: column; gap: 10px; }

.bp-cond {
  flex: none;
  background: #fff;
  border: 1px solid var(--bnd);
  border-radius: 4px;
  padding: 9px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.bp-cond .ttl { font-size: 14px; font-weight: 700; color: #17324a; }
.bp-cond .date { font-size: 11.5px; color: #93a4b5; }
.bp-cond .lb { font-size: 12.5px; color: #7a8fa5; margin-left: 8px; }
.bp-cond select {
  height: 29px;
  border: 1px solid #d6dfe9;
  border-radius: 3px;
  padding: 0 8px;
  font-size: 12.5px;
  background: #fff;
  outline: none;
}
.bp-cond select:focus { border-color: #017de4; }
.chips { display: flex; gap: 5px; }
.chip {
  font-size: 12px;
  line-height: 24px;
  padding: 0 11px;
  border: 1px solid #dbe4ee;
  border-radius: 3px;
  color: #4a5a6a;
  cursor: pointer;
  background: #fff;
}
.chip:hover { border-color: #7bb8ee; color: #017de4; }
.chip.on { background: #017de4; border-color: #017de4; color: #fff; }
.bp-ops { margin-left: auto; }

/* 核心指标 */
.bp-keys { flex: none; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.bp-key {
  border-radius: 6px;
  padding: 16px 20px 14px;
  color: #fff;
  position: relative;
  overflow: hidden;
}
.bp-key.k0 { background: linear-gradient(105deg, #0b74d1, #2b9bea); }
.bp-key.k1 { background: linear-gradient(105deg, #0f8f86, #24b8a6); }
.bk-l { font-size: 13px; opacity: .92; }
.bk-row { display: flex; align-items: baseline; gap: 6px; margin: 6px 0 10px; }
.bk-row b { font-size: 32px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
.bk-row em { font-size: 17px; font-style: normal; opacity: .8; }
.bk-row i { margin-left: auto; font-size: 24px; font-style: normal; font-weight: 700; }
.bk-bar { height: 6px; border-radius: 3px; background: rgba(255, 255, 255, .28); overflow: hidden; }
.bk-bar span { display: block; height: 100%; border-radius: 3px; background: #fff; }
.bk-f { margin-top: 8px; font-size: 11.5px; opacity: .82; }

/* 图表 */
.bp-charts { flex: none; display: grid; grid-template-columns: 1.2fr 1fr; gap: 10px; }
.bp-charts .card .bd { padding: 2px 8px 0; }

/* 明细表 */
.bp-table { flex: none; }
.bp-table .bd { overflow: auto; }
.bp-table .nm { text-align: left; padding-left: 16px; }
.mini-bar { display: flex; align-items: center; gap: 9px; justify-content: center; }
.mb-track { width: 150px; height: 7px; border-radius: 4px; background: #eef2f7; overflow: hidden; display: inline-block; }
.mb-track i { display: block; height: 100%; background: linear-gradient(90deg, #017de4, #4aa9f0); border-radius: 4px; }
.mini-bar b { font-size: 12px; color: #35506a; font-variant-numeric: tabular-nums; }
.st { font-size: 11px; padding: 1px 7px; border-radius: 2px; }
.st.ok { color: #26a869; background: #eef8f2; }
.st.ing { color: #017de4; background: #eef6fe; }
.empty { color: #93a4b5; padding: 24px 0 !important; }
</style>
