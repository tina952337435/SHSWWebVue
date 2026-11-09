<template>
  <div class="stub">
    <div class="box">
      <h2>{{ name }}</h2>
      <p>{{ desc }}</p>
      <div class="tip">该功能属于【水资源评价】模块，已列入调研提纲，待后续排期设计。</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { SUBMENUS } from '@/config/menu'

const route = useRoute()
const name = computed(() => {
  const it = (SUBMENUS.zp || []).find((x) => x.k === route.params.sub)
  return it ? it.n : '功能'
})
const desc = computed(() => {
  const it = (SUBMENUS.zp || []).find((x) => x.k === route.params.sub)
  return it ? it.s : ''
})
</script>
