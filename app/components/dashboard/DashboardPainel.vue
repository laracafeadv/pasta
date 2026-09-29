<template>
  <div class="space-y-6">
    <!-- Cabeçalho -->
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div class="min-w-0">
        <p class="eyebrow">{{ saudacao }} · {{ dataExtenso }}</p>
        <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Dashboard</h1>
        <p class="text-sm text-gray-500 dark:text-zinc-400 mt-2 max-w-2xl">{{ frase }}</p>
      </div>
      <div class="relative flex flex-wrap items-center gap-2">
        <button type="button" class="btn-mini bg-primary text-white inline-flex items-center gap-1.5 !px-3.5 !py-2" @click="tarefaAberta = true"><Icon name="ph:plus-bold" /> Nova tarefa</button>
        <button type="button" class="btn-mini border border-gray-300 dark:border-zinc-700 hover:border-primary inline-flex items-center gap-1.5 !px-3.5 !py-2" @click="emEdicao = null; formAberto = true"><Icon name="ph:plus-bold" /> Novo contato</button>
        <span v-if="data" class="hidden sm:inline text-[11px] text-gray-400">atualizado às {{ horaAtualizacao }}</span>
        <button type="button" class="btn-ico" :disabled="atualizando" aria-label="Atualizar agora" title="Atualizar agora" @click="carregar(true)">
          <Icon name="ph:arrow-clockwise-bold" :class="atualizando ? 'animate-spin' : ''" />
        </button>
        <button type="button" class="btn-ico" aria-label="Escolher o que aparece" title="Escolher o que aparece" :aria-expanded="menuBlocos" @click="menuBlocos = !menuBlocos">
          <Icon name="ph:sliders-horizontal-bold" />
        </button>
        <div v-if="menuBlocos" class="absolute right-0 top-full mt-2 z-30 w-64 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-xl p-3 space-y-1">
          <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1 pb-1">Mostrar no Dashboard</p>
          <label v-for="b in BLOCOS" :key="b.id" class="flex items-center gap-2.5 px-1 py-1.5 text-sm cursor-pointer rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800">
            <input v-model="visiveis[b.id]" type="checkbox" class="accent-[#3c2923]" /> {{ b.nome }}
          </label>
          <p class="text-[11px] text-gray-400 px-1 pt-1">O resumo e o "Atenção agora" sempre aparecem. A escolha fica neste navegador.</p>
        </div>
      </div>
    </header>

    <!-- Estado de carregamento / erro -->
    <div v-if="carregando && !data" class="space-y-4" aria-busy="true">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3"><div v-for="i in 4" :key="i" class="h-28 rounded-3xl bg-gray-200/60 dark:bg-zinc-800/60 animate-pulse" /></div>
      <div class="h-72 rounded-3xl bg-gray-200/60 dark:bg-zinc-800/60 animate-pulse" />
    </div>
    <div v-else-if="erro && !data" class="painel text-sm">
      <p class="text-danger font-semibold">{{ erro }}</p>
      <button type="button" class="btn-mini border border-gray-300 dark:border-zinc-700 mt-3" @click="carregar()">Tentar de novo</button>
    </div>

    <template v-else-if="data">
      <!-- 1. VISÃO GERAL -->
      <section aria-label="Visão geral" class="space-y-3">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button v-for="k in kpis" :key="k.titulo" type="button" class="text-left rounded-3xl bg-white/70 dark:bg-zinc-900/60 border p-4 sm:p-5 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" :class="ESTADO[k.estado].borda" @click="k.ir()">
            <span class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400"><Icon :name="k.icone" class="text-sm" />{{ k.titulo }}</span>
            <span class="block font-serif text-4xl sm:text-5xl mt-1.5 leading-none tabular-nums" :class="ESTADO[k.estado].numero">{{ k.valor }}</span>
            <span class="block text-xs text-gray-500 dark:text-zinc-400 mt-2 leading-snug min-h-[2.2em]">{{ k.sub }}</span>
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button v-for="c in chips" :key="c.rotulo" type="button" class="chip" @click="navigateTo(c.to)">
            {{ c.rotulo }} <b class="tabular-nums">{{ c.valor }}</b>
          </button>
        </div>
      </section>

      <!-- 2. ATENÇÃO AGORA + 3. PRÓXIMOS EVENTOS -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <section id="atencao" class="painel scroll-mt-24" :class="visiveis.agenda ? 'xl:col-span-2' : 'xl:col-span-3'">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 class="titulo">Atenção agora</h2>
            <div class="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar">
              <button v-for="f in FILTROS" :key="f.id" type="button" role="tab" :aria-selected="filtro === f.id" class="filtro" :class="filtro === f.id ? 'filtro-ativo' : ''" @click="filtro = f.id; mostrarTodos = false">
                {{ f.nome }} <span class="opacity-60">{{ contagemGrupo[f.id] }}</span>
              </button>
            </div>
          </div>

          <p v-if="!listaAtencao.length" class="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
            <Icon name="ph:check-circle-bold" class="text-xl text-success" />
            {{ filtro === 'todos' ? 'Nada exigindo ação agora.' : 'Nada neste filtro.' }}
          </p>
          <ul v-else class="space-y-2">
            <li v-for="i in itensVisiveis" :key="i.id" class="rounded-2xl bg-white dark:bg-zinc-800/80 border-l-4 px-3.5 py-3 flex flex-wrap items-center gap-x-3 gap-y-2 shadow-sm" :class="SEVERIDADE[i.severidade].borda">
              <Icon :name="ICONE_ORIGEM[i.origem]" class="text-lg shrink-0" :class="SEVERIDADE[i.severidade].icone" />
              <div class="min-w-0 flex-1 basis-56">
                <button type="button" class="block max-w-full text-left text-sm font-bold text-primary dark:text-zinc-100 truncate hover:underline" @click="abrirItem(i)">{{ i.titulo }}</button>
                <p class="text-xs text-gray-500 dark:text-zinc-400 truncate">
                  <span class="font-semibold" :class="SEVERIDADE[i.severidade].texto">{{ SEVERIDADE[i.severidade].nome }}</span>
                  <span v-if="i.detalhe"> · {{ i.detalhe }}</span>
                </p>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <button v-if="i.origem === 'tarefa'" type="button" class="btn-mini bg-primary text-white" @click="concluirTarefa(i)">Feita</button>
                <button v-else-if="i.origem === 'prazo' || (i.origem === 'compromisso' && i.compromissoId)" type="button" class="btn-mini bg-primary text-white" @click="concluirCompromisso(i)">Concluído</button>
                <button v-if="i.contatoId" type="button" class="btn-mini border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="abrirFicha(i.contatoId, i.aba)">Abrir ficha</button>
                <button v-else type="button" class="btn-mini border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="navigateTo(i.link)">Ver</button>
              </div>
            </li>
          </ul>
          <button v-if="listaAtencao.length > 5" type="button" class="mt-3 text-xs font-semibold text-primary dark:text-zinc-200 underline underline-offset-2" @click="mostrarTodos = !mostrarTodos">
            {{ mostrarTodos ? 'Mostrar menos' : `Ver os outros ${listaAtencao.length - 5}` }}
          </button>
          <NuxtLink to="/crm" class="mt-3 ml-4 inline-block text-xs font-semibold text-primary dark:text-zinc-200 underline underline-offset-2">Abrir Hoje (trabalho do dia)</NuxtLink>
        </section>

        <section v-if="visiveis.agenda" id="agenda" class="painel scroll-mt-24">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 class="titulo">Próximos eventos</h2>
            <div class="flex gap-1.5" role="tablist" aria-label="Período da agenda">
              <button v-for="p in PERIODOS_AGENDA" :key="p.id" type="button" role="tab" :aria-selected="periodoAgenda === p.id" class="filtro" :class="periodoAgenda === p.id ? 'filtro-ativo' : ''" @click="periodoAgenda = p.id">{{ p.nome }}</button>
            </div>
          </div>
          <p v-if="!agendaPorDia.length" class="text-sm text-gray-500 py-6 text-center">Nada agendado {{ periodoAgenda === 'hoje' ? 'para hoje' : periodoAgenda === 'amanha' ? 'para amanhã' : 'nos próximos 7 dias' }}.</p>
          <div v-else class="space-y-4">
            <div v-for="g in agendaPorDia" :key="g.dia">
              <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{{ rotuloDia(g.dia) }}</p>
              <ul class="space-y-1.5">
                <li v-for="ev in g.eventos" :key="ev.id">
                  <button type="button" class="w-full text-left flex items-start gap-3 rounded-2xl px-2.5 py-2 hover:bg-gray-100/70 dark:hover:bg-zinc-800/70" @click="ev.contato ? abrirFicha(ev.contato.id, 'casos') : navigateTo('/crm?aba=hoje&ver=calendario')">
                    <span class="w-14 shrink-0 text-xs font-semibold tabular-nums text-gray-500 pt-0.5">{{ ev.hora ?? 'dia todo' }}</span>
                    <span class="min-w-0 flex-1">
                      <span class="flex items-center gap-1.5 text-sm font-semibold text-primary dark:text-zinc-100"><Icon :name="iconeTipo(ev.tipo)" class="shrink-0 text-secondary" /><span class="truncate">{{ ev.titulo }}</span></span>
                      <span class="block text-xs text-gray-500 truncate">{{ [ev.contato?.nome, ev.caso, ev.local].filter(Boolean).join(' · ') || nomeTipo(ev.tipo) }}</span>
                    </span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <NuxtLink to="/agenda" class="inline-block mt-4 text-xs font-semibold text-primary dark:text-zinc-200 underline underline-offset-2">Abrir a agenda completa</NuxtLink>
        </section>
      </div>

      <!-- 4. CARGA + FUNIL -->
      <div v-if="visiveis.carga || visiveis.funil" class="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <section v-if="visiveis.carga" class="painel" :class="visiveis.funil ? 'xl:col-span-2' : 'xl:col-span-3'">
          <h2 class="titulo mb-1">Carga de trabalho</h2>
          <p class="text-xs text-gray-500 mb-4">O que está em atraso e o que vence nos próximos 14 dias.</p>
          <CargaChart :carga="data.carga" />
        </section>
        <section v-if="visiveis.funil" class="painel" :class="visiveis.carga ? '' : 'xl:col-span-3'">
          <div class="flex items-baseline justify-between mb-3">
            <h2 class="titulo">Funil</h2>
            <NuxtLink to="/leads" class="text-xs text-gray-500 hover:text-primary underline underline-offset-2">Abrir leads</NuxtLink>
          </div>
          <FunilBars :etapas="data.funil" @abrir="e => navigateTo(e === 'ativo' ? '/clientes' : '/leads')" />
        </section>
      </div>

      <!-- 5. CASOS + ATIVIDADE -->
      <div v-if="visiveis.casos || visiveis.atividade" class="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <section v-if="visiveis.casos" class="painel" :class="visiveis.atividade ? 'xl:col-span-2' : 'xl:col-span-3'">
          <div class="flex items-baseline justify-between mb-3">
            <h2 class="titulo">Demandas em andamento</h2>
            <NuxtLink to="/demandas" class="text-xs text-gray-500 hover:text-primary underline underline-offset-2">Ver todos</NuxtLink>
          </div>
          <p v-if="!data.casosAndamento.length" class="text-sm text-gray-500 py-2">Nenhuma demanda ativa.</p>
          <ul v-else class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            <li v-for="c in data.casosAndamento" :key="c.id">
              <button type="button" class="w-full text-left rounded-2xl px-2.5 py-2 hover:bg-gray-100/70 dark:hover:bg-zinc-800/70" @click="c.contato ? abrirFicha(c.contato.id, 'casos') : navigateTo('/clientes?aba=casos')">
                <span class="block text-sm font-semibold text-primary dark:text-zinc-100 truncate">{{ c.titulo }}</span>
                <span class="block text-xs text-gray-500 truncate">{{ [c.contato?.nome, c.fase].filter(Boolean).join(' · ') }}</span>
                <span class="block text-[11px] mt-0.5" :class="c.proximoPrazo ? 'text-gray-600 dark:text-zinc-300' : 'text-gray-400'">
                  {{ c.proximoPrazo ? `${c.proximoPrazo.titulo} · ${dataCurta(c.proximoPrazo.data)} (${diaRelativo(c.proximoPrazo.data)})` : 'Sem prazo pendente' }}<span v-if="c.tarefasAbertas"> · {{ c.tarefasAbertas }} {{ c.tarefasAbertas === 1 ? 'tarefa' : 'tarefas' }}</span>
                </span>
              </button>
            </li>
          </ul>
        </section>

        <section v-if="visiveis.atividade" class="painel" :class="visiveis.casos ? '' : 'xl:col-span-3'">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 class="titulo">Atividade recente</h2>
            <label class="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer"><input v-model="soMeus" type="checkbox" class="accent-[#3c2923]" /> só o que registrei</label>
          </div>
          <p v-if="!atividadeVisivel.length" class="text-sm text-gray-500 py-4 text-center">Nada registrado ainda.</p>
          <ol v-else class="border-l-2 border-gray-200 dark:border-zinc-800 ml-1">
            <li v-for="a in atividadeVisivel" :key="a.id" class="pl-4 pb-3.5 relative">
              <span class="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full" :class="a.sistema ? 'bg-gray-300 dark:bg-zinc-600' : 'bg-primary'" />
              <p class="text-[11px] text-gray-400">{{ quandoRelativo(a.quando) }}<span v-if="a.tipo !== 'Sistema'"> · {{ a.tipo }}</span></p>
              <p class="text-sm leading-snug" :class="a.sistema ? 'text-gray-500 dark:text-zinc-400' : 'text-primary dark:text-zinc-100'">
                <button v-if="a.contato" type="button" class="font-semibold hover:underline" @click="abrirFicha(a.contato.id, 'atividades')">{{ a.contato.nome || 'Contato' }}</button>
                <span v-if="a.contato"> — </span>{{ a.texto }}
              </p>
            </li>
          </ol>
        </section>
      </div>

      <!-- 6. INDICADORES -->
      <section v-if="visiveis.indicadores" class="painel">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 class="titulo">Indicadores</h2>
          <div class="flex gap-1.5" role="tablist" aria-label="Período dos indicadores">
            <button v-for="d in [7, 30, 90]" :key="d" type="button" role="tab" :aria-selected="dias === d" class="filtro" :class="dias === d ? 'filtro-ativo' : ''" @click="dias = d as 7 | 30 | 90">{{ d }} dias</button>
          </div>
        </div>
        <dl class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-5">
          <div v-for="m in metricas" :key="m.rotulo">
            <dt class="text-[11px] text-gray-500">{{ m.rotulo }}</dt>
            <dd class="font-serif text-2xl text-primary dark:text-zinc-100 tabular-nums leading-tight">{{ m.valor }}</dd>
            <dd v-if="m.sub" class="text-[11px] text-gray-400">{{ m.sub }}</dd>
          </div>
        </dl>
        <div v-if="data.financeiro" class="mt-6 pt-5 border-t border-gray-200/70 dark:border-zinc-800">
          <div class="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Financeiro</h3>
            <NuxtLink to="/honorarios" class="text-xs text-gray-500 hover:text-primary underline underline-offset-2">Abrir o financeiro</NuxtLink>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <dl class="grid grid-cols-3 gap-4">
              <div><dt class="text-[11px] text-gray-500">Recebido no mês</dt><dd class="font-serif text-xl text-primary dark:text-zinc-100 tabular-nums">{{ brl(data.financeiro.recebidoMes) }}</dd></div>
              <div><dt class="text-[11px] text-gray-500">A receber em 30 dias</dt><dd class="font-serif text-xl text-primary dark:text-zinc-100 tabular-nums">{{ brl(data.financeiro.aReceber30d) }}</dd></div>
              <div><dt class="text-[11px] text-gray-500">Em atraso</dt><dd class="font-serif text-xl tabular-nums" :class="data.financeiro.emAtraso ? 'text-danger' : 'text-primary dark:text-zinc-100'">{{ brl(data.financeiro.emAtraso) }}</dd></div>
            </dl>
            <ReceitaChart v-if="mostrarReceita" :meses="data.financeiro.porMes" />
          </div>
        </div>
        <NuxtLink to="/relatorios" class="inline-block mt-5 text-xs font-semibold text-primary dark:text-zinc-200 underline underline-offset-2">Ver relatórios completos</NuxtLink>
      </section>
    </template>

    <!-- Ficha do cliente e seus modais, abertos sem sair do Dashboard -->
    <ContatoDetailModal
      ref="detalhe" :is-open="detalheAberto" :contato-id="detalheId" :aba-inicial="detalheAba"
      @close="fecharFicha" @editar="editarContato" @andamento="registrarAndamento"
    />
    <TarefaFormModal :is-open="tarefaAberta" @close="tarefaAberta = false" @salvo="tarefaAberta = false; carregar(true)" />
    <ContatoFormModal :is-open="formAberto" :contato="emEdicao" :loading="crm.saving" @close="formAberto = false" @submit="salvarContato" />
    <AndamentoModal :is-open="andamentoAberto" :contato="andamentoContato" :etapa-destino="null" :loading="crm.saving" :erro="crm.error" @close="andamentoAberto = false" @submit="concluirAndamento" />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { navigateTo } from '#imports'
