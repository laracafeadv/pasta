<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { definePageMeta, useHead, useRoute, navigateTo } from '#imports'
import Button from '~/components/Button.vue'
import Modal from '~/components/Modal.vue'
import { CONTEXTOS, type ContextoFormulario } from '~~/shared/data/formulario'
import { PROCEDIMENTOS } from '~~/shared/data/checklist'
import { SERVICOS } from '~~/shared/data/servicos'
import type { Formulario, FormularioEnvio, FormularioEnvioDetalhe } from '~~/shared/types/crm'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Formulários' })

const rota = useRoute()
const aba = ref<'formularios' | 'respostas'>(rota.query.aba === 'respostas' ? 'respostas' : 'formularios')

// ─── Formulários (o construtor abre em /formularios/:id) ───────────────────────
const formularios = ref<Formulario[]>([])
const carregando = ref(true)
async function carregarFormularios() {
  formularios.value = await $fetch<Formulario[]>('/api/formularios', { params: { todos: '1' } })
  carregando.value = false
}
const filtroContexto = ref<'todos' | ContextoFormulario>('todos')
const visiveis = computed(() => formularios.value.filter(f => filtroContexto.value === 'todos' || f.contexto === filtroContexto.value))
const nomeProcedimento = (v: string) => (v.endsWith('/*') ? SERVICOS.find(s => s.id === v.slice(0, -2))?.nome : PROCEDIMENTOS.find(p => p.valor === v)?.rotulo) ?? v

const novoAberto = ref(false)
const novoNome = ref('')
const novoContexto = ref<ContextoFormulario>('cliente')
const criando = ref(false)
const erroCriar = ref<string | null>(null)
async function criar() {
  criando.value = true
  erroCriar.value = null
  try {
    const r = await $fetch<{ id: number }>('/api/formularios', { method: 'POST', body: { nome: novoNome.value || 'Formulário sem título', contexto: novoContexto.value } })
    await navigateTo(`/formularios/${r.id}`)
  } catch (e: any) {
    erroCriar.value = e?.data?.message || 'Não foi possível criar.'
  } finally {
    criando.value = false
  }
}
async function duplicar(f: Formulario) {
  const r = await $fetch<{ id: number }>(`/api/formularios/${f.id}/duplicar`, { method: 'POST' })
  await navigateTo(`/formularios/${r.id}`)
}

// ─── Respostas ────────────────────────────────────────────────────────────────
const envios = ref<FormularioEnvio[]>([])
const respostasCarregando = ref(false)
const buscaResposta = ref('')
const filtroFormulario = ref<number | ''>('')
const filtroDe = ref('')
const filtroAte = ref('')
async function carregarRespostas() {
  respostasCarregando.value = true
  try {
    envios.value = await $fetch<FormularioEnvio[]>('/api/formularios/respostas', {
      params: {
        busca: buscaResposta.value || undefined, formulario_id: filtroFormulario.value || undefined,
        de: filtroDe.value || undefined, ate: filtroAte.value ? `${filtroAte.value}T23:59:59` : undefined,
      },
    })
  } finally {
    respostasCarregando.value = false
  }
}
const STATUS_LABEL: Record<string, string> = { enviado: 'Enviado', visualizado: 'Visualizado', respondido: 'Respondido' }
const STATUS_COR: Record<string, string> = { enviado: 'text-gray-400', visualizado: 'text-warning-dark', respondido: 'text-success-dark' }

