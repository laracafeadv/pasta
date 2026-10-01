<template>
  <div 
    :class="[
      'px-6 py-4 rounded-lg transition-all duration-300 backdrop-blur-xl border-l-[6px] shadow-lg relative overflow-hidden group',
      bgClass, borderClass
    ]" 
    role="alert"
  >
    <!-- Background Glow Pulse -->
    <div class="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none pulse shadow-glow-white/10"></div>
    
    <div class="relative z-10 flex gap-5 items-center">
      <div 
        :class="[
          'flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center text-xl shadow-inner',
          iconBgClass
        ]"
      >
        <span>{{ icon }}</span>
      </div>
      <div class="flex-1">
        <h3 v-if="title" class="font-black text-xs uppercase tracking-[0.2em] mb-1 opacity-80" :class="titleColorClass">{{ title }}</h3>
        <p class="text-sm font-medium leading-relaxed" :class="textColorClass">
          <slot></slot>
        </p>
      </div>
      <button 
        @click="$emit('close')" 
        class="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-xl opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90"
        :class="textColorClass"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  type?: 'success' | 'danger' | 'warning' | 'info'
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info'
})

defineEmits<{
  close: []
}>()

const bgClass = computed(() => {
  const types: Record<string, string> = {
    success: 'bg-success/10 dark:bg-success/20',
    danger: 'bg-danger/10 dark:bg-danger/20',
    warning: 'bg-warning/10 dark:bg-warning/20',
    info: 'bg-info/10 dark:bg-info/20'
  }
  return types[props.type]
})

const textColorClass = computed(() => {
  const types: Record<string, string> = {
    success: 'text-success-800 dark:text-success-200',
    danger: 'text-danger-800 dark:text-danger-200',
    warning: 'text-warning-900 dark:text-warning-200',
    info: 'text-info-800 dark:text-info-200'
  }
  return types[props.type]
})

const titleColorClass = computed(() => {
  const types: Record<string, string> = {
    success: 'text-success-900 dark:text-success-100',
    danger: 'text-danger-900 dark:text-danger-100',
    warning: 'text-warning-950 dark:text-warning-50',
    info: 'text-info-900 dark:text-info-100'
  }
  return types[props.type]
})

const borderClass = computed(() => {
  const types: Record<string, string> = {
    success: 'border-success/60 dark:border-success/40',
    danger: 'border-danger/60 dark:border-danger/40',
    warning: 'border-warning/60 dark:border-warning/40',
    info: 'border-info/60 dark:border-info/40'
  }
  return types[props.type]
})

const iconBgClass = computed(() => {
  const types: Record<string, string> = {
    success: 'bg-success/20 dark:bg-success/30 text-success-700 dark:text-success-300',
    danger: 'bg-danger/20 dark:bg-danger/30 text-danger-700 dark:text-danger-300',
    warning: 'bg-warning/20 dark:bg-warning/30 text-warning-800 dark:text-warning-300',
    info: 'bg-info/20 dark:bg-info/30 text-info-700 dark:text-info-300'
  }
  return types[props.type]
})

const icon = computed(() => {
  const icons: Record<string, string> = {
    success: '✓',
    danger: '✕',
    warning: '⚠',
    info: 'ℹ'
  }
  return icons[props.type]
})
</script>
