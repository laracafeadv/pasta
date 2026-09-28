<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { definePageMeta, useHead } from '#imports'
import Button from '~/components/Button.vue'
import Modal from '~/components/Modal.vue'
import type { Caso, Contato, DocumentoGerado, DocumentoModelo, Honorario, CategoriaDocumento } from '~~/shared/types/crm'
import { CATEGORIAS_DOCUMENTO, VARIAVEIS_CONHECIDAS } from '~~/shared/types/crm'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Gerador de documentos' })

const CATEGORIAS = Object.entries(CATEGORIAS_DOCUMENTO) as [CategoriaDocumento, string][]
const RECIBO_PADRAO = `Recebi de {{nome_cliente}}, CPF/CNPJ {{cpf_cliente}}, a importância de R$ {{valor}} ({{valor_extenso}}), referente a {{referente_a}}.

Forma de pagamento: {{forma_pagamento}}.

{{cidade_foro}}, {{data_extenso}}.


_______________________________________________
{{nome_advogada}}
Advogada
OAB/{{estado_cliente}} {{oab}}`

const aba = ref<'documentos' | 'modelos'>('documentos')

// ─── Modelos ──────────────────────────────────────────────────────────────
const modelos = ref<DocumentoModelo[]>([])
async function carregarModelos() {
  modelos.value = await $fetch<DocumentoModelo[]>('/api/documento-modelos', { params: { todos: '1' } })
}

const modeloAberto = ref(false)
const modeloSalvando = ref(false)
const modeloErro = ref<string | null>(null)
const modeloEditando = ref<DocumentoModelo | null>(null)
const formModelo = reactive({ nome: '', categoria: 'personalizado' as CategoriaDocumento, descricao: '', conteudo: '', ativo: true })
const textareaModelo = ref<HTMLTextAreaElement | null>(null)

function abrirModelo(m?: DocumentoModelo) {
  modeloEditando.value = m ?? null
  modeloErro.value = null
  formModelo.nome = m?.nome ?? ''
  formModelo.categoria = m?.categoria ?? 'personalizado'
  formModelo.descricao = m?.descricao ?? ''
  formModelo.conteudo = m?.conteudo ?? ''
  formModelo.ativo = m?.ativo ?? true
  modeloAberto.value = true
}
const chaveToken = (token: string) => '{{' + token + '}}'
function inserirVariavelNoModelo(token: string) {
  const el = textareaModelo.value
  const trecho = `{{${token}}}`
  if (!el) { formModelo.conteudo += trecho; return }
  const ini = el.selectionStart ?? formModelo.conteudo.length
  const fim = el.selectionEnd ?? formModelo.conteudo.length
  formModelo.conteudo = formModelo.conteudo.slice(0, ini) + trecho + formModelo.conteudo.slice(fim)
}
async function salvarModelo() {
  modeloSalvando.value = true
  modeloErro.value = null
  try {
    const body = { ...formModelo }
    if (modeloEditando.value) await $fetch(`/api/documento-modelos/${modeloEditando.value.id}`, { method: 'PUT', body })
    else await $fetch('/api/documento-modelos', { method: 'POST', body })
    modeloAberto.value = false
    await carregarModelos()
  } catch (e: any) {
    modeloErro.value = e?.data?.message || 'Não foi possível salvar.'
  } finally {
    modeloSalvando.value = false
  }
}
async function excluirModelo() {
  if (!modeloEditando.value || !confirm(`Excluir o modelo "${modeloEditando.value.nome}"? Documentos já gerados com ele continuam intactos.`)) return
  await $fetch(`/api/documento-modelos/${modeloEditando.value.id}`, { method: 'DELETE' })
  modeloAberto.value = false
  await carregarModelos()
}
async function duplicarModelo(m: DocumentoModelo) {
  await $fetch(`/api/documento-modelos/${m.id}/duplicar`, { method: 'POST' })
  await carregarModelos()
}

