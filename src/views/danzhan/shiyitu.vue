<template>
  <div class="syt-page">
    <div class="syt-body">
      <svg
        class="syt-svg"
        viewBox="0 0 726 446"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="测站断面示意图与水位仿真"
        @click="closeInfo"
      >
        <defs>
          <!-- 地层渐变（暖色土层，参考剖面图配色） -->
          <linearGradient id="syt-ground-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#c2ab7f" stop-opacity="0.55" />
            <stop offset="100%" stop-color="#6e5b39" stop-opacity="0.26" />
          </linearGradient>

          <!-- 水体渐变 -->
          <linearGradient id="syt-water-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3ba7dd" stop-opacity="0.62" />
            <stop offset="100%" stop-color="#15547d" stop-opacity="0.32" />
          </linearGradient>

          <!-- 超青坎（橙色） -->
          <linearGradient id="syt-water-grad-bank" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f6a129" stop-opacity="0.62" />
            <stop offset="100%" stop-color="#8a5210" stop-opacity="0.32" />
          </linearGradient>

          <!-- 超堤顶（红色） -->
          <linearGradient id="syt-water-grad-dike" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ff5a5a" stop-opacity="0.62" />
            <stop offset="100%" stop-color="#8c1f1f" stop-opacity="0.32" />
          </linearGradient>
        </defs>

        <!-- 高程网格（每个刻度一条虚线，沉积层之上、空域可见） -->
        <g class="syt-grid">
          <line v-for="t in axisTicks" :key="'g' + t" x1="0" :y1="yOfAbs(t)" x2="650" :y2="yOfAbs(t)" />
        </g>

        <!-- 河床/地层：材质填充 + 地形轮廓 -->
        <path class="syt-ground-fill" :d="bed.ground" />
        <path class="syt-ground" :d="bed.line" />

        <!-- 青坎 / 堤顶 高程参考线（置于设施与水体之下） -->
        <!-- <g class="syt-lev">
          <line class="syt-lev-line is-dike" x1="140" :y1="dikeY" x2="560" :y2="dikeY" />
          <text class="syt-lev-tag is-dike" x="568" :y="dikeY + 4">堤顶 {{ fmt(dikeElev) }}m</text>

          <line class="syt-lev-line is-bank" x1="140" :y1="bankY" x2="560" :y2="bankY" />
          <text class="syt-lev-tag is-bank" x="568" :y="bankY + 4">青坎 {{ fmt(bankElev) }}m</text>
        </g> -->

        <!-- ==================== 岸上设施（静态示意） ==================== -->
        <!-- 栈桥/井房支撑桩（伸向河床，先画，压在平台之下） -->
        <g class="syt-item">
          <title>支撑桩</title>
          <line
            v-for="p in pierPiles"
            :key="'pile' + p.x"
            class="syt-hair"
            :x1="p.x"
            :y1="sc.deck.y + sc.deck.h"
            :x2="p.x"
            :y2="p.y2"
          />
        </g>

        <!-- 栈桥平台（连接站房，同时作为水位井房的地基） -->
        <g class="syt-item">
          <title>栈桥</title>
          <rect class="syt-solid" :x="sc.deck.x" :y="sc.deck.y" :width="sc.deck.w" :height="sc.deck.h" />
          <line
            v-for="hx in sc.deck.hatches"
            :key="'hx' + hx"
            class="syt-hair"
            :x1="hx"
            :y1="sc.deck.y"
            :x2="hx"
            :y2="sc.deck.y + sc.deck.h"
          />
        </g>

        <!-- 水位井房 -->
        <g class="syt-item">
          <title>水位井房</title>
          <polygon class="syt-roof" :points="sc.room.roof" />
          <rect class="syt-hollow" :x="sc.room.x" :y="sc.room.y" :width="sc.room.w" :height="sc.room.h" />
          <rect
            v-for="(w, i) in sc.room.windows"
            :key="'rw' + i"
            class="syt-window"
            :x="w.x"
            :y="w.y"
            :width="w.w"
            :height="w.h"
          />
          <rect
            class="syt-door"
            :x="sc.room.door.x"
            :y="sc.room.door.y"
            :width="sc.room.door.w"
            :height="sc.room.door.h"
          />
        </g>

        <!-- 站房（两层，静态示意） -->
        <g class="syt-item">
          <title>站房</title>
          <rect
            class="syt-roof"
            :x="sc.house.roof.x"
            :y="sc.house.roof.y"
            :width="sc.house.roof.w"
            :height="sc.house.roof.h"
            rx="1"
          />
          <rect
            class="syt-solid"
            :x="sc.house.body.x"
            :y="sc.house.body.y"
            :width="sc.house.body.w"
            :height="sc.house.body.h"
          />
          <line
            v-for="(l, i) in sc.house.floors"
            :key="'fl' + i"
            class="syt-hair"
            :x1="l[0]"
            :y1="l[1]"
            :x2="l[2]"
            :y2="l[3]"
          />
          <rect
            v-for="(w, i) in sc.house.windows"
            :key="'hw' + i"
            class="syt-window"
            :x="w.x"
            :y="w.y"
            :width="w.w"
            :height="w.h"
          />
          <rect
            class="syt-door"
            :x="sc.house.door.x"
            :y="sc.house.door.y"
            :width="sc.house.door.w"
            :height="sc.house.door.h"
          />
          <text
            v-for="(t, i) in sc.house.levels"
            :key="'lt' + i"
            class="syt-floor"
            :x="t.x"
            :y="t.y"
            text-anchor="middle"
          >{{ t.t }}</text>
        </g>

        <!-- 翻斗式雨量计 -->
        <g class="syt-item">
          <title>翻斗式雨量计</title>
          <line
            class="syt-hair"
            :x1="sc.rain.stem[0]"
            :y1="sc.rain.stem[1]"
            :x2="sc.rain.stem[2]"
            :y2="sc.rain.stem[3]"
          />
          <path class="syt-solid" :d="sc.rain.head" />
          <rect
            class="syt-hollow"
            :x="sc.rain.body.x"
            :y="sc.rain.body.y"
            :width="sc.rain.body.w"
            :height="sc.rain.body.h"
            :rx="sc.rain.body.rx"
          />
        </g>

        <!-- 蒸发池 -->
        <g class="syt-item">
          <title>蒸发池</title>
          <rect
            class="syt-pool-rim"
            :x="sc.evap.rim.x"
            :y="sc.evap.rim.y"
            :width="sc.evap.rim.w"
            :height="sc.evap.rim.h"
            :rx="sc.evap.rim.rx"
          />
          <rect
            class="syt-pool-water"
            :x="sc.evap.water.x"
            :y="sc.evap.water.y"
            :width="sc.evap.water.w"
            :height="sc.evap.water.h"
          />
        </g>

        <!-- 观测场 -->
        <g class="syt-item">
          <title>观测场</title>
          <rect
            v-if="sc.field.rect"
            class="syt-hollow"
            :x="sc.field.rect.x"
            :y="sc.field.rect.y"
            :width="sc.field.rect.w"
            :height="sc.field.rect.h"
            :rx="sc.field.rect.rx"
          />
          <line
            v-for="(l, i) in sc.field.lines"
            :key="'fl2' + i"
            class="syt-hair"
            :x1="l[0]"
            :y1="l[1]"
            :x2="l[2]"
            :y2="l[3]"
          />
          <rect
            v-for="(b, i) in sc.field.boxes"
            :key="'fb' + i"
            class="syt-solid"
            :x="b.x"
            :y="b.y"
            :width="b.w"
            :height="b.h"
          />
        </g>

        <!-- 岸上设施文字标注 -->
        <g class="syt-labels">
          <text
            v-for="(l, i) in sc.labels"
            :key="'lb' + i"
            :class="l.cls"
            :x="l.x"
            :y="l.y"
            :text-anchor="l.anchor || 'start'"
          >{{ l.t }}</text>
        </g>

        <!-- ==================== 水位仿真叠加层 ==================== -->
        <!-- 水体（随水位动态计算，含河心滩/漫滩处理；超青坎转橙、超堤顶转红） -->
        <path class="syt-water" :class="waterTone" :d="waterPath" />

        <!-- 水面线（水波纹） -->
        <path class="syt-wl-glow" :class="waterTone" :d="surfacePaths" />
        <path class="syt-wl" :class="waterTone" :d="surfacePaths" />

        <!-- 警戒水位 / 保证水位参考线（只有配置了这两级水位的站才画） -->
        <g v-if="warnLineY != null" class="syt-lev-threshold is-warn">
          <line class="syt-lev-line is-warn" x1="0" :y1="warnLineY" x2="650" :y2="warnLineY" />
          <text class="syt-lev-tag is-warn" x="8" :y="warnLineY + 13" text-anchor="start">
            警戒水位 {{ fmt(station.warnLevel) }}m
          </text>
        </g>
        <g v-if="guarLineY != null" class="syt-lev-threshold is-guar">
          <line class="syt-lev-line is-guar" x1="0" :y1="guarLineY" x2="650" :y2="guarLineY" />
          <text class="syt-lev-tag is-guar" x="8" :y="guarLineY - 5" text-anchor="start">
            保证水位 {{ fmt(station.guaranteeLevel) }}m
          </text>
        </g>
        <!-- 历史最高水位：实线（与保证水位仅差 5 cm，线几乎重合，用实线+洋红区分） -->
        <g v-if="histMaxY != null" class="syt-lev-threshold is-hist">
          <line class="syt-lev-line is-hist" x1="0" :y1="histMaxY" x2="650" :y2="histMaxY" />
          <text class="syt-lev-tag is-hist" x="8" :y="histMaxY + 13" text-anchor="start">
            历史最高水位 {{ fmt(station.histMaxLevel) }}m
          </text>
        </g>

        <!-- 水位井（竖井，井内透出水面示意连通水位） -->
        <g class="syt-item">
          <title>水位井</title>
          <rect
            class="syt-well-wall"
            :x="sc.well.x1"
            :y="sc.well.top"
            :width="sc.well.wall"
            :height="sc.well.bottom - sc.well.top"
          />
          <rect
            class="syt-well-wall"
            :x="sc.well.x2"
            :y="sc.well.top"
            :width="sc.well.wall"
            :height="sc.well.bottom - sc.well.top"
          />
          <rect
            class="syt-well-wall"
            :x="sc.well.x1"
            :y="sc.well.bottom - sc.well.wall"
            :width="sc.well.x2 + sc.well.wall - sc.well.x1"
            :height="sc.well.wall"
          />
        </g>

        <!-- 水尺（带刻度） -->
        <g class="syt-item">
          <title>水尺</title>
          <rect
            class="syt-gauge"
            :x="sc.gauge.x"
            :y="sc.gauge.top"
            :width="sc.gauge.w"
            :height="sc.gauge.bottom - sc.gauge.top"
          />
          <path class="syt-gauge-tick" :d="gaugeTickPath" />
        </g>

        <!-- H-ADCP（固定安装的流量计，位置不随水位变化） -->
        <g class="syt-item">
          <title>水平ADCP（水平式声学多普勒流速剖面仪）</title>
          <g :transform="`translate(${adcp.x} ${adcp.y})`">
            <rect class="syt-adcp" x="-9" y="-6" width="18" height="10" rx="2" />
            <circle class="syt-adcp-lens" cx="-3" cy="-1" r="2" />
          </g>
        </g>

        <!-- 涉水设施文字（水尺/水位井已并入 sc.labels，这里只补随水位浮动的 H-ADCP） -->
        <g class="syt-labels">
          <text class="syt-label-sm" :x="adcp.x + 13" :y="adcp.y + 4">H-ADCP</text>
        </g>

        <!-- 水位提示框 -->
        <g class="syt-callout" :transform="`translate(${calloutX} ${calloutY})`">
          <polygon points="24,26 34,26 29,44" />
          <rect width="60" height="26" rx="6" />
          <text class="syt-callout-t" x="10" y="18">{{ fmt(level) }} m</text>
          <!-- <text v-if="nextCritical != null" class="syt-callout-s" x="10" y="38">
            距下一临界水位 {{ fmt(toNext) }} m（{{ fmt(nextCritical) }} m）
          </text>
          <text v-else class="syt-callout-s" x="10" y="38">已达最高临界高程</text> -->
        </g>

        <!-- 设备高程标记 + 编号 + 受淹高亮（编号与右侧清单一一对应，点击查看名称/高程） -->
        <g
          v-for="f in numberedFacilities"
          :key="f.id"
          class="syt-dev"
          :class="{ 'is-active': f.no === activeNo }"
          @click.stop="toggleInfo(f)"
        >
          <title>{{ f.name }} {{ fmt(f.elev) }}m</title>
          <template v-if="statusOf(f) === 'flood'">
            <circle :cx="f.x" :cy="f.y" r="10" class="syt-flood-halo" />
            <text :x="f.x" :y="f.y - 12" class="syt-flood-text">{{ f.dangerText }}</text>
          </template>
          <!-- 透明扩大热区，编号圆点本身只有 6.5，不好点 -->
          <circle class="syt-no-hit" :cx="f.bx" :cy="f.by" r="11" />
          <circle class="syt-no-badge" :cx="f.bx" :cy="f.by" r="6.5" :fill="dotColor(f)" />
          <text class="syt-no-text" :x="f.bx" :y="f.by + 2.6" text-anchor="middle" :fill="noTextColor(f)">
            {{ f.no }}
          </text>
        </g>

        <!-- 编号提示框：名称 + 关键高程 + 当前状态 -->
        <g v-if="activeTip" class="syt-tip" @click.stop>
          <rect
            :x="activeTip.x"
            :y="activeTip.y"
            :width="activeTip.w"
            :height="activeTip.h"
            rx="5"
          />
          <text class="syt-tip-t" :x="activeTip.x + 8" :y="activeTip.y + 16">{{ activeTip.title }}</text>
          <text class="syt-tip-s" :x="activeTip.x + 8" :y="activeTip.y + 31">{{ activeTip.sub }}</text>
        </g>

        <!-- 河底/槽底高程标注 -->
        <!-- <g class="syt-trough">
          <g v-for="(t, i) in troughItems" :key="i">
            <line class="syt-trough-leader" :x1="t.tx" :y1="t.ty" :x2="t.x" :y2="t.y" />
            <circle class="syt-trough-dot" :cx="t.x" :cy="t.y" r="2.5" />
            <text class="syt-trough-tag" :x="t.tx" :y="t.ty" :text-anchor="t.anchor">{{ t.name }}</text>// {{ fmt(t.elev) }}m
          </g>
        </g> -->

        <!-- 右侧高程标尺 -->
        <g class="syt-axis">
          <line x1="655" :y1="55" x2="655" :y2="445" />
          <line v-for="t in axisTicks" :key="t" x1="651" :y1="yOfAbs(t)" x2="655" :y2="yOfAbs(t)" />
          <text v-for="t in axisTicks" :key="'l' + t" x="659" :y="yOfAbs(t) + 3" text-anchor="start">{{ fmtTick(t) }}</text>
          <text x="655" y="45" text-anchor="middle" class="syt-axis-title">高程(m)</text>

          <!-- 右侧水位指示 -->
          <g class="syt-axis-wl" :class="waterTone">
            <polygon :points="`648,${waterY - 5} 648,${waterY + 5} 639,${waterY}`" />
            <text x="646" :y="waterY - 9" text-anchor="end">水位</text>
          </g>
        </g>
      </svg>

      <!-- 仿真控制面板 -->
      <div class="syt-panel">
        <div class="syt-panel-head">
          <span class="syt-panel-title">水位仿真模拟</span>
          <span class="syt-panel-station">{{ stationName }}</span>
          <button class="syt-btn syt-btn-sm" :disabled="levelLoading" @click="refreshWaterLevel">刷新</button>
        </div>

        <!-- <div class="syt-readout">
          <span class="syt-readout-num" :class="{ 'is-loading': levelLoading, 'is-none': currentLevel == null }">
            {{ currentLevel != null ? fmt(currentLevel) : levelLoading ? "加载中…" : "-" }}
          </span>
          <span class="syt-readout-unit" >m</span>
          <span class="syt-level-state" :class="'is-' + levelState">{{ levelStateText }}</span>
        </div> -->

        <div class="syt-current">
          <span class="syt-current-label">模拟水位</span>
          <!-- <span class="syt-current-num" :class="{ 'is-loading': levelLoading, 'is-none': currentLevel == null }">
            {{ currentLevel != null ? fmt(currentLevel) + "m" : levelLoading ? "加载中…" : "无数据" }}
          </span> -->
          <span class="syt-current-num" :class="'is-' + levelState">{{ fmt(level) }}</span>
          <span class="syt-readout-unit">m</span>
          <span class="syt-level-state" :class="'is-' + levelState">{{ levelStateText }}</span>
        </div>

        <div class="syt-slider-row">
          <button class="syt-btn" @click="togglePlay">{{ playing ? "暂停" : "播放" }}</button>
          <input
            class="syt-slider"
            type="range"
            :min="station.simMin"
            :max="station.simMax"
            :step="stepSize"
            v-model.number="level"
          />
          <button class="syt-btn" @click="reset">复位</button>
        </div>

        <div class="syt-legend">
          <span class="syt-legend-item is-safe">正常</span>
          <!-- <span class="syt-legend-item is-warn">临界</span> -->
          <span class="syt-legend-item is-flood">受淹</span>
        </div>

        <div class="syt-panel-body">
          <ul class="syt-status">
            <li
              v-for="f in numberedFacilities"
              :key="f.id"
              class="syt-status-item"
              :class="[statusClass(f), { 'is-active': f.no === activeNo }]"
              @click="toggleInfo(f)"
            >
              <span class="syt-status-no">{{ f.no }}</span>
              <span class="syt-status-name">{{ f.name }}</span>
              <span class="syt-status-elev">{{ fmt(f.elev) }}m</span>
              <span class="syt-status-chip">{{ statusText(f) }}</span>
            </li>
          </ul>

          <!-- 测站基础信息（太浦闸：历史最高水位、两岸堤顶/青坎、各设施高程） -->
          <ul v-if="station.notes" class="syt-notes">
            <li v-for="(n, i) in station.notes" :key="'note' + i">{{ n }}</li>
          </ul>

          <!-- 超标洪水测验方案：随仿真水位自动切换所属水位级（表 2） -->
          <div v-if="station.plan && planTier" class="syt-plan">
            <div class="syt-plan-head">
              <span class="syt-plan-title">{{ station.plan.title }}</span>
              <span class="syt-plan-level">{{ planTier.level }}</span>
            </div>
            <div class="syt-plan-block">
              <span class="syt-plan-tag is-water">水位</span>
              <p v-for="(t, i) in planTier.water" :key="'pw' + i">{{ t }}</p>
            </div>
            <div class="syt-plan-block">
              <span class="syt-plan-tag is-flow">流量</span>
              <p v-for="(t, i) in planTier.flow" :key="'pf' + i">{{ t }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed, watchEffect, onMounted, onBeforeUnmount } from "vue";
