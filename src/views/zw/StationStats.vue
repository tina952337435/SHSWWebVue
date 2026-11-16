<template>
  <div class="sta">
    <!-- 指标卡 -->
    <div class="sta-tiles">
      <div v-for="t in tiles" :key="t.k" class="tile" :class="'t-' + t.k">
        <div class="t-main">
          <div class="t-l">{{ t.n }}</div>
          <div class="t-v">{{ t.v }}<span v-if="t.u" class="t-u">{{ t.u }}</span></div>
          <div class="t-c">{{ t.c }}</div>
        </div>
        <div class="t-ico" :style="{ color: t.color, background: t.bg }">{{ t.icon }}</div>
      </div>
    </div>

    <!-- 图表筛选 -->
    <div class="sta-filter">
      <span class="f-hd">图表筛选</span>
      <select v-model="f.cls">
        <option value="">全部站类</option>
        <option v-for="c in ALL_CLASSES" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="f.dist">
        <option value="">全部行政区</option>
        <option v-for="d in DISTRICTS" :key="d" :value="d">{{ d }}</option>
      </select>
      <select v-model="f.system">
        <option value="">全部水系</option>
        <option v-for="s in WATER_SYSTEMS" :key="s" :value="s">{{ s }}</option>
      </select>
      <button class="f-reset" type="button" @click="resetF">重置</button>
      <span class="f-range">当前范围 <b>{{ base.length }}</b> 站</span>
    </div>

    <!-- 图表 -->
    <div class="sta-grid">
      <div class="card">
        <div class="hd">测站类别构成<span class="tag">按主要监测项目统计（{{ mainRows.length }} 类）</span></div>
        <div class="bd"><BarChart :option="mainOpt" :height="290" /></div>
      </div>
      <div class="card">
        <div class="hd">水系分布<span class="tag">按所属水系统计</span></div>
        <div class="bd"><BarChart :option="systemOpt" :height="290" /></div>
      </div>
      <div class="card">
        <div class="hd">行政区分布<span class="tag">站点数量排名</span></div>
        <div class="bd"><BarChart :option="distOpt" :height="300" /></div>
      </div>
      <div class="card">
        <div class="hd">站类管理构成<span class="tag">按站类管理统计（{{ mgmtRows.length }} 类）</span></div>
        <div class="bd"><BarChart :option="mgmtOpt" :height="300" /></div>
      </div>
    </div>

    <!-- 扩展维度统计 -->
    <div class="card ext-card">
      <div class="hd ext-hd">
        <span class="ex-t">扩展维度统计</span>
        <span class="ex-sub">测量水体 / 年代 / 区域 / 功能等 {{ DIMS.length }} 个维度</span>
        <div class="ex-mode">
          <span :class="{ on: ext.mode === 'bar' }" @click="ext.mode = 'bar'">柱状</span>
          <span :class="{ on: ext.mode === 'donut' }" @click="ext.mode = 'donut'">环形</span>
        </div>
      </div>

      <div class="ext-tabs">
        <span
          v-for="d in DIMS"
          :key="d.k"
          :class="{ on: ext.dim === d.k }"
          @click="ext.dim = d.k"
        >{{ d.n }}</span>
      </div>

      <div class="ext-body">
        <div class="ext-chart">
          <BarChart :option="extOpt" :height="360" />
        </div>
        <div class="ext-top">
          <div class="top-hd">{{ dimName }} TOP 7</div>
          <div class="top-list">
            <div v-for="(r, i) in extTop" :key="r.name" class="top-i">
              <span class="rk" :class="'rk' + i">{{ i + 1 }}</span>
              <span class="tn">{{ r.name }}</span>
              <b>{{ r.value }}</b>
            </div>
            <div v-if="!extTop.length" class="top-empty">当前筛选范围内暂无数据</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { STATIONS, ALL_CLASSES, DISTRICTS, WATER_SYSTEMS, MGMT_TYPES, hashStr } from '@/data/stationNetwork'
import BarChart from '@/components/BarChart.vue'

const f = reactive({ cls: '', dist: '', system: '' })
function resetF() {
  f.cls = ''
  f.dist = ''
  f.system = ''
}

const base = computed(() => STATIONS.filter((s) => {
  if (f.cls && s.cls !== f.cls) return false
  if (f.dist && s.dist !== f.dist) return false
  if (f.system && s.system !== f.system) return false
  return true
}))

const countBy = (arr, key) => {
  const m = {}
  for (const s of arr) {
    const k = typeof key === 'function' ? key(s) : s[key]
    m[k] = (m[k] || 0) + 1
  }
  return m
}

