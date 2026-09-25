<template>
  <div v-if="!d" class="p-10 text-center text-sm text-gray-400">Carregando…</div>
  <form v-else class="p-5 space-y-5 text-sm" @submit.prevent="salvar">
    <!-- Roteiro -->
    <details class="card" :open="!d.updated_at">
      <summary class="cursor-pointer font-semibold text-primary dark:text-zinc-200">Roteiro da consulta ({{ area || 'geral' }})</summary>
      <ol class="list-decimal pl-5 mt-2 space-y-1 text-gray-600 dark:text-zinc-300">
        <li v-for="p in roteiro" :key="p">{{ p }}</li>
      </ol>
      <p class="mt-3 text-xs text-gray-500">
        <b>Triagem x consulta:</b> a triagem (Ana ou equipe) é gratuita e só entende os fatos. A partir do momento em que você analisa direitos, riscos e estratégia do caso concreto, é consulta.
        Se a pessoa pedir isso antes, use a mensagem <code>/triagem-x-consulta</code>.
      </p>
    </details>

    <!-- 5 porquês -->
    <section class="card">
      <h3>Problema e causa raiz (5 porquês)</h3>
      <label class="field"><span>O que a cliente trouxe</span><textarea v-model="d.problema_relatado" rows="2" class="modal-input" placeholder="Com as palavras dela" /></label>
      <div class="space-y-2 mt-2">
        <label v-for="i in 5" :key="i" class="flex items-center gap-2">
          <span class="w-20 shrink-0 text-xs font-semibold text-gray-500">{{ i }}º por quê?</span>
          <input v-model="porques[i - 1]" class="modal-input flex-1" :placeholder="i === 1 ? 'Por que isso é um problema para você agora?' : 'E por quê?'" />
        </label>
      </div>
      <p class="text-xs text-gray-400 mt-1">Pare quando a resposta for algo que o seu trabalho resolve. Nem sempre são cinco.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <label class="field"><span>Causa raiz</span><textarea v-model="d.causa_raiz" rows="2" class="modal-input" /></label>
        <label class="field"><span>O que ela quer que mude</span><textarea v-model="d.objetivo_cliente" rows="2" class="modal-input" /></label>
      </div>
    </section>

    <!-- Viabilidade -->
    <section class="card">
      <h3>Viabilidade</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
        <label v-for="v in VERIFICACOES_VIABILIDADE" :key="v.chave" class="flex items-start gap-2 cursor-pointer">
          <input v-model="d.verificacoes[v.chave]" type="checkbox" class="mt-0.5 accent-[#3c2923]" />
          <span>{{ v.rotulo }} <span class="text-[10px] uppercase tracking-wider text-gray-400">{{ v.grupo }}</span></span>
        </label>
      </div>
      <p class="text-xs mt-2" :class="pendentes ? 'text-warning-dark' : 'text-success-dark'">{{ pendentes ? `${pendentes} verificação(ões) em aberto` : 'Todas as verificações feitas.' }}</p>
      <label class="field mt-3"><span>Riscos e ressalvas (vão por escrito na proposta)</span><textarea v-model="d.riscos" rows="2" class="modal-input" /></label>
      <label class="field mt-3">
        <span>Capacidade de pagamento</span>
        <select v-model="d.capacidade_pagamento" class="modal-input">
          <option :value="null">—</option>
          <option v-for="(n, k) in CAPACIDADES_PAGAMENTO" :key="k" :value="k">{{ n }}</option>
        </select>
      </label>
    </section>

    <!-- O que está em jogo (ancoragem) -->
    <section class="card">
      <h3>O que está em jogo</h3>
      <p class="text-xs text-gray-500 -mt-1 mb-2">Para a cliente comparar o investimento com o que ela protege (patrimônio, pensão, tempo). Informação, nunca promessa de resultado.</p>
      <div class="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-3">
        <label class="field"><span>O quê</span><input v-model="d.descricao_em_jogo" class="modal-input" placeholder="Ex.: a meação do apartamento; 12 meses de pensão" /></label>
        <label class="field"><span>Valor aproximado (R$)</span><input v-model.number="d.valor_em_jogo" type="number" min="0" step="100" class="modal-input" /></label>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <span>Honorário proposto: <b>{{ d.honorario_proposto ? brl(d.honorario_proposto) : '—' }}</b></span>
        <span v-if="percentual != null">= <b>{{ percentual }}%</b> do que está em jogo</span>
        <span v-if="d.preco_minimo" :class="abaixoDoMinimo ? 'text-danger font-semibold' : 'text-gray-500'">
          Preço mínimo para {{ demanda }}: {{ brl(d.preco_minimo) }}<template v-if="abaixoDoMinimo"> — proposta abaixo do custo</template>
        </span>
      </div>
      <Button type="button" size="sm" variant="outline" class="mt-3" icon="ph:chat-text-bold" @click="montarProposta">Montar mensagem de proposta</Button>
    </section>

    <!-- Decisão -->
    <section class="card">
      <h3>Decisão</h3>
      <div class="flex flex-wrap gap-2">
        <button v-for="(x, k) in DECISOES_DIAGNOSTICO" :key="k" type="button" class="px-4 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider"
                :class="d.decisao === k ? 'bg-primary text-white border-primary' : 'border-gray-300 dark:border-zinc-700'" @click="d.decisao = d.decisao === k ? null : k">
          {{ x.nome }}
        </button>
      </div>
      <p v-if="d.decisao" class="text-xs text-gray-500 mt-2">{{ DECISOES_DIAGNOSTICO[d.decisao].dica }}</p>
    </section>

    <div class="flex items-center gap-3">
      <Button type="submit" :loading="salvando" icon="ph:check-bold">Salvar diagnóstico</Button>
      <span v-if="msg" class="text-xs" :class="erro ? 'text-danger' : 'text-success-dark'">{{ msg }}</span>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from '../Button.vue'
