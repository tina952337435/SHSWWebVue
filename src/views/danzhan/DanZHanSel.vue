<template>
    <div id="mainTabs" class="tabs" activeIndex="0" style="width:100%;height:100%;">
        <div style="width: 98%; margin:0px auto;">
            <ul style="margin: 0px;padding: 0px;">
                <li v-for="(item, index) in List" :key="index" class="tab" style="cursor: pointer"
                    :class='index === isActive ? "tab-active" : "tab"' @click="getTab(index, item.title, item.url)">
                    <span class="tab-text">{{ item.title }}</span>
                </li>
            </ul>
        </div>
        <div class="componentdiv">
            <iframe v-if="iframeUrl" :src="iframeUrl" class="frame-div" frameborder="0" allow="fullscreen"
                allowfullscreen></iframe>
            <component v-else :is="currentComponent" v-bind="currentProps"></component>
        </div>
    </div>
</template>
<script setup>
import api from "@/api/zonglan/index.js";
import ChartJs from "@/api/MyEcharts/ChartJs.js";
import { sortObjectArray, GetJosns,SetNull } from "@/api/ComUnit.js";
import dayjs from "dayjs";
import $ from "jquery";

import { ref, onMounted, defineAsyncComponent, provide, markRaw } from "vue";
// 获取当前主题
const _theme = localStorage.getItem("curTheme");
const stime = ref("");
const etime = ref("");
const stcd = ref("");
const stnm = ref("");
const sttp = ref("");
const type = ref("");
const mtype = ref("");
const name = ref("");
const rvnm = ref("");
const List = ref({});
const isActive = ref(0);
const currentComponent = ref(null);
const currentProps = ref({});
const iframeUrl = ref("");
const typeValue = ref();
const props = defineProps({
    stcd: {
        type: String,
        default: "",
    },
    stnm: {
        type: String,
        default: "",
    },
    stime: {
        type: String,
        default: "",
    },
    etime: {
        type: String,
        default: ""
    },
    type: {
        type: String,
        default: "",
    },
    mtype: {
        type: String,
        default: "",
    },
    sttp: {
        type: String,
        default: "",
    },
    name: {
        type: String,
        default: "",
    },
    rvnm: {
        type: String,
        default: "",
    },
});
var strJson=[];
function Weacontent() {
    stcd.value = props.stcd;
    stnm.value = props.stnm;
    stime.value = props.stime;
    etime.value = props.etime;
    sttp.value = props.sttp;
    type.value = props.type;
    mtype.value = props.mtype;
    name.value = props.name;
    rvnm.value = props.rvnm;
    var strParam={
        stcd:stcd.value
    }
    var res = {
        "total": 5,
        "data": [
            {
                "name": "水位过程",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750SW",
                "orderby": 1.0,
                "url": "danzhan/sq/SQLine.vue"
            },
            {
                "name": "降雨过程",
                "sttp": "YL",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750YL",
                "orderby": 2.0,
                "url": "danzhan/yq/YQLine.vue"
            },
            {
                "name": "流量过程",
                "sttp": "YL",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750YL",
                "orderby": 3.0,
                "url": "danzhan/ll/LLLine.vue"
            },
            {
                "name": "水质过程",
                "sttp": "YL",
                "stcd": "63205311",
                "type": "站点配置",
                "id": "63205311YL",
                "orderby": 4.0,
                "url": "danzhan/sz/WaterQualityScreenDan.vue"
            },
            {
                "name": "基础信息",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054218",
                "orderby": 5.0,
                "url": "danzhan/zw/basicInformation.vue"
            },
            {
                "name": "测站示意图",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054221",
                "orderby": 5.5,
                "url": "danzhan/zw/shiyitu.vue"
            },
            {
                "name": "测绘信息-纵断面",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054220",
                "orderby": 6.0,
                "url": "danzhan/hdm/ZongDuanMianSWZ.vue"
            },
            {
                "name": "测绘信息-横断面",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054220",
                "orderby": 6.0,
                "url": "danzhan/hdm/HengDuanSWZ.vue"
            },
            {
                "name": "720全景",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054219",
                "orderby": 7.0,
                "url": "http://47.99.86.232:8050/"
            }
        ],
        "dataSize": 0,
        "pageSize": 0,
        "expand": null,
        "pageTotal": 0,
        "pageIndex": 0,
        "isSuccess": true,
        "elapseTime": 15,
        "message": "操作成功"
    }
    if(stcd.value == "70111400"){
        res.data = [
            {
                "name": "水位过程",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750SW",
                "orderby": 1.0,
                "url": "danzhan/sq/SQLine.vue"
            },
            {
                "name": "降雨过程",
                "sttp": "YL",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750YL",
                "orderby": 2.0,
                "url": "danzhan/yq/YQLine.vue"
            },
            {
                "name": "流量过程",
                "sttp": "YL",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750YL",
                "orderby": 3.0,
                "url": "danzhan/ll/LLLine.vue"
            },
            {
                "name": "基础信息",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054218",
                "orderby": 5.0,
                "url": "danzhan/zw/basicInformation.vue"
            },
            {
                "name": "测站示意图",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054221",
                "orderby": 5.5,
                "url": "danzhan/zw/shiyitu.vue"
            },
            {
                "name": "测绘信息-纵断面",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054220",
                "orderby": 6.0,
                "url": "danzhan/hdm/ZongDuanMianSWZ.vue"
            },
            {
                "name": "测绘信息-横断面",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054220",
                "orderby": 6.0,
                "url": "danzhan/hdm/HengDuanSWZ.vue"
            },
            {
                "name": "720全景",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054219",
                "orderby": 7.0,
                "url": "http://47.99.86.232:8050/"
            }
        ]
    }
    else if(stcd.value == "63205311"){
        res.data = [
            {
                "name": "水位过程",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750SW",
                "orderby": 1.0,
                "url": "danzhan/sq/SQLine.vue"
            },
            {
                "name": "降雨过程",
                "sttp": "YL",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750YL",
                "orderby": 2.0,
                "url": "danzhan/yq/YQLine.vue"
            },
            {
                "name": "流量过程",
                "sttp": "YL",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750YL",
                "orderby": 3.0,
                "url": "danzhan/ll/LLLine.vue"
            },
            {
                "name": "水质过程",
                "sttp": "YL",
                "stcd": "63205311",
                "type": "站点配置",
                "id": "63205311YL",
                "orderby": 4.0,
                "url": "danzhan/sz/WaterQualityScreenDan.vue"
            },
            {
                "name": "基础信息",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054218",
                "orderby": 5.0,
                "url": "danzhan/zw/basicInformation.vue"
            },
            {
                "name": "测站示意图",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054221",
                "orderby": 5.5,
                "url": "danzhan/zw/shiyitu.vue"
            },
            {
                "name": "720全景",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054219",
                "orderby": 7.0,
                "url": "http://47.99.86.232:8050/"
            }
        ]
    }
    else if(stcd.value == "63403200"){
        res.data = [
            {
                "name": "水位过程",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750SW",
                "orderby": 1.0,
                "url": "danzhan/sq/SQLine.vue"
            },
            {
                "name": "降雨过程",
                "sttp": "YL",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750YL",
                "orderby": 2.0,
                "url": "danzhan/yq/YQLine.vue"
            },
            {
                "name": "流量过程",
                "sttp": "YL",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750YL",
                "orderby": 3.0,
                "url": "danzhan/ll/LLLine.vue"
            },
            {
                "name": "水质过程",
                "sttp": "YL",
                "stcd": "63205311",
                "type": "站点配置",
                "id": "63205311YL",
                "orderby": 4.0,
                "url": "danzhan/sz/WaterQualityScreenDan.vue"
            },
            {
                "name": "基础信息",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054218",
                "orderby": 5.0,
                "url": "danzhan/zw/basicInformation.vue"
            },
            {
                "name": "720全景",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054219",
                "orderby": 7.0,
                "url": "https://www.720yun.com/t/4baku78h7ib"
            }
        ]
    }
    else if(stcd.value == "63204260"){
        res.data = [
            {
                "name": "水位过程",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750SW",
                "orderby": 1.0,
                "url": "danzhan/sq/SQLine.vue"
            },
            {
                "name": "降雨过程",
                "sttp": "YL",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750YL",
                "orderby": 2.0,
                "url": "danzhan/yq/YQLine.vue"
            },
            {
                "name": "流量过程",
                "sttp": "YL",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750YL",
                "orderby": 3.0,
                "url": "danzhan/ll/LLLine.vue"
            },
            {
                "name": "基础信息",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054218",
                "orderby": 5.0,
                "url": "danzhan/zw/basicInformation.vue"
            },
            {
                "name": "720全景",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054219",
                "orderby": 7.0,
                "url": "https://www.720yun.com/t/00aku78h0p7"
            }
        ]
    }
    else if(stcd.value == "63310220"){
        res.data = [
            {
                "name": "水位过程",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750SW",
                "orderby": 1.0,
                "url": "danzhan/sq/SQLine.vue"
            },
            {
                "name": "降雨过程",
                "sttp": "YL",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750YL",
                "orderby": 2.0,
                "url": "danzhan/yq/YQLine.vue"
            },
            {
                "name": "流量过程",
                "sttp": "YL",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750YL",
                "orderby": 3.0,
                "url": "danzhan/ll/LLLine.vue"
            },
            {
                "name": "水质过程",
                "sttp": "YL",
                "stcd": "63205311",
                "type": "站点配置",
                "id": "63205311YL",
                "orderby": 4.0,
                "url": "danzhan/sz/WaterQualityScreenDan.vue"
            },
            {
                "name": "基础信息",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054218",
                "orderby": 5.0,
                "url": "danzhan/zw/basicInformation.vue"
            },
            {
                "name": "720全景",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054219",
                "orderby": 7.0,
                "url": "https://www.720yun.com/t/78aku78h0qw"
            }
        ]
    }
    else if(stcd.value == "63310300"){
        res.data = [
            {
                "name": "水位过程",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750SW",
                "orderby": 1.0,
                "url": "danzhan/sq/SQLine.vue"
            },
            {
                "name": "降雨过程",
                "sttp": "YL",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750YL",
                "orderby": 2.0,
                "url": "danzhan/yq/YQLine.vue"
            },
            {
                "name": "流量过程",
                "sttp": "YL",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750YL",
                "orderby": 3.0,
                "url": "danzhan/ll/LLLine.vue"
            },
            {
                "name": "基础信息",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054218",
                "orderby": 5.0,
                "url": "danzhan/zw/basicInformation.vue"
            },
            {
                "name": "720全景",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054219",
                "orderby": 7.0,
                "url": " https://www.720yun.com/t/bdaku78h0qm"
            }
        ]
    }
    else if(stcd.value == "63205020"){
        res.data = [
            {
                "name": "水位过程",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750SW",
                "orderby": 1.0,
                "url": "danzhan/sq/SQLine.vue"
            },
            {
                "name": "降雨过程",
                "sttp": "YL",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750YL",
                "orderby": 2.0,
                "url": "danzhan/yq/YQLine.vue"
            },
            {
                "name": "流量过程",
                "sttp": "YL",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750YL",
                "orderby": 3.0,
                "url": "danzhan/ll/LLLine.vue"
            },
            {
                "name": "基础信息",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054218",
                "orderby": 5.0,
                "url": "danzhan/zw/basicInformation.vue"
            },
            {
                "name": "720全景",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054219",
                "orderby": 7.0,
                "url": "https://www.720yun.com/t/d0aku78h7dl"
            }
        ]
    }
    else if(stcd.value == "63304650" || stcd.value == "63304700" ){
        res.data =[
            {
                "name": "水位过程",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750SW",
                "orderby": 1.0,
                "url": "danzhan/sq/SQLine.vue"
            },
            {
                "name": "降雨过程",
                "sttp": "YL",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750YL",
                "orderby": 2.0,
                "url": "danzhan/yq/YQLine.vue"
            },
            {
                "name": "流量过程",
                "sttp": "YL",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "63401750YL",
                "orderby": 3.0,
                "url": "danzhan/ll/LLLine.vue"
            },
            {
                "name": "水质过程",
                "sttp": "YL",
                "stcd": "63205311",
                "type": "站点配置",
                "id": "63205311YL",
                "orderby": 4.0,
                "url": "danzhan/sz/WaterQualityScreenDan.vue"
            },
            {
                "name": "基础信息",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054218",
                "orderby": 5.0,
                "url": "danzhan/zw/basicInformation.vue"
            },
            {
                "name": "测站示意图",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054221",
                "orderby": 5.5,
                "url": "danzhan/zw/shiyitu.vue"
            },
            {
                "name": "测绘信息-纵断面",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054220",
                "orderby": 6.0,
                "url": "danzhan/hdm/ZongDuanMianSWZ.vue"
            },
            {
                "name": "测绘信息-横断面",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054220",
                "orderby": 6.0,
                "url": "danzhan/hdm/HengDuanSWZ.vue"
            },
            {
                "name": "720全景",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054219",
                "orderby": 7.0,
                "url": "http://47.99.86.232:8050/"
            }
        ]
    }
    else{
        res.data = [
            {
                "name": "基础信息",
                "sttp": "SW",
                "stcd": "63401750",
                "type": "站点配置",
                "id": "2019011013551054218",
                "orderby": 5.0,
                "url": "danzhan/zw/basicInformation.vue"
            }
        ]
    }
    // api.getGLSTCD(strParam).then((res) => {   
        res.data.map(item=>{
            var showActive=false;
            if(SetNull(props.name)!=''){
                if(props.name==item.name){
                    showActive=true;
                }
            }
            strJson.push({ "title": item.name, "url": item.url, "showActive": showActive, "showCloseButton": false });
        });
        List.value = strJson;
        if (strJson.length > 0) {
            for (var num = 0; num < strJson.length; num++) {
                var tab = strJson[num];
                if (tab.showActive == true) {
                    getTab(num, tab.title, tab.url)
                }
            }
        }
        window.loadingHide();
    // });
}
// function getTab(index, title, url) { 
//   isActive.value = index;   
//   // 从映射中获取组件路径，若不存在则使用默认路径
//   const componentPath = strJson[index].url;  
//   // 动态加载组件
//   const customModal = defineAsyncComponent({ 
//     loader: () => import(componentPath), 
//     delay: 200, 
//     timeout: 3000 
//   });   
//   currentComponent.value = markRaw(customModal); 
// }

