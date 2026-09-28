<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { definePageMeta, useHead } from '#imports'
import Button from '~/components/Button.vue'
import Modal from '~/components/Modal.vue'
import { FORMATOS_CONTEUDO, PLATAFORMAS_CONTEUDO, STATUS_CONTEUDO, type Conteudo } from '~~/shared/types/crm'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Conteúdo' })

const visao = ref<'pipeline' | 'calendario'>('pipeline')
const conteudos = ref<Conteudo[]>([])
const carregando = ref(false)
async function carregar() {
  carregando.value = true
  try {
    conteudos.value = await $fetch<Conteudo[]>('/api/conteudos')
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)

// ─── Pipeline ───────────────────────────────────────────────────────────────────
const colunas = computed(() => Object.entries(STATUS_CONTEUDO).map(([id, nome]) => ({ id, nome, itens: conteudos.value.filter(c => c.status === id) })))
const arrastandoSobre = ref<string | null>(null)
async function soltar(status: string, e: DragEvent) {
  arrastandoSobre.value = null
  const id = Number(e.dataTransfer?.getData('text/plain'))
  const c = conteudos.value.find(x => x.id === id)
  if (!c || c.status === status) return
  c.status = status as Conteudo['status']
  await $fetch(`/api/conteudos/${id}`, { method: 'PATCH', body: { status } })
}

// ─── Calendário mensal ──────────────────────────────────────────────────────────
const mesRef = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const nomeMes = computed(() => mesRef.value.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))
function mudarMes(d: number) { mesRef.value = new Date(mesRef.value.getFullYear(), mesRef.value.getMonth() + d, 1) }
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const hojeIso = iso(new Date())
const dias = computed(() => {
  const ini = new Date(mesRef.value)
  ini.setDate(1 - ini.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(ini)
    d.setDate(ini.getDate() + i)
    const chave = iso(d)
    return { chave, dia: d.getDate(), doMes: d.getMonth() === mesRef.value.getMonth(), itens: conteudos.value.filter(c => c.data_publicacao === chave) }
  })
})
const semData = computed(() => conteudos.value.filter(c => !c.data_publicacao && c.status !== 'publicado'))

const COR_STATUS: Record<string, string> = {
  ideia: 'border-gray-300 dark:border-zinc-600', rascunho: 'border-secondary/50', producao: 'border-warning',
  revisao: 'border-info', agendado: 'border-primary', publicado: 'border-success',
}

