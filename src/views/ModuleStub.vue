<template>
  <div class="stub">
    <div class="box">
      <h2>{{ name }}</h2>
      <p>{{ desc }}</p>
      <div class="tip">本批次设计范围为【水资源评价】模块，此模块界面待后续排期推进。</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { MODULES, MOD_DESC } from '@/config/menu'

const route = useRoute()
const name = computed(() => {
  const m = MODULES.find((x) => x.k === route.params.mod)
  return m ? m.n : '模块'
})
const desc = computed(() => MOD_DESC[route.params.mod] || '')
</script>
