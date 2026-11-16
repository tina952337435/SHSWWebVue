<template>
  <div class="gis" :class="{ 'side-open': panelOpen, 'evo-on': evoMode }">
    <div class="mapwrap" ref="mapWrap">
      <svg
        ref="mapRef"
        :viewBox="vb"
        preserveAspectRatio="xMidYMid meet"
        :style="{ cursor: dragging ? 'grabbing' : 'grab' }"
        @wheel.prevent="onWheel"
        @mousedown.prevent="onDown"
        @dblclick="resetView"
      >
        <defs>
          <radialGradient id="gisGlow">
            <stop offset="0%" stop-color="#3ba4f2" stop-opacity=".42" />
            <stop offset="45%" stop-color="#3ba4f2" stop-opacity=".14" />
            <stop offset="100%" stop-color="#3ba4f2" stop-opacity="0" />
          </radialGradient>
        </defs>

        <rect :width="MW" :height="MH" fill="#e9eef4" />
        <image
          v-for="t in tiles"
          :key="t.k"
          :href="t.url"
          :x="t.x"
          :y="t.y"
          :width="t.w"
          :height="t.h"
          preserveAspectRatio="none"
          @load="onTileLoad"
          @error="onTileError"
        />

        <!-- 水利片区 -->
        <g v-if="showSlp">
          <path
            v-for="p in SLP"
            :key="p.n"
            :d="slpPath[p.n]"
            fill="rgba(1,125,228,.04)"
            stroke="rgba(1,125,228,.30)"
            stroke-width="1"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </g>

        <!-- 行政区（选中高亮） -->
        <g v-if="curAdm">
          <path
            :d="distPath[curAdm]"
            fill="rgba(1,125,228,.10)"
            stroke="#017de4"
            stroke-width="1.6"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </g>

        <!-- 水利片区（选中高亮） -->
        <g v-if="curSlp && slpPath[curSlp]">
          <path
            :d="slpPath[curSlp]"
            fill="rgba(1,125,228,.12)"
            stroke="#017de4"
            stroke-width="1.8"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </g>

        <!-- 全市视野：行政区气泡 -->
        <g v-if="!zoomed">
          <g
            v-for="c in clusters"
            :key="c.name"
            :transform="`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`"
            style="cursor: pointer"
            @click.stop="zoomToDist(c.name)"
          >
            <circle :r="c.r" fill="rgba(1,125,228,.16)" stroke="#017de4" stroke-width="1" />
            <circle :r="c.r * 0.66" fill="#017de4" opacity=".88" />
            <text
              text-anchor="middle"
              :y="3.2 * uK"
              :font-size="9 * uK"
              fill="#fff"
              font-weight="700"
              pointer-events="none"
            >{{ c.n }}</text>
            <text
              v-if="view.w <= MW * 0.55"
              text-anchor="middle"
              :y="c.r + 12 * uK"
              :font-size="8 * uK"
              fill="#245c85"
              style="paint-order: stroke; stroke: #fff; stroke-width: 2.4px"
              pointer-events="none"
            >{{ c.name }}</text>
          </g>
        </g>

        <!-- 单站 -->
        <g v-if="zoomed">
          <g
            v-for="(d, i) in dots"
            :key="d.st.code"
            :transform="`translate(${d.x.toFixed(1)} ${d.y.toFixed(1)})`"
            style="cursor: pointer"
            @mouseenter="showTip(d.st, $event)"
            @mouseleave="hideTip"
            @click.stop="openPop(d.st)"
          >
            <circle :r="(d.r + 6) * uK" fill="transparent" />

            <circle
              v-if="d.st.code === popCode"
              :r="(d.r * 2.6) * uK"
              fill="url(#gisGlow)"
              :style="{ animationDelay: ((i % 9) * 0.32).toFixed(2) + 's' }"
              class="st-glow"
              pointer-events="none"
            />

            <!-- 水位：圆 -->
            <circle
              v-if="d.st.main === '水位'"
              :r="d.r * uK"
              :fill="d.st.status === '在线' ? '#017de4' : '#909399'"
              stroke="#fff"
              :stroke-width="1.4 * uK"
            />
            <!-- 雨量：方 -->
            <rect
              v-else-if="d.st.main === '雨量'"
              :x="-d.r * uK"
              :y="-d.r * uK"
              :width="(d.r * 2) * uK"
              :height="(d.r * 2) * uK"
              :fill="d.st.status === '在线' ? '#16b8b0' : '#909399'"
              stroke="#fff"
              :stroke-width="1.4 * uK"
            />
            <!-- 流速：三角 -->
            <polygon
              v-else-if="d.st.main === '流速'"
              :points="tri(d.r)"
              :fill="d.st.status === '在线' ? '#26a869' : '#909399'"
              stroke="#fff"
              :stroke-width="1.4 * uK"
            />
            <!-- 潮位：菱形 -->
            <polygon
              v-else-if="d.st.main === '潮位'"
              :points="diamond(d.r)"
              :fill="d.st.status === '在线' ? '#7b8cff' : '#909399'"
              stroke="#fff"
              :stroke-width="1.4 * uK"
            />
            <!-- 水质：五边形 -->
            <polygon
              v-else-if="d.st.main === '水质'"
              :points="penta(d.r)"
              :fill="d.st.status === '在线' ? '#2b4c8c' : '#909399'"
              stroke="#fff"
              :stroke-width="1.4 * uK"
            />
            <!-- 地下水：倒三角 -->
            <polygon
              v-else
              :points="triDown(d.r)"
              :fill="d.st.status === '在线' ? '#4b6584' : '#909399'"
              stroke="#fff"
              :stroke-width="1.4 * uK"
            />

            <circle
              v-if="d.st.code === popCode"
              :r="(d.r + 3.5) * uK"
              fill="none"
              stroke="#017de4"
              :stroke-width="1.4 * uK"
            />

            <g v-if="showLabels && d.label" pointer-events="none">
              <rect
                :x="(5.5 * uK).toFixed(2)"
                :y="(-6 * uK).toFixed(2)"
                :width="d.w.toFixed(2)"
                :height="(12 * uK).toFixed(2)"
                rx="2"
                fill="rgba(255,255,255,.92)"
                stroke="rgba(1,125,228,.24)"
                :stroke-width="0.7 * uK"
              />
              <text
                :x="(8 * uK).toFixed(2)"
                :y="(2.6 * uK).toFixed(2)"
                :font-size="8.4 * uK"
                fill="#17324a"
              >{{ d.st.nm }}</text>
            </g>
          </g>
        </g>
      </svg>

      <!-- 工具按钮 -->
      <div class="gis-tools" @click.stop>
        <button class="btn-ghost" type="button" :class="{ on: evoMode }" @click="toggleEvo">
          {{ evoMode ? '退出沿革' : '站点沿革' }}
        </button>
        <button class="btn-exp" type="button" @click="openExport">导出专题图</button>
      </div>

      <!-- 图例 -->
      <div class="gis-legend" @click.stop>
        <div class="gl-hd">图例</div>
        <div class="gl-grp">点符号（按监测项目）</div>
        <div class="gl-row"><i class="s-cir"></i>水位</div>
        <div class="gl-row"><i class="s-rec"></i>雨量</div>
        <div class="gl-row"><i class="s-tri"></i>流速</div>
        <div class="gl-row"><i class="s-dia"></i>潮位</div>
        <div class="gl-row"><i class="s-pen"></i>水质</div>
        <div class="gl-row"><i class="s-tri2"></i>地下水</div>
        <div class="gl-foot">低缩放按所选维度聚合</div>
      </div>

      <div class="map-north" title="正北"><i></i><span>N</span></div>
      <div v-if="scaleBar" class="map-scale">
        <span class="num">{{ scaleBar.label }}</span>
        <i :style="{ width: scaleBar.w + 'px' }"></i>
      </div>

      <div
        v-if="tip.show"
        class="map-tip gis-tip"
        :style="{ left: tip.left + 'px', top: tip.top + 'px' }"
      >
        <b>{{ tip.st.nm }}</b> <span style="opacity: .65">{{ tip.st.code }}</span><br />
        <span class="tt-tag">{{ tip.st.cls }}</span>
        <span class="tt-tag">{{ tip.st.cat }}</span>
        <span class="tt-tag">{{ tip.st.elems.join(' / ') }}</span><br />
        <template v-if="tip.st.wrz != null">水位 <b>{{ tip.st.wrz.toFixed(2) }} m</b>　</template>
        <template v-if="tip.st.q != null">流速 <b>{{ tip.st.q.toFixed(2) }} m³/s</b>　</template>
        <template v-if="tip.st.rain != null">雨量 <b>{{ tip.st.rain.toFixed(1) }} mm</b><br /></template>
        <span v-if="tip.st.wrz != null || tip.st.q != null"><br /></span>
        {{ tip.st.dist }} · {{ tip.st.slp }}<br />
        {{ tip.st.unit }}
      </div>

      <!-- 点击站点：可视化测站弹窗 -->
      <div v-if="pop.open && popSt" class="pop-mask" @click.self="closePop">
        <div class="pop">
          <div class="pop-hd">
            <div class="pop-title">
              <b>{{ popSt.nm }}</b>
              <span>{{ popSt.code }} · {{ popSt.riv || '—' }}</span>
            </div>
            <div class="pop-tags">
              <span class="cls" :class="clsKey(popSt.cls)">{{ popSt.cls }}</span>
              <span class="dot" :class="stKey(popSt.status)">{{ popSt.status }}</span>
              <button class="pop-x" type="button" title="关闭" @click="closePop">×</button>
            </div>
          </div>

          <div class="pop-tabs">
            <span v-for="t in PANEL_TABS" :key="t.k" :class="{ on: pop.tab === t.k }" @click="pop.tab = t.k">{{ t.n }}</span>
          </div>

          <div class="pop-body">
            <!-- 基础信息（专业详表，来自单站组件） -->
            <div v-if="pop.tab === 'base'" class="pop-comp">
              <BasicInformation :stcd="popSt.code" :stnm="popSt.nm" />
            </div>

            <!-- 测站示意图（水位仿真） -->
            <div v-else-if="pop.tab === 'syt'" class="pop-comp">
              <StationSketch :stcd="popSt.code" :stnm="popSt.nm" />
            </div>

            <!-- 横断面 -->
            <div v-else-if="pop.tab === 'hdm'" class="pop-comp">
              <HengDuanSWZ :stcd="popSt.code" :stnm="popSt.nm" />
            </div>

            <!-- 纵断面 -->
            <div v-else-if="pop.tab === 'zdm'" class="pop-comp">
              <ZongDuanMianSWZ :stcd="popSt.code" :stnm="popSt.nm" />
            </div>

            <!-- 实时工况 -->
            <div v-else-if="pop.tab === 'live'" class="pop-comp pop-scroll">
              <div class="gs-cards">
                <div class="gc">
                  <div class="k">当前水位</div>
                  <div class="v">{{ popSt.wrz != null ? popSt.wrz.toFixed(2) : '—' }}<small>m</small></div>
                </div>
                <div class="gc">
                  <div class="k">当前流速</div>
                  <div class="v">{{ popSt.q != null ? popSt.q.toFixed(2) : '—' }}<small>m³/s</small></div>
                </div>
                <div class="gc">
                  <div class="k">时段雨量</div>
                  <div class="v">{{ popSt.rain != null ? popSt.rain.toFixed(1) : '—' }}<small>mm</small></div>
                </div>
              </div>
              <div class="gs-sec">{{ liveLabel }}（近 24 小时）</div>
              <BarChart :option="liveOption" :height="190" />
              <div class="gs-sec">设备在线状态</div>
              <div class="dev-list">
                <div v-for="d in devs" :key="d.devCode" class="dev-row">
                  <span class="dev-n">{{ d.n }}</span>
                  <span class="dev-m">{{ d.m }}</span>
                  <span class="dev-s" :class="d.status === '正常' ? 'ok' : 'warn'">{{ d.status }}</span>
                </div>
              </div>
            </div>

            <!-- 视频监控 -->
            <div v-else-if="pop.tab === 'video'" class="pop-comp pop-scroll">
              <div class="vid-grid">
                <div v-for="v in VIDEOS" :key="v" class="vid" @click="videoTip">
                  <div class="vid-cam">实时视频</div>
                  <div class="vid-nm">{{ popSt.nm }} · {{ v }}</div>
                  <div class="vid-tm">{{ nowText }}</div>
                </div>
              </div>
              <div class="gs-note">演示环境未接入视频流，正式版对接站房视频平台，支持云台控制与抓拍。</div>
            </div>

            <!-- 特征值 -->
            <div v-else-if="pop.tab === 'feat'" class="pop-comp pop-scroll">
              <div class="gs-cards">
                <div class="gc"><div class="k">历史最高水位</div><div class="v">{{ ext.zMax.v.toFixed(2) }}<small>m</small></div><div class="d">{{ ext.zMax.tm }}</div></div>
                <div class="gc"><div class="k">历史最大流速</div><div class="v">{{ ext.qMax.v.toFixed(1) }}<small>m³/s</small></div><div class="d">{{ ext.qMax.tm }}</div></div>
                <div class="gc"><div class="k">历史最低水位</div><div class="v">{{ ext.zMin.v.toFixed(2) }}<small>m</small></div><div class="d">{{ ext.zMin.tm }}</div></div>
              </div>
              <div class="gs-sec">近 5 年特征值</div>
              <table class="gs-tb center">
                <thead><tr><th>年份</th><th>最高水位(m)</th><th>最低水位(m)</th><th>最大流速(m³/s)</th></tr></thead>
                <tbody>
                  <tr v-for="r in featRows" :key="r.year">
                    <td>{{ r.year }}</td><td>{{ r.zMax.toFixed(2) }}</td><td>{{ r.zMin.toFixed(2) }}</td><td>{{ r.qMax.toFixed(1) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 设备与巡检 -->
            <div v-else class="pop-comp pop-scroll">
              <div class="gs-sec">设备台账</div>
              <table class="gs-tb center">
                <thead><tr><th>设备码</th><th>名称</th><th>型号</th><th>安装日期</th><th>状态</th></tr></thead>
                <tbody>
                  <tr v-for="d in devs" :key="d.devCode">
                    <td>{{ d.devCode }}</td><td>{{ d.n }}</td><td>{{ d.m }}</td><td>{{ d.install }}</td>
                    <td><span class="dev-s" :class="d.status === '正常' ? 'ok' : 'warn'">{{ d.status }}</span></td>
                  </tr>
                </tbody>
              </table>
              <div class="gs-sec">最近巡检记录</div>
              <table class="gs-tb center">
                <thead><tr><th>巡检单号</th><th>日期</th><th>巡检人</th><th>结果</th></tr></thead>
                <tbody>
                  <tr v-for="r in insps" :key="r.id">
                    <td>{{ r.id }}</td><td>{{ r.tm }}</td><td>{{ r.man }}</td>
                    <td><span class="dev-s" :class="r.result === '正常' ? 'ok' : 'warn'">{{ r.result }}</span></td>
                  </tr>
                </tbody>
              </table>
              <div class="gs-note">设备更换记录由运维系统自动同步，避免台账与运维两张皮。</div>
            </div>
          </div>
        </div>
      </div>

      <button
        class="side-tab"
        type="button"
        :title="panelOpen ? '收起测站明细' : '展开测站明细'"
        @click.stop="panelOpen = !panelOpen"
      >
        <span class="ico">{{ panelOpen ? '›' : '‹' }}</span>
        <span class="lb">{{ panelOpen ? '收起' : '明细' }}</span>
      </button>

      <!-- 站点沿革时间轴：点「站点沿革」才出现 -->
      <div v-if="evoMode" class="tl-bar" @click.stop @mousedown.stop>
        <span class="tl-hd">站点沿革</span>
        <button class="tl-play" type="button" @click="togglePlay">{{ playing ? '❚❚' : '▶' }}</button>
        <div class="tl-year"><b>{{ year }}</b> 年</div>
        <input
          v-model.number="year"
          class="tl-range"
          type="range"
          :min="MIN_YEAR"
          :max="MAX_YEAR"
          step="1"
        />
        <span class="tl-count">在册 <b>{{ visibleStations.length }}</b> 站<template v-if="addedThisYear">，本年新增 <b>{{ addedThisYear }}</b></template><template v-if="removedThisYear">，撤站 <b class="off">{{ removedThisYear }}</b></template></span>
        <button class="tl-evo" type="button" @click="evo.open = true">沿革记录</button>
      </div>
    </div>

    <!-- ============ 右侧测站明细 ============ -->
    <aside v-show="panelOpen" class="gis-side">
      <div class="side-hd">
        <b>测站明细</b>
        <span class="cnt">共 {{ filtered.length }} 站</span>
      </div>

      <div class="side-filters">
        <!-- 维度切换 + 该维度的选项合并成一行 -->
        <div class="f-row">
          <div class="seg">
            <span :class="{ on: dim === 'dist' }" @click="setDim('dist')">行政区</span>
            <span :class="{ on: dim === 'slp' }" @click="setDim('slp')">水利片区</span>
          </div>
          <div class="f-opts">
            <span class="opt all" :class="{ on: !filters[dim] }" @click="filters[dim] = ''">全部</span>
            <span
              v-for="o in (dim === 'dist' ? DISTRICTS : ALL_SLPS)"
              :key="o"
              class="opt"
              :class="{ on: filters[dim] === o }"
              @click="filters[dim] = o"
            >{{ o }}</span>
          </div>
        </div>

        <div v-for="f in BASE_FILTERS" :key="f.k" class="f-row">
          <span class="f-lb">{{ f.n }}</span>
          <div class="f-opts">
            <span class="opt all" :class="{ on: !filters[f.k] }" @click="filters[f.k] = ''">全部</span>
            <span
              v-for="o in f.opts"
              :key="o"
              class="opt"
              :class="{ on: filters[f.k] === o }"
              @click="filters[f.k] = o"
            >{{ o }}</span>
          </div>
        </div>

      </div>

      <div class="side-toolbar">
        <span class="tb-tip">共 <b>{{ filtered.length }}</b> 站</span>
        <span class="tb-ops">
          <span class="tb-reset" @click="resetFilters">重置</span>
          <ExportButton @export="exportList" />
        </span>
      </div>

      <div class="side-table">
        <table class="dt">
          <thead>
            <tr>
              <th style="width: 56px">序号</th>
              <th style="width: 104px">站码</th>
              <th>站名</th>
              <th style="width: 76px">站别</th>
              <th style="width: 92px">类型</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(s, i) in pageRows"
              :key="s.code"
              :class="{ sel: s.code === popCode }"
              @click="openPop(s)"
            >
              <td class="muted">{{ (page - 1) * PAGE + i + 1 }}</td>
              <td>{{ s.code }}</td>
              <td class="nm"><b>{{ s.nm }}</b></td>
              <td>{{ s.cat }}</td>
              <td>{{ s.cls }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="side-page">
        <span>第 {{ page }} / {{ pages }} 页</span>
        <button class="pg" type="button" :disabled="page === 1" @click="page--">上一页</button>
        <button class="pg" type="button" :disabled="page === pages" @click="page++">下一页</button>
      </div>
    </aside>

    <!-- ============ 专题图导出 ============ -->
    <el-dialog v-model="ex.open" title="导出专题图" width="980px" append-to-body>
      <div class="ex-wrap">
        <div class="ex-form">
          <label class="ex-f">
            <span>图名</span>
            <input v-model="ex.title" type="text" />
          </label>
          <label class="ex-f">
            <span>范围</span>
            <select v-model="ex.scope">
              <option value="view">当前视野</option>
              <option value="all">全上海</option>
            </select>
          </label>
          <div class="ex-f">
            <span>图面要素</span>
            <div class="ex-checks">
              <label><input v-model="ex.showName" type="checkbox" />站名</label>
              <label><input v-model="ex.showSlp" type="checkbox" />水利片区</label>
              <label><input v-model="ex.showLegend" type="checkbox" />图例</label>
              <label><input v-model="ex.showScale" type="checkbox" />比例尺</label>
              <label><input v-model="ex.showDate" type="checkbox" />制图日期</label>
            </div>
          </div>
          <div class="ex-info">
            按当前筛选条件出图，共 {{ filtered.length }} 个测站 · A4 横向 300dpi
          </div>
          <div class="ex-btns">
            <button class="btn-exp" type="button" @click="exportPng">导出 PNG</button>
            <button class="btn-exp" type="button" @click="exportSvgFile">导出 SVG</button>
          </div>
        </div>
        <div class="ex-prev" v-html="previewSvg"></div>
      </div>
    </el-dialog>

    <!-- ============ 站点沿革记录 ============ -->
    <el-dialog v-model="evo.open" title="站点沿革（1949—2026）" width="880px" append-to-body>
      <div class="evo-top">
        <span class="evo-st"><b>{{ evoStats['建站'] }}</b> 建站</span>
        <span class="evo-st"><b>{{ evoStats['迁站'] }}</b> 迁站</span>
        <span class="evo-st"><b>{{ evoStats['更名'] }}</b> 更名</span>
        <span class="evo-st"><b>{{ evoStats['撤站'] }}</b> 撤站</span>
        <span class="evo-hint">点击任一条，地图跳到该年份</span>
      </div>
      <div class="evo-types">
        <span class="opt" :class="{ on: !evo.type }" @click="evo.type = ''">全部</span>
        <span
          v-for="t in EVO_TYPES"
          :key="t"
          class="opt"
          :class="{ on: evo.type === t }"
          @click="evo.type = t"
        >{{ t }}</span>
      </div>
      <div class="evo-list">
        <div v-for="(e, i) in evoRows" :key="i" class="evo-item" @click="jumpTo(e)">
          <span class="evo-year">{{ e.year }}</span>
          <span class="evo-tp" :class="tpKey(e.type)">{{ e.type }}</span>
          <b>{{ e.nm }}</b>
          <span class="evo-code">{{ e.code }}</span>
          <span class="evo-desc">{{ e.desc }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  STATIONS, ALL_STATIONS, ALL_CLASSES, ALL_ELEMENTS, STATION_CATS, ALL_SLPS, DISTRICTS,
  stationsAtYear, EVOLUTION_EVENTS,
  upDown, extremes, feat5y, deviceList, inspectHistory, last24h
} from '@/data/stationNetwork'
import { DIST } from '@/data/districts'
import {
  MW, MH, XS, YS, X0, Y0, proj, tileUrl, fallbackUrl,
  WORLD, WORLD_HALF, cjLon, cjLat, cjX, cjY
} from '@/utils/mapProj'
import { svgToPng, downloadBlob, downloadSvg } from '@/utils/exportImage'
import BarChart from '@/components/BarChart.vue'
import ExportButton from '@/components/ExportButton.vue'
import { downloadCsv } from '@/utils/csv'
import BasicInformation from '@/views/danzhan/basicInformation.vue'
import StationSketch from '@/views/danzhan/shiyitu.vue'
import HengDuanSWZ from '@/views/danzhan/HengDuanSWZ.vue'
import ZongDuanMianSWZ from '@/views/danzhan/ZongDuanMianSWZ.vue'

/* ================= 地图 ================= */
const mapRef = ref(null)
const mapWrap = ref(null)
const px = reactive({ w: 0, h: 0 })
const view = reactive({ x: 0, y: 0, w: MW, h: MH })
const vb = computed(() => `${view.x.toFixed(1)} ${view.y.toFixed(1)} ${view.w.toFixed(1)} ${view.h.toFixed(1)}`)
const dragging = ref(false)
const drag = { sx: 0, sy: 0, vx: 0, vy: 0, moved: false }
let fitted = false

function measure() {
  const el = mapRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  px.w = r.width
  px.h = r.height
  if (!fitted && px.w && px.h) { fitted = true; fitView() } else if (fitted) setAspect()
}
const viewAR = () => (px.w && px.h ? px.w / px.h : MW / MH)
function fitView() {
  const ar = viewAR()
  let w = MW * 0.94
  let h = w / ar
  if (h < MH * 0.94) { h = MH * 0.94; w = h * ar }
  view.w = w; view.h = h
  view.x = (MW - w) / 2; view.y = (MH - h) / 2
}
function setAspect() {
  const ar = viewAR()
  const cx = view.x + view.w / 2
  const cy = view.y + view.h / 2
  view.h = view.w / ar
  view.x = cx - view.w / 2
  view.y = cy - view.h / 2
  clampView()
}
function fitScale() {
  if (!px.w || !px.h) return 1
  return Math.min(px.w / view.w, px.h / view.h)
}
function clampAxis(v, size, box) {
  if (size <= box) return Math.min(Math.max(0, v), box - size)
  return Math.min(Math.max(box - size, v), 0)
}
function clampView() {
  view.x = clampAxis(view.x, view.w, MW)
  view.y = clampAxis(view.y, view.h, MH)
}
function onWheel(e) {
  const el = mapRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const s = fitScale()
  const ox = (r.width - view.w * s) / 2
  const oy = (r.height - view.h * s) / 2
  const cx = view.x + (e.clientX - r.left - ox) / s
  const cy = view.y + (e.clientY - r.top - oy) / s
  const ar = viewAR()
  const wmax = Math.max(MW, MH * ar)
  const nw = Math.min(wmax, Math.max(MW * 0.045, view.w * (e.deltaY < 0 ? 0.82 : 1.22)))
  const f = nw / view.w
  view.x = cx - (cx - view.x) * f
  view.y = cy - (cy - view.y) * f
  view.w = nw
  view.h = nw / ar
  clampView()
}
function onDown(e) {
  if (e.button !== 0) return
  dragging.value = true
  drag.sx = e.clientX; drag.sy = e.clientY
  drag.vx = view.x; drag.vy = view.y
  drag.moved = false
}
function onMove(e) {
  if (!dragging.value) return
  const dx = e.clientX - drag.sx
  const dy = e.clientY - drag.sy
  if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return
  drag.moved = true
  const s = fitScale()
  view.x = drag.vx - dx / s
  view.y = drag.vy - dy / s
  clampView()
}
let suppressClick = false
function onUp() {
  dragging.value = false
  if (drag.moved) {
    suppressClick = true
    setTimeout(() => { suppressClick = false }, 0)
  }
}
function resetView() { fitView() }

const scaleBar = computed(() => {
  if (!px.w || !view.w) return null
  const mPerPx = ((XS / MW) * view.w) / px.w
  const target = 90
  const raw = mPerPx * target
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const steps = [1, 2, 5, 10]
  let m = pow
  for (const s of steps) if (s * pow <= raw) m = s * pow
  return { label: m >= 1000 ? `${(m / 1000).toFixed(m % 1000 ? 1 : 0)} km` : `${m} m`, w: m / mPerPx }
})

/* 底图瓦片 */
const tileErr = ref(0)
const tileOk = ref(false)
const useFallback = computed(() => !tileOk.value && tileErr.value >= 3)
function onTileError() { if (!tileOk.value) tileErr.value += 1 }
function onTileLoad() { tileOk.value = true }

const tileZ = computed(() => {
  const v = Math.log2(((fitScale() * MW) / XS) * (WORLD / 256))
  return Math.max(3, Math.min(17, Math.ceil(v)))
})
function viewBoxCJ() {
  return {
    gx0: X0 + (view.x / MW) * XS,
    gx1: X0 + ((view.x + view.w) / MW) * XS,
    gy1: Y0 - (view.y / MH) * YS,
    gy0: Y0 - ((view.y + view.h) / MH) * YS
  }
}
const tiles = computed(() => {
  const z = tileZ.value
  const n = 2 ** z
  const out = []
  const { gx0, gx1, gy0, gy1 } = viewBoxCJ()

  if (useFallback.value) {
    const toLon = (c) => (c / n) * 360 - 180
    const toLat = (r) => {
      const m = 0.5 - r / n
      return (Math.atan(Math.sinh(m * 2 * Math.PI)) * 180) / Math.PI
    }
    const mX = (lon) => (lon + 180) / 360
    const mY = (lat) => {
      const s = Math.sin((lat * Math.PI) / 180)
      return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)
    }
    const lonW = cjLon(gx0, (gy0 + gy1) / 2)
    const lonE = cjLon(gx1, (gy0 + gy1) / 2)
    const latN = cjLat((gx0 + gx1) / 2, gy1)
    const latS = cjLat((gx0 + gx1) / 2, gy0)
    const tx0 = Math.floor(mX(lonW) * n)
    const tx1 = Math.floor(mX(lonE) * n)
    const ty0 = Math.floor(mY(latN) * n)
    const ty1 = Math.floor(mY(latS) * n)
    for (let ty = Math.max(0, ty0); ty <= Math.min(n - 1, ty1); ty++) {
      for (let tx = Math.max(0, tx0); tx <= Math.min(n - 1, tx1); tx++) {
        const lonL = toLon(tx), lonR = toLon(tx + 1)
        const latT = toLat(ty), latB = toLat(ty + 1)
        const mLon = (lonL + lonR) / 2, mLat = (latT + latB) / 2
        const xL = cjX(lonL, mLat), xR = cjX(lonR, mLat)
        const yT = cjY(mLon, latT), yB = cjY(mLon, latB)
        out.push({
          k: `f${z}/${tx}/${ty}`,
          url: fallbackUrl(z, tx, ty),
          x: ((xL - X0) / XS) * MW,
          y: ((Y0 - yT) / YS) * MH,
          w: ((xR - xL) / XS) * MW + 0.4,
          h: ((yT - yB) / YS) * MH + 0.4
        })
      }
    }
    return out
  }

  const t = WORLD / n
  const c0 = Math.floor((gx0 + WORLD_HALF) / t)
  const c1 = Math.floor((gx1 + WORLD_HALF) / t)
  const r0 = Math.floor((WORLD_HALF - gy1) / t)
  const r1 = Math.floor((WORLD_HALF - gy0) / t)
  const bw = (t / XS) * MW
  const bh = (t / YS) * MH
  for (let cr = Math.max(0, r0); cr <= Math.min(n - 1, r1); cr++) {
    for (let cc = Math.max(0, c0); cc <= Math.min(n - 1, c1); cc++) {
      out.push({
        k: `${z}/${cr}/${cc}`,
        url: tileUrl(z, cr, cc),
        x: (((cc * t - WORLD_HALF) - X0) / XS) * MW,
        y: ((Y0 - (WORLD_HALF - cr * t)) / YS) * MH,
        w: bw + 0.4,
        h: bh + 0.4
      })
    }
  }
  return out
})

/* ================= 水利片区 / 行政区 ================= */
const SLP = ref([])
const showSlp = ref(true)
const slpPath = computed(() => {
  const m = {}
  for (const p of SLP.value) m[p.n] = pathOf(p.r)
  return m
})
const distPath = {}
for (const d of Object.keys(DIST)) distPath[d] = pathOf(DIST[d])
function pathOf(ring) {
  let d = ''
  ring.forEach((p, i) => {
    const xy = proj(p[0], p[1])
    d += (i ? 'L' : 'M') + xy[0].toFixed(2) + ',' + xy[1].toFixed(2)
  })
  return d + 'Z'
}

/* ================= 筛选（右侧明细表内） ================= */
/* 站点沿革：拖动年份查看当年站网布局 */
const MIN_YEAR = 1949
const MAX_YEAR = 2026
const year = ref(MAX_YEAR)
const playing = ref(false)
const evoMode = ref(false)
let playTimer = null
const visibleStations = computed(() => stationsAtYear(year.value))
const addedThisYear = computed(() => visibleStations.value.filter((s) => s.year === year.value).length)
const removedThisYear = computed(() => ALL_STATIONS.filter((s) => s.end === year.value).length)

function stopPlay() {
  clearInterval(playTimer)
  playing.value = false
}
function togglePlay() {
  if (playing.value) { stopPlay(); return }
  if (year.value >= MAX_YEAR) year.value = MIN_YEAR
  playing.value = true
  playTimer = setInterval(() => {
    if (year.value >= MAX_YEAR) stopPlay()
    else year.value += 1
  }, 120)
}
/** 沿革是辅助视图：默认关闭，关闭即回到最新布局 */
function toggleEvo() {
  evoMode.value = !evoMode.value
  if (!evoMode.value) {
    stopPlay()
    year.value = MAX_YEAR
  }
}

/* 沿革记录 */
const evo = reactive({ open: false, type: '' })
const EVO_TYPES = ['建站', '迁站', '更名', '撤站']
const evoRows = computed(() => EVOLUTION_EVENTS.filter((e) => !evo.type || e.type === evo.type))
const evoStats = computed(() => {
  const m = { 建站: 0, 迁站: 0, 更名: 0, 撤站: 0 }
  for (const e of EVOLUTION_EVENTS) m[e.type] = (m[e.type] || 0) + 1
  return m
})
function jumpTo(e) {
  evoMode.value = true
  year.value = Math.min(MAX_YEAR, Math.max(MIN_YEAR, e.year))
  evo.open = false
}

const filters = reactive({ cls: '', cat: '', elem: '', dist: '', slp: '' })
const BASE_FILTERS = [
  { k: 'cls', n: '站点类型', opts: ALL_CLASSES },
  { k: 'cat', n: '站别', opts: STATION_CATS },
  { k: 'elem', n: '监测项目', opts: ALL_ELEMENTS }
]
function resetFilters() {
  filters.cls = ''
  filters.cat = ''
  filters.elem = ''
  filters.dist = ''
  filters.slp = ''
}

/** 导出当前筛选结果（与项目其它表格一致） */
function exportList() {
  const head = ['序号', '站码', '站名', '站别', '站点类型']
  const lines = filtered.value.map((s, i) => [i + 1, s.code, s.nm, s.cat, s.cls])
  downloadCsv('测站明细.csv', head, lines)
}

const filtered = computed(() => visibleStations.value.filter((s) => {
  if (filters.cls && s.cls !== filters.cls) return false
  if (filters.cat && s.cat !== filters.cat) return false
  if (filters.elem && !s.elems.includes(filters.elem)) return false
  if (filters.dist && s.dist !== filters.dist) return false
  if (filters.slp && s.slp !== filters.slp) return false
  return true
}))

/* 右侧明细表分页 */
const PAGE = 12
const page = ref(1)
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE)))
const pageRows = computed(() => filtered.value.slice((page.value - 1) * PAGE, page.value * PAGE))
watch(filters, () => { page.value = 1 })
watch(year, () => { page.value = 1 })
watch(pages, () => { if (page.value > pages.value) page.value = 1 })

