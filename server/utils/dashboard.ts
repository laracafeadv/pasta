import { ETAPAS, TIPOS_COMPROMISSO, dataCompromisso, situacaoData } from '../../shared/types/crm'
import type {
  CasoAndamento, DashboardData, DiaCarga, EventoAgenda, ItemAtencao, Severidade,
} from '../../shared/types/dashboard'

// Entradas mínimas (só as colunas que o Dashboard lê). Toda a conta é feita aqui, em memória,
// sobre listas pequenas e limitadas — uma única ida ao banco por tabela.
type Pessoa = { id: number; nome: string | null } | null
export interface EntradaDashboard {
  hoje: string
  agora: number
  dias: number
  papel: 'admin' | 'equipe'
  contatos: {
    id: number; nome: string | null; etapa: string; created_at: string; proxima_acao: string | null; proxima_data: string | null
    ultima_mensagem_em: string | null; nao_contatar: boolean | null; sugestao_resposta: string | null
  }[]
  casos: { id: number; titulo: string; status: string; processos?: { fase: string | null; status: string; natureza?: string }[]; contato: Pessoa }[]
  compromissos: {
    id: number; tipo: string; titulo: string; inicio: string | null; data_limite: string | null; local: string | null
    contato_id: number | null; caso_id: number | null; contato: Pessoa; caso: { id: number; titulo: string } | null
  }[]
  tarefas: {
    id: number; titulo: string; prazo: string; prioridade: string; contato_id: number | null; caso_id: number | null
    contato: Pessoa; caso: { id: number; titulo: string } | null
  }[]
  docsPendentes: { contato_id: number }[]
  honorarios: { status: string; tipo: string; valor: number; created_at: string; data_contratacao: string | null }[]
  lancamentos: { tipo: string; valor: number; vencimento: string; pago_em: string | null }[] | null
  atividades: { id: number; created_at: string; tipo: string; texto: string; contato_id: number; contato: Pessoa }[]
  envios: { contato_id: number; status: string; created_at: string; respondido_em: string | null; contato: Pessoa }[]
  mensagens: { contato_id: number; direcao: string; created_at: string }[]
  tarefasConcluidas: number
  prazosCumpridos: number
}

