<template>
  <div ref="el" :style="{ width: '100%', height: height + 'px' }"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: Number, default: 300 }
})
const emit = defineEmits(['pick'])

const el = ref(null)
let chart = null

function render() {
  if (!chart) chart = echarts.init(el.value)
  chart.setOption(props.option, true)
}
function resize() { chart && chart.resize() }
function onClick(p) { if (p && p.componentType === 'series') emit('pick', p) }

onMounted(() => {
  render()
  chart.on('click', onClick)
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  if (chart) { chart.dispose(); chart = null }
})

watch(() => props.option, () => { if (chart) chart.setOption(props.option, true) }, { deep: true })
</script>
