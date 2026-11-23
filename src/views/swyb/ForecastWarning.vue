<template>
  <div class="sw-page">
    <div class="sw-cond">
      <label>预警类型</label>
      <div class="sw-chips">
        <span class="sw-chip" :class="{ on: fType === 'all' }" @click="fType = 'all'">全部</span>
        <span
          v-for="t in WARN_TYPES"
          :key="t.k"
          class="sw-chip"
          :class="{ on: fType === t.k }"
          @click="fType = t.k"
        >
          {{ t.n }}
        </span>
      </div>
      <label>状态</label>
      <div class="sw-chips">
        <span class="sw-chip" :class="{ on: fStatus === 'all' }" @click="fStatus = 'all'">全部</span>
        <span class="sw-chip" :class="{ on: fStatus === 'active' }" @click="fStatus = 'active'">生效中</span>
        <span class="sw-chip" :class="{ on: fStatus === 'released' }" @click="fStatus = 'released'">已解除</span>
      </div>
      <input v-model="d1" type="date" />
      <span>至</span>
      <input v-model="d2" type="date" />
    </div>

    <div class="sw-cards">
      <div v-for="c in cards" :key="c.l" class="io-stat">
        <div class="st-l">{{ c.l }}</div>
        <div class="st-v">{{ c.v }}<span class="st-u">{{ c.u }}</span></div>
        <div class="st-d">{{ c.d }}</div>
      </div>
    </div>

    <div class="card sw-table">
      <div class="hd">预警发布记录<span class="tag">共 {{ filtered.length }} 条</span></div>
      <div class="sw-toolbar">
        <button class="btn-dl" type="button" @click="openPublish">+ 发布预警</button>
        <div class="ops"><ExportButton @export="exportCsv" /></div>
      </div>
      <div class="bd">
        <table class="dt">
          <thead>
            <tr>
              <th>序号</th><th>预警编号</th><th>类型</th><th>等级</th><th>发布对象</th>
              <th>发布人</th><th>发布时间</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in filtered" :key="r.id">
              <td>{{ i + 1 }}</td>
              <td>{{ r.id }}</td>
              <td>{{ typeName(r.type) }}</td>
              <td><span class="lv" :class="r.level">{{ levelName(r.level) }}</span></td>
              <td>{{ r.target }}</td>
              <td>{{ r.publisher }}</td>
              <td>{{ r.time }}</td>
              <td>
                <span class="lv" :class="r.status === 'active' ? 'blue' : 'green'">
                  {{ r.status === 'active' ? '生效中' : '已解除' }}
                </span>
              </td>
              <td>
                <span class="lnk" @click="openDetail(r)">详情</span>
                <span v-if="r.status === 'active'" class="lnk" @click="release(r)">解除</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 发布预警 -->
    <el-dialog v-model="showPublish" title="发布预报预警" width="440px">
      <div class="pw-form">
        <div class="pw-row">
          <label>预警类型</label>
          <select v-model="form.type">
            <option v-for="t in WARN_TYPES" :key="t.k" :value="t.k">{{ t.n }}</option>
          </select>
        </div>
        <div class="pw-row">
          <label>预警等级</label>
          <select v-model="form.level">
            <option v-for="l in WARN_LEVELS" :key="l.k" :value="l.k">{{ l.n }}预警</option>
          </select>
          <span class="lv" :class="form.level">{{ levelName(form.level) }}</span>
        </div>
        <div class="pw-row">
          <label>发布对象</label>
          <input v-model="form.target" type="text" placeholder="如：黄浦江上游 / 浦东新区" />
        </div>
        <div class="pw-row">
          <label>预警内容</label>
          <textarea v-model="form.content" rows="4" placeholder="填写预警内容与影响范围"></textarea>
        </div>
        <div class="pw-row">
          <label>通知方式</label>
          <label v-for="n in NOTICES" :key="n" class="pw-ck">
            <input v-model="form.notice" type="checkbox" :value="n" /> {{ n }}
          </label>
        </div>
      </div>
      <template #footer>
        <button class="btn-plain" type="button" @click="showPublish = false">取消</button>
        <button class="btn-dl" type="button" @click="submitPublish">发布</button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-dialog v-model="showDetail" title="预警详情" width="440px">
      <div v-if="detail" class="dt-detail">
        <div><span>预警编号</span>{{ detail.id }}</div>
        <div><span>类型</span>{{ typeName(detail.type) }}</div>
        <div><span>等级</span><span class="lv" :class="detail.level">{{ levelName(detail.level) }}</span></div>
        <div><span>发布对象</span>{{ detail.target }}</div>
        <div><span>发布人</span>{{ detail.publisher }}</div>
        <div><span>发布时间</span>{{ detail.time }}</div>
        <div><span>状态</span>{{ detail.status === 'active' ? '生效中' : '已解除' }}</div>
        <div class="full"><span>预警内容</span>{{ detail.content }}</div>
      </div>
      <template #footer>
        <button class="btn-plain" type="button" @click="showDetail = false">关闭</button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'