import { stationByCode } from "@/data/stationNetwork";
import { waterLevelOf } from "@/data/stationProfile";

// ==================== 太浦闸断面几何 ====================
// 高程（m）：左岸堤顶 7.90、左岸青坎 5.06、右岸堤顶 6.51、右岸青坎 5.06；
// 一楼站房地面 5.10、二楼站房地面 7.93、测流栈桥 5.10、自记水位计 5.10、
// 水尺观测能力 6.00、雨量计底座 7.76、蒸发池池沿 7.90、降水量观测场 7.60。
//
// 横向 x 为示意位置；纵向 y 与 mapper 的分段比例一致：
//   青坎 5.06 → y=205，河底 -2.00 → y=432（青坎以下 32.15 px/m）
//   青坎 5.06 → y=205，最高设施 7.93 → y=55（青坎以上 52.26 px/m）
// 由此：7.60→72.3  7.76→63.9  7.90→56.6  6.51→129.2  6.00→155.9  5.10→202.9
function polyPath(points) {
  return points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");
}

const TPZ_LEFT = [
  [0, 56.6], // 左岸堤顶 7.90：雨量计、蒸发池、降水量观测场都在这一级平台上
  [132, 56.6],
  [148, 205], // 近乎垂直的堤坡下到青坎 5.06
  [180, 205], // 左岸青坎（站房立在青坎上，外沿即河岸线）
];
// 河底形态按资料断面图逐点描出：左岸岸墙接近垂直，墙脚有小平台；
// 中上部为长缓坡，坡上留有小坎；主槽平底宽而平，最深点偏左；
// 右岸自槽底以缓坡上抬，中上部再分两级台阶，最后陡升至右岸青坎。
const TPZ_BED = [
  [180, 205], // 左岸青坎边缘（水位井、水尺所在断面）
  [184, 231], // 岸墙
  [188, 254],
  [192, 277],
  [196, 289], // 墙脚小平台
  [199, 293],
  [203, 310],
  [209, 322],
  [215, 327], // 转入长缓坡
  [229, 340],
  [245, 352],
  [259, 361],
  [268, 368],
  [273, 372], // 缓坡上的小坎
  [279, 380],
  [287, 393],
  [293, 406],
  [300, 416],
  [307, 422],
  [317, 425],
  [330, 426],
  [347, 427], // 主槽最深处
  [361, 426],
  [368, 420], // 槽底小台阶
  [372, 417],
  [381, 412],
  [393, 409],
  [405, 406],
  [414, 402], // 右岸坡脚
  [425, 391],
  [437, 380],
  [448, 368],
  [458, 356],
  [465, 347], // 第一级台阶
  [469, 340],
  [476, 324],
  [481, 307], // 第二级台阶
  [484, 297],
  [488, 274],
  [492, 251],
  [494, 238], // 岸墙小坎
  [496, 229],
  [499, 215],
  [504, 205], // 右岸青坎边缘
];
const TPZ_RIGHT = [
  [504, 205], // 右岸青坎 5.06
  [518, 205],
  [524, 186],
  [536, 186],
  [544, 129.2], // 右岸堤顶 6.51
  [616, 129.2],
];

