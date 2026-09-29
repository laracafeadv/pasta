<template>
  <Modal
    :is-open="isOpen"
    :title="dados?.contato.nome || telefoneFormatado(dados?.contato.telefone) || 'Carregando…'"
    :description="dados ? `${etapa(dados.contato.etapa).nome} · desde ${dataCurta(dados.contato.created_at)}` : ''"
    content-class="!p-0"
    max-width="4xl"
    @close="emit('close')"
  >
    <div v-if="loading && !dados" class="p-10 text-center text-sm text-gray-400">Carregando…</div>

    <template v-else-if="dados">
      <div class="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-zinc-800 sticky top-0 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur">
        <button
          v-for="t in abas"
          :key="t.id"
          class="px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors"
          :class="aba === t.id ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800'"
          @click="aba = t.id"
        >
          {{ t.label }}<span v-if="t.badge" class="ml-1.5 opacity-70">{{ t.badge }}</span>
        </button>
        <div class="ml-auto flex gap-2">
          <Button size="sm" variant="outline" icon="ph:pencil-simple-bold" @click="emit('editar', dados.contato)">Editar</Button>
          <Button v-if="etapa(dados.contato.etapa).aberta" size="sm" icon="ph:check-bold" @click="emit('andamento', dados.contato)">Registrar andamento</Button>
        </div>
      </div>

      <!-- Cliente: quem é (permanente) -->
      <div v-if="aba === 'resumo'" class="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <!-- Visão geral: o que está acontecendo com este cliente, com acesso direto ao detalhe -->
        <div class="md:col-span-2 grid grid-cols-2 lg:grid-cols-5 gap-2">
          <button v-for="c in resumoFicha" :key="c.rotulo" type="button" class="text-left rounded-2xl border px-3 py-2.5 hover:border-primary transition-colors" :class="c.alerta ? 'border-warning/50 bg-warning/5' : 'border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50'" @click="aba = c.aba">
            <span class="block text-[10px] font-bold uppercase tracking-widest text-gray-400">{{ c.rotulo }}</span>
            <span class="block text-lg font-serif text-primary dark:text-zinc-100 leading-tight">{{ c.valor }}</span>
            <span class="block text-[11px] text-gray-500 truncate">{{ c.sub }}</span>
          </button>
        </div>
        <ChecklistPainel v-if="dados.checklist?.atendimento?.total" class="md:col-span-2" :escopo="dados.checklist.atendimento" @alternar="i => alternarChecklist(i, null)" />
        <div class="card">
          <h3>Contato</h3>
          <p><b>WhatsApp:</b> <a :href="whatsappLink(dados.contato.telefone)" target="_blank" rel="noopener" class="text-primary">{{ telefoneFormatado(dados.contato.telefone) }}</a></p>
          <p><b>E-mail:</b> {{ dados.contato.email || '—' }}</p>
          <p><b>Cidade:</b> {{ dados.contato.cidade || '—' }}</p>
          <p><b>Origem:</b> {{ dados.contato.origem || '—' }}</p>
          <p><b>Aviso LGPD:</b> {{ dados.contato.consentimento_em ? dataHora(dados.contato.consentimento_em) : 'não enviado' }}</p>
        </div>
        <div class="card">
          <h3>Relacionamento</h3>
          <p><b>Aniversário:</b> {{ dados.contato.data_nascimento ? dataCurta(dados.contato.data_nascimento) : '—' }}</p>
          <p>
            <b>Classificação:</b>
            <template v-if="dados.contato.classificacao">{{ CLASSIFICACOES[dados.contato.classificacao].nome }} <span class="text-xs text-gray-500">— {{ CLASSIFICACOES[dados.contato.classificacao].dica }}</span></template>
            <template v-else>—</template>
          </p>
          <div>
            <p><b>NPS:</b> {{ dados.contato.nps ?? '—' }} <span class="text-xs text-gray-500">— registrar a nota que a cliente deu:</span></p>
            <div class="flex flex-wrap gap-1 mt-1">
              <button v-for="n in 11" :key="n" type="button" class="w-7 h-7 rounded-full text-xs font-semibold border"
                      :class="dados.contato.nps === n - 1 ? 'bg-primary text-white border-primary' : n - 1 >= 9 ? 'border-success/50 text-success-dark' : n - 1 >= 7 ? 'border-warning/50 text-warning-dark' : 'border-danger/40 text-danger-dark'"
                      @click="registrarNps(n - 1)">{{ n - 1 }}</button>
            </div>
          </div>
          <p v-if="dados.contato.obs_relacionamento"><b>Observação:</b> {{ dados.contato.obs_relacionamento }}</p>
          <p v-if="dados.contato.ultimo_contato_em"><b>Último gesto:</b> {{ dataCurta(dados.contato.ultimo_contato_em) }}</p>
        </div>
        <div v-if="!dados.casos.length" class="card">
          <h3>Atendimento</h3>
          <p><b>Área:</b> {{ dados.contato.area || '—' }} <span v-if="dados.contato.demanda">· {{ dados.contato.demanda }}</span></p>
          <p><b>Outra parte:</b> {{ dados.contato.parte_contraria || '—' }}</p>
          <p><b>Urgência:</b> {{ dados.contato.urgencia || '—' }} · <b>Sentimento:</b> {{ dados.contato.sentimento || '—' }}</p>
          <p v-if="etapa(dados.contato.etapa).aberta">
            <b>Próxima ação:</b>
            <span v-if="dados.contato.proxima_acao">{{ dados.contato.proxima_acao }} — {{ dataCurta(dados.contato.proxima_data) }} ({{ diaRelativo(dados.contato.proxima_data) }})</span>
            <span v-else class="text-warning-dark font-semibold">não definida</span>
          </p>
          <p v-if="dados.contato.motivo_perda"><b>Motivo da perda:</b> {{ dados.contato.motivo_perda }}</p>
          <p><b>Na etapa há:</b> {{ diasNaEtapa }} dia(s)</p>
          <p v-if="dados.contato.consulta_em"><b>Consulta:</b> {{ dataHora(dados.contato.consulta_em) }}</p>
          <div class="rounded-2xl border border-primary/20 bg-primary/5 p-3 mt-2 space-y-2" data-testid="enviar-formulario">
            <p class="text-[10px] font-bold uppercase tracking-widest text-primary dark:text-zinc-200">Formulário para a pessoa preencher</p>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" class="text-[11px] font-semibold uppercase tracking-wider px-4 py-2 rounded-full bg-primary text-white"
                      :title="dados.contato.pre_form_respondido_em ? 'Já respondido — gerar de novo cria um link novo' : 'Escolha o formulário; o link é gerado e copiado para você colar no WhatsApp'"
                      @click="abrirEditorPreFormulario">
                <Icon name="ph:paper-plane-tilt-bold" class="align-middle" /> {{ dados.contato.pre_form_respondido_em ? 'Enviar novamente' : 'Enviar formulário' }}
              </button>
              <button type="button" class="text-[11px] text-gray-500 hover:text-primary underline underline-offset-2" title="Sem perguntas extras: só o campo 'Conte um pouco da sua situação'" @click="enviarPreFormularioRapido">só o resumo livre (1 clique)</button>
              <a href="/pc/preview" target="_blank" rel="noopener" class="text-[11px] text-gray-500 hover:text-primary underline underline-offset-2">ver exemplo</a>
            </div>
            <p v-if="dados.contato.pre_form_respondido_em" class="text-xs text-success-dark">Formulário pré-consulta respondido ✓</p>
            <p v-else class="text-xs text-gray-500">Você escolhe qual formulário enviar (criados em <NuxtLink to="/formularios" class="underline">Formulários</NuxtLink>). O link fica copiado; é só colar no WhatsApp.</p>
          </div>
          </div>
        </section>
      </div>
    </template>
  </Modal>

  <PreFormularioEditor
    :is-open="editorPreFormAberto"
    @close="editorPreFormAberto = false"
    @gerar="gerarPreFormulario"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import Modal from '../Modal.vue'
