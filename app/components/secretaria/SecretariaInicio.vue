<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { hojeISO } from '~/stores/crm'
import { ATALHOS_PADRAO, type AtalhoSecretaria, type InicioSecretaria, type ItemAgenda, type LembreteRapido } from '~~/shared/data/secretaria'
import { NAO_CONFIRMADO, TRIBUNAIS, addDays, contarPrazo, dow, feriadosDe, type ContextoPrazo } from '~~/shared/utils/calendarioForense'
import { interpretarTexto, type PropostaSecretaria } from '~~/shared/utils/secretariaTexto'

const emit = defineEmits<{ urgentes: [number] }>()

// Início da Secretária: Hoje, campo "O que você precisa?", atalhos, agenda de 14 dias, lembretes e contagem de prazo.
// Tem agenda PRÓPRIA (tabela secretaria_itens): não lê nem grava nas telas de Agenda, Prazos e Tarefas do CRM.
const dados = ref<InicioSecretaria | null>(null)
const carregando = ref(true)
const erro = ref<string | null>(null)
const aviso = ref<string | null>(null)
const hoje = computed(() => dados.value?.hoje ?? hojeISO())
const config = computed(() => dados.value?.config ?? { tribunal: 'tjba' as const, pontos_facultativos: false, cidade: 'Salvador', atalhos: ATALHOS_PADRAO })
const msg = (e: any, padrao: string) => e?.data?.message || padrao

async function carregar() {
  carregando.value = true
  try {
    dados.value = await $fetch<InicioSecretaria>('/api/secretaria/inicio')
    erro.value = null
    emit('urgentes', urgentes.value)
  } catch (e: any) { erro.value = msg(e, 'Não foi possível carregar a Secretária.') } finally { carregando.value = false }
}
onMounted(carregar)

