<template>
  <div class="flex items-end gap-2 h-24" role="img" aria-label="Recebido por mês, últimos 6 meses">
    <div v-for="m in barras" :key="m.mes" class="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1" :title="`${m.rotulo}: ${brl(m.recebido)}`">
      <span class="w-full rounded-md" :class="m.atual ? 'bg-primary' : 'bg-primary/30 dark:bg-zinc-500'" :style="{ height: `${m.recebido ? Math.max(6, (m.recebido / max) * 100) : 0}%` }" />
      <span class="text-[10px] leading-none" :class="m.atual ? 'font-bold text-primary dark:text-zinc-100' : 'text-gray-400'">{{ m.rotulo }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { brl } from '../../utils/formatadores'

const props = defineProps<{ meses: { mes: string; recebido: number }[] }>()
const barras = computed(() => props.meses.map((m, i) => ({
  ...m,
  atual: i === props.meses.length - 1,
  rotulo: new Date(`${m.mes}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
})))
const max = computed(() => Math.max(1, ...props.meses.map(m => m.recebido)))
</script>