const XY = new Map(ALL_STATIONS.map((s) => [s.code, proj(s.lon, s.lat)]))
const zoomed = computed(() => view.w <= MW * 0.42)
// 屏幕 1 像素对应多少 SVG 单位：站点符号、字号按它换算，缩放时大小恒定
const uK = computed(() => (px.w ? view.w / px.w : 1))
const dim = ref('dist')
function setDim(k) {
  if (dim.value === k) return
  dim.value = k
  filters.dist = ''
  filters.slp = ''
}
const curAdm = computed(() => (dim.value === 'dist' ? filters.dist : ''))
const curSlp = computed(() => (dim.value === 'slp' ? filters.slp : ''))
const groupOf = (s) => (dim.value === 'slp' ? s.slp : s.dist)

const clusters = computed(() => {
  if (zoomed.value) return []
  const g = new Map()
  for (const s of filtered.value) {
    const xy = XY.get(s.code)
    const key = groupOf(s)
    if (!g.has(key)) g.set(key, { name: key, n: 0, sx: 0, sy: 0 })
    const o = g.get(key)
    o.n++; o.sx += xy[0]; o.sy += xy[1]
  }
  const arr = [...g.values()].map((o) => ({ name: o.name, n: o.n, x: o.sx / o.n, y: o.sy / o.n }))
  const maxN = Math.max(1, ...arr.map((a) => a.n))
  const k = uK.value
  return arr.map((a) => ({ ...a, r: (16 + Math.sqrt(a.n / maxN) * 20) * k, nSize: 11 * k }))
})

