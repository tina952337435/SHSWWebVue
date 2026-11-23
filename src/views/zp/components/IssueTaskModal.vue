<template>
  <div v-if="modelValue" class="tk-mask" @click.self="close">
    <div class="tk-pop" @click.stop>
      <div class="tk-hd">
        <div>
          <div class="tk-title">一键下发填报任务</div>
          <div class="tk-sub">生成直达链接推送政务群 · 区里点链接直达填报</div>
        </div>
        <button class="tk-x" type="button" @click="close">×</button>
      </div>
      <div class="tk-bd">
        <div class="tk-row">
          <label>填报日期</label>
          <input v-model="d" type="date" />
        </div>
        <div class="tk-row">
          <label>截止时间</label>
          <input v-model="dl" type="datetime-local" />
        </div>
        <div class="tk-row">
          <label>任务链接</label>
          <div class="tk-link">
            <span class="tk-link-text">{{ link }}</span>
            <button class="tk-copy" type="button" @click="copy">复制</button>
          </div>
        </div>
      </div>
      <div class="tk-ft">
        <button class="tk-btn" type="button" @click="close">取消</button>
        <button class="tk-btn primary" type="button" :disabled="!d" @click="push">推送政务群</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { issueTask } from '@/store/ecoTask'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  date: { type: String, default: '' } // 默认填报日期
})
const emit = defineEmits(['update:modelValue', 'issued'])

function todayStr() {
  const x = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`
}

const d = ref('')
const dl = ref('')

watch(() => props.modelValue, (v) => {
  if (v) {
    d.value = props.date || ''
    dl.value = `${todayStr()}T18:00`
  }
})

const link = computed(() => `${location.href.split('#')[0]}#/zp/qrsj?date=${d.value}`)

function close() { emit('update:modelValue', false) }

function push() {
  if (!d.value) { ElMessage.warning({ message: '请选择填报日期', offset: 78 }); return }
  issueTask(d.value, dl.value)
  emit('issued', { date: d.value, deadline: dl.value })
  close()
  ElMessage.success({ message: `任务已推送至 9 个区政务群（${d.value}）`, offset: 78 })
}

async function copy() {
  const text = link.value
  try {
    await navigator.clipboard.writeText(text)
  } catch (e) {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  ElMessage.success({ message: '链接已复制', offset: 78 })
}
</script>

<style scoped>
.tk-mask {
  position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center;
  padding: 24px; background: rgba(13, 35, 58, .4);
}
.tk-pop {
  width: min(560px, 96%); overflow: hidden; background: #fff;
  border-radius: 10px; box-shadow: 0 24px 60px rgba(10, 35, 60, .4);
}
.tk-hd {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 20px 24px 16px; background: linear-gradient(135deg, #14b8a6, #0b7c72); color: #fff;
}
.tk-title { font-size: 18px; font-weight: 700; letter-spacing: .5px; }
.tk-sub { font-size: 12px; opacity: .85; margin-top: 5px; line-height: 1.5; }
.tk-x {
  width: 28px; height: 28px; padding: 0; flex: none;
  border: 1px solid rgba(255, 255, 255, .5); border-radius: 50%;
  background: rgba(255, 255, 255, .12); color: #fff; font-size: 18px; line-height: 1; cursor: pointer;
}
.tk-x:hover { background: rgba(255, 255, 255, .28); }
.tk-bd { padding: 22px 24px 6px; display: flex; flex-direction: column; gap: 16px; }
.tk-row { display: flex; align-items: center; gap: 14px; }
.tk-row > label { flex: none; width: 72px; font-size: 14px; color: #3a4a5a; font-weight: 500; }
.tk-row input[type="date"], .tk-row input[type="datetime-local"] {
  width: 220px; height: 38px; padding: 0 12px; border: 1px solid #dcdfe6; border-radius: 6px;
  font-size: 14px; font-family: inherit; color: #303133; outline: none; background: #fff;
}
.tk-row input:focus { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13, 148, 136, .12); }
.tk-link { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; }
.tk-link-text {
  flex: 1; min-width: 0; height: 38px; line-height: 36px; padding: 0 12px;
  border: 1px solid #e2e8ee; border-radius: 6px; background: #f7f9fb;
  font-size: 12.5px; color: #5b6b7b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.tk-copy {
  flex: none; height: 38px; padding: 0 16px; border: 1px solid #0d9488; border-radius: 6px;
  background: #fff; color: #0d9488; font-size: 13px; font-family: inherit; cursor: pointer;
}
.tk-copy:hover { background: #e6f7f5; }
.tk-ft { display: flex; justify-content: flex-end; gap: 12px; padding: 18px 24px 24px; }
.tk-btn {
  height: 40px; padding: 0 28px; border: 1px solid #dcdfe6; border-radius: 6px;
  background: #fff; color: #5b6b7b; font-size: 14px; cursor: pointer;
}
.tk-btn.primary {
  border-color: #0d9488; background: linear-gradient(180deg, #14b8a6, #0d9488);
  color: #fff; font-weight: 600; box-shadow: 0 4px 14px rgba(13, 148, 136, .3);
}
.tk-btn.primary:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
</style>
