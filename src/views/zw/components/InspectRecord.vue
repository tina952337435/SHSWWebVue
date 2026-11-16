<template>
  <div class="ir">
    <div class="ir-cond">
      <span class="lb">测站</span>
      <select v-model="code">
        <option v-for="s in STATIONS" :key="s.code" :value="s.code">{{ s.nm }}（{{ s.code }}）</option>
      </select>
      <span class="lb">巡检记录</span>
      <select v-model.number="idx">
        <option v-for="(r, i) in records" :key="r.id" :value="i">{{ r.date }} · {{ r.id }}</option>
      </select>
      <span class="hint">模板：上海市水文测站巡检记录表（{{ totalItems }} 项）</span>
      <div class="ir-ops"><ExportButton @export="exportSheet" /></div>
    </div>

    <div class="card ir-card">
      <div class="hd">
        上海市水文测站巡检记录表
        <span class="tag">{{ cur.date }} · {{ cur.id }}</span>
      </div>
      <div class="bd">
        <table class="ir-head">
          <tr>
            <th>测站名称</th><td>{{ station.nm }}</td>
            <th>站码</th><td>{{ station.code }}</td>
            <th>巡检日期</th><td>{{ cur.date }}</td>
          </tr>
          <tr>
            <th>巡检人</th><td>{{ cur.man }}</td>
            <th>所属中队</th><td>{{ cur.team }}</td>
            <th>天气</th><td>{{ cur.weather }}</td>
          </tr>
        </table>

        <table class="ir-tb">
          <thead>
            <tr>
              <th style="width: 120px">检查项目</th>
              <th>检查内容</th>
              <th style="width: 230px">检查结果</th>
              <th style="width: 200px">备注</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="g in cur.groups" :key="g.g">
              <tr v-for="(it, i) in g.items" :key="g.g + i">
                <td v-if="i === 0" :rowspan="g.items.length" class="grp">{{ g.g }}</td>
                <td class="item">{{ it.n }}</td>
                <td>
                  <div class="res">
                    <span
                      v-for="v in ['正常', '异常', '不适用']"
                      :key="v"
                      class="rv"
                      :class="[v === '正常' ? 'ok' : v === '异常' ? 'bad' : 'na', { on: it.v === v }]"
                      @click="it.v = v"
                    >{{ v }}</span>
                  </div>
                </td>
                <td><input v-model="it.note" class="note" type="text" :placeholder="it.v === '异常' ? '请填写异常情况' : '—'" /></td>
              </tr>
            </template>
          </tbody>
        </table>

        <div class="ir-foot">
          <div class="foot-row">
            <span>检查结论：</span>
            <b :class="{ bad: abnormal }">{{ abnormal ? `发现 ${abnormal} 项异常，已现场处理或列入工单` : '各检查项正常' }}</b>
          </div>
          <div class="foot-row sign">
            <span>巡检人签字：{{ cur.man }}</span>
            <span>测站负责人签字：{{ owner }}</span>
            <span>日期：{{ cur.date }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { STATIONS, hashStr } from '@/data/stationNetwork'
import { inspectRecords } from '@/data/workOrders'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'

const code = ref(STATIONS[0].code)
const records = ref(inspectRecords(code.value))
const idx = ref(0)
watch(code, () => {
  records.value = inspectRecords(code.value)
  idx.value = 0
})
const cur = computed(() => records.value[Math.min(idx.value, records.value.length - 1)])
const station = computed(() => STATIONS.find((s) => s.code === code.value) || STATIONS[0])
const owner = computed(() => ['张伟', '李强', '王磊', '陈晨', '刘洋'][hashStr(code.value) % 5])

const totalItems = computed(() => cur.value.groups.reduce((a, g) => a + g.items.length, 0))
const abnormal = computed(() => cur.value.groups.flatMap((g) => g.items).filter((x) => x.v === '异常').length)

function exportSheet() {
  const head = ['检查项目', '检查内容', '检查结果', '备注']
  const lines = []
  for (const g of cur.value.groups) {
    for (const it of g.items) lines.push([g.g, it.n, it.v, it.note || ''])
  }
  downloadCsv(`巡检记录表_${station.value.nm}_${cur.value.date}.csv`, head, lines)
}
</script>

<style scoped>
.ir { display: flex; flex-direction: column; gap: 10px; }
.ir-cond { flex: none; background: #fff; border: 1px solid var(--bnd); border-radius: 4px; padding: 9px 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ir-cond .lb { font-size: 12.5px; color: #7a8fa5; }
.ir-cond select { height: 28px; border: 1px solid #d6dfe9; border-radius: 3px; padding: 0 6px; font-size: 12.5px; outline: none; background: #fff; max-width: 300px; }
.ir-cond select:focus { border-color: #017de4; }
.ir-cond .hint { font-size: 12px; color: #8a9aab; }
.ir-ops { margin-left: auto; }

.ir-card { flex: 1; min-height: 0; }
.ir-card .bd { overflow: auto; padding: 12px 16px 16px; }
.ir-head { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 12px; }
.ir-head th, .ir-head td { border: 1px solid #e6edf5; padding: 6px 9px; text-align: left; }
.ir-head th { background: #fafcfe; color: #7a8fa5; font-weight: 400; width: 92px; white-space: nowrap; }
.ir-head td { color: #17324a; }

.ir-tb { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.ir-tb th, .ir-tb td { border: 1px solid #e6edf5; padding: 6px 9px; text-align: center; }
.ir-tb th { background: #f5f9fe; color: #245c85; font-weight: 700; }
.ir-tb .grp { background: #fafcfe; color: #35506a; font-weight: 700; vertical-align: middle; }
.ir-tb .item { text-align: left; padding-left: 14px; }
.res { display: flex; gap: 4px; justify-content: center; }
.rv { font-size: 11.5px; padding: 1px 8px; border: 1px solid #e0e7f0; border-radius: 2px; color: #8a94a3; cursor: pointer; user-select: none; }
.rv.ok.on { background: #eef8f2; border-color: #26a869; color: #26a869; font-weight: 700; }
.rv.bad.on { background: #fef0f0; border-color: #f56c6c; color: #f56c6c; font-weight: 700; }
.rv.na.on { background: #f4f5f7; border-color: #a8b3bd; color: #6b7c8f; font-weight: 700; }
.note { width: 100%; border: 1px solid transparent; background: transparent; padding: 3px 6px; font-size: 12px; outline: none; }
.note:focus { border-color: #017de4; background: #fff; border-radius: 2px; }

.ir-foot { margin-top: 14px; font-size: 12.5px; color: #5b6b7b; }
.foot-row { padding: 5px 0; }
.foot-row b { color: #26a869; }
.foot-row b.bad { color: #f56c6c; }
.foot-row.sign { display: flex; gap: 40px; flex-wrap: wrap; color: #35506a; border-top: 1px dashed #e4ebf3; padding-top: 10px; margin-top: 4px; }
</style>