/* ---------- 指标卡 ---------- */
const ITEM_COLORS = {
  水位: '#017de4', 雨量: '#16b8b0', 流速: '#26a869', 潮位: '#7b8cff', 水质: '#2b4c8c', 地下水: '#4b6584'
}
const tiles = computed(() => {
  const total = base.value.length
  const n = (e) => base.value.filter((s) => s.elems.includes(e)).length
  const pct = (v) => (total ? ((v / total) * 100).toFixed(1) : '0.0')
  const q = n('流速')
  const z = n('水位')
  const r = n('雨量')
  const wq = n('水质')
  const gw = n('地下水')
  return [
    { k: 'total', n: '测站总数', v: total, u: '个', c: '站网全量站点', icon: '▦', color: '#017de4', bg: '#e8f3fd' },
    { k: 'q', n: '流量站', v: q, u: '个', c: `占比 ${pct(q)}%`, icon: '▲', color: '#26a869', bg: '#eef8f2' },
    { k: 'z', n: '水位站', v: z, u: '个', c: `占比 ${pct(z)}%`, icon: '●', color: '#017de4', bg: '#eef6fe' },
    { k: 'r', n: '雨量站', v: r, u: '个', c: `占比 ${pct(r)}%`, icon: '■', color: '#16b8b0', bg: '#e9f7f6' },
    { k: 'wq', n: '水质站', v: wq, u: '个', c: `占比 ${pct(wq)}%`, icon: '⬟', color: '#2b4c8c', bg: '#eaeef5' },
    { k: 'gw', n: '地下水站', v: gw, u: '个', c: `占比 ${pct(gw)}%`, icon: '▼', color: '#4b6584', bg: '#eef1f5' }
  ]
})

