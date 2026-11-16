<template>
  <div class="lg">
    <!-- ============ 筛选（摊开式） ============ -->
    <div class="lg-filter">
      <div class="f-line f-line1">
        <label class="f-item">
          <span class="f-lb">关键字</span>
          <input v-model="q.kw" type="text" placeholder="站名 / 站码 / 河道" />
        </label>
        <span class="f-note">按站名、站码、河道模糊匹配</span>
        <div class="f-ops">
          <button class="q-btn primary" type="button" @click="doQuery">查询</button>
          <button class="q-btn" type="button" @click="resetQ">重置</button>
          <button class="q-btn" type="button" @click="exportList">导出Excel</button>
          <button class="q-btn" type="button" @click="importDlg = true">导入Excel</button>
        </div>
      </div>

      <div class="f-line chips-line">
        <span class="f-lb wide">站　类</span>
        <div class="chips">
          <span class="chip" :class="{ on: !q.cls }" @click="q.cls = ''"><i class="ci">▦</i>全部</span>
          <span
            v-for="c in ALL_CLASSES"
            :key="c"
            class="chip"
            :class="{ on: q.cls === c }"
            @click="q.cls = c"
          ><i class="ci">{{ c === '基本站' ? '★' : '▣' }}</i>{{ c }}</span>
        </div>
      </div>

      <div class="f-line chips-line">
        <span class="f-lb wide">统计维度</span>
        <div class="chips">
          <span class="chip" :class="{ on: dim === 'dist' }" @click="setDim('dist')"><i class="ci">▦</i>按行政区</span>
          <span class="chip" :class="{ on: dim === 'slp' }" @click="setDim('slp')"><i class="ci">≋</i>按水利片区</span>
        </div>
      </div>

      <div class="f-line chips-line">
        <span class="f-lb wide">{{ dim === 'dist' ? '行政区' : '水利片区' }}</span>
        <div class="chips">
          <span class="chip" :class="{ on: !q[dim] }" @click="q[dim] = ''"><i class="ci">▦</i>全部</span>
          <span
            v-for="o in (dim === 'dist' ? DISTRICTS : ALL_SLPS)"
            :key="o"
            class="chip"
            :class="{ on: q[dim] === o }"
            @click="q[dim] = o"
          >{{ o }}</span>
        </div>
      </div>

      <div class="f-line chips-line">
        <span class="f-lb wide">管理单位</span>
        <div class="chips">
          <span class="chip" :class="{ on: !q.unit }" @click="q.unit = ''"><i class="ci">▦</i>全部</span>
          <span
            v-for="u in UNITS"
            :key="u"
            class="chip"
            :class="{ on: q.unit === u }"
            @click="q.unit = u"
          >{{ u }}</span>
        </div>
      </div>

      <div class="f-line chips-line">
        <span class="f-lb wide">监测项目</span>
        <div class="chips">
          <span class="chip" :class="{ on: !q.elems.length }" @click="q.elems = []"><i class="ci">▦</i>全部</span>
          <span
            v-for="e in ALL_ELEMENTS"
            :key="e"
            class="chip"
            :class="{ on: q.elems.includes(e) }"
            @click="toggleElem(e)"
          ><i class="ci">{{ elemIcon(e) }}</i>{{ e }}</span>
        </div>
      </div>
    </div>

    <!-- ============ 管理概览 ============ -->
    <div class="io-stats">
      <div class="io-stat"><div class="st-l">在册测站</div><div class="st-v">{{ stats.total }}<span class="st-u">个</span></div></div>
      <div class="io-stat"><div class="st-l">基本站</div><div class="st-v">{{ stats.basic }}<span class="st-u">个</span></div></div>
      <div class="io-stat"><div class="st-l">专用站</div><div class="st-v">{{ stats.special }}<span class="st-u">个</span></div></div>
      <div class="io-stat"><div class="st-l">已停用</div><div class="st-v">{{ stats.disabled }}<span class="st-u">个</span></div></div>
    </div>

    <!-- ============ 管理待办 ============ -->
    <div class="lg-todo">
      <span class="td-hd">管理待办</span>
      <div class="td-item" :class="{ on: q.todo === 'info' }" @click="setTodo('info')">
        <b>{{ todoCounts.info }}</b><span>信息待完善</span>
      </div>
      <div class="td-item" :class="{ on: q.todo === 'offline' }" @click="setTodo('offline')">
        <b>{{ todoCounts.offline }}</b><span>当前离线</span>
      </div>
      <div class="td-item" :class="{ on: q.todo === 'disabled' }" @click="setTodo('disabled')">
        <b>{{ todoCounts.disabled }}</b><span>已停用站点</span>
      </div>
      <span class="td-note">点击待办直接筛出需处理的测站，再逐条维护</span>
    </div>

    <!-- ============ 台账 ============ -->
    <div class="card lg-table">
      <div class="tb-bar">
        <span class="tb-res">共 <b>{{ rows.length }}</b> 站</span>
        <span v-if="sel.size" class="tb-sel">
          已选 <b>{{ sel.size }}</b> 站
          <button class="btn-line sm" type="button" @click="batchSet(true)">批量启用</button>
          <button class="btn-line sm" type="button" @click="batchSet(false)">批量停用</button>
          <button class="btn-line sm" type="button" @click="tagDlg = true">批量打标签</button>
          <button class="btn-line sm ghost" type="button" @click="clearSel">取消选择</button>
        </span>
        <div class="tb-ops">
          <button class="btn-line" type="button" @click="createTip">+ 新增测站</button>
          <button class="btn-line" type="button" @click="openReport">自定义统计报表</button>
        </div>
      </div>

      <div class="bd" style="padding: 0">
        <table class="dt">
          <thead>
            <tr>
              <th style="width: 40px"><input type="checkbox" :checked="allChecked" @change="toggleAll" /></th>
              <th style="width: 50px">序号</th>
              <th style="width: 84px">站码</th>
              <th style="width: 130px">站名</th>
              <th style="width: 64px">站类</th>
              <th style="width: 170px">属性标签</th>
              <th style="width: 100px">监测项目</th>
              <th style="width: 90px">辅助观测</th>
              <th style="width: 74px">行政区</th>
              <th style="width: 80px">水利片区</th>
              <th style="width: 138px">GPS 经纬度</th>
              <th style="width: 118px">城建坐标（另存）</th>
              <th style="width: 116px">管理单位</th>
              <th style="width: 68px">状态</th>
              <th style="width: 128px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, i) in pageRows" :key="s.code" :class="{ off: !s.enabled }">
              <td><input type="checkbox" :checked="sel.has(s.code)" @change="toggleSel(s.code)" /></td>
              <td class="muted">{{ (page - 1) * PAGE + i + 1 }}</td>
              <td>{{ s.code }}</td>
              <td><b>{{ s.nm }}</b></td>
              <td>{{ s.cls }}</td>
              <td class="tags-cell"><span v-for="t in s.tags" :key="t" class="tag">{{ t }}</span></td>
              <td>{{ s.elems.join(' / ') }}</td>
              <td>{{ s.aux.length ? s.aux.join(' / ') : '—' }}</td>
              <td>{{ s.dist }}</td>
              <td>{{ s.slp }}</td>
              <td class="num">{{ s.lon.toFixed(6) }}<br />{{ s.lat.toFixed(6) }}</td>
              <td class="num">{{ s.cx }}, {{ s.cy }}</td>
              <td>{{ s.unit }}</td>
              <td>
                <span class="st" :class="s.enabled ? (s.status === '在线' ? 'ok' : 'off') : 'dis'">
                  {{ s.enabled ? s.status : '已停用' }}
                </span>
              </td>
              <td class="ops">
                <a class="lnk" @click="openEdit(s)">编辑</a>
                <a class="lnk" @click="toggleEnabled(s)">{{ s.enabled ? '停用' : '启用' }}</a>
                <a class="lnk" @click="openHistory(s)">变更</a>
              </td>
            </tr>
            <tr v-if="!pageRows.length">
              <td colspan="15" class="empty">没有符合条件的测站，请调整筛选条件</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="lg-page">
        <span class="pg-info">第 {{ page }} / {{ pages }} 页，共 {{ rows.length }} 条</span>
        <button class="pg" type="button" :disabled="page === 1" @click="page--">上一页</button>
        <button
          v-for="p in pageList"
          :key="p"
          class="pg"
          :class="{ on: p === page }"
          type="button"
          @click="page = p"
        >{{ p }}</button>
        <button class="pg" type="button" :disabled="page === pages" @click="page++">下一页</button>
      </div>
    </div>

    <!-- 编辑测站 -->
    <el-dialog v-model="edit.open" :title="`测站属性维护 · ${edit.st ? edit.st.nm : ''}`" width="720px" append-to-body>
      <template v-if="edit.st">
        <div class="dt-sec">基本信息</div>
        <table class="dt-tb">
          <tr><th>站码</th><td><span class="ro">{{ edit.st.code }}</span></td><th>站名</th><td><input v-model="edit.nm" class="ipt" type="text" /></td></tr>
          <tr>
            <th>站类</th>
            <td>
              <select v-model="edit.cls" class="ipt">
                <option v-for="c in ALL_CLASSES" :key="c" :value="c">{{ c }}</option>
              </select>
            </td>
            <th>运行状态</th>
            <td>
              <div class="mini-tabs">
                <span :class="{ on: edit.enabled }" @click="edit.enabled = true">启用</span>
                <span :class="{ on: !edit.enabled }" @click="edit.enabled = false">停用</span>
              </div>
            </td>
          </tr>
          <tr><th>行政区</th><td>{{ edit.st.dist }}</td><th>水利片区</th><td>{{ edit.st.slp }}</td></tr>
          <tr><th>建站年份</th><td>{{ edit.st.year }} 年</td><th>管理单位</th><td><input v-model="edit.unit" class="ipt" type="text" /></td></tr>
        </table>

        <div class="dt-sec">监测项目</div>
        <div class="edit-chips">
          <span
            v-for="e in ALL_ELEMENTS"
            :key="e"
            class="chip"
            :class="{ on: edit.elems.includes(e) }"
            @click="toggleEditElem(e)"
          >{{ e }}</span>
        </div>

        <div class="dt-sec">辅助观测项目</div>
        <div class="edit-chips">
          <span
            v-for="a in AUX_OPTIONS"
            :key="a"
            class="chip"
            :class="{ on: edit.aux.includes(a) }"
            @click="toggleEditAux(a)"
          >{{ a }}</span>
        </div>

        <div class="dt-sec">空间位置</div>
        <table class="dt-tb">
          <tr><th>GPS 经纬度</th><td>{{ edit.st.lon.toFixed(6) }}, {{ edit.st.lat.toFixed(6) }}</td><th>城建坐标</th><td>{{ edit.st.cx }}, {{ edit.st.cy }}</td></tr>
        </table>
        <div class="dt-note">站码、经纬度由后台统一维护；本页保存的是属性变更，变更会记入沿革记录。</div>
      </template>
      <template #footer>
        <button class="btn-line" type="button" @click="edit.open = false">取消</button>
        <button class="btn-exp" type="button" @click="saveEdit">保存变更</button>
      </template>
    </el-dialog>

    <!-- 变更记录 -->
    <el-drawer v-model="his.open" title="测站变更记录" size="400px" append-to-body>
      <template v-if="his.st">
        <div class="his-hd"><b>{{ his.st.nm }}</b><span>{{ his.st.code }} · 建于 {{ his.st.year }} 年</span></div>
        <div class="his-list">
          <div v-for="(e, i) in his.list" :key="i" class="his-item">
            <span class="his-y">{{ e.year }}</span>
            <span class="evo-tp" :class="tpKey(e.type)">{{ e.type }}</span>
            <span class="his-d">{{ e.desc }}</span>
          </div>
        </div>
        <div class="dt-note">撤站、站码变更等关键操作仅后台可办，变更留痕不可修改。</div>
      </template>
    </el-drawer>

    <!-- 批量打标签 -->
    <el-dialog v-model="tagDlg" title="批量打标签" width="440px" append-to-body>
      <div class="tag-hint">将为已选的 {{ sel.size }} 个测站追加以下属性标签：</div>
      <div class="edit-chips">
        <span
          v-for="t in TAG_OPTIONS"
          :key="t"
          class="chip"
          :class="{ on: batchTags.includes(t) }"
          @click="toggleBatchTag(t)"
        >{{ t }}</span>
      </div>
      <template #footer>
        <button class="btn-line" type="button" @click="tagDlg = false">取消</button>
        <button class="btn-exp" type="button" @click="applyTags">保存</button>
      </template>
    </el-dialog>

    <!-- 导入 -->
    <el-dialog v-model="importDlg" title="导入测站台账" width="560px" append-to-body>
      <div class="imp">
        <p>按《测站台账导入模板》填写后上传，系统按 <b>站码</b> 匹配：已存在则更新属性，不存在则由后台审核新增。</p>
        <div class="imp-cols">模板列：站码、站名、站类管理、监测项目、辅助观测项目、管理单位、运行状态</div>
        <div class="imp-btns">
          <button class="btn-line" type="button" @click="downloadTemplate">下载导入模板</button>
          <label class="file-btn">
            选择文件
            <input type="file" accept=".xlsx,.xls,.csv" @change="onImportFile" />
          </label>
        </div>
        <div class="dt-note">演示环境仅演示导入流程，正式版对接 Excel 解析与后台审核。</div>
      </div>
    </el-dialog>

    <!-- 自定义统计报表 -->
    <el-dialog v-model="rep.open" title="自定义统计报表" width="880px" append-to-body>
      <div class="rp-form">
        <label class="rp-f">
          <span>统计维度</span>
          <select v-model="rep.dim">
            <option v-for="d in DIMS" :key="d.k" :value="d.k">{{ d.n }}</option>
          </select>
        </label>
        <div class="rp-f">
          <span>统计指标</span>
          <div class="rp-checks">
            <label v-for="i in INDICATORS" :key="i.k">
              <input v-model="rep.inds" type="checkbox" :value="i.k" />
              {{ i.n }}
            </label>
          </div>
        </div>
        <button class="btn-exp" type="button" @click="genReport">生成报表</button>
      </div>

      <table v-if="rep.rows.length" class="dt rp-tb">
        <thead>
          <tr>
            <th>{{ dimName }}</th>
            <th v-for="i in rep.inds" :key="i">{{ indName(i) }}</th>
            <th>合计</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rep.rows" :key="r.name">
            <td>{{ r.name }}</td>
            <td v-for="i in rep.inds" :key="i" class="num">{{ r.v[i] }}</td>
            <td class="num bold">{{ r.total }}</td>
          </tr>
          <tr class="tot">
            <td>合计</td>
            <td v-for="i in rep.inds" :key="i" class="num">{{ rep.totals[i] }}</td>
            <td class="num">{{ rep.grand }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="rp-empty">选择维度与指标后点击「生成报表」</div>

      <template #footer>
        <button class="btn-exp" type="button" :disabled="!rep.rows.length" @click="exportReport">导出报表</button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  STATIONS, ALL_CLASSES, ALL_ELEMENTS, ALL_SLPS, DISTRICTS, EVOLUTION_EVENTS
} from '@/data/stationNetwork'
import { downloadCsv } from '@/utils/csv'