import Button from '../Button.vue'
import PreFormularioEditor from './PreFormularioEditor.vue'
import { PROCEDIMENTOS } from '~~/shared/data/checklist'
import { CADENCIA, CLASSIFICACOES, DECISOES_DEMANDA, STATUS_DEMANDA, TIPOS_ATIVIDADE, TIPOS_DEMANDA, TIPOS_COMPROMISSO, dataCompromisso, etapa, type Atividade, type Demanda, type Compromisso, type Contato, type Movimentacao, type Parte, type Processo, type Documento, type Honorario, type Lancamento, type MensagemWhatsapp } from '../../../shared/types/crm'
import QualificacaoForm from './QualificacaoForm.vue'
import DemandaFormModal from './DemandaFormModal.vue'
import ChecklistPainel from './ChecklistPainel.vue'
import InformacoesCliente from './InformacoesCliente.vue'
import type { ChecklistFicha, ItemChecklist } from '../../../shared/types/checklist'
import DocumentosDemanda from './DocumentosDemanda.vue'
import ProcessoCard from './ProcessoCard.vue'
import ProcessoFormModal from './ProcessoFormModal.vue'
import PartesDemanda from './PartesDemanda.vue'
import AnaliseDemanda from './AnaliseDemanda.vue'
import { useProfileStore } from '../../stores/profile'
import ModeloPicker from './ModeloPicker.vue'
import { useModelos } from '../../composables/useModelos'
import { brl, dataCurta, dataHora, diaRelativo, telefoneFormatado, whatsappLink } from '../../utils/formatadores'
import { useCrmStore } from '../../stores/crm'

