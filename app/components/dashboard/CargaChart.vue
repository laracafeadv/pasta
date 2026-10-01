<template>
  <div>
    <div class="flex items-end gap-1 sm:gap-1.5 h-32" role="img" :aria-label="`Carga dos próximos 14 dias: ${totalGeral} itens`">
      <div v-for="c in colunas" :key="c.chave" class="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1" :class="c.atrasado ? 'mr-1.5 sm:mr-3' : ''" :title="c.titulo">
        <div class="w-full flex flex-col-reverse rounded-md overflow-hidden" :class="c.total ? 'min-h-[4px]' : ''" :style="{ height: `${c.total ? Math.max(6, (c.total / max) * 100) : 0}%` }">
          <span v-if="c.prazos" class="block" :class="c.atrasado ? 'bg-danger' : 'bg-primary'" :style="{ flexGrow: c.prazos }" />
          <span v-if="c.compromissos" class="block" :class="c.atrasado ? 'bg-danger/70' : 'bg-secondary'" :style="{ flexGrow: c.compromissos }" />
          <span v-if="c.tarefas" class="block" :class="c.atrasado ? 'bg-danger/40' : 'bg-primary/30 dark:bg-zinc-500'" :style="{ flexGrow: c.tarefas }" />
        </div>
        <span class="text-[9px] sm:text-[10px] leading-none whitespace-nowrap" :class="c.hoje ? 'font-bold text-primary dark:text-zinc-100' : c.atrasado ? 'font-semibold text-danger' : 'text-gray-400'">{{ c.rotulo }}</span>
      </div>
    </div>
    <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
      <span class="inline-flex items-center gap-1.5"><i class="w-2.5 h-2.5 rounded-sm bg-primary" /> Prazos</span>
      <span class="inline-flex items-center gap-1.5"><i class="w-2.5 h-2.5 rounded-sm bg-secondary" /> Compromissos</span>
      <span class="inline-flex items-center gap-1.5"><i class="w-2.5 h-2.5 rounded-sm bg-primary/30 dark:bg-zinc-500" /> Tarefas</span>
      <span class="inline-flex items-center gap-1.5"><i class="w-2.5 h-2.5 rounded-sm bg-danger" /> Já atrasado</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DashboardData } from '../../../shared/types/dashboard'

const props = defineProps<{ carga: DashboardData['carga'] }>()

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const colunas = computed(() => {
  const lista = [
    { chave: 'atraso', rotulo: '!', titulo: '', atrasado: true, hoje: false, ...props.carga.atrasado },
    ...props.carga.dias.map((d, i) => {
      const dt = new Date(`${d.dia}T12:00:00`)
      return { chave: d.dia, rotulo: i === 0 ? 'hoje' : String(dt.getDate()), titulo: '', atrasado: false, hoje: i === 0, semana: SEMANA[dt.getDay()], ...d }
    }),
  ]
  return lista.map((c) => {
    const total = c.prazos + c.compromissos + c.tarefas
    const partes = [c.prazos && `${c.prazos} prazo(s)`, c.compromissos && `${c.compromissos} compromisso(s)`, c.tarefas && `${c.tarefas} tarefa(s)`].filter(Boolean).join(', ')
    const nome = c.atrasado ? 'Em atraso' : `${(c as any).semana ?? ''} ${(c as any).dia?.split('-').reverse().slice(0, 2).join('/')}`.trim()
    return { ...c, total, titulo: `${nome}: ${partes || 'nada'}` }
  })
})
const max = computed(() => Math.max(1, ...colunas.value.map(c => c.total)))
const totalGeral = computed(() => colunas.value.reduce((a, c) => a + c.total, 0))
</script>
