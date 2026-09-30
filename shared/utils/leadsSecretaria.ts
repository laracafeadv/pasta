import { addDays, dow } from './calendarioForense'
import type { EtapaLead, LeadSecretaria, OrigemLead } from '../data/secretaria'

/** Regras puras da aba Leads: semana, situação da conversa ("sumiu"), conversão, séries e leitura da conversa exportada do WhatsApp. */
export const ETAPAS: [EtapaLead, string][] = [['novo', 'Novo contato'], ['consulta', 'Ag. consulta'], ['proposta', 'Proposta enviada'], ['fechou', 'Fechou'], ['nao_fechou', 'Não fechou']]
export const ATIVAS: EtapaLead[] = ['novo', 'consulta', 'proposta']
export const ORIGENS: OrigemLead[] = ['Instagram', 'Indicação', 'Google', 'WhatsApp', 'Outro']
export const DIAS_SUMIU = 3
export const soDigitos = (v: unknown) => String(v ?? '').replace(/\D/g, '')

/** Telefone brasileiro: 10 ou 11 dígitos ganham o 55; devolve só dígitos (ou '' se não parecer telefone). */
export function normalizaFone(v: unknown): string {
  let d = soDigitos(v)
  if (d.length === 10 || d.length === 11) d = '55' + d
  return d.length >= 12 && d.length <= 13 ? d : ''
}
/** Segunda-feira da semana de uma data. */
export const semanaInicio = (iso: string) => addDays(iso, -((dow(iso) + 6) % 7))

export type SituacaoConversa = 'minha' | 'cliente' | 'sumiu' | null
/** "minha" = aguardando minha resposta; "cliente" = aguardando o cliente; "sumiu" = aguardando o cliente há mais de 3 dias. Só vale para lead em andamento. */
export function situacaoConversa(l: Pick<LeadSecretaria, 'etapa' | 'conversa' | 'conversa_desde'>, agoraMs: number): SituacaoConversa {
  if (!ATIVAS.includes(l.etapa)) return null
  if (l.conversa === 'minha') return 'minha'
  const desde = Date.parse(l.conversa_desde || '')
  if (!Number.isNaN(desde) && agoraMs - desde > DIAS_SUMIU * 864e5) return 'sumiu'
  return 'cliente'
}
export const aguardandoMinha = (leads: LeadSecretaria[], agoraMs: number) => leads.filter(l => situacaoConversa(l, agoraMs) === 'minha').length

export type Periodo = 'semana' | '30d' | 'tudo'
export function noPeriodo(l: Pick<LeadSecretaria, 'data_contato'>, periodo: Periodo, hoje: string) {
  const d = l.data_contato || ''
  if (periodo === 'semana') return d >= semanaInicio(hoje) && d <= hoje
  if (periodo === '30d') return d >= addDays(hoje, -29) && d <= hoje
  return true
}
/** Totais, em andamento, fechados e conversão (fechados ÷ leads do período, pela data do contato); % e conversão de cada origem. */
export function estatisticas(leads: LeadSecretaria[], periodo: Periodo, hoje: string) {
  const L = leads.filter(l => noPeriodo(l, periodo, hoje))
  const fechados = L.filter(l => l.etapa === 'fechou').length
  const conv = (f: number, t: number) => (t ? Math.round((f / t) * 1000) / 10 : 0)
  const origens = ORIGENS.map((o) => {
    const x = L.filter(l => (ORIGENS.includes(l.origem) ? l.origem : 'Outro') === o), f = x.filter(l => l.etapa === 'fechou').length
    return { origem: o, total: x.length, pct: conv(x.length, L.length), fechados: f, conversao: conv(f, x.length) }
  })
  const ini = semanaInicio(hoje), ant = addDays(ini, -7)
  return {
    total: L.length, andamento: L.filter(l => ATIVAS.includes(l.etapa)).length, fechados, conversao: conv(fechados, L.length), origens,
    nestaSemana: leads.filter(l => l.data_contato >= ini && l.data_contato <= hoje).length,
    semanaPassada: leads.filter(l => l.data_contato >= ant && l.data_contato < ini).length,
  }
}
/** Leads por semana (início na segunda) ou por mês nos últimos n períodos, do mais antigo para o mais novo. */
export function serieLeads(leads: LeadSecretaria[], modo: 'semana' | 'mes', hoje: string, n: number) {
  const out: { chave: string; rotulo: string; n: number }[] = []
  if (modo === 'mes') {
    let [y, m] = hoje.split('-').map(Number) as [number, number]
    for (let i = 0; i < n; i++) { out.unshift({ chave: `${y}-${String(m).padStart(2, '0')}`, rotulo: `${String(m).padStart(2, '0')}/${String(y).slice(2)}`, n: 0 }); m--; if (m === 0) { m = 12; y-- } }
    for (const l of leads) { const k = out.find(o => o.chave === (l.data_contato || '').slice(0, 7)); if (k) k.n++ }
  } else {
    const ini = semanaInicio(hoje)
    for (let i = n - 1; i >= 0; i--) { const d = addDays(ini, -7 * i); out.push({ chave: d, rotulo: `${d.slice(8, 10)}/${d.slice(5, 7)}`, n: 0 }) }
    for (const l of leads) { const s = l.data_contato ? semanaInicio(l.data_contato) : '', k = out.find(o => o.chave === s); if (k) k.n++ }
  }
  return out
}

