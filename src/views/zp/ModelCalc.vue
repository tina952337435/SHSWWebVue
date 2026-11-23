<template>
  <div class="mc">
    <!-- 条件栏 -->
    <div class="io-cond">
      <div class="io-fld">
        <label>年份</label>
        <select v-model.number="year" style="width:120px">
          <option v-for="y in YEARS" :key="y" :value="y">{{ y }} 年</option>
        </select>
      </div>
      <div class="io-fld">
        <label>月份</label>
        <select v-model.number="month" style="width:110px">
          <option v-for="m in MONTHS" :key="m" :value="m">{{ m }} 月</option>
        </select>
      </div>

      <div class="io-scale">
        <span class="sc-lb">统计维度</span>
        <div class="sc-tabs">
          <span
            v-for="d in DIMS" :key="d.k"
            class="sc-item" :class="{ on: dim === d.k }"
            @click="dim = d.k"
          >{{ d.n }}</span>
        </div>
      </div>

      <div class="mc-ops">
        <div class="mc-model" :class="{ offline: !online }">
          <i class="dot"></i>模型{{ online ? '在线' : '离线' }}
        </div>
        <button class="mc-run" type="button" :disabled="busy" @click="doExtract">
          <span class="ck">{{ extracting ? '⟳' : '⬇' }}</span>{{ extracting ? '提取中…' : '提取' }}
        </button>
        <button class="mc-recalc" type="button" :disabled="busy || !result" @click="doRecalc">
          <span class="ck">⚡</span>{{ recalculating ? '重算中…' : '重算' }}
        </button>
      </div>
    </div>

    <div class="mc-body">
      <!-- 未提取 -->
      <div v-if="!result" class="mc-empty">
        <div class="mc-empty-ic">⬇</div>
        <div class="t1">暂无提取结果</div>
        <div class="t2">选择年份和月份后点击「提取」，获取慧水模型当月计算成果<br />若结果不合理，可点击「重算」由后台重新计算后再提取</div>
      </div>

      <template v-else>
        <!-- 过程线 -->
        <div class="card mc-chart">
          <div class="hd">
            {{ year }} 年 {{ month }} 月逐日水资源量
            <span class="tag">提取于 {{ lastExtract }} · 结果版本 v{{ version }}</span>
          </div>
          <div class="bd">
            <BarChart v-if="chartOption" :option="chartOption" :height="230" />
          </div>
        </div>

        <!-- 汇总表 -->
        <div class="card mc-table">
          <div class="hd">
            {{ dimName }}水资源量汇总
            <span class="tag">共 {{ result.summary.length }} 个统计单元</span>
          </div>
          <div class="bd">
            <table class="dt">
              <thead>
                <tr>
                  <th style="width:56px">序号</th>
                  <th>{{ dimName }}</th>
                  <th class="num" style="width:110px">面积占比</th>
                  <th class="num" style="width:150px">模型值(亿m³)</th>
                  <th class="num" style="width:160px">传统算法(亿m³)</th>
                  <th class="num" style="width:100px">偏差</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in result.summary" :key="r.name">
                  <td class="muted">{{ r.idx }}</td>
                  <td><b>{{ r.name }}</b></td>
                  <td class="num">{{ r.share }}%</td>
                  <td class="num">{{ r.v.toFixed(3) }}</td>
                  <td class="num">{{ r.ref.toFixed(3) }}</td>
                  <td class="num">{{ r.diff > 0 ? '+' : '' }}{{ r.diff.toFixed(1) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>

    <!-- 重算进度遮罩 -->
    <div v-if="recalculating" class="mc-mask">
      <div class="mc-pop">
        <div class="spin"></div>
        <div class="t1">模型后台重算中</div>
        <div class="t2">正在重新计算 {{ year }} 年 {{ month }} 月水资源量…</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import BarChart from '@/components/BarChart.vue'
import { DIMS, YEARS, MONTHS, extractMonth } from '@/data/modelCalc'

const now = new Date()
const pad = (n) => String(n).padStart(2, '0')

const year = ref(now.getFullYear())
const month = ref(now.getMonth() === 0 ? 12 : now.getMonth()) // 默认上个月
const dim = ref('adm')

const online = ref(true)
const extracting = ref(false)
const recalculating = ref(false)
const busy = computed(() => extracting.value || recalculating.value)

const result = ref(null)
const lastExtract = ref('')
const version = ref(1)

const dimName = computed(() => (DIMS.find((d) => d.k === dim.value) || {}).n || '行政区')

function stamp() {
  const d = new Date()
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 提取：向模型取当月成果 */
function doExtract() {
  if (busy.value) return
  if (!online.value) {
    ElMessage.warning({ message: '模型当前离线，无法提取，请稍后重试', offset: 78 })
    return
  }
  extracting.value = true
  setTimeout(() => {
    result.value = extractMonth(year.value, month.value, 'hour', dim.value, version.value)
    lastExtract.value = stamp()
    extracting.value = false
  }, 600)
}

/** 重算：提交后台重新计算，完成后自动再次提取 */
function doRecalc() {
  if (busy.value) return
  if (!online.value) {
    ElMessage.warning({ message: '模型当前离线，无法重算', offset: 78 })
    return
  }
  recalculating.value = true
  setTimeout(() => {
    version.value += 1
    online.value = true
    recalculating.value = false
    doExtract()
  }, 1800)
}

const chartOption = computed(() => {
  const r = result.value
  if (!r || !r.daily.length) return null
  return {
    grid: { left: 62, right: 24, top: 34, bottom: 36 },
    legend: {
      top: 0, right: 8, itemWidth: 12, itemHeight: 12, itemGap: 16,
      icon: 'roundRect', textStyle: { fontSize: 12, color: '#606266' }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (ps) => {
        const p = r.daily[ps[0].dataIndex]
        if (!p) return ''
        const d = (((p.v - p.ref) / p.ref) * 100).toFixed(1)
        return `${year.value}年${p.label}<br/>模型计算：<b>${p.v.toFixed(3)}</b> 亿m³<br/>传统算法：${p.ref.toFixed(3)} 亿m³<br/>偏差 ${d}%`
      }
    },
    xAxis: {
      type: 'category',
      data: r.daily.map((p) => p.date),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisLabel: { fontSize: 11, color: '#909399', margin: 10, hideOverlap: true }
    },
    yAxis: {
      type: 'value',
      name: '亿m³',
      nameTextStyle: { fontSize: 11, color: '#909399' },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 11, color: '#606266', formatter: (v) => v.toFixed(2) },
      splitLine: { lineStyle: { color: '#f0f2f5' } }
    },
    series: [
      {
        name: '模型计算值',
        type: 'line',
        smooth: 0.2,
        showSymbol: false,
        lineStyle: { width: 2, color: '#017de4' },
        itemStyle: { color: '#017de4' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(1,125,228,.20)' },
              { offset: 1, color: 'rgba(1,125,228,.02)' }
            ]
          }
        },
        data: r.daily.map((p) => p.v)
      },
      {
        name: '传统算法',
        type: 'line',
        smooth: 0.2,
        showSymbol: false,
        lineStyle: { width: 1.4, color: '#26a869', type: 'dashed' },
        itemStyle: { color: '#26a869' },
        data: r.daily.map((p) => p.ref)
      }
    ]
  }
})
</script>