const showLabels = computed(() => view.w <= MW * 0.20)
const dots = computed(() => {
  if (!zoomed.value) return []
  const list = filtered.value
  const labelSet = new Set()
  if (showLabels.value) {
    const sorted = [...list].sort((a, b) => (a.cls === '基本站' ? -1 : 0) - (b.cls === '基本站' ? -1 : 0))
    sorted.slice(0, 140).forEach((s) => labelSet.add(s.code))
  }
  return list.map((s) => {
    const [x, y] = XY.get(s.code)
    const basic = s.cls === '基本站'
    return {
      st: s,
      x, y,
      r: basic ? 7.5 : 6,
      label: labelSet.has(s.code),
      w: (s.nm.length * 8.4 + 4) * uK.value
    }
  }).filter((d) => {
    const m = 40 * uK.value
    return d.x > view.x - m && d.x < view.x + view.w + m && d.y > view.y - m && d.y < view.y + view.h + m
  })
})

const tri = (r) => {
  const a = r * uK.value
  return `0,${-a} ${a * 0.9},${a * 0.75} ${-a * 0.9},${a * 0.75}`
}
const triDown = (r) => {
  const a = r * uK.value
  return `0,${a} ${a * 0.9},${-a * 0.75} ${-a * 0.9},${-a * 0.75}`
}
const diamond = (r) => {
  const a = r * uK.value
  return `0,${-a} ${a},0 0,${a} ${-a},0`
}
const penta = (r) => {
  const a = r * uK.value
  const pts = []
  for (let i = 0; i < 5; i++) {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    pts.push(`${(Math.cos(ang) * a).toFixed(2)},${(Math.sin(ang) * a).toFixed(2)}`)
  }
  return pts.join(' ')
}

