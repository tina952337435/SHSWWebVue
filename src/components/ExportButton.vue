<template>
  <button class="btn-exp" type="button" @click="$emit('export')">
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M8 2.5v6.5M4.8 6.4L8 9.6l3.2-3.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M3 11.2v1.1c0 .9.7 1.7 1.6 1.7h6.8c.9 0 1.6-.8 1.6-1.7v-1.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
    <span>导出</span>
  </button>
</template>

<script setup>
defineEmits(['export'])
</script>
