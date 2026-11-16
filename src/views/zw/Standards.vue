<template>
  <div class="bz">
    <div class="bz-cond">
      <span class="lb">关键字</span>
      <input v-model="q.kw" type="text" placeholder="标准名称 / 编号 / 发布单位" />
      <div class="chips">
        <span class="chip" :class="{ on: !q.type }" @click="q.type = ''">全部类别</span>
        <span
          v-for="t in STD_TYPES"
          :key="t"
          class="chip"
          :class="{ on: q.type === t }"
          @click="q.type = t"
        >{{ t }}</span>
      </div>
      <div class="bz-ops">
        <button class="btn-line" type="button" @click="resetQ">重置</button>
        <button class="btn-exp" type="button" @click="exportList">导出</button>
      </div>
    </div>

    <div class="card bz-table">
      <div class="hd">标准规范规程<span class="tag">共 {{ rows.length }} 项 · 点击名称查看原文</span></div>
      <div class="bd" style="padding: 0">
        <table class="dt">
          <thead>
            <tr>
              <th style="width: 56px">序号</th>
              <th>标准规范规程名称</th>
              <th style="width: 180px">标准编号</th>
              <th style="width: 100px">类别</th>
              <th style="width: 180px">发布单位</th>
              <th style="width: 110px">发布日期</th>
              <th style="width: 110px">实施日期</th>
              <th style="width: 90px">状态</th>
              <th style="width: 80px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, i) in rows" :key="s.id" @dblclick="openPdf(s)">
              <td class="muted">{{ i + 1 }}</td>
              <td class="nm"><a class="name" @click="openPdf(s)">{{ s.name }}</a></td>
              <td>{{ s.code }}</td>
              <td><span class="tp" :class="tpKey(s.type)">{{ s.type }}</span></td>
              <td>{{ s.dept }}</td>
              <td class="num">{{ s.publish }}</td>
              <td class="num">{{ s.effective }}</td>
              <td><span class="st" :class="stKey(s.status)">{{ s.status }}</span></td>
              <td><a class="lnk" @click="openPdf(s)">查看</a></td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="9" class="empty">没有符合条件的标准规范</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- PDF 预览 -->
    <el-dialog
      v-model="pdf.open"
      width="900px"
      append-to-body
      class="pdf-dialog"
      :show-close="false"
      top="4vh"
    >
      <template #header>
        <div class="pdf-bar">
          <span class="pdf-ico">PDF</span>
          <span class="pdf-name">{{ pdf.s ? pdf.s.name : '' }}.pdf</span>
          <span class="pdf-meta">{{ pdf.s ? pdf.s.code : '' }}</span>
          <div class="pdf-tools">
            <button type="button" :disabled="pdf.page <= 1" @click="pdf.page--">上一页</button>
            <span class="pg">{{ pdf.page }} / {{ pages.length }}</span>
            <button type="button" :disabled="pdf.page >= pages.length" @click="pdf.page++">下一页</button>
            <span class="zoom">
              <button type="button" :disabled="pdf.zoom <= 60" @click="pdf.zoom -= 20">−</button>
              <i>{{ pdf.zoom }}%</i>
              <button type="button" :disabled="pdf.zoom >= 160" @click="pdf.zoom += 20">+</button>
            </span>
            <button type="button" class="dl" @click="downloadPdf">下载</button>
            <button type="button" class="close" @click="pdf.open = false">关闭</button>
          </div>
        </div>
      </template>

      <div v-if="pdf.s" class="pdf-view">
        <div class="pdf-page" :style="{ zoom: pdf.zoom / 100 }">
          <!-- 封面 -->
          <template v-if="pdf.page === 1">
            <div class="cover">
              <div class="cover-code">{{ pdf.s.code }}</div>
              <h1>{{ pdf.s.name }}</h1>
              <div class="cover-line"></div>
              <div class="cover-type">{{ pdf.s.type }}</div>
              <div class="cover-dept">{{ pdf.s.dept }}</div>
              <div class="cover-date">发布 {{ pdf.s.publish }}　实施 {{ pdf.s.effective }}</div>
            </div>
          </template>

          <!-- 目次 -->
          <template v-else-if="pdf.page === 2">
            <div class="pg-hd">{{ pdf.s.name }}</div>
            <div class="pg-sec">目　次</div>
            <div class="toc">
              <div v-for="(c, i) in TOC" :key="c" class="toc-row">
                <span>{{ i + 1 }}　{{ c }}</span>
                <i>{{ i + 1 }}</i>
              </div>
            </div>
            <div class="pg-ft">{{ pdf.s.code }}　·　{{ pdf.page }}</div>
          </template>

          <!-- 正文节选 -->
          <template v-else>
            <div class="pg-hd">{{ pdf.s.name }}</div>
            <div class="pg-sec">1　总　则</div>
            <p v-for="(p, i) in bodyParas" :key="i">{{ p }}</p>
            <div class="pg-sec">2　适用范围</div>
            <p>{{ pdf.s.scope }}。</p>
            <p>2.0.2　本标准适用于本市水文测站的规划、建设、运行维护与资料管理，其他相关业务可参照执行。</p>
            <p>2.0.3　测站建设除应符合本标准外，尚应符合国家现行有关标准的规定。</p>
            <div class="pg-ft">{{ pdf.s.code }}　·　{{ pdf.page }}</div>
          </template>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { STANDARDS, STD_TYPES } from '@/data/standards'