/* ================= 交互 ================= */
const tip = reactive({ show: false, left: 0, top: 0, st: null })
function showTip(st, e) {
  const box = mapWrap.value ? mapWrap.value.getBoundingClientRect() : { left: 0, top: 0 }
  tip.st = st
  tip.show = true
  tip.left = e.clientX - box.left + 14
  tip.top = e.clientY - box.top + 14
}
function hideTip() { tip.show = false }

function zoomToDist(name) {
  if (suppressClick) return
  const list = filtered.value.filter((s) => groupOf(s) === name)
  if (!list.length) return
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9
  for (const s of list) {
    const [x, y] = XY.get(s.code)
    x0 = Math.min(x0, x); x1 = Math.max(x1, x)
    y0 = Math.min(y0, y); y1 = Math.max(y1, y)
  }
  const ar = viewAR()
  let w = Math.max(60, (x1 - x0) * 1.9)
  let h = (y1 - y0) * 1.9
  if (h > w / ar) w = h * ar
  view.w = Math.min(w, MW)
  view.h = view.w / ar
  view.x = (x0 + x1) / 2 - view.w / 2
  view.y = (y0 + y1) / 2 - view.h / 2
  clampView()
}

/* ================= 可视化测站（弹窗） ================= */
const PANEL_TABS = [
  { k: 'base', n: '基础信息' },
  { k: 'syt', n: '测站示意图' },
  { k: 'hdm', n: '横断面' },
  { k: 'zdm', n: '纵断面' },
  { k: 'live', n: '实时工况' },
  { k: 'video', n: '视频监控' },
  { k: 'feat', n: '特征值' },
  { k: 'dev', n: '设备与巡检' }
]
const panelOpen = ref(false)
const pop = reactive({ open: false, tab: 'base' })
const popCode = ref('')
const popSt = computed(() => ALL_STATIONS.find((s) => s.code === popCode.value) || null)

