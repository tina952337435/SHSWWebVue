<template>
  <div class="layout">
    <header class="topbar">
      <div class="logo">
        <span class="mark">
          <img :src="logoUrl" alt="中国水文" />
        </span>
        <span class="tt">{{ SYS_TITLE }}</span>
      </div>

      <nav class="topnav">
        <a
          v-for="m in MODULES"
          :key="m.k"
          :class="{ on: activeModule === m.k }"
          @click="goNav(m)"
        >
          <el-icon class="ni"><component :is="ICONS[m.k]" /></el-icon>
          <span>{{ m.n }}</span>
        </a>
      </nav>

      <div class="right">
        <!-- <span class="tm">{{ clock }}</span> -->
        <div class="user">
          <el-icon class="ui"><User /></el-icon>
          <span class="un">管理员</span>
          <el-icon class="cr"><ArrowDown /></el-icon>
        </div>
      </div>
    </header>

    <div class="shell">
      <!-- 左侧子菜单：结构与样式对齐参考项目 MixLayout（el-menu + 60px 折叠头） -->
      <aside
        v-if="sideMenu && sideMenu.length"
        class="side"
        :class="{ collapsed }"
      >
        <div class="side-hd">
          <el-icon class="fold" @click="collapsed = !collapsed">
            <Expand v-if="collapsed" />
            <Fold v-else />
          </el-icon>
        </div>

        <el-menu
          :default-active="activeSub"
          :collapse="collapsed"
          class="side-menu"
          @select="goSub"
        >
          <template v-for="it in sideMenu" :key="it.k">
            <!-- 有子菜单 -->
            <el-sub-menu v-if="it.children" :index="it.k">
              <template #title>
                <el-icon><component :is="SUB_ICONS[it.k]" /></el-icon>
                <span>{{ it.n }}</span>
              </template>
              <el-menu-item v-for="c in it.children" :key="c.k" :index="c.k">
                {{ c.n }}
              </el-menu-item>
            </el-sub-menu>
            <!-- 普通菜单项 -->
            <el-menu-item v-else :index="it.k">
              <el-icon><component :is="SUB_ICONS[it.k]" /></el-icon>
              <span>{{ it.n }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </aside>

      <main class="main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  HomeFilled, Connection, Odometer, Cloudy, DataAnalysis, Histogram, Document,
  Monitor, User, ArrowDown, Fold, Expand, Switch, Bell, TrendCharts
} from '@element-plus/icons-vue'
import { SYS_TITLE, MODULES, SUBMENUS } from '@/config/menu'

// public 下的静态资源：用 BASE_URL 拼接，兼容根路径 / 子路径部署
const logoUrl = `${import.meta.env.BASE_URL}images/logo.png`

const ICONS = {
  jsc: Monitor,
  home: HomeFilled,
  zw: Connection,
  swjc: Odometer,
  swyb: Cloudy,
  szjg: DataAnalysis,
  zp: Histogram,
  swzb: Document
}

const route = useRoute()
const router = useRouter()

const activeModule = computed(() => {
  if (route.name === 'home') return 'home'
  if (route.path.startsWith('/zp')) return 'zp'
  return route.params.mod || route.meta.mod || 'home'
})

const activeSub = computed(() => {
  const s = route.params.sub || route.meta.sub || ''
  // 月报生成页由对应月报管理进入，菜单仍高亮该项
  if (s === 'stlrb') return 'stlrmgr'
  if (s === 'brgen') return 'brmgr'
  return s
})

// 左侧子菜单：跟随当前模块（水资源评价 / 水文监测 等有二级菜单的模块）
const sideMenu = computed(() => SUBMENUS[activeModule.value] || [])

function goModule(k) {
  if (k === 'home') router.push('/home')
  else {
    const subs = SUBMENUS[k] || []
    router.push(subs.length ? `/${k}/${subs[0].k}` : `/${k}`)
  }
}

// 顶栏导航：带 href 的项（如驾驶舱）走外链，其余走内部路由
function goNav(m) {
  if (m.href) { window.open(m.href, '_blank', 'noopener,noreferrer'); return }
  goModule(m.k)
}

function goSub(k) {
  router.push(`/${activeModule.value}/${k}`)
}

// 二级菜单图标（与参考项目一致：一级菜单项带图标）
const SUB_ICONS = {
  rt: Odometer,
  qrsj: Document,
  qr: Histogram,
  jcrl: Switch,
  wt: DataAnalysis,
  stll: Bell,
  stl: TrendCharts,
  stlrmgr: TrendCharts,
  brmgr: Document
}

// 侧边栏折叠
const collapsed = ref(false)

// 时钟
const clock = ref('')
let timer = null
function tick() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  clock.value = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
onMounted(() => { tick(); timer = setInterval(tick, 1000) })
onBeforeUnmount(() => { clearInterval(timer) })
</script>
