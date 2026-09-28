<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { definePageMeta, useHead } from '#imports'
import Button from '~/components/Button.vue'
import Modal from '~/components/Modal.vue'
import type { ModeloMensagem } from '~~/shared/types/crm'
import { useModelos } from '~/composables/useModelos'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Mensagens prontas' })

const { invalidar } = useModelos()
const lista = ref<ModeloMensagem[]>([])
const carregando = ref(false)
const busca = ref('')
const copiadoId = ref<number | null>(null)

async function carregar() {
  carregando.value = true
  try {
    lista.value = await $fetch<ModeloMensagem[]>('/api/modelos', { params: { todos: '1' } })
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const grupos = computed(() => {
  const q = normalizar(busca.value)
  const g: Record<string, ModeloMensagem[]> = {}
  for (const m of lista.value) {
    if (q && ![m.titulo, m.atalho, m.texto, m.categoria].some(x => normalizar(x).includes(q))) continue
    ;(g[m.categoria] ||= []).push(m)
  }
  return g
})
const categorias = computed(() => [...new Set(lista.value.map(m => m.categoria))])

// Classes estáticas (Tailwind precisa ver a string completa) — cor por número da categoria ("2. Agendamento" → índice 1).
const PALETA_BORDA = ['border-l-danger', 'border-l-warning', 'border-l-success', 'border-l-secondary', 'border-l-info', 'border-l-primary']
const corCategoria = (cat: string) => {
  const n = parseInt(cat, 10)
  return PALETA_BORDA[(Number.isFinite(n) ? n - 1 : 0) % PALETA_BORDA.length]
}

const mostrarGuia = ref(false)
const GUIA = [
  {
    fase: 'Primeiro contato',
    situacoes: [
      { texto: 'Cliente pergunta se a consulta é paga', atalho: '/obj-consulta-paga' },
      { texto: 'Achou caro pagar pela consulta', atalho: '/obj-caro-consulta' },
      { texto: 'Disse que vai pensar antes de marcar', atalho: '/obj-pensar-consulta' },
      { texto: 'Diz que não tem dinheiro agora', atalho: '/obj-sem-dinheiro' },
      { texto: 'Caso é fora da sua área de atuação', atalho: '/fora-da-area' },
      { texto: 'Quer entender a diferença entre triagem e consulta', atalho: '/triagem-x-consulta' },
      { texto: 'Já entendeu a situação, hora de convidar para a consulta', atalho: '/consulta' },
    ],
  },
  {
    fase: 'Agendamento',
    situacoes: [
      { texto: 'Informar seus horários livres', atalho: '/disponibilidade ou /opcoes' },
      { texto: 'Confirmar que o agendamento foi feito', atalho: '/agendado' },
      { texto: 'Preparar antes da consulta (contexto do caso)', atalho: '/pre-consulta' },
      { texto: 'Um dia antes da consulta', atalho: '/lembrete' },
      { texto: 'Orientações no dia (link, regras)', atalho: '/regras-consulta' },
    ],
  },
  {
    fase: 'Depois da consulta',
    situacoes: [
      { texto: 'No dia seguinte à consulta', atalho: '/feedback' },
      { texto: 'Fechar o raciocínio do que foi conversado', atalho: '/pos-consulta ou /resumo' },
    ],
  },
  {
    fase: 'Proposta e fechamento',
    situacoes: [
      { texto: 'Enviar a proposta de honorários', atalho: '/proposta ou /proposta-valor' },
      { texto: 'Estranhou ou perguntou sobre o valor', atalho: '/valor' },
      { texto: 'Achou caro (honorários, não a consulta)', atalho: '/obj-caro' },
      { texto: 'Pediu garantia de vitória', atalho: '/obj-garantia' },
      { texto: 'Vai falar com a família antes de decidir', atalho: '/obj-familia' },
      { texto: 'Pediu desconto', atalho: '/obj-desconto' },
      { texto: '24h sem resposta à proposta', atalho: '/followup-24h' },
      { texto: '7 dias sem resposta', atalho: '/followup-7d' },
      { texto: '14 dias sem resposta (último follow-up)', atalho: '/followup-final' },
      { texto: 'Fechou! Enviar contrato', atalho: '/contrato' },
      { texto: 'Contrato assinado', atalho: '/boas-vindas-cliente, depois /formulario' },
    ],
  },
  {
    fase: 'Documentos',
    situacoes: [
      { texto: 'Depois de fechar, pedir os documentos', atalho: '/documentos' },
      { texto: 'Confirmar que recebeu algo', atalho: '/recebidos' },
      { texto: 'Falta algum documento', atalho: '/pendencia' },
    ],
  },
  {
    fase: 'Financeiro',
    situacoes: [
      { texto: 'Pagamento caiu', atalho: '/pagamento-ok' },
      { texto: 'Mandar o boleto da parcela', atalho: '/boleto' },
      { texto: 'Perto do vencimento', atalho: '/vencimento' },
      { texto: 'Parcela atrasada', atalho: '/cobranca' },
    ],
  },
  {
    fase: 'Encerramento e relacionamento',
    situacoes: [
      { texto: 'Encerrou o caso — pedir avaliação no Google', atalho: '/avaliacao' },
      { texto: 'Rodar a pesquisa de satisfação (NPS)', atalho: '/nps-convite → /nps-nota → /nps-motivo' },
      { texto: 'Nota 9–10 (promotora)', atalho: '/nps-promotora, depois /reconhecimento' },
      { texto: 'Nota 7–8 (neutra)', atalho: '/nps-neutra, depois /reconexao' },
      { texto: 'Nota 0–6 (detratora)', atalho: '/nps-detratora, depois /reparacao se for recente' },
      { texto: '30 dias após encerrar o caso', atalho: '/pos-venda-30' },
      { texto: '1 ano depois', atalho: '/pos-venda-1ano' },
      { texto: 'Aniversário da cliente', atalho: '/aniversario' },
      { texto: 'Cliente esfriando, sem gancho comercial', atalho: '/reconexao ou /reaquecer' },
      { texto: 'Quem não fechou, mandar conteúdo do interesse dela', atalho: '/remarketing' },
      { texto: 'Proposta antiga sem resposta, tentar retomar', atalho: '/remarketing-proposta ou /remarketing-retomar' },
      { texto: 'Datas comemorativas', atalho: '/natal' },
    ],
  },
]

async function copiar(m: ModeloMensagem) {
  await navigator.clipboard?.writeText(m.texto)
  copiadoId.value = m.id
  setTimeout(() => { copiadoId.value = null }, 1500)
}

// ─── Edição ─────────────────────────────────────────────────────────────────
const aberto = ref(false)
const salvando = ref(false)
const erro = ref<string | null>(null)
const editando = ref<ModeloMensagem | null>(null)
const form = reactive({ categoria: '', titulo: '', atalho: '', texto: '', ordem: 0, ativo: true })

function abrir(m?: ModeloMensagem) {
  editando.value = m ?? null
  erro.value = null
  Object.assign(form, m ?? { categoria: categorias.value[0] ?? '1. Primeiras mensagens', titulo: '', atalho: '/', texto: '', ordem: 99, ativo: true })
  aberto.value = true
}

async function salvar() {
  salvando.value = true
  erro.value = null
  try {
    if (editando.value) await $fetch(`/api/modelos/${editando.value.id}`, { method: 'PUT', body: form })
    else await $fetch('/api/modelos', { method: 'POST', body: form })
    aberto.value = false
    invalidar()
    await carregar()
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível salvar.'
  } finally {
    salvando.value = false
  }
}

async function excluir() {
  if (!editando.value || !confirm(`Excluir a mensagem “${editando.value.titulo}”?`)) return
  await $fetch(`/api/modelos/${editando.value.id}`, { method: 'DELETE' })
  aberto.value = false
  invalidar()
  await carregar()
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Tom de voz do escritório</p>
        <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Mensagens prontas</h1>
        <p class="text-sm text-gray-500 mt-2 max-w-2xl">
          A mensagem certa para cada etapa da conversa. Na conversa com o cliente, digite <b>/</b> e o atalho para usar.
          <b>[NOME]</b> é preenchido sozinho; os outros campos entre colchetes você completa antes de enviar.
        </p>
      </div>
      <Button icon="ph:plus-bold" @click="abrir()">Nova mensagem</Button>
    </div>

    <button type="button" class="w-full text-left rounded-3xl bg-secondary/10 border border-secondary/30 px-5 py-3.5 flex items-center gap-2.5 hover:bg-secondary/15 transition-colors" @click="mostrarGuia = !mostrarGuia">
      <Icon name="ph:compass-bold" class="text-secondary-dark text-xl shrink-0" />
      <span class="flex-1">
        <span class="font-bold text-sm text-primary dark:text-zinc-100">Guia rápido: qual mensagem usar</span>
        <span class="block text-xs text-gray-500">Não sabe qual atalho encaixa na situação? Comece por aqui.</span>
      </span>
      <Icon :name="mostrarGuia ? 'ph:caret-up-bold' : 'ph:caret-down-bold'" class="text-secondary-dark shrink-0" />
    </button>

    <div v-if="mostrarGuia" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section v-for="bloco in GUIA" :key="bloco.fase" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-5">
        <h3 class="text-sm font-bold uppercase tracking-wider text-secondary-dark mb-2.5">{{ bloco.fase }}</h3>
        <div v-for="s in bloco.situacoes" :key="s.texto" class="flex items-baseline justify-between gap-3 py-1.5 border-b border-gray-100 dark:border-zinc-800 last:border-b-0">
          <span class="text-sm text-gray-600 dark:text-zinc-300">{{ s.texto }}</span>
          <code class="text-xs text-secondary-dark dark:text-secondary-200 shrink-0 text-right">{{ s.atalho }}</code>
        </div>
      </section>
    </div>

    <input v-model="busca" type="search" class="w-full max-w-md rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm" placeholder="Buscar por título, atalho ou texto…" />

    <p v-if="carregando" class="text-sm text-gray-400">Carregando…</p>
    <section v-for="(itens, cat) in grupos" :key="cat" class="space-y-3">
      <h2 class="text-2xl text-primary dark:text-zinc-100">{{ cat }}</h2>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article v-for="m in itens" :key="m.id" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border-l-[3px] border-y border-r border-gray-200/70 dark:border-zinc-800 p-5 flex flex-col gap-3" :class="[corCategoria(cat), m.ativo ? '' : 'opacity-50']">
          <header class="flex items-baseline justify-between gap-3">
            <p class="font-semibold">{{ m.titulo }} <span v-if="!m.ativo" class="text-xs text-gray-400">(desativada)</span></p>
            <code class="text-xs text-secondary-dark dark:text-secondary-200 shrink-0">{{ m.atalho }}</code>
          </header>
          <p class="text-sm text-gray-600 dark:text-zinc-300 whitespace-pre-wrap flex-1">{{ m.texto }}</p>
          <div class="flex gap-2">
            <button class="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="copiar(m)">{{ copiadoId === m.id ? 'Copiado!' : 'Copiar' }}</button>
            <button class="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="abrir(m)">Editar</button>
          </div>
        </article>
      </div>
    </section>

    <Modal :is-open="aberto" :title="editando ? 'Editar mensagem' : 'Nova mensagem'" max-width="2xl" :loading="salvando" @close="aberto = false">
      <form id="modelo-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="salvar">
        <label class="field">
          <span>Categoria</span>
          <input v-model="form.categoria" list="categorias" class="modal-input" required />
          <datalist id="categorias"><option v-for="c in categorias" :key="c" :value="c" /></datalist>
        </label>
        <label class="field"><span>Atalho</span><input v-model="form.atalho" class="modal-input font-mono" placeholder="/exemplo" required /></label>
        <label class="field sm:col-span-2"><span>Título</span><input v-model="form.titulo" class="modal-input" required /></label>
        <label class="field sm:col-span-2"><span>Texto</span><textarea v-model="form.texto" rows="8" class="modal-input" required /></label>
        <label class="field"><span>Ordem</span><input v-model="form.ordem" type="number" class="modal-input" /></label>
        <label class="flex items-center gap-2 text-sm mt-6"><input v-model="form.ativo" type="checkbox" class="accent-[#3c2923]" /> Ativa</label>
        <p v-if="erro" class="sm:col-span-2 text-sm text-danger">{{ erro }}</p>
      </form>
      <template #footer>
        <div class="flex flex-col-reverse sm:flex-row gap-3 justify-between">
          <Button v-if="editando" variant="outline" icon="ph:trash-bold" @click="excluir">Excluir</Button>
          <div class="flex gap-3 sm:ml-auto">
            <Button variant="outline" @click="aberto = false">Cancelar</Button>
            <Button form="modelo-form" type="submit" :loading="salvando" icon="ph:check-bold">Salvar</Button>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