import { WARN_LEVELS, WARN_SEED, WARN_TYPES } from '@/data/swyb'

const list = ref(WARN_SEED.map((x) => ({ ...x })))
const fType = ref('all')
const fStatus = ref('all')
const d1 = ref('2026-11-01')
const d2 = ref('2026-11-23')
const NOTICES = ['政务群', '短信', '电话']

const typeName = (k) => (WARN_TYPES.find((t) => t.k === k) || {}).n || k
const levelName = (k) => ((WARN_LEVELS.find((l) => l.k === k) || {}).n || k) + '预警'

const filtered = computed(() =>
  list.value.filter((r) => {
    if (fType.value !== 'all' && r.type !== fType.value) return false
    if (fStatus.value !== 'all' && r.status !== fStatus.value) return false
    const day = r.time.slice(0, 10)
    if (d1.value && day < d1.value) return false
    if (d2.value && day > d2.value) return false
    return true
  })
)

const cards = computed(() => {
  const month = list.value.filter((r) => r.time.startsWith('2026-11')).length
  const active = list.value.filter((r) => r.status === 'active').length
  const released = list.value.filter((r) => r.status === 'released').length
  const targets = new Set(list.value.map((r) => r.target)).size
  return [
    { l: '本月发布', v: month, u: '条', d: '2026 年 11 月' },
    { l: '生效中', v: active, u: '条', d: '正在生效的预警' },
    { l: '已解除', v: released, u: '条', d: '历史解除记录' },
    { l: '覆盖对象', v: targets, u: '个', d: '去重发布对象' }
  ]
})

/* 发布 */
const showPublish = ref(false)
const form = ref({ type: 'flood', level: 'yellow', target: '', content: '', notice: ['政务群'] })

function openPublish() {
  form.value = { type: 'flood', level: 'yellow', target: '', content: '', notice: ['政务群'] }
  showPublish.value = true
}

function nowStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function submitPublish() {
  if (!form.value.target.trim()) { ElMessage.warning('请填写发布对象'); return }
  if (!form.value.content.trim()) { ElMessage.warning('请填写预警内容'); return }
  list.value.unshift({
    id: 'YJ' + String(Date.now()).slice(-9),
    type: form.value.type,
    level: form.value.level,
    target: form.value.target.trim(),
    publisher: '市水文总站',
    time: nowStr(),
    status: 'active',
    content: form.value.content.trim(),
    notice: form.value.notice.join('、')
  })
  showPublish.value = false
  ElMessage.success('预警已发布')
}

/* 解除 */
async function release(row) {
  try {
    await ElMessageBox.confirm(`确认解除预警 ${row.id}？`, '解除预警', {
      type: 'warning',
      confirmButtonText: '解除',
      cancelButtonText: '取消'
    })
    row.status = 'released'
    ElMessage.success('预警已解除')
  } catch {
    /* 取消 */
  }
}

/* 详情 */
const showDetail = ref(false)
const detail = ref(null)
function openDetail(r) {
  detail.value = r
  showDetail.value = true
}

function exportCsv() {
  downloadCsv(
    '预报预警发布记录.csv',
    ['序号', '预警编号', '类型', '等级', '发布对象', '发布人', '发布时间', '状态', '预警内容'],
    filtered.value.map((r, i) => [
      i + 1, r.id, typeName(r.type), levelName(r.level), r.target, r.publisher, r.time,
      r.status === 'active' ? '生效中' : '已解除', r.content
    ])
  )
}
</script>

<style scoped>
.sw-cond { flex-wrap: wrap; row-gap: 8px; }
.sw-cond input[type="date"] { width: 140px; }
.lnk { color: var(--nav); cursor: pointer; margin: 0 6px; }
.lnk:hover { text-decoration: underline; }

.pw-form { display: flex; flex-direction: column; gap: 13px; }
.pw-row { display: flex; align-items: center; gap: 10px; }
.pw-row > label:first-child { width: 80px; flex: none; color: var(--txt2); }
.pw-row select, .pw-row input[type="text"], .pw-row textarea {
  flex: 1; min-width: 0; border: 1px solid #dcdfe6; border-radius: 4px; padding: 0 8px;
  font-size: 14px; font-family: inherit; color: var(--txt); background: #fff; outline: none;
}
.pw-row select, .pw-row input[type="text"] { height: 32px; }
.pw-row textarea { padding: 6px 8px; resize: vertical; line-height: 1.6; }
.pw-row select:focus, .pw-row input[type="text"]:focus, .pw-row textarea:focus { border-color: var(--nav); }
.pw-row .pw-ck { display: inline-flex; align-items: center; gap: 4px; width: auto; color: var(--txt2); cursor: pointer; }
.pw-row .pw-ck input { margin: 0; }

.dt-detail { display: flex; flex-direction: column; gap: 9px; font-size: 14px; color: var(--txt); }
.dt-detail > div { display: flex; align-items: flex-start; gap: 10px; line-height: 1.7; }
.dt-detail > div > span:first-child { width: 72px; flex: none; color: var(--txt3); }
.dt-detail .full { align-items: flex-start; }
</style>