interface Detalhe { processos: Processo[]; partes: Parte[]; movimentacoes: Movimentacao[]; tarefas: { id: number; titulo: string; prazo: string; prioridade: string; caso_id: number | null }[]; contato: Contato; honorarios: Honorario[]; mensagens: MensagemWhatsapp[]; atividades: Atividade[]; documentos: Documento[]; casos: Demanda[]; compromissos: Compromisso[]; checklist?: ChecklistFicha }

const props = defineProps<{ isOpen: boolean; contatoId: number | null; abaInicial?: string; modeloInicial?: string | null }>()
const emit = defineEmits<{ close: []; editar: [c: Contato]; andamento: [c: Contato] }>()

const crm = useCrmStore()
const dados = ref<Detalhe | null>(null)
const loading = ref(false)
const aba = ref('resumo')
const scrollBox = ref<HTMLElement | null>(null)

// Cliente (quem é, permanente) → Demandas (o que contratou: etapas, informações, documentos, prazos) → Conversa → Financeiro → Histórico.
const abas = computed(() => [
  { id: 'resumo', label: 'Cliente' },
  { id: 'processo', label: 'Demandas', badge: dados.value?.casos.filter(c => c.status !== 'encerrado').length || undefined },
  { id: 'conversa', label: 'Conversa', badge: dados.value?.mensagens.length || undefined },
  { id: 'honorarios', label: 'Financeiro', badge: dados.value?.honorarios.length || undefined },
  { id: 'atividades', label: 'Histórico', badge: dados.value?.atividades.length || undefined },
])
const qualificacaoAberta = ref(false)
// Nomes antigos de abas (links e atalhos) continuam funcionando.
function irPara(destino: string) {
  // Nomes antigos (links e atalhos) continuam levando ao lugar certo.
  if (['demandas', 'casos', 'documentos', 'diagnostico'].includes(destino)) aba.value = 'processo'
  else if (['qualificacao'].includes(destino)) aba.value = 'resumo'
  else aba.value = destino
}

async function carregar() {
  if (!props.contatoId) return
  loading.value = true
  try {
    dados.value = await $fetch<Detalhe>(`/api/crm/contatos/${props.contatoId}`)
  } finally {
    loading.value = false
  }
}

watch(() => props.isOpen, (open) => {
  if (open) {
    irPara(props.abaInicial || 'resumo')
    dados.value = null
    resposta.value = ''
    carregar().then(async () => {
      // Aberto a partir da carteira com uma mensagem sugerida (ex.: /reconexao).
      if (props.modeloInicial && dados.value) {
        await carregarModelos()
        const m = modelos.value.find(x => x.atalho === props.modeloInicial)
        if (m?.atalho === '/formulario') await enviarFormulario()
        else if (m) resposta.value = preencher(m.texto, dados.value.contato.nome, extrasContato.value)
        aba.value = 'conversa'
      }
    })
  }
})

watch(aba, async (v) => {
  if (v === 'conversa') {
    await nextTick()
    scrollBox.value?.scrollTo({ top: scrollBox.value.scrollHeight })
  }
})