// ─── Criar / editar ──────────────────────────────────────────────────────────────
const aberto = ref(false)
const salvando = ref(false)
const erro = ref<string | null>(null)
const editando = ref<Conteudo | null>(null)
const form = reactive<Omit<Conteudo, 'id'>>({ titulo: '', tema: '', formato: 'post', plataforma: 'instagram', legenda: '', cta: '', data_publicacao: null, status: 'ideia' })
function abrir(c?: Conteudo, data?: string) {
  editando.value = c ?? null
  erro.value = null
  Object.assign(form, c ?? { titulo: '', tema: '', formato: 'post', plataforma: 'instagram', legenda: '', cta: '', data_publicacao: data ?? null, status: data ? 'agendado' : 'ideia' })
  aberto.value = true
}
async function salvar() {
  salvando.value = true
  erro.value = null
  try {
    const body = { ...form, data_publicacao: form.data_publicacao || null }
    if (editando.value) await $fetch(`/api/conteudos/${editando.value.id}`, { method: 'PATCH', body })
    else await $fetch('/api/conteudos', { method: 'POST', body })
    aberto.value = false
    await carregar()
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível salvar.'
  } finally {
    salvando.value = false
  }
}
async function excluir() {
  if (!editando.value || !confirm(`Excluir "${editando.value.titulo}"?`)) return
  await $fetch(`/api/conteudos/${editando.value.id}`, { method: 'DELETE' })
  aberto.value = false
  await carregar()
}
async function copiarLegenda() {
  const texto = [form.legenda, form.cta].filter(Boolean).join('\n\n')
  if (texto) await navigator.clipboard?.writeText(texto)
}
const dataCurta = (d: string | null) => d ? d.split('-').reverse().slice(0, 2).join('/') : ''
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Marketing</p>
        <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Conteúdo</h1>
        <p class="text-sm text-gray-500 mt-2 max-w-2xl">Ideias, posts, Reels, Stories e artigos — do rascunho à publicação. Arraste entre as etapas ou veja no calendário.</p>
      </div>
      <Button icon="ph:plus-bold" @click="abrir()">Nova ideia</Button>
    </div>

    <div class="flex gap-2">
      <button type="button" class="tab-btn" :class="{ 'tab-btn-ativo': visao === 'pipeline' }" @click="visao = 'pipeline'">Pipeline</button>
      <button type="button" class="tab-btn" :class="{ 'tab-btn-ativo': visao === 'calendario' }" @click="visao = 'calendario'">Calendário</button>
    </div>

    <p v-if="carregando && !conteudos.length" class="text-sm text-gray-400">Carregando…</p>

    <!-- PIPELINE -->
    <div v-else-if="visao === 'pipeline'" class="flex gap-4 overflow-x-auto pb-4">
      <section v-for="col in colunas" :key="col.id" class="w-64 shrink-0 rounded-3xl bg-gray-200/50 dark:bg-zinc-900/60 p-3 flex flex-col gap-2.5 min-h-[260px]"
               :class="{ 'ring-2 ring-secondary ring-inset': arrastandoSobre === col.id }"
               @dragover.prevent="arrastandoSobre = col.id" @dragleave="arrastandoSobre = null" @drop.prevent="soltar(col.id, $event)">
        <header class="px-1.5 pt-1 flex items-baseline justify-between">
          <h3 class="font-serif text-xl text-primary dark:text-zinc-100">{{ col.nome }}</h3>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 dark:bg-zinc-800">{{ col.itens.length }}</span>
        </header>
        <article v-for="c in col.itens" :key="c.id" draggable="true" class="rounded-2xl bg-white dark:bg-zinc-800 p-3 cursor-grab border-l-4 shadow-sm space-y-1"
                 :class="COR_STATUS[c.status]" @dragstart="$event.dataTransfer?.setData('text/plain', String(c.id))" @click="abrir(c)">
          <p class="font-semibold text-sm">{{ c.titulo }}</p>
          <p class="text-[10px] uppercase tracking-wider text-gray-400">{{ FORMATOS_CONTEUDO[c.formato] }} · {{ PLATAFORMAS_CONTEUDO[c.plataforma] }}<span v-if="c.data_publicacao"> · {{ dataCurta(c.data_publicacao) }}</span></p>
          <p v-if="c.tema" class="text-xs text-secondary-dark">{{ c.tema }}</p>
        </article>
      </section>
    </div>

    <!-- CALENDÁRIO -->
    <div v-else class="space-y-4">
      <div class="flex items-center gap-3">
        <button type="button" class="nav-btn" @click="mudarMes(-1)"><Icon name="ph:caret-left-bold" /></button>
        <h2 class="text-2xl font-serif text-primary dark:text-zinc-100 capitalize min-w-[200px] text-center">{{ nomeMes }}</h2>
        <button type="button" class="nav-btn" @click="mudarMes(1)"><Icon name="ph:caret-right-bold" /></button>
      </div>
      <div class="grid grid-cols-7 gap-px rounded-3xl overflow-hidden border border-gray-200/70 dark:border-zinc-800 bg-gray-200/70 dark:bg-zinc-800">
        <div v-for="d in ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']" :key="d" class="bg-secondary/10 text-[10px] font-bold uppercase tracking-wider text-gray-500 text-center py-2">{{ d }}</div>
        <div v-for="d in dias" :key="d.chave" class="bg-white dark:bg-zinc-900 min-h-[96px] p-1.5 flex flex-col gap-1 cursor-pointer hover:bg-secondary/5"
             :class="{ 'opacity-40': !d.doMes }" @click.self="abrir(undefined, d.chave)">
          <span class="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full" :class="d.chave === hojeIso ? 'bg-primary text-white' : 'text-gray-500'" @click="abrir(undefined, d.chave)">{{ d.dia }}</span>
          <button v-for="c in d.itens" :key="c.id" type="button" class="text-left text-[11px] leading-tight px-1.5 py-1 rounded-lg border-l-2 bg-gray-50 dark:bg-zinc-800 truncate" :class="COR_STATUS[c.status]" @click="abrir(c)">
            {{ c.titulo }}
          </button>
        </div>
      </div>
      <div v-if="semData.length">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Sem data ({{ semData.length }})</p>
        <div class="flex flex-wrap gap-2">
          <button v-for="c in semData" :key="c.id" type="button" class="text-xs px-3 py-1.5 rounded-full border-l-2 bg-white dark:bg-zinc-800 border" :class="COR_STATUS[c.status]" @click="abrir(c)">{{ c.titulo }}</button>
        </div>
      </div>
    </div>

    <Modal :is-open="aberto" :title="editando ? 'Editar conteúdo' : 'Novo conteúdo'" max-width="2xl" :loading="salvando" @close="aberto = false">
      <form id="conteudo-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1" @submit.prevent="salvar">
        <label class="field sm:col-span-2"><span>Título / ideia</span><input v-model="form.titulo" class="modal-input" required placeholder="Ex.: 3 mitos sobre partilha no divórcio" /></label>
        <label class="field sm:col-span-2"><span>Tema</span><input v-model="form.tema" class="modal-input" placeholder="Ex.: Divórcio, Inventário, Planejamento sucessório" /></label>
        <label class="field">
          <span>Formato</span>
          <select v-model="form.formato" class="modal-input"><option v-for="(n, k) in FORMATOS_CONTEUDO" :key="k" :value="k">{{ n }}</option></select>
        </label>
        <label class="field">
          <span>Plataforma</span>
          <select v-model="form.plataforma" class="modal-input"><option v-for="(n, k) in PLATAFORMAS_CONTEUDO" :key="k" :value="k">{{ n }}</option></select>
        </label>
        <label class="field">
          <span>Etapa</span>
          <select v-model="form.status" class="modal-input"><option v-for="(n, k) in STATUS_CONTEUDO" :key="k" :value="k">{{ n }}</option></select>
        </label>
        <label class="field"><span>Data de publicação</span><input v-model="form.data_publicacao" type="date" class="modal-input" /></label>
        <label class="field sm:col-span-2"><span>Legenda</span><textarea v-model="form.legenda" rows="6" class="modal-input" /></label>
        <label class="field sm:col-span-2"><span>CTA (chamada para ação)</span><input v-model="form.cta" class="modal-input" placeholder="Ex.: Agende sua consulta pelo link da bio" /></label>
        <p v-if="erro" class="sm:col-span-2 text-sm text-danger">{{ erro }}</p>
      </form>
      <template #footer>
        <div class="flex flex-col-reverse sm:flex-row gap-3 justify-between">
          <div class="flex gap-3">
            <Button v-if="editando" variant="outline" icon="ph:trash-bold" @click="excluir">Excluir</Button>
            <Button v-if="form.legenda" variant="outline" icon="ph:copy-bold" @click="copiarLegenda">Copiar legenda</Button>
          </div>
          <div class="flex gap-3 sm:ml-auto">
            <Button variant="outline" @click="aberto = false">Cancelar</Button>
            <Button form="conteudo-form" type="submit" :loading="salvando" icon="ph:check-bold">Salvar</Button>
          </div>
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
.nav-btn { @apply w-9 h-9 rounded-full border border-gray-300 dark:border-zinc-700 flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary; }
</style>
