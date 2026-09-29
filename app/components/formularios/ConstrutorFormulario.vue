<template>
  <div v-if="carregando" class="text-sm text-gray-400 p-6">Carregando formulário…</div>
  <div v-else-if="erroCarregar" class="p-6 text-sm text-danger">{{ erroCarregar }} <NuxtLink to="/formularios" class="underline">Voltar</NuxtLink></div>

  <div v-else-if="form" class="max-w-3xl mx-auto pb-32" data-testid="construtor">
    <!-- Barra superior: voltar · Editar/Visualizar · Salvar -->
    <div class="sticky top-0 z-20 -mx-4 px-4 py-3 mb-4 bg-[#edeae2]/95 dark:bg-zinc-950/95 backdrop-blur border-b border-gray-200/70 dark:border-zinc-800 flex flex-wrap items-center gap-3">
      <NuxtLink to="/formularios" class="text-sm text-gray-500 hover:text-primary flex items-center gap-1"><Icon name="ph:arrow-left-bold" /> Formulários</NuxtLink>
      <div class="flex rounded-full border border-gray-300 dark:border-zinc-700 overflow-hidden text-xs font-semibold uppercase tracking-wider mx-auto" role="tablist">
        <button type="button" role="tab" class="px-4 py-1.5" :class="modo === 'editar' ? 'bg-primary text-white' : 'text-gray-500'" data-testid="modo-editar" @click="modo = 'editar'">Editar</button>
        <button type="button" role="tab" class="px-4 py-1.5" :class="modo === 'visualizar' ? 'bg-primary text-white' : 'text-gray-500'" data-testid="modo-visualizar" @click="abrirPrevia">Visualizar</button>
      </div>
      <span v-if="mensagem" class="text-xs" :class="mensagem.erro ? 'text-danger' : 'text-success-dark'" data-testid="mensagem">{{ mensagem.texto }}</span>
      <span v-else-if="sujo" class="text-xs text-warning-dark" data-testid="nao-salvo">Alterações não salvas</span>
      <Button :loading="salvando" :disabled="!sujo && !!form.id" icon="ph:floppy-disk-bold" data-testid="salvar" @click="salvar">Salvar alterações</Button>
    </div>

    <!-- ═════ VISUALIZAR ═════ -->
    <div v-if="modo === 'visualizar'" class="space-y-4" data-testid="painel-previa">
      <div class="rounded-2xl border border-secondary/40 bg-secondary/10 p-3 text-xs text-center font-semibold text-secondary-dark">Prévia — é assim que quem preenche vê o formulário. Nada aqui é enviado ou salvo.</div>
      <section class="card border-t-8 !border-t-secondary space-y-1">
        <h1 class="text-3xl text-primary dark:text-zinc-100">{{ form.nome || 'Formulário sem título' }}</h1>
        <p v-if="form.descricao" class="text-sm text-gray-500 whitespace-pre-line">{{ form.descricao }}</p>
      </section>
      <FormularioPreenchimento :key="chavePrevia" v-model="respostasPrevia" :secoes="secoesLimpas" rotulo-enviar="Enviar (só prévia)" @enviar="previaEnviada = true" />
      <p v-if="previaEnviada" class="text-sm text-success-dark text-center">Prévia concluída: todas as obrigatórias foram respondidas. Nada foi enviado.</p>
      <div class="text-center"><button type="button" class="text-xs underline text-gray-500" @click="reiniciarPrevia">Limpar respostas da prévia</button></div>
    </div>

    <!-- ═════ EDITAR ═════ -->
    <div v-else class="space-y-4">
      <!-- Título e contexto -->
      <section class="card border-t-8 !border-t-primary space-y-3" data-testid="cabecalho-form">
        <input v-model="form.nome" class="w-full bg-transparent text-3xl text-primary dark:text-zinc-100 border-b border-transparent hover:border-gray-300 focus:border-primary outline-none pb-1" placeholder="Título do formulário" data-testid="form-titulo" />
        <textarea v-model="form.descricao" rows="2" class="w-full bg-transparent text-sm text-gray-600 dark:text-zinc-300 border-b border-transparent hover:border-gray-300 focus:border-primary outline-none resize-none" placeholder="Descrição do formulário (opcional)" data-testid="form-descricao" />
        <div class="pt-2 border-t border-gray-100 dark:border-zinc-800 space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Vale para</span>
            <button v-for="(c, k) in CONTEXTOS" :key="k" type="button" class="chip" :class="{ 'bg-primary text-white border-primary': form.contexto === k }" :data-testid="`ctx-${k}`" :title="c.dica" @click="form.contexto = k">{{ c.nome }}</button>
            <label class="ml-auto flex items-center gap-2 text-xs text-gray-500 cursor-pointer"><input v-model="form.ativo" type="checkbox" class="accent-[#3c2923]" data-testid="form-ativo" /> Ativo</label>
          </div>
          <p class="text-xs text-gray-400">{{ CONTEXTOS[form.contexto].dica }}</p>
          <div v-if="form.contexto === 'demanda'" class="space-y-1.5">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Só para estes serviços <span class="normal-case tracking-normal font-normal text-gray-400">(nenhum marcado = todas as demandas)</span></span>
            <div class="flex flex-wrap gap-1.5">
              <label v-for="pr in PROCEDIMENTOS" :key="pr.valor" class="text-xs px-2.5 py-1 rounded-full border cursor-pointer" :class="form.procedimentos.includes(pr.valor) ? 'bg-secondary/20 border-secondary' : 'border-gray-300 dark:border-zinc-700'">
                <input v-model="form.procedimentos" type="checkbox" :value="pr.valor" class="sr-only" />{{ pr.rotulo }}
              </label>
            </div>
          </div>
        </div>
      </section>

      <p v-if="problema" class="rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm p-3" data-testid="problema"><Icon name="ph:warning-bold" class="align-middle" /> {{ problema }}</p>

      <!-- Seções -->
      <section
        v-for="(s, si) in form.secoes" :key="s.key" class="space-y-3" :data-testid="`secao-${si}`"
        @dragover="sobreSecao(si, $event)" @drop="soltar($event)"
      >
        <div class="rounded-t-2xl rounded-b-lg bg-primary text-white px-4 py-2 flex flex-wrap items-center gap-2" :class="arrastoSecao === si ? 'opacity-50' : ''" @dragover="sobreCabecalhoSecao(si, $event)" @drop.prevent="soltarSecao(si)">
          <span class="cursor-grab" draggable="true" title="Arraste para reordenar a seção" data-testid="alca-secao" @dragstart="arrastoSecao = si; $event.dataTransfer?.setData('text/plain', 'secao')" @dragend="arrastoSecao = null"><Icon name="ph:dots-six-bold" /></span>
          <span class="text-xs uppercase tracking-widest opacity-80">Seção {{ si + 1 }} de {{ form.secoes.length }}</span>
          <div class="ml-auto flex items-center gap-1">
            <button type="button" class="acao-sec" title="Subir seção" :disabled="si === 0" data-testid="secao-subir" @click="moverSecao(si, -1)"><Icon name="ph:arrow-up-bold" /></button>
            <button type="button" class="acao-sec" title="Descer seção" :disabled="si === form.secoes.length - 1" data-testid="secao-descer" @click="moverSecao(si, 1)"><Icon name="ph:arrow-down-bold" /></button>
            <button type="button" class="acao-sec" title="Duplicar seção" data-testid="secao-duplicar" @click="duplicarSecao(si)"><Icon name="ph:copy-bold" /></button>
            <button type="button" class="acao-sec" title="Excluir seção" data-testid="secao-excluir" @click="excluirSecao(si)"><Icon name="ph:trash-bold" /></button>
          </div>
        </div>
        <div class="card !p-4 space-y-2">
          <input v-model="s.titulo" class="w-full bg-transparent text-xl text-primary dark:text-zinc-100 border-b border-transparent hover:border-gray-300 focus:border-primary outline-none" placeholder="Título da seção" data-testid="secao-titulo" />
          <input v-model="s.descricao" class="w-full bg-transparent text-xs text-gray-500 border-b border-transparent hover:border-gray-300 focus:border-primary outline-none" placeholder="Descrição da seção (opcional)" />
          <details v-if="si > 0" :open="!!s.mostrar_se" class="text-xs">
            <summary class="cursor-pointer font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5" data-testid="secao-logica"><Icon name="ph:git-branch-bold" /> Mostrar esta seção só se… <span v-if="s.mostrar_se" class="normal-case tracking-normal font-normal text-secondary-dark">· ativa</span></summary>
            <div class="mt-2"><CondicaoEditor :model-value="s.mostrar_se" :anteriores="anterioresDaSecao(si)" @update:model-value="v => (s.mostrar_se = v)" /></div>
          </details>
        </div>

        <!-- Perguntas da seção -->
        <div class="space-y-3" :data-testid="`itens-${si}`">
          <template v-for="(p, i) in s.itens" :key="p.pergunta_id">
            <div v-if="alvo && alvo.si === si && alvo.i === i && arrasto" class="h-1.5 rounded-full bg-secondary" />
            <div @dragover="sobreItem(si, i, $event)" @drop="soltar($event)">
              <PerguntaCard
                :item="p" :ativa="selecionada === p.pergunta_id" :anteriores="anterioresDe(si, i)" :invalida="invalidaDe(si, i)" :arrastando="!!arrasto && arrasto.si === si && arrasto.i === i"
                :pode-subir="si > 0 || i > 0" :pode-descer="si < form.secoes.length - 1 || i < s.itens.length - 1"
                @selecionar="selecionada = p.pergunta_id" @duplicar="duplicarPergunta(si, i)" @excluir="excluirPergunta(si, i)" @mover="d => moverPergunta(si, i, d)"
                @dragstart="e => iniciarArrasto(si, i, e)" @dragend="arrasto = null; alvo = null"
              />
            </div>
          </template>
          <div v-if="alvo && alvo.si === si && alvo.i === s.itens.length && arrasto" class="h-1.5 rounded-full bg-secondary" />
          <p v-if="!s.itens.length" class="text-sm text-gray-400 text-center border border-dashed border-gray-300 dark:border-zinc-700 rounded-2xl py-6">Seção vazia. Adicione perguntas ou arraste uma pergunta para cá.</p>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="chip" :data-testid="`add-pergunta-${si}`" @click="adicionarPergunta(si)"><Icon name="ph:plus-bold" /> Nova pergunta</button>
            <button type="button" class="chip" :data-testid="`add-existente-${si}`" @click="abrirBanco(si)"><Icon name="ph:books-bold" /> Usar pergunta existente</button>
          </div>
        </div>
      </section>

      <div class="flex flex-wrap gap-2 justify-center pt-2">
        <button type="button" class="chip" data-testid="add-secao" @click="adicionarSecao"><Icon name="ph:rows-bold" /> Adicionar seção</button>
      </div>

      <p v-if="form.contexto !== 'demanda'" class="text-xs text-gray-500 text-center pt-4"><Icon name="ph:paper-plane-tilt-bold" class="align-middle" /> Para enviar: abra a ficha da pessoa (Clientes ou Leads) → aba <b>Cliente</b> → <b>Enviar formulário</b>. Salve antes de enviar.</p>
      <p v-else class="text-xs text-gray-500 text-center pt-4">Formulário de demanda: preenchido na ficha, dentro de cada demanda (não é enviado por link).</p>

      <div v-if="form.id" class="flex flex-wrap gap-2 justify-between pt-8 border-t border-gray-200 dark:border-zinc-800 mt-8">
        <button type="button" class="chip" data-testid="duplicar-form" @click="duplicarFormulario"><Icon name="ph:copy-bold" /> Duplicar formulário</button>
        <button type="button" class="chip hover:!text-danger hover:!border-danger" data-testid="excluir-form" @click="excluirFormulario"><Icon name="ph:trash-bold" /> Excluir formulário</button>
      </div>
    </div>

    <!-- Modal: reaproveitar pergunta do banco -->
    <Modal :is-open="bancoAberto" title="Usar uma pergunta que já existe" description="Perguntas já criadas em outros formulários. A resposta é a mesma em todos: quem já respondeu não precisa responder de novo." max-width="lg" @close="bancoAberto = false">
      <div class="p-4 space-y-3">
        <input v-model="buscaBanco" type="search" class="modal-input" placeholder="Buscar pergunta…" data-testid="banco-busca" />
        <p v-if="!bancoFiltrado.length" class="text-sm text-gray-400">Nenhuma pergunta disponível para este contexto.</p>
        <button v-for="p in bancoFiltrado" :key="p.id" type="button" class="w-full text-left rounded-xl border border-gray-200 dark:border-zinc-700 hover:border-primary p-3" :data-testid="`banco-item-${p.id}`" @click="usarDoBanco(p)">
          <p class="text-sm font-medium">{{ p.texto }}</p>
          <p class="text-xs text-gray-400">{{ TIPO(p.tipo)?.nome }}<span v-if="p.opcoes.length"> — {{ p.opcoes.join(', ') }}</span></p>
        </button>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { navigateTo } from '#imports'