// ─── Documentos emitidos ─────────────────────────────────────────────────────
const documentos = ref<DocumentoGerado[]>([])
const buscaDoc = ref('')
const filtroCategoria = ref<CategoriaDocumento | ''>('')
const carregandoDocs = ref(false)
async function carregarDocumentos() {
  carregandoDocs.value = true
  try {
    documentos.value = await $fetch<DocumentoGerado[]>('/api/documentos-gerados', { params: { busca: buscaDoc.value || undefined, categoria: filtroCategoria.value || undefined } })
  } finally {
    carregandoDocs.value = false
  }
}
async function excluirDocumento(d: DocumentoGerado) {
  if (!confirm(`Excluir "${d.nome}" do histórico?`)) return
  await $fetch(`/api/documentos-gerados/${d.id}`, { method: 'DELETE' })
  await carregarDocumentos()
}
function baixarDocumento(id: number) {
  window.location.href = `/api/documentos-gerados/${id}/baixar`
}
function dataHora(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── Gerar documento ──────────────────────────────────────────────────────────
const geradorAberto = ref(false)
const gerando = ref(false)
const geradorErro = ref<string | null>(null)

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
  casoId.value = null
  honorarioId.value = null
  carregarCasosEHonorarios()
}
function limparContatoSelecionado() {
  contatoSelecionado.value = null
  contatoQuery.value = ''
  casos.value = []
  honorarios.value = []
}

const casos = ref<Caso[]>([])
const honorarios = ref<Honorario[]>([])
const casoId = ref<number | null>(null)
const honorarioId = ref<number | null>(null)
async function carregarCasosEHonorarios() {
  if (!contatoSelecionado.value) return
  const [c, h] = await Promise.all([
    $fetch<Caso[]>('/api/casos', { params: { contato: contatoSelecionado.value.id } }),
    $fetch<{ honorarios: Honorario[] }>('/api/honorarios', { params: { contato: contatoSelecionado.value.id } }),
  ])
  casos.value = c
  honorarios.value = h.honorarios
}

const categoria = ref<CategoriaDocumento>('personalizado')
const modeloId = ref<number | null>(null)
const modelosDaCategoria = computed(() => modelos.value.filter(m => m.categoria === categoria.value))
const conteudoBase = ref('')
const nomeDocumento = ref('')

watch(categoria, () => {
  modeloId.value = modelosDaCategoria.value[0]?.id ?? null
})
watch(modeloId, () => {
  const m = modelos.value.find(x => x.id === modeloId.value)
  conteudoBase.value = m?.conteudo ?? (categoria.value === 'recibo' && !modelosDaCategoria.value.length ? RECIBO_PADRAO : '')
  nomeDocumento.value = m ? `${CATEGORIAS_DOCUMENTO[categoria.value]} — ${contatoSelecionado.value?.nome ?? ''}` : nomeDocumento.value
})

const dados = ref<Record<string, string>>({})
const variaveisNoTexto = computed(() => {
  const encontradas = new Set<string>()
  for (const m of conteudoBase.value.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/gi)) encontradas.add(m[1]!.toLowerCase())
  return [...encontradas]
})
async function atualizarDados() {
  if (!contatoSelecionado.value) return
  const r = await $fetch<Record<string, string>>('/api/documentos-gerados/dados', {
    params: { contato_id: contatoSelecionado.value.id, caso_id: casoId.value || undefined, honorario_id: honorarioId.value || undefined },
  })
  dados.value = { ...r, ...dados.value }
  for (const k of variaveisNoTexto.value) if (dados.value[k] === undefined) dados.value[k] = r[k] ?? ''
}
watch([contatoSelecionado, casoId, honorarioId, conteudoBase], atualizarDados)

const previewTexto = ref('')
let debouncePreview: ReturnType<typeof setTimeout> | undefined
watch([conteudoBase, dados], () => {
  clearTimeout(debouncePreview)
  debouncePreview = setTimeout(async () => {
    previewTexto.value = (await $fetch<{ texto: string }>('/api/documentos-gerados/preview', { method: 'POST', body: { conteudo: conteudoBase.value, dados: dados.value } })).texto
  }, 250)
}, { deep: true })

