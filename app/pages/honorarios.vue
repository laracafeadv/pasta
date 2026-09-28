<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { definePageMeta, useHead, useRoute } from '#imports'
import Button from '~/components/Button.vue'
import Modal from '~/components/Modal.vue'
import KpiCard from '~/components/KpiCard.vue'
import DataTable, { type ColumnDef } from '~/components/DataTable.vue'
import { STATUS_HONORARIO, TIPOS_HONORARIO, type Contato, type Honorario } from '~~/shared/types/crm'
import ReciboModal from '~/components/gestao/ReciboModal.vue'
import { brl, dataCurta, telefoneFormatado } from '~/utils/formatadores'
import FinanceiroContas from '~/components/gestao/FinanceiroContas.vue'
import FinanceiroPainel from '~/components/gestao/FinanceiroPainel.vue'
import { useProfileStore } from '~/stores/profile'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Financeiro' })

const route = useRoute()
// Contas, caixa e preços são da administração; a equipe vê só os honorários.
const ehAdmin = computed(() => useProfileStore().profile?.role === 'admin')
const abas = [
  { id: 'honorarios', label: 'Honorários', desc: 'Cada proposta e contrato, cliente por cliente — o que você usa no dia a dia.' },
  { id: 'contas', label: 'Contas a pagar e receber', desc: 'O que ainda vai entrar e o que ainda vai sair, lançamento por lançamento.' },
  { id: 'caixa', label: 'Fluxo de caixa', desc: 'Projeção de quanto sobra por mês, olhando 6 meses à frente.' },
  { id: 'precos', label: 'Preço e rentabilidade', desc: 'Quanto cobrar por demanda e se cada cliente está dando lucro.' },
]
const aba = ref('honorarios')
const abaAtual = computed(() => abas.find(a => a.id === aba.value)!)
const lista = ref<Honorario[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 25
const loading = ref(false)
const filtros = reactive({ status: '', tipo: '' })
const stats = ref({ contratado: 0, recebido: 0, emProposta: 0, ticketMedio: 0, quantidade: 0 })
const visao = ref<'lista' | 'kanban'>('lista')

async function carregar() {
  loading.value = true
  try {
    const params: Record<string, string> = visao.value === 'kanban'
      ? { page: '1', pageSize: '500' }
      : { page: String(page.value), pageSize: String(pageSize) }
    if (filtros.status) params.status = filtros.status
    if (filtros.tipo) params.tipo = filtros.tipo
    const [r, s] = await Promise.all([
      $fetch<{ honorarios: Honorario[]; total: number }>('/api/honorarios', { params }),
      $fetch<typeof stats.value>('/api/honorarios/stats'),
    ])
    lista.value = r.honorarios
    total.value = r.total
    stats.value = s
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  carregar()
  if (route.query.contato) novo(Number(route.query.contato))
})
watch(filtros, () => { page.value = 1; carregar() })
watch(visao, carregar)

const columns: ColumnDef[] = [
  { key: 'contato', label: 'Cliente' },
  { key: 'valor', label: 'Valor' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'status', label: 'Status' },
  { key: 'data', label: 'Contratação' },
]
const statusCor: Record<string, string> = {
  Proposta: 'bg-warning/15 text-warning-dark dark:text-warning-200',
  Contratado: 'bg-info/15 text-info-dark dark:text-info-200',
  Pago: 'bg-success/15 text-success-dark dark:text-success-200',
  Cancelado: 'bg-gray-200 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400',
}

// ─── Modal ──────────────────────────────────────────────────────────────────
const aberto = ref(false)
const salvando = ref(false)
const erro = ref<string | null>(null)
const editando = ref<Honorario | null>(null)
const form = reactive<Record<string, any>>({})
const buscaContato = ref('')
const opcoesContato = ref<Contato[]>([])
const contatoEscolhido = ref<Pick<Contato, 'id' | 'nome' | 'telefone'> | null>(null)

function preencher(h?: Honorario, contatoId?: number) {
  Object.assign(form, {
    contato_id: h?.contato_id ?? contatoId ?? null,
    descricao: h?.descricao ?? '',
    valor: h?.valor ?? '',
    tipo: h?.tipo ?? 'Contrato fixo',
    status: h?.status ?? 'Proposta',
    forma_pagamento: h?.forma_pagamento ?? '',
    parcelas: h?.parcelas ?? 1,
    data_contratacao: h?.data_contratacao ?? '',
    observacao: h?.observacao ?? '',
    valor_mensal: h?.valor_mensal ?? '',
    meses: h?.meses ?? '',
    percentual_exito: h?.percentual_exito ?? '',
    validade_anos: h?.validade_anos ?? '',
  })
}

async function novo(contatoId?: number) {
  editando.value = null
  erro.value = null
  preencher(undefined, contatoId)
  contatoEscolhido.value = null
  buscaContato.value = ''
  if (contatoId) {
    const d = await $fetch<{ contato: Contato }>(`/api/crm/contatos/${contatoId}`).catch(() => null)
    if (d) contatoEscolhido.value = d.contato
  }
  aberto.value = true
}

function editar(h: Honorario) {
  editando.value = h
  erro.value = null
  preencher(h)
  contatoEscolhido.value = h.contato ?? null
  aberto.value = true
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(buscaContato, (v) => {
  clearTimeout(timer)
  if (!v.trim()) { opcoesContato.value = []; return }
  timer = setTimeout(async () => {
    const r = await $fetch<{ records: Contato[] }>('/api/crm/contatos', { params: { search: v, pageSize: '8' } })
    opcoesContato.value = r.records
  }, 300)
})

function escolher(c: Contato) {
  contatoEscolhido.value = c
  form.contato_id = c.id
  buscaContato.value = ''
  opcoesContato.value = []
}

async function salvar() {
  salvando.value = true
  erro.value = null
  try {
    if (editando.value) await $fetch(`/api/honorarios/${editando.value.id}`, { method: 'PATCH', body: form })
    else await $fetch('/api/honorarios', { method: 'POST', body: form })
    aberto.value = false
    carregar()
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível salvar.'
  } finally {
    salvando.value = false
  }
}

const gerandoParcelas = ref(false)
async function gerarParcelas() {
  if (!editando.value) return
  gerandoParcelas.value = true
  erro.value = null
  try {
    const r = await $fetch<{ parcelas: number }>('/api/financeiro/parcelas', { method: 'POST', body: { honorario_id: editando.value.id } })
    alert(`${r.parcelas} parcela(s) lançadas em "Contas a receber".`)
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível gerar as parcelas.'
  } finally {
    gerandoParcelas.value = false
  }
}

async function excluir() {
  if (!editando.value || !confirm('Excluir este honorário?')) return
  await $fetch(`/api/honorarios/${editando.value.id}`, { method: 'DELETE' })
  aberto.value = false
  carregar()
}

const reciboAberto = ref(false)
function abrirRecibo() {
  reciboAberto.value = true
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

// ─── Kanban por status ────────────────────────────────────────────────────────
const colunasKanban = computed(() => STATUS_HONORARIO.map(s => ({ nome: s, itens: lista.value.filter(h => h.status === s) })))
const arrastandoSobre = ref<string | null>(null)
async function soltar(status: string, e: DragEvent) {
  arrastandoSobre.value = null
  const id = Number(e.dataTransfer?.getData('text/plain'))
  const h = lista.value.find(x => x.id === id)
  if (!h || h.status === status) return
  h.status = status as Honorario['status']
  await $fetch(`/api/honorarios/${id}`, { method: 'PATCH', body: { status } })
  carregar()
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Financeiro</p>
        <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">{{ ehAdmin ? 'Gestão financeira' : 'Honorários' }}</h1>
        <p class="text-sm text-gray-500 mt-2">{{ ehAdmin ? 'Comece por Honorários — as outras três são ferramentas de gestão, use quando precisar planejar.' : 'Propostas, contratos e recebimentos por cliente.' }}</p>
      </div>
      <Button v-if="aba === 'honorarios'" icon="ph:plus-bold" @click="novo()">Registrar honorário</Button>
    </div>

    <div v-if="ehAdmin" class="space-y-2.5">
      <div class="flex flex-wrap gap-2 items-center">
        <button class="px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.14em] border transition-colors"
                :class="aba === 'honorarios' ? 'bg-primary text-white border-primary' : 'border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:border-primary'" @click="aba = 'honorarios'">
          Honorários
        </button>
        <span class="h-5 w-px bg-gray-200 dark:bg-zinc-700 mx-1" />
        <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ferramentas de gestão</span>
        <button v-for="a in abas.slice(1)" :key="a.id" class="px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                :class="aba === a.id ? 'bg-secondary text-white border-secondary' : 'border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:border-secondary'" @click="aba = a.id">
          {{ a.label }}
        </button>
      </div>
      <p class="text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900/60 rounded-xl px-3.5 py-2 inline-flex items-center gap-1.5">
        <Icon name="ph:info-bold" class="text-secondary shrink-0" /> {{ abaAtual.desc }}
      </p>
    </div>

    <FinanceiroContas v-if="aba === 'contas'" />
    <FinanceiroPainel v-else-if="aba === 'caixa'" :key="'caixa'" modo="caixa" />
    <FinanceiroPainel v-else-if="aba === 'precos'" :key="'precos'" modo="precos" />

    <template v-if="aba === 'honorarios'">

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard title="Contratado" :value="brl(stats.contratado)" :sub-value="`${stats.quantidade} contrato(s)`" icon="ph:handshake-bold" color="primary" :loading="loading" />
      <KpiCard title="Recebido" :value="brl(stats.recebido)" icon="ph:check-circle-bold" color="success" :loading="loading" />
      <KpiCard title="Em proposta" :value="brl(stats.emProposta)" icon="ph:hourglass-bold" color="warning" :loading="loading" />
      <KpiCard title="Valor médio por contrato" :value="brl(stats.ticketMedio)" sub-value="quanto cada contrato fechado rende, em média" icon="ph:scales-bold" color="neutral" :loading="loading" />
    </div>

    <div class="flex flex-wrap gap-2">
      <div class="inline-flex rounded-full border border-gray-200 dark:border-zinc-700 p-0.5">
        <button type="button" class="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors" :class="visao === 'lista' ? 'bg-primary text-white' : 'text-gray-500'" @click="visao = 'lista'">Lista</button>
        <button type="button" class="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors" :class="visao === 'kanban' ? 'bg-primary text-white' : 'text-gray-500'" @click="visao = 'kanban'">Kanban</button>
      </div>
      <select v-model="filtros.status" class="filtro">
        <option value="">Todos os status</option>
        <option v-for="s in STATUS_HONORARIO" :key="s">{{ s }}</option>
      </select>
      <select v-model="filtros.tipo" class="filtro">
        <option value="">Todos os tipos</option>
        <option v-for="t in TIPOS_HONORARIO" :key="t">{{ t }}</option>
      </select>
    </div>

    <div v-if="visao === 'kanban'" class="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
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
          v-for="h in col.itens" :key="h.id"
          draggable="true"
          class="rounded-2xl bg-white dark:bg-zinc-800 p-3 cursor-grab shadow-sm hover:shadow-md transition-shadow space-y-1"
          @dragstart="$event.dataTransfer?.setData('text/plain', String(h.id))"
          @click="editar(h)"
        >
          <p class="font-semibold text-sm">{{ h.contato?.nome || 'Sem nome' }}</p>
          <p class="text-xs text-gray-500">{{ h.descricao || h.tipo }}</p>
          <p class="text-sm font-bold text-secondary-dark">{{ brl(h.valor) }}<span v-if="h.parcelas > 1" class="text-xs font-normal text-gray-500"> · {{ h.parcelas }}x</span></p>
        </article>
      </section>
    </div>

    <DataTable v-else
      :columns="columns"
      :data="lista"
      :loading="loading"
      :total="total"
      :current-page="page"
      :total-pages="totalPages"
      :page-size="pageSize"
      @page-change="(p: number) => { page = p; carregar() }"
      @row-click="editar"
    >
      <template #cell-contato="{ item }">
        <p class="font-semibold">{{ item.contato?.nome || 'Sem nome' }}</p>
        <p class="text-xs text-gray-500">{{ item.descricao || telefoneFormatado(item.contato?.telefone) }}</p>
      </template>
      <template #cell-valor="{ item }">
        <b>{{ brl(item.valor) }}</b><span v-if="item.parcelas > 1" class="text-xs text-gray-500"> · {{ item.parcelas }}x</span>
      </template>
      <template #cell-tipo="{ item }">{{ item.tipo }}</template>
      <template #cell-status="{ item }">
        <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" :class="statusCor[item.status]">{{ item.status }}</span>
      </template>
      <template #cell-data="{ item }">{{ dataCurta(item.data_contratacao) || '—' }}</template>
    </DataTable>
    </template>

    <Modal :is-open="aberto" :title="editando ? 'Editar honorário' : 'Registrar honorário'" max-width="2xl" :loading="salvando" @close="aberto = false">
      <form id="honorario-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="salvar">
        <div class="sm:col-span-2 field">
          <span>Cliente *</span>
          <div v-if="contatoEscolhido" class="flex items-center justify-between rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2.5">
            <span><b>{{ contatoEscolhido.nome }}</b> <span class="text-xs text-gray-500">{{ telefoneFormatado(contatoEscolhido.telefone) }}</span></span>
            <button v-if="!editando" type="button" class="text-xs text-secondary-dark underline" @click="contatoEscolhido = null; form.contato_id = null">trocar</button>
          </div>
          <div v-else class="relative">
            <input v-model="buscaContato" class="modal-input" placeholder="Buscar contato pelo nome ou telefone…" />
            <ul v-if="opcoesContato.length" class="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
              <li v-for="c in opcoesContato" :key="c.id">
                <button type="button" class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-800 text-sm" @click="escolher(c)">
                  {{ c.nome || 'Sem nome' }} <span class="text-xs text-gray-500">{{ telefoneFormatado(c.telefone) }}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
        <label class="field sm:col-span-2"><span>Descrição</span><input v-model="form.descricao" class="modal-input" placeholder="Ex.: Divórcio consensual extrajudicial" /></label>
        <label class="field"><span>Valor (R$) *</span><input v-model="form.valor" type="number" min="0" step="0.01" class="modal-input" required /></label>
        <label class="field"><span>Parcelas</span><input v-model="form.parcelas" type="number" min="1" max="120" class="modal-input" /></label>
        <label class="field">
          <span>Tipo</span>
          <select v-model="form.tipo" class="modal-input"><option v-for="t in TIPOS_HONORARIO" :key="t">{{ t }}</option></select>
        </label>
        <label class="field">
          <span>Status</span>
          <select v-model="form.status" class="modal-input"><option v-for="s in STATUS_HONORARIO" :key="s">{{ s }}</option></select>
        </label>
        <template v-if="form.tipo === 'Em camadas'">
          <label class="field"><span>Mensal (R$)</span><input v-model="form.valor_mensal" type="number" min="0" step="0.01" class="modal-input" /></label>
          <label class="field"><span>Por quantos meses</span><input v-model="form.meses" type="number" min="1" max="60" class="modal-input" /></label>
          <label class="field"><span>% do proveito econômico</span><input v-model="form.percentual_exito" type="number" min="0" max="100" step="0.5" class="modal-input" /></label>
          <label class="field"><span>Validade do contrato (anos)</span><input v-model="form.validade_anos" type="number" min="1" max="20" class="modal-input" /></label>
          <p class="sm:col-span-2 text-xs text-gray-500 -mt-2">Em camadas, o "Valor" é o arranque. As parcelas lançadas incluem o arranque e as mensalidades.</p>
        </template>
        <label class="field"><span>Forma de pagamento</span><input v-model="form.forma_pagamento" class="modal-input" placeholder="Pix, boleto, cartão…" /></label>
        <label class="field"><span>Data da contratação</span><input v-model="form.data_contratacao" type="date" class="modal-input" /></label>
        <label class="field sm:col-span-2"><span>Observação</span><textarea v-model="form.observacao" rows="2" class="modal-input" /></label>
        <p v-if="erro" class="sm:col-span-2 text-sm text-danger">{{ erro }}</p>
      </form>
      <template #footer>
        <div class="flex flex-col-reverse sm:flex-row gap-3 justify-between">
          <div class="flex gap-3">
            <Button v-if="editando" variant="outline" icon="ph:trash-bold" @click="excluir">Excluir</Button>
            <Button v-if="editando && ehAdmin && ['Contratado', 'Pago'].includes(editando.status)" variant="outline" icon="ph:calendar-plus-bold" :loading="gerandoParcelas" @click="gerarParcelas">Lançar parcelas</Button>
            <Button v-if="editando" variant="outline" icon="ph:receipt-bold" @click="abrirRecibo">Gerar recibo</Button>
          </div>
          <div class="flex gap-3 sm:ml-auto">
            <Button variant="outline" @click="aberto = false">Cancelar</Button>
            <Button form="honorario-form" type="submit" :loading="salvando" :disabled="!form.contato_id" icon="ph:check-bold">Salvar</Button>
          </div>
        </div>
      </template>
    </Modal>

    <ReciboModal
      v-if="editando"
      :is-open="reciboAberto"
      :contato-id="editando.contato_id"
      :honorario-id="editando.id"
      @close="reciboAberto = false"
    />
  </div>
</template>

<style scoped>
.filtro { @apply rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm; }
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