<style scoped>
.mc { position: relative; display: flex; flex-direction: column; height: 100%; background: #f2f4f7; }
.mc-body {
  flex: 1; min-height: 0; overflow: auto; padding: 10px;
  display: flex; flex-direction: column; gap: 10px;
}

.sc-lb { font-size: 13px; color: var(--txt2); margin-right: 8px; white-space: nowrap; }
.io-scale { display: flex; align-items: center; }

.mc-ops { margin-left: auto; display: flex; align-items: center; gap: 12px; }

/* 模型在线状态 */
.mc-model {
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px;
  border-radius: 15px; font-size: 13px; color: #1f8a55; background: #eaf7ef;
  border: 1px solid #c9e9d6; white-space: nowrap;
}
.mc-model .dot {
  width: 7px; height: 7px; border-radius: 50%; background: #26a869;
  box-shadow: 0 0 0 3px rgba(38, 168, 105, .18);
}
.mc-model.offline { color: #8a94a3; background: #f2f4f7; border-color: #e2e8ee; }
.mc-model.offline .dot { background: #b0bcc9; box-shadow: none; }

.mc-run, .mc-recalc {
  display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 18px;
  border-radius: 6px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer;
}
.mc-run {
  border: none; color: #fff; background: linear-gradient(180deg, #1c86e8, #017de4);
  box-shadow: 0 4px 12px rgba(1, 125, 228, .26);
}
.mc-recalc {
  border: 1px solid #b7ddc7; background: #f2fbf6; color: #1f9d62;
}
.mc-run:hover:not(:disabled) { filter: brightness(1.06); }
.mc-recalc:hover:not(:disabled) { background: #e6f7ee; }
.mc-run:disabled, .mc-recalc:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }
.ck { font-size: 13px; }

/* 空状态 */
.mc-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; color: var(--txt3);
}
.mc-empty-ic {
  width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 26px; color: #9dc3e8; background: #eaf2fb; margin-bottom: 8px;
}
.mc-empty .t1 { font-size: 16px; font-weight: 700; color: var(--txt2); }
.mc-empty .t2 { font-size: 13px; line-height: 1.9; text-align: center; }

.mc-chart { flex: none; }
.mc-chart .bd { padding: 6px 10px 0; }
.mc-table { flex: none; }
.mc-table .bd { padding: 0; }
.mc-table table.dt td { height: 38px; }

/* 重算遮罩 */
.mc-mask {
  position: absolute; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center;
  background: rgba(13, 35, 58, .28);
}
.mc-pop {
  min-width: 320px; padding: 26px 34px; text-align: center; background: #fff;
  border-radius: 10px; box-shadow: 0 20px 50px rgba(10, 35, 60, .3);
}
.mc-pop .spin {
  width: 34px; height: 34px; margin: 0 auto 14px; border-radius: 50%;
  border: 3px solid #dbe8fa; border-top-color: #017de4; animation: mcSpin .8s linear infinite;
}
@keyframes mcSpin { to { transform: rotate(360deg) } }
.mc-pop .t1 { font-size: 15px; font-weight: 700; color: #1f2d3d; }
.mc-pop .t2 { margin-top: 6px; font-size: 12.5px; color: #8296a8; }
</style>