import { storeToRefs } from 'pinia'
import CargaChart from './CargaChart.vue'
import FunilBars from './FunilBars.vue'
import ReceitaChart from './ReceitaChart.vue'
import { useCrmStore, type AndamentoPayload } from '../../stores/crm'
import { useProfileStore } from '../../stores/profile'
import { TIPOS_COMPROMISSO, type Contato, type ContatoInput } from '../../../shared/types/crm'
import type { DashboardData, GrupoAtencao, ItemAtencao, OrigemAtencao, Severidade } from '../../../shared/types/dashboard'
import { brl, dataCurta, diaRelativo } from '../../utils/formatadores'

const ContatoDetailModal = defineAsyncComponent(() => import('../crm/ContatoDetailModal.vue'))
const TarefaFormModal = defineAsyncComponent(() => import('../crm/TarefaFormModal.vue'))
const ContatoFormModal = defineAsyncComponent(() => import('../crm/ContatoFormModal.vue'))
const AndamentoModal = defineAsyncComponent(() => import('../crm/AndamentoModal.vue'))

const crm = useCrmStore()
const { profile } = storeToRefs(useProfileStore())

// ─── Dados: uma chamada, atualizada sozinha ─────────────────────────────────────────────
const data = ref<DashboardData | null>(null)
const carregando = ref(true)
const atualizando = ref(false)
const erro = ref<string | null>(null)
const dias = ref<7 | 30 | 90>(30)
let ultima = 0