// 1. 扫描当前文件所在目录下的 components 文件夹
// 假设你的 Vue 文件在 src/views 或 src 下，且 components 是同级或上级目录
// 如果报错找不到，请尝试改成 '../components' 或 '/src/components'
// 修改 glob 路径，使用 /src 开头
const modules = import.meta.glob('/src/components/**/*.vue', { eager: false });

function getTab(index, title, url) {
    isActive.value = index;
    let sttp = "TSQ004+996";
    let dis = "4996"
    if(stcd.value == "63304700"){
        sttp = "TSQ004+996";
        dis = "4996"
    }else if(stcd.value == "63304650"){
        sttp = "SY004+599";
        dis = "4729.49"
    }else if(stcd.value == "70111400"){
        sttp = "JK005+310";
        dis = "5395"
    }

  // http(s) 外链：用 iframe 嵌套加载
  if (/^https?:\/\//i.test(url)) {
    currentComponent.value = null;
    currentProps.value = {};
    iframeUrl.value = url;
    return;
  }
  iframeUrl.value = "";

  // 2. 拼接路径
  const componentPath = `/src/components/${strJson[index].url}`;
  const loader = modules[componentPath];

  if (loader) {
    const customModal = defineAsyncComponent({
      loader: loader,
      delay: 200,
      timeout: 3000
    });
    currentComponent.value = markRaw(customModal);

    // 横断面组件需要 station / sttp / dis（等价于 Dialog.open 里 h(ChildVue, {...}) 传入的 props）
    if (/HengDuanSWZ/.test(url)) {
      currentProps.value = {
        station: stnm.value, // 站名，来自弹窗 props.stnm
        sttp: sttp,            // 断面编号：DanZHanSel 当前未携带，需从数据源补充
        dis: dis,              // 桩号/距离：DanZHanSel 当前未携带，需从数据源补充
        stcd:stcd.value,
        stnm:stnm.value            
      };
    } else {
      currentProps.value = {};
    }
  } else {
    console.error(`❌ 找不到组件: ${componentPath}`);
    console.error('🔍 请检查路径是否匹配，可用的组件列表:', Object.keys(modules));
  }
}

