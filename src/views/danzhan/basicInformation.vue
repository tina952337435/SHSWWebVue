<template>
  <div class="biz">
    <!-- 区块内容 -->
    <div ref="formRef" class="biz-form">
      <div v-for="(sec, si) in SECTIONS" :key="si" class="biz-block">
        <div :id="'biz-sec-' + si" class="biz-title" @click="toggle(si)">
          <span class="no">{{ si + 1 }}</span>
          <span class="tt">{{ sec }}</span>
          <span class="ico">{{ collapsed[si] ? '+' : '−' }}</span>
        </div>
        <div v-show="!collapsed[si]" class="biz-grid">
          <template v-for="f in fieldsOf(si)" :key="f.k">
            <div class="k" :class="{ 'k-wide': f.wide }">{{ f.n }}</div>
            <div class="v" :class="{ 'v-wide': f.wide }">{{ fmt(f.k, d[f.k]) }}</div>
          </template>
        </div>
      </div>
    </div>

    <!-- 右侧导航 -->
    <div class="biz-tabs" :class="{ collapsed: isCollapsed }">
      <span class="toggle" @click="isCollapsed = !isCollapsed">{{ isCollapsed ? '‹' : '›' }}</span>
      <template v-if="!isCollapsed">
        <span
          v-for="(tab, index) in SECTIONS"
          :key="index"
          class="tab-item"
          :class="{ active: activeTab === index }"
          @click="scrollTo(index)"
        >{{ tab }}</span>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { stationByCode } from '@/data/stationNetwork'
import { baseInfo } from '@/data/stationProfile'

const props = defineProps({
  stcd: { type: String, default: '' },
  stnm: { type: String, default: '' }
})

const pStcd = inject('stcd', null)
const stcd = computed(() => props.stcd || (pStcd && pStcd.value) || '')

const SECTIONS = [
  '基础资料', '水位流量站特征', '高程信息', '建设标准', '管理单位',
  '国家基本流量站', '地下水站', '水质站（地表水）', '墒情站', '水文实验站', '专用站'
]

const FIELD_DEFS = [
  [
    { k: 'stcd', n: '测站编码' }, { k: 'stnm', n: '测站名称' },
    { k: 'bsnm', n: '流域' }, { k: 'rvnm', n: '水系' },
    { k: 'stcl', n: '测站类别' }, { k: 'st_estb', n: '设站年月' },
    { k: 'flood_level', n: '报汛报旱等级' }, { k: 'flood_stcd', n: '报汛站码' },
    { k: 'river_name', n: '河流' }, { k: 'type', n: '测量水体' },
    { k: 'lgtd', n: '经度(E)' }, { k: 'lttd', n: '纬度(N)' },
    { k: 'st_type', n: '站类管理' }, { k: 'add_id', n: '行政区划码' },
    { k: 'base_mode', n: '基本降水量站运行模式' }, { k: 'area', n: '集水面积(km²)' },
    { k: 'st_is_exp', n: '是否为水文实验站' }, { k: 'env_protect', n: '环境保护范围划定' },
    { k: 'is_sec', n: '是否是断面' }, { k: 'rfd_stcd', n: '断面所属站测站编码' },
    { k: 'test_item', n: '测验项目', wide: true },
    { k: 'address', n: '测站地址', wide: true },
    { k: 'st_item', n: '测站功能', wide: true }
  ],
  [
    { k: 'flow_type', n: '规划类别' }, { k: 'flow_cap', n: '测流能力' },
    { k: 'flow_item', n: '功能类别', wide: true }
  ],
  [
    { k: 'gc_datum_name', n: '基面名称' }, { k: 'gc_datum_off', n: '基面（m）' },
    { k: 'gc_bm_nm', n: '基本水准点' }, { k: 'gc_bm_elevation', n: '基本水准点高程（m）' }
  ],
  [
    { k: 'build_flood_std', n: '防洪标准（重现期年）' }, { k: 'build_flood_meas', n: '测洪标准（重现期年）' }
  ],
  [
    { k: 'manage_attr', n: '管理单位属性' }, { k: 'manage_sw_name', n: '省局名称' },
    { k: 'manage_sw_brname', n: '分局名称' }, { k: 'manage_sw_team', n: '勘测队名称' },
    { k: 'staff_num', n: '在站正式职工（人）' }, { k: 'agent_num', n: '委托观测员（人）' }
  ],
  [
    { k: 'country_mode', n: '运行模式' }, { k: 'country_way', n: '流量自动监测方式' }
  ],
  [
    { k: 'stcl_type', n: '分类' }, { k: 'stcl_layer', n: '监测层位' },
    { k: 'stcl_way', n: '地下水监测方式' }, { k: 'stcl_item', n: '地下水监测项目' }
  ],
  [
    { k: 'sz_is_comb', n: '是否为量质结合站' }, { k: 'sz_way', n: '水质监测方式' }
  ],
  [
    { k: 'soil_way', n: '监测方式类别', wide: true }
  ],
  [
    { k: 'swz_item', n: '实验项目' }, { k: 'swz_goal', n: '实验目的' },
    { k: 'swz_is_basic', n: '实验站是否兼基本水文站', wide: true }
  ],
  [
    { k: 'zyz_is_auto', n: '是否为自动监测' }, { k: 'zyz_flow_attr', n: '专用流量站建设单位属性' },
    { k: 'zyz_sw_attr', n: '专用水位站建设单位属性' }, { k: 'zyz_rain_attr', n: '专用降水量站建设单位属性' }
  ]
]