// ==================== 岸上/涉水设施几何（px） ====================
// 各断面共用同一套设施绘制方式，只是位置不同，统一放在 scene 里。
const SCENES = {
  // 太师桥 / 思源 / 街口：原有版式
  default: {
    piles: [180, 198, 228],
    deck: { x: 170, y: 169, w: 66, h: 7, hatches: [178, 186, 194, 202, 210, 218, 226] },
    room: {
      x: 196, y: 132, w: 36, h: 44,
      roof: "191,132 214,116 237,132",
      windows: [{ x: 200, y: 140, w: 6, h: 6 }, { x: 222, y: 140, w: 6, h: 6 }],
      door: { x: 210, y: 152, w: 8, h: 17 },
    },
    well: { x1: 205, x2: 219, wall: 4, top: 176, bottom: 274 },
    gauge: { x: 240, top: 134, w: 5, bottom: 300 },
    adcpX: 252,
    rain: { stem: [14, 88, 14, 72], head: "M 9 66 L 19 66 L 16.5 72 L 11.5 72 Z", body: { x: 10, y: 72, w: 8, h: 10, rx: 1 } },
    evap: { rim: { x: 28, y: 82, w: 22, h: 12, rx: 1.5 }, water: { x: 30, y: 85, w: 18, h: 6 } },
    field: {
      rect: { x: 72, y: 72, w: 36, h: 12, rx: 1 },
      lines: [[72, 78, 108, 78], [84.5, 72, 84.5, 63]],
      boxes: [{ x: 80, y: 63, w: 9, h: 9 }, { x: 94, y: 66, w: 7, h: 6 }],
    },
    house: {
      roof: { x: 128, y: 46, w: 46, h: 8 },
      body: { x: 132, y: 54, w: 38, h: 122 },
      floors: [[132, 110, 170, 110]],
      // 每层楼只有两扇窗户：二楼一扇左、一扇右
      windows: [
        { x: 138, y: 77, w: 7, h: 9 }, { x: 152, y: 77, w: 7, h: 9 },
        { x: 138, y: 120, w: 7, h: 9 }, { x: 152, y: 120, w: 7, h: 9 },
      ],
      door: { x: 146, y: 152, w: 10, h: 24 },
      levels: [{ x: 151, y: 104, t: "二楼" }, { x: 151, y: 146, t: "一楼" }],
    },
    labels: [
      { x: 17, y: 56, t: "雨量计", cls: "syt-label-sm", anchor: "middle" },
      { x: 39, y: 74, t: "蒸发池", cls: "syt-label-sm", anchor: "middle" },
      { x: 90, y: 60, t: "观测场", cls: "syt-label-sm", anchor: "middle" },
      { x: 172, y: 82, t: "站房" },
      { x: 181, y: 108, t: "水位井房" },
      { x: 173, y: 162, t: "栈桥" },
      { x: 248, y: 150, t: "水尺" },
      { x: 203, y: 292, t: "水位井", anchor: "end" },
    ],
  },

  // 太浦闸：左岸堤顶 7.90 放坡到青坎 5.06，两层的站房（一楼 5.10、二楼 7.93）立在青坎上，
  // 栈桥从青坎伸向河心，水尺贴在栈桥端部投入水中
  tpz: {
    piles: [210, 240, 270, 298],
    deck: {
      x: 182, y: 200, w: 124, h: 6,
      hatches: [192, 202, 212, 222, 232, 242, 252, 262, 272, 282, 292],
    },
    // 水位井房在栈桥尽端（靠河心一侧），水位井从井房下方直插水中
    room: {
      x: 262, y: 150, w: 34, h: 52,
      roof: "258,150 300,150 300,156 258,156",
      windows: [{ x: 268, y: 160, w: 6, h: 6 }, { x: 282, y: 160, w: 6, h: 6 }],
      door: { x: 275, y: 186, w: 8, h: 16 },
    },
    well: { x1: 270, x2: 288, wall: 4, top: 206, bottom: 349 },
    gauge: { x: 186, top: 156, w: 5, bottom: 300 },
    adcpX: 302,
    rain: { stem: [14, 48.3, 14, 56.6], head: "M 9 34.3 L 19 34.3 L 16.5 40.3 L 11.5 40.3 Z", body: { x: 10, y: 40.3, w: 8, h: 8, rx: 1 } },
    evap: { rim: { x: 30, y: 49, w: 22, h: 7.6, rx: 1.5 }, water: { x: 32, y: 51.5, w: 18, h: 4 } },
    field: {
      rect: { x: 3, y: 52, w: 52, h: 4.6, rx: 1 },
      lines: [],
      boxes: [],
    },
    // 站房：一层 5.10、二层 7.93，平顶，顶部略高于堤顶（与示意图一致）
    house: {
      roof: { x: 144, y: 37, w: 40, h: 6 },
      body: { x: 148, y: 43, w: 32, h: 160 },
      // 二楼楼板（7.93 m）对应 y≈94，一/二楼之间的分隔线；顶楼在 8 m 线以下
      floors: [[148, 94, 180, 94]],
      // 每层楼只有两扇窗户：二楼一扇左、一扇右
      windows: [
        { x: 154, y: 82, w: 7, h: 9 }, { x: 168, y: 82, w: 7, h: 9 },
        { x: 154, y: 158, w: 7, h: 9 }, { x: 168, y: 158, w: 7, h: 9 },
      ],
      door: { x: 160, y: 178, w: 10, h: 25 },
      levels: [{ x: 164, y: 90, t: "二楼" }, { x: 164, y: 196, t: "一楼" }],
    },
    labels: [
      { x: 16, y: 26, t: "雨量计", cls: "syt-label-sm", anchor: "middle" },
      { x: 47, y: 44, t: "蒸发池", cls: "syt-label-sm", anchor: "middle" },
      // { x: 84, y: 44, t: "左岸", cls: "syt-label-sm", anchor: "middle" },
      { x: 8, y: 92, t: "降水观测场", cls: "syt-label-sm" },
      { x: 184, y: 70, t: "站房" },
      { x: 256, y: 146, t: "水位井房", anchor: "end" },
      { x: 306, y: 196, t: "栈桥" },
      { x: 196, y: 166, t: "水尺" },
      { x: 264, y: 300, t: "水位井", anchor: "end" },
      // { x: 572, y: 122, t: "右岸", cls: "syt-label-sm", anchor: "middle" },
    ],
  },
};

// ==================== 河底断面形态 ====================
//   dual   双槽：槽间有河心滩，形成两个“底”（思源）
//   single 单槽：左岸陡、槽底偏左收成 V 形、右岸宽缓抬升后陡升（太师桥）
//   flat   梯形槽：上口陡、底部宽平、槽底两角圆滑（街口）
//   taipuzha 太浦闸：左岸为近乎垂直的岸墙、右岸青坎 5.06 上抬至堤顶 6.51
const BED_PROFILES = {
  dual: {
    water: `M 178 210 L 530 210 L 530 213 L 528 240 L 514 252 L 506 272
      L 492 350 L 476 374 Q 466 387 454 396 Q 442 405 428 404
      L 414 400 Q 402 386 392 364 Q 384 342 368 341
      Q 356 342 354 354 Q 342 372 330 396 L 318 414
      Q 304 430 288 432 L 272 432 Q 258 428 248 416 L 234 400
      Q 220 378 210 354 L 203 345 L 192 295 L 183 245 L 178 205 Z`,
    ground: `M 0 89 L 14 89 L 56 88 L 70 80 L 112 80 L 132 176 L 173 178
      L 178 205 L 183 245 L 192 295 L 203 345 L 210 354
      Q 220 378 234 400 L 248 416 Q 258 428 272 432 L 288 432
      Q 304 430 318 414 L 330 396 Q 342 372 354 354
      Q 356 342 368 341 Q 384 342 392 364 Q 402 386 414 400
      L 428 404 Q 442 405 454 396 Q 466 387 476 374
      L 492 350 L 506 272 L 514 252 L 528 240 L 530 213
      L 530 176 L 554 176 L 568 128 L 616 128
      L 616 446 L 0 446 Z`,
    line: `M 14 89 L 56 88 L 70 80 L 112 80 L 132 176 L 173 178
      L 178 205 L 183 245 L 192 295 L 203 345 L 210 354
      Q 220 378 234 400 L 248 416 Q 258 428 272 432 L 288 432
      Q 304 430 318 414 L 330 396 Q 342 372 354 354
      Q 356 342 368 341 Q 384 342 392 364 Q 402 386 414 400
      L 428 404 Q 442 405 454 396 Q 466 387 476 374
      L 492 350 L 506 272 L 514 252 L 528 240 L 530 213
      L 530 176 L 554 176 L 568 128 L 616 128`,
    // 用于水位填充的河底折线（左岸顶 → 槽底 → 右岸顶，含河心滩）
    pts: [
      [178, 205], [183, 245], [192, 295], [203, 345], [210, 354],
      [234, 400], [248, 416], [272, 432], [288, 432],
      [318, 414], [330, 396], [354, 354], [368, 341],
      [392, 364], [414, 400], [428, 404], [454, 396], [476, 374],
      [492, 350], [506, 272], [514, 252], [528, 240], [530, 210],
    ],
    arrow: { x: 278, y: 422 },
    deepY: 432,
    troughs: [
      { x: 280, y: 432, tx: 205, ty: 395, anchor: "end" },
      { x: 428, y: 404, tx: 475, ty: 380, anchor: "start" },
    ],
    scene: "default",
    left: [[0, 89], [14, 89], [56, 88], [70, 80], [112, 80], [132, 176], [173, 178]],
    right: [[530, 176], [554, 176], [568, 128], [616, 128]],
  },
  single: {
    water: `M 178 210 L 530 210
      C 529 216.7 526.3 237.5 524 250 C 521.7 262.5 519.3 274.2 516 285
      C 512.7 295.8 508.8 305.5 504 315 C 499.2 324.5 494.2 333.5 487 342
      C 479.8 350.5 470.5 358.7 461 366 C 451.5 373.3 441 379.7 430 386
      C 419 392.3 405.8 398.3 395 404 C 384.2 409.7 373.7 414.8 365 420
      C 356.3 425.2 346.7 432.5 343 435 C 338.8 433.3 326.5 429.2 318 425
      C 309.5 420.8 300.5 416 292 410 C 283.5 404 275.3 397.7 267 389
      C 258.7 380.3 249.8 368.2 242 358 C 234.2 347.8 226.5 337.8 220 328
      C 213.5 318.2 207.3 309 203 299 C 198.7 289 196.3 278.5 194 268
      C 191.7 257.5 191.7 246.5 189 236 C 186.3 225.5 179.8 210.2 178 205 Z`,
    ground: `M 0 89 L 14 89 L 56 88 L 70 80 L 112 80 L 132 176 L 173 178
      L 178 205
      C 179.8 210.2 186.3 225.5 189 236 C 191.7 246.5 191.7 257.5 194 268
      C 196.3 278.5 198.7 289 203 299 C 207.3 309 213.5 318.2 220 328
      C 226.5 337.8 234.2 347.8 242 358 C 249.8 368.2 258.7 380.3 267 389
      C 275.3 397.7 283.5 404 292 410 C 300.5 416 309.5 420.8 318 425
      C 326.5 429.2 338.8 433.3 343 435 C 346.7 432.5 356.3 425.2 365 420
      C 373.7 414.8 384.2 409.7 395 404 C 405.8 398.3 419 392.3 430 386
      C 441 379.7 451.5 373.3 461 366 C 470.5 358.7 479.8 350.5 487 342
      C 494.2 333.5 499.2 324.5 504 315 C 508.8 305.5 512.7 295.8 516 285
      C 519.3 274.2 521.7 262.5 524 250 C 526.3 237.5 529 216.7 530 210
      L 530 176 L 554 176 L 568 128 L 616 128
      L 616 446 L 0 446 Z`,
    line: `M 14 89 L 56 88 L 70 80 L 112 80 L 132 176 L 173 178
      L 178 205
      C 179.8 210.2 186.3 225.5 189 236 C 191.7 246.5 191.7 257.5 194 268
      C 196.3 278.5 198.7 289 203 299 C 207.3 309 213.5 318.2 220 328
      C 226.5 337.8 234.2 347.8 242 358 C 249.8 368.2 258.7 380.3 267 389
      C 275.3 397.7 283.5 404 292 410 C 300.5 416 309.5 420.8 318 425
      C 326.5 429.2 338.8 433.3 343 435 C 346.7 432.5 356.3 425.2 365 420
      C 373.7 414.8 384.2 409.7 395 404 C 405.8 398.3 419 392.3 430 386
      C 441 379.7 451.5 373.3 461 366 C 470.5 358.7 479.8 350.5 487 342
      C 494.2 333.5 499.2 324.5 504 315 C 508.8 305.5 512.7 295.8 516 285
      C 519.3 274.2 521.7 262.5 524 250 C 526.3 237.5 529 216.7 530 210
      L 530 176 L 554 176 L 568 128 L 616 128`,
    // 左岸顶 → 槽底 → 右岸顶
    pts: [
      [178, 205], [189, 236], [194, 268], [203, 299], [220, 328],
      [242, 358], [267, 389], [292, 410], [318, 425], [343, 435],
      [365, 420], [395, 404], [430, 386], [461, 366], [487, 342],
      [504, 315], [516, 285], [524, 250], [530, 210],
    ],
    arrow: { x: 338, y: 426 },
    deepY: 435,
    troughs: [{ x: 343, y: 435, tx: 300, ty: 342, anchor: "start" }],
    scene: "default",
    left: [[0, 89], [14, 89], [56, 88], [70, 80], [112, 80], [132, 176], [173, 178]],
    right: [[530, 176], [554, 176], [568, 128], [616, 128]],
  },
  // 街口：上口陡、底部宽平的梯形槽
  flat: {
    water: `M 178 210 L 530 210
      C 529.7 212.2 530.3 216.3 528 223 C 525.7 229.7 519.8 241 516 250
      C 512.2 259 508.7 268.2 505 277 C 501.3 285.8 497.5 294.2 494 303
      C 490.5 311.8 487.8 321 484 330 C 480.2 339 475.8 350.3 471 357
      C 466.2 363.7 465.3 365 455 370 C 444.7 375 416.7 384.2 409 387
      Q 402 391 392 391 L 283 390.5 Q 272 390 265 383
      C 263.7 380.8 260 374.3 257 370 C 254 365.7 251.3 363.7 247 357
      C 242.7 350.3 235.8 339 231 330 C 226.2 321 222.5 311.8 218 303
      C 213.5 294.2 208.8 285.8 204 277 C 199.2 268.2 193 259 189 250
      C 185 241 181.8 230.5 180 223 C 178.2 215.5 178.3 208 178 205 Z`,
    ground: `M 0 89 L 14 89 L 56 88 L 70 80 L 112 80 L 132 176 L 173 178
      L 178 205
      C 178.3 208 178.2 215.5 180 223 C 181.8 230.5 185 241 189 250
      C 193 259 199.2 268.2 204 277 C 208.8 285.8 213.5 294.2 218 303
      C 222.5 311.8 226.2 321 231 330 C 235.8 339 242.7 350.3 247 357
      C 251.3 363.7 254 365.7 257 370 C 260 374.3 263.7 380.8 265 383
      Q 272 390 283 390.5 L 392 391 Q 402 391 409 387
      C 416.7 384.2 444.7 375 455 370 C 465.3 365 466.2 363.7 471 357
      C 475.8 350.3 480.2 339 484 330 C 487.8 321 490.5 311.8 494 303
      C 497.5 294.2 501.3 285.8 505 277 C 508.7 268.2 512.2 259 516 250
      C 519.8 241 525.7 229.7 528 223 C 530.3 216.3 529.7 212.2 530 210
      L 530 176 L 554 176 L 568 128 L 616 128
      L 616 446 L 0 446 Z`,
    line: `M 14 89 L 56 88 L 70 80 L 112 80 L 132 176 L 173 178
      L 178 205
      C 178.3 208 178.2 215.5 180 223 C 181.8 230.5 185 241 189 250
      C 193 259 199.2 268.2 204 277 C 208.8 285.8 213.5 294.2 218 303
      C 222.5 311.8 226.2 321 231 330 C 235.8 339 242.7 350.3 247 357
      C 251.3 363.7 254 365.7 257 370 C 260 374.3 263.7 380.8 265 383
      Q 272 390 283 390.5 L 392 391 Q 402 391 409 387
      C 416.7 384.2 444.7 375 455 370 C 465.3 365 466.2 363.7 471 357
      C 475.8 350.3 480.2 339 484 330 C 487.8 321 490.5 311.8 494 303
      C 497.5 294.2 501.3 285.8 505 277 C 508.7 268.2 512.2 259 516 250
      C 519.8 241 525.7 229.7 528 223 C 530.3 216.3 529.7 212.2 530 210
      L 530 176 L 554 176 L 568 128 L 616 128`,
    pts: [
      [178, 205], [180, 223], [189, 250], [204, 277], [218, 303],
      [231, 330], [247, 357], [257, 370], [265, 383], [283, 390.5],
      [392, 391], [409, 387], [455, 370], [471, 357], [484, 330],
      [494, 303], [505, 277], [516, 250], [528, 223], [530, 210],
    ],
    arrow: { x: 330, y: 382 },
    deepY: 391,
    troughs: [{ x: 340, y: 391, tx: 300, ty: 360, anchor: "start" }],
    scene: "default",
    left: [[0, 89], [14, 89], [56, 88], [70, 80], [112, 80], [132, 176], [173, 178]],
    right: [[530, 176], [554, 176], [568, 128], [616, 128]],
  },
  // 太浦闸（闸上游 63205310 / 闸下游 63205311）
  taipuzha: {
    ground: polyPath([...TPZ_LEFT, ...TPZ_BED, ...TPZ_RIGHT]) + " L 616 446 L 0 446 Z",
    line: polyPath([...TPZ_LEFT, ...TPZ_BED, ...TPZ_RIGHT]),
    pts: TPZ_BED,
    left: TPZ_LEFT,
    right: TPZ_RIGHT,
    scene: "tpz",
    arrow: { x: 347, y: 420 },
    deepY: 427,
    troughs: [{ x: 347, y: 427, tx: 314, ty: 374, anchor: "start" }],
  },
};

