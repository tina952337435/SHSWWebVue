<template>
  <div class="ew">
    <div class="ew-body">
      <div class="io-stats">
        <div class="io-stat">
          <div class="st-l">预警发布</div>
          <div class="st-v" style="color:#d43d42">{{ counts.published }}<span class="st-u">条</span></div>
        </div>
        <div class="io-stat">
          <div class="st-l">区县确认</div>
          <div class="st-v" style="color:#0b6bb5">{{ counts.confirm }}<span class="st-u">条</span></div>
        </div>
        <div class="io-stat">
          <div class="st-l">会商处置</div>
          <div class="st-v" style="color:#e08a2e">{{ counts.handle }}<span class="st-u">条</span></div>
        </div>
        <div class="io-stat">
          <div class="st-l">已归档</div>
          <div class="st-v" style="color:#1f9d62">{{ counts.archive }}<span class="st-u">条</span></div>
        </div>
      </div>

      <div class="card ew-table">
        <div class="ew-toolbar">
          <span class="ew-tip">共 {{ records.length }} 条预警发布记录</span>
          <span class="ew-ops"><ExportButton @export="exportCsv" /></span>
        </div>
        <div class="bd">
          <table class="dt">
            <thead>
              <tr>
                <th style="width:56px">序号</th>
                <th style="width:150px">发布时间</th>
                <th style="width:110px">断面</th>
                <th class="num" style="width:110px">预降水位(m)</th>
                <th>情况说明</th>
                <th style="width:96px">流程状态</th>
                <th style="width:70px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in records" :key="r.id" @click="openDetail(r)">
                <td class="muted">{{ i + 1 }}</td>
                <td class="num">{{ r.time }}</td>
                <td><b>{{ r.section }}</b></td>
                <td class="num">{{ r.level || '—' }}</td>
                <td class="desc" :title="r.desc">{{ r.desc }}</td>
                <td><span class="wfs" :class="r.status">{{ flowName(r.status) }}</span></td>
                <td><button class="wview" type="button" @click.stop="openDetail(r)">查看</button></td>
              </tr>
              <tr v-if="!records.length">
                <td colspan="7" class="empty">暂无预警发布记录，可在「监测总览」右上角点击预警发布</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 记录明细弹窗 -->
    <div v-if="detail" class="warn-mask" @click.self="closeDetail">
      <div class="warn-pop">
        <div class="wp-hd">
          <div>
            <div class="wp-title">预警记录明细</div>
            <div class="wp-sub">{{ detail.section }} · {{ detail.time }}</div>
          </div>
          <button class="wp-x" type="button" @click="closeDetail">×</button>
        </div>
        <div class="wp-bd">
          <div class="wp-grid">
            <div class="wp-k">断面</div>
            <div class="wp-v">{{ detail.section }}<span v-if="detailRiver" class="muted">（{{ detailRiver }}）</span></div>
            <div class="wp-k">预降水位</div>
            <div class="wp-v">{{ detail.level ? detail.level + ' m' : '—' }}</div>
            <div class="wp-k">发布时间</div>
            <div class="wp-v">{{ detail.time }}</div>
            <div class="wp-k">当前环节</div>
            <div class="wp-v"><span class="wfs" :class="detail.status">{{ flowName(detail.status) }}</span></div>
            <div class="wp-k">情况说明</div>
            <div class="wp-v" style="line-height:1.7">{{ detail.desc }}</div>
          </div>

          <div class="wp-flow-title">上报流程</div>
          <div class="wd-flow">
            <template v-for="(s, i) in WARN_FLOW" :key="s.k">
              <div class="wd-step" :class="{ done: i < curIdx, cur: i === curIdx }">
                <div class="wd-dot">{{ i < curIdx ? '✓' : i + 1 }}</div>
                <div class="wd-nm">{{ s.n }}</div>
              </div>
              <div v-if="i < WARN_FLOW.length - 1" class="wd-conn" :class="{ done: i < curIdx }"></div>
            </template>
          </div>
        </div>
        <div class="wp-ft">
          <button class="wp-btn" type="button" @click="closeDetail">关闭</button>
          <button v-if="curIdx < WARN_FLOW.length - 1" class="wp-btn primary" type="button" @click="advance">推进到下一环节</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { records, WARN_FLOW, flowName, advanceRecord } from '@/store/ecoWarnRecords'
import { ECO_SECTIONS } from '@/data/ecoFlow'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'

