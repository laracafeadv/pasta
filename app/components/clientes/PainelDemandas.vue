<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref, watch } from 'vue'
import DataTable, { type ColumnDef } from '~/components/DataTable.vue'
import { STATUS_CASO, TIPOS_CASO, type Caso } from '~~/shared/types/crm'
import { PROCEDIMENTOS } from '~~/shared/data/checklist'
import { dataCurta } from '~/utils/formatadores'
const ContatoDetailModal = defineAsyncComponent(() => import('~/components/crm/ContatoDetailModal.vue'))

// Todas as demandas (serviços contratados) do escritório, de qualquer cliente e de qualquer atuação.
const demandas = ref<Caso[]>([])
const carregando = ref(false)
const busca = ref('')
const status = ref('ativo')
const atuacao = ref('')
async function carregar() {
  carregando.value = true
  try {
    demandas.value = await $fetch<Caso[]>('/api/casos', { params: { search: busca.value || undefined, status: status.value || undefined, tipo: atuacao.value || undefined } })
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)
let t: ReturnType<typeof setTimeout> | undefined
watch([busca, status, atuacao], () => { clearTimeout(t); t = setTimeout(carregar, 300) })

const columns: ColumnDef[] = [
  { key: 'titulo', label: 'Demanda' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'atuacao', label: 'Atuação' },
  { key: 'processos', label: 'Processos / procedimentos' },
  { key: 'status', label: 'Status' },
]
const detalheId = ref<number | null>(null)
const detalheAberto = ref(false)
function abrir(k: Caso) { detalheId.value = k.contato_id; detalheAberto.value = true }
const rotuloProcedimento = (v?: string | null) => PROCEDIMENTOS.find(p => p.valor === v)?.rotulo
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-gray-500 max-w-2xl">O que cada cliente contratou: consultas, instrumentos, procedimentos extrajudiciais e processos judiciais. Abra a demanda pela ficha do cliente; aqui você acompanha todas juntas.</p>
    <div class="flex flex-wrap gap-2">
      <input v-model="busca" type="search" class="flex-1 min-w-[240px] rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm" placeholder="Buscar por demanda, número do processo ou parte…" />
      <select v-model="atuacao" class="rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm"><option value="">Toda atuação</option><option v-for="(n, k) in TIPOS_CASO" :key="k" :value="k">{{ n }}</option></select>
      <select v-model="status" class="rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm"><option value="">Todos os status</option><option v-for="(n, k) in STATUS_CASO" :key="k" :value="k">{{ n }}</option></select>
    </div>
    <DataTable :columns="columns" :data="demandas" :loading="carregando" :total="demandas.length" :page-size="300" @row-click="abrir">
      <template #cell-titulo="{ item }"><p class="font-semibold">{{ item.titulo }}</p><p class="text-xs text-gray-500">{{ rotuloProcedimento(item.procedimento) || item.area || '—' }} · desde {{ dataCurta(item.data_abertura) }}</p></template>
      <template #cell-cliente="{ item }">{{ item.contato?.nome }}</template>
      <template #cell-atuacao="{ item }"><span class="text-xs">{{ TIPOS_CASO[item.tipo as keyof typeof TIPOS_CASO] }}</span></template>
      <template #cell-processos="{ item }">
        <p v-if="!item.processos?.length" class="text-xs text-gray-400">Sem processo</p>
        <p v-for="p in item.processos" :key="p.id" class="text-xs"><span class="font-mono">{{ p.numero || (p.natureza === 'judicial' ? 'sem número' : 'procedimento') }}</span><span v-if="p.fase" class="text-gray-500"> · {{ p.fase }}</span></p>
      </template>
      <template #cell-status="{ item }"><span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800">{{ STATUS_CASO[item.status as keyof typeof STATUS_CASO] }}</span></template>
    </DataTable>
    <ContatoDetailModal :is-open="detalheAberto" :contato-id="detalheId" aba-inicial="processo" @close="detalheAberto = false; carregar()" />
  </div>
</template>