function openPop(st) {
  if (suppressClick) return
  popCode.value = st.code
  pop.open = true
  hideTip()
}
function closePop() {
  pop.open = false
  popCode.value = ''
}

const ud = computed(() => (popSt.value ? upDown(popSt.value.code) : { up: null, down: null }))
const ext = computed(() => (popSt.value ? extremes(popSt.value.code) : { zMax: { v: 0, tm: '' }, zMin: { v: 0, tm: '' }, qMax: { v: 0, tm: '' } }))
const featRows = computed(() => (popSt.value ? feat5y(popSt.value.code) : []))
const devs = computed(() => (popSt.value ? deviceList(popSt.value.code) : []))
const insps = computed(() => (popSt.value ? inspectHistory(popSt.value.code) : []))

const VIDEOS = ['站房全景', '观测场', '断面上游', '断面下游']
const nowText = (() => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
})()
function videoTip() { ElMessage.info('演示环境未接入视频流') }

const liveLabel = computed(() => {
  const m = popSt.value ? popSt.value.main : ''
  if (m === '雨量') return '逐小时雨量'
  if (m === '潮位') return '潮位过程'
  if (m === '地下水') return '地下水位过程'
  return '水位过程'
})
const liveSeries = computed(() => {
  if (!popSt.value) return []
  const rows = last24h(popSt.value.code)
  if (popSt.value.main === '雨量') {
    return rows.map((r, i) => ({ t: r.t, v: Number(((Math.sin(i / 2.4) + 1) * 0.6).toFixed(1)) }))
  }
  if (popSt.value.main === '地下水') {
    return rows.map((r) => ({ t: r.t, v: Number((r.v - 0.3).toFixed(2)) }))
  }
  return rows
})
const liveOption = computed(() => ({
  grid: { left: 44, right: 12, top: 16, bottom: 24 },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: liveSeries.value.map((r) => r.t),
    axisLabel: { fontSize: 10, interval: 5 },
    axisLine: { lineStyle: { color: '#dfe6ee' } },
    axisTick: { show: false }
  },
  yAxis: {
    type: 'value',
    name: popSt.value && popSt.value.main === '雨量' ? 'mm' : 'm',
    nameTextStyle: { fontSize: 10, color: '#8a9aab' },
    axisLabel: { fontSize: 10, color: '#8a9aab' },
    splitLine: { lineStyle: { color: '#eef2f6' } }
  },
  series: [{
    type: 'line',
    smooth: true,
    symbol: 'none',
    data: liveSeries.value.map((r) => r.v),
    lineStyle: { color: '#017de4', width: 1.8 },
    areaStyle: { color: 'rgba(1,125,228,.12)' }
  }]
}))

const clsKey = (c) => ({ 基本站: 'c-basic', 专用站: 'c-special' }[c] || '')
const tpKey = (t) => ({ 建站: 'build', 迁站: 'move', 更名: 'rename', 撤站: 'close' }[t] || '')
const stKey = (s) => (s === '在线' ? 'ok' : s === '离线' || s === '已撤销' ? 'off' : 'maint')

/* ================= 专题图导出 ================= */
const ex = reactive({
  open: false, title: '上海市水文站网分布图', scope: 'view',
  showName: true, showSlp: true, showLegend: true, showScale: true, showDate: true
})
function openExport() { ex.open = true }

const EX_W = 1120
const EX_H = 792
const EX_PAD = 38
const EX_HEAD = 76
const EX_FOOT = 46

