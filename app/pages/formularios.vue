<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { definePageMeta, useHead, useRoute } from '#imports'
import Button from '~/components/Button.vue'
import Modal from '~/components/Modal.vue'
import type { Formulario, FormularioEnvio, FormularioEnvioDetalhe, FormularioPergunta, TipoPergunta } from '~~/shared/types/crm'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Formulários' })

const TIPOS: { valor: TipoPergunta; nome: string }[] = [
  { valor: 'texto_curto', nome: 'Texto curto' },
  { valor: 'texto_longo', nome: 'Texto longo' },
  { valor: 'numero', nome: 'Número' },
  { valor: 'data', nome: 'Data' },
  { valor: 'email', nome: 'E-mail' },
  { valor: 'telefone', nome: 'Telefone' },
  { valor: 'sim_nao', nome: 'Sim/não' },
  { valor: 'selecao_unica', nome: 'Escolha única' },
  { valor: 'selecao_multipla', nome: 'Múltipla escolha (coleta de informação)' },
  { valor: 'checklist', nome: 'Checklist (acompanhamento: o que já foi feito)' },
]
const nomeTipo = (t: string) => TIPOS.find(x => x.valor === t)?.nome ?? t
const TEM_OPCOES: TipoPergunta[] = ['selecao_unica', 'selecao_multipla', 'checklist']

const rota = useRoute()
const aba = ref<'formularios' | 'perguntas' | 'respostas'>(rota.query.aba === 'perguntas' ? 'perguntas' : 'formularios')

// ─── Perguntas (banco reutilizável) ─────────────────────────────────────────
const perguntas = ref<FormularioPergunta[]>([])
async function carregarPerguntas() {
  perguntas.value = await $fetch<FormularioPergunta[]>('/api/formulario-perguntas', { params: { todas: '1' } })
}

const perguntaAberta = ref(false)
const perguntaSalvando = ref(false)
const perguntaErro = ref<string | null>(null)
const perguntaEditando = ref<FormularioPergunta | null>(null)
const formPergunta = reactive<{ texto: string; tipo: TipoPergunta; opcoes: string[]; secao: string; ajuda: string }>({ texto: '', tipo: 'texto_curto', opcoes: [], secao: 'Geral', ajuda: '' })

function abrirPergunta(p?: FormularioPergunta) {
  perguntaEditando.value = p ?? null
  perguntaErro.value = null
  formPergunta.texto = p?.texto ?? ''
  formPergunta.tipo = p?.tipo ?? 'texto_curto'
  formPergunta.opcoes = p?.opcoes?.length ? [...p.opcoes] : ['', '']
  formPergunta.secao = p?.secao ?? secoesExistentes.value[0] ?? 'Geral'
  formPergunta.ajuda = p?.ajuda ?? ''
  perguntaAberta.value = true
}
async function salvarPergunta() {
  perguntaSalvando.value = true
  perguntaErro.value = null
  try {
    const body = { texto: formPergunta.texto, tipo: formPergunta.tipo, opcoes: formPergunta.opcoes, secao: formPergunta.secao, ajuda: formPergunta.ajuda }
    if (perguntaEditando.value) await $fetch(`/api/formulario-perguntas/${perguntaEditando.value.id}`, { method: 'PUT', body })
    else await $fetch('/api/formulario-perguntas', { method: 'POST', body })
    perguntaAberta.value = false
    await carregarPerguntas()
  } catch (e: any) {
    perguntaErro.value = e?.data?.message || 'Não foi possível salvar.'
  } finally {
    perguntaSalvando.value = false
  }
}
async function arquivarPergunta() {
  if (!perguntaEditando.value || !confirm(`Arquivar a pergunta "${perguntaEditando.value.texto}"? Ela some da ficha e dos formulários novos; as respostas já guardadas continuam preservadas.`)) return
  await $fetch(`/api/formulario-perguntas/${perguntaEditando.value.id}`, { method: 'DELETE' })
  perguntaAberta.value = false
  await carregarPerguntas()
}
async function restaurarPergunta() {
  const p = perguntaEditando.value
  if (!p) return
  await $fetch(`/api/formulario-perguntas/${p.id}`, { method: 'PUT', body: { texto: p.texto, tipo: p.tipo, opcoes: p.opcoes, secao: p.secao, ajuda: p.ajuda, arquivada: false } })
  perguntaAberta.value = false
  await carregarPerguntas()
}
async function excluirPergunta() {
  const p = perguntaEditando.value
  if (!p || !confirm(`Excluir DEFINITIVAMENTE a pergunta "${p.texto}"? Não dá para desfazer. (Se algum cliente já respondeu, o sistema recusa e você pode arquivá-la.)`)) return
  try {
    await $fetch(`/api/formulario-perguntas/${p.id}`, { method: 'DELETE', params: { definitivo: '1' } })
    perguntaAberta.value = false
    await carregarPerguntas()
  } catch (e: any) {
    perguntaErro.value = e?.data?.message || 'Não foi possível excluir.'
  }
}
async function duplicarPergunta() {
  const p = perguntaEditando.value
  if (!p) return
  const url: string = `/api/formulario-perguntas/${p.id}/duplicar`
  await $fetch(url, { method: 'POST' })
  perguntaAberta.value = false
  await carregarPerguntas()
}