const PAGE = 16
const AUX_OPTIONS = ['降水量', '水温', '蒸发', '风向风速', '悬移质输沙']
const TAG_OPTIONS = ['国家基本站', '自动站', '视频站', '闸站', '省界站', '区管站', '应急监测']

const ELEM_ICON = { 水位: '●', 雨量: '■', 流速: '▲', 潮位: '◆', 水质: '⬟', 地下水: '▼' }
const elemIcon = (e) => ELEM_ICON[e] || '·'

/** 本地台账：支持启用/停用、属性维护（仅前端演示） */
const ledger = ref(STATIONS.map((s) => ({
  ...s,
  tags: [...s.tags],
  elems: [...s.elems],
  aux: [...s.aux],
  enabled: true
})))

const q = reactive({ kw: '', cls: '', dist: '', slp: '', unit: '', elems: [], todo: '' })

/** 行政区 / 水利片区是两个维度，只能二选一 */
const dim = ref('dist')
function setDim(k) {
  if (dim.value === k) return
  dim.value = k
  q.dist = ''
  q.slp = ''
  page.value = 1
}

function toggleElem(e) {
  const i = q.elems.indexOf(e)
  if (i >= 0) q.elems.splice(i, 1)
  else q.elems.push(e)
}

const UNITS = [
  '上海市水文总站',
  ...Array.from(new Set(STATIONS.map((s) => s.unit)))
    .filter((u) => u.endsWith('区水文站'))
    .sort(),
  '河道管理所'
]