async function carregar(silencioso = false) {
  if (!silencioso) carregando.value = true
  atualizando.value = true
  try {
    data.value = await $fetch<DashboardData>('/api/dashboard', { params: { dias: dias.value } })
    crm.definirPendencias(data.value.resumo.pendencias)
    erro.value = null
    ultima = Date.now()
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível carregar o Dashboard.'
  } finally {
    carregando.value = false
    atualizando.value = false
  }
}
watch(dias, () => carregar(true))

let timer: ReturnType<typeof setInterval> | undefined
// Ao voltar para a aba depois de um tempo, a visão se atualiza sozinha.
function aoVoltar() {
  if (document.visibilityState === 'visible' && Date.now() - ultima > 2 * 60_000) carregar(true)
}

// ─── Personalização simples: mostrar ou ocultar blocos (neste navegador) ─────────────────
const BLOCOS = [
  { id: 'agenda', nome: 'Próximos eventos' },
  { id: 'carga', nome: 'Carga de trabalho' },
  { id: 'funil', nome: 'Funil' },
  { id: 'casos', nome: 'Demandas em andamento' },
  { id: 'atividade', nome: 'Atividade recente' },
  { id: 'indicadores', nome: 'Indicadores' },
]
const visiveis = reactive<Record<string, boolean>>({ agenda: true, carga: true, funil: true, casos: true, atividade: true, indicadores: true })
const menuBlocos = ref(false)
watch(visiveis, () => { try { localStorage.setItem('dashboard:blocos', JSON.stringify(visiveis)) } catch { /* sem armazenamento: segue o padrão */ } }, { deep: true })