function abrirGerador() {
  geradorErro.value = null
  contatoQuery.value = ''; contatoSelecionado.value = null; contatoResultados.value = []
  casos.value = []; honorarios.value = []; casoId.value = null; honorarioId.value = null
  categoria.value = 'personalizado'; modeloId.value = null; conteudoBase.value = ''; nomeDocumento.value = ''
  dados.value = {}; previewTexto.value = ''
  geradorAberto.value = true
}
async function gerarDocumento() {
  if (!contatoSelecionado.value) { geradorErro.value = 'Escolha o cliente.'; return }
  if (!nomeDocumento.value.trim()) { geradorErro.value = 'Dê um nome para o documento.'; return }
  if (!conteudoBase.value.trim()) { geradorErro.value = 'O documento está vazio — escreva o conteúdo ou escolha um modelo.'; return }
  gerando.value = true
  geradorErro.value = null
  try {
    const honorarioSelecionado = honorarios.value.find(h => h.id === honorarioId.value)
    const { id } = await $fetch<{ id: number }>('/api/documentos-gerados', {
      method: 'POST',
      body: {
        modelo_id: modeloId.value, nome: nomeDocumento.value.trim(), categoria: categoria.value,
        contato_id: contatoSelecionado.value.id, caso_id: casoId.value, honorario_id: honorarioId.value,
        valor: honorarioSelecionado?.valor ?? null, dados: dados.value, conteudo_final: previewTexto.value,
      },
    })
    geradorAberto.value = false
    await carregarDocumentos()
    baixarDocumento(id)
  } catch (e: any) {
    geradorErro.value = e?.data?.message || 'Não foi possível gerar o documento.'
  } finally {
    gerando.value = false
  }
}