import Button from '../Button.vue'
import Modal from '../Modal.vue'
import PerguntaCard, { type ItemEditavel } from './PerguntaCard.vue'
import CondicaoEditor, { type PerguntaAnterior } from './CondicaoEditor.vue'
import FormularioPreenchimento from './FormularioPreenchimento.vue'
import { CONTEXTOS, TIPO, operadorValido, podeCondicionar, validarCondicoes, tipoComOpcoes, type Condicao, type ContextoFormulario, type SecaoForm, type Valor } from '../../../shared/data/formulario'
import { PROCEDIMENTOS } from '../../../shared/data/checklist'
import type { FormularioPergunta } from '../../../shared/types/crm'

interface SecaoEditavel { key: string; id: number | null; titulo: string; descricao: string | null; mostrar_se: Condicao | null; itens: ItemEditavel[] }
interface FormEditavel { id: number | null; nome: string; descricao: string | null; contexto: ContextoFormulario; procedimentos: string[]; ativo: boolean; secoes: SecaoEditavel[] }

const props = defineProps<{ id: number }>()

const form = ref<FormEditavel | null>(null)
const carregando = ref(true)
const erroCarregar = ref<string | null>(null)
const modo = ref<'editar' | 'visualizar'>('editar')
const selecionada = ref<number | null>(null)
const salvando = ref(false)
const mensagem = ref<{ texto: string; erro: boolean } | null>(null)
const original = ref('')