// Seções = agrupamento das perguntas (mesma organização que a ficha do cliente usa).
const secoesExistentes = computed(() => [...new Set(perguntasAtivas.value.map(p => p.secao))])
const secoesComPerguntas = computed(() => secoesExistentes.value.map(nome => ({ nome, itens: perguntasAtivas.value.filter(p => p.secao === nome) })))
const perguntasArquivadas = computed(() => perguntas.value.filter(p => p.arquivada))
async function mover(p: FormularioPergunta, dir: -1 | 1) {
  const grupo = perguntasAtivas.value.filter(x => x.secao === p.secao)
  const i = grupo.findIndex(x => x.id === p.id)
  const j = i + dir
  if (j < 0 || j >= grupo.length) return
  const [item] = grupo.splice(i, 1)
  grupo.splice(j, 0, item!)
  // Reescreve a ordem de todas, mantendo as seções na ordem atual.
  const ids = secoesExistentes.value.flatMap(n => (n === p.secao ? grupo : perguntasAtivas.value.filter(x => x.secao === n)).map(x => x.id))
  await $fetch('/api/formulario-perguntas/ordem', { method: 'PUT', body: { ids } })
  await carregarPerguntas()
}
async function renomearSecao(de: string) {
  const para = prompt('Novo nome da seção:', de)?.trim()
  if (!para || para === de) return
  await $fetch('/api/formulario-perguntas/ordem', { method: 'PUT', body: { renomear: { de, para } } })
  await carregarPerguntas()
}

// ─── Formulários ─────────────────────────────────────────────────────────────
const formularios = ref<Formulario[]>([])
async function carregarFormularios() {
  formularios.value = await $fetch<Formulario[]>('/api/formularios', { params: { todos: '1' } })
}

const formAberto = ref(false)
const formSalvando = ref(false)
const formErro = ref<string | null>(null)
const formEditando = ref<Formulario | null>(null)
const formNome = ref('')
const formAtivo = ref(true)
const formItens = ref<{ pergunta_id: number; obrigatoria: boolean }[]>([])
const perguntasAtivas = computed(() => perguntas.value.filter(p => !p.arquivada))
const perguntasParaFormulario = computed(() => perguntasAtivas.value.filter(p => p.tipo !== 'checklist'))
const perguntaPorId = (id: number) => perguntas.value.find(p => p.id === id)

