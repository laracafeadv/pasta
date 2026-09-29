<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Button from '~/components/Button.vue'
import Modal from '~/components/Modal.vue'
import { COLUNAS_TAREFA, PRIORIDADES_TAREFA, type Caso, type Contato, type TarefaInterna } from '~~/shared/types/crm'
import { hojeISO } from '~/stores/crm'

const visao = ref<'lista' | 'kanban'>('lista')
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
const abertas = computed(() => tarefas.value.filter(t => !t.concluida))
const atrasadas = computed(() => abertas.value.filter(t => t.prazo && t.prazo < hoje))
const deHoje = computed(() => abertas.value.filter(t => t.prazo === hoje))
const proximas = computed(() => abertas.value.filter(t => !t.prazo || t.prazo > hoje))
const concluidas = computed(() => tarefas.value.filter(t => t.concluida))

const PRIORIDADE_COR: Record<string, string> = { alta: 'border-danger', media: 'border-warning', baixa: 'border-gray-300 dark:border-zinc-700' }

// ─── Kanban (mesmas colunas do quadro na tela Hoje) ──────────────────────────
const colunasKanban = computed(() => Object.entries(COLUNAS_TAREFA).map(([id, titulo]) => ({
  id, titulo, itens: abertas.value.filter(t => t.coluna === id),
})))
const arrastandoSobre = ref<string | null>(null)
async function soltar(colunaId: string, e: DragEvent) {
  arrastandoSobre.value = null
  const id = Number(e.dataTransfer?.getData('text/plain'))
  const t = tarefas.value.find(x => x.id === id)
  if (!t || t.coluna === colunaId) return
  await $fetch(`/api/tarefas/${id}`, { method: 'PATCH', body: { coluna: colunaId } })
  await carregar()
}

// ─── Criar / editar ───────────────────────────────────────────────────────────
const modalAberto = ref(false)
const salvando = ref(false)
const editando = ref<TarefaInterna | null>(null)
const form = reactive({ titulo: '', descricao: '', prazo: '', prioridade: 'media' as keyof typeof PRIORIDADES_TAREFA, coluna: 'hoje' as keyof typeof COLUNAS_TAREFA, contato_id: null as number | null })

const contatoQuery = ref('')
const contatoResultados = ref<Contato[]>([])
const contatoSelecionado = ref<Contato | null>(null)
let debounceContato: ReturnType<typeof setTimeout> | undefined
watch(contatoQuery, (v) => {
  clearTimeout(debounceContato)
  if (v.trim().length < 2 || contatoSelecionado.value) { contatoResultados.value = []; return }
  debounceContato = setTimeout(async () => {
    const r = await $fetch<{ records: Contato[] }>('/api/crm/contatos', { params: { search: v.trim(), pageSize: 8 } })
    contatoResultados.value = r.records
  }, 300)
})
function escolherContato(c: Contato) {
  contatoSelecionado.value = c
  contatoQuery.value = c.nome ?? ''
  contatoResultados.value = []
  form.contato_id = c.id
  casoId.value = null
  carregarCasos()
}
function limparContato() {
  contatoSelecionado.value = null
  contatoQuery.value = ''
  form.contato_id = null
  casos.value = []
  casoId.value = null
}
const casos = ref<Caso[]>([])
const casoId = ref<number | null>(null)
async function carregarCasos() {
  if (!contatoSelecionado.value) return
  casos.value = await $fetch<Caso[]>('/api/casos', { params: { contato: contatoSelecionado.value.id } })
}