defineExpose({ recarregar: carregar })

// ─── Conversa ─────────────────────────────────────────────────────────────
const resposta = ref('')
const enviando = ref(false)
const erroEnvio = ref<string | null>(null)

async function enviar() {
  if (!resposta.value.trim() || !dados.value) return
  enviando.value = true
  erroEnvio.value = null
  try {
    await $fetch(`/api/crm/contatos/${dados.value.contato.id}/whatsapp`, { method: 'POST', body: { texto: resposta.value } })
    resposta.value = ''
    await carregar()
    aba.value = 'conversa'
    await nextTick()
    scrollBox.value?.scrollTo({ top: scrollBox.value.scrollHeight })
  } catch (e: any) {
    erroEnvio.value = e?.data?.message || 'Não foi possível enviar a mensagem.'
  } finally {
    enviando.value = false
  }
}

// Checklist: só itens manuais são marcados aqui; os automáticos vêm dos dados que o CRM já tem.
async function alternarChecklist(item: ItemChecklist, casoId: number | null) {
  const d = dados.value
  if (!d?.checklist || item.tipo !== 'manual') return
  const escopo = casoId ? d.checklist.casos[casoId] : d.checklist.atendimento
  if (!escopo) return
  const marcar = !item.concluido
  const contar = () => { escopo.feitos = escopo.itens.filter(i => i.concluido).length }
  item.concluido = marcar // aparece na hora; volta atrás se o servidor recusar
  item.quando = marcar ? new Date().toISOString() : null
  item.quem = null
  contar()
  try {
    const url: string = `/api/crm/contatos/${d.contato.id}/checklist`
    const r = await $fetch<{ quando: string | null; quem: string | null }>(url, { method: 'PUT', body: { chave: item.chave, caso_id: casoId, concluido: marcar } })
    item.quando = r.quando
    item.quem = r.quem
  } catch (e: any) {
    item.concluido = !marcar
    item.quando = null
    contar()
    alert(e?.data?.message || 'Não foi possível atualizar o checklist.')
  }
}

const diasNaEtapa = computed(() => dados.value ? Math.max(0, Math.floor((Date.now() - new Date(dados.value.contato.etapa_desde).getTime()) / 864e5)) : 0)