/* ---------- 图表数据 ---------- */
const mainRows = computed(() => {
  const m = countBy(base.value, 'main')
  return Object.keys(m).map((k) => ({ name: k, value: m[k], color: ITEM_COLORS[k] || '#909399' }))
    .sort((a, b) => b.value - a.value)
})
const systemRows = computed(() => {
  const m = countBy(base.value, 'system')
  const cols = { 黄浦江水系: '#017de4', 长江口水系: '#16b8b0', 杭州湾水系: '#7b8cff' }
  return WATER_SYSTEMS.filter((s) => m[s]).map((s) => ({ name: s, value: m[s], color: cols[s] || '#909399' }))
})
const distRows = computed(() => {
  const m = countBy(base.value, 'dist')
  return DISTRICTS.map((d) => ({ name: d, value: m[d] || 0 }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
})
const mgmtRows = computed(() => {
  const m = countBy(base.value, 'mgmt')
  return MGMT_TYPES.map((t) => ({ name: t, value: m[t] || 0 }))
})

function donut(rows) {
  const map = Object.fromEntries(rows.map((r) => [r.name, r.value]))
  return {
    title: {
      text: String(rows.reduce((a, r) => a + r.value, 0)),
      subtext: '站',
      left: '36%',
      top: '40%',
      textAlign: 'center',
      textStyle: { fontSize: 24, fontWeight: 700, color: '#17324a' },
      subtextStyle: { fontSize: 11, color: '#8a9aab' }
    },
    tooltip: { trigger: 'item', formatter: '{b}：{c} 站（{d}%）' },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 10,
      top: 'middle',
      itemWidth: 9,
      itemHeight: 9,
      itemGap: 10,
      textStyle: { fontSize: 11.5, color: '#5b6b7b' },
      formatter: (name) => `${name}(${map[name] || 0})`
    },
    series: [{
      type: 'pie',
      radius: ['48%', '70%'],
      center: ['36%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { scale: true, scaleSize: 6 },
      data: rows.map((r) => ({ name: r.name, value: r.value, itemStyle: { color: r.color } }))
    }]
  }
}

const mainOpt = computed(() => donut(mainRows.value))
const systemOpt = computed(() => donut(systemRows.value))

const distOpt = computed(() => ({
  grid: { left: 78, right: 52, top: 12, bottom: 18 },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  xAxis: {
    type: 'value',
    axisLabel: { fontSize: 10, color: '#8a9aab' },
    splitLine: { lineStyle: { color: '#eef2f6' } }
  },
  yAxis: {
    type: 'category',
    inverse: true,
    data: distRows.value.map((r) => r.name),
    axisLabel: { fontSize: 11, color: '#5b6b7b' },
    axisLine: { lineStyle: { color: '#dfe6ee' } },
    axisTick: { show: false }
  },
  series: [{
    type: 'bar',
    data: distRows.value.map((r) => r.value),
    barMaxWidth: 14,
    itemStyle: { color: '#017de4', borderRadius: [0, 2, 2, 0] },
    label: { show: true, position: 'right', fontSize: 10, color: '#5b6b7b' }
  }]
}))

/* ---------- 扩展维度统计 ---------- */
const DIMS = [
  { k: 'water', n: '测量水体' },
  { k: 'decade', n: '设站年代' },
  { k: 'district', n: '行政区划' },
  { k: 'item', n: '测验项目' },
  { k: 'flood', n: '报汛报旱等级' },
  { k: 'unit', n: '管理单位' },
  { k: 'func', n: '测站功能' }
]

const FLOOD_LEVELS = ['国家重点报汛站', '省级重点报汛站', '一般报汛站', '非常年报汛站']
const FUNCS = ['基本水文测报', '巡测', '驻测', '综合监测']
const PALETTE = ['#017de4', '#16b8b0', '#26a869', '#7b8cff', '#2b4c8c', '#4b6584',
  '#5aa9e6', '#0f9b8e', '#8ea7ff', '#6b7fa8', '#3aa9d6', '#58c0a8']

const dimOf = {
  water: (s) => {
    if (s.cat === '地下水') return '地下水'
    if (s.elems.includes('潮位')) return '感潮河段'
    if (s.tags.includes('闸站')) return '闸泵站'
    return '河道'
  },
  decade: (s) => `${Math.floor(s.year / 10) * 10} 年代`,
  district: (s) => s.dist,
  item: (s) => s.main,
  flood: (s) => FLOOD_LEVELS[hashStr(s.code + 'flood') % FLOOD_LEVELS.length],
  unit: (s) => (s.unit.includes('河道管理所') ? '河道管理所' : s.unit),
  func: (s) => FUNCS[hashStr(s.code + 'func') % FUNCS.length]
}

const ext = reactive({ dim: 'water', mode: 'bar' })
const dimName = computed(() => DIMS.find((d) => d.k === ext.dim).n)
const extRows = computed(() => {
  const m = countBy(base.value, dimOf[ext.dim])
  return Object.keys(m).map((k) => ({ name: k, value: m[k] })).sort((a, b) => b.value - a.value)
})
const extTop = computed(() => extRows.value.slice(0, 7))
const extTotal = computed(() => extRows.value.reduce((a, r) => a + r.value, 0))

const extOpt = computed(() => {
  if (ext.mode === 'donut') {
    const rows = extRows.value.map((r, i) => ({ ...r, color: PALETTE[i % PALETTE.length] }))
    const map = Object.fromEntries(rows.map((r) => [r.name, r.value]))
    return {
      title: {
        text: String(extTotal.value),
        subtext: '站',
        left: '32%',
        top: '42%',
        textAlign: 'center',
        textStyle: { fontSize: 22, fontWeight: 700, color: '#17324a' },
        subtextStyle: { fontSize: 11, color: '#8a9aab' }
      },
      tooltip: { trigger: 'item', formatter: '{b}：{c} 站（{d}%）' },
      legend: {
        type: 'scroll',
        orient: 'vertical',
        right: 10,
        top: 'middle',
        itemWidth: 9,
        itemHeight: 9,
        itemGap: 8,
        textStyle: { fontSize: 11.5, color: '#5b6b7b' },
        formatter: (name) => `${name}(${map[name] || 0})`
      },
      series: [{
        type: 'pie',
        radius: ['46%', '70%'],
        center: ['32%', '50%'],
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: rows.map((r) => ({ name: r.name, value: r.value, itemStyle: { color: r.color } }))
      }]
    }
  }
  return {
    grid: { left: 96, right: 56, top: 12, bottom: 24 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: '#8a9aab' },
      splitLine: { lineStyle: { color: '#eef2f6' } }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: extRows.value.map((r) => r.name),
      axisLabel: { fontSize: 11.5, color: '#5b6b7b' },
      axisLine: { lineStyle: { color: '#dfe6ee' } },
      axisTick: { show: false }
    },
    series: [{
      type: 'bar',
      data: extRows.value.map((r) => r.value),
      barMaxWidth: 15,
      itemStyle: { color: '#29a9f0', borderRadius: [0, 2, 2, 0] },
      label: { show: true, position: 'right', fontSize: 11, color: '#5b6b7b' }
    }]
  }
})

const mgmtOpt = computed(() => ({
  grid: { left: 52, right: 24, top: 22, bottom: 46 },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  xAxis: {
    type: 'category',
    data: mgmtRows.value.map((r) => r.name.replace('国家基本水文站', '基本站')),
    axisLabel: { fontSize: 10.5, color: '#7a8fa5', interval: 0, rotate: 12 },
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
    data: mgmtRows.value.map((r) => r.value),
    barMaxWidth: 26,
    itemStyle: { color: '#7b8cff', borderRadius: [2, 2, 0, 0] },
    label: { show: true, position: 'top', fontSize: 10, color: '#5b6b7b' }
  }]
}))
</script>

<style scoped>
.sta { height: 100%; overflow: auto; padding: 10px; display: flex; flex-direction: column; gap: 10px; }