// ─── Carregar / salvar ────────────────────────────────────────────────────────
let contadorSecao = 0
let contadorRascunho = 0
const novoIdPergunta = () => --contadorRascunho
const novaChave = () => `s${++contadorSecao}`

async function carregar(manterSelecao = false) {
  try {
    const d = await $fetch<any>(`/api/formularios/${props.id}`)
    form.value = { id: d.id, nome: d.nome, descricao: d.descricao, contexto: d.contexto, procedimentos: d.procedimentos ?? [], ativo: d.ativo, secoes: d.secoes.map((s: any) => ({ key: novaChave(), id: s.id, titulo: s.titulo, descricao: s.descricao, mostrar_se: s.mostrar_se, itens: s.itens })) }
    original.value = instantaneo()
    if (!manterSelecao) selecionada.value = form.value.secoes.flatMap(s => s.itens)[0]?.pergunta_id ?? null
  } catch (e: any) {
    erroCarregar.value = e?.data?.message || 'Não foi possível carregar o formulário.'
  } finally {
    carregando.value = false
  }
}

const limparOpcoes = (o: string[]) => o.map(x => x.trim()).filter(Boolean)
function corpo() {
  const f = form.value!
  return {
    nome: f.nome, descricao: f.descricao, contexto: f.contexto, procedimentos: f.contexto === 'demanda' ? f.procedimentos : [], ativo: f.ativo,
    secoes: f.secoes.map(s => ({ id: s.id, titulo: s.titulo, descricao: s.descricao, mostrar_se: s.mostrar_se, itens: s.itens.map(p => ({ pergunta_id: p.pergunta_id, texto: p.texto, tipo: p.tipo, opcoes: tipoComOpcoes(p.tipo) ? limparOpcoes(p.opcoes) : [], ajuda: p.ajuda, obrigatoria: p.obrigatoria, mostrar_se: p.mostrar_se })) })),
  }
}
const instantaneo = () => (form.value ? JSON.stringify(corpo()) : '')
const sujo = computed(() => !!form.value && instantaneo() !== original.value)

