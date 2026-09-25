<template>
  <div 
    class="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-white/10 shadow-sm self-start"
    :class="containerClass"
  >
    <button
      v-for="tab in tabs"
      :key="tab.value"
      @click="$emit('update:modelValue', tab.value)"
      :class="[
        'px-6 py-2.5 text-sm font-bold transition-all duration-300 rounded-md whitespace-nowrap flex items-center gap-2',
        modelValue === tab.value 
          ? 'bg-primary/10 text-primary shadow-sm' 
          : 'text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-slate-50 dark:hover:bg-slate-800'
      ]"
    >
      <Icon v-if="tab.icon" :name="tab.icon" class="w-4 h-4" />
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
interface Tab {
  label: string
  value: string
  icon?: string
}

defineProps<{
  tabs: Tab[]
  modelValue: string
  containerClass?: string
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>
