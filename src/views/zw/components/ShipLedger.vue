<template>
  <div class="sl">
    <div class="sl-alert" :class="{ on: alerts.total }">
      <span class="ai">!</span>
      <span>共 <b>{{ SHIPS.length }}</b> 艘船舶，<b>{{ alerts.total }}</b> 项证件临期（7 天内 <b class="urg">{{ alerts.urgent }}</b> 项，30 天内 <b>{{ alerts.near }}</b> 项）</span>
      <label class="chk"><input v-model="onlyAlert" type="checkbox" />只看临期船舶</label>
      <div class="sl-ops"><ExportButton @export="exportList" /></div>
    </div>

    <div class="card sl-table">
      <div class="hd">水文巡测船舶台账<span class="tag">基准日 {{ TODAY }}</span></div>
      <div class="bd" style="padding: 0">
        <table class="dt">
          <thead>
            <tr>
              <th style="width: 56px">序号</th>
              <th style="width: 120px">船名</th>
              <th style="width: 150px">船舶登记号</th>
              <th style="width: 150px">所属中队</th>
              <th style="width: 90px">建造年份</th>
              <th style="width: 90px">核定载员</th>
              <th style="width: 90px">总吨位</th>
              <th style="width: 90px">船长</th>
              <th style="width: 80px">状态</th>
              <th style="width: 110px">证件临期</th>
              <th style="width: 70px">操作</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(s, i) in rows" :key="s.id">
              <tr>
                <td class="muted">{{ i + 1 }}</td>
                <td><b>{{ s.id }}</b></td>
                <td>{{ s.no }}</td>
                <td>{{ s.team }}</td>
                <td class="num">{{ s.year }}</td>
                <td class="num">{{ s.crew }}</td>
                <td class="num">{{ s.ton.toFixed(1) }}</td>
                <td>{{ s.captain }}</td>
                <td><span class="st" :class="stKey(s.status)">{{ s.status }}</span></td>
                <td>
                  <span v-if="alertOf(s.id).urgent" class="lv urg">紧急 {{ alertOf(s.id).urgent }}</span>
                  <span v-if="alertOf(s.id).near" class="lv near">临期 {{ alertOf(s.id).near }}</span>
                  <span v-if="!alertOf(s.id).total" class="lv ok">正常</span>
                </td>
                <td><a class="lnk" @click="toggle(s.id)">{{ expanded === s.id ? '收起' : '证件' }}</a></td>
              </tr>
              <tr v-if="expanded === s.id" class="sub-row">
                <td colspan="11">
                  <table class="cert-tb">
                    <thead>
                      <tr><th>证件类型</th><th>证件编号</th><th>有效期至</th><th>剩余天数</th><th>状态</th></tr>
                    </thead>
                    <tbody>
                      <tr v-for="c in certsOf(s.id)" :key="c.type">
                        <td>{{ c.type }}</td>
                        <td>{{ c.no }}</td>
                        <td>{{ c.expire }}</td>
                        <td :class="{ urg: c.days <= 7, near: c.days > 7 && c.days <= 30 }">{{ c.days }} 天</td>
                        <td><span class="lv" :class="certLevel(c.days).k">{{ certLevel(c.days).n }}</span></td>
                      </tr>
                    </tbody>
                  </table>
                  <div class="cert-note">证件到期前 30 日自动提醒，7 日内未换新将暂停派船。</div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { SHIPS, TODAY, certsOf, certLevel, shipAlerts } from '@/data/ships'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'

const onlyAlert = ref(false)
const expanded = ref('')
const alerts = shipAlerts()

const alertMap = computed(() => {
  const m = {}
  for (const s of SHIPS) {
    let urgent = 0
    let near = 0
    for (const c of certsOf(s.id)) {
      if (c.days <= 7) urgent++
      else if (c.days <= 30) near++
    }
    m[s.id] = { urgent, near, total: urgent + near }
  }
  return m
})
const alertOf = (id) => alertMap.value[id] || { urgent: 0, near: 0, total: 0 }

const rows = computed(() => (onlyAlert.value ? SHIPS.filter((s) => alertOf(s.id).total > 0) : SHIPS))

const stKey = (s) => ({ 在航: 'sail', 停泊: 'moor', 维修: 'fix' }[s] || '')
function toggle(id) { expanded.value = expanded.value === id ? '' : id }

function exportList() {
  const head = ['船名', '船舶登记号', '所属中队', '建造年份', '核定载员', '总吨位', '船长', '状态', '7天内到期', '30天内到期']
  const lines = rows.value.map((s) => [
    s.id, s.no, s.team, s.year, s.crew, s.ton.toFixed(1), s.captain, s.status,
    alertOf(s.id).urgent, alertOf(s.id).near
  ])
  downloadCsv('水文巡测船舶台账.csv', head, lines)
}
</script>

<style scoped>
.sl { display: flex; flex-direction: column; gap: 10px; }
.sl-alert {
  flex: none; display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: #35506a;
  background: #fff; border: 1px solid var(--bnd); border-radius: 4px; padding: 9px 12px;
}
.sl-alert.on { border-color: #f0d8a8; background: #fffdf7; }
.ai {
  width: 18px; height: 18px; border-radius: 50%; background: #f0a020; color: #fff;
  font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;
}
.sl-alert b { color: #17324a; }
.sl-alert b.urg { color: #f56c6c; }
.chk { display: inline-flex; align-items: center; gap: 4px; margin-left: 8px; color: #5b6b7b; cursor: pointer; }
.chk input { accent-color: #017de4; }
.sl-ops { margin-left: auto; }

.sl-table { flex: 1; min-height: 0; }
.sl-table .bd { overflow: auto; }
.st { font-size: 11px; padding: 1px 6px; border-radius: 2px; }
.st.sail { color: #017de4; background: #eef6fe; }
.st.moor { color: #26a869; background: #eef8f2; }
.st.fix { color: #8a94a3; background: #f4f5f7; }
.lv { font-size: 11px; padding: 1px 6px; border-radius: 2px; white-space: nowrap; margin-right: 3px; }
.lv.urg, .lv.urgent { color: #f56c6c; background: #fef0f0; font-weight: 700; }
.lv.near { color: #b8860b; background: #fdf8e8; }
.lv.ok { color: #26a869; background: #eef8f2; }
.lnk { color: #017de4; cursor: pointer; }
.lnk:hover { text-decoration: underline; }
.sub-row > td { background: #fafcfe; padding: 8px 16px 10px !important; }
.cert-tb { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.cert-tb th, .cert-tb td { border: 1px solid #e6edf5; padding: 5px 8px; text-align: center; }
.cert-tb th { background: #f2f7fc; color: #245c85; }
.cert-tb td.urg { color: #f56c6c; font-weight: 700; }
.cert-tb td.near { color: #b8860b; font-weight: 700; }
.cert-note { margin-top: 6px; font-size: 11.5px; color: #93a4b5; }
</style>