function abrirFormulario(f?: Formulario) {
  formEditando.value = f ?? null
  formErro.value = null
  formNome.value = f?.nome ?? ''
  formAtivo.value = f?.ativo ?? true
  formItens.value = f?.itens.map(i => ({ pergunta_id: i.pergunta_id, obrigatoria: i.obrigatoria })) ?? []
  formAberto.value = true
}
function alternarPerguntaNoFormulario(perguntaId: number) {
  const i = formItens.value.findIndex(x => x.pergunta_id === perguntaId)
  if (i >= 0) formItens.value.splice(i, 1)
  else formItens.value.push({ pergunta_id: perguntaId, obrigatoria: false })
}
function moverItem(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= formItens.value.length) return
  const [item] = formItens.value.splice(i, 1)
  formItens.value.splice(j, 0, item!)
}
async function salvarFormulario() {
  formSalvando.value = true
  formErro.value = null
  try {
    const body = { nome: formNome.value, ativo: formAtivo.value, itens: formItens.value }
    if (formEditando.value) await $fetch(`/api/formularios/${formEditando.value.id}`, { method: 'PUT', body })
    else await $fetch('/api/formularios', { method: 'POST', body })
    formAberto.value = false
    await carregarFormularios()
  } catch (e: any) {
    formErro.value = e?.data?.message || 'Não foi possível salvar.'
  } finally {
    formSalvando.value = false
  }
}
async function excluirFormulario() {
  if (!formEditando.value || !confirm(`Excluir o formulário "${formEditando.value.nome}"? Os envios e respostas já recebidos continuam no histórico.`)) return
  await $fetch(`/api/formularios/${formEditando.value.id}`, { method: 'DELETE' })
  formAberto.value = false
  await carregarFormularios()
}
async function duplicarFormulario(f: Formulario) {
  await $fetch(`/api/formularios/${f.id}/duplicar`, { method: 'POST' })
  await carregarFormularios()
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
  await Promise.all([carregarPerguntas(), carregarFormularios()])
  await carregarRespostas()
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="eyebrow">Pré-consulta</p>
      <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Formulários</h1>
      <p class="text-sm text-gray-500 mt-2 max-w-2xl">
        Crie suas perguntas, monte formulários com elas (ex.: "Pré-consulta — Divórcio"), envie pra cliente na ficha do caso,
        e acompanhe aqui quem respondeu. O resumo livre da cliente vai sempre, em todo envio.
      </p>
    </div>

    <div class="flex gap-2">
      <button type="button" class="tab-btn" :class="{ 'tab-btn-ativo': aba === 'formularios' }" @click="aba = 'formularios'">Formulários</button>
      <button type="button" class="tab-btn" :class="{ 'tab-btn-ativo': aba === 'perguntas' }" @click="aba = 'perguntas'">Banco de perguntas</button>
      <button type="button" class="tab-btn" :class="{ 'tab-btn-ativo': aba === 'respostas' }" @click="aba = 'respostas'">Respostas recebidas</button>
    </div>

    <!-- FORMULÁRIOS -->
    <div v-if="aba === 'formularios'" class="space-y-4">
      <div class="flex justify-end"><Button icon="ph:plus-bold" @click="abrirFormulario()">Novo formulário</Button></div>
      <p v-if="!formularios.length" class="text-sm text-gray-400">Nenhum formulário ainda. Crie perguntas no "Banco de perguntas" e depois monte um formulário aqui.</p>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article v-for="f in formularios" :key="f.id" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border-l-[3px] border-secondary border-y border-r border-gray-200/70 dark:border-zinc-800 p-5 flex flex-col gap-3" :class="{ 'opacity-50': !f.ativo }">
          <header class="flex items-baseline justify-between gap-3">
            <p class="font-semibold">{{ f.nome }} <span v-if="!f.ativo" class="text-xs text-gray-400">(inativo)</span></p>
            <span class="text-xs text-gray-400">{{ f.itens.length }} pergunta(s)</span>
          </header>
          <ol class="text-sm text-gray-600 dark:text-zinc-300 space-y-1 flex-1 list-decimal list-inside">
            <li v-for="i in f.itens" :key="i.id">{{ i.pergunta.texto }}<span v-if="i.obrigatoria" class="text-danger"> *</span></li>
          </ol>
          <div class="flex gap-2">
            <button class="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="abrirFormulario(f)">Editar</button>
            <button class="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="duplicarFormulario(f)">Duplicar</button>
          </div>
        </article>
      </div>
    </div>

    <!-- BANCO DE PERGUNTAS -->
    <div v-else-if="aba === 'perguntas'" class="space-y-5">
      <div class="rounded-2xl border border-secondary/30 bg-secondary/10 p-4 text-sm text-gray-600 dark:text-zinc-300">
        <b>Fixo × seu.</b> Nome, telefone, e-mail, CPF, endereço e etapa são do CRM e ficam no Resumo e na Qualificação — não são criados aqui.
        Tudo que você cria abaixo aparece <b>automaticamente</b> em <b>Informações do cliente</b>, na ficha, dentro da seção escolhida, e pode ser preenchido ou corrigido ali mesmo.
        <span class="block mt-1 text-xs text-gray-500"><b>Múltipla escolha</b> coleta informação (quais bens ela tem). <b>Checklist</b> acompanha o que já foi feito (documentos recebidos) e é só interno — não vai para a cliente.</span>
      </div>
      <div class="flex justify-end"><Button icon="ph:plus-bold" @click="abrirPergunta()">Nova pergunta</Button></div>
      <p v-if="!perguntasAtivas.length" class="text-sm text-gray-400">Nenhuma pergunta ainda.</p>
      <section v-for="sec in secoesComPerguntas" :key="sec.nome" class="space-y-2">
        <h2 class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-500">
          {{ sec.nome }} <span class="font-normal normal-case tracking-normal text-gray-400">· {{ sec.itens.length }}</span>
          <button type="button" class="normal-case tracking-normal font-normal text-gray-400 hover:text-primary" title="Renomear seção" @click="renomearSecao(sec.nome)"><Icon name="ph:pencil-simple-bold" /></button>
        </h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <div v-for="(p, i) in sec.itens" :key="p.id" class="flex items-stretch rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 hover:border-primary">
            <button type="button" class="flex-1 min-w-0 text-left p-4" @click="abrirPergunta(p)">
              <p class="text-sm font-semibold text-primary dark:text-zinc-100">{{ p.texto }}</p>
              <p class="text-xs text-gray-400 mt-0.5 truncate">{{ nomeTipo(p.tipo) }}<span v-if="p.opcoes.length"> — {{ p.opcoes.join(', ') }}</span></p>
            </button>
            <div class="flex flex-col justify-center pr-2 text-gray-300">
              <button type="button" class="hover:text-primary disabled:opacity-30" :disabled="i === 0" aria-label="Subir" @click="mover(p, -1)"><Icon name="ph:caret-up-bold" /></button>
              <button type="button" class="hover:text-primary disabled:opacity-30" :disabled="i === sec.itens.length - 1" aria-label="Descer" @click="mover(p, 1)"><Icon name="ph:caret-down-bold" /></button>
            </div>
          </div>
        </div>
      </section>
      <details v-if="perguntasArquivadas.length" class="text-sm">
        <summary class="cursor-pointer text-gray-500">Arquivadas ({{ perguntasArquivadas.length }}) — fora da ficha e dos formulários novos, respostas preservadas</summary>
        <div class="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-2">
          <button v-for="p in perguntasArquivadas" :key="p.id" type="button" class="text-left rounded-2xl border border-dashed border-gray-300 dark:border-zinc-700 p-3 opacity-70 hover:opacity-100" @click="abrirPergunta(p)">
            <p class="text-sm">{{ p.texto }}</p><p class="text-xs text-gray-400">{{ p.secao }} · {{ nomeTipo(p.tipo) }}</p>
          </button>
        </div>
      </details>
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

    <!-- Modal: pergunta -->
    <Modal :is-open="perguntaAberta" :title="perguntaEditando ? 'Editar pergunta' : 'Nova pergunta'" max-width="lg" :loading="perguntaSalvando" @close="perguntaAberta = false">
      <form id="pergunta-form" class="space-y-4" @submit.prevent="salvarPergunta">
        <label class="field"><span>Texto da pergunta</span><input v-model="formPergunta.texto" class="modal-input" required /></label>
        <label class="field">
          <span>Tipo de resposta</span>
          <select v-model="formPergunta.tipo" class="modal-input">
            <option v-for="t in TIPOS" :key="t.valor" :value="t.valor">{{ t.nome }}</option>
          </select>
        </label>
        <div v-if="TEM_OPCOES.includes(formPergunta.tipo)">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">{{ formPergunta.tipo === 'checklist' ? 'Itens do checklist' : 'Opções' }}</span>
          <div v-for="(_, i) in formPergunta.opcoes" :key="i" class="flex items-center gap-2 mt-2">
            <input v-model="formPergunta.opcoes[i]" type="text" class="modal-input flex-1" />
            <button type="button" class="text-gray-400 hover:text-danger" @click="formPergunta.opcoes.splice(i, 1)"><Icon name="ph:x-bold" /></button>
          </div>
          <button type="button" class="text-xs font-semibold text-secondary-dark hover:underline mt-2" @click="formPergunta.opcoes.push('')">+ adicionar opção</button>
        </div>
        <label class="field">
          <span>Seção da ficha</span>
          <input v-model="formPergunta.secao" class="modal-input" list="secoes-lista" placeholder="Ex.: Patrimônio" />
          <datalist id="secoes-lista"><option v-for="n in secoesExistentes" :key="n" :value="n" /></datalist>
        </label>
        <label class="field"><span>Ajuda (opcional)</span><input v-model="formPergunta.ajuda" class="modal-input" placeholder="Instrução curta que aparece junto da pergunta" /></label>
        <p v-if="perguntaErro" class="text-sm text-danger">{{ perguntaErro }}</p>
      </form>
      <template #footer>
        <div class="flex flex-col-reverse sm:flex-row gap-3 justify-between">
          <div v-if="perguntaEditando" class="flex flex-wrap gap-2">
            <Button v-if="!perguntaEditando.arquivada" variant="outline" icon="ph:archive-bold" @click="arquivarPergunta">Arquivar</Button>
            <Button v-else variant="outline" icon="ph:arrow-counter-clockwise-bold" @click="restaurarPergunta">Restaurar</Button>
            <Button variant="outline" icon="ph:copy-bold" @click="duplicarPergunta">Duplicar</Button>
            <Button variant="outline" icon="ph:trash-bold" @click="excluirPergunta">Excluir</Button>
          </div>
          <div class="flex gap-3 sm:ml-auto">
            <Button variant="outline" @click="perguntaAberta = false">Cancelar</Button>
            <Button form="pergunta-form" type="submit" :loading="perguntaSalvando" icon="ph:check-bold">Salvar</Button>
          </div>
        </div>
      </template>
    </Modal>

    <!-- Modal: formulário -->
    <Modal :is-open="formAberto" :title="formEditando ? 'Editar formulário' : 'Novo formulário'" description="Escolha as perguntas do banco que vão compor este formulário e a ordem delas." max-width="2xl" :loading="formSalvando" @close="formAberto = false">
      <form id="formulario-form" class="space-y-4" @submit.prevent="salvarFormulario">
        <label class="field"><span>Nome do formulário</span><input v-model="formNome" class="modal-input" placeholder="Ex.: Pré-consulta — Divórcio" required /></label>
        <label class="flex items-center gap-2 text-sm"><input v-model="formAtivo" type="checkbox" class="accent-[#3c2923]" /> Ativo (aparece pra escolher ao enviar)</label>

        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-2">Perguntas selecionadas, na ordem de envio</p>
          <p v-if="!formItens.length" class="text-sm text-gray-400">Nenhuma pergunta selecionada ainda — marque abaixo.</p>
          <div v-for="(item, i) in formItens" :key="item.pergunta_id" class="flex items-center gap-2 py-1.5 border-b border-gray-100 dark:border-zinc-800 last:border-b-0">
            <span class="flex-1 text-sm">{{ perguntaPorId(item.pergunta_id)?.texto }}</span>
            <label class="flex items-center gap-1.5 text-xs text-gray-500"><input v-model="item.obrigatoria" type="checkbox" class="accent-[#3c2923]" /> obrigatória</label>
            <button type="button" class="text-gray-400 hover:text-primary disabled:opacity-30" :disabled="i === 0" @click="moverItem(i, -1)"><Icon name="ph:arrow-up-bold" /></button>
            <button type="button" class="text-gray-400 hover:text-primary disabled:opacity-30" :disabled="i === formItens.length - 1" @click="moverItem(i, 1)"><Icon name="ph:arrow-down-bold" /></button>
            <button type="button" class="text-gray-400 hover:text-danger" @click="alternarPerguntaNoFormulario(item.pergunta_id)"><Icon name="ph:x-bold" /></button>
          </div>
        </div>

        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-2">Adicionar do banco de perguntas</p>
          <div class="flex flex-wrap gap-2">
            <button v-for="p in perguntasParaFormulario.filter(p => !formItens.some(i => i.pergunta_id === p.id))" :key="p.id" type="button" class="chip" @click="alternarPerguntaNoFormulario(p.id)">+ {{ p.texto }}</button>
          </div>
        </div>
        <p v-if="formErro" class="text-sm text-danger">{{ formErro }}</p>
      </form>
      <template #footer>
        <div class="flex flex-col-reverse sm:flex-row gap-3 justify-between">
          <Button v-if="formEditando" variant="outline" icon="ph:trash-bold" @click="excluirFormulario">Excluir</Button>
          <div class="flex gap-3 sm:ml-auto">
            <Button variant="outline" @click="formAberto = false">Cancelar</Button>
            <Button form="formulario-form" type="submit" :loading="formSalvando" icon="ph:check-bold">Salvar</Button>
          </div>
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
