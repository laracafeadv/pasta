<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { definePageMeta, useHead, useRoute, useRouter } from '#imports'
import Button from '~/components/Button.vue'
import HojePanel from '~/components/crm/HojePanel.vue'
import CalendarioPanel from '~/components/crm/CalendarioPanel.vue'
import FunilBoard from '~/components/crm/FunilBoard.vue'
import ContatosTable from '~/components/crm/ContatosTable.vue'
import RemarketingBoard from '~/components/crm/RemarketingBoard.vue'
import ContatoFormModal from '~/components/crm/ContatoFormModal.vue'
import ContatoDetailModal from '~/components/crm/ContatoDetailModal.vue'
import AndamentoModal from '~/components/crm/AndamentoModal.vue'
import { useCrmStore, type AndamentoPayload } from '~/stores/crm'
import type { Contato, ContatoInput } from '~~/shared/types/crm'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'CRM' })

const crm = useCrmStore()
const route = useRoute()
const router = useRouter()

const abas = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'funil', label: 'Funil' },
  { id: 'contatos', label: 'Contatos' },
  { id: 'remarketing', label: 'Remarketing' },
] as const
const aba = computed(() => (abas.some(a => a.id === route.query.aba) ? String(route.query.aba) : 'hoje'))
const mostrarEncerrados = ref(false)
const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

// ─── Hoje: lista (kanban, já com as tarefas internas juntas) ou calendário ───
const visaoHoje = ref<'kanban' | 'calendario'>(route.query.ver === 'calendario' || route.query.contato ? 'calendario' : 'kanban')

function carregarAba() {
  if (aba.value === 'hoje') crm.fetchAgenda()
  if (aba.value === 'funil') crm.fetchFunil(mostrarEncerrados.value)
  if (aba.value === 'contatos') crm.fetchRecords()
}
onMounted(() => {
  if (route.query.abrir) abrir({ id: Number(route.query.abrir) } as Contato, String(route.query.ficha || 'casos'))
  carregarAba()
  if (aba.value !== 'hoje') crm.fetchAgenda() // alimenta o contador do menu
})
watch(aba, carregarAba)
watch(mostrarEncerrados, (v) => crm.fetchFunil(v))

// ─── Ficha (criar / editar) ─────────────────────────────────────────────────
const formAberto = ref(false)
const emEdicao = ref<Contato | null>(null)
const erroForm = ref<string | null>(null)
function novo() { emEdicao.value = null; formAberto.value = true }
function editar(c: Contato) { emEdicao.value = c; formAberto.value = true }
async function salvar(data: ContatoInput) {
  try {
    await crm.salvar(emEdicao.value?.id ?? null, data)
    formAberto.value = false
    if (detalheAberto.value) detalhe.value?.recarregar()
  } catch (e: any) {
    erroForm.value = e?.data?.message || 'Não foi possível salvar.'
    alert(erroForm.value)
  }
}

// ─── Detalhe ────────────────────────────────────────────────────────────────
const detalhe = ref<InstanceType<typeof ContatoDetailModal> | null>(null)
const detalheAberto = ref(false)
const detalheId = ref<number | null>(null)
const detalheAba = ref('resumo')
const detalheModelo = ref<string | null>(null)
const remarketing = ref<InstanceType<typeof RemarketingBoard> | null>(null)
function abrir(c: Contato, abaDetalhe = 'resumo', modelo: string | null = null) {
  detalheId.value = c.id
  detalheAba.value = abaDetalhe
  detalheModelo.value = modelo
  detalheAberto.value = true
}

// ─── Andamento ──────────────────────────────────────────────────────────────
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
    const salvo = await crm.registrarAndamento(andamentoContato.value.id, data)
    andamentoAberto.value = false
    // Virou cliente: próximo passo natural é abrir o caso (dossiê, procuração, prazos).
    remarketing.value?.recarregar()
    if (data.etapa === 'ativo' && andamentoContato.value.etapa !== 'ativo') abrir(salvo, 'casos')
    else if (detalheAberto.value) detalhe.value?.recarregar()
  } catch { /* mensagem exibida no modal via crm.error */ }
}