const sectionMap = Object.fromEntries(ECO_SECTIONS.map((s) => [s.name, s]))

const detail = ref(null)
const curIdx = computed(() => (detail.value ? WARN_FLOW.findIndex((s) => s.k === detail.value.status) : -1))
const detailRiver = computed(() => {
  if (!detail.value) return ''
  const s = sectionMap[detail.value.section]
  return s ? s.river : ''
})

const counts = computed(() => {
  const c = { published: 0, confirm: 0, handle: 0, archive: 0 }
  records.value.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1 })
  return c
})

function openDetail(r) { detail.value = r }
function closeDetail() { detail.value = null }
function advance() {
  if (!detail.value) return
  advanceRecord(detail.value.id)
}

function exportCsv() {
  const head = ['序号', '发布时间', '断面', '预降水位(m)', '情况说明', '流程状态']
  const lines = records.value.map((r, i) => [i + 1, r.time, r.section, r.level || '—', r.desc, flowName(r.status)])
  downloadCsv('生态流量预警发布记录.csv', head, lines)
}
</script>

<style scoped>
/* 流程状态徽标 */
.wfs { display: inline-block; padding: 1px 10px; border-radius: 10px; font-size: 12px; line-height: 1.7; font-weight: 500; }
.wfs.published { color: #d43d42; background: #fdecec; }
.wfs.confirm { color: #0b6bb5; background: #e8f2fc; }
.wfs.handle { color: #b97a1e; background: #fdf3e4; }
.wfs.archive { color: #1f9d62; background: #e8f6ee; }

/* 情况说明单元格：左对齐 + 单行截断 */
.desc { text-align: left; max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 查看按钮 */
.wview { border: 1px solid #017de4; background: #fff; color: #017de4; border-radius: 4px; padding: 3px 11px; font-size: 12px; cursor: pointer; }
.wview:hover { background: #eaf4fe; }

/* 明细弹窗 */
.warn-mask { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(13, 35, 58, .4); }
.warn-pop { width: min(560px, 96%); background: #fff; border-radius: 10px; box-shadow: 0 24px 60px rgba(10, 35, 60, .4); overflow: hidden; }
.wp-hd { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 18px 22px 14px; background: linear-gradient(135deg, #1c86e8, #005db8); color: #fff; }
.wp-title { font-size: 17px; font-weight: 700; }
.wp-sub { font-size: 12px; opacity: .85; margin-top: 4px; }
.wp-x { width: 28px; height: 28px; padding: 0; flex: none; border: 1px solid rgba(255, 255, 255, .5); border-radius: 50%; background: rgba(255, 255, 255, .12); color: #fff; font-size: 18px; line-height: 1; cursor: pointer; }
.wp-x:hover { background: rgba(255, 255, 255, .28); }
.wp-bd { padding: 20px 22px 6px; }
.wp-grid { display: grid; grid-template-columns: 88px 1fr; row-gap: 12px; column-gap: 8px; }
.wp-k { color: #8296a8; font-size: 13px; }
.wp-v { color: #303133; font-size: 14px; }
.wp-flow-title { margin-top: 20px; font-size: 13px; color: #3a4a5a; font-weight: 600; }
.wd-flow { display: flex; align-items: flex-start; margin: 14px 0 6px; }
.wd-step { display: flex; flex-direction: column; align-items: center; width: 72px; flex: none; }
.wd-dot { width: 28px; height: 28px; border-radius: 50%; background: #e4e7ed; color: #909399; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }
.wd-step.done .wd-dot { background: #26a869; color: #fff; }
.wd-step.cur .wd-dot { background: #e5484d; color: #fff; box-shadow: 0 0 0 4px rgba(229, 72, 77, .16); }
.wd-nm { margin-top: 6px; font-size: 12px; color: #606266; white-space: nowrap; }
.wd-step.cur .wd-nm { color: #e5484d; font-weight: 700; }
.wd-conn { flex: 1; height: 2px; background: #e4e7ed; margin-top: 13px; min-width: 14px; }
.wd-conn.done { background: #26a869; }
.wp-ft { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 22px 22px; }
.wp-btn { height: 36px; padding: 0 22px; border: 1px solid #dcdfe6; border-radius: 6px; background: #fff; color: #5b6b7b; font-size: 14px; cursor: pointer; }
.wp-btn.primary { border-color: #017de4; background: linear-gradient(180deg, #1c86e8, #017de4); color: #fff; font-weight: 600; }
</style>
