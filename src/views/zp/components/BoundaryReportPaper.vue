<template>
  <div class="paper">
    <div class="p-head">
      <img class="p-logo" :src="logoUrl" alt="上海水文" />
      <h1>边界来水监测月报</h1>
    </div>
    <div class="p-issue">{{ report.issue }}</div>
    <h2>{{ report.name }}</h2>

    <h3>一、总体来水情况</h3>
    <p>
      {{ report.month }}月，全市边界来水监测共 {{ report.stations.length }} 处口门，累计来水量
      <b>{{ f2(report.total) }} 亿m³</b>，日均来水 <b>{{ f2(report.daily) }} 亿m³</b>。
      其中沪苏边界来水 {{ f2(groups.hs) }} 亿m³，占 {{ pct(groups.hs) }}%；沪浙边界来水
      {{ f2(groups.hz) }} 亿m³，占 {{ pct(groups.hz) }}%。
    </p>

    <h3>二、分口门来水量</h3>
    <table class="p-tbl">
      <thead>
        <tr>
          <th style="width:44px">序号</th>
          <th style="width:150px">来水口门</th>
          <th style="width:100px">所属边界</th>
          <th>月来水量<br />(亿m³)</th>
          <th>占全市来水<br />(%)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(s, i) in report.stations" :key="s.name">
          <td>{{ i + 1 }}</td>
          <td>{{ s.name }}</td>
          <td>{{ s.group }}</td>
          <td>{{ f2(s.inn) }}</td>
          <td>{{ pct(s.inn) }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="sum">
          <td colspan="3">合计</td>
          <td>{{ f2(report.total) }}</td>
          <td>100.0</td>
        </tr>
      </tfoot>
    </table>
    <p class="p-note">
      注：来水量为各口门逐日入上海水量累计；统计期为 {{ report.period }}，共 {{ report.days }} 天。
    </p>

    <h3>三、主要来水口门</h3>
    <p>
      本月来水以 <b>{{ report.top }}</b> 为主，月来水量 <b>{{ f2(topInn) }} 亿m³</b>，
      占全市边界来水量的 <b>{{ pct(topInn) }}%</b>。其余口门来水量保持在常年同期水平区间内，
      未见明显异常。
    </p>

    <h3>四、情况说明</h3>
    <p>
      边界来水量主要受区域降雨、上游来水及沿江水闸调度影响。本月来水过程总体平稳，
      建议持续跟踪沪苏、沪浙省界断面水量变化，加强与水务、气象部门的信息共享，
      为下月水资源量核算与出入境评价提供可靠依据。
    </p>

    <div class="p-foot">
      <div>
        {{ report.month === 12 ? report.year + 1 : report.year }}年{{
          report.month + 1 > 12 ? 1 : report.month + 1
        }}月5日
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  report: { type: Object, required: true }
})

const logoUrl = `${import.meta.env.BASE_URL}images/logo.png`
const f2 = (v) => Number(v || 0).toFixed(2)
const pct = (v) => (props.report.total ? ((Number(v) / Number(props.report.total)) * 100).toFixed(1) : '0.0')

const groups = computed(() => {
  const g = { hs: 0, hz: 0 }
  props.report.stations.forEach((s) => {
    if (s.group === '沪苏边界') g.hs += Number(s.inn)
    else if (s.group === '沪浙边界') g.hz += Number(s.inn)
  })
  return g
})

const topInn = computed(() => {
  const s = props.report.stations.find((x) => x.name === props.report.top)
  return s ? Number(s.inn) : 0
})
</script>

<style scoped>
.p-tbl tfoot td { background: #f2f4f7; font-family: "SimHei", "黑体", sans-serif; font-weight: 700; }
</style>