// ==================== 站点高程与设施信息 ====================
// elev：设施关键高程（受淹/超限阈值）；kind：dike 堤顶 / bank 青坎 / 其余为设备

// 太浦闸水文站：左右岸高程不对称（左堤顶 7.90 / 右堤顶 6.51），
// 因此额外提供 bankElevLeft/Right、dikeElevLeft/Right，未提供时回落到 bankElev/dikeElev。
const TPZ_STATION = {
  name: "太浦闸",
  bankElev: 5.06, // 左右青坎同为 5.06
  bankElevLeft: 5.06,
  bankElevRight: 5.06,
  dikeElev: 6.51, // 取两岸较低的一侧作为漫顶阈值
  dikeElevLeft: 7.90,
  dikeElevRight: 6.51,
  bottomElev: -2.0, // 河底（示意图取值，接入实测断面后可替换）
  adcpElev: 2.0, // H-ADCP 固定安装在 2.00 m 高程（不随水位变化）
  warnLevel: 3.88, // 警戒水位：超过即为超警（橙色）
  guaranteeLevel: 4.66, // 保证水位：超过即为超保（红色）
  histMaxLevel: 4.61,
  floodStdLevel: 4.65,
  defaultLevel: 2.5,
  simMin: 1.0,
  simMax: 8.6,
  notes: [
    "警戒水位 3.88 m · 保证水位 4.66 m",
    "历史最高水位 4.61 m（1961—2020）",
    "太湖超标洪水位 4.65 m",
    "左岸：堤顶 7.90 m · 青坎 5.06 m",
    "右岸：堤顶 6.51 m · 青坎 5.06 m",
    "水尺观测 6.00 m · 自记水位计 5.10 m · 测流栈桥 5.10 m",
    "一楼站房地面 5.10 m · 二楼站房地面 7.93 m",
    "观测场 7.60 m · 雨量计底座 7.76 m · 蒸发池池沿 7.90 m",
  ],
  // 表 2 超标洪水测验方案：按水位级给出水位/流量测验办法，随仿真水位自动切换
  plan: {
    title: "超标洪水测验方案",
    tiers: [
      {
        max: 5.06, // 左右岸青坎高程
        level: "水位 ≤ 5.06 m（左右岸青坎）",
        water: [
          "本站自记水位测洪能力为 5.10 m，当自记水位计故障时，在故障修复期间，水位测验方案如下：",
          "（1）启用视频水位自动观测水位，采集频次为每 30 分钟一次，待自记水位计修复后，人工复核水位数据。",
          "（2）自记水位计设备故障修复时间较长时，在左岸青坎附近布设压力式或雷达式水位计观测，采集频次为每 5 分钟一次，待恢复后人工校核。",
          "（3）在站人员负责观测水位。",
        ],
        flow: [
          "本站采用 H-ADCP 在线监测，采用缆道携带走航式 ADCP 适时渡河开展流量比测。此水位级尚未影响测流条件，具备正常测流条件。当测流条件受限时，采用以下测流方案：",
          "（1）在横扇大桥上采用走航式 ADCP 测流，根据水情变化测量流量特征值（掌握流量变化过程），一般采用四段制测流，必要时加密测次。",
          "（2）因供电中断等情况，可在横扇大桥上采用电波流速仪（手持式）测流，结合相应关系计算流量，根据水情变化测量流量特征值（掌握流量变化过程），一般采用四段制测流，必要时加密测次。",
          "（3）吴志超和戴毓负责测流。",
        ],
      },
      {
        max: 6.51, // 右岸堤顶高程
        level: "5.06 m < 水位 ≤ 6.51 m（右岸堤顶）",
        water: [
          "此水位级已接近甚至超过自记水位计测洪能力，自记水位计无法正常工作，水位观测采用如下：",
          "（1）在左岸青坎附近布设压力式或雷达式水位计观测，采集频次为每 5 分钟一次。",
          "（2）在站房楼梯处提前布设水尺，不定期人工校核压力式或雷达式水位计。",
          "（3）在站人员负责观测水位。",
        ],
        flow: [
          "此水位级已影响测站供电和安全，此时采用如下测流方案：",
          "（1）在横扇大桥上采用走航式 ADCP 测流，根据水情变化测量流量特征值（掌握流量变化过程），一般采用四段制测流，必要时加密测次。",
          "（2）若走航式 ADCP 故障、市电中断或应急电源无法供电，在横扇大桥上采用流速仪（含电波流速仪）桥测流量，根据水情变化测量流量特征值（掌握流量变化过程），一般采用四段制测流，必要时加密测次。",
          "（3）吴志超和贺攀飞负责测流。",
        ],
      },
      {
        max: null, // 超过右岸堤顶
        level: "水位 > 6.51 m",
        water: ["出现漫堤现象，水位观测以水文调查为主。"],
        flow: ["此水位级已发生漫堤现象，流量测验以水文调查为主。"],
      },
    ],
  },
  facilities: [
    // nOff：图上编号相对设施点的微调 [dx, dy]，用来避开站房楼层文字、池沿等
    { id: "tpz-rain", name: "雨量计", elev: 7.76, x: 14, kind: "rain", dangerText: "底座受淹" },
    { id: "tpz-field", name: "降水量观测场", elev: 7.60, x: 32, kind: "field", dangerText: "观测场进水", nOff: [-18, 10] },
    { id: "tpz-evap", name: "蒸发池", elev: 7.90, x: 47, kind: "evap", dangerText: "池沿过水", nOff: [16, 4] },
    { id: "tpz-room1", name: "一楼站房", elev: 5.10, x: 164, kind: "floor", dangerText: "一楼进水" },
    { id: "tpz-room2", name: "二楼站房", elev: 7.93, x: 164, kind: "floor", dangerText: "二楼进水" },
    { id: "tpz-deck", name: "测流栈桥", elev: 5.10, x: 240, kind: "deck", dangerText: "栈桥过水" },
    { id: "tpz-well", name: "自记水位计", elev: 5.10, x: 279, kind: "float", dangerText: "超监测上限" },
    { id: "tpz-gauge", name: "水尺", elev: 6.00, x: 186, kind: "gauge", dangerText: "超观测上限" },
    { id: "tpz-adcp", name: "H-ADCP", elev: 5.10, x: 302, kind: "adcp", dangerText: "供电受淹", nOff: [0, 12] },
  ],
};