onMounted(() => {
  try {
    const salvo = localStorage.getItem('dashboard:blocos')
    if (salvo) Object.assign(visiveis, JSON.parse(salvo))
  } catch { /* ignora */ }
  carregar()
  timer = setInterval(() => { if (document.visibilityState === 'visible') carregar(true) }, 5 * 60_000)
  document.addEventListener('visibilitychange', aoVoltar)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  document.removeEventListener('visibilitychange', aoVoltar)
})

// ─── Cabeçalho ──────────────────────────────────────────────────────────────────────────
const saudacao = computed(() => {
  const h = new Date().getHours()
  const nome = profile.value?.name?.split(' ')[0]
  const parte = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  return nome ? `${parte}, ${nome}` : parte
})
const dataExtenso = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const horaAtualizacao = computed(() => (data.value ? new Date(data.value.geradoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''))
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`
const frase = computed(() => {
  const r = data.value?.resumo
  if (!r) return 'Carregando a visão do escritório…'
  if (r.atrasado.total) return `${plural(r.atrasado.total, 'item atrasado', 'itens atrasados')} e ${r.hoje.total ? `${r.hoje.total} para hoje` : 'nada mais para hoje'}.`
  if (r.hoje.total) return `Nada atrasado. ${plural(r.hoje.total, 'item para hoje', 'itens para hoje')}.`
  return 'Nada atrasado e nada marcado para hoje.'
})

// ─── Visão geral ────────────────────────────────────────────────────────────────────────
type Estado = 'normal' | 'atencao' | 'atrasado' | 'urgente'
const ESTADO: Record<Estado, { borda: string; numero: string }> = {
  normal: { borda: 'border-gray-200/70 dark:border-zinc-800', numero: 'text-primary dark:text-zinc-100' },
  atencao: { borda: 'border-secondary/50', numero: 'text-secondary-dark' },
  atrasado: { borda: 'border-warning/60', numero: 'text-warning-dark' },
  urgente: { borda: 'border-danger/60', numero: 'text-danger' },
}
const partes = (o: { tarefas?: number; prazos?: number; compromissos?: number; retornos?: number }) =>
  [o.prazos && plural(o.prazos, 'prazo', 'prazos'), o.compromissos && plural(o.compromissos, 'compromisso', 'compromissos'), o.tarefas && plural(o.tarefas, 'tarefa', 'tarefas'), o.retornos && plural(o.retornos, 'retorno', 'retornos')]
    .filter(Boolean).join(' · ')
const rolar = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

const kpis = computed(() => {
  const r = data.value?.resumo
  if (!r) return []
  const urgenteHoje = data.value!.atencao.some(i => i.severidade === 'urgente' && i.data === data.value!.hoje)
  return [
    { titulo: 'Hoje', icone: 'ph:sun-bold', valor: r.hoje.total, sub: partes(r.hoje) || 'Nada marcado para hoje', estado: (urgenteHoje ? 'atencao' : 'normal') as Estado, ir: () => navigateTo('/crm') },
    { titulo: 'Atrasado', icone: 'ph:warning-bold', valor: r.atrasado.total, sub: partes(r.atrasado) || 'Nada atrasado', estado: (r.atrasado.prazos ? 'urgente' : r.atrasado.total ? 'atrasado' : 'normal') as Estado, ir: () => { filtro.value = 'todos'; rolar('atencao') } },
    { titulo: 'Próximos 7 dias', icone: 'ph:calendar-blank-bold', valor: r.proximos7.total, sub: partes(r.proximos7) || 'Semana livre', estado: 'normal' as Estado, ir: () => { periodoAgenda.value = '7d'; visiveis.agenda = true; rolar('agenda') } },
    { titulo: 'Carteira', icone: 'ph:users-bold', valor: r.carteira.clientesAtivos, sub: `${r.carteira.clientesAtivos === 1 ? 'cliente ativo' : 'clientes ativos'} · ${plural(r.carteira.casosAtivos, 'demanda em andamento', 'demandas em andamento')}`, estado: 'normal' as Estado, ir: () => navigateTo('/clientes') },
  ]
})
const chips = computed(() => {
  const r = data.value?.resumo
  if (!r) return []
  const lista = [
    { rotulo: 'Tarefas abertas', valor: r.abertas.tarefas, to: '/tarefas' },
    { rotulo: 'Prazos pendentes', valor: r.abertas.prazos, to: '/prazos' },
    { rotulo: 'Clientes com documentos pendentes', valor: r.abertas.documentosClientes, to: '/clientes' },
    { rotulo: 'Leads em aberto', valor: r.carteira.leadsAbertos, to: '/leads' },
    { rotulo: r.abertas.propostas ? `Propostas em aberto (${brl(r.abertas.propostasValor)})` : 'Propostas em aberto', valor: r.abertas.propostas, to: '/honorarios' },
  ]
  return lista
})

// ─── Atenção agora ──────────────────────────────────────────────────────────────────────
const FILTROS: { id: 'todos' | GrupoAtencao; nome: string }[] = [
  { id: 'todos', nome: 'Tudo' }, { id: 'prazos', nome: 'Prazos e agenda' }, { id: 'tarefas', nome: 'Tarefas' }, { id: 'clientes', nome: 'Clientes' },
]
const filtro = ref<'todos' | GrupoAtencao>('todos')
const mostrarTodos = ref(false)
const contagemGrupo = computed(() => {
  const l = data.value?.atencao ?? []
  return { todos: l.length, prazos: l.filter(i => i.grupo === 'prazos').length, tarefas: l.filter(i => i.grupo === 'tarefas').length, clientes: l.filter(i => i.grupo === 'clientes').length }
})
const listaAtencao = computed(() => (data.value?.atencao ?? []).filter(i => filtro.value === 'todos' || i.grupo === filtro.value))
const itensVisiveis = computed(() => (mostrarTodos.value ? listaAtencao.value : listaAtencao.value.slice(0, 5)))

const SEVERIDADE: Record<Severidade, { nome: string; borda: string; icone: string; texto: string }> = {
  urgente: { nome: 'Urgente', borda: 'border-danger', icone: 'text-danger', texto: 'text-danger' },
  atrasado: { nome: 'Atrasado', borda: 'border-warning', icone: 'text-warning-dark', texto: 'text-warning-dark' },
  atencao: { nome: 'Atenção', borda: 'border-secondary', icone: 'text-secondary-dark', texto: 'text-secondary-dark' },
}
const ICONE_ORIGEM: Record<OrigemAtencao, string> = {
  prazo: 'ph:hourglass-high-bold', compromisso: 'ph:calendar-blank-bold', tarefa: 'ph:check-square-bold', retorno: 'ph:arrow-clockwise-bold',
  resposta: 'ph:chat-circle-text-bold', sugestao: 'ph:sparkle-bold', formulario: 'ph:clipboard-text-bold', formulario_pendente: 'ph:clipboard-text-bold',
  sem_acao: 'ph:warning-bold', documentos: 'ph:folder-bold',
}

function tirarDaLista(id: string) {
  if (data.value) data.value = { ...data.value, atencao: data.value.atencao.filter(i => i.id !== id) }
}
async function acao(i: ItemAtencao, chamada: () => Promise<unknown>) {
  tirarDaLista(i.id) // some na hora; a atualização em seguida confirma os números
  try {
    await chamada()
  } catch (e: any) {
    alert(e?.data?.message || 'Não foi possível concluir. Atualizando…')
  }
  carregar(true)
}
// URL como texto simples (string): o $fetch tipado do Nuxt estoura a profundidade de tipos com URLs montadas.
const patch = (url: string, body: Record<string, unknown>) => $fetch(url, { method: 'PATCH', body })
const concluirTarefa = (i: ItemAtencao) => acao(i, () => patch('/api/tarefas/' + i.tarefaId, { concluida: true }))
const concluirCompromisso = (i: ItemAtencao) => acao(i, () => patch('/api/compromissos/' + i.compromissoId, { status: 'concluido' }))
function abrirItem(i: ItemAtencao) {
  if (i.contatoId) abrirFicha(i.contatoId, i.aba)
  else navigateTo(i.link)
}

// ─── Próximos eventos ───────────────────────────────────────────────────────────────────
const PERIODOS_AGENDA = [{ id: 'hoje', nome: 'Hoje' }, { id: 'amanha', nome: 'Amanhã' }, { id: '7d', nome: '7 dias' }] as const
const periodoAgenda = ref<'hoje' | 'amanha' | '7d'>('7d')
const somarDia = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE') }
const agendaPorDia = computed(() => {
  const d = data.value
  if (!d) return []
  const amanha = somarDia(d.hoje, 1)
  const lista = d.agenda.filter(e => periodoAgenda.value === '7d' || e.dia === (periodoAgenda.value === 'hoje' ? d.hoje : amanha))
  const mapa = new Map<string, typeof lista>()
  for (const e of lista) mapa.set(e.dia, [...(mapa.get(e.dia) ?? []), e])
  return [...mapa.entries()].map(([dia, eventos]) => ({ dia, eventos }))
})
const rotuloDia = (dia: string) => {
  const rel = diaRelativo(dia)
  const semana = new Date(`${dia}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })
  return rel === 'hoje' || rel === 'amanhã' ? `${rel} · ${semana}` : semana
}
const iconeTipo = (tipo: string) => (tipo === 'prazo' ? 'ph:hourglass-high-bold' : tipo === 'audiencia' ? 'ph:gavel-bold' : tipo === 'consulta' ? 'ph:video-camera-bold' : 'ph:users-bold')
const nomeTipo = (tipo: string) => TIPOS_COMPROMISSO[tipo as keyof typeof TIPOS_COMPROMISSO]?.nome ?? 'Compromisso'

