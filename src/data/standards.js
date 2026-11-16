/**
 * 站网管理 · 标准规范规程（演示数据）
 *
 * 大屏上是一张「标准规范规程」清单，中屏做成可检索、可分类、可查看的标准库。
 */

export const STD_TYPES = ['国家标准', '行业标准', '地方标准', '技术导则']
export const STD_STATUS = ['现行', '修订中', '即将实施']

export const STANDARDS = [
  {
    id: 'S01', name: '水文测验规范', code: 'SL 58-2014', type: '行业标准',
    dept: '水利部', publish: '2014-10-08', effective: '2015-01-01', status: '现行',
    scope: '水文要素观测、测验方式、精度要求与成果质量'
  },
  {
    id: 'S02', name: '水文测站编码规则', code: 'SL 502-2010', type: '行业标准',
    dept: '水利部', publish: '2010-08-20', effective: '2010-11-01', status: '现行',
    scope: '测站分类、站码编制规则与唯一性要求'
  },
  {
    id: 'S03', name: '水位观测标准', code: 'GB/T 50138-2010', type: '国家标准',
    dept: '住房和城乡建设部', publish: '2010-05-31', effective: '2010-12-01', status: '现行',
    scope: '水位站布设、观测设备、观测方法与资料整理'
  },
  {
    id: 'S04', name: '河流流量测验规范', code: 'GB 50179-2015', type: '国家标准',
    dept: '住房和城乡建设部', publish: '2015-08-20', effective: '2016-06-01', status: '现行',
    scope: '流量测验方案、断面测量、流速仪法与浮标法'
  },
  {
    id: 'S05', name: '水文测报设施建设与管理技术导则', code: '办水文〔2021〕132 号', type: '技术导则',
    dept: '水利部办公厅', publish: '2021-06-15', effective: '2021-07-01', status: '现行',
    scope: '测报设施建设标准、运行维护与验收管理'
  },
  {
    id: 'S06', name: '降水量观测规范', code: 'SL 21-2015', type: '行业标准',
    dept: '水利部', publish: '2015-03-12', effective: '2015-06-01', status: '现行',
    scope: '雨量站布设、降水观测与资料整编'
  },
  {
    id: 'S07', name: '地下水监测规范', code: 'SL 183-2005', type: '行业标准',
    dept: '水利部', publish: '2005-09-01', effective: '2005-12-01', status: '修订中',
    scope: '地下水监测井布设、水位与水质监测'
  },
  {
    id: 'S08', name: '水质采样技术规程', code: 'SL 187-96', type: '行业标准',
    dept: '水利部', publish: '1996-11-12', effective: '1997-01-01', status: '修订中',
    scope: '采样断面、采样频次与样品保存运输'
  },
  {
    id: 'S09', name: '水文资料整编规范', code: 'SL 247-2012', type: '行业标准',
    dept: '水利部', publish: '2012-12-20', effective: '2013-03-01', status: '现行',
    scope: '水位、流量、泥沙、降水资料整编与刊印'
  },
  {
    id: 'S10', name: '水文基础设施建设及技术装备标准', code: 'SL 276-2002', type: '行业标准',
    dept: '水利部', publish: '2002-06-18', effective: '2002-09-01', status: '修订中',
    scope: '站房、观测场、缆道等技术装备配置标准'
  },
  {
    id: 'S11', name: '水文缆道设计规范', code: 'SL 321-2005', type: '行业标准',
    dept: '水利部', publish: '2005-05-01', effective: '2005-08-01', status: '现行',
    scope: '水文缆道结构设计、荷载计算与安全校核'
  },
  {
    id: 'S12', name: '水文监测数据通信规约', code: 'SL 651-2014', type: '行业标准',
    dept: '水利部', publish: '2014-06-25', effective: '2014-09-01', status: '现行',
    scope: '遥测终端与中心站之间的数据帧格式与传输要求'
  },
  {
    id: 'S13', name: '水文自动测报系统技术规范', code: 'SL 61-2015', type: '行业标准',
    dept: '水利部', publish: '2015-05-15', effective: '2015-08-01', status: '现行',
    scope: '自动测报系统组成、通信方式与可靠性要求'
  },
  {
    id: 'S14', name: '上海市水文测站建设与管理导则', code: '沪水务〔2023〕286 号', type: '地方标准',
    dept: '上海市水务局', publish: '2023-09-10', effective: '2023-10-01', status: '现行',
    scope: '本市测站建设标准、分类分级与运行管理要求'
  },
  {
    id: 'S15', name: '水文应急监测技术导则', code: 'SL 764-2018', type: '技术导则',
    dept: '水利部', publish: '2018-07-20', effective: '2018-10-01', status: '现行',
    scope: '突发事件应急监测响应、装备配置与成果报送'
  },
  {
    id: 'S16', name: '水文仪器基本环境试验条件及方法', code: 'GB/T 9359-2016', type: '国家标准',
    dept: '国家标准化管理委员会', publish: '2016-08-29', effective: '2017-03-01', status: '现行',
    scope: '水文仪器环境适应性试验条件与试验方法'
  },
  {
    id: 'S17', name: '水文年鉴汇编刊印规范', code: 'SL/T 738-2016', type: '行业标准',
    dept: '水利部', publish: '2016-09-30', effective: '2016-12-01', status: '现行',
    scope: '水文年鉴卷册划分、表式与刊印质量要求'
  },
  {
    id: 'S18', name: '水情信息编码标准', code: 'SL 330-2011', type: '行业标准',
    dept: '水利部', publish: '2011-08-01', effective: '2011-11-01', status: '即将实施',
    scope: '水情信息分类、编码规则与报文格式'
  }
]

export function stdStats(list) {
  return {
    total: list.length,
    current: list.filter((s) => s.status === '现行').length,
    revising: list.filter((s) => s.status === '修订中').length,
    newish: list.filter((s) => s.status === '即将实施').length
  }
}