import { downloadCsv } from '@/utils/csv'

const q = reactive({ kw: '', type: '' })

const rows = computed(() => STANDARDS.filter((s) => {
  if (q.type && s.type !== q.type) return false
  if (q.kw) {
    const k = q.kw.trim()
    if (!(s.name.includes(k) || s.code.includes(k) || s.dept.includes(k))) return false
  }
  return true
}))

function resetQ() {
  q.kw = ''
  q.type = ''
}

const tpKey = (t) => ({ 国家标准: 'gb', 行业标准: 'hy', 地方标准: 'df', 技术导则: 'dz' }[t] || '')
const stKey = (s) => ({ 现行: 'cur', 修订中: 'rev', 即将实施: 'soon' }[s] || '')

/* PDF 预览 */
const TOC = ['总则', '术语与符号', '站网布设', '观测与测验', '数据采集与传输', '资料整编', '质量控制与验收']
const pages = computed(() => ['封面', '目次', '正文'])
const pdf = reactive({ open: false, s: null, page: 1, zoom: 100 })

const bodyParas = computed(() => pdf.s ? [
  `1.0.1　为规范${pdf.s.name.replace(/规范|标准|导则|规程/g, '')}工作，保证水文监测成果质量，制定本标准。`,
  `1.0.2　本标准适用于${pdf.s.scope}。`,
  '1.0.3　水文测验应采用经检定合格的仪器设备，并按规定的观测频次和精度要求开展观测。',
  '1.0.4　测站建设应满足防汛抗旱、水资源管理、水生态保护等业务对水文信息的需求。'
] : [])

function openPdf(s) {
  pdf.s = s
  pdf.page = 1
  pdf.zoom = 100
  pdf.open = true
}

function downloadPdf() {
  ElMessage.info('演示环境未接入标准原文 PDF 文件')
}

function exportList() {
  const head = ['序号', '标准规范规程名称', '标准编号', '类别', '发布单位', '发布日期', '实施日期', '状态']
  const lines = rows.value.map((s, i) => [i + 1, s.name, s.code, s.type, s.dept, s.publish, s.effective, s.status])
  downloadCsv('标准规范规程清单.csv', head, lines)
}
</script>

<style scoped>
.bz { height: 100%; padding: 10px; display: flex; flex-direction: column; gap: 10px; overflow: hidden; }