function todoMatch(s) {
  if (q.todo === 'info') return s.aux.length === 0
  if (q.todo === 'offline') return s.status === '离线'
  if (q.todo === 'disabled') return !s.enabled
  return true
}

const rows = computed(() => ledger.value.filter((s) => {
  if (q.kw) {
    const k = q.kw.trim()
    if (!(s.nm.includes(k) || s.code.includes(k) || (s.riv || '').includes(k))) return false
  }
  if (q.cls && s.cls !== q.cls) return false
  if (q.dist && s.dist !== q.dist) return false
  if (q.slp && s.slp !== q.slp) return false
  if (q.unit === '河道管理所') { if (!s.unit.includes('河道管理所')) return false }
  else if (q.unit && s.unit !== q.unit) return false
  if (q.elems.length && !q.elems.every((e) => s.elems.includes(e))) return false
  return todoMatch(s)
}))

const stats = computed(() => ({
  total: ledger.value.length,
  basic: ledger.value.filter((s) => s.cls === '基本站').length,
  special: ledger.value.filter((s) => s.cls === '专用站').length,
  disabled: ledger.value.filter((s) => !s.enabled).length
}))

const todoCounts = computed(() => ({
  info: ledger.value.filter((s) => s.aux.length === 0).length,
  offline: ledger.value.filter((s) => s.status === '离线').length,
  disabled: ledger.value.filter((s) => !s.enabled).length
}))

