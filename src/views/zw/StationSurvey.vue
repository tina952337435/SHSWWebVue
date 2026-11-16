<template>
  <div class="sv">
    <div class="sv-tabs">
      <span
        v-for="t in TABS"
        :key="t.k"
        :class="{ on: cur === t.k }"
        @click="cur = t.k"
      >{{ t.n }}</span>
    </div>
    <div class="sv-body">
      <keep-alive>
        <component :is="view" />
      </keep-alive>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import SurveyEntry from './components/SurveyEntry.vue'
import SurveyAudit from './components/SurveyAudit.vue'
import SurveyQuery from './components/SurveyQuery.vue'

const TABS = [
  { k: 'entry', n: '数据录入', c: SurveyEntry },
  { k: 'audit', n: '数据审核', c: SurveyAudit },
  { k: 'query', n: '综合查询', c: SurveyQuery }
]
const cur = ref('entry')
const view = computed(() => TABS.find((t) => t.k === cur.value).c)
</script>

<style scoped>
.sv { height: 100%; display: flex; flex-direction: column; background: #f5f7fa; }
.sv-tabs { flex: none; height: 42px; display: flex; align-items: flex-end; gap: 4px; padding: 0 14px; background: #fff; border-bottom: 1px solid var(--bnd); }
.sv-tabs span { padding: 10px 14px 9px; font-size: 14px; color: #5b6b7b; cursor: pointer; border-bottom: 2px solid transparent; }
.sv-tabs span:hover { color: #017de4; }
.sv-tabs span.on { color: #017de4; border-bottom-color: #017de4; font-weight: 700; }
.sv-body { flex: 1; min-height: 0; overflow: hidden; padding: 10px; }
.sv-body > :deep(*) { height: 100%; }
</style>
