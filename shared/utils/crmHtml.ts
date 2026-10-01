import { addDays } from './calendarioForense'

/**
 * Regras puras do CRM em HTML (artefato): ciclo de vida, exclusão em cascata, financeiro, painel "Hoje", funil, busca e relatórios.
 * Trabalha com listas simples (campos em snake_case, ids em texto). Mesmo código no artefato e nos testes.
 */
export const ETAPAS_PESSOA: [string, string][] = [
  ['novo', 'Novo contato'], ['qualificacao', 'Em qualificação'], ['consulta_agendada', 'Consulta agendada'], ['consulta_realizada', 'Consulta realizada'],
  ['proposta', 'Proposta enviada'], ['ativo', 'Cliente ativo'], ['concluido', 'Concluído'], ['nao_contratou', 'Não contratou'],
]
export const ETAPAS_LEAD = ['novo', 'qualificacao', 'consulta_agendada', 'consulta_realizada', 'proposta']
export const ETAPAS_CLIENTE = ['ativo', 'concluido']
export const nomeEtapaPessoa = (e: string) => ETAPAS_PESSOA.find(x => x[0] === e)?.[1] ?? e

type Doc = Record<string, any> & { id: string }
export interface Dados { pessoas: Doc[]; demandas: Doc[]; processos: Doc[]; partes: Doc[]; movimentacoes: Doc[]; tarefas: Doc[]; compromissos: Doc[]; documentos: Doc[]; honorarios: Doc[]; lancamentos: Doc[]; atividades: Doc[] }
export const vazioDados = (): Dados => ({ pessoas: [], demandas: [], processos: [], partes: [], movimentacoes: [], tarefas: [], compromissos: [], documentos: [], honorarios: [], lancamentos: [], atividades: [] })
const sem = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const dias = (de: string, ate: string) => Math.round((Date.parse(ate + 'T12:00:00Z') - Date.parse(de + 'T12:00:00Z')) / 864e5)
const brl = (n: number) => Math.round(n * 100) / 100

/** Demanda em aberto = não encerrada. */
export const demandaAberta = (d: Doc) => d.status !== 'encerrada'
/**
 * Ciclo de vida da pessoa: com demanda aberta vira "ativo"; sem demanda aberta e com alguma encerrada vira "concluído".
 * Quem ainda está no funil comercial (sem nenhuma demanda) não muda; "não contratou" só muda se abrirem demanda.
 */
export function etapaPessoaAposDemandas(pessoa: Doc, demandas: Doc[]): string {
  const minhas = demandas.filter(d => d.pessoa_id === pessoa.id)
  if (minhas.some(demandaAberta)) return 'ativo'
  if (minhas.length && ETAPAS_CLIENTE.includes(pessoa.etapa)) return 'concluido'
  return pessoa.etapa
}

/** O que acompanha uma demanda ao ser apagada: processos, partes, movimentações e documentos vão junto; honorários e lançamentos BLOQUEIAM. */
export function planoExclusaoDemanda(id: string, D: Dados) {
  const processos = D.processos.filter(p => p.demanda_id === id).map(p => p.id)
  return {
    processos, partes: D.partes.filter(p => p.demanda_id === id).map(p => p.id), documentos: D.documentos.filter(p => p.demanda_id === id).map(p => p.id),
    movimentacoes: D.movimentacoes.filter(m => processos.includes(m.processo_id)).map(m => m.id),
    soltar: { tarefas: D.tarefas.filter(t => t.demanda_id === id).map(t => t.id), compromissos: D.compromissos.filter(c => c.demanda_id === id).map(c => c.id), atividades: D.atividades.filter(a => a.demanda_id === id).map(a => a.id) },
    bloqueio: D.honorarios.some(h => h.demanda_id === id) || D.lancamentos.some(l => l.demanda_id === id) ? 'Esta demanda tem honorários ou lançamentos financeiros. Apague-os no Financeiro antes (para não perder o controle do que é devido).' : '',
  }
}
export const planoExclusaoProcesso = (id: string, D: Dados) => ({ movimentacoes: D.movimentacoes.filter(m => m.processo_id === id).map(m => m.id), documentos: D.documentos.filter(d => d.processo_id === id).map(d => d.id), compromissos: D.compromissos.filter(c => c.processo_id === id).map(c => c.id) })
export const planoExclusaoPessoa = (id: string, D: Dados) => ({ demandas: D.demandas.filter(d => d.pessoa_id === id).length, tarefas: D.tarefas.filter(t => t.pessoa_id === id).length, compromissos: D.compromissos.filter(c => c.pessoa_id === id).length })

/** A demanda manda na pessoa: todo item ligado a uma demanda herda o pessoa_id dela (nunca fica de outra pessoa). */
export function herdaPessoa<T extends Record<string, any>>(item: T, D: Dados): T {
  const dm = item.demanda_id ? D.demandas.find(d => d.id === item.demanda_id) : null
  if (dm) return { ...item, pessoa_id: dm.pessoa_id }
  return item
}