function setTodo(k) {
  q.todo = q.todo === k ? '' : k
}
function doQuery() {
  page.value = 1
  ElMessage.success(`已按条件筛选出 ${rows.value.length} 个测站`)
}
function resetQ() {
  Object.assign(q, { kw: '', cls: '', dist: '', slp: '', unit: '', elems: [], todo: '' })
  page.value = 1
}

/* 分页 */
const page = ref(1)
const pages = computed(() => Math.max(1, Math.ceil(rows.value.length / PAGE)))
const pageRows = computed(() => rows.value.slice((page.value - 1) * PAGE, page.value * PAGE))
const pageList = computed(() => {
  const out = []
  const total = pages.value
  let start = Math.max(1, page.value - 2)
  const end = Math.min(total, start + 4)
  start = Math.max(1, end - 4)
  for (let i = start; i <= end; i++) out.push(i)
  return out
})
watch(q, () => { page.value = 1 })
watch(pages, () => { if (page.value > pages.value) page.value = 1 })

/* 勾选与批量操作 */
const sel = ref(new Set())
const allChecked = computed(() => pageRows.value.length > 0 && pageRows.value.every((s) => sel.value.has(s.code)))
function toggleSel(code) {
  const s = new Set(sel.value)
  if (s.has(code)) s.delete(code)
  else s.add(code)
  sel.value = s
}
function toggleAll() {
  const s = new Set(sel.value)
  if (allChecked.value) pageRows.value.forEach((x) => s.delete(x.code))
  else pageRows.value.forEach((x) => s.add(x.code))
  sel.value = s
}
function clearSel() { sel.value = new Set() }

