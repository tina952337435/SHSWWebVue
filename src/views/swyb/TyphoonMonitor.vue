<template>
  <div class="sw-page">
    <div class="sw-cond">
      <label>台风场次</label>
      <select v-model="tid">
        <option v-for="t in TYPHOONS" :key="t.id" :value="t.id">
          {{ t.id }} {{ t.n }}（{{ t.period }}）
        </option>
      </select>
      <span class="lv" :class="ty.level">{{ levelName(ty.level) }}</span>
      <span class="sw-cond-right">
        编号 {{ ty.id }} · {{ ty.n }} · 中心 {{ ty.center }} · 最大风力 {{ ty.wind }} 级 ·
        距上海 {{ ty.dist }} km
      </span>
    </div>

    <div class="sw-cards">
      <div v-for="c in cards" :key="c.l" class="io-stat">
        <div class="st-l">{{ c.l }}</div>
        <div class="st-v">{{ c.v }}<span class="st-u">{{ c.u }}</span></div>
        <div class="st-d">{{ c.d }}</div>
      </div>
    </div>

    <div class="card">
      <div class="hd">逐小时过程雨量<span class="tag">影响时段 {{ ty.period }}</span></div>
      <div class="bd">
        <BarChart :option="chartOption" :height="236" />
      </div>
    </div>

    <div class="card sw-table">
      <div class="hd">分区雨量统计<span class="tag">共 {{ rainRows.length }} 个行政区</span></div>
      <div class="sw-toolbar">
        <div class="ops"><ExportButton @export="exportCsv" /></div>
      </div>
      <div class="bd">
        <table class="dt">
          <thead>
            <tr>
              <th>序号</th><th>行政区</th><th>平均雨量(mm)</th><th>最大雨量站</th>
              <th>最大雨量(mm)</th><th>暴雨站数</th><th>大暴雨站数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in rainRows" :key="r.d">
              <td>{{ i + 1 }}</td>
              <td>{{ r.d }}</td>
              <td class="num">{{ r.avg.toFixed(1) }}</td>
              <td>{{ r.maxStation }}</td>
              <td class="num">{{ r.maxRain.toFixed(1) }}</td>
              <td class="num">{{ r.heavy }}</td>
              <td class="num">{{ r.big }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import BarChart from '@/components/BarChart.vue'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'
import { TYPHOONS, districtRain, hourlyRain } from '@/data/swyb'

const current = TYPHOONS.find((t) => t.current) || TYPHOONS[0]
const tid = ref(current.id)

const ty = computed(() => TYPHOONS.find((t) => t.id === tid.value) || TYPHOONS[0])
const rainRows = computed(() => districtRain(tid.value))
const rainData = computed(() => hourlyRain(tid.value))

const LEVELS = { blue: '蓝色预警', yellow: '黄色预警', orange: '橙色预警', red: '红色预警' }
const levelName = (k) => LEVELS[k] || k

const cards = computed(() => [
  { l: '过程雨量', v: ty.value.rain.toFixed(1), u: 'mm', d: '全市平均' },
  { l: '最大日雨量', v: ty.value.maxDay.toFixed(1), u: 'mm', d: '单日最大' },
  { l: '潮位增水', v: ty.value.surge.toFixed(2), u: 'm', d: '长江口代表站' },
  { l: '超警戒站数', v: ty.value.over, u: '站', d: '过程累计超警' }
])

const chartOption = computed(() => {
  const d = rainData.value
  return {
    grid: { left: 48, right: 56, top: 30, bottom: 34 },
    tooltip: { trigger: 'axis' },
    legend: { top: 2, right: 14, data: ['小时雨量', '累计雨量'], textStyle: { color: '#606266' } },
    xAxis: {
      type: 'category',
      data: d.map((x) => x.t),
      axisLabel: { interval: 1, fontSize: 12, color: '#606266' },
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisTick: { show: false }
    },
    yAxis: [
      {
        type: 'value',
        name: 'mm/h',
        nameTextStyle: { color: '#909399' },
        axisLabel: { color: '#909399' },
        splitLine: { lineStyle: { color: '#f0f2f5' } }
      },
      {
        type: 'value',
        name: '累计 mm',
        nameTextStyle: { color: '#909399' },
        axisLabel: { color: '#909399' },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '小时雨量',
        type: 'bar',
        data: d.map((x) => x.v),
        barWidth: '52%',
        itemStyle: { color: '#16b8b0', borderRadius: [2, 2, 0, 0] }
      },
      {
        name: '累计雨量',
        type: 'line',
        yAxisIndex: 1,
        data: d.map((x) => x.sum),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: '#017de4' },
        itemStyle: { color: '#017de4' }
      }
    ]
  }
})

function exportCsv() {
  downloadCsv(
    `台风暴雨监视-${ty.value.id}${ty.value.n}.csv`,
    ['序号', '行政区', '平均雨量(mm)', '最大雨量站', '最大雨量(mm)', '暴雨站数', '大暴雨站数'],
    rainRows.value.map((r, i) => [
      i + 1, r.d, r.avg.toFixed(1), r.maxStation, r.maxRain.toFixed(1), r.heavy, r.big
    ])
  )
}
</script>

<style scoped>
.sw-cond select { max-width: 280px; }
</style>