onMounted(async () => {
  await Promise.all([carregarModelos(), carregarDocumentos()])
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Peças e documentos</p>
        <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Gerador de documentos</h1>
        <p class="text-sm text-gray-500 mt-2 max-w-2xl">
          Escolha o cliente e o tipo de documento — os dados que já estão no CRM (qualificação, caso, honorário) preenchem
          sozinhos as variáveis do modelo. Revise, veja a prévia e gere o .docx.
        </p>
      </div>
      <Button icon="ph:file-plus-bold" @click="abrirGerador">Gerar documento</Button>
    </div>

    <div class="flex gap-2">
      <button type="button" class="tab-btn" :class="{ 'tab-btn-ativo': aba === 'documentos' }" @click="aba = 'documentos'">Documentos emitidos</button>
      <button type="button" class="tab-btn" :class="{ 'tab-btn-ativo': aba === 'modelos' }" @click="aba = 'modelos'">Modelos</button>
    </div>

    <!-- DOCUMENTOS EMITIDOS -->
    <div v-if="aba === 'documentos'" class="space-y-4">
      <div class="flex flex-wrap gap-2 items-center">
        <input v-model="buscaDoc" type="search" class="rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm" placeholder="Buscar por nome do documento…" @keyup.enter="carregarDocumentos" />
        <select v-model="filtroCategoria" class="rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm" @change="carregarDocumentos">
          <option value="">Todos os tipos</option>
          <option v-for="[valor, nome] in CATEGORIAS" :key="valor" :value="valor">{{ nome }}</option>
        </select>
        <Button size="sm" variant="outline" @click="carregarDocumentos">Filtrar</Button>
      </div>

      <p v-if="carregandoDocs" class="text-sm text-gray-400">Carregando…</p>
      <p v-else-if="!documentos.length" class="text-sm text-gray-400">Nenhum documento gerado ainda.</p>

      <div v-else class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-secondary/10 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr><th class="px-4 py-3">Documento</th><th class="px-4 py-3">Tipo</th><th class="px-4 py-3">Cliente</th><th class="px-4 py-3">Data</th><th class="px-4 py-3" /></tr>
          </thead>
          <tbody>
            <tr v-for="d in documentos" :key="d.id" class="border-t border-gray-100 dark:border-zinc-800">
              <td class="px-4 py-3 font-medium text-primary dark:text-zinc-100">{{ d.nome }}</td>
              <td class="px-4 py-3 text-gray-500">{{ CATEGORIAS_DOCUMENTO[d.categoria] }}</td>
              <td class="px-4 py-3">{{ d.contato_nome ?? '—' }}</td>
              <td class="px-4 py-3 text-gray-500">{{ dataHora(d.created_at) }}</td>
              <td class="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                <button class="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="baixarDocumento(d.id)">Baixar</button>
                <button class="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-danger hover:text-danger" @click="excluirDocumento(d)">Excluir</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODELOS -->
    <div v-else class="space-y-4">
      <div class="flex justify-end"><Button icon="ph:plus-bold" @click="abrirModelo()">Novo modelo</Button></div>
      <p v-if="!modelos.length" class="text-sm text-gray-400">Nenhum modelo ainda.</p>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article v-for="m in modelos" :key="m.id" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border-l-[3px] border-secondary border-y border-r border-gray-200/70 dark:border-zinc-800 p-5 flex flex-col gap-2" :class="{ 'opacity-50': !m.ativo }">
          <header class="flex items-baseline justify-between gap-3">
            <p class="font-semibold">{{ m.nome }} <span v-if="!m.ativo" class="text-xs text-gray-400">(inativo)</span></p>
            <span class="text-xs text-gray-400">{{ CATEGORIAS_DOCUMENTO[m.categoria] }}</span>
          </header>
          <p v-if="m.descricao" class="text-sm text-gray-500">{{ m.descricao }}</p>
          <div class="flex gap-2 mt-1">
            <button class="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="abrirModelo(m)">Editar</button>
            <button class="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="duplicarModelo(m)">Duplicar</button>
          </div>
        </article>
      </div>
    </div>

    <!-- Modal: modelo -->
    <Modal :is-open="modeloAberto" :title="modeloEditando ? 'Editar modelo' : 'Novo modelo'" max-width="2xl" :loading="modeloSalvando" @close="modeloAberto = false">
      <form id="modelo-doc-form" class="space-y-4" @submit.prevent="salvarModelo">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label class="field"><span>Nome do modelo</span><input v-model="formModelo.nome" class="modal-input" required /></label>
          <label class="field">
            <span>Tipo de documento</span>
            <select v-model="formModelo.categoria" class="modal-input">
              <option v-for="[valor, nome] in CATEGORIAS" :key="valor" :value="valor">{{ nome }}</option>
            </select>
          </label>
        </div>
        <label class="field"><span>Descrição (opcional)</span><input v-model="formModelo.descricao" class="modal-input" /></label>
        <div>
          <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Inserir variável</span>
          <div class="flex flex-wrap gap-1.5 mt-1.5 mb-2">
            <button v-for="(desc, token) in VARIAVEIS_CONHECIDAS" :key="token" type="button" class="chip" :title="desc" @click="inserirVariavelNoModelo(token)">{{ chaveToken(token) }}</button>
          </div>
          <textarea ref="textareaModelo" v-model="formModelo.conteudo" rows="12" class="modal-input font-mono text-xs" required placeholder="Escreva o texto do documento. Use **negrito**, # Título e - item de lista. Insira variáveis com os botões acima." />
          <p class="text-xs text-gray-400 mt-1">Formatação simples: <code>**negrito**</code>, linha começando com <code># </code> vira título, e com <code>- </code> vira item de lista.</p>
        </div>
        <label class="flex items-center gap-2 text-sm"><input v-model="formModelo.ativo" type="checkbox" class="accent-[#3c2923]" /> Ativo (aparece pra escolher ao gerar)</label>
        <p v-if="modeloErro" class="text-sm text-danger">{{ modeloErro }}</p>
      </form>
      <template #footer>
        <div class="flex flex-col-reverse sm:flex-row gap-3 justify-between">
          <Button v-if="modeloEditando" variant="outline" icon="ph:trash-bold" @click="excluirModelo">Excluir</Button>
          <div class="flex gap-3 sm:ml-auto">
            <Button variant="outline" @click="modeloAberto = false">Cancelar</Button>
            <Button form="modelo-doc-form" type="submit" :loading="modeloSalvando" icon="ph:check-bold">Salvar</Button>
          </div>
        </div>
      </template>
    </Modal>

    <!-- Modal: gerar documento -->
    <Modal :is-open="geradorAberto" title="Gerar documento" max-width="4xl" :loading="gerando" @close="geradorAberto = false">
      <div class="p-5 space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="field relative">
            <span>Cliente</span>
            <div v-if="contatoSelecionado" class="modal-input flex items-center justify-between">
              <span class="truncate">{{ contatoSelecionado.nome }}</span>
              <button type="button" class="text-gray-400 hover:text-danger shrink-0 ml-2" @click="limparContatoSelecionado"><Icon name="ph:x-bold" /></button>
            </div>
            <input v-else v-model="contatoQuery" type="text" class="modal-input" placeholder="Buscar por nome…" />
            <div v-if="contatoResultados.length" class="absolute z-20 top-full left-0 right-0 mt-1 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-lg max-h-56 overflow-y-auto">
              <button v-for="c in contatoResultados" :key="c.id" type="button" class="w-full text-left px-3 py-2 text-sm hover:bg-secondary/10" @click="escolherContato(c)">{{ c.nome }}</button>
            </div>
          </div>
          <label class="field">
            <span>Tipo de documento</span>
            <select v-model="categoria" class="modal-input">
              <option v-for="[valor, nome] in CATEGORIAS" :key="valor" :value="valor">{{ nome }}</option>
            </select>
          </label>
          <label class="field">
            <span>Modelo</span>
            <select v-model="modeloId" class="modal-input" :disabled="!modelosDaCategoria.length && categoria !== 'recibo'">
              <option :value="null" v-if="!modelosDaCategoria.length">{{ categoria === 'recibo' ? 'Recibo padrão' : 'Nenhum modelo — crie um em Modelos' }}</option>
              <option v-for="m in modelosDaCategoria" :key="m.id" :value="m.id">{{ m.nome }}</option>
            </select>
          </label>
        </div>

        <div v-if="contatoSelecionado" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label class="field">
            <span>Caso vinculado (opcional)</span>
            <select v-model="casoId" class="modal-input">
              <option :value="null">Nenhum</option>
              <option v-for="c in casos" :key="c.id" :value="c.id">{{ c.titulo }}{{ c.numero_processo ? ` — ${c.numero_processo}` : '' }}</option>
            </select>
          </label>
          <label class="field">
            <span>Honorário vinculado (opcional)</span>
            <select v-model="honorarioId" class="modal-input">
              <option :value="null">Nenhum</option>
              <option v-for="h in honorarios" :key="h.id" :value="h.id">{{ h.tipo }} — R$ {{ h.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</option>
            </select>
          </label>
        </div>

        <label class="field"><span>Nome do documento</span><input v-model="nomeDocumento" class="modal-input" placeholder="Ex.: Recibo de honorários — Maria Silva" /></label>

        <div v-if="conteudoBase" class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div class="space-y-2">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Dados</p>
            <div v-if="!variaveisNoTexto.length" class="text-sm text-gray-400">Este modelo não usa variáveis — o texto vai igual pra todos.</div>
            <label v-for="token in variaveisNoTexto" :key="token" class="field">
              <span>{{ VARIAVEIS_CONHECIDAS[token] ?? token }}</span>
              <input v-model="dados[token]" class="modal-input" />
            </label>
          </div>
          <div class="space-y-2">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Prévia</p>
            <div class="rounded-2xl bg-white border border-gray-200 p-5 text-sm whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto" style="font-family: 'Times New Roman', serif;">{{ previewTexto || '(prévia aparece aqui)' }}</div>
          </div>
        </div>

        <p v-if="geradorErro" class="text-sm text-danger">{{ geradorErro }}</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="geradorAberto = false">Cancelar</Button>
          <Button :loading="gerando" icon="ph:file-arrow-down-bold" @click="gerarDocumento">Gerar documento</Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
.chip { @apply text-[10px] font-mono px-2 py-1 rounded-full border border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:border-primary hover:text-primary dark:hover:text-white transition-colors; }
.tab-btn { @apply text-sm font-semibold px-4 py-2 rounded-full border border-gray-300 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:text-primary dark:hover:text-white transition-colors; }
.tab-btn-ativo { @apply bg-primary text-white border-primary; }
</style>
