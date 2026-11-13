<template>
  <div class="ewt">
    <div class="ewt-tabs">
      <span
        v-for="t in TABS"
        :key="t.k"
        :class="{ on: cur === t.k }"
        @click="cur = t.k"
      >{{ t.n }}</span>
    </div>
    <div class="ewt-body">
      <keep-alive>
        <component :is="view" />
      </keep-alive>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import WaterLevelMonitor from './WaterLevelMonitor.vue'
import EcoFlowStats from './EcoFlowStats.vue'
import EcoFlowWarnings from './EcoFlowWarnings.vue'
import EcoFlowRules from './EcoFlowRules.vue'

const TABS = [
  { k: 'overview', n: '监测总览', c: WaterLevelMonitor },
  { k: 'stats', n: '统计分析', c: EcoFlowStats },
  { k: 'warnings', n: '预警记录', c: EcoFlowWarnings },
  { k: 'rules', n: '预警规则', c: EcoFlowRules }
]

const cur = ref('overview')
const view = computed(() => TABS.find((t) => t.k === cur.value).c)
</script>
