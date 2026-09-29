<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { situacaoData, type Compromisso } from '~~/shared/types/crm'
import { hojeISO } from '~/stores/crm'
import { dataCurta } from '~/utils/formatadores'

const incluirAudiencias = ref(false)
const prazos = ref<Compromisso[]>([])
const carregando = ref(false)
async function carregar() {
  carregando.value = true
  try {
    const listas = await Promise.all([
      $fetch<Compromisso[]>('/api/compromissos', { params: { tipo: 'prazo', status: 'pendente' } }),
      incluirAudiencias.value ? $fetch<Compromisso[]>('/api/compromissos', { params: { tipo: 'audiencia', status: 'pendente' } }) : Promise.resolve([]),
    ])
    prazos.value = [...listas[0], ...listas[1]].sort((a, b) => (a.data_limite || a.inicio || '9').localeCompare(b.data_limite || b.inicio || '9'))
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)

const hoje = hojeISO()
function dataDo(c: Compromisso) { return c.data_limite || c.inicio }
function diasRestantes(c: Compromisso) {
  const d = dataDo(c)
  if (!d) return null
  return Math.round((new Date(`${d}T00:00:00`).getTime() - new Date(`${hoje}T00:00:00`).getTime()) / 864e5)
}
// Régua de urgência: atrasado / vence hoje / próximos 7 dias / depois.
function status(c: Compromisso) {
  const dias = diasRestantes(c)
  if (dias === null) return 'sem-data'
  const sit = situacaoData(dataDo(c)!, hoje)
  if (sit !== 'futuro') return sit
  return dias <= 7 ? 'proximo' : 'ok'
}
const CORES: Record<string, string> = { atrasado: 'border-danger', hoje: 'border-secondary', proximo: 'border-warning', ok: 'border-gray-300 dark:border-zinc-700', 'sem-data': 'border-gray-300 dark:border-zinc-700' }
const atrasados = computed(() => prazos.value.filter(c => status(c) === 'atrasado'))
const vencemHoje = computed(() => prazos.value.filter(c => status(c) === 'hoje'))
const proximos = computed(() => prazos.value.filter(c => status(c) === 'proximo'))
const futuros = computed(() => prazos.value.filter(c => !['atrasado', 'hoje', 'proximo'].includes(status(c))))

async function concluir(c: Compromisso) {
  await $fetch(`/api/compromissos/${c.id}`, { method: 'PATCH', body: { status: 'concluido' } })
  await carregar()
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm text-gray-500 mt-2 max-w-2xl">
          Só compromissos com data-limite, do mais urgente ao mais distante. Pra criar um novo prazo, use
          <NuxtLink to="/agenda" class="underline hover:text-primary">a Agenda</NuxtLink> — aqui é só acompanhamento.
        </p>
      </div>
      <label class="flex items-center gap-2 text-sm cursor-pointer">
        <input v-model="incluirAudiencias" type="checkbox" class="accent-[#3c2923]" @change="carregar" /> Incluir audiências
      </label>
    </div>

    <p v-if="carregando" class="text-sm text-gray-400">Carregando…</p>

    <div v-else class="space-y-8">
      <section v-for="grupo in [
        { titulo: 'Atrasados', itens: atrasados, cor: 'text-danger' },
        { titulo: 'Vencem hoje', itens: vencemHoje, cor: 'text-secondary-dark' },
        { titulo: 'Próximos 7 dias', itens: proximos, cor: 'text-warning-dark' },
        { titulo: 'Depois', itens: futuros, cor: 'text-primary dark:text-zinc-100' },
      ]" :key="grupo.titulo">
        <h2 class="text-xl font-serif mb-2" :class="grupo.cor">{{ grupo.titulo }} <span class="text-sm font-sans text-gray-400">({{ grupo.itens.length }})</span></h2>
        <p v-if="!grupo.itens.length" class="text-sm text-gray-400 italic">Nada aqui.</p>
        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <article v-for="c in grupo.itens" :key="c.id" class="rounded-2xl bg-white/70 dark:bg-zinc-900/60 border-l-[3px] p-3.5 flex flex-col gap-1.5" :class="CORES[status(c)]">
            <div class="flex items-start justify-between gap-2">
              <p class="font-semibold text-sm">{{ c.titulo }}</p>
              <span class="text-[10px] text-gray-400 shrink-0">{{ dataCurta(dataDo(c)) }}</span>
            </div>
            <p v-if="c.contato || c.caso" class="text-xs text-secondary-dark">
              <NuxtLink v-if="c.contato" :to="`/crm?abrir=${c.contato.id}&ficha=casos`" class="hover:underline">{{ c.contato.nome }}</NuxtLink>
              <span v-if="c.caso"> · {{ c.caso.titulo }}{{ c.caso.numero_processo ? ` (${c.caso.numero_processo})` : '' }}</span>
            </p>
            <p v-if="c.observacao" class="text-xs text-gray-500">{{ c.observacao }}</p>
            <div class="flex items-center justify-between pt-1">
              <span class="text-[10px] font-semibold uppercase tracking-wider" :class="status(c) === 'atrasado' ? 'text-danger' : status(c) === 'hoje' ? 'text-secondary-dark' : status(c) === 'proximo' ? 'text-warning-dark' : 'text-gray-400'">
                {{ status(c) === 'atrasado' ? `${Math.abs(diasRestantes(c)!)} dia(s) atrasado` : status(c) === 'hoje' ? 'vence hoje' : `faltam ${diasRestantes(c)} dia(s)` }}
              </span>
              <button class="btn-mini bg-primary text-white" @click="concluir(c)">Concluído</button>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.btn-mini { @apply text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full; }
</style>