const STATION_ELEV = {
  // 太师桥水文站
  "63304700": {
    name: "太师桥",
    bankElev: 4.29, // 青坎（左/右岸）
    dikeElev: 4.65, // 堤顶（左/右岸）
    bottomElev: -4.64, // 河底高程
    defaultLevel: 2.5,
    simMin: -4.6,
    simMax: 5.2,
    facilities: [
      { id: "tsq-rain", name: "翻斗式雨量计", elev: 4.85, x: 40, kind: "rain", dangerText: "底部受淹" },
      { id: "tsq-gauge", name: "水尺牌", elev: 5.0, x: 188, kind: "gauge", dangerText: "超观测上限" },
      { id: "tsq-float", name: "浮子水位计", elev: 5.0, x: 210, kind: "float", dangerText: "超观测上限" },
      { id: "tsq-auto", name: "自动发报", elev: 5.0, x: 252, kind: "auto", dangerText: "电源受淹" },
      { id: "tsq-adcp", name: "水平ADCP", elev: 5.0, x: 232, kind: "adcp", dangerText: "供电受淹" },
    ],
  },
  // 思源水文站
  "63304650": {
    name: "思源",
    bankElev: 4.3,
    dikeElev: 4.58,
    bottomElev: -1.5, // 左槽底
    bottomElev2: -0.89, // 右槽底
    defaultLevel: 2.5,
    simMin: -1.5,
    simMax: 5.3,
    facilities: [
      { id: "sy-rain", name: "翻斗式雨量计", elev: 5.08, x: 40, kind: "rain", dangerText: "底部受淹" },
      { id: "sy-gauge", name: "水尺牌", elev: 5.0, x: 188, kind: "gauge", dangerText: "超观测上限" },
      { id: "sy-float", name: "浮子水位计", elev: 4.88, x: 210, kind: "float", dangerText: "超观测上限" },
      { id: "sy-auto", name: "自动发报", elev: 4.88, x: 252, kind: "auto", dangerText: "电源受淹" },
      { id: "sy-adcp", name: "水平ADCP", elev: 4.88, x: 232, kind: "adcp", dangerText: "供电受淹" },
    ],
  },
  // 街口水文站
  "70111400": {
    name: "街口",
    bankElev: 108.57,
    dikeElev: 110.0,
    bottomElev: 73.5, // 槽底高程
    adcpElev: 100.0, // 水平ADCP 固定安装在 100.0 m 高程（不随水位变化）
    defaultLevel: 106.0,
    simMin: 73.5,
    simMax: 113.3,
    facilities: [
      { id: "jk-rain", name: "自记雨量计", elev: 111.8, x: 40, kind: "rain", dangerText: "底部受淹" },
      { id: "jk-floor1", name: "一楼站房", elev: 110.33, x: 148, kind: "floor", dangerText: "地面受淹" },
      { id: "jk-floor2", name: "二楼站房", elev: 112.9, x: 164, kind: "floor", dangerText: "地面受淹" },
      { id: "jk-gauge", name: "人工水尺", elev: 110.39, x: 188, kind: "gauge", dangerText: "超观测上限" },
      { id: "jk-adcp", name: "水平ADCP", elev: 110.0, x: 232, kind: "adcp", dangerText: "超测洪能力" },
    ],
  },
  // 太浦闸：闸上游 63205310 / 闸下游 63205311 共用同一份断面与设施配置
  "63205310": TPZ_STATION,
  "63205311": TPZ_STATION,
};

const props = defineProps({
  stcd: { type: String, default: "" },
  stnm: { type: String, default: "" },
});

const pStcd = inject("stcd", ref(""));
const pStnm = inject("stnm", ref(""));
const stcd = ref("");
const stnm = ref("");
const stationName = ref('');
watchEffect(() => {
  stcd.value = props.stcd !== "" ? props.stcd : (pStcd && pStcd.value) || "";
  stnm.value = props.stnm !== "" ? props.stnm : (pStnm && pStnm.value) || "";
  stationName.value = stnm.value ? stnm.value + "水文站" : props.station;
});

// 思源（63304650）双槽；太师桥（63304700）单槽 V 形；街口（70111400）梯形槽；
// 太浦闸（63205310/63205311）按实测高程绘制的岸墙 + 不对称两岸断面
const bed = computed(() => {
  if (stcd.value === "63205310" || stcd.value === "63205311") return BED_PROFILES.taipuzha;
  if (stcd.value === "70111400") return BED_PROFILES.flat;
  if (stcd.value === "63304700") return BED_PROFILES.single;
  return BED_PROFILES.dual;
});

// 设施/建筑几何（与断面绑定）
const sc = computed(() => SCENES[bed.value.scene] || SCENES.default);

// 站点高程配置（默认太师桥）
const station = computed(() => STATION_ELEV[stcd.value] || STATION_ELEV["63304700"]);

// ==================== 高程 → SVG y 坐标 ====================
// 分段线性映射：青坎以上按“青坎→最高设施”铺满岸顶空间；青坎以下按“青坎→河底”反映真实水深。
// 但两段比例不同会让标尺刻度（2-4、4-6、6-8…）间距忽大忽小：
// 当刻度同时包含 4 和 6 时（跨青坎，正好是两段比例的折中），统一改用 4~6 这一段的
// 像素间距作为全轴比例，保证所有高程网格线等距。
const mapper = computed(() => {
  const cfg = station.value;
  const topElev = Math.max(...cfg.facilities.map((f) => f.elev));
  const bankY = 205;
  const topY = 55;
  const upScale = (bankY - topY) / (topElev - cfg.bankElev); // 青坎以上 px/m
  const bottomY = bed.value.deepY;
  const downScale = (bottomY - bankY) / (cfg.bankElev - cfg.bottomElev); // 青坎以下 px/m

  const REF_LO = 4;
  const REF_HI = 6;
  const refOnAxis =
    cfg.simMin <= REF_LO && cfg.simMax >= REF_HI && REF_LO < cfg.bankElev && cfg.bankElev < REF_HI;
  if (refOnAxis) {
    // 4~6 这段跨青坎：4→青坎用 downScale，青坎→6 用 upScale，取其平均 px/m
    const refScale =
      ((cfg.bankElev - REF_LO) * downScale + (REF_HI - cfg.bankElev) * upScale) / (REF_HI - REF_LO);
    return (elev) => bankY - (elev - cfg.bankElev) * refScale;
  }

  return (elev) => {
    if (elev >= cfg.bankElev) return bankY - (elev - cfg.bankElev) * upScale;
    return bankY + (cfg.bankElev - elev) * downScale;
  };
});

const yOf = (facility) => mapper.value(facility.elev);
const yOfAbs = (elev) => mapper.value(elev);

const bankY = computed(() => mapper.value(station.value.bankElev));
const dikeY = computed(() => mapper.value(station.value.dikeElev));
// 警戒 / 保证水位在断面图上的位置（没有配置的站返回 null，不画线）
const warnLineY = computed(() =>
  station.value.warnLevel != null ? mapper.value(station.value.warnLevel) : null
);
const guarLineY = computed(() =>
  station.value.guaranteeLevel != null ? mapper.value(station.value.guaranteeLevel) : null
);
// 历史最高水位（太浦闸 4.61 m），实线标注，没有配置的站不画
const histMaxY = computed(() =>
  station.value.histMaxLevel != null ? mapper.value(station.value.histMaxLevel) : null
);
const bankElev = computed(() => station.value.bankElev);
const dikeElev = computed(() => station.value.dikeElev);

// 两岸高程可能不同（太浦闸左堤顶 7.90 / 右堤顶 6.51），漫溢取较低的一侧
const bankElevL = computed(() => station.value.bankElevLeft ?? station.value.bankElev);
const bankElevR = computed(() => station.value.bankElevRight ?? station.value.bankElev);
const dikeElevL = computed(() => station.value.dikeElevLeft ?? station.value.dikeElev);
const dikeElevR = computed(() => station.value.dikeElevRight ?? station.value.dikeElev);
const bankMin = computed(() => Math.min(bankElevL.value, bankElevR.value));
const dikeMin = computed(() => Math.min(dikeElevL.value, dikeElevR.value));

// ==================== 水位仿真状态 ====================
const level = ref(STATION_ELEV["63304700"].defaultLevel);
const playing = ref(false);
let timer = null;
// 图上被点中的编号（null = 未选中）。放这里是因为下面的 watchEffect 会立即执行一次。
const activeNo = ref(null);

// 实时“当前水位”：复用 HengDuanSWZ.loadWaterLevel 的接口 rtsqbin/RTSQ_HDWATERSel
const currentLevel = ref(null); // 接口返回的当前水位
const levelLoading = ref(false);

function pickUpz(item) {
  const keys = ["UPZ", "upz", "Z", "z", "SW", "sw"];
  for (const k of keys) {
    if (item[k] != null && item[k] !== "") {
      const v = Number(item[k]);
      if (isFinite(v)) return v;
    }
  }
  return null;
}

async function loadWaterLevel(code) {
  if (!code) return null;
  // 假数据：直接用站网台账的实时水位（正式版替换为 rtsqbin/RTSQ_HDWATERSel 接口）
  const s = stationByCode(code);
  return s ? waterLevelOf(s) : null;
}

async function refreshWaterLevel() {
  const code = stcd.value;
  if (!code) return;
  levelLoading.value = true;
  const upz = await loadWaterLevel(code);
  levelLoading.value = false;
  if (code !== stcd.value) return; // 站点已切换，丢弃过期结果
  currentLevel.value = upz;
  if (upz != null && !playing.value) {
    level.value = upz;
  }
}

let prevStcd = "";
watchEffect(() => {
  if (stcd.value !== prevStcd) {
    prevStcd = stcd.value;
    stopLoop();
    playing.value = false;
    currentLevel.value = null;
    level.value = station.value.defaultLevel;
    activeNo.value = null; // 换站后编号会变，清掉选中的提示
    refreshWaterLevel();
  }
});

const stepSize = computed(() =>
  station.value.simMax - station.value.simMin > 5 ? 0.01 : 0.01
);

function togglePlay() {
  playing.value = !playing.value;
  if (playing.value) startLoop();
  else stopLoop();
}

function startLoop() {
  stopLoop();
  const range = station.value.simMax - station.value.simMin;
  const step = range / 240; // 约 12s 走完全程
  let dir = 1;
  timer = setInterval(() => {
    let next = level.value + dir * step;
    if (next >= station.value.simMax) {
      next = station.value.simMax;
      dir = -1;
    } else if (next <= station.value.simMin) {
      next = station.value.simMin;
      dir = 1;
    }
    level.value = next;
  }, 50);
}

function stopLoop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function reset() {
  stopLoop();
  playing.value = false;
  level.value = currentLevel.value != null ? currentLevel.value : station.value.defaultLevel;
}

onBeforeUnmount(stopLoop);

// ==================== 水面几何计算 ====================
const waterY = computed(() => mapper.value(level.value));