// ── financeiro ──
export interface ResumoFin { contratado: number; recebido: number; aReceber: number; vencido: number; proximos30: number; parcelasVencidas: number }
export function resumoFinanceiro(D: Dados, hoje: string, demandaId?: string): ResumoFin {
  const hon = D.honorarios.filter(h => h.status === 'contratado' && (!demandaId || h.demanda_id === demandaId))
  const ids = new Set(hon.map(h => h.id)), ls = D.lancamentos.filter(l => ids.has(l.honorario_id))
  const pago = ls.filter(l => l.pago_em), aberto = ls.filter(l => !l.pago_em), fim = addDays(hoje, 30)
  const soma = (a: Doc[]) => brl(a.reduce((s, l) => s + (Number(l.valor) || 0), 0))
  const venc = aberto.filter(l => l.vencimento && l.vencimento < hoje)
  return { contratado: brl(hon.reduce((s, h) => s + (Number(h.valor_total) || 0), 0)), recebido: soma(pago), aReceber: soma(aberto), vencido: soma(venc), parcelasVencidas: venc.length, proximos30: soma(aberto.filter(l => l.vencimento && l.vencimento >= hoje && l.vencimento <= fim)) }
}
/** Divide o valor em N parcelas mensais (centavos que sobram vão para a primeira); dia 29–31 vira o último dia do mês quando preciso. */
export function parcelar(total: number, n: number, primeiro: string): { valor: number; vencimento: string }[] {
  const N = Math.max(1, Math.min(120, Math.floor(n))), cent = Math.round(total * 100), base = Math.floor(cent / N), resto = cent - base * N
  const [y, m, d] = primeiro.split('-').map(Number) as [number, number, number]
  return Array.from({ length: N }, (_, i) => {
    const t = new Date(Date.UTC(y, m - 1 + i, 1)), ult = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate()
    return { valor: (base + (i === 0 ? resto : 0)) / 100, vencimento: `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(d, ult)).padStart(2, '0')}` }
  })
}
/** Situação comercial da demanda, derivada dos honorários dela. */
export function situacaoComercial(demandaId: string, D: Dados): 'sem_proposta' | 'proposta' | 'contratada' {
  const h = D.honorarios.filter(x => x.demanda_id === demandaId)
  return h.some(x => x.status === 'contratado') ? 'contratada' : h.some(x => x.status === 'proposta') ? 'proposta' : 'sem_proposta'
}

// ── painel Hoje ──
export function painelHoje(D: Dados, hoje: string) {
  const abertas = D.tarefas.filter(t => !t.feito)
  const comp = D.compromissos.filter(c => !c.feito)
  const lancAberto = D.lancamentos.filter(l => !l.pago_em && l.vencimento)
  return {
    tarefasAtrasadas: abertas.filter(t => t.data && t.data < hoje).sort((a, b) => a.data.localeCompare(b.data)),
    tarefasHoje: abertas.filter(t => t.data === hoje),
    prazosVencidos: comp.filter(c => c.tipo === 'prazo' && c.data < hoje).sort((a, b) => a.data.localeCompare(b.data)),
    compromissosHoje: comp.filter(c => c.data === hoje).sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || ''))),
    proximos7: comp.filter(c => c.data > hoje && c.data <= addDays(hoje, 7)).sort((a, b) => a.data.localeCompare(b.data) || String(a.hora || '').localeCompare(String(b.hora || ''))),
    parcelasVencidas: lancAberto.filter(l => l.vencimento < hoje),
    parcelasHoje: lancAberto.filter(l => l.vencimento === hoje),
    docsPendentes: D.documentos.filter(d => d.tipo === 'pedido' && d.status === 'pendente').length,
    leadsParados: D.pessoas.filter(p => ETAPAS_LEAD.includes(p.etapa) && p.etapa_desde && dias(String(p.etapa_desde).slice(0, 10), hoje) >= 5),
  }
}
/** Itens que pedem atenção (máx. N), do mais ao menos urgente. */
export function atencao(D: Dados, hoje: string, max = 5): { tipo: string; texto: string; id: string }[] {
  const p = painelHoje(D, hoje), out: { tipo: string; texto: string; id: string }[] = []
  for (const c of p.prazosVencidos) out.push({ tipo: 'prazo', texto: `Prazo vencido: ${c.titulo}`, id: c.id })
  for (const c of p.compromissosHoje.filter(c => c.tipo === 'prazo')) out.push({ tipo: 'prazo', texto: `Prazo vence HOJE: ${c.titulo}`, id: c.id })
  for (const t of p.tarefasAtrasadas) out.push({ tipo: 'tarefa', texto: `Tarefa atrasada: ${t.titulo}`, id: t.id })
  for (const l of p.parcelasVencidas.slice(0, 3)) out.push({ tipo: 'parcela', texto: `Parcela vencida (${l.vencimento.split('-').reverse().join('/')})`, id: l.id })
  for (const l of p.leadsParados.slice(0, 3)) out.push({ tipo: 'lead', texto: `Sem andamento há 5+ dias: ${l.nome}`, id: l.id })
  return out.slice(0, max)
}