// ─── Mensagens prontas ────────────────────────────────────────────────────
const pickerAberto = ref(false)
const copiado = ref(false)
const { modelos, carregar: carregarModelos, preencher } = useModelos()
// Sugestão: atalho citado na próxima ação (ex.: "... — /opcoes") ou o da cadência da etapa.
const modeloSugerido = computed(() => {
  const c = dados.value?.contato
  if (!c) return null
  return c.proxima_acao?.match(/\/[a-z0-9-]+/)?.[0] ?? CADENCIA[c.etapa]?.modelo ?? null
})
// Dados desta cliente que as mensagens podem usar ([DATA DA PROPOSTA], [DEMANDA]).
const extrasContato = computed<Record<string, string | null>>(() => {
  const d = dados.value
  const prop = d?.honorarios.filter(h => h.tipo !== 'Consulta').sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  return {
    'DATA DA PROPOSTA': prop ? new Date(prop.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : null,
    'DEMANDA': d?.contato.demanda?.toLowerCase() ?? null,
  }
})
function aoDigitar() {
  pickerAberto.value = resposta.value.startsWith('/') && !resposta.value.includes(' ')
}
async function copiar() {
  await navigator.clipboard?.writeText(resposta.value)
  copiado.value = true
  setTimeout(() => { copiado.value = false }, 1500)
}

const ehAdmin = computed(() => useProfileStore().profile?.role === 'admin')

// ─── Casos ────────────────────────────────────────────────────────────────
const casoAberto = ref(false)
const processosDaDemanda = (id: number) => (dados.value?.processos ?? []).filter(p => p.caso_id === id)
const partesDaDemanda = (id: number) => (dados.value?.partes ?? []).filter(p => p.caso_id === id)
const movsDoProcesso = (id: number) => (dados.value?.movimentacoes ?? []).filter(m => m.processo_id === id)
const processoAberto = ref(false)
const processoCaso = ref<number>(0)
const processoNatureza = ref<'judicial' | 'extrajudicial'>('judicial')
const processoEditando = ref<Processo | null>(null)
function novoProcesso(k: Demanda, natureza: 'judicial' | 'extrajudicial') { processoCaso.value = k.id; processoNatureza.value = natureza; processoEditando.value = null; processoAberto.value = true }
function editarProcesso(p: Processo) { processoCaso.value = p.caso_id; processoNatureza.value = p.natureza; processoEditando.value = p; processoAberto.value = true }
// Resumo do cliente: só números e o próximo passo; o detalhe fica nas abas.
const resumoFicha = computed(() => {
  const d = dados.value
  if (!d) return []
  const ativas = d.casos.filter(c => c.status !== 'encerrado')
  const encerradas = d.casos.length - ativas.length
  const procs = d.processos.filter(p => p.status !== 'encerrado')
  const proximo = [...d.compromissos].sort((a, b) => dataCompromisso(a).localeCompare(dataCompromisso(b)))[0]
  const docsPend = d.documentos.filter(x => x.status === 'pendente' && x.obrigatorio).length
  const contratado = d.honorarios.filter(h => ['Contratado', 'Pago'].includes(h.status) && h.tipo !== 'Consulta').reduce((t, h) => t + Number(h.valor), 0)
  const propostas = d.honorarios.filter(h => h.status === 'Proposta' && h.tipo !== 'Consulta').length
  return [
    { rotulo: 'Demandas', valor: `${ativas.length} ativa${ativas.length === 1 ? '' : 's'}`, sub: encerradas ? `${encerradas} encerrada${encerradas === 1 ? '' : 's'}` : 'nenhuma encerrada', aba: 'processo', alerta: false },
    { rotulo: 'Processos', valor: String(procs.length), sub: procs.length ? `${procs.filter(p => p.natureza === 'judicial').length} judicial · ${procs.filter(p => p.natureza === 'extrajudicial').length} extrajudicial` : 'sem processo em andamento', aba: 'processo', alerta: false },
    { rotulo: 'Próximo prazo', valor: proximo ? dataCurta(dataCompromisso(proximo)) : '—', sub: proximo ? proximo.titulo : 'nada agendado', aba: 'processo', alerta: !!proximo && dataCompromisso(proximo) <= hojeIso },
    { rotulo: 'Pendências', valor: `${d.tarefas.length} tarefa${d.tarefas.length === 1 ? '' : 's'}`, sub: `${docsPend} documento${docsPend === 1 ? '' : 's'} a receber`, aba: 'processo', alerta: docsPend > 0 },
    { rotulo: 'Financeiro', valor: contratado ? brl(contratado) : '—', sub: propostas ? `${propostas} proposta(s) em aberto` : contratado ? 'contratado' : 'sem contratação', aba: 'honorarios', alerta: false },
  ]
})
// Um clique: a consulta é um serviço consultivo do cliente (a análise, os documentos e o honorário ficam nela).
const abrindoConsulta = ref(false)
async function abrirDemandaDeConsulta() {
  const d = dados.value
  if (!d) return
  abrindoConsulta.value = true
  try {
    await $fetch('/api/demandas', { method: 'POST', body: { contato_id: d.contato.id, titulo: `Consulta — ${d.contato.demanda || d.contato.area || d.contato.nome || 'análise inicial'}`, tipo: 'consultivo', area: d.contato.area || null, status: 'ativo', data_abertura: hojeIso } })
    await carregar()
  } finally {
    abrindoConsulta.value = false
  }
}
// Financeiro por demanda + consolidado do cliente.
const honorariosReais = computed(() => (dados.value?.honorarios ?? []).filter(h => h.status !== 'Cancelado'))
const somar = (hs: Honorario[], st: string[]) => hs.filter(h => st.includes(h.status) && h.tipo !== 'Consulta').reduce((t, h) => t + Number(h.valor), 0)
const totaisCliente = computed(() => ({ contratado: somar(honorariosReais.value, ['Contratado', 'Pago']), pago: somar(honorariosReais.value, ['Pago']), proposta: somar(honorariosReais.value, ['Proposta']) }))
const financeiroPorDemanda = computed(() => {
  const d = dados.value
  if (!d) return []
  const grupos: { id: number | null; titulo: string; itens: Honorario[]; contratado: number; proposta: number }[] = []
  for (const k of [...d.casos.map(c => ({ id: c.id as number | null, titulo: c.titulo })), { id: null, titulo: 'Sem demanda específica' }]) {
    const itens = honorariosReais.value.filter(h => (h.caso_id ?? null) === k.id)
    if (itens.length) grupos.push({ ...k, itens, contratado: somar(itens, ['Contratado', 'Pago']), proposta: somar(itens, ['Proposta']) })
  }
  return grupos
})
// Situação comercial da DEMANDA (não do cliente): cliente antigo abre demanda nova e ela tem a sua própria proposta/contratação.
function situacaoComercial(casoId: number) {
  const hs = honorariosReais.value.filter(h => h.caso_id === casoId && h.tipo !== 'Consulta')
  if (hs.some(h => ['Contratado', 'Pago'].includes(h.status))) return { nome: 'Contratada', cor: 'bg-success/15 text-success-dark' }
  if (hs.some(h => h.status === 'Proposta')) return { nome: 'Proposta enviada', cor: 'bg-warning/15 text-warning-dark' }
  return { nome: 'Sem proposta', cor: 'bg-gray-100 dark:bg-zinc-800 text-gray-500' }
}
const verEncerradas = ref(false)
const encerradas = computed(() => (dados.value?.casos ?? []).filter(c => c.status === 'encerrado'))
const demandasVisiveis = computed(() => (dados.value?.casos ?? []).filter(c => c.status !== 'encerrado' || verEncerradas.value))
const casoEditando = ref<Demanda | null>(null)
function editarCaso(k: Demanda | null) {
  casoEditando.value = k
  casoAberto.value = true
}

// ─── Documentos, prazos e tarefas: cada um dentro da sua demanda (ou "gerais") ───────────
const docsDaDemanda = (id: number) => (dados.value?.documentos ?? []).filter(d => d.caso_id === id)
const docsGerais = computed(() => (dados.value?.documentos ?? []).filter(d => !d.caso_id))
const prazosDaDemanda = (id: number) => (dados.value?.compromissos ?? []).filter(c => c.caso_id === id)
const tarefasDaDemanda = (id: number) => (dados.value?.tarefas ?? []).filter(t => t.caso_id === id)
const prazosGerais = computed(() => (dados.value?.compromissos ?? []).filter(c => !c.caso_id))
const tarefasGerais = computed(() => (dados.value?.tarefas ?? []).filter(t => !t.caso_id))
// Monta a mensagem de cobrança (modelo /pendencia) com as listas reais.
async function cobrarDocs(pendentes: Documento[], recebidos: Documento[]) {
  if (!dados.value) return
  await carregarModelos()
  const base = modelos.value.find(m => m.atalho === '/pendencia')?.texto
    ?? 'Oi, [NOME]! Já recebi:\n[RECEBIDOS]\nPassando pra lembrar do envio de:\n[PENDENTES]\nQual prazo fica confortável pra você me enviar?'
  const lista = (ds: Documento[]) => ds.length ? ds.map(d => `📌 ${d.descricao}`).join('\n') : '—'
  resposta.value = preencher(base, dados.value.contato.nome).replace('[RECEBIDOS]', lista(recebidos)).replace('[PENDENTES]', lista(pendentes))
  aba.value = 'conversa'
}

// ─── Parcelas (administração): cobrança e boleto já preenchidos ────────────
const parcelas = ref<Lancamento[]>([])
const hojeIso = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
watch(() => [aba.value, dados.value?.contato.id] as const, async ([a, id]) => {
  if (a !== 'honorarios' || !id || !ehAdmin.value) return
  const ls = await $fetch<Lancamento[]>('/api/financeiro/lancamentos', { params: { contato: id, tipo: 'receber' } }).catch(() => [])
  parcelas.value = ls.filter(l => !l.pago_em)
})
async function mensagemParcela(l: Lancamento, atalho: string) {
  if (!dados.value) return
  await carregarModelos()
  const base = modelos.value.find(m => m.atalho === atalho)?.texto
  if (!base) return
  resposta.value = preencher(base, dados.value.contato.nome, {
    'PARCELA': l.descricao.match(/\((\d+\/\d+)\)/)?.[1] ?? null,
    'VALOR DA PARCELA': brl(l.valor),
    'VENCIMENTO': l.vencimento.split('-').reverse().slice(0, 2).join('/'),
  })
  aba.value = 'conversa'
}

// NPS: registra a nota (a classificação da carteira muda sozinha) e já abre a resposta certa.
async function registrarNps(nota: number) {
  if (!dados.value) return
  await crm.salvar(dados.value.contato.id, { nps: nota })
  await carregar()
  await carregarModelos()
  const atalho = nota >= 9 ? '/nps-promotora' : nota >= 7 ? '/nps-neutra' : '/nps-detratora'
  const m = modelos.value.find(x => x.atalho === atalho)
  if (m && dados.value) { resposta.value = preencher(m.texto, dados.value.contato.nome, extrasContato.value); aba.value = 'conversa' }
}

// Proposta: modelo /proposta-valor com o honorário mais recente (o que está em jogo vem da análise da demanda).
async function montarProposta() {
  if (!dados.value) return
  await carregarModelos()
  const h = dados.value.honorarios.filter(x => x.tipo !== 'Consulta' && x.status !== 'Cancelado').sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const base = modelos.value.find(m => m.atalho === '/proposta-valor')?.texto ?? ''
  let texto = preencher(base, dados.value.contato.nome)
  if (h) texto = texto.replace('R$ [VALOR]', brl(h.valor))
  usarMensagem(texto)
}

function usarMensagem(texto: string) {
  resposta.value = texto
  aba.value = 'conversa'
}


// ─── Google Drive (repositório único de documentos) ───────────────────────
const driveOk = ref(false)
const salvarNoDrive = ref(false)
const criandoPasta = ref(false)
const avisoDrive = ref<{ texto: string; url?: string; erro?: boolean } | null>(null)
watch(() => props.isOpen, async (open) => {
  avisoDrive.value = null
  if (open) driveOk.value = (await $fetch<{ configurado: boolean }>('/api/drive/status').catch(() => ({ configurado: false }))).configurado
}, { immediate: true })
async function criarPastaDrive() {
  if (!dados.value) return
  criandoPasta.value = true
  try {
    const r = await $fetch<{ url: string }>(`/api/crm/contatos/${dados.value.contato.id}/drive`, { method: 'POST' })
    dados.value.contato.drive_pasta_url = r.url
    avisoDrive.value = { texto: 'Pasta criada com as subpastas padrão.', url: r.url }
  } catch (e: any) {
    avisoDrive.value = { texto: e?.data?.message || 'Não foi possível criar a pasta.', erro: true }
  } finally {
    criandoPasta.value = false
  }
}
async function descartarSugestao() {
  if (!dados.value) return
  await $fetch(`/api/crm/contatos/${dados.value.contato.id}`, { method: 'PUT', body: { sugestao_resposta: null } })
  dados.value.contato.sugestao_resposta = null
}
// Copia o texto pronto pra área de transferência e avisa — nunca depende do envio
// automático pelo WhatsApp (incerto), então funciona sempre: você mesma cola no seu WhatsApp.
const avisoFormulario = ref<{ texto: string; erro?: boolean } | null>(null)
async function copiarEAvisar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto)
    avisoFormulario.value = { texto: 'Copiado! Agora é só colar no WhatsApp da cliente.' }
  } catch {
    avisoFormulario.value = { texto: 'Não deu pra copiar sozinho — selecione e copie o texto na aba Conversa.', erro: true }
  }
  setTimeout(() => { avisoFormulario.value = null }, 6000)
}