// 水位分级配色：正常蓝 → 超警橙 → 超保红
// 有警戒/保证水位的站（太浦闸 3.88 / 4.66）优先按这两级上色；
// 没有的（太师桥、思源、街口）仍回落到漫青坎橙、漫堤顶红。
const waterTone = computed(() => {
  const cfg = station.value;
  const warnLv = cfg.warnLevel != null ? cfg.warnLevel : bankMin.value;
  const guarLv = cfg.guaranteeLevel != null ? cfg.guaranteeLevel : dikeMin.value;
  if (level.value > guarLv + 1e-9) return "is-dike";
  if (level.value > warnLv + 1e-9) return "is-bank";
  return "";
});

// 当前水位的警戒状态（用于读数旁的标签），口径与 waterTone 保持一致
const levelState = computed(() => {
  const cfg = station.value;
  const warnLv = cfg.warnLevel != null ? cfg.warnLevel : bankMin.value;
  const guarLv = cfg.guaranteeLevel != null ? cfg.guaranteeLevel : dikeMin.value;
  if (level.value > guarLv + 1e-9) return "flood";
  if (level.value > warnLv + 1e-9) return "warn";
  return "safe";
});
const levelStateText = computed(
  () => ({ flood: "超保", warn: "超警", safe: "正常" })[levelState.value]
);

// 河床折线在某个 x 处的 y 坐标（线性插值）
function bedYAt(x) {
  const pts = bed.value.pts;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (a[0] === b[0]) continue;
    if ((x - a[0]) * (x - b[0]) <= 0) {
      const t = (x - a[0]) / (b[0] - a[0]);
      return a[1] + t * (b[1] - a[1]);
    }
  }
  return null;
}

// 栈桥/井房支撑桩（从台面伸向河床）
const pierPiles = computed(() =>
  sc.value.piles.map((x) => ({ x, y2: bedYAt(x) ?? 300 }))
);

// 水尺刻度（沿水尺长度均匀排布，每 5 格一条长线）
const gaugeTickPath = computed(() => {
  const g = sc.value.gauge;
  const segs = [];
  let i = 0;
  for (let y = g.top + 8; y <= g.bottom; y += 8, i++) {
    const long = i % 5 === 0;
    segs.push(`M ${g.x} ${y} L ${g.x - (long ? 4 : 2)} ${y}`);
  }
  return segs.join(" ");
});

// H-ADCP 是固定安装的流量计，换能器固定在各自的安装高程上（太浦闸 2.00 m、街口 100.0 m），
// 不随水位升降移动；没给安装高程的站沿用"贴着栈桥底部"的固定位置。
const adcp = computed(() => {
  const s = sc.value;
  const elev = station.value.adcpElev;
  const y = elev != null ? yOfAbs(elev) : s.deck.y + s.deck.h + 8;
  return { x: s.adcpX, y };
});

// 水波纹动画相位（requestAnimationFrame 持续推进，形成水面波动）
const wavePhase = ref(0);
let waveRaf = null;
function waveTick(t) {
  wavePhase.value = (t / 1000) * 1; // 约 4.8s 一个完整起伏周期
  waveRaf = requestAnimationFrame(waveTick);
}
onMounted(() => {
  waveRaf = requestAnimationFrame(waveTick);
});
onBeforeUnmount(() => {
  if (waveRaf) cancelAnimationFrame(waveRaf);
});

// 波纹参数：波幅随水位升高而增大（水越深，水面起伏越明显）
const WAVE_AMP_MIN = 2.5; // 低水位（河底附近）波幅 px
const WAVE_AMP_MAX = 5.5; // 高水位（青坎/堤顶附近及以上）波幅 px
const WAVE_L1 = 86; // 主波波长 px
const WAVE_L2 = 85; // 次波波长 px

// 当前波幅：按水位在“河底 → 堤顶”区间的比例线性增大，超过堤顶后保持最大值
const waveAmp = computed(() => {
  const cfg = station.value;
  const span = Math.max(1e-6, cfg.dikeElev - cfg.bottomElev);
  const t = Math.min(1, Math.max(0, (level.value - cfg.bottomElev) / span));
  return WAVE_AMP_MIN + (WAVE_AMP_MAX - WAVE_AMP_MIN) * t;
});

// 生成某水面段 [x0, x1] 的波浪顶线点列（两端收敛到水面线，避免与河岸/河底脱节）
function waveSurfacePoints(x0, x1, wy, phase, amp) {
  const w = x1 - x0;
  if (w <= 0) return [[x0, wy]];
  const a = Math.min(amp, Math.max(1.5, w * 0.045));
  const n = Math.max(4, Math.round(w / 5));
  const pts = [];
  for (let j = 0; j <= n; j++) {
    const x = x0 + (w * j) / n;
    const taper = Math.sin((Math.PI * j) / n); // 0..1..0，两端贴合水面线
    const dy =
      a *
      taper *
      (Math.sin((2 * Math.PI * x) / WAVE_L1 + phase) +
        0.35 * Math.sin((2 * Math.PI * x) / WAVE_L2 + phase * 1.7));
    pts.push([x, wy + dy]);
  }
  return pts;
}

// 完整地形折线：左岸台地 → 河槽 → 右岸青坎/堤顶（与 bed.line 的坐标一致）
const terrainPts = computed(() => [
  ...(bed.value.left || []),
  ...bed.value.pts,
  ...(bed.value.right || []),
]);

// 地形折线在 x 处的 y（区间外取端点，供水体多边形收边）
function terrainYAt(pts, x) {
  const last = pts[pts.length - 1];
  if (x <= pts[0][0]) return pts[0][1];
  if (x >= last[0]) return last[1];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (x >= a[0] && x <= b[0]) {
      if (b[0] === a[0]) return Math.min(a[1], b[1]);
      return a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
    }
  }
  return last[1];
}

// 地形折线与水位线求交，按“地形低于水面”的区间切分水体：
// 河槽内正常过水；水位高过青坎/堤顶时，区间自然延伸到两岸台地（漫滩）。
function waterIntervals(pts, wy) {
  const below = (p) => p[1] > wy; // y 越大越低，低于水面即被淹
  const raw = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const ab = below(a);
    const bb = below(b);
    if (!ab && !bb) continue;
    if (ab && bb) {
      raw.push([Math.min(a[0], b[0]), Math.max(a[0], b[0])]);
    } else if (ab) {
      const t = (wy - a[1]) / (b[1] - a[1]);
      raw.push([a[0], a[0] + t * (b[0] - a[0])]);
    } else {
      const t = (wy - a[1]) / (b[1] - a[1]);
      raw.push([a[0] + t * (b[0] - a[0]), b[0]]);
    }
  }
  raw.sort((p, q) => p[0] - q[0]);
  const merged = [];
  for (const [lo0, hi0] of raw) {
    const lo = Math.min(lo0, hi0);
    const hi = Math.max(lo0, hi0);
    const last = merged[merged.length - 1];
    if (last && lo <= last[1] + 1e-6) last[1] = Math.max(last[1], hi);
    else merged.push([lo, hi]);
  }
  return merged;
}

const waterGeom = computed(() => {
  const pts = terrainPts.value;
  const wy = waterY.value;
  const phase = wavePhase.value;
  const intervals = waterIntervals(pts, wy);

  const segs = [];
  const channelPolys = []; // 水体多边形（渐变填充）
  const surfaces = []; // 自由水面波浪线

  for (const [x0, x1] of intervals) {
    if (x1 - x0 < 0.5) continue;
    segs.push([x0, x1]);
    const surf = waveSurfacePoints(x0, x1, wy, phase, waveAmp.value);
    surfaces.push(surf);
    // 水面 → 右岸收边 → 沿地形折线回到左岸
    const poly = [...surf, [x1, terrainYAt(pts, x1)]];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      if (p[0] > x0 && p[0] < x1) poly.push(p);
    }
    poly.push([x0, terrainYAt(pts, x0)]);
    channelPolys.push(poly);
  }
  return { segs, channelPolys, surfaces };
});

function pathFromPoly(poly) {
  return poly.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ") + " Z";
}
function pathFromLine(points) {
  return points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");
}

const waterPath = computed(() => waterGeom.value.channelPolys.map(pathFromPoly).join(" "));

// 自由水面波浪描线
const surfacePaths = computed(() => waterGeom.value.surfaces.map(pathFromLine).join(" "));

const surfX1 = computed(() => {
  const segs = waterGeom.value.segs;
  return segs.length ? segs[0][0] : 178;
});

// 距下一临界高程（高于当前水位的最低设施/堤防高程）
const nextCritical = computed(() => {
  const cfg = station.value;
  const list = [
    ...cfg.facilities.map((f) => f.elev),
    bankElevL.value,
    bankElevR.value,
    dikeElevL.value,
    dikeElevR.value,
    cfg.warnLevel,
    cfg.guaranteeLevel,
  ].filter((e) => e != null && e > level.value + 1e-9);
  return list.length ? Math.min(...list) : null;
});
const toNext = computed(() =>
  nextCritical.value == null ? null : nextCritical.value - level.value
);

// 水位提示框位置（随水面浮动，限制在画面内）
const calloutX = computed(() => Math.max(300, Math.min(460, surfX1.value + 140)));
const calloutY = computed(() => Math.max(6, Math.min(372, waterY.value - 44)));

// ==================== 受淹状态 ====================
const WARN_MARGIN = 0.05;

function statusOf(facility) {
  if (level.value > facility.elev) return "flood";
  if (level.value >= facility.elev - WARN_MARGIN) return "warn";
  return "safe";
}
const statusClass = (f) => "is-" + statusOf(f);

// 两岸高程相同时合并成“青坎 / 堤顶”，不同时分别列出（太浦闸左右堤顶不同）
const bankItems = computed(() => {
  const sameBank = bankElevL.value === bankElevR.value;
  const sameDike = dikeElevL.value === dikeElevR.value;
  const items = [];
  if (sameBank) {
    items.push({ id: "bank", name: "青坎", elev: bankElevL.value, dangerText: "受淹" });
  } else {
    items.push({ id: "bank-l", name: "左岸青坎", elev: bankElevL.value, dangerText: "受淹" });
    items.push({ id: "bank-r", name: "右岸青坎", elev: bankElevR.value, dangerText: "受淹" });
  }
  if (sameDike) {
    items.push({ id: "dike", name: "堤顶", elev: dikeElevL.value, dangerText: "漫顶" });
  } else {
    items.push({ id: "dike-l", name: "左岸堤顶", elev: dikeElevL.value, dangerText: "漫顶" });
    items.push({ id: "dike-r", name: "右岸堤顶", elev: dikeElevR.value, dangerText: "漫顶" });
  }
  return items;
});

const sortedFacilities = computed(() =>
  [...station.value.facilities, ...bankItems.value].sort((a, b) => a.elev - b.elev)
);

// ---- 设施编号：清单行号与断面图上的圆形编号一一对应 ----
// 青坎/堤顶不是具体设备，没有 x 坐标，按断面图上该侧实际画出的岸坎/堤顶点取锚点。
function terrainAnchor(kind, side) {
  const pts = side === "r" ? bed.value.right : bed.value.left;
  if (!pts || !pts.length) return { x: side === "r" ? 504 : 180, y: 205 };
  if (kind === "bank") {
    // 青坎 = 岸坡与河道的交点
    return side === "r"
      ? { x: pts[0][0], y: pts[0][1] }
      : { x: pts[pts.length - 1][0], y: pts[pts.length - 1][1] };
  }
  // 堤顶 = 该侧最高点，同高时取最靠河道的一个
  let best = pts[0];
  for (const p of pts) {
    if (p[1] < best[1] - 0.5) best = p;
    else if (Math.abs(p[1] - best[1]) <= 0.5 && (side === "r" ? p[0] < best[0] : p[0] > best[0])) best = p;
  }
  return { x: best[0], y: best[1] };
}

