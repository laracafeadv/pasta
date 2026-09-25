<template>
  <div 
    :class="[
      'rounded-lg p-6 transition-all duration-500 relative overflow-hidden group',
      'border border-black/5 dark:border-white/10 backdrop-blur-xl',
      colorClasses
    ]"
  >
    <!-- Subtle Gradient Overlay -->
    <div class="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
    <div class="relative z-10">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type CardVariant = 'glass' | 'primary' | 'secondary' | 'dark' | 'light'

interface Props {
  variant?: CardVariant
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'glass'
})

const colorClasses = computed(() => {
  const variants: Record<CardVariant, string> = {
    glass: 'bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/20',
    primary: 'bg-primary/10 border-primary/20 hover:border-primary/40 shadow-glow-primary/10',
    secondary: 'bg-secondary/10 border-secondary/20 hover:border-secondary/40 shadow-glow-secondary/10',
    dark: 'bg-slate-950/40 border-white/5',
    light: 'bg-white dark:bg-slate-900 shadow-sm dark:shadow-dark-md border-slate-200 dark:border-white/10 hover:shadow-md dark:hover:shadow-glow-primary/5 transition-all duration-500'
  }
  return variants[props.variant]
})
</script>