.bz-cond {
  flex: none;
  background: #fff;
  border: 1px solid var(--bnd);
  border-radius: 4px;
  padding: 9px 12px;
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
}
.bz-cond .lb { font-size: 12.5px; color: #7a8fa5; }
.bz-cond input {
  height: 29px;
  width: 240px;
  border: 1px solid #d6dfe9;
  border-radius: 3px;
  padding: 0 9px;
  font-size: 12.5px;
  outline: none;
}
.bz-cond input:focus { border-color: #017de4; }
.chips { display: flex; gap: 5px; flex-wrap: wrap; }
.chip {
  font-size: 12px;
  line-height: 24px;
  padding: 0 11px;
  border: 1px solid #dbe4ee;
  border-radius: 3px;
  color: #4a5a6a;
  cursor: pointer;
  background: #fff;
}
.chip:hover { border-color: #7bb8ee; color: #017de4; }
.chip.on { background: #017de4; border-color: #017de4; color: #fff; }
.bz-ops { margin-left: auto; display: flex; gap: 8px; }
.btn-line {
  height: 29px;
  padding: 0 13px;
  border: 1px solid #d6dfe9;
  border-radius: 3px;
  background: #fff;
  color: #4a5a6a;
  font-size: 12.5px;
  cursor: pointer;
}
.btn-line:hover { border-color: #017de4; color: #017de4; }

.bz-table { flex: 1; min-height: 0; }
.bz-table .bd { overflow: auto; }
.bz-table .nm { text-align: left; padding-left: 16px; }
.bz-table tbody tr { cursor: pointer; }
.name { color: #17324a; font-weight: 700; cursor: pointer; }
.name:hover { color: #017de4; text-decoration: underline; }
.tp { font-size: 11px; padding: 1px 7px; border-radius: 2px; white-space: nowrap; }
.tp.gb { color: #017de4; background: #eef6fe; }
.tp.hy { color: #119a8f; background: #eaf6f5; }
.tp.df { color: #5a6bd8; background: #eef1ff; }
.tp.dz { color: #4b6584; background: #eef1f5; }
.st { font-size: 11px; padding: 1px 7px; border-radius: 2px; white-space: nowrap; }
.st.cur { color: #26a869; background: #eef8f2; }
.st.rev { color: #017de4; background: #eef6fe; }
.st.soon { color: #7b8cff; background: #eef1ff; }
.lnk { color: #017de4; cursor: pointer; font-size: 12.5px; }
.lnk:hover { text-decoration: underline; }
.empty { color: #93a4b5; padding: 26px 0 !important; }
</style>

<style>
/* PDF 预览弹窗（非 scoped，便于覆盖 el-dialog 结构） */
.pdf-dialog .el-dialog__header { padding: 0; margin: 0; }
.pdf-dialog .el-dialog__body { padding: 0; background: #525a66; }
.pdf-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 46px;
  padding: 0 14px;
  background: #2f3b4a;
  color: #fff;
}
.pdf-bar .pdf-ico {
  font-size: 10px;
  font-weight: 700;
  background: #e34c4c;
  color: #fff;
  border-radius: 2px;
  padding: 2px 5px;
  letter-spacing: .5px;
}
.pdf-bar .pdf-name { font-size: 13px; font-weight: 700; }
.pdf-bar .pdf-meta { font-size: 11.5px; opacity: .6; }
.pdf-tools { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.pdf-tools button {
  height: 26px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, .22);
  background: rgba(255, 255, 255, .08);
  color: #e8eef6;
  border-radius: 3px;
  font-size: 12px;
  cursor: pointer;
}
.pdf-tools button:hover:not(:disabled) { background: rgba(255, 255, 255, .18); }
.pdf-tools button:disabled { opacity: .35; cursor: default; }
.pdf-tools .pg { font-size: 12px; color: #cfdae8; min-width: 44px; text-align: center; }
.pdf-tools .zoom { display: flex; align-items: center; gap: 2px; }
.pdf-tools .zoom button { width: 24px; padding: 0; }
.pdf-tools .zoom i { font-size: 11.5px; font-style: normal; color: #cfdae8; min-width: 38px; text-align: center; }
.pdf-tools .dl { border-color: rgba(74, 169, 240, .6); color: #9fd0f7; }
.pdf-tools .close { margin-left: 2px; }

.pdf-view {
  height: 74vh;
  overflow: auto;
  padding: 22px 0 30px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
.pdf-page {
  width: 620px;
  min-height: 800px;
  background: #fff;
  box-shadow: 0 4px 22px rgba(0, 0, 0, .34);
  padding: 56px 58px 46px;
  box-sizing: border-box;
  color: #24303c;
  font-family: "FangSong", "仿宋", "Songti SC", serif;
  position: relative;
}

/* 封面 */
.pdf-dialog .cover { text-align: center; padding-top: 90px; }
.pdf-dialog .cover-code { font-size: 15px; letter-spacing: 1px; color: #55606c; }
.pdf-dialog .cover h1 { font-size: 32px; color: #10202f; margin: 44px 0 26px; letter-spacing: 3px; font-weight: 700; }
.pdf-dialog .cover-line { width: 120px; height: 3px; background: #1c2b3a; margin: 0 auto 26px; }
.pdf-dialog .cover-type { font-size: 16px; color: #33414f; margin-bottom: 8px; }
.pdf-dialog .cover-dept { font-size: 15px; color: #33414f; }
.pdf-dialog .cover-date { margin-top: 220px; font-size: 14px; color: #55606c; }

/* 内页 */
.pdf-dialog .pg-hd { text-align: center; font-size: 15px; color: #55606c; padding-bottom: 14px; border-bottom: 1px solid #d8dde4; margin-bottom: 34px; }
.pdf-dialog .pg-sec { font-size: 17px; font-weight: 700; color: #10202f; margin: 26px 0 14px; font-family: "SimHei", "黑体", sans-serif; }
.pdf-dialog .pdf-page p { font-size: 14px; line-height: 2.1; text-indent: 2em; margin: 0 0 8px; }
.pdf-dialog .pg-ft { position: absolute; left: 0; right: 0; bottom: 22px; text-align: center; font-size: 11px; color: #9aa5b1; }

/* 目次 */
.pdf-dialog .toc { padding: 0 18px; }
.pdf-dialog .toc-row { display: flex; align-items: baseline; justify-content: space-between; font-size: 14px; line-height: 2.4; border-bottom: 1px dotted #cfd6df; }
.pdf-dialog .toc-row i { font-style: normal; color: #55606c; }
</style>