export interface MensagemZap { ts: string; autor: string; texto: string }
/** Exportação do WhatsApp (.txt): "dd/mm/aaaa hh:mm - Nome: texto" ou "[dd/mm/aaaa, hh:mm:ss] Nome: texto". Linhas sem autor (sistema) são ignoradas. */
export function lerWhatsapp(texto: string): { msgs: MensagemZap[]; autores: string[] } {
  const re = /^‎?\[?(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::\d{2})?\]?\s*(?:-\s*)?([^:]{1,80}?):\s(.*)$/
  const msgs: MensagemZap[] = []
  const p = (n: number | string) => String(n).padStart(2, '0')
  for (const linha of String(texto ?? '').replace(/\r/g, '').split('\n')) {
    const m = linha.match(re)
    if (m) { let a = Number(m[3]); if (a < 100) a += 2000; msgs.push({ ts: `${a}-${p(m[2]!)}-${p(m[1]!)}T${p(m[4]!)}:${m[5]}:00-03:00`, autor: m[6]!.trim(), texto: m[7] ?? '' }) }
    else if (msgs.length && linha.trim() && !/^‎?\[?\d{1,2}\/\d{1,2}\/\d{2,4}/.test(linha)) msgs[msgs.length - 1]!.texto += '\n' + linha
  }
  const autores: string[] = []
  for (const m of msgs) if (!autores.includes(m.autor)) autores.push(m.autor)
  return { msgs, autores }
}
/** Trecho da conversa para a IA (começo e fim, até ~12 mil caracteres). */
export function resumoParaIA(msgs: MensagemZap[]) {
  let t = msgs.map(m => `${m.ts.slice(8, 10)}/${m.ts.slice(5, 7)} ${m.ts.slice(11, 16)} ${m.autor}: ${m.texto.replace(/\s+/g, ' ').slice(0, 400)}`).join('\n')
  if (t.length > 12000) t = t.slice(0, 4000) + '\n[...trecho omitido...]\n' + t.slice(-8000)
  return t
}
/** Quem falou por último define de quem é a vez: se foi a advogada, aguarda o cliente; se foi o cliente, aguarda ela. */
export function conversaPelaUltima(msgs: MensagemZap[], advogada: string): { conversa: 'minha' | 'cliente'; conversa_desde: string } {
  const u = msgs[msgs.length - 1]
  if (!u) return { conversa: 'minha', conversa_desde: new Date().toISOString() }
  return { conversa: u.autor === advogada ? 'cliente' : 'minha', conversa_desde: new Date(u.ts).toISOString() }
}
