<template>
  <div class="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
    <section
      v-for="col in colunas"
      :key="col.id"
      class="w-72 shrink-0 rounded-3xl bg-gray-200/50 dark:bg-zinc-900/60 p-3 flex flex-col gap-2.5 min-h-[260px] transition-shadow"
      :class="{ 'ring-2 ring-secondary ring-inset': arrastandoSobre === col.id }"
      @dragover.prevent="arrastandoSobre = col.id"
      @dragleave="arrastandoSobre = null"
      @drop.prevent="soltar(col.id, $event)"
    >
      <header class="px-1.5 pt-1">
        <div class="flex items-baseline justify-between">
          <h3 class="font-serif text-xl text-primary dark:text-zinc-100">{{ col.nome }}</h3>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 dark:bg-zinc-800">{{ col.itens.length }}</span>
        </div>
        <p class="eyebrow !text-[9px]">{{ col.hint }}</p>
      </header>
      <article
        v-for="c in col.itens"
        :key="c.id"
        draggable="true"
        class="rounded-2xl bg-white dark:bg-zinc-800 p-3 cursor-grab border-l-4 shadow-sm hover:shadow-md transition-shadow space-y-1.5"
        :class="borda(c)"
        @dragstart="$event.dataTransfer?.setData('text/plain', String(c.id))"
        @click="emit('abrir', c)"
      >
        <div class="flex items-center gap-2">
          <span class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" :class="corArea(c.area)">{{ iniciais(c) }}</span>
          <p class="font-bold text-sm truncate flex-1">{{ c.nome || telefoneFormatado(c.telefone) }}</p>
          <span v-if="c.urgencia === 'Alta'" class="w-2 h-2 rounded-full bg-danger shrink-0" title="Urgência alta" />
        </div>
        <span v-if="c.demanda || c.area" class="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full" :class="corAreaTag(c.area)">{{ c.demanda || c.area }}</span>
        <p class="text-xs" :class="textoProximo(c).classe">{{ textoProximo(c).texto }}</p>
        <div class="flex items-center justify-between pt-0.5">
          <span class="text-[10px] text-gray-400">há {{ dias(c) }} dia(s)</span>
          <span v-if="!c.ia_ativa" class="text-[10px] font-semibold uppercase tracking-wider text-warning-dark dark:text-warning-300">Aguardando você</span>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ETAPAS, type Contato } from '../../../shared/types/crm'
import { hojeISO } from '../../stores/crm'
import { dataCurta, telefoneFormatado } from '../../utils/formatadores'

const props = defineProps<{ contatos: Contato[]; mostrarEncerrados?: boolean }>()
const emit = defineEmits<{ abrir: [c: Contato]; mover: [c: Contato, etapa: string] }>()
const arrastandoSobre = ref<string | null>(null)

const colunas = computed(() =>
  ETAPAS.filter(e => e.aberta || props.mostrarEncerrados).map(e => ({
    ...e,
    itens: props.contatos
      .filter(c => c.etapa === e.id)
      .sort((a, b) => (a.proxima_data || '9').localeCompare(b.proxima_data || '9')),
  })),
)

const status = (c: Contato) => {
  if (!ETAPAS.find(e => e.id === c.etapa)?.aberta) return 'fechado'
  if (!c.proxima_acao || !c.proxima_data) return 'sem'
  return c.proxima_data < hojeISO() ? 'atrasado' : 'ok'
}
const borda = (c: Contato) => ({ atrasado: 'border-danger', sem: 'border-warning', ok: 'border-secondary', fechado: 'border-gray-300' }[status(c)])
const textoProximo = (c: Contato) => {
  const s = status(c)
  if (s === 'fechado') return { texto: c.motivo_perda ? `Motivo: ${c.motivo_perda}` : '', classe: 'text-gray-500' }
  if (s === 'sem') return { texto: 'Sem próxima ação', classe: 'text-warning-dark dark:text-warning-300 font-semibold' }
  return { texto: `${dataCurta(c.proxima_data)} · ${c.proxima_acao}`, classe: s === 'atrasado' ? 'text-danger font-semibold' : 'text-gray-500' }
}

const dias = (c: Contato) => Math.max(0, Math.floor((Date.now() - new Date(c.etapa_desde).getTime()) / 864e5))

const iniciais = (c: Contato) => (c.nome || telefoneFormatado(c.telefone) || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
// Classes estáticas (Tailwind precisa ver a string completa).
const CORES_AREA: Record<string, string> = {
  'Direito de Família': 'bg-secondary/20 text-secondary-dark',
  'Sucessões': 'bg-primary/15 text-primary',
  'Planejamento Matrimonial': 'bg-success/15 text-success-dark',
  'Consultoria Jurídica': 'bg-info/15 text-info-dark',
}
const CORES_AREA_TAG: Record<string, string> = {
  'Direito de Família': 'bg-secondary/15 text-secondary-dark',
  'Sucessões': 'bg-primary/10 text-primary',
  'Planejamento Matrimonial': 'bg-success/10 text-success-dark',
  'Consultoria Jurídica': 'bg-info/10 text-info-dark',
}
const corArea = (area: string | null) => CORES_AREA[area ?? ''] ?? 'bg-gray-200 text-gray-500'
const corAreaTag = (area: string | null) => CORES_AREA_TAG[area ?? ''] ?? 'bg-gray-100 text-gray-500'

function soltar(etapaId: string, e: DragEvent) {
  arrastandoSobre.value = null
  const c = props.contatos.find(x => x.id === Number(e.dataTransfer?.getData('text/plain')))
  if (c && c.etapa !== etapaId) emit('mover', c, etapaId)
}
</script>