async function salvar() {
  if (!form.value) return
  if (problema.value) { mensagem.value = { texto: problema.value, erro: true }; return }
  salvando.value = true
  mensagem.value = null
  try {
    const r = await $fetch<{ criadas: number; excluidas: number; arquivadas: number }>(`/api/formularios/${props.id}`, { method: 'PUT', body: corpo() })
    await carregar(true)
    // A seleção aponta para ids de rascunho (negativos): depois de salvar, seleciona a primeira pergunta.
    if (!form.value?.secoes.some(s => s.itens.some(i => i.pergunta_id === selecionada.value))) selecionada.value = form.value?.secoes.flatMap(s => s.itens)[0]?.pergunta_id ?? null
    const extra = [r.arquivadas ? `${r.arquivadas} pergunta(s) com respostas foram arquivadas (histórico preservado)` : '', r.excluidas ? `${r.excluidas} pergunta(s) sem respostas foram excluídas` : ''].filter(Boolean).join('; ')
    mensagem.value = { texto: `Salvo.${extra ? ' ' + extra + '.' : ''}`, erro: false }
    setTimeout(() => { mensagem.value = null }, 6000)
  } catch (e: any) {
    mensagem.value = { texto: e?.data?.message || 'Não foi possível salvar.', erro: true }
  } finally {
    salvando.value = false
  }
}