// ─── Indicadores ────────────────────────────────────────────────────────────────────────
const metricas = computed(() => {
  const p = data.value?.periodo
  if (!p) return []
  return [
    { rotulo: 'Novos contatos', valor: p.novosContatos },
    { rotulo: 'Consultas pagas', valor: p.consultasPagas },
    { rotulo: 'Contratos fechados', valor: p.contratos.total, sub: p.contratos.total ? brl(p.contratos.valor) : '' },
    { rotulo: 'Tarefas concluídas', valor: p.tarefasConcluidas },
    { rotulo: 'Prazos cumpridos', valor: p.prazosCumpridos },
  ]
})
// O gráfico só aparece quando há pelo menos 2 meses com recebimento: antes disso é só um número.
const mostrarReceita = computed(() => (data.value?.financeiro?.porMes.filter(m => m.recebido > 0).length ?? 0) >= 2)

// ─── Atividade ──────────────────────────────────────────────────────────────────────────
const soMeus = ref(false)
const atividadeVisivel = computed(() => (data.value?.atividade ?? []).filter(a => !soMeus.value || !a.sistema).slice(0, 8))
function quandoRelativo(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'ontem' : d < 7 ? `há ${d} dias` : new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// ─── Ficha aberta aqui mesmo (mesmos modais de Leads e Clientes) ─────────────────────────
const detalhe = ref<{ recarregar: () => void } | null>(null)
const detalheAberto = ref(false)
const detalheId = ref<number | null>(null)
const detalheAba = ref<string | undefined>(undefined)
function abrirFicha(id: number, aba?: string) { detalheId.value = id; detalheAba.value = aba; detalheAberto.value = true }
function fecharFicha() { detalheAberto.value = false; carregar(true) }

const tarefaAberta = ref(false)
const formAberto = ref(false)
const emEdicao = ref<Contato | null>(null)
function editarContato(c: Contato) { emEdicao.value = c; formAberto.value = true }
async function salvarContato(d: ContatoInput) {
  try {
    await crm.salvar(emEdicao.value?.id ?? null, d)
    formAberto.value = false
    detalhe.value?.recarregar()
    carregar(true)
  } catch (e: any) {
    alert(e?.data?.message || 'Não foi possível salvar.')
  }
}
const andamentoAberto = ref(false)
const andamentoContato = ref<Contato | null>(null)
function registrarAndamento(c: Contato) { andamentoContato.value = c; crm.error = null; andamentoAberto.value = true }
async function concluirAndamento(d: AndamentoPayload) {
  if (!andamentoContato.value) return
  try {
    await crm.registrarAndamento(andamentoContato.value.id, d)
    andamentoAberto.value = false
    detalhe.value?.recarregar()
  } catch { /* a mensagem aparece no modal via crm.error */ }
}
</script>

<style scoped>
.painel { @apply rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-5 sm:p-6; }
.titulo { @apply text-lg font-serif text-primary dark:text-zinc-100; }
.btn-ico { @apply w-9 h-9 inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-zinc-700 text-gray-500 hover:text-primary hover:border-primary transition-colors disabled:opacity-60; }
.btn-mini { @apply text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full transition-colors; }
.chip { @apply inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/60 px-3.5 py-1.5 text-xs text-gray-600 dark:text-zinc-300 hover:border-primary hover:text-primary transition-colors; }
.chip b { @apply text-primary dark:text-zinc-100; }
.filtro { @apply rounded-full border border-gray-300 dark:border-zinc-700 px-3 py-1 text-[11px] font-semibold text-gray-500 dark:text-zinc-400 hover:text-primary transition-colors; }
.filtro-ativo { @apply bg-primary text-white border-primary hover:text-white; }
</style>