// 合岸的青坎标注放在右岸（左岸通常被站房、栈桥占满）；堤顶默认放左岸
const BANK_SIDE = { bank: "r", "bank-l": "l", "bank-r": "r", dike: "l", "dike-l": "l", "dike-r": "r" };
const BANK_OFFSET = {
  bank: [11, -8],
  "bank-l": [-12, -10],
  "bank-r": [11, -8],
  dike: [-12, -10],
  "dike-l": [-12, -10],
  "dike-r": [-8, -12],
};

// 图元锚点：按场景里实际画出来的设施位置取点，保证编号贴在设施本体上。
// 不能直接用高程换算 y —— 各站立面是示意画法，和高程轴并不严格一一对应
// （例如太师桥设施都在 5.00 m，按高程换算会飞到画面顶部）。
function sceneAnchor(f) {
  const s = sc.value;
  switch (f.kind) {
    case "adcp":
      return adcp.value; // 固定的安装位置（太浦闸 2.00 m、街口 100.0 m）
    case "gauge":
      return s.gauge ? { x: s.gauge.x + s.gauge.w / 2, y: s.gauge.top } : null;
    case "float":
      return s.well ? { x: (s.well.x1 + s.well.x2) / 2, y: s.well.top } : null;
    case "deck":
      return s.deck ? { x: s.deck.x + s.deck.w / 2, y: s.deck.y + 3 } : null;
    case "auto":
      // 自动发报装在井房内，靠右下角，跟井口的浮子水位计错开
      return s.room ? { x: s.room.x + s.room.w - 9, y: s.room.y + s.room.h - 9 } : null;
    case "rain":
      // 编号放在雨量计筒底以下，避开上方的“蒸发池”等文字
      return s.rain ? { x: s.rain.body.x + s.rain.body.w / 2, y: s.rain.body.y + s.rain.body.h + 3 } : null;
    case "evap":
      return s.evap ? { x: s.evap.rim.x + s.evap.rim.w / 2, y: s.evap.rim.y + s.evap.rim.h / 2 } : null;
    case "field":
      return s.field
        ? { x: s.field.rect.x + s.field.rect.w / 2, y: s.field.rect.y + s.field.rect.h / 2 }
        : null;
    case "floor": {
      const lv = (s.house.levels || []).find((l) => f.name.includes(l.t));
      return lv
        ? { x: lv.x, y: lv.y - 1 }
        : { x: s.house.body.x + s.house.body.w / 2, y: s.house.body.y + s.house.body.h - 8 };
    }
    default:
      return null;
  }
}

const numberedFacilities = computed(() =>
  sortedFacilities.value.map((f, i) => {
    if (f.x != null) {
      const pos = sceneAnchor(f) || { x: f.x, y: yOf(f) };
      // 站房楼层：编号默认左移到楼层文字之前，避免压住“一楼/二楼”
      const [dx, dy] = f.nOff || (f.kind === "floor" ? [-11, 0] : [0, 0]);
      return { ...f, no: i + 1, x: pos.x, y: pos.y, bx: pos.x + dx, by: pos.y + dy };
    }
    const kind = f.id.startsWith("dike") ? "dike" : "bank";
    const anchor = terrainAnchor(kind, BANK_SIDE[f.id] || "l");
    const [dx, dy] = BANK_OFFSET[f.id] || [0, 0];
    return { ...f, no: i + 1, x: anchor.x, y: anchor.y, bx: anchor.x + dx, by: anchor.y + dy };
  })
);

// 编号文字颜色：受淹用白字，其余用深色字压在亮色底上
function noTextColor(f) {
  return statusOf(f) === "flood" ? "#ffffff" : "#062430";
}

// ---- 点击编号查看名称与高程 ----
const activeFacility = computed(
  () => numberedFacilities.value.find((f) => f.no === activeNo.value) || null
);
// 再点一次关闭；点图内空白处（svg 的 @click）也会关闭
function toggleInfo(f) {
  activeNo.value = activeNo.value === f.no ? null : f.no;
}
function closeInfo() {
  activeNo.value = null;
}

// 名称显示成「左岸：堤顶 7.90 m」的形式，设备则直接「H-ADCP 5.10 m」
function tipTitleOf(f) {
  const m = /^(左岸|右岸)(.+)$/.exec(f.name || "");
  const label = m ? `${m[1]}：${m[2]}` : f.name || "";
  return `${label} ${fmt(f.elev)} m`;
}
function tipSubOf(f) {
  const s = statusOf(f);
  if (s === "flood") return `已受淹：${f.dangerText || "水位超过该高程"}`;
  if (s === "warn") return `临界：高于该高程仅差 ${fmt(f.elev - level.value)} m`;
  return `正常：低于该高程 ${fmt(f.elev - level.value)} m`;
}
// 中文按 10.6px / 半角按 5.9px 估宽，够放下两行文字即可
function tipTextWidth(s) {
  let w = 0;
  for (const ch of String(s)) w += /[一-龥：，（）]/.test(ch) ? 10.6 : 5.9;
  return w;
}
const activeTip = computed(() => {
  const f = activeFacility.value;
  if (!f) return null;
  const title = tipTitleOf(f);
  const sub = tipSubOf(f);
  const w = Math.max(96, Math.max(tipTextWidth(title), tipTextWidth(sub)) + 16);
  const h = 40;
  let x = f.bx - w / 2;
  let y = f.by - h - 12; // 默认贴在编号上方
  if (y < 4) y = f.by + 12; // 顶部放不下就翻到下方
  x = Math.max(1, Math.min(648 - w, x));
  return { x, y, w, h, title, sub };
});

// 当前水位所属的超标洪水测验方案水位级（表 2，按 5.06 / 6.51 m 分三级）
const planTier = computed(() => {
  const plan = station.value.plan;
  if (!plan) return null;
  for (const t of plan.tiers) {
    if (t.max == null || level.value <= t.max + 1e-9) return t;
  }
  return plan.tiers[plan.tiers.length - 1];
});

function dotColor(f) {
  const s = statusOf(f);
  return s === "flood" ? "#ff4d4f" : "#ffffff";
}

function statusText(f) {
  const s = statusOf(f);
  if (s === "flood") return f.dangerText || "受淹";
  // if (s === "warn") return "临界";
  return "正常";
}

// ==================== 河底/槽底标注 ====================
const troughItems = computed(() => {
  const cfg = station.value;
  const marks = bed.value.troughs || [];
  return marks.map((m, i) => ({
    ...m,
    elev: i === 1 && cfg.bottomElev2 != null ? cfg.bottomElev2 : cfg.bottomElev,
    name: marks.length > 1 ? (i === 0 ? "左河底" : "右河底") : "河底",
  }));
});

// ==================== 高程标尺 ====================
function niceTicks(min, max, target = 6) {
  const span = max - min;
  if (span <= 0) return [min];
  const step0 = span / Math.max(1, target - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  let step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  step *= mag;
  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 1e-6; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

const axisTicks = computed(() => niceTicks(station.value.simMin, station.value.simMax));

function fmt(v) {
  const n = Number(v);
  if (!isFinite(n)) return "—";
  return n.toFixed(2);
}
function fmtTick(v) {
  const n = Number(v);
  if (!isFinite(n)) return "—";
  return String(parseFloat(n.toFixed(2)));
}
</script>

<style scoped>
.syt-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: var(--widgetcolor, #fff);
}

.syt-body {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  gap: 14px;
  padding: 4px 2px 2px;
}

.syt-svg {
  flex: 1 1 auto;
  width: auto;
  height: 100%;
  max-height: 100%;
  color: var(--widgetcolor, #fff);
  overflow: visible;
  min-width: 0;
}

.syt-panel {
  flex: 0 0 318px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 12px 10px;
  background: #fbfdff;
  border: 1px solid #e6edf5;
  border-radius: 6px;
}

.syt-panel-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding-bottom: 9px;
  border-bottom: 1px solid #eef2f6;
}
/* 刷新按钮固定贴在本栏最右侧（flex 容器里 float 无效） */
.syt-panel-head .syt-btn {
  margin-left: auto;
}
.syt-panel-title {
  font-size: 15px;
  font-weight: bold;
  color: var(--titled1);
}
.syt-panel-station {
  font-size: 12px;
  color: var(--mtablecolor);
}

.syt-readout {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
}
.syt-readout-num {
  font-family: "number", monospace;
  font-size: 34px;
  font-weight: 600;
  color: #ffffff;
  line-height: 1;
}
.syt-readout-unit {
  font-size: 14px;
  color: var(--mtablecolor);
}
/* 当前水位的警戒状态：正常 / 超警（橙）/ 超保（红） */
.syt-level-state {
  align-self: center;
  margin-left: 4px;
  padding: 1px 7px;
  border-radius: 3px;
  font-size: 11px;
  line-height: 16px;
  border: 1px solid currentColor;
}
.syt-level-state.is-safe {
  color: #26a869;
}
.syt-level-state.is-warn {
  color: #ffa940;
  background: rgba(255, 169, 64, 0.15);
}
.syt-level-state.is-flood {
  color: #ff7875;
  background: rgba(255, 77, 79, 0.18);
}

.syt-current {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 5px;
  font-size: 12px;
  padding: 2px 0 4px;
}
.syt-current-label {
  font-size: 12px;
  color: #8a9aab;
}
.syt-current-num {
  font-family: "number", "DIN Alternate", monospace;
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
  color: #017de4;
  letter-spacing: .5px;
}
.syt-current .syt-readout-unit { font-size: 13px; color: #5b6b7b; }
/* 数值颜色跟随右侧状态标签：正常 / 超警（橙）/ 超保（红） */
.syt-current-num.is-safe {
  color: #26a869;
}
.syt-current-num.is-warn {
  color: #ffa940;
}
.syt-current-num.is-flood {
  color: #ff7875;
}
.syt-current-num.is-loading {
  opacity: 0.6;
}
.syt-current-num.is-none {
  color: var(--mtablecolor);
  font-weight: 400;
}
.syt-btn-sm {
  padding: 2px 8px;
  font-size: 11px;
}
.syt-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.syt-slider-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.syt-btn {
  flex: none;
  padding: 4px 8px;
  font-size: 12.5px;
  color: #017de4;
  background: #fff;
  border: 1px solid #cfe0f0;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}
.syt-btn:hover {
  background: #eef6fe;
  border-color: #017de4;
}
.syt-slider {
  flex: 1;
  min-width: 0;
  accent-color: var(--titled1);
}

.syt-legend {
  display: flex;
  gap: 10px;
  font-size: 11px;
}
.syt-legend-item::before {
  content: "";
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
}
.syt-legend-item.is-safe::before {
  background: #017de4;
}
.syt-legend-item.is-warn::before {
  background: #ffa940;
}
.syt-legend-item.is-flood::before {
  background: #ff4d4f;
}

/* 面板正文（设施状态 + 基础信息 + 测验方案）统一滚动，
   避免方案文字较长时把设备列表挤出面板 */
.syt-panel-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.syt-panel-body::-webkit-scrollbar {
  width: 3px;
}
.syt-panel-body::-webkit-scrollbar-thumb {
  background: #d6e2ee;
  border-radius: 2px;
}

.syt-status {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow: visible;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.syt-status-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  padding: 6px 9px;
  border-radius: 4px;
  background: #f5f9fd;
  border: 1px solid #edf3f9;
  cursor: pointer;
}
/* 与图上点中的编号联动高亮 */
.syt-status-item.is-active {
  background: rgba(1, 125, 228, 0.12);
  box-shadow: inset 0 0 0 1px rgba(1, 125, 228, 0.6);
}
.syt-status-no {
  flex: none;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "number", monospace;
  font-size: 11px;
  line-height: 1;
  border: 1px solid currentColor;
  color: #5b6b7b;
  background: #eef2f7;
}
.syt-status-item.is-safe .syt-status-no {
  color: #26a869;
  background: rgba(82, 196, 26, 0.15);
}
.syt-status-item.is-warn .syt-status-no {
  color: #ffa940;
  background: rgba(255, 169, 64, 0.15);
}
.syt-status-item.is-flood .syt-status-no {
  color: #ff7875;
  background: rgba(255, 77, 79, 0.2);
}
.syt-status-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #35506a;
  font-size: 12.5px;
}
.syt-status-elev {
  flex: none;
  font-family: "number", monospace;
  color: #17324a;
  font-size: 12.5px;
  font-weight: 600;
}
.syt-status-chip {
  flex: none;
  padding: 1px 7px;
  border-radius: 3px;
  font-size: 11px;
}
.syt-status-item.is-safe .syt-status-chip {
  color: #26a869;
  background: rgba(82, 196, 26, 0.15);
}
.syt-status-item.is-warn .syt-status-chip {
  color: #ffa940;
  background: rgba(255, 169, 64, 0.15);
}
.syt-status-item.is-flood .syt-status-chip {
  color: #ff7875;
  background: rgba(255, 77, 79, 0.18);
}

/* 测站基础信息（太浦闸断面高程等） */
.syt-notes {
  list-style: none;
  margin: 0;
  padding: 6px 0 0;
  border-top: 1px solid rgba(59, 225, 246, 0.15);
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--mtablecolor);
}
.syt-notes li::before {
  content: "·";
  margin-right: 5px;
  color: var(--titled1);
}

/* 超标洪水测验方案：随水位级切换 */
.syt-plan {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid rgba(59, 225, 246, 0.15);
  padding-top: 8px;
}
.syt-plan-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.syt-plan-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--title2);
  white-space: nowrap;
}
.syt-plan-level {
  flex: none;
  padding: 1px 8px;
  border-radius: 9px;
  font-size: 11px;
  color: var(--titled1);
  border: 1px solid rgb(from var(--titled1) r g b / 0.45);
  white-space: nowrap;
}
.syt-plan-block {
  padding: 6px 8px;
  border-radius: 4px;
  background: rgb(from var(--titled2) r g b / 0.08);
  font-size: 11.5px;
  line-height: 1.55;
  color: var(--mtablecolor);
}
.syt-plan-block p {
  margin: 0;
}
.syt-plan-block p + p {
  margin-top: 4px;
}
.syt-plan-tag {
  display: inline-block;
  margin-bottom: 4px;
  padding: 0 6px;
  border-radius: 3px;
  font-size: 11px;
}
.syt-plan-tag.is-water {
  color: #4fc3f7;
  background: rgba(79, 195, 247, 0.14);
}
.syt-plan-tag.is-flow {
  color: #6ee7b7;
  background: rgba(110, 231, 183, 0.14);
}