onMounted(() => {
    if (_theme == "BlueTheme") {
        $(".popContent").css("background", "#031426 !important");
        $(".content").css("background", "#031426e6 !important");
    }
    Weacontent();
});
provide("stcd", stcd);
provide("stnm", stnm);
provide("stime", stime);
provide("etime", etime);
provide("sttp", sttp);
provide("type", type);
provide("mtype", mtype);
provide("name", name);
provide("rvnm", rvnm);
</script>
<style scoped> .tabs-bodys {
     background: transparent;
     zoom: 1;
 }

 .tabs-scrollCt {
     border: 0px;
 }

 .tabs-space {
     border: 0px;
 }

 .tab {
     background: var(--menuTop) no-repeat center;
     background-size: 100% 100%;
     color: var(--mtablecolor);
     border: 0px;
     display: inline-block;
     list-style: none;
     margin-right: 10px;
     height: 30px;
     line-height: 33px;

 }

 .tab-active {
     background: var(--menuTopSelected) no-repeat center;
     background-size: 100% 100%;
 }

 .tabs-header {
     background: rgb(3, 23, 31);
 }

 .tab-text {
     font-size: 14px;
     line-height: 16px;
     padding: 6px 10px 6px 10px;
 }

 /* 让 tab 内容区撑满剩余高度，视频等 tab 自适应高度 */
 #mainTabs {
     display: flex;
     flex-direction: column;
 }
 .componentdiv {
     flex: 1;
     min-height: 0;
     overflow: auto;
 }

 .componentdiv .frame-div {
     display: block;
     width: 100%;
     height: 100%;
     border: 0;
 }


 /* 自定义滚动条样式 */
 .componentdiv::-webkit-scrollbar {
     width: 2px;
     /* 设置滚动条宽度 */
 }

 .componentdiv::-webkit-scrollbar-thumb {
     /* 滚动条手柄 */
     width: 10px;
     height: 10px;
     position: absolute;
     right: -4px;
     top: 0px;
     background: var(--mtabletrcolor);
     z-index: 2;
 }
 .syt-status:txt{

 }
</style>
  