function batchSet(on) {
  const n = sel.value.size
  for (const s of ledger.value) if (sel.value.has(s.code)) s.enabled = on
  ElMessage.success(`已${on ? '启用' : '停用'} ${n} 个测站`)
  clearSel()
}

const tagDlg = ref(false)
const batchTags = ref([])
function toggleBatchTag(t) {
  const i = batchTags.value.indexOf(t)
  if (i >= 0) batchTags.value.splice(i, 1)
  else batchTags.value.push(t)
}
function applyTags() {
  let n = 0
  for (const s of ledger.value) {
    if (!sel.value.has(s.code)) continue
    for (const t of batchTags.value) {
      if (!s.tags.includes(t)) s.tags.push(t)
    }
    n++
  }
  tagDlg.value = false
  batchTags.value = []
  ElMessage.success(`已为 ${n} 个测站更新属性标签`)
  clearSel()
}

function toggleEnabled(s) {
  s.enabled = !s.enabled
  ElMessage.success(`${s.nm} 已${s.enabled ? '启用' : '停用'}`)
}

function createTip() {
  ElMessage.info('新增测站在后台管理端办理（权限已回收），本页提供属性维护与批量操作')
}

/* 编辑 */
const edit = reactive({ open: false, st: null, nm: '', cls: '', unit: '', elems: [], aux: [], enabled: true })
function openEdit(s) {
  edit.st = s
  edit.nm = s.nm
  edit.cls = s.cls
  edit.unit = s.unit
  edit.elems = [...s.elems]
  edit.aux = [...s.aux]
  edit.enabled = s.enabled
  edit.open = true
}
function toggleEditElem(e) {
  const i = edit.elems.indexOf(e)
  if (i >= 0) edit.elems.splice(i, 1)
  else edit.elems.push(e)
}
function toggleEditAux(a) {
  const i = edit.aux.indexOf(a)
  if (i >= 0) edit.aux.splice(i, 1)
  else edit.aux.push(a)
}
function saveEdit() {
  const s = edit.st
  if (!s) return
  if (!edit.nm.trim()) { ElMessage.warning('站名不能为空'); return }
  s.nm = edit.nm.trim()
  s.cls = edit.cls
  s.unit = edit.unit
  s.elems = [...edit.elems]
  s.aux = [...edit.aux]
  s.enabled = edit.enabled
  edit.open = false
  ElMessage.success('属性已保存，变更已记入沿革')
}

/* 变更记录 */
const his = reactive({ open: false, st: null, list: [] })
function openHistory(s) {
  his.st = s
  his.list = EVOLUTION_EVENTS.filter((e) => e.code === s.code)
  his.open = true
}
const tpKey = (t) => ({ 建站: 'build', 迁站: 'move', 更名: 'rename', 撤站: 'close' }[t] || '')