import { CAPACIDADES_PAGAMENTO, DECISOES_DIAGNOSTICO, ROTEIRO_CONSULTA, VERIFICACOES_VIABILIDADE, type Diagnostico } from '../../../shared/types/crm'
import { brl } from '../../utils/formatadores'
import { useModelos } from '../../composables/useModelos'

const props = defineProps<{ contatoId: number; nome: string | null; area: string | null; demanda: string | null }>()
const emit = defineEmits<{ mensagem: [texto: string] }>()

const d = ref<Diagnostico | null>(null)
const porques = ref<string[]>(['', '', '', '', ''])
const salvando = ref(false)
const msg = ref('')
const erro = ref(false)

onMounted(async () => {
  const r = await $fetch<Diagnostico>(`/api/crm/contatos/${props.contatoId}/diagnostico`)
  r.verificacoes ||= {}
  porques.value = [...(r.porques ?? []), '', '', '', '', ''].slice(0, 5)
  d.value = r
})

const roteiro = computed(() => [...ROTEIRO_CONSULTA['*']!, ...(props.area ? ROTEIRO_CONSULTA[props.area] ?? [] : [])])
const pendentes = computed(() => VERIFICACOES_VIABILIDADE.filter(v => !d.value?.verificacoes[v.chave]).length)
const percentual = computed(() => (d.value?.valor_em_jogo && d.value.honorario_proposto ? Math.round((d.value.honorario_proposto / d.value.valor_em_jogo) * 1000) / 10 : null))
const abaixoDoMinimo = computed(() => !!(d.value?.preco_minimo && d.value.honorario_proposto && d.value.honorario_proposto < d.value.preco_minimo))

async function salvar() {
  if (!d.value) return
  salvando.value = true
  msg.value = ''
  try {
    const { honorario_proposto, preco_minimo, updated_at, contato_id, ...corpo } = d.value
    const r = await $fetch<Diagnostico>(`/api/crm/contatos/${props.contatoId}/diagnostico`, {
      method: 'PUT',
      body: { ...corpo, porques: porques.value.map(p => p.trim()).filter(Boolean) },
    })
    d.value = { ...d.value, updated_at: r.updated_at }
    erro.value = false
    msg.value = 'Salvo.'
  } catch (e: any) {
    erro.value = true
    msg.value = e?.data?.message || 'Não foi possível salvar.'
  } finally {
    salvando.value = false
  }
}

const { modelos, carregar, preencher } = useModelos()
async function montarProposta() {
  if (!d.value) return
  await carregar()
  const base = modelos.value.find(m => m.atalho === '/proposta-valor')?.texto ?? ''
  const emJogo = [d.value.descricao_em_jogo, d.value.valor_em_jogo ? `cerca de ${brl(d.value.valor_em_jogo)}` : null].filter(Boolean).join(', ')
  let texto = preencher(base, props.nome)
  if (emJogo) texto = texto.replace(/\[O QUE ESTÁ EM JOGO[^\]]*\]/, emJogo)
  if (d.value.honorario_proposto) texto = texto.replace('R$ [VALOR]', brl(d.value.honorario_proposto))
  emit('mensagem', texto)
}
</script>

<style scoped>
.card { @apply rounded-lg border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4; }
.card h3 { @apply text-[10px] font-bold uppercase tracking-widest text-primary mb-2; }
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