/* 指标卡 */
.sta-tiles { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; flex: none; }
.tile {
  position: relative;
  background: #fff;
  border: 1px solid var(--bnd);
  border-left: 3px solid #017de4;
  border-radius: 4px;
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  min-height: 92px;
}
.tile.t-total { border-left-color: #017de4; }
.tile.t-q { border-left-color: #26a869; }
.tile.t-z { border-left-color: #017de4; }
.tile.t-r { border-left-color: #16b8b0; }
.tile.t-wq { border-left-color: #2b4c8c; }
.tile.t-gw { border-left-color: #4b6584; }
.t-main { min-width: 0; }
.t-l { font-size: 12.5px; color: #7a8fa5; }
.t-v { font-size: 26px; font-weight: 700; color: #17324a; line-height: 1.35; margin: 4px 0 2px; font-variant-numeric: tabular-nums; }
.t-u { font-size: 12px; font-weight: 400; color: #93a4b5; margin-left: 3px; }
.t-c { font-size: 11.5px; color: #93a4b5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.t-ico {
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

/* 筛选 */
.sta-filter {
  flex: none;
  display: flex;
  align-items: center;
  gap: 9px;
  background: #fff;
  border: 1px solid var(--bnd);
  border-radius: 4px;
  padding: 8px 12px;
}
.f-hd { font-size: 12.5px; font-weight: 700; color: #245c85; margin-right: 4px; }
.sta-filter select {
  height: 29px;
  min-width: 132px;
  border: 1px solid #d6dfe9;
  border-radius: 3px;
  padding: 0 8px;
  font-size: 12.5px;
  color: #303133;
  background: #fff;
  outline: none;
}
.sta-filter select:focus { border-color: #017de4; }
.f-reset {
  height: 29px;
  padding: 0 14px;
  border: 1px solid #d6dfe9;
  border-radius: 3px;
  background: #fff;
  color: #4a5a6a;
  font-size: 12.5px;
  cursor: pointer;
}
.f-reset:hover { border-color: #017de4; color: #017de4; }
.f-range {
  margin-left: auto;
  font-size: 12px;
  color: #017de4;
  background: #e8f3fd;
  border-radius: 12px;
  padding: 3px 12px;
}
.f-range b { font-size: 13px; }

/* 图表 */
.sta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.sta-grid .card .hd { font-weight: 700; }
.sta-grid .card .tag { margin-left: 6px; }
.sta-grid .card .bd { padding: 4px 8px 0; }

/* 扩展维度统计 */
.ext-card { flex: none; margin-bottom: 4px; }
.ext-hd { display: flex; align-items: center; gap: 10px; }
.ext-hd .ex-t { font-size: 14px; }
.ext-hd .ex-sub { font-size: 11.5px; color: #93a4b5; font-weight: 400; }
.ex-mode { margin-left: auto; display: flex; border: 1px solid #d6dfe9; border-radius: 3px; overflow: hidden; }
.ex-mode span { padding: 2px 14px; font-size: 12px; color: #5b6b7b; cursor: pointer; background: #fff; font-weight: 400; }
.ex-mode span.on { background: #017de4; color: #fff; }
.ext-tabs { display: flex; gap: 8px; padding: 10px 14px 2px; flex-wrap: wrap; }
.ext-tabs span {
  font-size: 12.5px;
  line-height: 24px;
  padding: 0 14px;
  border: 1px solid #dbe4ee;
  border-radius: 3px;
  color: #4a5a6a;
  cursor: pointer;
  background: #fff;
}
.ext-tabs span:hover { border-color: #7bb8ee; color: #017de4; }
.ext-tabs span.on { background: #017de4; border-color: #017de4; color: #fff; }
.ext-body { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 14px; padding: 6px 14px 14px; }
.ext-chart { min-width: 0; }
.ext-top { background: #fafcfe; border: 1px solid #eef2f6; border-radius: 4px; padding: 10px 12px; }
.top-hd { font-size: 12.5px; font-weight: 700; color: #35506a; margin-bottom: 6px; }
.top-list { max-height: 320px; overflow: auto; }
.top-i { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px dashed #eef2f6; }
.top-i:last-child { border-bottom: none; }
.rk {
  width: 20px;
  height: 20px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  background: #eef2f6;
  color: #8a94a3;
  font-size: 11px;
  font-weight: 700;
}
.rk.rk0, .rk.rk1, .rk.rk2 { background: #017de4; color: #fff; }
.tn { flex: 1; min-width: 0; font-size: 12.5px; color: #35506a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.top-i b { font-size: 13px; color: #17324a; font-variant-numeric: tabular-nums; }
.top-empty { color: #93a4b5; font-size: 12.5px; padding: 20px 0; text-align: center; }

@media (max-width: 1500px) {
  .sta-tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 1100px) {
  .sta-grid { grid-template-columns: 1fr; }
}
</style>
