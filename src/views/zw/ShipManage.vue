<template>
  <div class="sm">
    <div class="sm-tabs">
      <span
        v-for="t in TABS"
        :key="t.k"
        :class="{ on: cur === t.k }"
        @click="cur = t.k"
      >{{ t.n }}</span>
    </div>
    <div class="sm-body">
      <keep-alive>
        <component :is="view" />
      </keep-alive>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ShipLedger from './components/ShipLedger.vue'
import ShipApply from './components/ShipApply.vue'
import ShipStats from './components/ShipStats.vue'

const TABS = [
  { k: 'ledger', n: '船舶台账', c: ShipLedger },
  { k: 'apply', n: '用船申请', c: ShipApply },
  { k: 'stats', n: '统计分析', c: ShipStats }
]
const cur = ref('ledger')
const view = computed(() => TABS.find((t) => t.k === cur.value).c)
</script>

<style scoped>
.sm { height: 100%; display: flex; flex-direction: column; background: #f5f7fa; }
.sm-tabs { flex: none; height: 42px; display: flex; align-items: flex-end; gap: 4px; padding: 0 14px; background: #fff; border-bottom: 1px solid var(--bnd); }
.sm-tabs span { padding: 10px 14px 9px; font-size: 14px; color: #5b6b7b; cursor: pointer; border-bottom: 2px solid transparent; }
.sm-tabs span:hover { color: #017de4; }
.sm-tabs span.on { color: #017de4; border-bottom-color: #017de4; font-weight: 700; }
.sm-body { flex: 1; min-height: 0; overflow: hidden; padding: 10px; }
.sm-body > :deep(*) { height: 100%; }
</style>
