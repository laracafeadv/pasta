<template>
  <div class="space-y-6">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="kpi"><span>Tempo médio de solução</span><b>{{ k?.tempoMedioSolucao != null ? `${k.tempoMedioSolucao} dias` : '—' }}</b><small>{{ k?.encerrados ?? 0 }} caso(s) encerrado(s)</small></div>
      <div class="kpi"><span>Taxa de êxito</span><b>{{ k?.taxaExito != null ? `${k.taxaExito}%` : '—' }}</b><small>êxito, acordo ou parcial</small></div>
      <div class="kpi"><span>NPS</span><b>{{ k?.nps != null ? k.nps : '—' }}</b><small>{{ k?.respostasNps ?? 0 }} resposta(s)</small></div>
      <div class="kpi"><span>Prazos cumpridos no prazo</span><b>{{ k?.prazosNoPrazo != null ? `${k.prazosNoPrazo}%` : '—' }}</b><small :class="k?.prazosVencidos ? 'text-danger font-semibold' : ''">{{ k?.prazosVencidos ?? 0 }} vencido(s) em aberto</small></div>
      <div class="kpi"><span>Do contato à consulta</span><b>{{ k?.diasAteConsulta != null ? `${k.diasAteConsulta} dias` : '—' }}</b><small>média, últimos 90 dias</small></div>
      <div class="kpi"><span>Revisões internas</span><b>{{ k?.revisoes90 ?? 0 }}</b><small>{{ k?.revisoesAprovadas != null ? `${k.revisoesAprovadas}% aprovadas` : 'últimos 90 dias' }}</small></div>
      <div class="kpi"><span>Sem responsável</span><b>{{ k?.semResponsavel ?? 0 }}</b><small>casos abertos sem dono</small></div>
    </div>

    <!-- Carga por pessoa (delegação) -->
    <section class="painel">
      <h2 class="text-2xl text-primary dark:text-zinc-100">Quem está com o quê</h2>
      <p class="text-xs text-gray-500">Casos abertos, atrasos e prazos por pessoa. Atraso concentrado em alguém é sinal de redistribuir, não de cobrar mais. Responsável padrão por etapa: tela Equipe.</p>
      <table class="w-full text-sm mt-3">
        <thead><tr class="text-left text-[10px] uppercase tracking-widest text-gray-400"><th class="py-2 font-semibold">Pessoa</th><th class="font-semibold">Cargo</th><th class="text-right font-semibold">Casos</th><th class="text-right font-semibold">Atrasados</th><th class="text-right font-semibold">Prazos</th></tr></thead>
        <tbody>
          <tr v-for="p in k?.carga ?? []" :key="p.id" class="border-t border-gray-100 dark:border-zinc-800">
            <td class="py-2">{{ p.nome }}</td><td class="text-gray-500">{{ p.cargo || '—' }}</td>
            <td class="text-right tabular-nums">{{ p.abertos }}</td>
            <td class="text-right tabular-nums" :class="p.atrasados ? 'text-danger font-semibold' : ''">{{ p.atrasados }}</td>
            <td class="text-right tabular-nums">{{ p.prazosPendentes }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Revisão por amostragem -->
    <section class="painel">
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 class="text-2xl text-primary dark:text-zinc-100">Revisão interna por amostragem</h2>
          <p class="text-xs text-gray-500">Toda semana, sorteie alguns casos ativos e confira o checklist. Falha vira plano de ação com responsável e data (entra na agenda).</p>
        </div>
        <Button size="sm" icon="ph:shuffle-bold" :loading="sorteando" @click="sortear">Sortear 3 casos</Button>
      </div>
      <div v-if="amostra.length" class="flex flex-wrap gap-2 mt-3">
        <button v-for="c in amostra" :key="c.id" class="px-4 py-2 rounded-2xl border text-left text-sm hover:border-primary" :class="revisando?.id === c.id ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-zinc-700'" @click="abrirRevisao(c)">
          <b>{{ c.titulo }}</b><span class="block text-xs text-gray-500">{{ c.contato?.nome }}</span>
        </button>
      </div>
      <p v-else-if="sorteado" class="text-sm text-gray-400 mt-3">Todos os casos ativos foram revisados nos últimos 30 dias.</p>

      <form v-if="revisando" class="mt-4 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 space-y-3" @submit.prevent="salvarRevisao">
        <p class="font-semibold">{{ revisando.titulo }}</p>
        <div v-for="i in ITENS_REVISAO" :key="i.chave" class="flex flex-wrap items-center gap-2 text-sm">
          <span class="flex-1 min-w-[220px]">{{ i.rotulo }}</span>
          <button v-for="o in opcoes" :key="o.v" type="button" class="px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border"
                  :class="itens[i.chave] === o.v ? o.cor : 'border-gray-200 dark:border-zinc-700 text-gray-500'" @click="itens[i.chave] = o.v">{{ o.n }}</button>
        </div>
        <textarea v-model="obs" rows="2" class="modal-input" placeholder="Observações da revisão" />
        <div v-if="falhas" class="grid grid-cols-1 sm:grid-cols-[1fr_160px_200px] gap-2">
          <input v-model="plano" class="modal-input" placeholder="Plano de ação: o que será corrigido" required />
          <input v-model="prazo" type="date" class="modal-input" required />
          <select v-model="responsavel" class="modal-input">
            <option value="">Eu mesma</option>
            <option v-for="p in k?.carga ?? []" :key="p.id" :value="p.id">{{ p.nome }}</option>
          </select>
        </div>
        <div class="flex items-center gap-3">
          <Button type="submit" size="sm" icon="ph:check-bold" :loading="salvando">{{ falhas ? `Registrar com ${falhas} ponto(s) a corrigir` : 'Aprovar revisão' }}</Button>
          <span v-if="erro" class="text-sm text-danger">{{ erro }}</span>
        </div>
      </form>

      <h3 class="text-[10px] font-bold uppercase tracking-widest text-primary mt-6 mb-2">Últimas revisões</h3>
      <p v-if="!revisoes.length" class="text-sm text-gray-400">Nenhuma revisão ainda.</p>
      <ul class="divide-y divide-gray-100 dark:divide-zinc-800 text-sm">
        <li v-for="r in revisoes" :key="r.id" class="py-2 flex flex-wrap gap-2 items-baseline">
          <span class="w-24 text-xs text-gray-500">{{ dataCurta(r.created_at) }}</span>
          <span class="flex-1">{{ r.caso?.titulo }} <span class="text-xs text-gray-500">· {{ r.caso?.contato?.nome }} · {{ r.revisor?.name }}</span></span>
          <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" :class="r.aprovado ? 'bg-success/15 text-success-dark' : 'bg-warning/15 text-warning-dark'">{{ r.aprovado ? 'Aprovada' : 'Com plano de ação' }}</span>
          <p v-if="r.plano_acao" class="basis-full pl-24 text-xs text-gray-500">Plano: {{ r.plano_acao }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import Button from '../Button.vue'
import { ITENS_REVISAO, type Caso, type Contato, type ResultadoItem, type Revisao } from '../../../shared/types/crm'
import { dataCurta } from '../../utils/formatadores'
import { hojeISO } from '../../stores/crm'

interface Kpis {
  tempoMedioSolucao: number | null; encerrados: number; taxaExito: number | null; nps: number | null; respostasNps: number
  prazosNoPrazo: number | null; prazosVencidos: number; diasAteConsulta: number | null; revisoes90: number; revisoesAprovadas: number | null
  carga: { id: string; nome: string; cargo: string | null; abertos: number; atrasados: number; prazosPendentes: number }[]; semResponsavel: number
}
type CasoAmostra = Pick<Caso, 'id' | 'titulo'> & { contato?: Pick<Contato, 'id' | 'nome'> | null }

const k = ref<Kpis | null>(null)
const revisoes = ref<Revisao[]>([])
const amostra = ref<CasoAmostra[]>([])
const sorteado = ref(false)
const sorteando = ref(false)
const revisando = ref<CasoAmostra | null>(null)
const itens = reactive<Record<string, ResultadoItem>>({})
const obs = ref('')
const plano = ref('')
const prazo = ref('')
const responsavel = ref('')
const salvando = ref(false)
const erro = ref('')
const opcoes = [
  { v: 'ok' as const, n: 'OK', cor: 'bg-success/15 text-success-dark border-success/40' },
  { v: 'falha' as const, n: 'Falha', cor: 'bg-danger/15 text-danger-dark border-danger/40' },
  { v: 'na' as const, n: 'N/A', cor: 'bg-gray-100 dark:bg-zinc-800 text-gray-600 border-gray-300' },
]
const falhas = computed(() => Object.values(itens).filter(v => v === 'falha').length)

async function carregar() {
  const [a, b] = await Promise.all([$fetch<Kpis>('/api/qualidade/kpis'), $fetch<Revisao[]>('/api/qualidade/revisoes')])
  k.value = a
  revisoes.value = b
}
onMounted(carregar)

async function sortear() {
  sorteando.value = true
  try {
    amostra.value = await $fetch<CasoAmostra[]>('/api/qualidade/amostra', { params: { n: 3 } })
    sorteado.value = true
    revisando.value = null
  } finally {
    sorteando.value = false
  }
}
function abrirRevisao(c: CasoAmostra) {
  revisando.value = c
  for (const i of ITENS_REVISAO) itens[i.chave] = 'ok'
  obs.value = ''
  plano.value = ''
  prazo.value = hojeISO(3)
  responsavel.value = ''
  erro.value = ''
}
async function salvarRevisao() {
  if (!revisando.value) return
  salvando.value = true
  erro.value = ''
  try {
    await $fetch('/api/qualidade/revisoes', {
      method: 'POST',
      body: { caso_id: revisando.value.id, itens: { ...itens }, observacao: obs.value, plano_acao: falhas.value ? plano.value : null, prazo: falhas.value ? prazo.value : null, responsavel_id: responsavel.value || null },
    })
    amostra.value = amostra.value.filter(c => c.id !== revisando.value!.id)
    revisando.value = null
    await carregar()
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível salvar.'
  } finally {
    salvando.value = false
  }
}
</script>

<style scoped>
.painel { @apply rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-5 sm:p-6; }
.kpi { @apply rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-4 flex flex-col gap-1; }
.kpi > span { @apply text-[10px] font-bold uppercase tracking-widest text-gray-400; }
.kpi > b { @apply text-2xl text-primary dark:text-zinc-100; }
.kpi > small { @apply text-xs text-gray-500; }
</style>
