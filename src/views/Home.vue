<template>
  <div class="home">
    <div class="hero">
      <h1>{{ SYS_TITLE }}</h1>
      <p>
        长江口、省市边界水文监测站网信息化项目升级改造 · 统一门户<br />
        本批次聚焦【水资源评价】模块，完成「主要断面流量实时感知」「历年水资源量查询」两项功能界面设计。
      </p>
      <div class="tags">
        <span v-for="m in MODULES" :key="m.k">{{ m.n }}</span>
      </div>
    </div>

    <h3>业务模块</h3>
    <div class="mod-grid">
      <div
        v-for="m in MODULES"
        :key="m.k"
        class="mod-card"
        :class="{ on: m.k === 'zp' }"
        @click="go(m.k)"
      >
        <div class="mi">{{ m.icon }}</div>
        <div class="mn">{{ m.n }}</div>
        <div class="md">{{ m.d }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { SYS_TITLE, MODULES } from '@/config/menu'

const router = useRouter()

function go(k) {
  if (k === 'home') router.push('/home')
  else if (k === 'zp') router.push('/zp/rt')
  else router.push(`/${k}`)
}
</script>