const d = computed(() => {
  const s = stationByCode(stcd.value)
  return s ? baseInfo(s) : {}
})
const fieldsOf = (i) => FIELD_DEFS[i] || []

function fmt(k, v) {
  if (v == null || v === '') return '—'
  if (k === 'lgtd' || k === 'lttd') return Number(v).toFixed(6)
  if (k === 'area') return Number(v).toFixed(1)
  return v
}

const activeTab = ref(0)
const isCollapsed = ref(false)
const formRef = ref(null)
const collapsed = ref(Array(SECTIONS.length).fill(false))
const toggle = (i) => { collapsed.value[i] = !collapsed.value[i] }
const scrollTo = (i) => {
  activeTab.value = i
  const el = document.getElementById('biz-sec-' + i)
  const form = formRef.value
  if (el && form) {
    const top = el.getBoundingClientRect().top - form.getBoundingClientRect().top + form.scrollTop
    form.scrollTo({ top: top - 2, behavior: 'smooth' })
  }
}
</script>

<style scoped>
.biz { position: relative; height: 100%; display: flex; gap: 10px; overflow: hidden; }

.biz-form { flex: 1; min-width: 0; height: 100%; overflow-y: auto; padding: 2px 4px 18px 2px; }

.biz-block {
  margin-bottom: 8px;
  border: 1px solid #e6edf5;
  border-radius: 4px;
  background: #fff;
  overflow: hidden;
}

.biz-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 700;
  color: #245c85;
  cursor: pointer;
  background: #f7fafd;
  border-bottom: 1px solid #eef2f6;
  user-select: none;
}
.biz-title .no {
  width: 20px;
  height: 20px;
  flex: none;
  border-radius: 50%;
  background: #017de4;
  color: #fff;
  font-size: 11px;
  line-height: 20px;
  text-align: center;
}
.biz-title .tt { flex: 1; }
.biz-title .ico { color: #8a9aab; font-size: 15px; font-weight: 400; }

/* 四列网格：标签、值、标签、值，保证上下行对齐 */
.biz-grid {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr) 132px minmax(0, 1fr);
  padding: 8px 14px 12px;
  column-gap: 10px;
}
.biz-grid .k {
  padding: 5px 0;
  font-size: 12.5px;
  color: #7a8fa5;
  line-height: 1.6;
  border-bottom: 1px dashed #f2f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.biz-grid .v {
  padding: 5px 0;
  font-size: 12.5px;
  color: #17324a;
  font-weight: 600;
  line-height: 1.6;
  border-bottom: 1px dashed #f2f5f9;
  word-break: break-all;
}
.biz-grid .k-wide { grid-column: 1 / 2; }
.biz-grid .v-wide { grid-column: 2 / 5; }

/* 右侧导航 */
.biz-tabs {
  flex: none;
  width: 104px;
  align-self: flex-start;
  margin-top: 2px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e6edf5;
  border-radius: 4px;
  overflow: hidden;
}
.biz-tabs.collapsed { width: 24px; }
.biz-tabs .toggle {
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #017de4;
  font-size: 13px;
  border-bottom: 1px solid #eef2f6;
}
.biz-tabs .toggle:hover { background: #eef6fe; }
.biz-tabs.collapsed .toggle { border-bottom: none; }
.biz-tabs .tab-item {
  padding: 7px 6px;
  cursor: pointer;
  color: #5b6b7b;
  font-size: 11.5px;
  line-height: 1.4;
  text-align: center;
  border-bottom: 1px solid #f2f5f9;
}
.biz-tabs .tab-item:last-child { border-bottom: none; }
.biz-tabs .tab-item:hover { color: #017de4; background: #f5f9fe; }
.biz-tabs .tab-item.active { color: #fff; background: #017de4; }
</style>