function abrir(t?: TarefaInterna) {
  editando.value = t ?? null
  form.titulo = t?.titulo ?? ''
  form.descricao = t?.descricao ?? ''
  form.prazo = t?.prazo ?? ''
  form.prioridade = t?.prioridade ?? 'media'
  form.coluna = t?.coluna ?? 'hoje'
  form.contato_id = t?.contato_id ?? null
  contatoSelecionado.value = t?.contato ? { id: t.contato.id, nome: t.contato.nome } as Contato : null
  contatoQuery.value = t?.contato?.nome ?? ''
  casoId.value = t?.caso_id ?? null
  casos.value = []
  if (contatoSelecionado.value) carregarCasos()
  modalAberto.value = true
}
async function salvar() {
  if (!form.titulo.trim()) return
  salvando.value = true
  try {
    const body = { ...form, prazo: form.prazo || null, caso_id: casoId.value }
    if (editando.value) await $fetch(`/api/tarefas/${editando.value.id}`, { method: 'PATCH', body })
    else await $fetch('/api/tarefas', { method: 'POST', body })
    modalAberto.value = false
    await carregar()
  } finally {
    salvando.value = false
  }
}
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
function dataCurta(iso: string | null) {
  if (!iso) return null
  const [a, m, d] = iso.split('-')
  return `${d}/${m}`
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm text-gray-500 mt-2 max-w-2xl">
          Todas as suas tarefas internas num lugar só, com prazo, prioridade e vínculo a cliente/caso — inclusive as concluídas.
          As de hoje continuam aparecendo também na tela Hoje.
        </p>
      </div>
      <Button icon="ph:plus-bold" @click="abrir()">Nova tarefa</Button>
    </div>

    <div class="flex gap-2">
      <button type="button" class="tab-btn" :class="{ 'tab-btn-ativo': visao === 'lista' }" @click="visao = 'lista'">Lista</button>
      <button type="button" class="tab-btn" :class="{ 'tab-btn-ativo': visao === 'kanban' }" @click="visao = 'kanban'">Kanban</button>
    </div>

    <p v-if="carregando" class="text-sm text-gray-400">Carregando…</p>

    <!-- LISTA -->
    <div v-else-if="visao === 'lista'" class="space-y-8">
      <section v-for="grupo in [
        { titulo: 'Atrasadas', itens: atrasadas, cor: 'text-danger' },
        { titulo: 'Hoje', itens: deHoje, cor: 'text-secondary-dark' },
        { titulo: 'Próximas', itens: proximas, cor: 'text-primary dark:text-zinc-100' },
        { titulo: 'Concluídas', itens: concluidas, cor: 'text-gray-400' },
      ]" :key="grupo.titulo">
        <h2 class="text-xl font-serif mb-2" :class="grupo.cor">{{ grupo.titulo }} <span class="text-sm font-sans text-gray-400">({{ grupo.itens.length }})</span></h2>
        <p v-if="!grupo.itens.length" class="text-sm text-gray-400 italic">Nada aqui.</p>
        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <article v-for="t in grupo.itens" :key="t.id" class="rounded-2xl bg-white/70 dark:bg-zinc-900/60 border-l-[3px] p-3.5 flex flex-col gap-1.5" :class="[PRIORIDADE_COR[t.prioridade], t.concluida ? 'opacity-60' : '']">
            <div class="flex items-start justify-between gap-2">
              <p class="font-semibold text-sm cursor-pointer" @click="abrir(t)">{{ t.titulo }}</p>
              <span v-if="t.prazo" class="text-[10px] text-gray-400 shrink-0">{{ dataCurta(t.prazo) }}</span>
            </div>
            <p v-if="t.descricao" class="text-xs text-gray-500">{{ t.descricao }}</p>
            <p v-if="t.contato" class="text-xs text-secondary-dark">{{ t.contato.nome }}<span v-if="t.caso"> · {{ t.caso.titulo }}</span></p>
            <div class="flex gap-2 pt-1">
              <button v-if="!t.concluida" class="btn-mini bg-primary text-white" @click="concluir(t)">Feita</button>
              <button v-else class="btn-mini border border-gray-300 dark:border-zinc-700" @click="reabrir(t)">Reabrir</button>
              <button class="btn-mini border border-gray-300 dark:border-zinc-700 hover:border-danger hover:text-danger" @click="excluir(t)">Excluir</button>
            </div>
          </article>
        </div>
      </section>
    </div>

    <!-- KANBAN -->
    <div v-else class="flex gap-4 overflow-x-auto pb-4">
      <section v-for="col in colunasKanban" :key="col.id" class="w-72 shrink-0 rounded-3xl bg-gray-200/50 dark:bg-zinc-900/60 p-3 flex flex-col gap-2.5 min-h-[260px]"
               :class="{ 'ring-2 ring-secondary ring-inset': arrastandoSobre === col.id }"
               @dragover.prevent="arrastandoSobre = col.id" @dragleave="arrastandoSobre = null" @drop.prevent="soltar(col.id, $event)">
        <header class="px-1.5 pt-1 flex items-baseline justify-between">
          <h3 class="font-serif text-xl text-primary dark:text-zinc-100">{{ col.titulo }}</h3>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 dark:bg-zinc-800">{{ col.itens.length }}</span>
        </header>
        <article v-for="t in col.itens" :key="t.id" draggable="true" class="rounded-2xl bg-white dark:bg-zinc-800 p-3 cursor-grab border-l-4 shadow-sm space-y-1"
                 :class="PRIORIDADE_COR[t.prioridade]" @dragstart="$event.dataTransfer?.setData('text/plain', String(t.id))" @click="abrir(t)">
          <p class="font-bold text-sm">{{ t.titulo }}</p>
          <p v-if="t.contato" class="text-xs text-secondary-dark">{{ t.contato.nome }}</p>
          <p v-if="t.prazo" class="text-[10px] text-gray-400">{{ dataCurta(t.prazo) }}</p>
        </article>
      </section>
    </div>

    <Modal :is-open="modalAberto" :title="editando ? 'Editar tarefa' : 'Nova tarefa'" max-width="lg" :loading="salvando" @close="modalAberto = false">
      <form id="tarefa-form" class="space-y-4 p-1" @submit.prevent="salvar">
        <label class="field"><span>Título</span><input v-model="form.titulo" class="modal-input" required /></label>
        <label class="field"><span>Descrição</span><textarea v-model="form.descricao" rows="2" class="modal-input" /></label>
        <div class="grid grid-cols-2 gap-4">
          <label class="field"><span>Prazo</span><input v-model="form.prazo" type="date" class="modal-input" /></label>
          <label class="field">
            <span>Prioridade</span>
            <select v-model="form.prioridade" class="modal-input">
              <option v-for="(nome, id) in PRIORIDADES_TAREFA" :key="id" :value="id">{{ nome }}</option>
            </select>
          </label>
        </div>
        <label class="field">
          <span>Coluna (quadro Hoje)</span>
          <select v-model="form.coluna" class="modal-input">
            <option v-for="(nome, id) in COLUNAS_TAREFA" :key="id" :value="id">{{ nome }}</option>
          </select>
        </label>
        <div class="field relative">
          <span>Cliente vinculado (opcional)</span>
          <div v-if="contatoSelecionado" class="modal-input flex items-center justify-between">
            <span class="truncate">{{ contatoSelecionado.nome }}</span>
            <button type="button" class="text-gray-400 hover:text-danger shrink-0 ml-2" @click="limparContato"><Icon name="ph:x-bold" /></button>
          </div>
          <input v-else v-model="contatoQuery" type="text" class="modal-input" placeholder="Buscar por nome…" />
          <div v-if="contatoResultados.length" class="absolute z-20 top-full left-0 right-0 mt-1 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-lg max-h-48 overflow-y-auto">
            <button v-for="c in contatoResultados" :key="c.id" type="button" class="w-full text-left px-3 py-2 text-sm hover:bg-secondary/10" @click="escolherContato(c)">{{ c.nome }}</button>
          </div>
        </div>
        <label v-if="casos.length" class="field">
          <span>Caso vinculado (opcional)</span>
          <select v-model="casoId" class="modal-input">
            <option :value="null">Nenhum</option>
            <option v-for="c in casos" :key="c.id" :value="c.id">{{ c.titulo }}</option>
          </select>
        </label>
      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="modalAberto = false">Cancelar</Button>
          <Button form="tarefa-form" type="submit" :loading="salvando" icon="ph:check-bold">Salvar</Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
.tab-btn { @apply text-sm font-semibold px-4 py-2 rounded-full border border-gray-300 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:text-primary dark:hover:text-white transition-colors; }
.tab-btn-ativo { @apply bg-primary text-white border-primary; }
.btn-mini { @apply text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full; }
</style>
