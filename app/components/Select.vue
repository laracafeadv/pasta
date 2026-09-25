<template>
  <div class="relative group" :class="containerClass">
    <select
      v-model="internalValue"
      class="appearance-none w-full bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm font-medium rounded-md px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 cursor-pointer backdrop-blur-md transition-all hover:bg-slate-50 dark:hover:bg-slate-800/80"
    >
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <div
      class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400"
    >
      <Icon name="ph:caret-down-bold" class="w-4 h-4" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
interface Option {
  label: string
  value: any
}

const props = defineProps<{
  options: Option[]
  modelValue: any
  containerClass?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const internalValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>