async function adiar(c: Contato) {
  await crm.adiar(c)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow capitalize">{{ aba === 'hoje' ? dataHoje : 'Jornada do cliente' }}</p>
        <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">
          {{ aba === 'hoje' ? 'O que precisa de você hoje' : aba === 'funil' ? 'Funil de atendimento' : aba === 'remarketing' ? 'Remarketing' : 'Contatos e clientes' }}
        </h1>
        <p class="text-sm text-gray-500 mt-2 max-w-2xl">
          <template v-if="aba === 'hoje'">{{ visaoHoje === 'kanban' ? 'Casos com próxima ação e tarefas internas, lado a lado — tudo que precisa de você.' : 'Prazos processuais, audiências, consultas e tarefas — contados em dias úteis (CPC), com feriados nacionais e recesso forense.' }}</template>
          <template v-else-if="aba === 'funil'">Arraste os cartões entre as etapas. Borda vermelha: atrasado. Âmbar: sem próxima ação.</template>
          <template v-else-if="aba === 'remarketing'">Quem procurou e não fechou, por demanda, para receber conteúdo do interesse dela e, quando fizer sentido, retomar a conversa.</template>
          <template v-else>Toda a base, com busca e filtros.</template>
        </p>
      </div>
      <Button icon="ph:plus-bold" @click="novo">Novo contato</Button>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <NuxtLink
        v-for="a in abas"
        :key="a.id"
        :to="{ query: { aba: a.id } }"
        class="px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.14em] border transition-colors"
        :class="aba === a.id ? 'bg-primary text-white border-primary' : 'border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:border-primary'"
      >
        {{ a.label }}
        <span v-if="a.id === 'hoje' && crm.pendencias" class="ml-1.5 opacity-80">{{ crm.pendencias }}</span>
      </NuxtLink>
      <label v-if="aba === 'funil'" class="ml-auto text-sm flex items-center gap-2 cursor-pointer">
        <input v-model="mostrarEncerrados" type="checkbox" class="accent-[#3c2923]" /> Mostrar encerrados
      </label>
      <div v-if="aba === 'hoje'" class="ml-auto flex gap-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 p-1">
        <button type="button" class="px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors"
                :class="visaoHoje === 'kanban' ? 'bg-white dark:bg-zinc-700 text-primary dark:text-white shadow-sm' : 'text-gray-500'"
                @click="visaoHoje = 'kanban'"><Icon name="ph:kanban-bold" /> Lista</button>
        <button type="button" class="px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors"
                :class="visaoHoje === 'calendario' ? 'bg-white dark:bg-zinc-700 text-primary dark:text-white shadow-sm' : 'text-gray-500'"
                @click="visaoHoje = 'calendario'"><Icon name="ph:calendar-bold" /> Calendário</button>
      </div>
    </div>

    <p v-if="crm.error && !andamentoAberto" class="text-sm text-danger">{{ crm.error }}</p>

    <template v-if="aba === 'hoje'">
      <HojePanel v-if="visaoHoje === 'kanban'" :agenda="crm.agenda" @abrir="abrir" @andamento="andamento" @adiar="adiar" />
      <CalendarioPanel v-else />
    </template>
    <FunilBoard v-else-if="aba === 'funil'" :contatos="crm.funil" :mostrar-encerrados="mostrarEncerrados" @abrir="abrir" @mover="andamento" />
    <RemarketingBoard v-else-if="aba === 'remarketing'" ref="remarketing" @abrir="abrir" @mensagem="(c, m) => abrir(c, 'conversa', m)" @reabrir="(c) => andamento(c, 'qualificacao')" />
    <ContatosTable v-else @abrir="abrir" />

    <ContatoFormModal :is-open="formAberto" :contato="emEdicao" :loading="crm.saving" @close="formAberto = false" @submit="salvar" />
    <ContatoDetailModal
      ref="detalhe"
      :is-open="detalheAberto"
      :contato-id="detalheId"
      :aba-inicial="detalheAba"
      :modelo-inicial="detalheModelo"
      @close="detalheAberto = false; remarketing?.recarregar()"
      @editar="editar"
      @andamento="andamento"
    />
    <AndamentoModal
      :is-open="andamentoAberto"
      :contato="andamentoContato"
      :etapa-destino="andamentoDestino"
      :loading="crm.saving"
      :erro="crm.error"
      @close="andamentoAberto = false"
      @submit="concluirAndamento"
    />
  </div>
</template>
