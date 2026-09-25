<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { definePageMeta, useHead } from '#imports'
import KpiCard from '~/components/KpiCard.vue'
import { brl } from '~/utils/formatadores'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Relatórios' })

interface Linha { chave: string; total: number; ganhos?: number; decididos?: number }
interface Gargalo { etapa: string; nome: string; total: number; mediaDias: number; maisAntigo: number }
interface Stats {
  gargalos: Gargalo[]; gargalo: string | null; sumiram: number; carteira: { chave: string; total: number }[]
  novos: number; taxaFechamento: number | null; ganhos: number; decididos: number
  urgentesAbertos: number; travados: number; receita: number; emProposta: number
  porEtapa: Linha[]; porOrigem: Linha[]; porArea: Linha[]; motivosPerda: Linha[]
}

const dias = ref(90)
const stats = ref<Stats | null>(null)
const loading = ref(false)

async function carregar() {
  loading.value = true
  try {
    stats.value = await $fetch<Stats>('/api/crm/contatos/stats', { params: { dias: dias.value } })
  } finally {
    loading.value = false
  }
}
onMounted(carregar)
watch(dias, carregar)

const max = (l: Linha[]) => Math.max(1, ...l.map(x => x.total))
const taxa = (l: Linha) => (l.decididos ? `${Math.round(((l.ganhos ?? 0) / l.decididos) * 100)}%` : '—')
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Indicadores</p>
        <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Relatórios</h1>
        <p class="text-sm text-gray-500 mt-2">Onde os clientes nascem, onde o funil trava e por que se perdem. <NuxtLink to="/dashboard" class="underline underline-offset-2">Ver gráfico diário (Painel)</NuxtLink></p>
      </div>
      <select v-model="dias" class="rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm">
        <option :value="30">Últimos 30 dias</option>
        <option :value="90">Últimos 90 dias</option>
        <option :value="365">Últimos 12 meses</option>
        <option :value="0">Todo o período</option>
      </select>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <KpiCard title="Novos contatos" :value="stats?.novos ?? 0" icon="ph:user-plus-bold" color="primary" :loading="loading" />
      <KpiCard title="Taxa de fechamento" :value="stats?.taxaFechamento != null ? `${stats.taxaFechamento}%` : '—'" :sub-value="`${stats?.ganhos ?? 0} de ${stats?.decididos ?? 0} decididos`" icon="ph:target-bold" color="success" :loading="loading" />
      <KpiCard title="Honorários fechados" :value="brl(stats?.receita)" icon="ph:handshake-bold" color="neutral" :loading="loading" />
      <KpiCard title="Em proposta" :value="brl(stats?.emProposta)" icon="ph:hourglass-bold" color="warning" :loading="loading" />
      <KpiCard title="Casos travados" :value="stats?.travados ?? 0" sub-value="atrasados ou sem próxima ação" icon="ph:warning-bold" color="danger" :loading="loading" />
    </div>

    <!-- Caça aos gargalos (playbook "WhatsApp Otimizado", parte 3) -->
    <section v-if="stats" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-6">
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 class="text-2xl text-primary dark:text-zinc-100">Caça aos gargalos</h2>
          <p class="text-xs text-gray-500">Onde os contatos estão acumulando e há quanto tempo estão parados. Aja primeiro na etapa-gargalo, não em “atrair mais contatos”.</p>
        </div>
        <span v-if="stats.sumiram" class="text-xs font-semibold px-3 py-1 rounded-full bg-warning/15 text-warning-dark dark:text-warning-200">
          {{ stats.sumiram }} sem resposta do cliente há 7+ dias
        </span>
      </div>
      <div class="overflow-x-auto mt-4">
        <table class="w-full text-sm min-w-[560px]">
          <thead>
            <tr class="text-left text-[10px] uppercase tracking-widest text-gray-400">
              <th class="py-2 font-semibold">Etapa</th><th class="font-semibold">Contatos hoje</th><th class="font-semibold">Tempo médio parado</th><th class="font-semibold">Mais antigo</th><th class="font-semibold">Gargalo?</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in stats.gargalos" :key="g.etapa" class="border-t border-gray-100 dark:border-zinc-800" :class="stats.gargalo === g.etapa ? 'bg-danger/5' : ''">
              <td class="py-2.5 font-medium">{{ g.nome }}</td>
              <td>{{ g.total }}</td>
              <td>{{ g.total ? `${g.mediaDias} dia(s)` : '—' }}</td>
              <td>{{ g.total ? `${g.maisAntigo} dia(s)` : '—' }}</td>
              <td>
                <span v-if="stats.gargalo === g.etapa" class="text-xs font-semibold text-danger">✕ Prioridade da semana</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="stats.gargalo" class="mt-4 text-sm">
        <Icon name="ph:lightbulb-bold" class="align-middle text-secondary" />
        Reserve um horário esta semana só para a etapa <b>{{ stats.gargalos.find(g => g.etapa === stats!.gargalo)?.nome }}</b>:
        responda, proponha o próximo passo ou encerre com o motivo.
        <NuxtLink :to="{ path: '/crm', query: { aba: 'funil' } }" class="underline underline-offset-2">Abrir o funil</NuxtLink>
      </p>
    </section>

    <div v-if="stats" class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <section v-for="bloco in [
        { titulo: 'Funil por etapa', sub: 'Casos atualmente em cada etapa.', linhas: stats.porEtapa, conv: false },
        { titulo: 'Origem dos contatos', sub: 'Contatos · taxa de fechamento.', linhas: stats.porOrigem, conv: true },
        { titulo: 'Áreas de atuação', sub: 'Contatos · taxa de fechamento.', linhas: stats.porArea, conv: true },
        { titulo: 'Motivos de perda', sub: 'O que ajustar na captação ou na proposta.', linhas: stats.motivosPerda, conv: false },
        { titulo: 'Carteira de clientes', sub: 'Promotora, neutra, fria, detratora (NPS define automaticamente).', linhas: stats.carteira.filter(c => c.total).map(c => ({ chave: c.chave.charAt(0).toUpperCase() + c.chave.slice(1), total: c.total })), conv: false },
      ]" :key="bloco.titulo" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-6">
        <h2 class="text-2xl text-primary dark:text-zinc-100">{{ bloco.titulo }}</h2>
        <p class="text-xs text-gray-500 mb-4">{{ bloco.sub }}</p>
        <p v-if="!bloco.linhas.length" class="text-sm italic text-gray-400">Sem dados no período.</p>
        <div v-for="l in bloco.linhas" :key="l.chave" class="grid grid-cols-[140px_1fr_auto] items-center gap-3 py-1.5 text-sm">
          <span class="truncate">{{ l.chave }}</span>
          <div class="h-2.5 rounded-full bg-gray-200 dark:bg-zinc-800 overflow-hidden">
            <div class="h-full rounded-full bg-secondary" :style="{ width: `${(l.total / max(bloco.linhas)) * 100}%` }" />
          </div>
          <span class="text-gray-500 tabular-nums whitespace-nowrap">{{ l.total }}<template v-if="bloco.conv"> · {{ taxa(l) }}</template></span>
        </div>
      </section>
    </div>
  </div>
</template>
