<template>
  <button
    v-bind="$attrs"
    :class="[
      'rounded-full font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2',
      variantClasses,
      sizeClasses,
    ]"
    :disabled="disabled || loading"
  >
    <template v-if="loading">
      <svg class="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
    </template>
    <template v-else>
      <Icon v-if="icon" :name="icon" class="text-lg opacity-90" />
      <slot></slot>
    </template>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  icon: ''
})

const variantClasses = computed(() => {
  const variants: Record<string, string> = {
    primary: 'bg-primary text-white hover:bg-primary/90 shadow-sm',
    secondary: 'bg-secondary text-white hover:bg-secondary/90 shadow-sm',
    success: 'bg-success text-white hover:bg-success/90 shadow-sm',
    danger: 'bg-danger text-white hover:bg-danger/90 shadow-sm',
    warning: 'bg-warning text-black hover:bg-warning/90 shadow-sm',
    info: 'bg-info text-white hover:bg-info/90 shadow-sm',
    outline: 'border border-primary/40 dark:border-zinc-600 bg-transparent text-primary dark:text-zinc-200 hover:bg-primary hover:text-white dark:hover:bg-zinc-800'
  }
  return variants[props.variant]
})

const sizeClasses = computed(() => {
  const sizes: Record<string, string> = {
    sm: 'px-4 py-1.5 text-[11px]',
    md: 'px-5 py-2.5 text-xs',
    lg: 'px-7 py-3 text-sm'
  }
  return sizes[props.size]
})
</script>
