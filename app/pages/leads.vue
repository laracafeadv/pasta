<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref } from 'vue'
import { definePageMeta, useHead } from '#imports'
import Button from '~/components/Button.vue'
import FunilBoard from '~/components/crm/FunilBoard.vue'
const ContatoFormModal = defineAsyncComponent(() => import('~/components/crm/ContatoFormModal.vue'))
const ContatoDetailModal = defineAsyncComponent(() => import('~/components/crm/ContatoDetailModal.vue'))
const AndamentoModal = defineAsyncComponent(() => import('~/components/crm/AndamentoModal.vue'))
import { useCrmStore, type AndamentoPayload } from '~/stores/crm'
import type { Contato, ContatoInput } from '~~/shared/types/crm'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Leads' })

// Leads: captação e qualificação, antes de virar cliente. Etapas de "cliente ativo" em diante
// moram na tela Clientes — o board aqui só mostra as colunas de pré-venda.
const ETAPAS_LEAD = ['novo', 'qualificacao', 'agendado', 'diagnostico', 'proposta']

const crm = useCrmStore()
onMounted(() => crm.fetchFunil(false))

const formAberto = ref(false)
const emEdicao = ref<Contato | null>(null)
function novo() { emEdicao.value = null; formAberto.value = true }
function editar(c: Contato) { emEdicao.value = c; formAberto.value = true }
async function salvar(data: ContatoInput) {
  try {
    await crm.salvar(emEdicao.value?.id ?? null, data)
    formAberto.value = false
    if (detalheAberto.value) detalhe.value?.recarregar()
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
const andamentoDestino = ref<string | null>(null)
function andamento(c: Contato, destino: string | null = null) {
  andamentoContato.value = c
  andamentoDestino.value = destino
  crm.error = null
  andamentoAberto.value = true
}
async function concluirAndamento(data: AndamentoPayload) {
  if (!andamentoContato.value) return
  try {
    await crm.registrarAndamento(andamentoContato.value.id, data)
    andamentoAberto.value = false
    if (detalheAberto.value) detalhe.value?.recarregar()
  } catch { /* mensagem exibida no modal via crm.error */ }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Captação</p>
        <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Leads</h1>
        <p class="text-sm text-gray-500 mt-2 max-w-2xl">
          Do primeiro contato até fechar. Arraste os cartões entre as etapas — quando fechar, o lead vira cliente
          automaticamente e some daqui, sem perder nada do histórico (a ficha completa continua em Clientes).
        </p>
      </div>
      <Button icon="ph:plus-bold" @click="novo">Novo lead</Button>
    </div>

    <FunilBoard :contatos="crm.funil" :etapas-ids="ETAPAS_LEAD" @abrir="abrir" @mover="andamento" />

    <ContatoFormModal :is-open="formAberto" :contato="emEdicao" :loading="crm.saving" @close="formAberto = false" @submit="salvar" />
    <ContatoDetailModal
      ref="detalhe" :is-open="detalheAberto" :contato-id="detalheId"
      @close="detalheAberto = false" @editar="editar" @andamento="andamento"
    />
    <AndamentoModal
      :is-open="andamentoAberto" :contato="andamentoContato" :etapa-destino="andamentoDestino"
      :loading="crm.saving" :erro="crm.error" @close="andamentoAberto = false" @submit="concluirAndamento"
    />
  </div>
</template>
