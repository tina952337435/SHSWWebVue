<template>
  <div class="ewt">
    <div class="ewt-tabs">
      <span
        v-for="t in TABS"
        :key="t.k"
        :class="{ on: tab === t.k }"
        @click="tab = t.k"
      >{{ t.n }}</span>
    </div>
    <div class="ewt-body">
      <keep-alive><component :is="view" /></keep-alive>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import SancDataQuery from './SancDataQuery.vue'
import ResourceQuery from './ResourceQuery.vue'

const TABS = [
  { k: 'sanc', n: '三调数据查询', c: SancDataQuery },
  { k: 'query', n: '水资源量查询', c: ResourceQuery }
]

const tab = ref('sanc')
const view = computed(() => (TABS.find((t) => t.k === tab.value) || TABS[0]).c)
</script>
