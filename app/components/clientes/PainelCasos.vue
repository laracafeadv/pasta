<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { navigateTo } from '#imports'
import DataTable, { type ColumnDef } from '~/components/DataTable.vue'
import { FASES_PROCESSUAIS, STATUS_CASO, TIPOS_CASO, type Caso } from '~~/shared/types/crm'
import { brl, dataCurta } from '~/utils/formatadores'

const casos = ref<Caso[]>([])
const carregando = ref(false)
const busca = ref('')
const status = ref('ativo')
const visao = ref<'lista' | 'kanban'>('lista')

async function carregar() {
  carregando.value = true
  try {
    casos.value = await $fetch<Caso[]>('/api/casos', { params: { tipo: 'judicial', search: busca.value || undefined, status: status.value || undefined } })
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)
let t: ReturnType<typeof setTimeout> | undefined
watch([busca, status], () => { clearTimeout(t); t = setTimeout(carregar, 300) })

const columns: ColumnDef[] = [
  { key: 'titulo', label: 'Processo' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'processo', label: 'Processo / órgão' },
  { key: 'fase', label: 'Fase / valor da causa' },
  { key: 'status', label: 'Status' },
]

// ─── Kanban por fase processual ──────────────────────────────────────────────
const SEM_FASE = 'Sem fase definida'
const colunasKanban = computed(() => {
  const nomes = [...FASES_PROCESSUAIS, SEM_FASE]
  return nomes.map(nome => ({
    nome,
    itens: casos.value.filter(c => (c.fase_processual || SEM_FASE) === nome),
  })).filter(col => col.itens.length || col.nome !== SEM_FASE)
})
const arrastandoSobre = ref<string | null>(null)
async function soltar(fase: string, e: DragEvent) {
  arrastandoSobre.value = null
  const id = Number(e.dataTransfer?.getData('text/plain'))
  const c = casos.value.find(x => x.id === id)
  if (!c || c.fase_processual === fase) return
  const novaFase = fase === SEM_FASE ? null : fase
  c.fase_processual = novaFase
  await $fetch(`/api/casos/${id}`, { method: 'PUT', body: { fase_processual: novaFase } })
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="text-sm text-gray-500 mt-2">Só as demandas com processo judicial: número, fase e valor da causa. Serviços consultivos e de cartório ficam na lista de Clientes e na ficha de cada um.</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <div class="inline-flex rounded-full border border-gray-200 dark:border-zinc-700 p-0.5">
        <button type="button" class="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors" :class="visao === 'lista' ? 'bg-primary text-white' : 'text-gray-500'" @click="visao = 'lista'">Lista</button>
        <button type="button" class="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors" :class="visao === 'kanban' ? 'bg-primary text-white' : 'text-gray-500'" @click="visao = 'kanban'">Kanban</button>
      </div>
      <input v-model="busca" type="search" class="flex-1 min-w-[240px] rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm" placeholder="Buscar por título, processo ou parte contrária…" />
      <select v-model="status" class="rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm">
        <option value="">Todos</option>
        <option v-for="(n, k) in STATUS_CASO" :key="k" :value="k">{{ n }}</option>
      </select>
    </div>

    <DataTable v-if="visao === 'lista'" :columns="columns" :data="casos" :loading="carregando" :total="casos.length" :page-size="300" @row-click="(k: Caso) => navigateTo({ path: '/crm', query: { abrir: k.contato_id, ficha: 'casos' } })">
      <template #cell-titulo="{ item }"><p class="font-semibold">{{ item.titulo }}</p><p class="text-xs text-gray-500">{{ TIPOS_CASO[item.tipo] }} · desde {{ dataCurta(item.data_abertura) }}</p></template>
      <template #cell-cliente="{ item }">{{ item.contato?.nome }}</template>
      <template #cell-processo="{ item }"><p class="font-mono text-xs">{{ item.numero_processo || '—' }}</p><p class="text-xs text-gray-500">{{ [item.orgao, item.comarca && `${item.comarca}/${item.uf}`].filter(Boolean).join(' · ') }}</p></template>
      <template #cell-fase="{ item }"><p class="text-xs">{{ item.fase_processual || '—' }}</p><p class="text-xs text-gray-500">{{ item.valor_causa ? brl(item.valor_causa) : '' }}</p></template>
      <template #cell-status="{ item }"><span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800">{{ STATUS_CASO[item.status] }}</span></template>
    </DataTable>

    <div v-else class="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      <section
        v-for="col in colunasKanban" :key="col.nome"
        class="w-72 shrink-0 rounded-3xl bg-gray-200/50 dark:bg-zinc-900/60 p-3 flex flex-col gap-2.5 min-h-[260px] transition-shadow"
        :class="{ 'ring-2 ring-secondary ring-inset': arrastandoSobre === col.nome }"
        @dragover.prevent="arrastandoSobre = col.nome"
        @dragleave="arrastandoSobre = null"
        @drop.prevent="soltar(col.nome, $event)"
      >
        <header class="px-1.5 pt-1 flex items-baseline justify-between">
          <h3 class="font-serif text-lg text-primary dark:text-zinc-100">{{ col.nome }}</h3>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 dark:bg-zinc-800">{{ col.itens.length }}</span>
        </header>
        <article
          v-for="c in col.itens" :key="c.id"
          draggable="true"
          class="rounded-2xl bg-white dark:bg-zinc-800 p-3 cursor-grab shadow-sm hover:shadow-md transition-shadow space-y-1"
          @dragstart="$event.dataTransfer?.setData('text/plain', String(c.id))"
          @click="navigateTo({ path: '/crm', query: { abrir: c.contato_id, ficha: 'casos' } })"
        >
          <p class="font-semibold text-sm">{{ c.titulo }}</p>
          <p class="text-xs text-gray-500">{{ c.contato?.nome }}</p>
          <p v-if="c.numero_processo" class="text-[10px] font-mono text-gray-400">{{ c.numero_processo }}</p>
          <p v-if="c.valor_causa" class="text-xs text-secondary-dark">{{ brl(c.valor_causa) }}</p>
        </article>
      </section>
    </div>
  </div>
</template>