// ─── Validação da lógica (em tempo real) ───────────────────────────────────────
const secoesLimpas = computed<SecaoForm[]>(() => (form.value?.secoes ?? []).map(s => ({ id: s.id, titulo: s.titulo, descricao: s.descricao, mostrar_se: s.mostrar_se, itens: s.itens.map(p => ({ pergunta_id: p.pergunta_id, texto: p.texto, tipo: p.tipo, opcoes: limparOpcoes(p.opcoes), ajuda: p.ajuda, obrigatoria: p.obrigatoria, mostrar_se: p.mostrar_se })) })))
const problema = computed(() => (form.value ? validarCondicoes(secoesLimpas.value) : null))
function invalidaDe(si: number, i: number): string | null {
  const p = form.value!.secoes[si]!.itens[i]!
  if (!p.mostrar_se) return null
  const ant = new Map(anterioresDe(si, i).map(a => [a.pergunta_id, a]))
  for (const r of p.mostrar_se.regras) {
    const a = ant.get(r.pergunta_id)
    if (!a) return 'A condição usa uma pergunta que agora vem depois desta (ou foi removida). Ajuste a lógica.'
    if (!podeCondicionar(a.tipo) || !operadorValido(a.tipo, r.operador)) return 'A condição não vale mais para o tipo da pergunta escolhida. Ajuste a lógica.'
  }
  return null
}