// Formulário da cliente (Módulo 1: depois de contratar, não antes da consulta).
async function enviarFormulario() {
  if (!dados.value) return
  if (dados.value.contato.form_respondido_em && !confirm('Ela já respondeu. Gerar um link novo para corrigir ou completar?')) return
  const r = await $fetch<{ caminho: string }>(`/api/crm/contatos/${dados.value.contato.id}/formulario`, { method: 'POST' })
  await carregarModelos()
  const m = modelos.value.find(x => x.atalho === '/formulario')
  const link = `${window.location.origin}${r.caminho}`
  const texto = m ? preencher(m.texto, dados.value.contato.nome, { ...extrasContato.value, 'LINK DO FORMULÁRIO': link }) : link
  resposta.value = texto
  await carregar()
  await copiarEAvisar(texto)
}
// Formulário pré-consulta: contexto leve, enviado antes da consulta (não substitui o de cima).
// O resumo livre já vai sempre; "Escolher formulário" deixa escolher um formulário do banco de perguntas.
const editorPreFormAberto = ref(false)
async function enviarPreFormularioRapido() {
  if (!dados.value) return
  if (dados.value.contato.pre_form_respondido_em && !confirm('Ela já respondeu. Gerar um link novo para corrigir ou completar?')) return
  await gerarPreFormulario(null)
}
function abrirEditorPreFormulario() {
  if (!dados.value) return
  if (dados.value.contato.pre_form_respondido_em && !confirm('Ela já respondeu. Gerar um link novo para corrigir ou completar?')) return
  editorPreFormAberto.value = true
}
async function gerarPreFormulario(formularioId: number | null) {
  if (!dados.value) return
  const r = await $fetch<{ caminho: string }>(`/api/crm/contatos/${dados.value.contato.id}/pre-formulario`, { method: 'POST', body: { formulario_id: formularioId } })
  editorPreFormAberto.value = false
  await carregarModelos()
  const m = modelos.value.find(x => x.atalho === '/pre-consulta')
  const link = `${window.location.origin}${r.caminho}`
  const texto = m ? preencher(m.texto, dados.value.contato.nome, { ...extrasContato.value, 'LINK DO FORMULÁRIO': link }) : link
  resposta.value = texto
  await carregar()
  await copiarEAvisar(texto)
}