/* ---------- 高程网格 ---------- */
.syt-grid line {
  stroke: #3a5566;
  stroke-opacity: 0.42;
  stroke-width: 1;
  stroke-dasharray: 2 6;
}

/* ---------- 断面与水体 ---------- */
.syt-ground {
  fill: none;
  stroke: currentColor;
  stroke-opacity: 0.8;
  stroke-width: 1.8;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.syt-ground-fill {
  fill: url(#syt-ground-grad);
  stroke: none;
}
.syt-water {
  fill: url(#syt-water-grad);
  stroke: none;
}
.syt-wl {
  stroke: #4fa8dd;
  stroke-opacity: 0.95;
  stroke-width: 1.6;
  fill: none;
}
.syt-wl-glow {
  stroke: #3ba7dd;
  stroke-opacity: 0.25;
  stroke-width: 5;
  fill: none;
}
/* 水位分级配色：超青坎转橙，超堤顶转红 */
.syt-water.is-bank {
  fill: url(#syt-water-grad-bank);
}
.syt-water.is-dike {
  fill: url(#syt-water-grad-dike);
}
.syt-wl-glow.is-bank {
  stroke: #f6a129;
}
.syt-wl-glow.is-dike {
  stroke: #ff5a5a;
}
.syt-wl.is-bank {
  stroke: #ffb347;
}
.syt-wl.is-dike {
  stroke: #ff7875;
}
.syt-axis-wl.is-bank polygon {
  fill: #f6a129;
}
.syt-axis-wl.is-bank text {
  fill: #f6a129;
}
.syt-axis-wl.is-dike polygon {
  fill: #ff5a5a;
}
.syt-axis-wl.is-dike text {
  fill: #ff5a5a;
}

/* ---------- 高程参考线 ---------- */
.syt-lev-line {
  stroke-width: 1.2;
  stroke-dasharray: 7 4;
  stroke-opacity: 0.75;
}
.syt-lev-line.is-dike {
  stroke: #ff7875;
}
.syt-lev-line.is-bank {
  stroke: #ffc069;
}
.syt-lev-tag {
  font-size: 11px;
  font-weight: bold;
}
.syt-lev-tag.is-dike {
  fill: #ff7875;
}
.syt-lev-tag.is-bank {
  fill: #ffc069;
}

/* 警戒水位（橙）/ 保证水位（红） */
.syt-lev-line.is-warn {
  stroke: #ffa940;
}
.syt-lev-line.is-guar {
  stroke: #ff4d4f;
}
.syt-lev-tag.is-warn {
  fill: #ffa940;
}
.syt-lev-tag.is-guar {
  fill: #ff6b6b;
}
/* 历史最高水位：#F501F7 实线（虚线模板整体在 .syt-lev-line 上，这里显式取消） */
.syt-lev-line.is-hist {
  stroke: #f501f7;
  stroke-dasharray: none;
  stroke-width: 1.1;
  stroke-opacity: 1;
}
.syt-lev-tag.is-hist {
  fill: #f501f7;
}
/* 标签压在土体/水面上时加深色描边，保证可读 */
.syt-lev-threshold .syt-lev-tag {
  paint-order: stroke;
  stroke: rgba(255, 255, 255, 0.9);
  stroke-width: 3px;
  stroke-linejoin: round;
}

/* ---------- 设施编号（与右侧清单行号对应，点击弹出名称/高程） ---------- */
.syt-dev {
  cursor: pointer;
}
.syt-no-hit {
  fill: transparent; /* 透明热区：扩大点击范围 */
}
.syt-no-badge {
  stroke: rgba(4, 20, 30, 0.6);
  stroke-width: 1;
}
.syt-dev.is-active .syt-no-badge {
  stroke: #017de4;
  stroke-width: 2;
}
.syt-no-text {
  font-family: "number", monospace;
  font-size: 8.5px;
  font-weight: 700;
  pointer-events: none;
}

/* 点击后的名称提示框 */
.syt-tip {
  pointer-events: none;
}
.syt-tip rect {
  fill: #ffffff;
  stroke: #017de4;
  stroke-width: 1;
}
.syt-tip-t {
  fill: #17324a;
  font-size: 11px;
  font-weight: 700;
}
.syt-tip-s {
  fill: #5b6b7b;
  font-size: 10px;
}

/* ---------- 受淹高亮 ---------- */
.syt-flood-halo {
  fill: none;
  stroke: #ff4d4f;
  stroke-width: 2;
  animation: syt-pulse 1s ease-in-out infinite;
}
.syt-flood-text {
  fill: #ff4d4f;
  font-size: 11px;
  font-weight: bold;
  text-anchor: middle;
}
@keyframes syt-pulse {
  0%,
  100% {
    stroke-opacity: 0.3;
  }
  50% {
    stroke-opacity: 1;
  }
}

/* ---------- 高程标尺 ---------- */
.syt-axis line {
  stroke: #3a5566;
  stroke-width: 1;
}
.syt-axis text {
  fill: var(--mtablecolor);
  font-size: 10px;
}
.syt-axis .syt-axis-title {
  fill: var(--mtablecolor);
  font-size: 11px;
}

/* ---------- 河底/槽底高程标注 ---------- */
.syt-trough-leader {
  stroke: currentColor;
  stroke-opacity: 0.4;
  stroke-width: 1;
}
.syt-trough-dot {
  fill: var(--mtablecolor);
}
.syt-trough-tag {
  fill: currentColor;
  font-size: 11px;
}

/* ---------- 静态示意设施 ---------- */
.syt-solid {
  fill: currentColor;
  fill-opacity: 0.38;
  stroke: currentColor;
  stroke-opacity: 0.75;
  stroke-width: 1.2;
}
.syt-hollow {
  fill: none;
  stroke: currentColor;
  stroke-opacity: 0.78;
  stroke-width: 1.2;
}
.syt-hair {
  stroke: currentColor;
  stroke-opacity: 0.45;
  stroke-width: 0.8;
}
.syt-gauge {
  fill: #9aa82a;
  fill-opacity: 0.85;
  stroke: #6d7620;
  stroke-opacity: 0.6;
  stroke-width: 0.8;
}
.syt-adcp {
  fill: currentColor;
  fill-opacity: 0.38;
  stroke: currentColor;
  stroke-opacity: 0.7;
  stroke-width: 1.2;
}
.syt-adcp-lens {
  fill: #3be1f6;
  fill-opacity: 0.75;
  stroke: none;
}
.syt-roof {
  fill: currentColor;
  fill-opacity: 0.55;
  stroke: currentColor;
  stroke-opacity: 0.8;
  stroke-width: 1;
}
.syt-window {
  fill: #3be1f6;
  fill-opacity: 0.32;
  stroke: currentColor;
  stroke-opacity: 0.5;
  stroke-width: 0.6;
}
.syt-door {
  fill: currentColor;
  fill-opacity: 0.16;
  stroke: currentColor;
  stroke-opacity: 0.65;
  stroke-width: 1;
}
.syt-floor {
  fill: currentColor;
  fill-opacity: 0.72;
  font-size: 9px;
  user-select: none;
}
.syt-pool-rim {
  fill: none;
  stroke: currentColor;
  stroke-opacity: 0.7;
  stroke-width: 1;
}
.syt-pool-water {
  fill: #3ba7dd;
  fill-opacity: 0.6;
}
.syt-well-wall {
  fill: currentColor;
  fill-opacity: 0.22;
  stroke: currentColor;
  stroke-opacity: 0.8;
  stroke-width: 1;
}
.syt-gauge-tick {
  stroke: #e8f0a0;
  stroke-opacity: 0.85;
  stroke-width: 1;
}

/* ---------- 水位提示框 ---------- */
.syt-callout rect {
  fill: var(--dialogColor);
  stroke: var(--titled1);
  stroke-opacity: 0.7;
  stroke-width: 1;
}
.syt-callout polygon {
  fill: var(--dialogColor);
  stroke: var(--titled1);
  stroke-opacity: 0.7;
  stroke-width: 1;
}
.syt-callout-t {
  fill: var(--titled1);
  font-size: 13px;
  font-weight: bold;
}
.syt-callout-s {
  fill: var(--mtablecolor);
  font-size: 10.5px;
}

/* ---------- 标尺水位指示 ---------- */
.syt-axis-wl polygon {
  fill: #4FC8FF;
}
.syt-axis-wl text {
  fill: #017de4;
  font-size: 10px;
}

/* ---------- 标注 ---------- */
.syt-labels text {
  fill: currentColor;
  fill-opacity: 0.9;
  font-size: 12px;
  font-family: inherit;
  letter-spacing: 0.5px;
  user-select: none;
}
.syt-labels text.syt-label-sm {
  font-size: 10px;
  fill-opacity: 0.75;
  letter-spacing: 0;
}
</style>
