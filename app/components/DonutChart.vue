<template>
  <div class="flex flex-col sm:flex-row items-center gap-6">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="shrink-0">
      <circle :cx="size / 2" :cy="size / 2" :r="raio" fill="none" stroke="currentColor" class="text-gray-100 dark:text-zinc-800" :stroke-width="espessura" />
      <circle
        v-for="seg in segmentos" :key="seg.chave"
        :cx="size / 2" :cy="size / 2" :r="raio" fill="none"
        :stroke="seg.corHex" :stroke-width="espessura"
        :stroke-dasharray="`${seg.comprimento} ${circunferencia - seg.comprimento}`"
        :stroke-dashoffset="-seg.offset"
        stroke-linecap="butt"
        transform="rotate(-90)" :transform-origin="`${size / 2} ${size / 2}`"
      />
      <text :x="size / 2" :y="size / 2 - 6" text-anchor="middle" class="fill-primary dark:fill-zinc-100" font-size="22" font-weight="700">{{ total }}</text>
      <text :x="size / 2" :y="size / 2 + 14" text-anchor="middle" class="fill-gray-400" font-size="10" font-weight="600">total</text>
    </svg>

    <ul class="space-y-2 w-full">
      <li v-for="seg in segmentos" :key="seg.chave" class="flex items-center gap-2.5 text-sm">
        <span class="w-3 h-3 rounded-full shrink-0" :style="{ background: seg.corHex }" />
        <span class="text-primary dark:text-zinc-100 font-medium flex-1 min-w-0 truncate">{{ seg.chave }}</span>
        <span class="text-gray-500 dark:text-zinc-400">{{ seg.total }}</span>
        <span class="text-xs text-gray-400 w-10 text-right">{{ seg.percentual }}%</span>
      </li>
      <li v-if="!segmentos.length" class="text-sm text-gray-400">Sem dados no período.</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Item { chave: string; total: number; cor?: string }

const props = withDefaults(defineProps<{ dados: Item[]; size?: number; espessura?: number }>(), {
  size: 140,
  espessura: 20,
})

const CORES: Record<string, string> = {
  primary: '#3c2923',
  secondary: '#8b6f47',
  success: '#2e7d5b',
  warning: '#b8860b',
  danger: '#b3413c',
  neutral: '#9ca3af',
}
const PALETA = ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral']

const raio = computed(() => props.size / 2 - props.espessura / 2)
const circunferencia = computed(() => 2 * Math.PI * raio.value)
const total = computed(() => props.dados.reduce((a, d) => a + d.total, 0))

const segmentos = computed(() => {
  let acumulado = 0
  return props.dados.filter(d => d.total > 0).map((d, i) => {
    const comprimento = total.value ? (d.total / total.value) * circunferencia.value : 0
    const seg = {
      chave: d.chave,
      total: d.total,
      percentual: total.value ? Math.round((d.total / total.value) * 100) : 0,
      corHex: CORES[d.cor ?? PALETA[i % PALETA.length]!] ?? CORES.primary,
      comprimento,
      offset: acumulado,
    }
    acumulado += comprimento
    return seg
  })
})
</script>