// ─── Perguntas anteriores (para condições) ─────────────────────────────────────
const paraAnterior = (p: ItemEditavel): PerguntaAnterior => ({ pergunta_id: p.pergunta_id, texto: p.texto, tipo: p.tipo, opcoes: limparOpcoes(p.opcoes) })
function anterioresDe(si: number, i: number): PerguntaAnterior[] {
  const f = form.value!
  return [...f.secoes.slice(0, si).flatMap(s => s.itens), ...f.secoes[si]!.itens.slice(0, i)].map(paraAnterior)
}
const anterioresDaSecao = (si: number): PerguntaAnterior[] => form.value!.secoes.slice(0, si).flatMap(s => s.itens).map(paraAnterior)

// Remove de todas as condições as regras que dependiam de perguntas apagadas.
function limparReferencias(ids: Set<number>) {
  const filtra = (c: Condicao | null): Condicao | null => {
    if (!c) return null
    const regras = c.regras.filter(r => !ids.has(r.pergunta_id))
    return regras.length ? { ...c, regras } : null
  }
  for (const s of form.value!.secoes) { s.mostrar_se = filtra(s.mostrar_se); for (const p of s.itens) p.mostrar_se = filtra(p.mostrar_se) }
}

// ─── Perguntas: adicionar, duplicar, excluir, mover ────────────────────────────
function rolarPara(id: number) { nextTick(() => document.querySelector(`[data-testid="card-${(form.value!.secoes.flatMap(s => s.itens).find(i => i.pergunta_id === id)?.texto) || 'nova'}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })) }
function adicionarPergunta(si: number) {
  const s = form.value!.secoes[si]!
  const id = novoIdPergunta()
  const idxSel = s.itens.findIndex(p => p.pergunta_id === selecionada.value)
  s.itens.splice(idxSel >= 0 ? idxSel + 1 : s.itens.length, 0, { pergunta_id: id, texto: '', tipo: 'texto_curto', opcoes: [], ajuda: null, obrigatoria: false, mostrar_se: null, respostas: 0, usada_em: [] })
  selecionada.value = id
  rolarPara(id)
}
function duplicarPergunta(si: number, i: number) {
  const s = form.value!.secoes[si]!
  const o = s.itens[i]!
  const id = novoIdPergunta()
  s.itens.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(o)), pergunta_id: id, respostas: 0, usada_em: [] })
  selecionada.value = id
}
function excluirPergunta(si: number, i: number) {
  const s = form.value!.secoes[si]!
  const p = s.itens[i]!
  const aviso = p.pergunta_id > 0 && p.respostas
    ? `A pergunta "${p.texto}" tem ${p.respostas} resposta(s) guardada(s). Ela sai do formulário, mas fica ARQUIVADA e as respostas continuam visíveis na ficha (histórico). Continuar?`
    : `Excluir a pergunta "${p.texto || 'sem texto'}"?`
  if (!confirm(aviso)) return
  s.itens.splice(i, 1)
  limparReferencias(new Set([p.pergunta_id]))
  if (selecionada.value === p.pergunta_id) selecionada.value = s.itens[Math.min(i, s.itens.length - 1)]?.pergunta_id ?? null
}
function moverPergunta(si: number, i: number, dir: -1 | 1) {
  const f = form.value!
  const [p] = f.secoes[si]!.itens.splice(i, 1)
  const j = i + dir
  if (j >= 0 && j <= f.secoes[si]!.itens.length) f.secoes[si]!.itens.splice(j, 0, p!)
  else if (dir < 0 && si > 0) f.secoes[si - 1]!.itens.push(p!)
  else if (dir > 0 && si < f.secoes.length - 1) f.secoes[si + 1]!.itens.unshift(p!)
  else f.secoes[si]!.itens.splice(i, 0, p!)
}

// ─── Arrastar e soltar (perguntas entre posições e seções; seções entre si) ─────
const arrasto = ref<{ si: number; i: number } | null>(null)
const alvo = ref<{ si: number; i: number } | null>(null)
const arrastoSecao = ref<number | null>(null)
function iniciarArrasto(si: number, i: number, e: DragEvent) {
  arrasto.value = { si, i }
  e.dataTransfer?.setData('text/plain', 'pergunta')
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function sobreItem(si: number, i: number, e: DragEvent) {
  if (!arrasto.value) return
  e.preventDefault(); e.stopPropagation()
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  alvo.value = { si, i: e.clientY > r.top + r.height / 2 ? i + 1 : i }
}
function sobreSecao(si: number, e: DragEvent) {
  if (!arrasto.value) return
  if (alvo.value?.si === si && (e.target as HTMLElement).closest('[data-testid^="card-"]')) return
  e.preventDefault()
  if (!alvo.value || alvo.value.si !== si) alvo.value = { si, i: form.value!.secoes[si]!.itens.length }
}
function sobreCabecalhoSecao(si: number, e: DragEvent) { if (arrastoSecao.value != null && arrastoSecao.value !== si) e.preventDefault() }
function soltar(e: DragEvent) {
  if (!arrasto.value || !alvo.value) return
  e.preventDefault(); e.stopPropagation()
  const f = form.value!
  const { si, i } = arrasto.value
  let { si: sj, i: j } = alvo.value
  const [p] = f.secoes[si]!.itens.splice(i, 1)
  if (si === sj && j > i) j--
  f.secoes[sj]!.itens.splice(Math.max(0, Math.min(j, f.secoes[sj]!.itens.length)), 0, p!)
  selecionada.value = p!.pergunta_id
  arrasto.value = null; alvo.value = null
}
function soltarSecao(para: number) {
  if (arrastoSecao.value == null) return
  const f = form.value!
  const [s] = f.secoes.splice(arrastoSecao.value, 1)
  f.secoes.splice(para, 0, s!)
  arrastoSecao.value = null
}

// ─── Seções ─────────────────────────────────────────────────────────────────
function adicionarSecao() {
  const f = form.value!
  f.secoes.push({ key: novaChave(), id: null, titulo: `Seção ${f.secoes.length + 1}`, descricao: null, mostrar_se: null, itens: [] })
  nextTick(() => document.querySelector(`[data-testid="secao-${f.secoes.length - 1}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
function moverSecao(si: number, dir: -1 | 1) {
  const f = form.value!
  const j = si + dir
  if (j < 0 || j >= f.secoes.length) return
  const [s] = f.secoes.splice(si, 1)
  f.secoes.splice(j, 0, s!)
}
function duplicarSecao(si: number) {
  const f = form.value!
  const o = f.secoes[si]!
  const mapa = new Map<number, number>()
  const itens: ItemEditavel[] = o.itens.map((p) => { const id = novoIdPergunta(); mapa.set(p.pergunta_id, id); return { ...JSON.parse(JSON.stringify(p)), pergunta_id: id, respostas: 0, usada_em: [] } })
  // Lógica entre as perguntas da própria seção passa a apontar para as cópias; as demais continuam nas originais (anteriores).
  const traduz = (c: Condicao | null): Condicao | null => c && { ...c, regras: c.regras.map(r => ({ ...r, pergunta_id: mapa.get(r.pergunta_id) ?? r.pergunta_id })) }
  for (const p of itens) p.mostrar_se = traduz(p.mostrar_se)
  f.secoes.splice(si + 1, 0, { key: novaChave(), id: null, titulo: `${o.titulo} (cópia)`, descricao: o.descricao, mostrar_se: o.mostrar_se ? JSON.parse(JSON.stringify(o.mostrar_se)) : null, itens })
}
function excluirSecao(si: number) {
  const f = form.value!
  if (f.secoes.length === 1) { alert('O formulário precisa de pelo menos uma seção.'); return }
  const s = f.secoes[si]!
  const comResposta = s.itens.filter(p => p.pergunta_id > 0 && p.respostas).length
  if (!confirm(`Excluir a seção "${s.titulo}" e suas ${s.itens.length} pergunta(s)?${comResposta ? ` ${comResposta} delas têm respostas: ficam arquivadas e o histórico é preservado.` : ''}`)) return
  f.secoes.splice(si, 1)
  limparReferencias(new Set(s.itens.map(p => p.pergunta_id)))
}

// ─── Reaproveitar perguntas do banco ───────────────────────────────────────────
const bancoAberto = ref(false)
const bancoSecao = ref(0)
const buscaBanco = ref('')
const banco = ref<FormularioPergunta[]>([])
async function abrirBanco(si: number) {
  bancoSecao.value = si
  buscaBanco.value = ''
  bancoAberto.value = true
  banco.value = await $fetch<FormularioPergunta[]>('/api/formulario-perguntas', { params: { todas: '1' } }).catch(() => [])
}
const bancoFiltrado = computed(() => {
  if (!form.value) return []
  const escopo = form.value.contexto === 'demanda' ? 'demanda' : 'cliente'
  const usadas = new Set(form.value.secoes.flatMap(s => s.itens.map(i => i.pergunta_id)))
  const q = buscaBanco.value.trim().toLowerCase()
  return banco.value.filter(p => !p.arquivada && p.escopo === escopo && !usadas.has(p.id) && (!q || p.texto.toLowerCase().includes(q)))
})
function usarDoBanco(p: FormularioPergunta) {
  const s = form.value!.secoes[bancoSecao.value]!
  s.itens.push({ pergunta_id: p.id, texto: p.texto, tipo: p.tipo, opcoes: [...p.opcoes], ajuda: p.ajuda, obrigatoria: false, mostrar_se: null, respostas: 0, usada_em: [{ id: 0, nome: 'outro formulário' }] })
  selecionada.value = p.id
  bancoAberto.value = false
}

// ─── Visualizar ───────────────────────────────────────────────────────────────
const respostasPrevia = ref<Record<number, Valor>>({})
const chavePrevia = ref(0)
const previaEnviada = ref(false)
function abrirPrevia() { modo.value = 'visualizar'; previaEnviada.value = false }
function reiniciarPrevia() { respostasPrevia.value = {}; previaEnviada.value = false; chavePrevia.value++ }

// ─── Formulário: duplicar / excluir ────────────────────────────────────────────
async function duplicarFormulario() {
  if (sujo.value && !confirm('Há alterações não salvas: a cópia usará a última versão salva. Continuar?')) return
  const r = await $fetch<{ id: number }>(`/api/formularios/${props.id}/duplicar`, { method: 'POST' })
  await navigateTo(`/formularios/${r.id}`)
}
async function excluirFormulario() {
  if (!confirm(`Excluir o formulário "${form.value?.nome}"? Envios e respostas já recebidos continuam no histórico; perguntas já respondidas ficam arquivadas.`)) return
  await $fetch(`/api/formularios/${props.id}`, { method: 'DELETE' })
  await navigateTo('/formularios')
}

function avisarSaida(e: BeforeUnloadEvent) { if (sujo.value) { e.preventDefault(); e.returnValue = '' } }
onMounted(() => { carregar(); window.addEventListener('beforeunload', avisarSaida) })
onBeforeUnmount(() => window.removeEventListener('beforeunload', avisarSaida))
</script>

<style scoped>
.card { @apply rounded-3xl bg-white/90 dark:bg-zinc-900/70 border border-gray-200/70 dark:border-zinc-800 p-6; }
.chip { @apply text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:border-primary hover:text-primary dark:hover:text-white transition-colors inline-flex items-center gap-1.5; }
.acao-sec { @apply p-1.5 rounded-full hover:bg-white/20 disabled:opacity-30; }
</style>
