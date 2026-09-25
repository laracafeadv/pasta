<template>
  <div v-if="!r" class="text-sm text-gray-400">Carregando…</div>
  <div v-else class="space-y-6">
    <!-- Fluxo de caixa -->
    <section v-if="modo === 'caixa'" class="painel">
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 class="text-2xl text-primary dark:text-zinc-100">Fluxo de caixa — próximos 6 meses</h2>
          <p class="text-xs text-gray-500">Entradas e saídas lançadas + despesas fixas projetadas. O saldo parte do caixa informado ao lado.</p>
        </div>
        <label class="text-xs flex items-center gap-2">Caixa hoje (R$)
          <input v-model="config.saldo_caixa" type="number" step="100" class="w-32 rounded-full border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-1" @change="salvarConfig" />
        </label>
      </div>
      <div class="flex flex-wrap gap-3 mt-3 text-xs">
        <span v-if="r.atrasados.receber" class="px-3 py-1 rounded-full bg-warning/15 text-warning-dark">A receber em atraso: {{ brl(r.atrasados.receber) }}</span>
        <span v-if="r.atrasados.pagar" class="px-3 py-1 rounded-full bg-danger/15 text-danger-dark">A pagar em atraso: {{ brl(r.atrasados.pagar) }}</span>
      </div>
      <div class="overflow-x-auto mt-4">
        <table class="w-full text-sm min-w-[640px]">
          <thead><tr class="text-left text-[10px] uppercase tracking-widest text-gray-400"><th class="py-2">Mês</th><th class="text-right">Entradas</th><th class="text-right">Saídas</th><th class="text-right">Resultado</th><th class="text-right">Saldo projetado</th><th class="w-40"></th></tr></thead>
          <tbody>
            <tr v-for="m in r.fluxo" :key="m.mes" class="border-t border-gray-100 dark:border-zinc-800">
              <td class="py-2.5 font-medium">{{ nomeMes(m.mes) }}</td>
              <td class="text-right tabular-nums text-success-dark dark:text-success-200">{{ brl(m.entradas) }}</td>
              <td class="text-right tabular-nums text-danger-dark dark:text-danger-200">{{ brl(m.saidas) }}<span v-if="m.projetadas" class="block text-[10px] text-gray-400">{{ brl(m.projetadas) }} projetado</span></td>
              <td class="text-right tabular-nums font-semibold" :class="m.resultado < 0 ? 'text-danger' : ''">{{ brl(m.resultado) }}</td>
              <td class="text-right tabular-nums font-semibold" :class="m.saldo < 0 ? 'text-danger' : ''">{{ brl(m.saldo) }}</td>
              <td class="pl-4">
                <div class="h-2 rounded-full bg-gray-200 dark:bg-zinc-800 overflow-hidden">
                  <div class="h-full rounded-full" :class="m.resultado < 0 ? 'bg-danger' : 'bg-secondary'" :style="{ width: `${Math.min(100, (Math.abs(m.resultado) / maxFluxo) * 100)}%` }" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="mesNegativo" class="mt-3 text-sm"><Icon name="ph:warning-bold" class="align-middle text-danger" /> O caixa fica negativo em <b>{{ nomeMes(mesNegativo) }}</b>. Antecipe cobranças ou revise despesas antes disso.</p>
    </section>

    <!-- Precificação -->
    <template v-if="modo === 'precos'">
      <section class="painel">
        <h2 class="text-2xl text-primary dark:text-zinc-100">Quanto custa uma hora do escritório</h2>
        <p class="text-xs text-gray-500">Custo operacional mensal (despesas fixas) ÷ horas produtivas. É a base do preço mínimo: abaixo dele, o caso dá prejuízo.</p>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div class="kpi"><span>Custo mensal</span><b>{{ brl(r.custos.custoMensal) }}</b></div>
          <label class="kpi"><span>Horas produtivas/mês</span><input v-model="config.horas_produtivas_mes" type="number" min="1" class="bg-transparent text-xl font-semibold w-full" @change="salvarConfig" /></label>
          <div class="kpi"><span>Custo da hora</span><b>{{ brl(r.custos.custoHora) }}</b></div>
          <label class="kpi"><span>Margem desejada (%)</span><input v-model="config.margem_desejada" type="number" min="0" class="bg-transparent text-xl font-semibold w-full" @change="salvarConfig" /></label>
        </div>
        <p v-if="!r.custos.custoMensal" class="mt-3 text-sm text-warning-dark">Cadastre as despesas fixas em “Contas” (marcando “despesa fixa mensal”) para calcular o custo da hora.</p>
      </section>
      <section class="painel">
        <h2 class="text-2xl text-primary dark:text-zinc-100">Preço mínimo por demanda</h2>
        <p class="text-xs text-gray-500">Horas estimadas × custo da hora × (1 + margem). Ajuste as horas pela sua experiência; a rentabilidade abaixo mostra se a estimativa está certa.</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 mt-3">
          <div v-for="p in r.custos.precos" :key="p.demanda" class="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-zinc-800 text-sm">
            <span class="flex-1">{{ p.demanda }}</span>
            <input v-model.number="horas[p.demanda]" type="number" min="0" class="w-16 text-right bg-transparent border-b border-dashed border-gray-300 dark:border-zinc-700" @change="salvarHoras" />
            <span class="text-xs text-gray-400">h</span>
            <b class="w-28 text-right tabular-nums">{{ r.custos.custoMensal ? brl(p.minimo) : '—' }}</b>
          </div>
        </div>
      </section>
      <section class="painel">
        <h2 class="text-2xl text-primary dark:text-zinc-100">Rentabilidade por cliente</h2>
        <p class="text-xs text-gray-500">Recebido − despesas do cliente − horas registradas × custo da hora. Registre o tempo no histórico da ficha (campo “min”). Os menos rentáveis aparecem primeiro.</p>
        <div class="overflow-x-auto mt-3">
          <table class="w-full text-sm min-w-[680px]">
            <thead><tr class="text-left text-[10px] uppercase tracking-widest text-gray-400"><th class="py-2">Cliente</th><th class="text-right">Contratado</th><th class="text-right">Recebido</th><th class="text-right">Despesas</th><th class="text-right">Horas</th><th class="text-right">Resultado</th><th class="text-right">R$/hora</th></tr></thead>
            <tbody>
              <tr v-if="!r.rentabilidade.length"><td colspan="7" class="py-4 text-center text-gray-400">Sem dados ainda.</td></tr>
              <tr v-for="x in r.rentabilidade" :key="x.contato_id" class="border-t border-gray-100 dark:border-zinc-800">
                <td class="py-2">{{ x.nome }} <span class="text-xs text-gray-400">{{ x.demanda }}</span></td>
                <td class="text-right tabular-nums">{{ brl(x.contratado) }}</td>
                <td class="text-right tabular-nums">{{ brl(x.recebido) }}</td>
                <td class="text-right tabular-nums">{{ brl(x.despesas) }}</td>
                <td class="text-right tabular-nums">{{ x.horas || '—' }}</td>
                <td class="text-right tabular-nums font-semibold" :class="x.resultado < 0 ? 'text-danger' : 'text-success-dark'">{{ brl(x.resultado) }}</td>
                <td class="text-right tabular-nums">{{ x.valorHora != null ? brl(x.valorHora) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { brl } from '../../utils/formatadores'

const props = defineProps<{ modo: 'caixa' | 'precos' }>()

interface Resumo {
  fluxo: { mes: string; entradas: number; saidas: number; projetadas: number; resultado: number; saldo: number }[]
  atrasados: { receber: number; pagar: number }
  custos: { custoMensal: number; horasProdutivas: number; custoHora: number; margem: number; horas: Record<string, number>; precos: { demanda: string; horas: number; minimo: number }[] }
  rentabilidade: { contato_id: number; nome: string; demanda: string | null; contratado: number; recebido: number; despesas: number; horas: number; resultado: number; valorHora: number | null }[]
}
const r = ref<Resumo | null>(null)
const config = reactive<Record<string, any>>({})
const horas = reactive<Record<string, number>>({})

async function carregar() {
  const [res, esc] = await Promise.all([$fetch<Resumo>('/api/financeiro/resumo'), $fetch<Record<string, string>>('/api/escritorio')])
  r.value = res
  Object.assign(config, { saldo_caixa: esc.saldo_caixa ?? '', horas_produtivas_mes: res.custos.horasProdutivas, margem_desejada: res.custos.margem })
  Object.assign(horas, res.custos.horas)
}
onMounted(carregar)
defineExpose({ recarregar: carregar })

async function salvarConfig() {
  await $fetch('/api/escritorio', { method: 'PUT', body: { saldo_caixa: String(config.saldo_caixa ?? ''), horas_produtivas_mes: String(config.horas_produtivas_mes ?? ''), margem_desejada: String(config.margem_desejada ?? '') } })
  await carregar()
}
async function salvarHoras() {
  await $fetch('/api/escritorio', { method: 'PUT', body: { horas_estimadas: JSON.stringify(horas) } })
  await carregar()
}

const nomeMes = (m: string) => { const t = new Date(`${m}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1) }
const maxFluxo = computed(() => Math.max(1, ...(r.value?.fluxo ?? []).map(m => Math.abs(m.resultado))))
const mesNegativo = computed(() => r.value?.fluxo.find(m => m.saldo < 0)?.mes ?? null)
void props
</script>

<style scoped>
.painel { @apply rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-5 sm:p-6; }
.kpi { @apply rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 flex flex-col gap-1; }
.kpi > span { @apply text-[10px] font-bold uppercase tracking-widest text-gray-400; }
.kpi > b { @apply text-xl; }
th { @apply font-semibold; }
</style>
