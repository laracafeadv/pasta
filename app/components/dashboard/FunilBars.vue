<template>
  <ul class="space-y-2">
    <li v-for="e in etapas" :key="e.id">
      <button type="button" class="group w-full text-left" :disabled="!e.total" @click="emit('abrir', e.id)">
        <span class="flex items-baseline justify-between text-xs mb-1">
          <span class="text-gray-600 dark:text-zinc-300 group-hover:text-primary">{{ e.nome }}</span>
          <span class="font-bold tabular-nums" :class="e.total ? 'text-primary dark:text-zinc-100' : 'text-gray-300 dark:text-zinc-600'">{{ e.total }}</span>
        </span>
        <span class="block h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
          <span class="block h-full rounded-full transition-[width] duration-500" :class="e.id === 'ativo' ? 'bg-primary' : 'bg-secondary'" :style="{ width: `${e.total ? Math.max(6, (e.total / max) * 100) : 0}%` }" />
        </span>
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ etapas: { id: string; nome: string; total: number }[] }>()
const emit = defineEmits<{ abrir: [etapa: string] }>()
const max = computed(() => Math.max(1, ...props.etapas.map(e => e.total)))
</script>