const detalheAberto = ref(false)
const detalhe = ref<FormularioEnvioDetalhe | null>(null)
async function verResposta(id: number) {
  detalhe.value = await $fetch<FormularioEnvioDetalhe>(`/api/formularios/respostas/${id}`)
  detalheAberto.value = true
}
function formatarResposta(r: string | string[] | null) {
  if (r == null) return '(sem resposta)'
  return Array.isArray(r) ? (r.length ? r.join(', ') : '(sem resposta)') : (r || '(sem resposta)')
}
function dataHora(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  await carregarFormularios()
  await carregarRespostas()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="eyebrow">Escritório</p>
        <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Formulários</h1>
        <p class="text-sm text-gray-500 mt-2 max-w-2xl">
          Monte seus formulários como quiser — perguntas, seções, lógica condicional — e diga onde valem: no <b>cliente</b>, na <b>consulta</b> ou em uma <b>demanda</b> (pacto, inventário, divórcio…).
          As respostas aparecem sozinhas na ficha, sem copiar dados.
        </p>
      </div>
      <Button v-if="aba === 'formularios'" icon="ph:plus-bold" @click="novoAberto = true">Novo formulário</Button>
    </div>

    <div class="flex gap-2">
      <button type="button" class="tab-btn" :class="{ 'tab-btn-ativo': aba === 'formularios' }" @click="aba = 'formularios'">Meus formulários</button>
      <button type="button" class="tab-btn" :class="{ 'tab-btn-ativo': aba === 'respostas' }" @click="aba = 'respostas'">Envios e respostas</button>
    </div>

    <!-- FORMULÁRIOS -->
    <div v-if="aba === 'formularios'" class="space-y-4">
      <div class="flex flex-wrap gap-2">
        <button type="button" class="chip" :class="{ 'bg-primary text-white border-primary': filtroContexto === 'todos' }" @click="filtroContexto = 'todos'">Todos</button>
        <button v-for="(c, k) in CONTEXTOS" :key="k" type="button" class="chip" :class="{ 'bg-primary text-white border-primary': filtroContexto === k }" @click="filtroContexto = k">{{ c.nome }}</button>
      </div>
      <p v-if="carregando" class="text-sm text-gray-400">Carregando…</p>
      <p v-else-if="!visiveis.length" class="text-sm text-gray-400">Nenhum formulário aqui ainda. Clique em “Novo formulário”.</p>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article v-for="f in visiveis" :key="f.id" :data-testid="`form-${f.id}`" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border-l-[3px] border-secondary border-y border-r border-gray-200/70 dark:border-zinc-800 p-5 flex flex-col gap-3" :class="{ 'opacity-60': !f.ativo }">
          <header class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <NuxtLink :to="`/formularios/${f.id}`" class="font-semibold text-lg text-primary dark:text-zinc-100 hover:underline">{{ f.nome }}</NuxtLink>
              <p v-if="f.descricao" class="text-xs text-gray-500 mt-0.5 line-clamp-2">{{ f.descricao }}</p>
            </div>
            <span class="shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-secondary/20 text-secondary-dark">{{ CONTEXTOS[f.contexto]?.nome }}</span>
          </header>
          <p class="text-xs text-gray-400">
            {{ f.itens.length }} pergunta(s)
            <span v-if="f.contexto === 'demanda'"> · {{ f.procedimentos?.length ? f.procedimentos.map(nomeProcedimento).join(', ') : 'todas as demandas' }}</span>
            <span v-if="!f.ativo"> · inativo</span>
          </p>
          <div class="flex gap-2 mt-auto">
            <NuxtLink :to="`/formularios/${f.id}`" class="chip">Editar</NuxtLink>
            <button type="button" class="chip" @click="duplicar(f)">Duplicar</button>
          </div>
        </article>
      </div>
    </div>

    <!-- RESPOSTAS -->
    <div v-else class="space-y-4">
      <div class="flex flex-wrap gap-2 items-center">
        <input v-model="buscaResposta" type="search" class="rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm" placeholder="Buscar por nome da cliente…" @keyup.enter="carregarRespostas" />
        <select v-model="filtroFormulario" class="rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm" @change="carregarRespostas">
          <option value="">Todos os formulários</option>
          <option v-for="f in formularios" :key="f.id" :value="f.id">{{ f.nome }}</option>
        </select>
        <label class="flex items-center gap-1.5 text-xs text-gray-500">De <input v-model="filtroDe" type="date" class="rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-3 py-1.5 text-sm" @change="carregarRespostas" /></label>
        <label class="flex items-center gap-1.5 text-xs text-gray-500">até <input v-model="filtroAte" type="date" class="rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-3 py-1.5 text-sm" @change="carregarRespostas" /></label>
        <Button size="sm" variant="outline" @click="carregarRespostas">Filtrar</Button>
      </div>

      <p v-if="respostasCarregando" class="text-sm text-gray-400">Carregando…</p>
      <p v-else-if="!envios.length" class="text-sm text-gray-400">Nenhum envio ainda.</p>

      <div v-else class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-secondary/10 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr><th class="px-4 py-3">Cliente</th><th class="px-4 py-3">Formulário</th><th class="px-4 py-3">Data</th><th class="px-4 py-3">Status</th><th class="px-4 py-3" /></tr>
          </thead>
          <tbody>
            <tr v-for="e in envios" :key="e.id" class="border-t border-gray-100 dark:border-zinc-800">
              <td class="px-4 py-3">{{ e.contato_nome ?? '—' }}</td>
              <td class="px-4 py-3">{{ e.formulario_nome ?? 'Só resumo livre' }}</td>
              <td class="px-4 py-3 text-gray-500">{{ dataHora(e.respondido_em ?? e.created_at) }}</td>
              <td class="px-4 py-3 font-semibold" :class="STATUS_COR[e.status]">{{ STATUS_LABEL[e.status] }}</td>
              <td class="px-4 py-3 text-right">
                <button v-if="e.status === 'respondido'" class="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="verResposta(e.id)">Ver respostas</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: novo formulário -->
    <Modal :is-open="novoAberto" title="Novo formulário" description="Você monta as perguntas na próxima tela." max-width="lg" :loading="criando" @close="novoAberto = false">
      <form id="novo-form" class="space-y-4" @submit.prevent="criar">
        <label class="field"><span>Título</span><input v-model="novoNome" class="modal-input" placeholder="Ex.: Dados familiares" autofocus /></label>
        <div class="field">
          <span>Onde este formulário vale?</span>
          <div class="grid gap-2">
            <label v-for="(c, k) in CONTEXTOS" :key="k" class="flex items-start gap-3 rounded-2xl border p-3 cursor-pointer" :class="novoContexto === k ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-zinc-700'">
              <input v-model="novoContexto" type="radio" :value="k" class="mt-1 accent-[#3c2923]" />
              <span><b class="text-sm">{{ c.nome }}</b><span class="block text-xs text-gray-500">{{ c.dica }}</span></span>
            </label>
          </div>
        </div>
        <p v-if="erroCriar" class="text-sm text-danger">{{ erroCriar }}</p>
      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="novoAberto = false">Cancelar</Button>
          <Button form="novo-form" type="submit" :loading="criando" icon="ph:arrow-right-bold">Criar e montar</Button>
        </div>
      </template>
    </Modal>

    <!-- Modal: detalhe da resposta -->
    <Modal :is-open="detalheAberto" title="Respostas recebidas" max-width="2xl" @close="detalheAberto = false">
      <div v-if="detalhe" class="p-1 space-y-4">
        <div class="grid grid-cols-2 gap-3 text-sm">
          <p><b>Cliente:</b> {{ detalhe.contato_nome ?? '—' }}</p>
          <p><b>Formulário:</b> {{ detalhe.formulario_nome ?? 'Só resumo livre' }}</p>
          <p><b>Enviado em:</b> {{ dataHora(detalhe.created_at) }}</p>
          <p><b>Respondido em:</b> {{ dataHora(detalhe.respondido_em) }}</p>
        </div>
        <div class="rounded-2xl bg-secondary/10 border border-secondary/30 p-4">
          <p class="text-xs font-semibold uppercase tracking-wider text-secondary-dark mb-1">Conte um pouco da sua situação</p>
          <p class="text-sm whitespace-pre-wrap">{{ detalhe.resumo || '—' }}</p>
        </div>
        <div v-for="r in detalhe.respostas" :key="r.id" class="border-b border-gray-100 dark:border-zinc-800 pb-3">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400">{{ r.pergunta_texto }}</p>
          <p class="text-sm mt-1">{{ formatarResposta(r.resposta) }}</p>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <a v-if="detalhe" :href="`/api/formularios/respostas/${detalhe.id}/exportar`" target="_blank" class="chip"><Icon name="ph:download-bold" class="align-middle" /> Exportar (.docx)</a>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
.chip { @apply text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:border-primary hover:text-primary dark:hover:text-white transition-colors inline-flex items-center gap-1.5; }
.tab-btn { @apply text-sm font-semibold px-4 py-2 rounded-full border border-gray-300 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:text-primary dark:hover:text-white transition-colors; }
.tab-btn-ativo { @apply bg-primary text-white border-primary; }
</style>
