<template>
  <span
    :class="[
      'px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider inline-block transition-all duration-300 transform hover:scale-105 select-none border whitespace-nowrap',
      colorClasses
    ]"
  >
    <slot></slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary'
})

const colorClasses = computed(() => {
  const variants: Record<string, string> = {
    primary: 'bg-primary/10 border-primary/20 text-primary-700 dark:text-primary-200 shadow-sm dark:shadow-glow-primary/20',
    secondary: 'bg-secondary/10 border-secondary/20 text-secondary-700 dark:text-secondary-200 shadow-sm dark:shadow-glow-secondary/20',
    success: 'bg-success/10 border-success/20 text-success-700 dark:text-success-200 shadow-sm dark:shadow-glow-success/20',
    danger: 'bg-danger/10 border-danger/20 text-danger-700 dark:text-danger-200',
    warning: 'bg-warning/10 border-warning/20 text-warning-800 dark:text-warning-200',
    info: 'bg-info/10 border-info/20 text-info-700 dark:text-info-200'
  }
  return variants[props.variant]
})
</script>