async function enviarAoDrive(m: MensagemWhatsapp) {
  try {
    const r = await $fetch<{ url: string }>(`/api/crm/mensagens/${m.id}/drive`, { method: 'POST' })
    m.drive_url = r.url
    if (dados.value && !dados.value.contato.drive_pasta_url) carregar()
  } catch (e: any) {
    alert(e?.data?.message || 'Não foi possível enviar ao Drive.')
  }
}
/** Baixa a peça ou, se marcado, grava na pasta do cliente no Drive. */
async function peca(url: string) {
  if (!salvarNoDrive.value) { window.location.href = url; return }
  avisoDrive.value = { texto: 'Salvando no Drive…' }
  try {
    const r = await $fetch<{ url: string; nome: string }>(`${url}&drive=1`)
    avisoDrive.value = { texto: `Salvo no Drive: ${r.nome}`, url: r.url }
    if (dados.value && !dados.value.contato.drive_pasta_url) carregar()
  } catch (e: any) {
    avisoDrive.value = { texto: e?.data?.message || 'Não foi possível salvar no Drive.', erro: true }
  }
}

// ─── Atividades ───────────────────────────────────────────────────────────
const nota = reactive<{ tipo: string; texto: string; minutos: number | '' }>({ tipo: 'Anotação', texto: '', minutos: '' })
// Histórico: tudo do cliente, ou só o que aconteceu numa demanda (novas anotações já vão para a demanda escolhida).
const filtroDemanda = ref<number | null>(null)
const atividadesFiltradas = computed(() => (dados.value?.atividades ?? []).filter(a => !filtroDemanda.value || a.caso_id === filtroDemanda.value))
const anotando = ref(false)

async function anotar() {
  if (!nota.texto.trim() || !dados.value) return
  anotando.value = true
  try {
    await $fetch(`/api/crm/contatos/${dados.value.contato.id}/atividades`, { method: 'POST', body: { ...nota, caso_id: filtroDemanda.value } })
    nota.texto = ''
    nota.minutos = ''
    await carregar()
  } finally {
    anotando.value = false
  }
}
</script>

<style scoped>
.filtro-hist { @apply rounded-full border border-gray-300 dark:border-zinc-700 px-3 py-1 text-[11px] font-semibold text-gray-500 hover:text-primary transition-colors; }
.filtro-hist-ativo { @apply bg-primary text-white border-primary hover:text-white; }
.card { @apply rounded-lg border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 space-y-1.5; }
.card h3 { @apply text-[10px] font-bold uppercase tracking-widest text-primary mb-2; }
.tag { @apply text-[11px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300; }
</style>
