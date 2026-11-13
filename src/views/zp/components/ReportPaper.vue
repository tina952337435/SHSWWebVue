<template>
  <div class="paper">
    <div class="p-head">
      <img class="p-logo" :src="logoUrl" alt="上海水文" />
      <h1>生态流量月报</h1>
    </div>
    <div class="p-issue">{{ report.issue }}</div>
    <h2>{{ report.name }}</h2>

    <h3>一、总体情况</h3>
    <p>
      {{ report.month }}月，全市纳入生态流量（水位）保障的 12 个控制断面中，实测数据完整率
      <b>{{ report.completeness }}%</b>，数据质量满足月报编制要求。其中黄浦江松浦大桥断面、淀山湖-元荡断面已纳入全国重点河湖生态流量（水位）保障名录，按要求向水利部及流域管理机构报送月度监管自评估报告。本月全市重点河湖生态流量总体保障情况{{ report.overall >= 96 ? '良好' : '基本平稳' }}。
    </p>

    <h3>二、目标保障情况</h3>
    <p>
      本月全市重点河湖生态流量（水位）目标保障率为 <b>{{ report.overall }}%</b>，
      较上月{{ report.momDiff >= 0 ? '上升' : '下降' }} {{ Math.abs(report.momDiff) }} 个百分点，
      较去年同期{{ report.yoyDiff >= 0 ? '上升' : '下降' }} {{ Math.abs(report.yoyDiff) }} 个百分点。
      12 个保障断面中 {{ report.full }} 个完全达标、{{ report.basic }} 个基本达标、{{ report.fail }} 个未达到月度目标要求。
    </p>

    <table class="p-tbl">
      <thead>
        <tr>
          <th style="width:44px">序号</th>
          <th style="width:100px">河道</th>
          <th style="width:126px">断面</th>
          <th>生态目标<br />(m³/s)</th>
          <th>月均实测<br />(m³/s)</th>
          <th>月最低<br />(m³/s)</th>
          <th>保障率</th>
          <th style="width:64px">达标</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, i) in report.rows" :key="r.name">
          <td>{{ i + 1 }}</td>
          <td>{{ r.river }}</td>
          <td>{{ r.name }}</td>
          <td>{{ fmt(r.q) }}</td>
          <td>{{ fmt(r.mean) }}</td>
          <td>{{ fmt(r.min) }}</td>
          <td>{{ r.rate.toFixed(1) }}%</td>
          <td :class="r.met ? 'ok' : 'no'">{{ r.met ? '达标' : '未达标' }}</td>
        </tr>
      </tbody>
    </table>
    <p class="p-note">注：保障率 = 达标时段数 / 有效时段数 × 100%；月最低指本月日平均值中的最小值。水位统一采用吴淞基面。</p>

    <h3>三、预警情况</h3>
    <p>
      本月共产生预警事件 <b>{{ report.warnings.total }}</b> 次，均已按《上海市生态流量预警方案》要求通知相关责任单位并完成处置反馈。本市重点河道生态水位保障程度均保持在 90% 以上。
    </p>

    <h3>四、工作建议</h3>
    <p>
      <template v-if="report.failing.length">
        建议对{{ report.failing.map((r) => r.name).join('、') }}断面持续跟踪，结合长江口咸潮入侵过程与台风期来水变化，加强与海塘、水闸调度协同，保障下月生态流量目标稳定达标。
      </template>
      <template v-else>
        本月 12 个保障断面全部达到月度目标要求。建议继续保持现有调度方案，加强跨省断面数据共享与比对，做好下月保障形势研判。
      </template>
    </p>

    <div class="p-foot">
      <!-- 次月 5 日发布：12 月报对应次年 1 月 -->
      <div>
        {{ report.month === 12 ? report.year + 1 : report.year }}年{{
          report.month + 1 > 12 ? 1 : report.month + 1
        }}月5日
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  report: { type: Object, required: true }
})

const logoUrl = `${import.meta.env.BASE_URL}images/logo.png`
const fmt = (v) => v.toLocaleString('en-US')
</script>
