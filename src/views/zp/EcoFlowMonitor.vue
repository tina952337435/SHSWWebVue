<template>
  <div class="ew">
    <!-- 监测总览：不选时间，始终展示最新（今日）状态 -->
    <div class="ew-body">
      <div class="io-stats">
        <div class="io-stat">
          <div class="st-l">保障断面</div>
          <div class="st-v">{{ stats.total }}<span class="st-u">个</span></div>
        </div>
        <div class="io-stat">
          <div class="st-l">今日达标断面</div>
          <div class="st-v">{{ stats.pass }}<span class="st-u">个</span></div>
        </div>
        <div class="io-stat">
          <div class="st-l">今日预警断面</div>
          <div class="st-v c-orange">{{ stats.warn }}<span class="st-u">个</span></div>
        </div>
        <div class="io-stat">
          <div class="st-l">今年以来平均保障率</div>
          <div class="st-v">{{ stats.avg }}<span class="st-u">%</span></div>
        </div>
      </div>

      <div class="card ew-table">
        <div class="ew-toolbar">
          <span class="ew-ops"><ExportButton @export="exportCsv" /></span>
        </div>
        <div class="bd">
          <table class="dt">
            <thead>
              <tr>
                <th style="width: 56px">序号</th>
                <th style="width: 150px">断面</th>
                <th style="width: 170px">监测时间</th>
                <th>日均水位 / 流量</th>
                <th>最低水位 / 流量</th>
                <th>今年以来日均最小流量（最低水位）</th>
                <th>今年以来低于生态基流（水位）天数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in rows" :key="r.name">
                <td>{{ i + 1 }}</td>
                <td>
                  {{ r.name }}
                  <span class="mtag" :class="r.metric">{{ r.metric === 'q' ? '流量' : '水位' }}</span>
                </td>
                <td class="num">{{ r.time }}</td>
                <td class="num">{{ show(r, r.avg) }}</td>
                <td class="num">{{ show(r, r.min) }}</td>
                <td class="num">{{ show(r, r.yMin) }}</td>
                <td class="num">{{ r.lowDays }} 天</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { latestOverview, todayStr } from '@/data/ecoWarn'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'

const today = todayStr()
const rows = computed(() => latestOverview(today))

/** 按断面考核指标展示：流量断面显示 m³/s，水位断面显示 m */
const show = (r, v) =>
  r.metric === 'q' ? `${v.toLocaleString('en-US')} m³/s` : `${v.toFixed(2)} m`

const stats = computed(() => {
  const list = rows.value
  if (!list.length) return { total: 0, pass: 0, warn: 0, avg: '—' }
  const avg = list.reduce((a, r) => a + (r.rate || 0), 0) / list.length
  return {
    total: list.length,
    pass: list.filter((r) => r.meet).length,
    warn: list.filter((r) => !r.meet).length,
    avg: avg.toFixed(1)
  }
})

function exportCsv() {
  const head = [
    '序号', '断面', '考核指标', '监测时间',
    '日均值', '最低值', '今年以来日均最小值',
    '今年以来低于生态基流（水位）天数'
  ]
  const lines = rows.value.map((r, i) => [
    i + 1, r.name, r.metric === 'q' ? '流量' : '水位', r.time,
    show(r, r.avg), show(r, r.min), show(r, r.yMin),
    r.lowDays
  ])
  downloadCsv(`生态流量监测总览_${today}.csv`, head, lines)
}
</script>
