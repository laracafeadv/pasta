<template>
  <div class="space-y-5">
    <div class="rounded-2xl border border-secondary/30 bg-secondary/10 p-4 text-sm flex flex-wrap items-start gap-2">
      <Icon name="ph:lightbulb-bold" class="text-secondary-dark mt-0.5" />
      <p class="flex-1">
        <b>Não sabe onde colocar alguém?</b> Pergunte: “{{ PERGUNTA_CLASSIFICAR }}”
        Me procuraria e fala bem de mim → Promotora · me procuraria, mas sem vínculo → Neutra · nem lembraria → Fria · procuraria outra pessoa por insatisfação → Detratora.
      </p>
    </div>

    <p v-if="carregando && !lista.length" class="text-sm text-gray-400">Carregando carteira…</p>

    <!-- Sem classificação -->
    <section v-if="semClassificacao.length" class="painel">
      <header class="flex items-baseline gap-2 mb-1">
        <h2 class="text-2xl text-primary dark:text-zinc-100">Ainda sem classificação</h2>
        <span class="pill">{{ semClassificacao.length }}</span>
      </header>
      <p class="text-xs text-gray-500 mb-3">Comece pelos nomes que vêm à cabeça; não precisa classificar todos hoje.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        <div v-for="c in semClassificacao" :key="c.id" class="flex flex-wrap items-center gap-2 py-2 border-b border-gray-100 dark:border-zinc-800 text-sm">
          <button class="font-semibold hover:underline" @click="emit('abrir', c)">{{ c.nome || telefoneFormatado(c.telefone) }}</button>
          <span class="text-xs text-gray-500">{{ c.demanda || c.area || '' }}</span>
          <div class="ml-auto flex gap-1">
            <button v-for="(g, k) in CLASSIFICACOES" :key="k" class="chip" @click="classificar(c, k)">{{ g.nome }}</button>
          </div>
        </div>
      </div>
    </section>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <section v-for="(g, k) in CLASSIFICACOES" :key="k" class="painel">
        <header class="flex items-baseline gap-2 mb-1">
          <h2 class="text-2xl text-primary dark:text-zinc-100">{{ g.nome }}s</h2>
          <span class="pill">{{ grupo(k).length }}</span>
          <span v-if="pedem(k)" class="ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full" :class="k === 'detratora' ? 'bg-danger/15 text-danger-dark dark:text-danger-200' : 'bg-warning/15 text-warning-dark dark:text-warning-200'">
            {{ pedem(k) }} {{ k === 'detratora' ? 'para reparar' : 'pedem um gesto' }}
          </span>
        </header>
        <p class="text-xs text-gray-500">{{ PLANO_CARTEIRA[k].meta }}<template v-if="PLANO_CARTEIRA[k].cadenciaDias"> · gesto a cada {{ PLANO_CARTEIRA[k].cadenciaDias }} dias</template>.</p>
        <details class="mt-2 text-xs text-gray-600 dark:text-zinc-400">
          <summary class="cursor-pointer font-semibold text-secondary-dark">Plano de ação</summary>
          <ul class="list-disc pl-5 mt-1 space-y-0.5"><li v-for="a in PLANO_CARTEIRA[k].acoes" :key="a">{{ a }}</li></ul>
        </details>
        <p v-if="!grupo(k).length" class="text-sm italic text-gray-400 py-3">Ninguém neste grupo.</p>
        <ul class="mt-2 divide-y divide-gray-100 dark:divide-zinc-800">
          <li v-for="c in grupo(k)" :key="c.id" class="py-2.5 text-sm space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <button class="font-semibold hover:underline" @click="emit('abrir', c)">{{ c.nome || telefoneFormatado(c.telefone) }}</button>
              <span class="text-xs text-gray-500">{{ c.demanda || c.area || '' }}<template v-if="c.nps != null"> · NPS {{ c.nps }}</template></span>
              <span v-if="situacao(c)" class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" :class="corSituacao(situacao(c)!.tipo)">{{ situacao(c)!.texto }}</span>
              <span class="ml-auto text-xs text-gray-400">último contato: {{ c.ultimo_contato ? diaRelativo(c.ultimo_contato.slice(0, 10)) : '—' }}</span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <input :value="c.obs_relacionamento ?? ''" class="flex-1 min-w-[180px] bg-transparent border-b border-dashed border-gray-200 dark:border-zinc-700 text-xs py-1 focus:outline-none focus:border-primary"
                     placeholder="Observação rápida (o que você sabe sobre a relação)" @change="salvarObs(c, ($event.target as HTMLInputElement).value)" />
              <template v-if="situacao(c)?.tipo !== 'blindar'">
                <button v-for="m in PLANO_CARTEIRA[k].modelos" :key="m" class="chip" @click="emit('mensagem', c, m)">{{ m }}</button>
                <button class="chip chip-escuro" @click="registrarGesto(c)">Registrar gesto</button>
              </template>
              <select :value="c.classificacao" class="text-xs rounded-full border border-gray-200 dark:border-zinc-700 bg-transparent px-2 py-1" title="Mudar grupo" @change="classificar(c, ($event.target as HTMLSelectElement).value as Classificacao)">
                <option v-for="(g2, k2) in CLASSIFICACOES" :key="k2" :value="k2">{{ g2.nome }}</option>
              </select>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CLASSIFICACOES, PERGUNTA_CLASSIFICAR, PLANO_CARTEIRA, situacaoCarteira, type Classificacao, type ClienteCarteira, type Contato } from '../../../shared/types/crm'