/* 导入 */
const importDlg = ref(false)
function downloadTemplate() {
  downloadCsv('测站台账导入模板.csv',
    ['站码', '站名', '站类管理', '监测项目', '辅助观测项目', '管理单位', '运行状态'],
    [['63401120', '松浦大桥', '国家基本水文站（重点）', '水位/流速', '降水量', '上海市水文总站', '启用']]
  )
}
function onImportFile(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  importDlg.value = false
  ElMessage.success(`已读取文件：${f.name}（演示环境不解析内容）`)
  e.target.value = ''
}

/* 导出 */
function exportList() {
  const head = ['序号', '站码', '站名', '站类', '属性标签', '行政区', '水利片区', '监测项目', '辅助观测项目',
    'GPS经度', 'GPS纬度', '城建X', '城建Y', '管理单位', '运行状态']
  const lines = rows.value.map((s, i) => [
    i + 1, s.code, s.nm, s.cls, s.tags.join('/'), s.dist, s.slp, s.elems.join('/'), s.aux.join('/') || '—',
    s.lon.toFixed(6), s.lat.toFixed(6), s.cx, s.cy, s.unit,
    s.enabled ? s.status : '已停用'
  ])
  downloadCsv('测站台账.csv', head, lines)
}

/* 自定义统计报表 */
const DIMS = [
  { k: 'dist', n: '行政区' },
  { k: 'slp', n: '水利片区' },
  { k: 'cls', n: '站类' },
  { k: 'unit', n: '管理单位' }
]
const INDICATORS = [
  { k: 'total', n: '测站数' },
  { k: 'basic', n: '基本站' },
  { k: 'special', n: '专用站' },
  { k: 'z', n: '水位站' },
  { k: 'r', n: '雨量站' },
  { k: 'q', n: '流量站' },
  { k: 'wq', n: '水质站' }
]
const rep = reactive({ open: false, dim: 'dist', inds: ['total', 'basic', 'special', 'z', 'q'], rows: [], totals: {}, grand: 0 })

const dimName = computed(() => DIMS.find((d) => d.k === rep.dim).n)
const indName = (k) => (INDICATORS.find((i) => i.k === k) || {}).n || k

function openReport() { rep.open = true }

function calcInd(s, k) {
  if (k === 'total') return 1
  if (k === 'basic') return s.cls === '基本站' ? 1 : 0
  if (k === 'special') return s.cls === '专用站' ? 1 : 0
  if (k === 'z') return s.elems.includes('水位') ? 1 : 0
  if (k === 'r') return s.elems.includes('雨量') ? 1 : 0
  if (k === 'q') return s.elems.includes('流速') ? 1 : 0
  if (k === 'wq') return s.elems.includes('水质') ? 1 : 0
  return 0
}

function genReport() {
  const g = new Map()
  for (const s of rows.value) {
    const name = s[rep.dim] || '未分组'
    if (!g.has(name)) g.set(name, Object.fromEntries(rep.inds.map((k) => [k, 0])))
    const o = g.get(name)
    for (const k of rep.inds) o[k] += calcInd(s, k)
  }
  rep.rows = [...g.entries()]
    .map(([name, v]) => ({ name, v, total: rep.inds.reduce((a, k) => a + v[k], 0) }))
    .sort((a, b) => b.total - a.total)
  rep.totals = Object.fromEntries(rep.inds.map((k) => [k, rep.rows.reduce((a, r) => a + r.v[k], 0)]))
  rep.grand = rep.rows.reduce((a, r) => a + r.total, 0)
}

function exportReport() {
  const head = [dimName.value, ...rep.inds.map(indName), '合计']
  const lines = rep.rows.map((r) => [r.name, ...rep.inds.map((k) => r.v[k]), r.total])
  lines.push(['合计', ...rep.inds.map((k) => rep.totals[k]), rep.grand])
  downloadCsv(`测站统计报表_按${dimName.value}.csv`, head, lines)
}
</script>

<style scoped>
.lg { height: 100%; padding: 10px; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }

/* 筛选面板 */
.lg-filter {
  flex: none;
  background: #fff;
  border: 1px solid var(--bnd);
  border-radius: 4px;
  padding: 8px 12px 6px;
}
.f-line { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 4px 0; }
.f-line + .f-line { border-top: 1px dashed #eef2f6; }
.f-item { display: flex; align-items: center; gap: 6px; }
.f-lb { font-size: 12.5px; color: #5b6b7b; white-space: nowrap; }
.f-lb.wide { width: 62px; flex: none; font-weight: 700; color: #35506a; }
.f-item input, .f-item select {
  height: 28px;
  border: 1px solid #d6dfe9;
  border-radius: 3px;
  padding: 0 8px;
  font-size: 12.5px;
  outline: none;
  background: #fff;
  color: #303133;
}
.f-item input { width: 240px; }
.f-item input:focus, .f-item select:focus { border-color: #017de4; }
.f-note { font-size: 11.5px; color: #a3b1bf; }
.f-ops { margin-left: auto; display: flex; gap: 6px; }
.q-btn {
  height: 29px;
  padding: 0 13px;
  border: 1px solid #d6dfe9;
  border-radius: 3px;
  background: #fff;
  color: #4a5a6a;
  font-size: 12.5px;
  cursor: pointer;
}
.q-btn:hover { border-color: #017de4; color: #017de4; }
.q-btn.primary { background: #017de4; border-color: #017de4; color: #fff; }
.q-btn.primary:hover { background: #0168c4; color: #fff; }

/* 标签固定在左侧，选项在右侧内部换行，避免整组选项掉到标签下方 */
.chips-line { align-items: flex-start; padding: 3px 0; flex-wrap: nowrap; }
.chips { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; gap: 5px; padding-top: 1px; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  line-height: 21px;
  padding: 0 10px;
  border: 1px solid #dbe4ee;
  border-radius: 3px;
  color: #4a5a6a;
  cursor: pointer;
  background: #fff;
  white-space: nowrap;
}
.chip:hover { border-color: #7bb8ee; color: #017de4; }
.chip.on { background: #017de4; border-color: #017de4; color: #fff; }
.chip .ci { font-style: normal; font-size: 11px; opacity: .85; }

/* 管理待办 */
.lg-todo {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid var(--bnd);
  border-radius: 4px;
  padding: 8px 12px;
}
.td-hd { font-size: 12.5px; font-weight: 700; color: #245c85; }
.td-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 4px 12px;
  border: 1px solid #e6eef7;
  border-radius: 3px;
  cursor: pointer;
  background: #fbfdff;
}
.td-item b { font-size: 16px; color: #017de4; }
.td-item span { font-size: 12px; color: #5b6b7b; }
.td-item:hover { border-color: #017de4; }
.td-item.on { background: #e8f3fd; border-color: #017de4; }
.td-note { margin-left: auto; font-size: 11.5px; color: #93a4b5; }

/* 表格 */
.lg-table { flex: 1; min-height: 0; }
.lg-table > .bd { padding: 0; overflow: auto; }
.tb-bar { flex: none; display: flex; align-items: center; gap: 10px; padding: 7px 12px; border-bottom: 1px solid #eef2f6; flex-wrap: wrap; }
.tb-res { font-size: 12.5px; color: #8a9aab; }
.tb-res b { color: #017de4; font-size: 14px; }
.tb-sel { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #017de4; }
.tb-sel b { font-size: 13px; }
.tb-ops { margin-left: auto; display: flex; gap: 8px; }
.btn-line {
  height: 28px;
  padding: 0 12px;
  border: 1px solid #017de4;
  border-radius: 3px;
  background: #fff;
  color: #017de4;
  font-size: 12.5px;
  cursor: pointer;
}
.btn-line:hover { background: #f2f8ff; }
.btn-line.sm { height: 24px; padding: 0 8px; font-size: 11.5px; }
.btn-line.ghost { border-color: #d6dfe9; color: #6b7c8f; }

table.dt tbody tr.off td { color: #b3bdc7; background: #fcfcfd; }
table.dt .ops .lnk { margin: 0 4px; }
.tags-cell { white-space: normal !important; text-align: left !important; padding: 4px 6px !important; }
.tag {
  display: inline-block;
  font-size: 11px;
  padding: 0 5px;
  margin: 1px 3px 1px 0;
  border-radius: 2px;
  background: #eef6fe;
  color: #017de4;
  line-height: 17px;
}
.lnk { color: #017de4; cursor: pointer; font-size: 12.5px; }
.lnk:hover { text-decoration: underline; }
.st { font-size: 11px; padding: 1px 6px; border-radius: 2px; white-space: nowrap; }
.st.ok { color: #26a869; background: #eef8f2; }
.st.off { color: #8a94a3; background: #f4f5f7; }
.st.dis { color: #b3bdc7; background: #f4f5f7; }
.empty { color: #93a4b5; padding: 26px 0 !important; }

.lg-page { flex: none; display: flex; align-items: center; justify-content: flex-end; gap: 5px; padding: 6px 10px; border-top: 1px solid #eef2f6; }
.pg-info { font-size: 12px; color: #8a9aab; margin-right: 8px; }
.pg {
  min-width: 28px;
  height: 26px;
  border: 1px solid #d6dfe9;
  background: #fff;
  border-radius: 3px;
  font-size: 12px;
  color: #5b6b7b;
  cursor: pointer;
  padding: 0 6px;
}
.pg:hover:not(:disabled) { border-color: #017de4; color: #017de4; }
.pg.on { background: #017de4; border-color: #017de4; color: #fff; }
.pg:disabled { opacity: .45; cursor: default; }

/* 编辑弹窗 */
.dt-sec { font-size: 12.5px; font-weight: 700; color: #245c85; margin: 12px 0 6px; padding-left: 7px; border-left: 3px solid #017de4; }
.dt-sec:first-child { margin-top: 0; }
.dt-tb { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.dt-tb th, .dt-tb td { border: 1px solid #edf1f6; padding: 5px 8px; text-align: left; }
.dt-tb th { background: #fafcfe; color: #7a8fa5; font-weight: 400; width: 92px; white-space: nowrap; }
.ipt { height: 28px; border: 1px solid #d6dfe9; border-radius: 3px; padding: 0 8px; font-size: 12.5px; outline: none; width: 100%; box-sizing: border-box; }
.ipt:focus { border-color: #017de4; }
.ro { color: #8a9aab; }
.mini-tabs { display: inline-flex; border: 1px solid #d6dfe9; border-radius: 3px; overflow: hidden; }
.mini-tabs span { padding: 3px 12px; font-size: 12px; color: #5b6b7b; cursor: pointer; }
.mini-tabs span.on { background: #017de4; color: #fff; }
.edit-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dt-note { margin-top: 12px; font-size: 11.5px; color: #93a4b5; background: #f7fafd; border: 1px solid #e6eef7; border-radius: 3px; padding: 7px 10px; }
.dt-note b { color: #5b6b7b; }

/* 变更记录 */
.his-hd { display: flex; flex-direction: column; gap: 3px; padding-bottom: 10px; border-bottom: 1px solid #eef2f6; margin-bottom: 10px; }
.his-hd b { font-size: 15px; color: #17324a; }
.his-hd span { font-size: 12px; color: #8a9aab; }
.his-list { display: flex; flex-direction: column; }
.his-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px dashed #eef2f6; font-size: 12.5px; }
.his-y { width: 42px; flex: none; color: #017de4; font-weight: 700; }
.his-d { color: #5b6b7b; }
.evo-tp { width: 38px; flex: none; text-align: center; font-size: 11px; border-radius: 2px; padding: 1px 0; }
.evo-tp.build { background: #eef6fe; color: #017de4; }
.evo-tp.move { background: #eef8f2; color: #26a869; }
.evo-tp.rename { background: #eef1ff; color: #5a6bd8; }
.evo-tp.close { background: #f4f5f7; color: #8a94a3; }

/* 导入 */
.imp p { font-size: 12.5px; color: #5b6b7b; line-height: 1.9; }
.imp p b { color: #017de4; }
.imp-cols { margin: 10px 0; font-size: 12px; color: #35506a; background: #f7fafd; border: 1px solid #e6eef7; border-radius: 3px; padding: 8px 10px; }
.imp-btns { display: flex; gap: 10px; }
.file-btn {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border: 1px solid #017de4;
  border-radius: 3px;
  color: #017de4;
  font-size: 12.5px;
  cursor: pointer;
  background: #fff;
}
.file-btn:hover { background: #f2f8ff; }
.file-btn input { display: none; }
.tag-hint { font-size: 12.5px; color: #5b6b7b; margin-bottom: 10px; }

/* 报表 */
.rp-form { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; padding-bottom: 12px; border-bottom: 1px solid #eef2f6; }
.rp-f { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #5b6b7b; }
.rp-f select { height: 28px; border: 1px solid #d6dfe9; border-radius: 3px; padding: 0 6px; font-size: 12.5px; outline: none; }
.rp-checks { display: flex; gap: 4px 14px; flex-wrap: wrap; font-size: 12.5px; color: #35506a; }
.rp-checks label { display: inline-flex; align-items: center; gap: 4px; }
.rp-checks input { accent-color: #017de4; }
.rp-tb { margin-top: 12px; }
.rp-tb .bold { font-weight: 700; }
.rp-tb tr.tot td { background: #f7fafd; font-weight: 700; }
.rp-empty { margin-top: 26px; text-align: center; color: #93a4b5; font-size: 13px; }
</style>
