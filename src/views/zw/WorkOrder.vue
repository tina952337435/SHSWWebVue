<template>
  <div class="wo">
    <div class="wo-tabs">
      <span
        v-for="t in TABS"
        :key="t.k"
        :class="{ on: cur === t.k }"
        @click="cur = t.k"
      >{{ t.n }}</span>
    </div>
    <div class="wo-body">
      <keep-alive>
        <component :is="view" />
      </keep-alive>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import OrderList from './components/OrderList.vue'
import InspectRecord from './components/InspectRecord.vue'
import OrderStats from './components/OrderStats.vue'

const TABS = [
  { k: 'list', n: '工单管理', c: OrderList },
  { k: 'inspect', n: '巡检记录', c: InspectRecord },
  { k: 'stats', n: '统计分析', c: OrderStats }
]
const cur = ref('list')
const view = computed(() => TABS.find((t) => t.k === cur.value).c)
</script>

<style scoped>
.wo { height: 100%; display: flex; flex-direction: column; background: #f5f7fa; }
.wo-tabs { flex: none; height: 42px; display: flex; align-items: flex-end; gap: 4px; padding: 0 14px; background: #fff; border-bottom: 1px solid var(--bnd); }
.wo-tabs span { padding: 10px 14px 9px; font-size: 14px; color: #5b6b7b; cursor: pointer; border-bottom: 2px solid transparent; }
.wo-tabs span:hover { color: #017de4; }
.wo-tabs span.on { color: #017de4; border-bottom-color: #017de4; font-weight: 700; }
.wo-body { flex: 1; min-height: 0; overflow: hidden; padding: 10px; }
.wo-body > :deep(*) { height: 100%; }
</style>
