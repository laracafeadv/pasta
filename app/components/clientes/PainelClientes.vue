<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref, watch } from 'vue'
import Button from '~/components/Button.vue'
import DataTable, { type ColumnDef } from '~/components/DataTable.vue'
const ContatoFormModal = defineAsyncComponent(() => import('~/components/crm/ContatoFormModal.vue'))
const ContatoDetailModal = defineAsyncComponent(() => import('~/components/crm/ContatoDetailModal.vue'))
const AndamentoModal = defineAsyncComponent(() => import('~/components/crm/AndamentoModal.vue'))
import { useCrmStore, type AndamentoPayload } from '~/stores/crm'
import { etapa, type Contato, type ContatoInput } from '~~/shared/types/crm'
import { dataCurta, telefoneFormatado } from '~/utils/formatadores'

// Clientes: quem já fechou contrato (etapa ativo ou concluído). Perfil completo — casos,
// documentos, financeiro, histórico — fica na ficha (mesmo modal usado em Leads).
type ClienteComDemandas = Contato & { demandas?: { id: number; titulo: string; tipo: string; status: string }[] }
const clientes = ref<ClienteComDemandas[]>([])
const carregando = ref(false)
const busca = ref('')
let debounce: ReturnType<typeof setTimeout> | undefined
async function carregar() {
  carregando.value = true
  try {
    const r = await $fetch<{ records: ClienteComDemandas[] }>('/api/crm/contatos', { params: { clientes: '1', demandas: '1', pageSize: '200', search: busca.value || undefined } })
    clientes.value = r.records
  } finally {
    carregando.value = false
  }
}
watch(busca, () => {
  clearTimeout(debounce)
  debounce = setTimeout(carregar, 300)
})
onMounted(carregar)

const columns: ColumnDef[] = [
  { key: 'nome', label: 'Cliente' },
  { key: 'caso', label: 'Demandas' },
  { key: 'situacao', label: 'Situação' },
  { key: 'cliente_desde', label: 'Cliente desde' },
]

const crm = useCrmStore()
const formAberto = ref(false)
const emEdicao = ref<Contato | null>(null)
function editar(c: Contato) { emEdicao.value = c; formAberto.value = true }
async function salvar(data: ContatoInput) {
  try {
    await crm.salvar(emEdicao.value?.id ?? null, data)
    formAberto.value = false
    if (detalheAberto.value) detalhe.value?.recarregar()
    await carregar()
  } catch (e: any) {
    alert(e?.data?.message || 'Não foi possível salvar.')
  }
}

const detalhe = ref<{ recarregar: () => void } | null>(null)
const detalheAberto = ref(false)
const detalheId = ref<number | null>(null)
function abrir(c: Contato) { detalheId.value = c.id; detalheAberto.value = true }

const andamentoAberto = ref(false)
const andamentoContato = ref<Contato | null>(null)
function andamento(c: Contato) {
  andamentoContato.value = c
  crm.error = null
  andamentoAberto.value = true
}
async function concluirAndamento(data: AndamentoPayload) {
  if (!andamentoContato.value) return
  try {
    await crm.registrarAndamento(andamentoContato.value.id, data)
    andamentoAberto.value = false
    if (detalheAberto.value) detalhe.value?.recarregar()
    await carregar()
  } catch { /* mensagem exibida no modal via crm.error */ }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm text-gray-500 mt-2 max-w-2xl">Quem já fechou contrato, com o que contratou. A busca acha pelo nome, telefone, e-mail, título da demanda, número do processo ou outra parte. Clique para abrir a ficha.</p>
      </div>
      <Button icon="ph:plus-bold" @click="() => { emEdicao = null; formAberto = true }">Novo cliente</Button>
    </div>

    <input v-model="busca" type="search" class="w-full max-w-md rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm" placeholder="Buscar por nome, telefone, demanda ou processo…" />

    <DataTable :columns="columns" :data="clientes" :loading="carregando" :total="clientes.length" :page-size="200" @row-click="abrir">
      <template #cell-nome="{ item }">
        <p class="font-semibold">{{ item.nome || 'Sem nome' }}</p>
        <p class="text-xs text-gray-500">{{ telefoneFormatado(item.telefone) }}<span v-if="item.cidade"> · {{ item.cidade }}</span></p>
      </template>
      <template #cell-caso="{ item }">
        <div v-if="item.demandas?.length" class="flex flex-wrap gap-1">
          <span v-for="d in item.demandas" :key="d.id" class="text-[11px] px-2 py-0.5 rounded-full border" :class="d.status === 'encerrado' ? 'border-gray-200 text-gray-400 line-through' : d.tipo === 'judicial' ? 'border-primary/40 text-primary' : 'border-secondary/50 text-secondary-dark'" :title="d.tipo === 'judicial' ? 'Processo judicial' : d.tipo === 'extrajudicial' ? 'Extrajudicial (cartório)' : 'Consultiva'">{{ d.titulo }}</span>
        </div>
        <p v-else class="text-xs text-gray-400">Sem demanda</p>
      </template>
      <template #cell-situacao="{ item }">
        <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" :class="item.etapa === 'ativo' ? 'bg-success/15 text-success-dark' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'">{{ etapa(item.etapa).nome }}</span>
      </template>
      <template #cell-cliente_desde="{ item }">{{ dataCurta(item.etapa_desde) }}</template>
    </DataTable>

    <ContatoFormModal :is-open="formAberto" :contato="emEdicao" :loading="crm.saving" @close="formAberto = false" @submit="salvar" />
    <ContatoDetailModal
      ref="detalhe" :is-open="detalheAberto" :contato-id="detalheId"
      @close="detalheAberto = false" @editar="editar" @andamento="andamento"
    />
    <AndamentoModal
      :is-open="andamentoAberto" :contato="andamentoContato" :etapa-destino="null"
      :loading="crm.saving" :erro="crm.error" @close="andamentoAberto = false" @submit="concluirAndamento"
    />
  </div>
</template>
