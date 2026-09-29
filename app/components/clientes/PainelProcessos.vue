<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { navigateTo } from '#imports'
import DataTable, { type ColumnDef } from '~/components/DataTable.vue'
import { FASES_PROCESSUAIS, NATUREZAS_PROCESSO, STATUS_DEMANDA, type Processo } from '~~/shared/types/crm'
import { brl, dataCurta } from '~/utils/formatadores'

// Processos judiciais e procedimentos extrajudiciais de todas as demandas, num só lugar de acompanhamento.
const processos = ref<Processo[]>([])
const carregando = ref(false)
const busca = ref('')
const status = ref('ativo')
const natureza = ref<'' | 'judicial' | 'extrajudicial'>('')
const visao = ref<'lista' | 'kanban'>('lista')

async function carregar() {
  carregando.value = true
  try {
    processos.value = await $fetch<Processo[]>('/api/processos', { params: { search: busca.value || undefined, status: status.value || undefined, natureza: natureza.value || undefined } })
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)
let t: ReturnType<typeof setTimeout> | undefined
watch([busca, status, natureza], () => { clearTimeout(t); t = setTimeout(carregar, 300) })

const columns: ColumnDef[] = [
  { key: 'numero', label: 'Processo / procedimento' },
  { key: 'demanda', label: 'Demanda · Cliente' },
  { key: 'orgao', label: 'Órgão' },
  { key: 'fase', label: 'Fase' },
  { key: 'status', label: 'Status' },
]

// Kanban por fase (uma natureza por vez, porque as fases são diferentes).
const SEM_FASE = 'Sem fase definida'
// Judicial: fases processuais fixas (arrasta para mudar). Extrajudicial: a coluna é a ETAPA em andamento do procedimento
// (vem das etapas; muda ao concluir etapas na ficha, por isso não se arrasta).
const fases = computed(() => (natureza.value === 'extrajudicial' ? [...new Set(processos.value.map(p => p.fase).filter((f): f is string => !!f))] : [...FASES_PROCESSUAIS]))
const colunas = computed(() => [...fases.value, SEM_FASE].map(nome => ({ nome, itens: processos.value.filter(p => (p.fase || SEM_FASE) === nome) })).filter(c => c.itens.length || c.nome !== SEM_FASE))
const arrastando = ref<string | null>(null)
async function soltar(fase: string, e: DragEvent) {
  arrastando.value = null
  const id = Number(e.dataTransfer?.getData('text/plain'))
  const p = processos.value.find(x => x.id === id)
  if (!p || p.natureza !== 'judicial' || p.fase === fase) return
  const nova = fase === SEM_FASE ? null : fase
  p.fase = nova
  const url: string = `/api/processos/${id}`
  await $fetch(url, { method: 'PUT', body: { fase: nova } })
}
const abrir = (p: Processo) => navigateTo({ path: '/crm', query: { abrir: p.contato_id, ficha: 'demandas' } })
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-gray-500 max-w-2xl">Processos judiciais e procedimentos extrajudiciais (cartório, administrativo) em andamento. Cada um pertence a uma demanda; registre pela ficha do cliente. Serviços consultivos não aparecem aqui.</p>
    <div class="flex flex-wrap gap-2">
      <div class="inline-flex rounded-full border border-gray-200 dark:border-zinc-700 p-0.5">
        <button v-for="o in [{ v: '', n: 'Todos' }, { v: 'judicial', n: 'Judiciais' }, { v: 'extrajudicial', n: 'Extrajudiciais' }]" :key="o.v" type="button" class="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors" :class="natureza === o.v ? 'bg-primary text-white' : 'text-gray-500'" @click="natureza = o.v as any">{{ o.n }}</button>
      </div>
      <div v-if="natureza" class="inline-flex rounded-full border border-gray-200 dark:border-zinc-700 p-0.5">
        <button type="button" class="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider" :class="visao === 'lista' ? 'bg-primary text-white' : 'text-gray-500'" @click="visao = 'lista'">Lista</button>
        <button type="button" class="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider" :class="visao === 'kanban' ? 'bg-primary text-white' : 'text-gray-500'" @click="visao = 'kanban'">Por fase</button>
      </div>
      <input v-model="busca" type="search" class="flex-1 min-w-[220px] rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm" placeholder="Buscar por número, órgão ou cliente…" />
      <select v-model="status" class="rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm">
        <option value="">Todos</option>
        <option v-for="(n, k) in STATUS_DEMANDA" :key="k" :value="k">{{ n }}</option>
      </select>
    </div>

    <DataTable v-if="!natureza || visao === 'lista'" :columns="columns" :data="processos" :loading="carregando" :total="processos.length" :page-size="300" @row-click="abrir">
      <template #cell-numero="{ item }"><p class="font-mono text-xs">{{ item.numero || '—' }}</p><p class="text-xs text-gray-500">{{ NATUREZAS_PROCESSO[item.natureza as keyof typeof NATUREZAS_PROCESSO] }} · desde {{ dataCurta(item.data_inicio) }}</p></template>
      <template #cell-demanda="{ item }"><p class="font-semibold">{{ item.caso?.titulo }}</p><p class="text-xs text-gray-500">{{ item.contato?.nome }}</p></template>
      <template #cell-orgao="{ item }"><p class="text-xs">{{ [item.tribunal, item.orgao].filter(Boolean).join(' · ') || '—' }}</p><p class="text-xs text-gray-500">{{ item.comarca ? `${item.comarca}${item.uf ? '/' + item.uf : ''}` : '' }}</p></template>
      <template #cell-fase="{ item }"><p class="text-xs">{{ item.status === 'encerrado' && item.desfecho ? item.desfecho : (item.fase || '—') }}</p><p class="text-xs text-gray-500">{{ item.valor ? brl(item.valor) : '' }}</p></template>
      <template #cell-status="{ item }"><span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800">{{ STATUS_DEMANDA[item.status as keyof typeof STATUS_DEMANDA] }}</span></template>
    </DataTable>

    <div v-else class="flex gap-4 overflow-x-auto pb-4">
      <section v-for="col in colunas" :key="col.nome" class="w-72 shrink-0 rounded-3xl bg-gray-200/50 dark:bg-zinc-900/60 p-3 flex flex-col gap-2.5 min-h-[260px]" :class="{ 'ring-2 ring-secondary ring-inset': arrastando === col.nome }" @dragover.prevent="arrastando = col.nome" @dragleave="arrastando = null" @drop.prevent="soltar(col.nome, $event)">
        <header class="px-1.5 pt-1 flex items-baseline justify-between"><h3 class="font-serif text-lg text-primary dark:text-zinc-100">{{ col.nome }}</h3><span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 dark:bg-zinc-800">{{ col.itens.length }}</span></header>
        <article v-for="p in col.itens" :key="p.id" :draggable="p.natureza === 'judicial'" class="rounded-2xl bg-white dark:bg-zinc-800 p-3 cursor-grab shadow-sm hover:shadow-md transition-shadow space-y-1" @dragstart="$event.dataTransfer?.setData('text/plain', String(p.id))" @click="abrir(p)">
          <p class="font-semibold text-sm">{{ p.caso?.titulo }}</p>
          <p class="text-xs text-gray-500">{{ p.contato?.nome }}</p>
          <p v-if="p.numero" class="text-[10px] font-mono text-gray-400">{{ p.numero }}</p>
          <p v-if="p.valor" class="text-xs text-secondary-dark">{{ brl(p.valor) }}</p>
        </article>
      </section>
    </div>
  </div>
</template>