// ── formatação ──
const utc = (iso: string) => { const [y, m, d] = iso.split('-').map(Number) as [number, number, number]; return Date.UTC(y, m - 1, d) }
const fmt = (iso: string, o: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', ...o }).format(new Date(utc(iso)))
const semana = (iso: string) => fmt(iso, { weekday: 'long' })

const TIPOS: Record<string, { nome: string; cor: string }> = {
  prazo: { nome: 'Prazo fatal', cor: '#b3261e' }, audiencia: { nome: 'Audiência', cor: '#c2185b' }, consulta: { nome: 'Consulta jurídica', cor: '#9a7410' },
  tarefa: { nome: 'Tarefa', cor: '#3f6b5b' }, compromisso: { nome: 'Compromisso', cor: '#5b6775' },
}

// ── Hoje ──
const eventos = computed(() => dados.value?.eventos ?? [])
const prazosVencidos = computed(() => eventos.value.filter(e => e.tipo === 'prazo' && e.dia < hoje.value))
const prazosHoje = computed(() => eventos.value.filter(e => e.tipo === 'prazo' && e.dia === hoje.value))
const prazosAmanha = computed(() => eventos.value.filter(e => e.tipo === 'prazo' && e.dia === addDays(hoje.value, 1)))
const lembretes = computed(() => dados.value?.lembretes ?? [])
const atrasados = computed(() => {
  const agora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', hour: '2-digit', minute: '2-digit' }).format(new Date())
  return lembretes.value.filter(l => !l.feito && l.data && (l.data < hoje.value || (l.data === hoje.value && l.hora && l.hora < agora)))
})
const compromissosHoje = computed(() => eventos.value.filter(e => e.dia === hoje.value && e.hora && e.tipo !== 'prazo'))
const urgentes = computed(() => prazosVencidos.value.length + prazosHoje.value.length + prazosAmanha.value.length + atrasados.value.length)
watch(urgentes, n => emit('urgentes', n))
function irPara(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

// ── campo em linguagem natural ──
const texto = ref('')
const prop = ref<PropostaSecretaria & { duracao: number; local: string; cliente: string } | null>(null)
const nlErro = ref<string | null>(null)
const criando = ref(false)
function interpretar() {
  nlErro.value = null; aviso.value = null
  if (!texto.value.trim()) return
  const p = interpretarTexto(texto.value, hoje.value)
  prop.value = { ...p, dias: p.tipo === 'prazo' ? (p.dias ?? 15) : p.dias, duracao: 60, local: '', cliente: '' }
}
const ctx = computed<ContextoPrazo>(() => ({ trib: config.value.tribunal, ssa: /salvador/i.test(config.value.cidade), fac: config.value.pontos_facultativos, susp: (dados.value?.suspensoes ?? []).map(s => ({ de: s.de, ate: s.ate, trib: s.tribunal, motivo: s.motivo })) }))
const previa = computed(() => prop.value?.tipo === 'prazo' && prop.value.dias && /^\d{4}-\d{2}-\d{2}$/.test(prop.value.inicio) ? contarPrazo(prop.value.inicio, prop.value.dias, ctx.value) : null)
const ROTULO_TIPO: Record<string, string> = { lembrete: 'Lembrete', prazo: 'Prazo', audiencia: 'Audiência', consulta: 'Consulta jurídica', compromisso: 'Compromisso', tarefa: 'Tarefa' }
async function confirmar() {
  const p = prop.value; if (!p) return
  criando.value = true; nlErro.value = null
  try {
    const r = await $fetch<{ vencimento?: string }>('/api/secretaria/criar', { method: 'POST', body: { tipo: p.tipo, titulo: p.titulo, data: p.data || null, hora: p.hora || null, dias: p.dias, inicio: p.inicio, local: p.local || null, cliente: p.cliente || null } })
    aviso.value = p.tipo === 'prazo' && r.vencimento ? `Prazo criado na agenda da Secretária: vence em ${fmt(r.vencimento)} (${semana(r.vencimento)}). Confirme no sistema do tribunal.` : 'Criado.'
    prop.value = null; texto.value = ''; await carregar()
  } catch (e: any) { nlErro.value = msg(e, 'Não foi possível criar.') } finally { criando.value = false }
}

// ── resumo do dia (montado com os dados, sem IA) ──
const resumo = ref('')
function resumoDoDia() {
  const L: string[] = []
  const tit = (l: ItemAgenda[]) => l.map(e => e.titulo).join('; ')
  L.push(`Resumo de ${fmt(hoje.value, { weekday: 'long', day: '2-digit', month: 'long' })}:`)
  if (prazosVencidos.value.length) L.push(`• PRAZOS VENCIDOS SEM BAIXA (${prazosVencidos.value.length}): ${tit(prazosVencidos.value)}.`)
  L.push(prazosHoje.value.length ? `• PRAZOS QUE VENCEM HOJE (${prazosHoje.value.length}): ${tit(prazosHoje.value)}.` : '• Nenhum prazo vence hoje.')
  L.push(prazosAmanha.value.length ? `• Prazos de amanhã (${prazosAmanha.value.length}): ${tit(prazosAmanha.value)}.` : '• Nenhum prazo vence amanhã.')
  if (atrasados.value.length) L.push(`• Lembretes atrasados (${atrasados.value.length}): ${atrasados.value.map(l => l.texto).join('; ')}.`)
  const hojeTodos = eventos.value.filter(e => e.dia === hoje.value && e.tipo !== 'prazo')
  if (hojeTodos.length) L.push('• Hoje: ' + hojeTodos.map(e => `${e.hora ?? 'dia todo'} ${e.titulo}`).join('; ') + '.')
  const prox = eventos.value.filter(e => e.dia > hoje.value && ['prazo', 'audiencia', 'consulta'].includes(e.tipo)).slice(0, 5)
  if (prox.length) L.push('• Próximos: ' + prox.map(e => `${fmt(e.dia, { day: '2-digit', month: '2-digit' })} ${TIPOS[e.tipo]!.nome.toLowerCase()} — ${e.titulo}`).join('; ') + '.')
  resumo.value = L.join('\n')
}

// ── atalhos ──
const editandoAtalhos = ref(false)
const atalhos = ref<AtalhoSecretaria[]>([])
watch(() => config.value.atalhos, a => { atalhos.value = a.map(x => ({ ...x })) }, { immediate: true })
async function salvarConfig(parcial: Record<string, unknown>) {
  try { await $fetch('/api/secretaria/config', { method: 'PUT', body: parcial }); await carregar() } catch (e: any) { erro.value = msg(e, 'Não foi possível salvar.') }
}
const salvarAtalhos = () => salvarConfig({ atalhos: atalhos.value })
function novoAtalho() { atalhos.value.push({ id: 'n' + Date.now().toString(36), nome: 'Novo atalho', url: '' }) }

// ── agenda ──
const FILTROS = ['prazo', 'audiencia', 'consulta', 'tarefa', 'compromisso']
const filtros = ref<string[]>([...FILTROS])
const modo = ref<'minhas' | 'todo'>('todo')
const verMais = ref(12)
const agenda = computed(() => eventos.value.filter(e => filtros.value.includes(e.tipo) && (modo.value === 'todo' || e.meu)))
const agendaVisivel = computed(() => agenda.value.slice(0, verMais.value))
const dias = computed(() => { const m = new Map<string, ItemAgenda[]>(); for (const e of agendaVisivel.value) (m.get(e.dia) ?? m.set(e.dia, []).get(e.dia)!).push(e); return [...m.entries()] })
const alternar = (t: string) => { filtros.value = filtros.value.includes(t) ? filtros.value.filter(x => x !== t) : [...filtros.value, t]; verMais.value = 12 }
async function concluirItem(e: ItemAgenda) { try { await $fetch(`/api/secretaria/itens/${e.id}`, { method: 'PATCH', body: { feito: true } }); await carregar() } catch (x: any) { erro.value = msg(x, 'Não foi possível concluir.') } }
async function excluirItem(e: ItemAgenda) { try { await $fetch(`/api/secretaria/itens/${e.id}`, { method: 'DELETE' }); await carregar() } catch (x: any) { erro.value = msg(x, 'Não foi possível excluir.') } }

// ── lembretes ──
const novoLembrete = reactive({ texto: '', data: '', hora: '' })
const pendentes = computed(() => lembretes.value.filter(l => !l.feito).sort((a, b) => (a.data ?? '9999').localeCompare(b.data ?? '9999')))
const concluidos = computed(() => lembretes.value.filter(l => l.feito).slice(0, 30))
async function addLembrete() {
  if (!novoLembrete.texto.trim()) return
  try { await $fetch('/api/secretaria/lembretes', { method: 'POST', body: { texto: novoLembrete.texto, data: novoLembrete.data || null, hora: novoLembrete.hora || null } }); Object.assign(novoLembrete, { texto: '', data: '', hora: '' }); await carregar() } catch (e: any) { erro.value = msg(e, 'Não foi possível criar o lembrete.') }
}
async function marcar(l: LembreteRapido, feito: boolean) { await $fetch(`/api/secretaria/lembretes/${l.id}`, { method: 'PATCH', body: { feito } }); await carregar() }
async function excluirLembrete(l: LembreteRapido) { await $fetch(`/api/secretaria/lembretes/${l.id}`, { method: 'DELETE' }); await carregar() }
async function naAgenda(l: LembreteRapido, data?: string) {
  try { await $fetch(`/api/secretaria/lembretes/${l.id}/agenda`, { method: 'POST', body: { data } }); await carregar() } catch (e: any) { erro.value = msg(e, 'Não foi possível pôr na agenda.') }
}

// ── contagem de prazo ──
const calc = reactive({ inicio: hojeISO(), dias: 15 })
const res = computed(() => calc.dias >= 1 && calc.dias <= 365 && /^\d{4}-\d{2}-\d{2}$/.test(calc.inicio) ? contarPrazo(calc.inicio, calc.dias, ctx.value) : null)
const alt = computed(() => res.value && !ctx.value.fac ? contarPrazo(calc.inicio, calc.dias, { ...ctx.value, fac: true }) : null)
const anoRef = computed(() => Number((res.value?.vencimento ?? hoje.value).slice(0, 4)))
const listaFeriados = computed(() => feriadosDe(anoRef.value).slice().sort((a, b) => a.d.localeCompare(b.d)))
const FONTE: Record<string, string> = { lei: 'Lei', regra: 'Regra geral', resumo: 'Resumo oficial (conferir)', confirmar: 'Não confirmado' }
const nomeEsc = (e: string) => e === 'all' ? 'Todos' : e === 'ssa' ? 'Salvador' : (TRIBUNAIS[e] ?? e).split(' ')[0]
const nova = reactive({ de: '', ate: '', tribunal: 'todos', motivo: '' })
async function anotarSuspensao() {
  if (!nova.de) return
  try { await $fetch('/api/secretaria/suspensoes', { method: 'POST', body: { ...nova } }); Object.assign(nova, { de: '', ate: '', tribunal: 'todos', motivo: '' }); await carregar() } catch (e: any) { erro.value = msg(e, 'Não foi possível anotar.') }
}
async function excluirSuspensao(id: number) { await $fetch(`/api/secretaria/suspensoes/${id}`, { method: 'DELETE' }); await carregar() }
function prazoNaAgenda() { texto.value = `prazo de ${calc.dias} dias, intimada ${fmt(calc.inicio, { day: '2-digit', month: '2-digit', year: 'numeric' })}`; interpretar(); irPara('sNL') }
const fdsVenc = computed(() => res.value ? dow(res.value.vencimento) : 1)
</script>

<template>
  <div class="space-y-4">
    <p v-if="erro" class="cartao text-sm text-danger" role="alert">{{ erro }} <button type="button" class="underline" @click="carregar">Tentar de novo</button></p>
    <p v-if="aviso" class="cartao text-sm" role="status">{{ aviso }}</p>

    <!-- HOJE -->
    <section class="cartao" id="sHoje">
      <h2>Hoje</h2>
      <div class="hoje">
        <button type="button" class="tile" :class="{ alerta: prazosHoje.length || prazosVencidos.length }" data-testid="tile-prazos-hoje" @click="irPara('sAgenda')">
          <span class="t">Prazos vencem hoje</span><span class="n">{{ prazosHoje.length }}</span>
          <ul v-if="prazosHoje.length"><li v-for="e in prazosHoje.slice(0, 3)" :key="e.id">{{ e.titulo }}</li></ul><span v-else class="vazio">Nada por aqui.</span>
          <span v-if="prazosVencidos.length" class="vencido" data-testid="vencidos">{{ prazosVencidos.length }} prazo(s) vencido(s) sem baixa</span>
        </button>
        <button type="button" class="tile" data-testid="tile-prazos-amanha" @click="irPara('sAgenda')">
          <span class="t">Prazos vencem amanhã</span><span class="n">{{ prazosAmanha.length }}</span>
          <ul v-if="prazosAmanha.length"><li v-for="e in prazosAmanha.slice(0, 3)" :key="e.id">{{ e.titulo }}</li></ul><span v-else class="vazio">Nada por aqui.</span>
        </button>
        <button type="button" class="tile" :class="{ alerta: atrasados.length }" data-testid="tile-atrasados" @click="irPara('sLembretes')">
          <span class="t">Lembretes atrasados</span><span class="n">{{ atrasados.length }}</span>
          <ul v-if="atrasados.length"><li v-for="l in atrasados.slice(0, 3)" :key="l.id">{{ l.texto }}</li></ul><span v-else class="vazio">Nada por aqui.</span>
        </button>
        <button type="button" class="tile" data-testid="tile-hoje" @click="irPara('sAgenda')">
          <span class="t">Compromissos de hoje</span><span class="n">{{ compromissosHoje.length }}</span>
          <ul v-if="compromissosHoje.length"><li v-for="e in compromissosHoje.slice(0, 3)" :key="e.id">{{ e.hora }} {{ e.titulo }}</li></ul><span v-else class="vazio">Nada por aqui.</span>
        </button>
      </div>
    </section>

    <!-- O QUE VOCÊ PRECISA -->
    <section id="sNL" class="cartao">
      <h2>O que você precisa?</h2>
      <textarea v-model="texto" id="nlTxt" rows="2" class="campo w-full" placeholder="Ex.: prazo de 15 dias para réplica, intimada hoje · me lembra amanhã às 10h de ligar para o cliente" @keydown.enter.exact.prevent="interpretar" />
      <div class="flex gap-2 flex-wrap mt-2">
        <button type="button" class="btn" data-testid="interpretar" @click="interpretar">Interpretar</button>
        <button type="button" class="btn sec" data-testid="resumo" @click="resumoDoDia">Resumo do dia</button>
      </div>
      <p v-if="nlErro" class="text-sm text-danger mt-2">{{ nlErro }}</p>
      <div v-if="prop" class="conf" data-testid="proposta">
        <strong>Entendi assim. Confira antes de criar:</strong>
        <div class="flex gap-2 flex-wrap items-end">
          <label class="rot">Tipo<select v-model="prop.tipo" class="campo"><option v-for="(n, k) in ROTULO_TIPO" :key="k" :value="k">{{ n }}</option></select></label>
          <label class="rot grow min-w-[180px]">Título<input v-model="prop.titulo" class="campo" /></label>
        </div>
        <div v-if="prop.tipo === 'prazo'" class="flex gap-2 flex-wrap items-end">
          <label class="rot">Dias úteis<input v-model.number="prop.dias" type="number" min="1" max="365" class="campo w-24" /></label>
          <label class="rot">Intimação / publicação<input v-model="prop.inicio" type="date" class="campo" /></label>
          <label class="rot">Tribunal<select :value="config.tribunal" class="campo" @change="salvarConfig({ tribunal: ($event.target as HTMLSelectElement).value })"><option v-for="(n, k) in TRIBUNAIS" :key="k" :value="k">{{ n }}</option></select></label>
        </div>
        <div v-else class="flex gap-2 flex-wrap items-end">
          <label class="rot">Data<input v-model="prop.data" type="date" class="campo" /></label>
          <label class="rot">Hora<input v-model="prop.hora" type="time" class="campo" /></label>
          <label v-if="['audiencia', 'consulta', 'compromisso'].includes(prop.tipo)" class="rot grow min-w-[160px]">Local<input v-model="prop.local" class="campo" /></label>
        </div>
        <label v-if="prop.tipo !== 'lembrete'" class="rot">Cliente ou assunto (opcional)<input v-model="prop.cliente" class="campo" placeholder="Ex.: Maria Souza — divórcio" /></label>
        <p v-if="previa">Vence em <strong>{{ fmt(previa.vencimento) }} ({{ semana(previa.vencimento) }})</strong>. Confirme no sistema do tribunal.
          <span v-if="previa.pulados.length" class="block text-xs text-gray-500">Dias úteis que ficaram de fora: {{ previa.pulados.map(x => fmt(x.d, { day: '2-digit', month: '2-digit' })).join(', ') }}</span></p>
        <p v-if="prop.tipo !== 'prazo' && prop.tipo !== 'lembrete' && prop.tipo !== 'tarefa' && !prop.data" class="text-xs text-danger">Falta a data.</p>
        <div class="flex gap-2"><button type="button" class="btn" :disabled="criando" data-testid="confirmar" @click="confirmar">{{ prop.tipo === 'lembrete' ? 'Criar lembrete' : 'Criar na agenda' }}</button><button type="button" class="btn sec" @click="prop = null">Cancelar</button></div>
      </div>
      <pre v-if="resumo" class="resumo" data-testid="resumo-texto">{{ resumo }}</pre>
    </section>

    <!-- ATALHOS -->
    <section class="cartao" id="sAtalhos">
      <h2>Atalhos <button type="button" class="link" @click="editandoAtalhos ? (salvarAtalhos(), editandoAtalhos = false) : (editandoAtalhos = true)">{{ editandoAtalhos ? 'Salvar' : 'Editar links' }}</button></h2>
      <div v-if="!editandoAtalhos" class="flex flex-wrap gap-2">
        <template v-for="a in config.atalhos" :key="a.id">
          <a v-if="a.url" :href="a.url" target="_blank" rel="noopener" class="atalho">{{ a.nome }}</a>
          <button v-else type="button" class="atalho vazio" title="Defina o endereço deste atalho" @click="editandoAtalhos = true">{{ a.nome }} · definir link</button>
        </template>
      </div>
      <div v-else class="space-y-2">
        <div v-for="(a, i) in atalhos" :key="a.id" class="flex gap-2 flex-wrap">
          <input v-model="a.nome" class="campo" style="width:190px" aria-label="Nome do atalho" />
          <input v-model="a.url" class="campo grow min-w-[200px]" placeholder="https://…" aria-label="Endereço" />
          <button type="button" class="btn sec sm" @click="atalhos.splice(i, 1)">Remover</button>
        </div>
        <button type="button" class="btn sec sm" @click="novoAtalho">+ Novo atalho</button>
      </div>
    </section>

    <!-- AGENDA -->
    <section id="sAgenda" class="cartao">
      <h2>Agenda · próximos 14 dias
        <span class="flex gap-2 items-center">
          <select v-model="modo" class="campo" aria-label="Quais agendas"><option value="minhas">Só as minhas</option><option value="todo">Escritório todo</option></select>
          <button type="button" class="btn sec sm" @click="carregar">Atualizar</button>
        </span>
      </h2>
      <div class="flex gap-1.5 flex-wrap" role="group" aria-label="Filtrar por tipo">
        <button v-for="t in FILTROS" :key="t" type="button" class="chip" :aria-pressed="filtros.includes(t)" @click="alternar(t)"><span class="pt" :style="{ background: TIPOS[t]!.cor }" />{{ TIPOS[t]!.nome }}</button>
      </div>
      <p v-if="carregando && !dados" class="text-sm text-gray-500 py-2">Carregando a agenda…</p>
      <p v-else-if="!agenda.length" class="text-sm text-gray-500 py-2">{{ eventos.length ? 'Nada com esses filtros.' : 'Agenda vazia. Escreva em "O que você precisa?" para criar o primeiro prazo, audiência ou compromisso.' }}</p>
      <div v-for="[dia, itens] in dias" :key="dia">
        <div class="dia" :class="{ vencido: dia < hoje }">{{ dia < hoje ? 'Vencido · ' : dia === hoje ? 'Hoje · ' : dia === addDays(hoje, 1) ? 'Amanhã · ' : '' }}{{ fmt(dia, { weekday: 'long', day: '2-digit', month: 'long' }) }}</div>
        <div v-for="e in itens" :key="e.id" class="ev" :class="[e.tipo, { vencido: e.dia < hoje }]" :style="{ '--cor': TIPOS[e.tipo]!.cor }" :data-testid="`item-${e.id}`">
          <span class="h">{{ e.hora ?? 'dia todo' }}</span>
          <span class="min-w-0"><span class="tt">{{ e.titulo }}</span><span class="tg"><b :style="{ color: TIPOS[e.tipo]!.cor }">{{ e.dia < hoje ? 'VENCIDO · ' : '' }}{{ TIPOS[e.tipo]!.nome }}</b><template v-if="e.cliente"> · {{ e.cliente }}</template><template v-if="e.local"> · {{ e.local }}</template></span></span>
          <span class="acoes"><button type="button" class="link" data-testid="concluir-item" @click="concluirItem(e)">concluir</button><button type="button" class="link" @click="excluirItem(e)">excluir</button></span>
        </div>
      </div>
      <button v-if="agenda.length > verMais" type="button" class="btn sec sm mt-2" @click="verMais += 12">Ver mais ({{ agenda.length - verMais }})</button>
    </section>

    <!-- LEMBRETES -->
    <section id="sLembretes" class="cartao">
      <h2>Lembretes rápidos</h2>
      <form class="flex gap-2 flex-wrap" @submit.prevent="addLembrete">
        <input v-model="novoLembrete.texto" class="campo grow min-w-[180px]" placeholder="Novo lembrete" aria-label="Texto do lembrete" />
        <input v-model="novoLembrete.data" type="date" class="campo" aria-label="Data" /><input v-model="novoLembrete.hora" type="time" class="campo" aria-label="Hora" />
        <button class="btn" type="submit">Adicionar</button>
      </form>
      <p v-if="!pendentes.length" class="text-sm text-gray-500 py-2">Nenhum lembrete pendente.</p>
      <div v-for="l in pendentes" :key="l.id" class="lem" :data-testid="`lembrete-${l.id}`">
        <input type="checkbox" :checked="l.feito" aria-label="Concluir" @change="marcar(l, ($event.target as HTMLInputElement).checked)" />
        <div class="grow min-w-0"><div class="break-words">{{ l.texto }}</div>
          <div class="q" :class="{ late: l.data && l.data < hoje }">{{ l.data ? (l.data < hoje ? 'Atrasado · ' : '') + fmt(l.data) + (l.hora ? ' às ' + l.hora : '') : 'Sem data' }}{{ l.item_id ? ' · na agenda' : '' }}</div></div>
        <template v-if="!l.item_id">
          <button v-if="l.data" type="button" class="btn sec sm" @click="naAgenda(l)">Pôr na agenda</button>
          <input v-else type="date" class="campo" aria-label="Escolha a data para pôr na agenda" title="Escolha uma data para pôr na agenda" @change="($event.target as HTMLInputElement).value && naAgenda(l, ($event.target as HTMLInputElement).value)" />
        </template>
        <button type="button" class="link" aria-label="Excluir lembrete" @click="excluirLembrete(l)">excluir</button>
      </div>
      <details v-if="concluidos.length" class="mt-2"><summary>Concluídos ({{ concluidos.length }})</summary>
        <div v-for="l in concluidos" :key="l.id" class="lem feito"><input type="checkbox" checked aria-label="Reabrir" @change="marcar(l, false)" /><div class="grow line-through text-gray-500">{{ l.texto }}</div><button type="button" class="link" @click="excluirLembrete(l)">excluir</button></div>
      </details>
    </section>

    <!-- CONTAGEM DE PRAZO -->
    <section id="sPrazos" class="cartao">
      <h2>Contagem de prazo em dias úteis</h2>
      <div class="flex gap-2 flex-wrap items-end">
        <label class="rot">Intimação / publicação<input v-model="calc.inicio" id="cInicio" type="date" class="campo" /></label>
        <label class="rot">Dias úteis<input v-model.number="calc.dias" id="cDias" type="number" min="1" max="365" class="campo w-24" /></label>
        <label class="rot">Tribunal<select :value="config.tribunal" class="campo" @change="salvarConfig({ tribunal: ($event.target as HTMLSelectElement).value })"><option v-for="(n, k) in TRIBUNAIS" :key="k" :value="k">{{ n }}</option></select></label>
      </div>
      <div class="flex gap-3 flex-wrap items-center mt-2 text-sm">
        <label class="flex items-center gap-1.5"><input type="checkbox" :checked="config.pontos_facultativos" @change="salvarConfig({ pontos_facultativos: ($event.target as HTMLInputElement).checked })" /> Descontar pontos facultativos</label>
        <span class="pilula">{{ ctx.ssa ? 'Feriados de Salvador incluídos' : 'Sem feriados municipais' }}</span>
      </div>
      <div v-if="res" class="mt-3">
        <p class="text-xs text-gray-500">O dia da intimação não conta (CPC, art. 224). Vencimento:</p>
        <p id="cRes" class="text-2xl font-bold" data-testid="vencimento">{{ fmt(res.vencimento) }} · {{ semana(res.vencimento) }}</p>
        <p v-if="alt && alt.vencimento !== res.vencimento" class="aviso">Atenção: se os pontos facultativos do período suspenderem o prazo neste tribunal, o vencimento passa para {{ fmt(alt.vencimento) }}. Até confirmar, trate {{ fmt(res.vencimento) }} como data-limite.</p>
        <details v-if="res.pulados.length" class="mt-2"><summary>Dias úteis que ficaram de fora ({{ res.pulados.length }})</summary><p class="text-xs text-gray-500 whitespace-pre-line">{{ res.pulados.map(x => `${fmt(x.d)} — ${x.motivo}`).join('\n') }}</p></details>
        <button type="button" class="btn sm mt-3" @click="prazoNaAgenda">Criar este prazo na agenda</button>
      </div>
      <p v-else class="text-sm text-gray-500 mt-2">Informe a data e os dias.</p>

      <details class="mt-4"><summary>Suspensões de expediente que anotei ({{ dados?.suspensoes.length ?? 0 }})</summary>
        <form class="flex gap-2 flex-wrap items-end mt-2" @submit.prevent="anotarSuspensao">
          <label class="rot">De<input v-model="nova.de" type="date" class="campo" /></label><label class="rot">Até<input v-model="nova.ate" type="date" class="campo" /></label>
          <label class="rot">Vale para<select v-model="nova.tribunal" class="campo"><option value="todos">Todos</option><option v-for="(n, k) in TRIBUNAIS" v-show="k !== 'nac'" :key="k" :value="k">{{ n }}</option></select></label>
          <label class="rot grow min-w-[150px]">Motivo<input v-model="nova.motivo" class="campo" placeholder="Ex.: instabilidade no sistema" /></label>
          <button class="btn sm" type="submit">Anotar</button>
        </form>
        <div v-for="s in dados?.suspensoes ?? []" :key="s.id" class="lem"><div class="grow">{{ fmt(s.de) }}{{ s.ate !== s.de ? ' a ' + fmt(s.ate) : '' }} · {{ s.tribunal === 'todos' ? 'Todos' : TRIBUNAIS[s.tribunal] }}<div class="q">{{ s.motivo || 'sem motivo' }}</div></div><button type="button" class="link" @click="excluirSuspensao(s.id)">excluir</button></div>
      </details>

      <details class="mt-2"><summary>Feriados cadastrados em {{ anoRef }} e o que não consegui confirmar</summary>
        <div class="overflow-x-auto"><table class="text-xs w-full"><thead><tr><th>Data</th><th>Dia</th><th>Nome</th><th>Vale para</th><th>Efeito</th><th>Fonte</th></tr></thead>
          <tbody><tr v-for="(f, i) in listaFeriados" :key="i"><td>{{ fmt(f.d, { day: '2-digit', month: '2-digit' }) }}</td><td>{{ semana(f.d).slice(0, 3) }}</td><td>{{ f.nome }}</td><td>{{ f.esc.map(nomeEsc).join(', ') }}</td><td>{{ f.tipo === 'feriado' ? 'Sem prazo' : 'Facultativo' }}</td><td>{{ FONTE[f.fonte] }}</td></tr></tbody></table></div>
        <div class="aviso"><strong>Não consegui confirmar:</strong><ul class="list-disc pl-5 mt-1"><li v-for="t in NAO_CONFIRMADO" :key="t">{{ t }}</li></ul></div>
      </details>
    </section>
  </div>
</template>

<style scoped>
.cartao { background: #fff; border: 1px solid rgb(0 0 0 / .08); border-top: 3px solid var(--ouro, #c9a24a); border-radius: 10px; padding: 16px; min-width: 0; }
:global(.dark) .cartao { background: #1e1b17; border-color: rgb(255 255 255 / .1); border-top-color: var(--ouro, #d4af5a); }
h2 { font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ouro-esc, #8a6a26); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.btn { background: var(--ouro-esc, #8a6a26); color: #fff; border-radius: 8px; padding: 9px 14px; font-weight: 600; font-size: 13px; }
:global(.dark) .btn { color: #17130b; background: var(--ouro, #d4af5a); }
.btn.sec { background: transparent; color: var(--ouro-esc, #8a6a26); border: 1px solid var(--ouro, #c9a24a); }
:global(.dark) .btn.sec { color: var(--ouro, #d4af5a); }
.btn.sm { padding: 5px 10px; font-size: 12px; }
.btn:disabled { opacity: .5; }
.link { background: none; text-decoration: underline; font-size: 12px; font-weight: 500; color: var(--ouro-esc, #8a6a26); text-transform: none; letter-spacing: 0; }
.campo { border: 1px solid rgb(0 0 0 / .14); border-radius: 8px; padding: 8px 10px; background: transparent; min-width: 0; max-width: 100%; font-size: 14px; }
:global(.dark) .campo { border-color: rgb(255 255 255 / .18); }
.rot { display: grid; gap: 3px; font-size: 12px; color: #857866; font-weight: 500; }
.hoje { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px; }
.tile { border: 1px solid rgb(0 0 0 / .1); border-radius: 10px; padding: 12px; text-align: left; display: grid; gap: 6px; min-width: 0; }
:global(.dark) .tile { border-color: rgb(255 255 255 / .12); }
.tile .t { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #857866; font-weight: 600; }
.tile .n { font-size: 26px; font-weight: 700; line-height: 1; }
.tile ul { list-style: none; padding: 0; margin: 0; font-size: 12px; display: grid; gap: 3px; }
.tile li { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tile .vazio { font-size: 12px; color: #857866; }
.tile.alerta { border-color: #b3261e; background: #fdecea; }
.tile.alerta .n { color: #b3261e; }
:global(.dark) .tile.alerta { background: #3a1c1a; border-color: #ff8a80; }
:global(.dark) .tile.alerta .n { color: #ff8a80; }
.conf { border: 1px dashed var(--ouro, #c9a24a); border-radius: 10px; padding: 12px; margin-top: 10px; background: var(--ouro-suave, #f4ecd9); display: grid; gap: 10px; }
.resumo { white-space: pre-wrap; font: inherit; margin-top: 10px; padding: 12px; border-radius: 8px; border: 1px solid rgb(0 0 0 / .1); }
.atalho { border: 1px solid var(--ouro, #c9a24a); border-radius: 999px; padding: 7px 14px; font-weight: 600; font-size: 12px; color: var(--ouro-esc, #8a6a26); }
.atalho.vazio { border-style: dashed; color: #857866; }
.chip { border: 1px solid rgb(0 0 0 / .12); border-radius: 999px; padding: 4px 11px; font-size: 12px; font-weight: 500; }
.chip[aria-pressed='true'] { border-color: var(--ouro, #c9a24a); background: var(--ouro-suave, #f4ecd9); font-weight: 700; }
:global(.dark) .chip { border-color: rgb(255 255 255 / .18); }
.pt { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }
.dia { font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #857866; margin: 14px 0 6px; }
.ev { display: grid; grid-template-columns: 62px 1fr auto; align-items: start; gap: 10px; padding: 9px 10px; border-left: 4px solid var(--cor); border-radius: 6px; background: rgb(0 0 0 / .03); margin-bottom: 6px; min-width: 0; }
:global(.dark) .ev { background: rgb(255 255 255 / .05); }
.ev .acoes { display: flex; gap: 10px; }
.ev.vencido { background: #fdecea; } :global(.dark) .ev.vencido { background: #3a1c1a; }
.dia.vencido, .tile .vencido { color: #b3261e; font-weight: 700; }
.tile .vencido { font-size: 12px; }
.ev .h { font-size: 12px; color: #857866; font-weight: 600; }
.ev .tt { display: block; font-weight: 600; overflow-wrap: anywhere; }
.ev .tg { display: block; font-size: 11px; color: #857866; }
.ev.audiencia, .ev.consulta { border-left-width: 6px; }
.ev.audiencia { background: #fde7f0; } .ev.consulta { background: #f9efd0; }
:global(.dark) .ev.audiencia { background: #3a1827; } :global(.dark) .ev.consulta { background: #322a12; }
.ev.audiencia .tt, .ev.consulta .tt { font-size: 15px; }
.lem { display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap; padding: 8px 0; border-bottom: 1px solid rgb(0 0 0 / .08); }
.lem .q { font-size: 11px; color: #857866; } .lem .q.late { color: #b3261e; font-weight: 700; }
.pilula { border-radius: 999px; padding: 2px 9px; font-size: 11px; font-weight: 600; background: var(--ouro-suave, #f4ecd9); color: var(--ouro-esc, #8a6a26); }
.aviso { border: 1px solid #a15c00; border-radius: 8px; padding: 9px 11px; font-size: 12px; margin-top: 10px; }
summary { cursor: pointer; font-weight: 600; font-size: 12px; color: var(--ouro-esc, #8a6a26); }
th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid rgb(0 0 0 / .08); vertical-align: top; }
</style>
