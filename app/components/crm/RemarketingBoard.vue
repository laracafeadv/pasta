<template>
  <div class="space-y-5">
    <div class="rounded-2xl border border-secondary/30 bg-secondary/10 p-4 text-sm space-y-1">
      <p><b>Quem não fechou fica no radar.</b> Envie conteúdo da demanda dela (notícia, artigo, post), no máximo a cada {{ REMARKETING_INTERVALO_DIAS }} dias, sem pressão. Se ela quiser retomar, reabra.</p>
      <p class="text-xs text-gray-600 dark:text-zinc-400">O WhatsApp só permite mensagem livre até 24h depois da última mensagem da pessoa: fora disso, envie pelo celular do escritório ou por um modelo aprovado pela Meta. Quem pedir para não receber sai da lista (LGPD).</p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <select v-model="filtroDemanda" class="rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm">
        <option value="">Todas as demandas</option>
        <option v-for="d in demandas" :key="d" :value="d">{{ d }}</option>
      </select>
      <label class="text-sm flex items-center gap-2 cursor-pointer"><input v-model="soProntos" type="checkbox" class="accent-[#3c2923]" /> Só quem já pode receber</label>
      <span class="ml-auto text-xs text-gray-500">{{ prontos }} pronta(s) para receber conteúdo · {{ lista.length }} no radar</span>
    </div>

    <p v-if="carregando && !lista.length" class="text-sm text-gray-400">Carregando…</p>
    <p v-else-if="!grupos.length" class="text-sm italic text-gray-400">Ninguém no remarketing com esses filtros.</p>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <section v-for="g in grupos" :key="g.demanda" class="painel">
        <header class="flex items-baseline gap-2 mb-2">
          <h2 class="text-2xl text-primary dark:text-zinc-100">{{ g.demanda }}</h2>
          <span class="pill">{{ g.itens.length }}</span>
        </header>
        <ul class="divide-y divide-gray-100 dark:divide-zinc-800">
          <li v-for="c in g.itens" :key="c.id" class="py-2.5 text-sm space-y-1" :class="c.nao_contatar ? 'opacity-50' : ''">
            <div class="flex flex-wrap items-center gap-2">
              <button class="font-semibold hover:underline" @click="emit('abrir', c)">{{ c.nome || telefoneFormatado(c.telefone) }}</button>
              <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">{{ c.motivo_perda || 'Sem motivo' }}</span>
              <span v-if="c.nao_contatar" class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-danger/15 text-danger-dark">Não contatar</span>
              <span v-else-if="pronto(c)" class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/15 text-success-dark">Pode receber</span>
              <span v-if="c.proposta" class="text-xs text-gray-500">proposta de {{ brl(c.proposta.valor) }} em {{ dataCurta(c.proposta.created_at) }}</span>
              <span class="ml-auto text-xs text-gray-400">procurou em {{ mesAno(c.created_at) }} · último contato {{ c.ultimo_contato ? diaRelativo(c.ultimo_contato.slice(0, 10)) : '—' }}</span>
            </div>
            <div v-if="!c.nao_contatar" class="flex flex-wrap items-center gap-2">
              <button class="chip" @click="emit('mensagem', c, '/remarketing')">/remarketing</button>
              <button v-if="c.proposta" class="chip" @click="emit('mensagem', c, '/remarketing-proposta')">/remarketing-proposta</button>
              <button v-else class="chip" @click="emit('mensagem', c, '/remarketing-retomar')">/remarketing-retomar</button>
              <button class="chip chip-escuro" @click="registrarEnvio(c)">Registrar envio</button>
              <button class="chip" @click="emit('reabrir', c)">Reabrir</button>
              <button class="ml-auto text-xs text-gray-400 hover:text-danger underline underline-offset-2" @click="naoContatar(c, true)">pediu para não receber</button>
            </div>
            <button v-else class="text-xs underline underline-offset-2 text-gray-500" @click="naoContatar(c, false)">desfazer</button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { REMARKETING_INTERVALO_DIAS, type Contato } from '../../../shared/types/crm'
import { brl, dataCurta, diaRelativo, telefoneFormatado } from '../../utils/formatadores'

type Item = Pick<Contato, 'id' | 'nome' | 'telefone' | 'area' | 'demanda' | 'origem' | 'motivo_perda' | 'created_at' | 'nao_contatar'> & { ultimo_contato: string | null; proposta: { valor: number; created_at: string } | null }
const emit = defineEmits<{ abrir: [c: Contato]; mensagem: [c: Contato, modelo: string]; reabrir: [c: Contato] }>()

const lista = ref<Item[]>([])
const carregando = ref(false)
const filtroDemanda = ref('')
const soProntos = ref(false)

async function carregar() {
  carregando.value = true
  try {
    lista.value = await $fetch<Item[]>('/api/crm/remarketing')
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)
defineExpose({ recarregar: carregar })

const pronto = (c: Item) => !c.nao_contatar && (!c.ultimo_contato || (Date.now() - new Date(c.ultimo_contato).getTime()) / 864e5 >= REMARKETING_INTERVALO_DIAS)
const prontos = computed(() => lista.value.filter(pronto).length)
const demandas = computed(() => [...new Set(lista.value.map(c => c.demanda || c.area || 'Sem demanda'))].sort())
const grupos = computed(() => {
  const g: Record<string, Item[]> = {}
  for (const c of lista.value) {
    const d = c.demanda || c.area || 'Sem demanda'
    if (filtroDemanda.value && d !== filtroDemanda.value) continue
    if (soProntos.value && !pronto(c)) continue
    ;(g[d] ||= []).push(c)
  }
  return Object.entries(g).map(([demanda, itens]) => ({ demanda, itens: itens.sort((a, b) => Number(pronto(b)) - Number(pronto(a))) })).sort((a, b) => b.itens.length - a.itens.length)
})
const mesAno = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })

async function registrarEnvio(c: Item) {
  await $fetch(`/api/crm/contatos/${c.id}/gesto`, { method: 'POST', body: { texto: `Remarketing: conteúdo enviado (${c.demanda || c.area || 'demanda'}).` } })
  await carregar()
}
async function naoContatar(c: Item, valor: boolean) {
  await $fetch(`/api/crm/contatos/${c.id}`, { method: 'PUT', body: { nao_contatar: valor } })
  c.nao_contatar = valor
}
</script>

<style scoped>
.painel { @apply rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-5 sm:p-6; }
.pill { @apply text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-primary dark:text-zinc-300; }
.chip { @apply text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary; }
.chip-escuro { @apply bg-primary text-white border-primary; }
</style>