function xml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildSvg() {
  let ex0, ey0, ew, eh
  if (ex.scope === 'view') { ex0 = view.x; ey0 = view.y; ew = view.w; eh = view.h }
  else { ex0 = 0; ey0 = 0; ew = MW; eh = MH }
  const cw = EX_W - EX_PAD * 2
  const ch = EX_H - EX_HEAD - EX_FOOT
  const s = Math.min(cw / ew, ch / eh)
  const tx = EX_PAD + (cw - ew * s) / 2
  const ty = EX_HEAD + (ch - eh * s) / 2
  const X = (x) => tx + (x - ex0) * s
  const Y = (y) => ty + (y - ey0) * s
  const inExt = (s0) => {
    const [x, y] = XY.get(s0.code)
    return x >= ex0 && x <= ex0 + ew && y >= ey0 && y <= ey0 + eh
  }
  const list = filtered.value.filter(inExt)
  const FONT = 'Microsoft YaHei, Source Han Sans SC, sans-serif'

  let g = ''
  if (ex.showSlp && SLP.value.length) {
    for (const p of SLP.value) {
      let d = ''
      p.r.forEach((pt, i) => {
        const xy = proj(pt[0], pt[1])
        d += (i ? 'L' : 'M') + X(xy[0]).toFixed(1) + ',' + Y(xy[1]).toFixed(1)
      })
      g += `<path d="${d}Z" fill="rgba(1,125,228,.035)" stroke="rgba(1,125,228,.35)" stroke-width="0.8"/>`
    }
  }

  const COL = { 水位: '#017de4', 雨量: '#16b8b0', 流速: '#26a869', 潮位: '#7b8cff', 水质: '#2b4c8c', 地下水: '#4b6584' }
  for (const st of list) {
    const [x, y] = XY.get(st.code)
    const cx = X(x)
    const cy = Y(y)
    const c = st.status === '在线' ? (COL[st.main] || '#017de4') : '#909399'
    const r = st.cls === '基本站' ? 3.6 : 2.6
    if (st.main === '雨量') g += `<rect x="${(cx - r).toFixed(1)}" y="${(cy - r).toFixed(1)}" width="${(r * 2).toFixed(1)}" height="${(r * 2).toFixed(1)}" fill="${c}"/>`
    else if (st.main === '流速') g += `<polygon points="${cx.toFixed(1)},${(cy - r * 1.2).toFixed(1)} ${(cx + r).toFixed(1)},${(cy + r * .8).toFixed(1)} ${(cx - r).toFixed(1)},${(cy + r * .8).toFixed(1)}" fill="${c}"/>`
    else if (st.main === '潮位') g += `<polygon points="${cx.toFixed(1)},${(cy - r * 1.2).toFixed(1)} ${(cx + r * 1.2).toFixed(1)},${cy.toFixed(1)} ${cx.toFixed(1)},${(cy + r * 1.2).toFixed(1)} ${(cx - r * 1.2).toFixed(1)},${cy.toFixed(1)}" fill="${c}"/>`
    else if (st.main === '水质') {
      const pts = []
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 5
        pts.push(`${(cx + Math.cos(ang) * r * 1.2).toFixed(1)},${(cy + Math.sin(ang) * r * 1.2).toFixed(1)}`)
      }
      g += `<polygon points="${pts.join(' ')}" fill="${c}"/>`
    } else if (st.main === '地下水') g += `<polygon points="${cx.toFixed(1)},${(cy + r * 1.2).toFixed(1)} ${(cx + r).toFixed(1)},${(cy - r * .8).toFixed(1)} ${(cx - r).toFixed(1)},${(cy - r * .8).toFixed(1)}" fill="${c}"/>`
    else g += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="${c}"/>`
    if (ex.showName && st.cls === '基本站') {
      g += `<text x="${(cx + 5).toFixed(1)}" y="${(cy + 2.6).toFixed(1)}" font-size="7.4" fill="#17324a" font-family="${FONT}">${xml(st.nm)}</text>`
    }
  }

  let lg = ''
  if (ex.showLegend) {
    const items = [
      ['水位', 'circle', '#017de4'],
      ['雨量', 'rect', '#16b8b0'],
      ['流速', 'tri', '#26a869'],
      ['潮位', 'dia', '#7b8cff'],
      ['水质', 'pen', '#2b4c8c'],
      ['地下水', 'tri2', '#4b6584']
    ]
    const lx = EX_PAD + 12
    const ly = EX_H - EX_FOOT - 12 - 24 - items.length * 17
    lg += `<rect x="${lx}" y="${ly}" width="116" height="${items.length * 17 + 34}" rx="3" fill="rgba(255,255,255,.94)" stroke="#c9d8e6"/>`
    lg += `<text x="${lx + 9}" y="${ly + 17}" font-size="11" font-weight="700" fill="#017de4" font-family="${FONT}">图例</text>`
    items.forEach(([n, k, c], i) => {
      const yy = ly + 32 + i * 17
      if (k === 'circle') lg += `<circle cx="${lx + 14}" cy="${yy - 3}" r="3.2" fill="${c}"/>`
      else if (k === 'rect') lg += `<rect x="${lx + 10.8}" y="${yy - 6.2}" width="6.4" height="6.4" fill="${c}"/>`
      else if (k === 'tri') lg += `<polygon points="${lx + 14},${yy - 7} ${lx + 17.6},${yy} ${lx + 10.4},${yy}" fill="${c}"/>`
      else if (k === 'tri2') lg += `<polygon points="${lx + 14},${yy} ${lx + 17.6},${yy - 7} ${lx + 10.4},${yy - 7}" fill="${c}"/>`
      else if (k === 'dia') lg += `<polygon points="${lx + 14},${yy - 7} ${lx + 17.6},${yy - 3} ${lx + 14},${yy + 1} ${lx + 10.4},${yy - 3}" fill="${c}"/>`
      else lg += `<polygon points="${lx + 14},${yy - 7} ${lx + 17},${yy - 3.6} ${lx + 16},${yy + 1} ${lx + 12},${yy + 1} ${lx + 11},${yy - 3.6}" fill="${c}"/>`
      lg += `<text x="${lx + 24}" y="${yy}" font-size="10" fill="#35506a" font-family="${FONT}">${n}</text>`
    })
  }

  let sb = ''
  if (ex.showScale) {
    const mPerPx = XS / MW / s
    const nice = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]
    const targetM = mPerPx * 110
    let m = nice[0]
    for (const n of nice) if (n <= targetM) m = n
    const pxLen = m / mPerPx
    const x2 = EX_W - EX_PAD - pxLen
    const y2 = EX_H - EX_FOOT - 18
    sb += `<line x1="${x2}" y1="${y2}" x2="${EX_W - EX_PAD}" y2="${y2}" stroke="#35506a" stroke-width="1.4"/>`
    sb += `<line x1="${x2}" y1="${y2 - 4}" x2="${x2}" y2="${y2 + 4}" stroke="#35506a"/>`
    sb += `<line x1="${EX_W - EX_PAD}" y1="${y2 - 4}" x2="${EX_W - EX_PAD}" y2="${y2 + 4}" stroke="#35506a"/>`
    sb += `<text x="${(x2 + pxLen / 2).toFixed(1)}" y="${y2 - 8}" text-anchor="middle" font-size="10" fill="#35506a" font-family="${FONT}">${m >= 1000 ? (m / 1000) + ' km' : m + ' m'}</text>`
  }

  const d = new Date()
  const dateText = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  const sub = `上海市水文总站 · ${year.value} 年 · 共 ${list.length} 站`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${EX_W}" height="${EX_H}" viewBox="0 0 ${EX_W} ${EX_H}">
  <rect width="${EX_W}" height="${EX_H}" fill="#fff"/>
  <rect x="${EX_PAD - 12}" y="${EX_HEAD - 10}" width="${EX_W - (EX_PAD - 12) * 2}" height="${EX_H - EX_HEAD + 10 - EX_FOOT + 10}" fill="#fbfdff" stroke="#dce6f0"/>
  ${g}
  <text x="${EX_W / 2}" y="40" text-anchor="middle" font-size="21" font-weight="700" fill="#17324a" font-family="${FONT}">${xml(ex.title)}</text>
  <text x="${EX_W / 2}" y="60" text-anchor="middle" font-size="11" fill="#7a8fa5" font-family="${FONT}">${xml(sub)}</text>
  ${lg}
  ${sb}
  ${ex.showDate ? `<text x="${EX_W - EX_PAD}" y="${EX_H - 12}" text-anchor="end" font-size="10" fill="#8a9aab" font-family="${FONT}">制图日期：${dateText}</text>` : ''}
  <text x="${EX_PAD}" y="${EX_H - 12}" font-size="10" fill="#8a9aab" font-family="${FONT}">上海「一张图」底图 · 上海市水文行业综合业务管理系统</text>
</svg>`
}

const previewSvg = computed(() => buildSvg())

async function exportPng() {
  try {
    const blob = await svgToPng(previewSvg.value, EX_W, EX_H, 2.4)
    downloadBlob(blob, `${ex.title}_${new Date().toISOString().slice(0, 10)}.png`)
  } catch (e) {
    ElMessage.error('导出失败：' + e.message)
  }
}
function exportSvgFile() {
  downloadSvg(previewSvg.value, `${ex.title}_${new Date().toISOString().slice(0, 10)}.svg`)
}

