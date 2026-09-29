<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Button from '~/components/Button.vue'
import TarefaFormModal from '~/components/crm/TarefaFormModal.vue'
import { PRIORIDADES_TAREFA, situacaoData, type Caso, type Contato, type SituacaoData, type TarefaInterna } from '~~/shared/types/crm'
import { hojeISO } from '~/stores/crm'

const tarefas = ref<TarefaInterna[]>([])
const carregando = ref(false)
async function carregar() {
  carregando.value = true
  try {
    tarefas.value = await $fetch<TarefaInterna[]>('/api/tarefas', { params: { todas: '1' } })
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)

const hoje = hojeISO()

// Tarefas é o inventário: TODAS as tarefas, em qualquer data, filtráveis por situação.
type Filtro = 'abertas' | SituacaoData | 'concluidas' | 'todas'
const filtro = ref<Filtro>('abertas')
const busca = ref('')
const situacao = (t: TarefaInterna): SituacaoData | 'concluida' => t.concluida ? 'concluida' : situacaoData(t.prazo, hoje)
const contagem = computed(() => ({
  abertas: tarefas.value.filter(t => !t.concluida).length,
  atrasado: tarefas.value.filter(t => situacao(t) === 'atrasado').length,
  hoje: tarefas.value.filter(t => situacao(t) === 'hoje').length,
  futuro: tarefas.value.filter(t => situacao(t) === 'futuro').length,
  concluidas: tarefas.value.filter(t => t.concluida).length,
  todas: tarefas.value.length,
}))
const FILTROS: { id: Filtro; nome: string }[] = [
  { id: 'abertas', nome: 'Abertas' }, { id: 'atrasado', nome: 'Atrasadas' }, { id: 'hoje', nome: 'Hoje' },
  { id: 'futuro', nome: 'Futuras' }, { id: 'concluidas', nome: 'Concluídas' }, { id: 'todas', nome: 'Todas' },
]
const lista = computed(() => {
  const q = busca.value.trim().toLowerCase()
  return tarefas.value
    .filter(t => filtro.value === 'todas' || (filtro.value === 'abertas' ? !t.concluida : situacao(t) === (filtro.value === 'concluidas' ? 'concluida' : filtro.value)))
    .filter(t => !q || [t.titulo, t.descricao, t.contato?.nome, t.caso?.titulo].some(v => v?.toLowerCase().includes(q)))
})
const SITUACAO: Record<string, { nome: string; classe: string }> = {
  atrasado: { nome: 'Atrasada', classe: 'bg-danger/15 text-danger-dark' },
  hoje: { nome: 'Hoje', classe: 'bg-secondary/15 text-secondary-dark' },
  futuro: { nome: 'Futura', classe: 'bg-gray-100 dark:bg-zinc-800 text-gray-500' },
  concluida: { nome: 'Concluída', classe: 'bg-gray-100 dark:bg-zinc-800 text-gray-400' },
}
const PRIORIDADE_COR: Record<string, string> = { alta: 'text-danger', media: 'text-warning-dark', baixa: 'text-gray-400' }

// ─── Criar / editar (formulário compartilhado com o Dashboard) ─────────────────────
const modalAberto = ref(false)
const editando = ref<TarefaInterna | null>(null)
function abrir(t?: TarefaInterna) { editando.value = t ?? null; modalAberto.value = true }
async function concluir(t: TarefaInterna) {
  await $fetch(`/api/tarefas/${t.id}`, { method: 'PATCH', body: { concluida: true } })
  await carregar()
}
async function reabrir(t: TarefaInterna) {
  await $fetch(`/api/tarefas/${t.id}`, { method: 'PATCH', body: { concluida: false } })
  await carregar()
}
async function excluir(t: TarefaInterna) {
  if (!confirm(`Excluir a tarefa "${t.titulo}"?`)) return
  await $fetch(`/api/tarefas/${t.id}`, { method: 'DELETE' })
  await carregar()
}
function dataCurta(iso: string) {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}`
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <p class="text-sm text-gray-500 max-w-2xl">
        Todas as tarefas cadastradas, de qualquer data. O que vence hoje aparece também em <NuxtLink to="/crm" class="underline hover:text-primary">Hoje</NuxtLink>; prazos processuais ficam na aba Prazos.
      </p>
      <Button icon="ph:plus-bold" @click="abrir()">Nova tarefa</Button>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button v-for="f in FILTROS" :key="f.id" type="button" class="tab-btn" :class="{ 'tab-btn-ativo': filtro === f.id }" @click="filtro = f.id">
        {{ f.nome }} <span class="opacity-60 ml-0.5">{{ contagem[f.id] }}</span>
      </button>
      <input v-model="busca" type="search" class="ml-auto w-full sm:w-64 rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm" placeholder="Buscar tarefa ou cliente…" />
    </div>

    <p v-if="carregando" class="text-sm text-gray-400">Carregando…</p>
    <p v-else-if="!lista.length" class="text-sm text-gray-400 italic py-6 text-center">Nenhuma tarefa neste filtro.</p>

    <div v-else class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 overflow-x-auto">
      <table class="w-full min-w-[640px] text-sm">
        <thead>
          <tr class="text-left text-[10px] uppercase tracking-wider text-gray-400">
            <th class="px-4 py-3 font-semibold">Data</th>
            <th class="px-4 py-3 font-semibold">Tarefa</th>
            <th class="px-4 py-3 font-semibold">Cliente · Caso</th>
            <th class="px-4 py-3 font-semibold">Prioridade</th>
            <th class="px-4 py-3 font-semibold">Situação</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in lista" :key="t.id" class="border-t border-gray-100 dark:border-zinc-800 align-top" :class="t.concluida ? 'opacity-60' : ''">
            <td class="px-4 py-3 whitespace-nowrap font-semibold">{{ dataCurta(t.prazo) }}</td>
            <td class="px-4 py-3">
              <button type="button" class="font-semibold text-left hover:underline" @click="abrir(t)">{{ t.titulo }}</button>
              <p v-if="t.descricao" class="text-xs text-gray-500 mt-0.5">{{ t.descricao }}</p>
            </td>
            <td class="px-4 py-3 text-xs text-secondary-dark">{{ t.contato?.nome || '—' }}<span v-if="t.caso" class="text-gray-500"> · {{ t.caso.titulo }}</span></td>
            <td class="px-4 py-3 text-xs font-semibold" :class="PRIORIDADE_COR[t.prioridade]">{{ PRIORIDADES_TAREFA[t.prioridade] }}</td>
            <td class="px-4 py-3"><span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" :class="SITUACAO[situacao(t)]!.classe">{{ SITUACAO[situacao(t)]!.nome }}</span></td>
            <td class="px-4 py-3 whitespace-nowrap text-right space-x-1.5">
              <button v-if="!t.concluida" class="btn-mini bg-primary text-white" @click="concluir(t)">Feita</button>
              <button v-else class="btn-mini border border-gray-300 dark:border-zinc-700" @click="reabrir(t)">Reabrir</button>
              <button class="btn-mini border border-gray-300 dark:border-zinc-700 hover:border-danger hover:text-danger" @click="excluir(t)">Excluir</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <TarefaFormModal :is-open="modalAberto" :tarefa="editando" @close="modalAberto = false" @salvo="modalAberto = false; carregar()" />
  </div>
</template>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
.tab-btn { @apply text-sm font-semibold px-4 py-2 rounded-full border border-gray-300 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:text-primary dark:hover:text-white transition-colors; }
.tab-btn-ativo { @apply bg-primary text-white border-primary; }
.btn-mini { @apply text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full; }
</style>