import { diaRelativo, telefoneFormatado } from '../../utils/formatadores'

const emit = defineEmits<{ abrir: [c: Contato]; mensagem: [c: Contato, modelo: string] }>()

const lista = ref<ClienteCarteira[]>([])
const carregando = ref(false)

async function carregar() {
  carregando.value = true
  try {
    lista.value = await $fetch<ClienteCarteira[]>('/api/crm/carteira')
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)
defineExpose({ recarregar: carregar })

const situacao = (c: ClienteCarteira) => situacaoCarteira(c)
const ordem = { reparar: 0, gesto: 1, classificar: 2, blindar: 3 }
const grupo = (k: Classificacao) => lista.value.filter(c => c.classificacao === k)
  .sort((a, b) => (ordem[situacao(a)?.tipo ?? 'blindar'] ?? 9) - (ordem[situacao(b)?.tipo ?? 'blindar'] ?? 9) || (a.ultimo_contato ?? '').localeCompare(b.ultimo_contato ?? ''))
const pedem = (k: Classificacao) => grupo(k).filter(c => ['gesto', 'reparar'].includes(situacao(c)?.tipo ?? '')).length
const semClassificacao = computed(() => lista.value.filter(c => !c.classificacao))
const corSituacao = (t: string) => ({
  reparar: 'bg-danger/15 text-danger-dark dark:text-danger-200',
  gesto: 'bg-warning/15 text-warning-dark dark:text-warning-200',
  blindar: 'bg-gray-100 dark:bg-zinc-800 text-gray-500',
}[t] ?? 'bg-gray-100 text-gray-500')

async function classificar(c: ClienteCarteira, k: Classificacao) {
  await $fetch(`/api/crm/contatos/${c.id}`, { method: 'PUT', body: { classificacao: k } })
  await carregar()
}
async function salvarObs(c: ClienteCarteira, texto: string) {
  await $fetch(`/api/crm/contatos/${c.id}`, { method: 'PUT', body: { obs_relacionamento: texto } })
  c.obs_relacionamento = texto
}
async function registrarGesto(c: ClienteCarteira) {
  const texto = prompt(`Qual gesto você fez com ${c.nome ?? 'a cliente'}? (ex.: mensagem de reconexão, mimo, ligação)`)
  if (!texto?.trim()) return
  await $fetch(`/api/crm/contatos/${c.id}/gesto`, { method: 'POST', body: { texto } })
  await carregar()
}
</script>

<style scoped>
.painel { @apply rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-5 sm:p-6; }
.pill { @apply text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-primary dark:text-zinc-300; }
.chip { @apply text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary; }
.chip-escuro { @apply bg-primary text-white border-primary; }
</style>
