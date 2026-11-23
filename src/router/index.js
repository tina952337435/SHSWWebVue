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
      { path: 'zw', redirect: '/zw/gis' },
      { path: 'zw/gis', name: 'zw-gis', component: () => import('@/views/zw/StationGIS.vue'), meta: { mod: 'zw', sub: 'gis', title: '站网一张图' } },
      { path: 'zw/stations', name: 'zw-stations', component: () => import('@/views/zw/StationLedger.vue'), meta: { mod: 'zw', sub: 'stations', title: '测站管理' } },
      { path: 'zw/stat', name: 'zw-stat', component: () => import('@/views/zw/StationStats.vue'), meta: { mod: 'zw', sub: 'stat', title: '统计分析' } },
      { path: 'zw/sb', name: 'zw-sb', component: () => import('@/views/zw/FacilityManage.vue'), meta: { mod: 'zw', sub: 'sb', title: '设施设备管理' } },
      { path: 'zw/jz', name: 'zw-jz', component: () => import('@/views/zw/BuildProgress.vue'), meta: { mod: 'zw', sub: 'jz', title: '建设进展' } },
      { path: 'zw/bz', name: 'zw-bz', component: () => import('@/views/zw/Standards.vue'), meta: { mod: 'zw', sub: 'bz', title: '标准规范规程' } },
      { path: 'zw/tjdc', name: 'zw-tjdc', component: () => import('@/views/zw/StationSurvey.vue'), meta: { mod: 'zw', sub: 'tjdc', title: '水文统计调查' } },
      { path: 'zw/gd', name: 'zw-gd', component: () => import('@/views/zw/WorkOrder.vue'), meta: { mod: 'zw', sub: 'gd', title: '工单系统' } },
      { path: 'zw/cb', name: 'zw-cb', component: () => import('@/views/zw/ShipManage.vue'), meta: { mod: 'zw', sub: 'cb', title: '船舶管理' } },
      { path: 'swjc/rt', name: 'swjc-rt', component: () => import('@/views/zp/RealtimePerception.vue'), meta: { mod: 'swjc', sub: 'rt', title: '主要断面流量实时感知' } },
      { path: 'zp/rainiso', name: 'zp-rainiso', component: () => import('@/views/zp/RainIsoSurface.vue'), meta: { mod: 'zp', sub: 'rainiso', title: '降雨等值面' } },
      { path: 'zp/qr', name: 'zp-qr', component: () => import('@/views/zp/WaterResourceQuery.vue'), meta: { mod: 'zp', sub: 'qr', title: '水资源量查询' } },
      { path: 'zp/model', name: 'zp-model', component: () => import('@/views/zp/ModelCalc.vue'), meta: { mod: 'zp', sub: 'model', title: '慧水模型计算' } },
      { path: 'zp/jcrl', name: 'zp-jcrl', component: () => import('@/views/zp/InOutFlow.vue'), meta: { mod: 'zp', sub: 'jcrl', title: '出入境水资源量计算' } },
      { path: 'zp/wt', name: 'zp-wt', component: () => import('@/views/zp/PollutantFlux.vue'), meta: { mod: 'zp', sub: 'wt', title: '省市边界污染物通量分析' } },
      { path: 'zp/stlrb', name: 'zp-stlrb', component: () => import('@/views/zp/EcoFlowReport.vue'), meta: { mod: 'zp', sub: 'stlrb', title: '生态流量月报 · 月报生成' } },
      { path: 'zp/stlrmgr', name: 'zp-stlrmgr', component: () => import('@/views/zp/EcoReportManage.vue'), meta: { mod: 'zp', sub: 'stlrmgr', title: '生态流量月报 · 月报管理' } },
      { path: 'zp/brmgr', name: 'zp-brmgr', component: () => import('@/views/zp/BoundaryInflowReport.vue'), meta: { mod: 'zp', sub: 'brmgr', title: '边界来水监测月报' } },
      { path: 'zp/brgen', name: 'zp-brgen', component: () => import('@/views/zp/BoundaryReportGen.vue'), meta: { mod: 'zp', sub: 'brgen', title: '边界来水监测月报 · 月报生成' } },
      { path: 'zp/stll', name: 'zp-stll', component: () => import('@/views/zp/EcoFlowWarn.vue'), meta: { mod: 'zp', sub: 'stll', title: '生态流量监测预警' } },
      { path: 'zp/qrsj', name: 'zp-qrsj', component: () => import('@/views/zp/EcoConfirmData.vue'), meta: { mod: 'zp', sub: 'qrsj', title: '质控数据' } },
      { path: 'zp/qcmanage', name: 'zp-qcmanage', component: () => import('@/views/zp/EcoConfirmManage.vue'), meta: { mod: 'zp', sub: 'qcmanage', title: '生态水位质控管理' } },
      { path: 'zp/stllov', redirect: '/zp/stll' },
      { path: 'zp/stllstat', redirect: '/zp/stll' },
      { path: 'zp/stllwarn', redirect: '/zp/stll' },
      { path: 'zp/stllrule', redirect: '/zp/stll' },
      { path: 'swyb', redirect: '/swyb/zh' },
      { path: 'swyb/zh', name: 'swyb-zh', component: () => import('@/views/swyb/WaterInfoApp.vue'), meta: { mod: 'swyb', sub: 'zh', title: '水情综合应用' } },
      { path: 'swyb/hsyb', name: 'swyb-hsyb', component: () => import('@/views/swyb/FloodForecast.vue'), meta: { mod: 'swyb', sub: 'hsyb', title: '洪水预报' } },
      { path: 'swyb/tfjc', name: 'swyb-tfjc', component: () => import('@/views/swyb/TyphoonMonitor.vue'), meta: { mod: 'swyb', sub: 'tfjc', title: '台风暴雨监视' } },
      { path: 'swyb/tffx', name: 'swyb-tffx', component: () => import('@/views/swyb/TyphoonHistory.vue'), meta: { mod: 'swyb', sub: 'tffx', title: '历史台风水情特征分析' } },
      { path: 'swyb/yjfb', name: 'swyb-yjfb', component: () => import('@/views/swyb/ForecastWarning.vue'), meta: { mod: 'swyb', sub: 'yjfb', title: '预报预警发布' } },
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
