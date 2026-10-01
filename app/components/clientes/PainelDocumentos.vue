<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
const ContatoDetailModal = defineAsyncComponent(() => import('~/components/crm/ContatoDetailModal.vue'))

// O que ainda falta chegar dos clientes, por cliente e demanda. A lista de cada demanda é gerada na ficha.
interface Linha { id: number; descricao: string; obrigatorio: boolean; contato_id: number; caso_id: number | null; contato: { id: number; nome: string | null } | null; caso: { id: number; titulo: string } | null }
const linhas = ref<Linha[]>([])
const carregando = ref(false)
const busca = ref('')
const status = ref<'pendente' | 'recebido' | 'conferido' | 'rascunho'>('pendente')
const ROTULOS = { pendente: 'Pendentes', recebido: 'A conferir', conferido: 'Conferidos', rascunho: 'Peças em rascunho' } as const
const PROXIMO: Record<string, { para: string; rotulo: string } | undefined> = { pendente: { para: 'recebido', rotulo: 'Recebido' }, recebido: { para: 'conferido', rotulo: 'Conferido' }, rascunho: { para: 'final', rotulo: 'Marcar final' } }
async function carregar() {
  carregando.value = true
  try { linhas.value = await $fetch<Linha[]>('/api/documentos', { params: { status: status.value } }) } finally { carregando.value = false }
}
onMounted(carregar)
watch(status, carregar)

const grupos = computed(() => {
  const q = busca.value.trim().toLowerCase()
  const mapa = new Map<string, { chave: string; contatoId: number; cliente: string; demanda: string; itens: Linha[] }>()
  for (const l of linhas.value) {
    const cliente = l.contato?.nome ?? 'Sem nome'
    const demanda = l.caso?.titulo ?? 'Gerais do cliente'
    if (q && !`${cliente} ${demanda} ${l.descricao}`.toLowerCase().includes(q)) continue
    const chave = `${l.contato_id}-${l.caso_id ?? 0}`
    if (!mapa.has(chave)) mapa.set(chave, { chave, contatoId: l.contato_id, cliente, demanda, itens: [] })
    mapa.get(chave)!.itens.push(l)
  }
  return [...mapa.values()]
})
async function avancar(l: Linha) {
  const prox = PROXIMO[status.value]
  if (!prox) return
  linhas.value = linhas.value.filter(x => x.id !== l.id)
  const url: string = `/api/documentos/${l.id}`
  await $fetch(url, { method: 'PATCH', body: { status: prox.para } }).catch(carregar)
}
const detalheId = ref<number | null>(null)
const detalheAberto = ref(false)
function abrir(id: number) { detalheId.value = id; detalheAberto.value = true }
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-gray-500 max-w-2xl">Documentos por cliente e demanda: o que falta chegar, o que chegou e precisa ser conferido, o que já foi conferido e as peças do escritório em rascunho. Para gerar a lista de uma demanda, anexar arquivos ou cobrar pelo WhatsApp, abra a ficha.</p>
    <div class="flex flex-wrap gap-1.5">
      <button v-for="(n, k) in ROTULOS" :key="k" type="button" class="rounded-full border px-3 py-1 text-[11px] font-semibold" :class="status === k ? 'bg-primary text-white border-primary' : 'border-gray-300 dark:border-zinc-700 text-gray-500 hover:text-primary'" @click="status = k">{{ n }}</button>
    </div>
    <input v-model="busca" type="search" class="w-full max-w-md rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm" placeholder="Buscar por cliente, demanda ou documento…" />
    <p v-if="carregando" class="text-sm text-gray-400">Carregando…</p>
    <p v-else-if="!grupos.length" class="text-sm text-gray-400">Nada nesta situação.</p>
    <section v-for="g in grupos" :key="g.chave" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-5">
      <header class="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <p><button type="button" class="font-semibold hover:underline" @click="abrir(g.contatoId)">{{ g.cliente }}</button> <span class="text-sm text-gray-500">· {{ g.demanda }}</span></p>
        <span class="text-xs text-gray-400">{{ g.itens.length }} pendente(s)</span>
      </header>
      <ul class="divide-y divide-gray-100 dark:divide-zinc-800">
        <li v-for="l in g.itens" :key="l.id" class="py-2 flex items-center gap-3 text-sm">
          <span class="flex-1">{{ l.descricao }}<a v-if="(l as any).arquivo_url" :href="(l as any).arquivo_url" target="_blank" rel="noopener" class="ml-2 text-xs underline">arquivo</a> <span v-if="!l.obrigatorio" class="text-xs text-gray-400">(se houver)</span></span>
          <button v-if="PROXIMO[status]" type="button" class="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="avancar(l)">{{ PROXIMO[status]!.rotulo }}</button>
        </li>
      </ul>
    </section>
    <ContatoDetailModal :is-open="detalheAberto" :contato-id="detalheId" aba-inicial="processo" @close="detalheAberto = false; carregar()" />
  </div>
</template>
