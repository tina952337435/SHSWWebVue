import { createRouter, createWebHashHistory } from 'vue-router'
import MainLayout from '@/layout/MainLayout.vue'

const routes = [
  { path: '/', redirect: '/home' },
  { path: '/720', name: 'screen720', component: () => import('@/views/Screen720.vue'), meta: { title: '综合态势大屏' } },
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: 'home', name: 'home', component: () => import('@/views/Home.vue'), meta: { mod: 'home', title: '平台首页' } },
      { path: 'swjc/rt', name: 'swjc-rt', component: () => import('@/views/zp/RealtimePerception.vue'), meta: { mod: 'swjc', sub: 'rt', title: '主要断面流量实时感知' } },
      { path: 'zp/qr', name: 'zp-qr', component: () => import('@/views/zp/WaterResourceQuery.vue'), meta: { mod: 'zp', sub: 'qr', title: '历年水资源量查询' } },
      { path: 'zp/jcrl', name: 'zp-jcrl', component: () => import('@/views/zp/InOutFlow.vue'), meta: { mod: 'zp', sub: 'jcrl', title: '出入境水资源量计算' } },
      { path: 'zp/wt', name: 'zp-wt', component: () => import('@/views/zp/PollutantFlux.vue'), meta: { mod: 'zp', sub: 'wt', title: '省市边界污染物通量分析' } },
      { path: 'zp/stlrb', name: 'zp-stlrb', component: () => import('@/views/zp/EcoFlowReport.vue'), meta: { mod: 'zp', sub: 'stlrb', title: '生态流量月报 · 月报生成' } },
      { path: 'zp/stlrmgr', name: 'zp-stlrmgr', component: () => import('@/views/zp/EcoReportManage.vue'), meta: { mod: 'zp', sub: 'stlrmgr', title: '生态流量月报 · 月报管理' } },
      { path: 'zp/brmgr', name: 'zp-brmgr', component: () => import('@/views/zp/BoundaryInflowReport.vue'), meta: { mod: 'zp', sub: 'brmgr', title: '边界来水监测月报' } },
      { path: 'zp/brgen', name: 'zp-brgen', component: () => import('@/views/zp/BoundaryReportGen.vue'), meta: { mod: 'zp', sub: 'brgen', title: '边界来水监测月报 · 月报生成' } },
      { path: 'zp/stll', name: 'zp-stll', component: () => import('@/views/zp/EcoFlowWarn.vue'), meta: { mod: 'zp', sub: 'stll', title: '生态流量监测预警' } },
      { path: 'zp/qrsj', name: 'zp-qrsj', component: () => import('@/views/zp/EcoConfirmData.vue'), meta: { mod: 'zp', sub: 'qrsj', title: '质控数据' } },
      { path: 'zp/stllov', redirect: '/zp/stll' },
      { path: 'zp/stllstat', redirect: '/zp/stll' },
      { path: 'zp/stllwarn', redirect: '/zp/stll' },
      { path: 'zp/stllrule', redirect: '/zp/stll' },
      { path: 'zp/:sub', name: 'zp-sub', component: () => import('@/views/SubStub.vue'), meta: { mod: 'zp' } },
      { path: ':mod', name: 'module', component: () => import('@/views/ModuleStub.vue'), meta: {} }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/home' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.afterEach((to) => {
  if (to.meta && to.meta.title) {
    document.title = `${to.meta.title} - 上海市水文行业综合业务管理系统`
  }
})

export default router