const RANK: Record<Severidade, number> = { urgente: 0, atrasado: 1, atencao: 2 }
const somarDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const diasEntre = (de: string, ate: string) => Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 864e5)
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`
const hora = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : null)
const ehTarefaAgendada = (tipo: string) => tipo === 'tarefa'

export function montarDashboard(e: EntradaDashboard): DashboardData {
  const { hoje } = e
  const amanha = somarDias(hoje, 1)
  const em7 = somarDias(hoje, 7)
  const desde = new Date(e.agora - e.dias * 864e5).toISOString()
  const desdeData = desde.slice(0, 10)

  const aberto = (etapa: string) => ETAPAS.find(x => x.id === etapa)?.aberta ?? true
  const abertos = e.contatos.filter(c => aberto(c.etapa))
  const comData = e.compromissos.map(c => ({ ...c, data: dataCompromisso(c) })).filter(c => c.data)

  // ── Contagens (mesmos critérios das telas Hoje, Tarefas e Prazos) ──────────────────────
  const retornosAtrasados = abertos.filter(c => c.proxima_acao && c.proxima_data && c.proxima_data < hoje)
  const retornosHoje = abertos.filter(c => c.proxima_acao && c.proxima_data === hoje)
  const semAcao = abertos.filter(c => !c.proxima_acao || !c.proxima_data)
  const prazosC = comData.filter(c => c.tipo === 'prazo')
  const agendaC = comData.filter(c => c.tipo !== 'prazo' && !ehTarefaAgendada(c.tipo))
  const tarefasC = comData.filter(c => ehTarefaAgendada(c.tipo))
  const conta = (lista: { data: string }[], sit: 'atrasado' | 'hoje') => lista.filter(x => situacaoData(x.data, hoje) === sit).length
  const contaTar = (sit: 'atrasado' | 'hoje') => e.tarefas.filter(t => situacaoData(t.prazo, hoje) === sit).length

  const atrasado = {
    tarefas: contaTar('atrasado') + conta(tarefasC, 'atrasado'),
    prazos: conta(prazosC, 'atrasado'),
    compromissos: conta(agendaC, 'atrasado'),
    retornos: retornosAtrasados.length,
  }
  const hojeR = {
    tarefas: contaTar('hoje') + conta(tarefasC, 'hoje'),
    prazos: conta(prazosC, 'hoje'),
    compromissos: conta(agendaC, 'hoje'),
    retornos: retornosHoje.length,
  }
  const soma = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0)
  const noIntervalo = (d: string) => d > hoje && d <= em7
  const proximos7 = {
    tarefas: e.tarefas.filter(t => noIntervalo(t.prazo)).length + tarefasC.filter(c => noIntervalo(c.data)).length,
    prazos: prazosC.filter(c => noIntervalo(c.data)).length,
    compromissos: agendaC.filter(c => noIntervalo(c.data)).length,
  }

  // Número do menu "Hoje": mesma fórmula da tela Hoje (vencido + de hoje + sem próxima ação).
  const pendencias = retornosAtrasados.length + retornosHoje.length + semAcao.length
    + comData.filter(c => c.data <= hoje).length + e.tarefas.filter(t => t.prazo <= hoje).length

  const clientesIds = new Set(e.contatos.filter(c => c.etapa === 'ativo').map(c => c.id))
  const docsPorCliente = new Map<number, number>()
  for (const d of e.docsPendentes) if (clientesIds.has(d.contato_id)) docsPorCliente.set(d.contato_id, (docsPorCliente.get(d.contato_id) ?? 0) + 1)
  const propostas = e.honorarios.filter(h => h.status === 'Proposta' && h.tipo !== 'Consulta')

  // ── Atenção agora ──────────────────────────────────────────────────────────────────────
  const itens: ItemAtencao[] = []
  const nomeDe = (p: Pessoa) => p?.nome ?? null
  const ctx = (p: Pessoa, caso: { titulo: string } | null) => [nomeDe(p), caso?.titulo].filter(Boolean).join(' · ')

  for (const c of prazosC) {
    const dias = diasEntre(hoje, c.data)
    if (dias > 3) continue
    const sev: Severidade = dias <= 0 ? 'urgente' : 'atencao'
    itens.push({
      id: `prazo-${c.id}`, grupo: 'prazos', origem: 'prazo', severidade: sev, titulo: c.titulo, data: c.data,
      detalhe: [dias < 0 ? `Prazo atrasado há ${plural(-dias, 'dia', 'dias')}` : dias === 0 ? 'Prazo vence hoje' : `Prazo em ${plural(dias, 'dia', 'dias')}`, ctx(c.contato, c.caso)].filter(Boolean).join(' · '),
      contatoId: c.contato_id, compromissoId: c.id, link: '/prazos', aba: 'demandas',
    })
  }
  for (const c of agendaC) {
    const dias = diasEntre(hoje, c.data)
    if (dias > 1) continue
    const rotulo = TIPOS_COMPROMISSO[c.tipo as keyof typeof TIPOS_COMPROMISSO]?.nome ?? 'Compromisso'
    const h = hora(c.inicio)
    itens.push({
      id: `comp-${c.id}`, grupo: 'prazos', origem: 'compromisso', severidade: dias < 0 ? 'atrasado' : 'atencao', titulo: c.titulo, data: c.data,
      detalhe: [dias < 0 ? `${rotulo} passou e segue pendente` : `${rotulo} ${dias === 0 ? 'hoje' : 'amanhã'}${h ? ` às ${h}` : ''}`, ctx(c.contato, c.caso)].filter(Boolean).join(' · '),
      contatoId: c.contato_id, compromissoId: c.id, link: '/agenda', aba: 'demandas',
    })
  }
  for (const t of e.tarefas) {
    const sit = situacaoData(t.prazo, hoje)
    if (sit === 'futuro') continue
    if (sit === 'hoje' && t.prioridade !== 'alta') continue
    itens.push({
      id: `tarefa-${t.id}`, grupo: 'tarefas', origem: 'tarefa', severidade: sit === 'atrasado' ? 'atrasado' : 'atencao', titulo: t.titulo, data: t.prazo,
      detalhe: [sit === 'atrasado' ? `Atrasada há ${plural(-diasEntre(hoje, t.prazo), 'dia', 'dias')}` : 'Hoje · prioridade alta', ctx(t.contato, t.caso)].filter(Boolean).join(' · '),
      contatoId: t.contato_id, tarefaId: t.id, link: '/tarefas',
    })
  }
  for (const c of tarefasC) {
    if (situacaoData(c.data, hoje) !== 'atrasado') continue
    itens.push({
      id: `comp-${c.id}`, grupo: 'tarefas', origem: 'compromisso', severidade: 'atrasado', titulo: c.titulo, data: c.data,
      detalhe: [`Atrasada há ${plural(-diasEntre(hoje, c.data), 'dia', 'dias')}`, nomeDe(c.contato)].filter(Boolean).join(' · '),
      contatoId: c.contato_id, compromissoId: c.id, link: '/agenda',
    })
  }
  for (const c of retornosAtrasados) {
    itens.push({
      id: `retorno-${c.id}`, grupo: 'clientes', origem: 'retorno', severidade: 'atrasado', titulo: c.proxima_acao!, data: c.proxima_data,
      detalhe: [`Retorno atrasado há ${plural(-diasEntre(hoje, c.proxima_data!), 'dia', 'dias')}`, c.nome].filter(Boolean).join(' · '),
      contatoId: c.id, link: '/crm',
    })
  }
  // Conversa em que a última mensagem é da cliente e ninguém respondeu.
  const ultimaPorContato = new Map<number, { direcao: string; created_at: string }>()
  for (const m of e.mensagens) if (!ultimaPorContato.has(m.contato_id)) ultimaPorContato.set(m.contato_id, m)
  const porId = new Map(e.contatos.map(c => [c.id, c]))
  for (const [id, m] of ultimaPorContato) {
    const c = porId.get(id)
    if (!c || m.direcao !== 'entrada' || c.nao_contatar) continue
    const horas = (e.agora - Date.parse(m.created_at)) / 36e5
    if (horas < 24) continue
    const dias = Math.floor(horas / 24)
    itens.push({
      id: `resposta-${id}`, grupo: 'clientes', origem: 'resposta', severidade: dias >= 3 ? 'atrasado' : 'atencao', titulo: 'Aguardando a sua resposta', data: m.created_at.slice(0, 10),
      detalhe: [`Última mensagem dela há ${plural(dias, 'dia', 'dias')}`, c.nome].filter(Boolean).join(' · '),
      contatoId: id, link: '/crm', aba: 'conversa',
    })
  }
  for (const c of abertos) {
    if (!c.sugestao_resposta || c.nao_contatar) continue
    itens.push({
      id: `sugestao-${c.id}`, grupo: 'clientes', origem: 'sugestao', severidade: 'atencao', titulo: 'Resposta sugerida para revisar', data: null,
      detalhe: c.nome ?? '', contatoId: c.id, link: '/crm', aba: 'conversa',
    })
  }
  for (const v of e.envios) {
    const dias = diasEntre(v.created_at.slice(0, 10), hoje)
    if (v.status === 'respondido' && v.respondido_em && diasEntre(v.respondido_em.slice(0, 10), hoje) <= 3) {
      itens.push({
        id: `form-${v.contato_id}-${v.respondido_em}`, grupo: 'clientes', origem: 'formulario', severidade: 'atencao', titulo: 'Formulário respondido', data: v.respondido_em.slice(0, 10),
        detalhe: nomeDe(v.contato) ?? '', contatoId: v.contato_id, link: '/formularios',
      })
    } else if ((v.status === 'enviado' || v.status === 'visualizado') && dias >= 3 && dias <= 14) {
      itens.push({
        id: `formp-${v.contato_id}-${v.created_at}`, grupo: 'clientes', origem: 'formulario_pendente', severidade: 'atencao', titulo: 'Formulário sem resposta', data: v.created_at.slice(0, 10),
        detalhe: [`Enviado há ${plural(dias, 'dia', 'dias')}`, nomeDe(v.contato)].filter(Boolean).join(' · '), contatoId: v.contato_id, link: '/formularios',
      })
    }
  }
  for (const [id, n] of docsPorCliente) {
    const c = porId.get(id)!
    itens.push({
      id: `docs-${id}`, grupo: 'clientes', origem: 'documentos', severidade: 'atencao', titulo: `${plural(n, 'documento pendente', 'documentos pendentes')}`, data: null,
      detalhe: c.nome ?? '', contatoId: id, link: '/clientes', aba: 'documentos',
    })
  }
  if (semAcao.length) {
    itens.push({
      id: 'sem-acao', grupo: 'clientes', origem: 'sem_acao', severidade: 'atencao', titulo: `${plural(semAcao.length, 'contato sem próxima ação', 'contatos sem próxima ação')}`, data: null,
      detalhe: 'Todo caso aberto deve ter um próximo passo com data.', contatoId: null, link: '/crm',
    })
  }
  itens.sort((a, b) => RANK[a.severidade] - RANK[b.severidade] || (a.data ?? '9999').localeCompare(b.data ?? '9999') || a.titulo.localeCompare(b.titulo))

  // ── Próximos eventos (só compromissos: as tarefas ficam em Tarefas) ───────────────────
  const agenda: EventoAgenda[] = comData
    .filter(c => c.data >= hoje && c.data <= em7 && !ehTarefaAgendada(c.tipo))
    .map(c => ({
      id: `ag-${c.id}`, tipo: c.tipo, titulo: c.titulo, dia: c.data, hora: hora(c.inicio),
      contato: c.contato, caso: c.caso?.titulo ?? null, local: c.local, compromissoId: c.id, ehPrazo: c.tipo === 'prazo',
    }))
    .sort((a, b) => a.dia.localeCompare(b.dia) || (a.hora ?? '99').localeCompare(b.hora ?? '99'))

  // ── Carga de trabalho: acumulado em atraso + próximos 14 dias ─────────────────────────
  const dias14: DiaCarga[] = Array.from({ length: 14 }, (_, i) => ({ dia: somarDias(hoje, i), prazos: 0, compromissos: 0, tarefas: 0 }))
  const idx = new Map(dias14.map((d, i) => [d.dia, i]))
  for (const c of comData) {
    const i = idx.get(c.data); if (i === undefined) continue
    if (c.tipo === 'prazo') dias14[i]!.prazos++
    else if (ehTarefaAgendada(c.tipo)) dias14[i]!.tarefas++
    else dias14[i]!.compromissos++
  }
  for (const t of e.tarefas) { const i = idx.get(t.prazo); if (i !== undefined) dias14[i]!.tarefas++ }

  // ── Casos em andamento: o que vence primeiro em cada um ───────────────────────────────
  const casosAtivos = e.casos.filter(c => c.status === 'ativo')
  const proximoPorCaso = new Map<number, { data: string; titulo: string }>()
  for (const c of [...comData].sort((a, b) => a.data.localeCompare(b.data))) {
    if (c.caso_id && c.data >= hoje && !proximoPorCaso.has(c.caso_id) && !ehTarefaAgendada(c.tipo)) proximoPorCaso.set(c.caso_id, { data: c.data, titulo: c.titulo })
  }
  const tarefasPorCaso = new Map<number, number>()
  for (const t of e.tarefas) if (t.caso_id) tarefasPorCaso.set(t.caso_id, (tarefasPorCaso.get(t.caso_id) ?? 0) + 1)
  const casosAndamento: CasoAndamento[] = casosAtivos
    .map(c => ({ id: c.id, titulo: c.titulo, contato: c.contato, fase: c.processos?.find(p => p.status === 'ativo' && p.fase)?.fase ?? null, proximoPrazo: proximoPorCaso.get(c.id) ?? null, tarefasAbertas: tarefasPorCaso.get(c.id) ?? 0 }))
    .sort((a, b) => (a.proximoPrazo?.data ?? '9999').localeCompare(b.proximoPrazo?.data ?? '9999'))
    .slice(0, 6)

  // ── Indicadores do período (só o que tem número real por trás) ────────────────────────
  const contratos = e.honorarios.filter(h => ['Contratado', 'Pago'].includes(h.status) && h.tipo !== 'Consulta' && (h.data_contratacao ?? h.created_at.slice(0, 10)) >= desdeData)
  const consultasPagas = e.honorarios.filter(h => h.tipo === 'Consulta' && h.status === 'Pago' && (h.data_contratacao ?? h.created_at.slice(0, 10)) >= desdeData).length

  let financeiro: DashboardData['financeiro'] = null
  if (e.papel === 'admin' && e.lancamentos) {
    const mesAtual = hoje.slice(0, 7)
    const receber = e.lancamentos.filter(l => l.tipo === 'receber')
    const soma$ = (l: typeof receber) => l.reduce((s, x) => s + Number(x.valor || 0), 0)
    const meses = Array.from({ length: 6 }, (_, i) => {
      const [a, m] = mesAtual.split('-').map(Number)
      return new Date(Date.UTC(a!, m! - 6 + i, 1)).toISOString().slice(0, 7)
    })
    financeiro = {
      recebidoMes: soma$(receber.filter(l => l.pago_em && l.pago_em.slice(0, 7) === mesAtual)),
      aReceber30d: soma$(receber.filter(l => !l.pago_em && l.vencimento >= hoje && l.vencimento <= somarDias(hoje, 30))),
      emAtraso: soma$(receber.filter(l => !l.pago_em && l.vencimento < hoje)),
      porMes: meses.map(mes => ({ mes, recebido: soma$(receber.filter(l => l.pago_em && l.pago_em.slice(0, 7) === mes)) })),
    }
  }

  return {
    geradoEm: new Date(e.agora).toISOString(),
    hoje,
    papel: e.papel,
    dias: e.dias,
    resumo: {
      hoje: { total: soma(hojeR), ...hojeR },
      atrasado: { total: soma(atrasado), ...atrasado },
      proximos7: { total: soma(proximos7), ...proximos7 },
      carteira: {
        clientesAtivos: e.contatos.filter(c => c.etapa === 'ativo').length,
        casosAtivos: casosAtivos.length,
        processosJudiciais: e.casos.flatMap(c => c.processos ?? []).filter(p => p.status === 'ativo' && p.natureza === 'judicial').length,
        procedimentosExtrajudiciais: e.casos.flatMap(c => c.processos ?? []).filter(p => p.status === 'ativo' && p.natureza === 'extrajudicial').length,
        casosSuspensos: e.casos.filter(c => c.status === 'suspenso').length,
        leadsAbertos: abertos.filter(c => c.etapa !== 'ativo').length,
      },
      abertas: {
        tarefas: e.tarefas.length,
        prazos: prazosC.length,
        documentosClientes: docsPorCliente.size,
        propostas: propostas.length,
        propostasValor: propostas.reduce((s, h) => s + Number(h.valor || 0), 0),
      },
      pendencias,
    },
    atencao: itens.slice(0, 60),
    agenda,
    carga: {
      atrasado: { prazos: atrasado.prazos, compromissos: atrasado.compromissos, tarefas: atrasado.tarefas },
      dias: dias14,
    },
    funil: ETAPAS.filter(x => x.aberta).map(x => ({ id: x.id, nome: x.nome, total: e.contatos.filter(c => c.etapa === x.id).length })),
    casosAndamento,
    periodo: {
      novosContatos: e.contatos.filter(c => c.created_at >= desde).length,
      consultasPagas,
      contratos: { total: contratos.length, valor: contratos.reduce((s, h) => s + Number(h.valor || 0), 0) },
      tarefasConcluidas: e.tarefasConcluidas,
      prazosCumpridos: e.prazosCumpridos,
    },
    financeiro,
    atividade: e.atividades.map(a => ({ id: a.id, quando: a.created_at, tipo: a.tipo, texto: a.texto.slice(0, 220), sistema: a.tipo === 'Sistema', contato: a.contato })),
  }
}