/* ================= 生命周期 ================= */
let ro = null
function onKey(e) {
  if (e.key === 'Escape') {
    if (ex.open) ex.open = false
    else if (pop.open) closePop()
  }
}
onMounted(() => {
  measure()
  ro = new ResizeObserver(() => measure())
  if (mapWrap.value) ro.observe(mapWrap.value)
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
  window.addEventListener('keydown', onKey)
  fetch(import.meta.env.BASE_URL + 'data/slp.json')
    .then((r) => r.json())
    .then((d) => { SLP.value = d })
    .catch(() => { showSlp.value = false })
})
onBeforeUnmount(() => {
  if (ro) ro.disconnect()
  clearInterval(playTimer)
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseup', onUp)
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.gis {
  position: relative;
  height: 100%;
  padding: 10px;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}
.mapwrap {
  position: relative;
  background: #e9eef4;
  border: 1px solid var(--bnd);
  border-radius: 4px;
  overflow: hidden;
  min-height: 0;
}
.mapwrap svg { width: 100%; height: 100%; display: block; }
.mapwrap image { filter: saturate(1.15) contrast(1.02) brightness(1.02); }
.st-glow { animation: gisGlow 3.2s ease-in-out infinite; }
@keyframes gisGlow {
  0%, 100% { opacity: .25; }
  50% { opacity: .8; }
}

/* 导出按钮 */
.gis-tools { position: absolute; right: 52px; top: 12px; z-index: 8; display: flex; align-items: center; gap: 8px; }
.gis-tools .btn-exp { background: rgba(255,255,255,.96); }
.btn-ghost {
  height: 30px;
  padding: 0 12px;
  border: 1px solid #017de4;
  border-radius: 3px;
  background: rgba(255, 255, 255, .96);
  color: #017de4;
  font-size: 13px;
  cursor: pointer;
}
.btn-ghost:hover { background: #f2f8ff; }
.btn-ghost.on { background: #017de4; color: #fff; }
.gis.side-open .gis-tools { right: 540px; }

/* 图例 */
.gis-legend {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 7;
  background: rgba(255, 255, 255, .95);
  border: 1px solid var(--bnd);
  border-radius: 4px;
  padding: 8px 12px 9px;
  font-size: 12px;
  color: #35506a;
  line-height: 1.7;
  min-width: 148px;
}
.gis-legend .gl-hd { font-weight: 700; color: #017de4; font-size: 12.5px; margin-bottom: 3px; }
.gis-legend .gl-grp { font-size: 11px; color: #93a4b5; margin: 5px 0 1px; }
.gis-legend .gl-row { display: flex; align-items: center; gap: 6px; }
.gis-legend i { width: 10px; height: 10px; display: inline-block; flex: none; }
.gis-legend .s-cir { border-radius: 50%; background: #017de4; }
.gis-legend .s-rec { background: #16b8b0; }
.gis-legend .s-tri { width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 9px solid #26a869; }
.gis-legend .s-tri2 { width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 9px solid #4b6584; }
.gis-legend .s-dia { background: #7b8cff; transform: rotate(45deg) scale(.82); }
.gis-legend .s-pen { background: #2b4c8c; clip-path: polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%); }
.gis-legend .gl-foot { margin-top: 5px; font-size: 10.5px; color: #93a4b5; }

.map-north, .map-scale { z-index: 7; }
.map-scale { right: 12px; bottom: 12px; }
.gis.evo-on .map-scale { bottom: 58px; }
.gis.side-open .map-scale { right: 550px; }
.gis.side-open .map-north { right: 542px; }

/* 站点沿革时间轴 */
.tl-bar {
  position: absolute;
  left: 178px;
  right: 12px;
  bottom: 12px;
  z-index: 8;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, .96);
  border: 1px solid var(--bnd);
  border-radius: 5px;
  box-shadow: 0 2px 10px rgba(20, 50, 80, .08);
  padding: 7px 12px;
  transition: right .18s ease;
}
.gis.side-open .tl-bar { right: 550px; }
.tl-hd { font-size: 12.5px; font-weight: 700; color: #245c85; white-space: nowrap; }
.tl-play {
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: 50%;
  border: 1px solid #017de4;
  background: #fff;
  color: #017de4;
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
}
.tl-play:hover { background: #f2f8ff; }
.tl-year { font-size: 12.5px; color: #5b6b7b; white-space: nowrap; }
.tl-year b { font-size: 18px; color: #017de4; font-weight: 700; margin-right: 2px; font-variant-numeric: tabular-nums; }
.tl-range { flex: 1; min-width: 120px; accent-color: #017de4; height: 4px; cursor: pointer; }
.tl-count { font-size: 12px; color: #8a9aab; white-space: nowrap; }
.tl-count b { color: #017de4; font-size: 13px; }
.tl-count b.off { color: #8a94a3; }
.tl-evo {
  height: 26px;
  padding: 0 10px;
  border: 1px solid #d6dfe9;
  background: #fff;
  border-radius: 3px;
  font-size: 12px;
  color: #35506a;
  cursor: pointer;
  white-space: nowrap;
}
.tl-evo:hover { border-color: #017de4; color: #017de4; }

/* 沿革记录 */
.evo-top { display: flex; align-items: center; gap: 16px; font-size: 12.5px; color: #5b6b7b; padding-bottom: 10px; border-bottom: 1px solid #eef2f6; }
.evo-st b { color: #017de4; font-size: 15px; margin-right: 2px; }
.evo-hint { margin-left: auto; font-size: 11.5px; color: #93a4b5; }
.evo-types { display: flex; gap: 6px; padding: 10px 0 8px; }
.evo-list { max-height: 460px; overflow: auto; border: 1px solid #eef2f6; border-radius: 4px; }
.evo-item { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-bottom: 1px solid #f3f6fa; font-size: 12.5px; cursor: pointer; }
.evo-item:hover { background: #f5f9fe; }
.evo-year { width: 44px; flex: none; color: #017de4; font-weight: 700; font-variant-numeric: tabular-nums; }
.evo-tp { width: 40px; flex: none; text-align: center; font-size: 11px; border-radius: 2px; padding: 1px 0; }
.evo-tp.build { background: #eef6fe; color: #017de4; }
.evo-tp.move { background: #eef8f2; color: #26a869; }
.evo-tp.rename { background: #eef1ff; color: #5a6bd8; }
.evo-tp.close { background: #f4f5f7; color: #8a94a3; }
.evo-item b { color: #17324a; white-space: nowrap; }
.evo-code { color: #93a4b5; font-size: 11.5px; }
.evo-desc { margin-left: auto; color: #8a9aab; font-size: 11.5px; }

.gis-tip { max-width: 250px; line-height: 1.8; }
.gis-tip .tt-tag {
  display: inline-block;
  background: #eef6fe;
  color: #017de4;
  border-radius: 2px;
  padding: 0 4px;
  font-size: 11px;
  margin-right: 3px;
}

/* 站点弹窗 */
.pop-mask {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(13, 35, 58, .26);
}
.pop {
  width: 1020px;
  max-width: 96%;
  max-height: 96%;
  height: 82%;
  background: #fff;
  border-radius: 5px;
  box-shadow: 0 12px 42px rgba(13, 35, 58, .28);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pop-hd { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 13px 18px 9px; }
.pop-title b { font-size: 17px; color: #17324a; }
.pop-title span { margin-left: 8px; font-size: 12px; color: #8296a8; }
.pop-tags { display: flex; align-items: center; gap: 6px; }
.pop-tags .cls { font-size: 11px; padding: 1px 6px; border-radius: 2px; }
.pop-tags .dot { font-size: 11px; padding: 1px 6px; border-radius: 2px; }
.pop-tags .dot::before { content: '●'; margin-right: 3px; font-size: 8px; vertical-align: 1px; }
.c-basic { background: #e8f3fd; color: #017de4; }
.c-special { background: #eaf6f5; color: #119a8f; }
.c-manage { background: #eef1ff; color: #5a6bd8; }
.c-share { background: #f2f4f7; color: #6b7c8f; }
.dot.ok { color: #26a869; background: #eef8f2; }
.dot.off { color: #909399; background: #f4f5f7; }
.dot.maint { color: #b8860b; background: #fdf8e8; }
.pop-x {
  border: none;
  background: none;
  font-size: 20px;
  line-height: 1;
  color: #8a9aab;
  cursor: pointer;
  padding: 0 2px;
  margin-left: 4px;
}
.pop-x:hover { color: #017de4; }

.pop-tabs { display: flex; flex-wrap: wrap; gap: 2px; padding: 0 18px; border-bottom: 1px solid #eef2f6; flex: none; }
.pop-tabs span {
  padding: 8px 11px 7px;
  font-size: 13px;
  color: #5b6b7b;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
}
.pop-tabs span:hover { color: #017de4; }
.pop-tabs span.on { color: #017de4; border-bottom-color: #017de4; font-weight: 700; }
.pop-body { flex: 1; overflow: hidden; padding: 0; }
.pop-comp { height: 100%; padding: 12px 18px 18px; box-sizing: border-box; overflow: hidden; }
.pop-scroll { overflow: auto; }

.gs-sec {
  font-size: 12.5px;
  font-weight: 700;
  color: #245c85;
  margin: 12px 0 6px;
  padding-left: 7px;
  border-left: 3px solid #017de4;
}
.gs-sec:first-child { margin-top: 0; }
.gs-tb { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.gs-tb th, .gs-tb td { border: 1px solid #edf1f6; padding: 5px 7px; text-align: left; vertical-align: top; }
.gs-tb th { background: #fafcfe; color: #7a8fa5; font-weight: 400; white-space: nowrap; width: 96px; }
.gs-tb.center th, .gs-tb.center td { text-align: center; white-space: nowrap; }
.gs-tb.center th { width: auto; }
.gs-note { margin-top: 8px; font-size: 11.5px; color: #93a4b5; line-height: 1.7; }

.gs-flow { display: flex; align-items: center; gap: 6px; }
.fl-item {
  flex: 1;
  border: 1px solid #e4ebf3;
  border-radius: 4px;
  padding: 7px 8px;
  cursor: pointer;
  min-width: 0;
  background: #fbfdff;
}
.fl-item:hover { border-color: #017de4; }
.fl-item.cur { border-color: #017de4; background: #f2f8ff; cursor: default; }
.fl-item.off { cursor: default; opacity: .55; }
.fl-item .fl-tag { display: block; font-size: 10.5px; color: #93a4b5; }
.fl-item b { display: block; font-size: 12.5px; color: #17324a; margin: 1px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fl-item small { font-size: 10.5px; color: #93a4b5; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fl-arrow { color: #b9c8d6; font-size: 14px; }

.gs-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.gc { border: 1px solid #e8eef5; border-radius: 4px; padding: 8px 9px; background: #fbfdff; }
.gc .k { font-size: 11px; color: #8a9aab; }
.gc .v { font-size: 19px; font-weight: 700; color: #17324a; line-height: 1.4; }
.gc .v small { font-size: 10.5px; font-weight: 400; color: #93a4b5; margin-left: 2px; }
.gc .d { font-size: 10.5px; color: #93a4b5; }

.dev-list { border: 1px solid #eef2f6; border-radius: 4px; overflow: hidden; }
.dev-row { display: flex; align-items: center; gap: 8px; padding: 6px 9px; font-size: 12.5px; border-bottom: 1px solid #f2f5f9; }
.dev-row:last-child { border-bottom: none; }
.dev-n { color: #17324a; }
.dev-m { color: #93a4b5; font-size: 11.5px; }
.dev-s { margin-left: auto; font-size: 11px; padding: 1px 6px; border-radius: 2px; }
.dev-s.ok { color: #26a869; background: #eef8f2; }
.dev-s.warn { color: #b8860b; background: #fdf8e8; }

.vid-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.vid {
  position: relative;
  aspect-ratio: 4 / 3;
  background: linear-gradient(135deg, #dfe7ef, #eef3f8 55%, #dae3ec);
  border: 1px solid #d5dfe9;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6b7c8f;
}
.vid:hover { border-color: #017de4; }
.vid .vid-cam { position: absolute; left: 6px; top: 5px; font-size: 10px; color: #fff; background: rgba(1,125,228,.75); padding: 1px 5px; border-radius: 2px; }
.vid .vid-nm { font-size: 12px; }
.vid .vid-tm { font-size: 10px; color: #93a4b5; margin-top: 4px; }

/* 右侧明细 */
.side-tab { z-index: 9; }
.gis.side-open .side-tab { right: 530px; }
.gis-side {
  position: absolute;
  top: 10px;
  right: 10px;
  bottom: 10px;
  width: 520px;
  z-index: 10;
  background: #fff;
  border: 1px solid var(--bnd);
  border-radius: 5px;
  box-shadow: -2px 0 14px rgba(20, 50, 80, .12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.side-hd {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 38px;
  padding: 0 12px;
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
  border-left: 3px solid #017de4;
}
.side-hd b { font-size: 14px; font-weight: 700; color: #303133; }
.side-hd .cnt { margin-left: auto; font-size: 13px; color: #909399; font-weight: 400; }

.side-filters { flex: none; padding: 8px 12px 7px; border-bottom: 1px solid #eef2f6; background: #fbfdff; }
.f-row { display: flex; align-items: flex-start; gap: 6px; padding: 2px 0; }
.f-lb {
  flex: none;
  width: 96px;
  font-size: 12px;
  color: #93a4b5;
  line-height: 22px;
  white-space: nowrap;
}
.f-opts { display: flex; flex-wrap: wrap; gap: 0 1px; min-width: 0; }
.opt {
  font-size: 12px;
  line-height: 22px;
  padding: 0 6px;
  border: 1px solid transparent;
  border-radius: 3px;
  color: #5b6b7b;
  cursor: pointer;
  background: transparent;
  white-space: nowrap;
}
.opt:hover { background: #eef6fe; color: #017de4; }
.opt.on { background: #017de4; color: #fff; font-weight: 500; }
/* “全部”是兜底项，不用蓝色强调，避免每行都有一块蓝 */
.opt.all.on { background: #e8eef5; color: #35506a; font-weight: 500; }

/* 维度切换：连体按钮 */
.seg {
  flex: none;
  display: flex;
  width: 96px;
  border: 1px solid #d6e2ee;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0;
}
.seg span {
  flex: 1;
  text-align: center;
  font-size: 12px;
  line-height: 20px;
  padding: 0;
  color: #5b6b7b;
  cursor: pointer;
  background: #fff;
  white-space: nowrap;
}
.seg span + span { border-left: 1px solid #d6e2ee; }
.seg span:hover { color: #017de4; }
.seg span.on { background: #017de4; color: #fff; }

.f-bottom { display: flex; align-items: center; gap: 10px; padding: 5px 0 1px; margin-top: 3px; border-top: 1px dashed #edf2f7; }
.f-count { font-size: 12px; color: #8a9aab; }
.f-count b { color: #017de4; font-size: 13px; }
.f-reset {
  margin-left: auto;
  border: none;
  background: none;
  color: #017de4;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
}
.f-reset:hover { text-decoration: underline; }
.btn-line {
  height: 26px;
  padding: 0 10px;
  border: 1px solid #017de4;
  border-radius: 3px;
  background: #fff;
  color: #017de4;
  font-size: 12px;
  cursor: pointer;
}
.btn-line:hover { background: #f2f8ff; }

.side-toolbar {
  flex: none;
  display: flex;
  align-items: center;
  padding: 7px 12px;
  border-bottom: 1px solid #ebeef5;
  font-size: 13px;
  color: #606266;
  background: #fff;
}
.tb-tip b { color: #017de4; font-weight: 700; }
.tb-ops { margin-left: auto; display: flex; align-items: center; gap: 12px; }
.tb-reset { color: #017de4; cursor: pointer; font-size: 13px; }
.tb-reset:hover { text-decoration: underline; }

.side-table { flex: 1; min-height: 0; overflow: auto; }
.side-table table.dt { font-size: 14px; }
.side-table table.dt th { padding: 8px 6px; font-weight: 700; }
.side-table table.dt td { padding: 7px 6px; }
.side-table table.dt tbody tr { cursor: pointer; }
.side-table table.dt .nm b { font-weight: 700; }
.side-page { flex: none; display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 7px 12px; border-top: 1px solid #ebeef5; font-size: 13px; color: #909399; }
.pg { height: 24px; border: 1px solid #d6dfe9; background: #fff; border-radius: 3px; font-size: 11.5px; color: #5b6b7b; cursor: pointer; padding: 0 8px; }
.pg:hover:not(:disabled) { border-color: #017de4; color: #017de4; }
.pg:disabled { opacity: .45; cursor: default; }

/* 导出弹窗 */
.ex-wrap { display: grid; grid-template-columns: 268px minmax(0, 1fr); gap: 16px; }
.ex-form { display: flex; flex-direction: column; gap: 12px; }
.ex-f { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: #5b6b7b; }
.ex-f input[type="text"], .ex-f select {
  height: 30px; border: 1px solid #d6dfe9; border-radius: 3px; padding: 0 8px; font-size: 13px; outline: none;
}
.ex-f input[type="text"]:focus, .ex-f select:focus { border-color: #017de4; }
.ex-checks { display: flex; flex-wrap: wrap; gap: 6px 12px; font-size: 12.5px; color: #35506a; }
.ex-checks label { display: inline-flex; align-items: center; gap: 4px; }
.ex-checks input { accent-color: #017de4; }
.ex-info { font-size: 11.5px; color: #93a4b5; line-height: 1.7; }
.ex-btns { display: flex; gap: 8px; margin-top: 4px; }
.ex-prev { border: 1px solid var(--bnd); border-radius: 3px; background: #f4f7fa; padding: 8px; overflow: hidden; }
.ex-prev :deep(svg) { width: 100%; height: auto; display: block; box-shadow: 0 1px 6px rgba(20,50,80,.12); }
</style>
