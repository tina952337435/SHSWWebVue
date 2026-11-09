<template>
  <div class="io">
    <!-- 顶部：计算条件（时段 + 统计尺度，一行） -->
    <div class="io-cond">
      <div class="io-fld">
        <label>开始时间</label>
        <input v-model="rangeStart" type="date" :min="IO_DATE_MIN" :max="IO_DATE_MAX" />
      </div>
      <div class="io-fld">
        <label>结束时间</label>
        <input v-model="rangeEnd" type="date" :min="IO_DATE_MIN" :max="IO_DATE_MAX" />
      </div>
      <div class="io-scale">
        <div class="sc-tabs">
          <span
            v-for="s in SCALES"
            :key="s.k"
            class="sc-item"
            :class="{ on: scale === s.k }"
            @click="setScale(s.k)"
          >{{ s.n }}</span>
        </div>
      </div>
    </div>

    <div class="io-body">
      <!-- 左侧：出入界站点树 -->
      <aside class="io-side">
        <div class="io-tt">
          出入界站点
          <span class="io-ops">
            <span @click="checkAll">全选</span>
            <span @click="clearAll">清空</span>
            <span class="cnt">已选 {{ keys.length }} 个</span>
          </span>
        </div>
        <div class="io-tree">
          <el-tree
            ref="treeRef"
            :data="IO_TREE"
            show-checkbox
            node-key="k"
            default-expand-all
            :props="{ label: 'n', children: 'children' }"
            :default-checked-keys="['st-zt', 'st-gq']"
            @check="syncKeys"
          />
        </div>
        <div class="io-tip">净水量 = 出水量 − 入水量</div>
      </aside>

      <!-- 右侧：统计卡 + 柱状图 + 明细表 -->
      <section class="io-main">
        <div class="io-stats">
          <div class="io-stat">
            <div class="st-l">累计出水量</div>
            <div class="st-v">{{ fmt(result.total.out) }}<span class="st-u">亿 m³</span></div>
          </div>
          <div class="io-stat">
            <div class="st-l">累计入水量</div>
            <div class="st-v">{{ fmt(result.total.inn) }}<span class="st-u">亿 m³</span></div>
          </div>
          <div class="io-stat">
            <div class="st-l">累计净水量</div>
            <div class="st-v" :class="result.total.net >= 0 ? 'pos' : 'neg'">
              {{ fmt(result.total.net) }}<span class="st-u">亿 m³</span>
            </div>
          </div>
          <div class="io-stat">
            <div class="st-l">{{ scaleInfo.maxName }}净水量最大值</div>
            <div class="st-v" :class="!result.max ? '' : result.max.net >= 0 ? 'pos' : 'neg'">
              {{ result.max ? fmt(result.max.value) : '—' }}<span v-if="result.max" class="st-u">亿 m³</span>
            </div>
            <div v-if="result.max" class="st-d">{{ result.max.label }}</div>
          </div>
        </div>

        <div class="card io-chart">
          <div class="bd io-chart-bd">
            <BarChart v-if="result.rows.length" :option="chartOption" :height="236" />
            <div v-else class="io-empty">请选择站点</div>
          </div>
        </div>

        <div class="card io-tablecard">
          <div class="ew-toolbar">
            <span class="ew-tip">净水量 = 出水量 − 入水量（正 = 净出、负 = 净入）· 共 {{ result.rows.length }} 个时段</span>
            <span class="ew-ops"><ExportButton @export="exportCsv" /></span>
          </div>
          <div class="bd io-table-bd">
            <table class="dt">
              <thead>
                <tr>
                  <th style="width:70px">序号</th>
                  <th>时间</th>
                  <th>净水量（亿 m³）</th>
                  <th>{{ s1 }}净水量（亿 m³）</th>
                  <th>{{ s2 }}净水量（亿 m³）</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in result.rows" :key="r.label">
                  <td>{{ i + 1 }}</td>
                  <td>{{ r.label }}</td>
                  <td class="num net">{{ fmt(r.net) }}</td>
                  <td class="num">{{ fmt(r.stationNets[0]) }}</td>
                  <td class="num">{{ fmt(r.stationNets[1]) }}</td>
                </tr>
                <tr v-if="!result.rows.length">
                  <td colspan="5" class="empty">请在左侧选择站点</td>
                </tr>
              </tbody>
              <tfoot v-if="result.rows.length">
                <tr class="tot">
                  <td>—</td>
                  <td>总计</td>
                  <td class="num net">{{ fmt(result.total.net) }}</td>
                  <td class="num">{{ fmt(result.total.stationNets[0]) }}</td>
                  <td class="num">{{ fmt(result.total.stationNets[1]) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import BarChart from '@/components/BarChart.vue'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'
import {
  IO_TREE, IO_LEAF_KEYS, IO_DATE_MIN, IO_DATE_MAX,
  SCALES, SCALE_MAP, calcInOut
} from '@/data/inOutFlow'

const scale = ref('month')
const scaleInfo = computed(() => SCALE_MAP[scale.value])

// 时间范围固定为一个日期区间，切换尺度只改变统计粒度，不改变所选时间
const rangeStart = ref('2026-01-01')
const rangeEnd = ref('2026-12-31')

function setScale(k) {
  scale.value = k
}

const treeRef = ref(null)
const keys = ref(['st-zt', 'st-gq'])

function syncKeys() {
  keys.value = treeRef.value ? treeRef.value.getCheckedKeys(true) : []
}
function checkAll() {
  treeRef.value && treeRef.value.setCheckedKeys(IO_LEAF_KEYS)
  syncKeys()
}
function clearAll() {
  treeRef.value && treeRef.value.setCheckedKeys([])
  syncKeys()
}

/** 当前起止（若开始晚于结束，自动对调后再算） */
const range = computed(() => {
  let s = String(rangeStart.value || '')
  let e = String(rangeEnd.value || '')
  if (!s || !e) return null
  if (s > e) [s, e] = [e, s]
  return { s, e }
})

const result = computed(() => {
  const empty = { rows: [], total: { out: 0, inn: 0, net: 0 }, max: null, count: 0 }
  if (!range.value || !keys.value.length) return empty
  return calcInOut(scale.value, range.value.s, range.value.e, keys.value)
})

const fmt = (v) => {
  if (v == null || Number.isNaN(v)) return '—'
  return Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const shortName = (n) => (String(n || '').split('·')[1] || n || '')
const s1 = computed(() => shortName(result.value.stationNames[0]) || '站1')
const s2 = computed(() => shortName(result.value.stationNames[1]) || '站2')

function exportCsv() {
  const num = (v) => (v == null ? '—' : v.toFixed(2))
  const head = ['序号', '时间', '净水量（亿 m³）', `${s1.value}净水量（亿 m³）`, `${s2.value}净水量（亿 m³）`]
  const lines = result.value.rows.map((r, i) => [
    i + 1, r.label, num(r.net), num(r.stationNets[0]), num(r.stationNets[1])
  ])
  if (result.value.total) {
    lines.push(['—', '总计', num(result.value.total.net), num(result.value.total.stationNets[0]), num(result.value.total.stationNets[1])])
  }
  downloadCsv(`出入境水资源量_${range.value.s}~${range.value.e}.csv`, head, lines)
}

const chartOption = computed(() => {
  const rows = result.value.rows
  const multiYear = new Set(rows.map((r) => r.label.slice(0, 4))).size > 1
  const barMaxWidth = rows.length > 120 ? 5 : 24
  const shortLabel = scale.value === 'day' || scale.value === 'xun'
  const xData = rows.map((r) =>
    shortLabel && !multiYear ? r.label.slice(5) : r.label
  )
  return {
    grid: { left: 46, right: 18, top: 34, bottom: 36 },
    legend: {
      top: 0,
      right: 6,
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 16,
      icon: 'roundRect',
      textStyle: { fontSize: 12, color: '#606266' }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (ps) => {
        if (!ps || !ps.length) return ''
        const r = rows[ps[0].dataIndex]
        const dir = r.net >= 0 ? '净出' : '净入'
        return `${r.label}<br/>净水量（出 − 入）：<b>${fmt(r.net)}</b> 亿 m³（${dir}）`
      }
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisLabel: { fontSize: 11, color: '#606266', margin: 10, hideOverlap: true }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 11, color: '#606266' },
      splitLine: { lineStyle: { color: '#f0f2f5' } }
    },
    series: [
      {
        name: '净出',
        type: 'bar',
        barGap: '-100%',
        barMaxWidth,
        itemStyle: { color: '#017de4', borderRadius: [2, 2, 0, 0] },
        data: rows.map((r) => (r.net >= 0 ? Math.abs(r.net) : null))
      },
      {
        name: '净入',
        type: 'bar',
        barGap: '-100%',
        barMaxWidth,
        itemStyle: { color: '#26a869', borderRadius: [2, 2, 0, 0] },
        data: rows.map((r) => (r.net < 0 ? Math.abs(r.net) : null))
      }
    ]
  }
})
</script>
