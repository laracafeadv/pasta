<template>
  <div 
    class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-white/10 p-5 flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden"
  >
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-2">
         <div v-if="icon" class="w-8 h-8 rounded-md flex items-center justify-center shrink-0" :class="iconBgClass">
           <Icon :name="icon" class="text-lg" :class="iconTextClass" />
         </div>
         <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">{{ title }}</p>
      </div>
      
      <span v-if="badge" class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md" :class="badgeClass">
        {{ badge }}
      </span>
      <slot name="top-right" />
    </div>

    <div v-if="loading" class="mt-2 space-y-1.5">
      <div class="h-8 w-28 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
      <div v-if="subValue" class="h-3 w-32 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
    </div>
    
    <div v-else class="mt-2">
      <div class="flex items-baseline gap-2">
         <!-- Use slot for the main value if provided, else use the prop -->
         <slot name="value">
            <p class="text-2xl font-black text-slate-900 dark:text-white" :class="valueClass">{{ value }}</p>
         </slot>
         
         <slot name="sub-value">
            <p v-if="subValue" class="text-xs font-semibold" :class="subValueClass">{{ subValue }}</p>
         </slot>
      </div>
      <!-- Optional secondary description slot -->
      <slot name="description" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type KpiColor = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface Props {
  title: string
  value?: string | number
  subValue?: string
  icon?: string
  color?: KpiColor
  badge?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  color: 'neutral',
  loading: false
})

// Visual mapping for the icon
const iconCssMap: Record<KpiColor, { bg: string, text: string }> = {
  primary: { bg: 'bg-primary/10 dark:bg-primary/20', text: 'text-primary dark:text-primary-400' },
  success: { bg: 'bg-success/10 dark:bg-success/20', text: 'text-success dark:text-success-400' },
  warning: { bg: 'bg-warning/10 dark:bg-warning/20', text: 'text-warning dark:text-warning-400' },
  danger:  { bg: 'bg-danger/10 dark:bg-danger/20',   text: 'text-danger dark:text-danger-400' },
  info:    { bg: 'bg-info/10 dark:bg-info/20',       text: 'text-info dark:text-info-400' },
  neutral: { bg: 'bg-slate-100 dark:bg-slate-800',   text: 'text-slate-500 dark:text-slate-400' }
}

const iconBgClass = computed(() => iconCssMap[props.color].bg)
const iconTextClass = computed(() => iconCssMap[props.color].text)

// The badge inherits the same color family
const badgeClass = computed(() => iconCssMap[props.color].bg + ' ' + iconCssMap[props.color].text)

// The value specific coloring (mostly neutral unless specifically customized via slots or if we want colored text)
const valueClass = computed(() => {
  if (props.color === 'primary') return 'text-primary dark:text-primary-400'
  return 'text-slate-900 dark:text-white'
})

const subValueClass = computed(() => {
  if (props.color === 'primary') return 'text-primary/70 dark:text-primary-400/70'
  return 'text-slate-500 dark:text-slate-400'
})
</script>