// ── funil, busca e relatórios ──
export function funil(pessoas: Doc[]) {
  const conta = (e: string) => pessoas.filter(p => p.etapa === e && p.tipo !== 'relacionado').length
  const por = Object.fromEntries(ETAPAS_PESSOA.map(([e]) => [e, conta(e)]))
  const leadsTotal = ETAPAS_LEAD.reduce((s, e) => s + (por[e] ?? 0), 0), clientes = (por.ativo ?? 0) + (por.concluido ?? 0), naoContratou = por.nao_contratou ?? 0
  const decididos = clientes + naoContratou
  return { por, leadsTotal, clientes, naoContratou, conversao: decididos ? Math.round((clientes / decididos) * 1000) / 10 : 0 }
}
export function buscaGlobal(D: Dados, q: string, max = 30): { ent: string; id: string; titulo: string; sub: string }[] {
  const t = sem(q); if (t.length < 2) return []
  const nomePessoa = (id: string) => D.pessoas.find(p => p.id === id)?.nome ?? ''
  const campos: [keyof Dados, (d: Doc) => string, (d: Doc) => string, (d: Doc) => string[]][] = [
    ['pessoas', d => d.nome, d => nomeEtapa(d.etapa), d => [d.nome, d.whatsapp, d.email, d.cpf]],
    ['demandas', d => d.titulo, d => nomePessoa(d.pessoa_id), d => [d.titulo, d.area, nomePessoa(d.pessoa_id)]],
    ['processos', d => d.numero || d.orgao || 'Processo', d => d.tribunal || d.orgao || '', d => [d.numero, d.tribunal, d.orgao, d.vara, d.comarca]],
    ['partes', d => d.nome, d => d.papel, d => [d.nome, d.papel]],
    ['documentos', d => d.nome, d => d.status, d => [d.nome, d.tipo]],
    ['tarefas', d => d.titulo, d => d.data || '', d => [d.titulo]],
    ['compromissos', d => d.titulo, d => d.tipo, d => [d.titulo]],
  ]
  const out: { ent: string; id: string; titulo: string; sub: string }[] = []
  for (const [ent, tit, sub, cs] of campos) for (const d of D[ent]) if (cs(d).some(v => sem(v).includes(t) || (t.replace(/\D/g, '').length >= 4 && String(v ?? '').replace(/\D/g, '').includes(t.replace(/\D/g, ''))))) out.push({ ent, id: d.id, titulo: tit(d), sub: sub(d) })
  return out.slice(0, max)
}
const nomeEtapa = nomeEtapaPessoa

export function relatorios(D: Dados, hoje: string) {
  const mes = hoje.slice(0, 7), fin = resumoFinanceiro(D, hoje)
  const recebidoMes = brl(D.lancamentos.filter(l => l.pago_em && String(l.pago_em).startsWith(mes)).reduce((s, l) => s + (Number(l.valor) || 0), 0))
  const porArea: Record<string, number> = {}; for (const d of D.demandas.filter(demandaAberta)) porArea[d.area || 'Sem área'] = (porArea[d.area || 'Sem área'] ?? 0) + 1
  const porOrigem: Record<string, number> = {}; for (const p of D.pessoas) if (p.tipo !== 'relacionado' && p.origem) porOrigem[p.origem] = (porOrigem[p.origem] ?? 0) + 1
  return { funil: funil(D.pessoas), financeiro: fin, recebidoMes, demandasAbertas: D.demandas.filter(demandaAberta).length, demandasEncerradas: D.demandas.filter(d => !demandaAberta(d)).length, porArea, porOrigem, processosAtivos: D.processos.filter(p => p.fase !== 'arquivado' && p.fase !== 'encerrado').length }
}
/** Backup: valida e normaliza um arquivo exportado antes de importar (só coleções conhecidas, ids de texto, sem sobrescrever nada fora delas). */
export function validarBackup(j: any): { ok: boolean; dados?: Dados; erro?: string; total?: number } {
  if (!j || typeof j !== 'object' || j.tipo !== 'crm-lara-cafe' || typeof j.dados !== 'object') return { ok: false, erro: 'Arquivo não reconhecido. Use um backup exportado por este painel.' }
  const D = vazioDados(); let total = 0
  for (const k of Object.keys(D) as (keyof Dados)[]) {
    const l = j.dados[k]; if (l === undefined) continue
    if (!Array.isArray(l)) return { ok: false, erro: `Coleção "${k}" inválida no arquivo.` }
    for (const d of l) { if (!d || typeof d !== 'object' || !/^[\w.:@+~-]{1,120}$/.test(String(d.id ?? ''))) return { ok: false, erro: `Há um item sem identificador válido em "${k}".` }; D[k].push(JSON.parse(JSON.stringify(d))); total++ }
  }
  return { ok: true, dados: D, total }
}
