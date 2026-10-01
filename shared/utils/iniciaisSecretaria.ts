import { addDays } from './calendarioForense'
import { acharData } from './secretariaTexto'
import type { EtapaInicial, InicialSecretaria, ItemChecklist } from '../data/secretaria'

/**
 * Regras puras da aba Iniciais (petições iniciais): etapas, alertas de prazo, resumo, faixa de 7 dias, o que vai para o "Hoje",
 * checklist, número CNJ e leitura do campo "O que você precisa?". Mesmo código no CRM e no artefato (campos em snake_case nos dois).
 */
export const ETAPAS_INI: [EtapaInicial, string][] = [
  ['aguardando', 'Aguardando documentos'], ['produzir', 'A produzir'], ['redacao', 'Em redação'], ['revisao', 'Em revisão'], ['pronta', 'Pronta para protocolar'], ['protocolada', 'Protocolada'],
]
export const PRIORIDADES: [string, string][] = [['alta', 'Alta'], ['normal', 'Normal'], ['baixa', 'Baixa']]
export const TIPOS_FATAL: [string, string][] = [['prescricao', 'Prescrição'], ['decadencia', 'Decadência'], ['outro', 'Outro']]
export const AREAS_INI = ['Família', 'Sucessões', 'Previdenciário', 'Trabalhista', 'Cível', 'Consumidor', 'Outra']
export const DIAS_FAIXA = 7
export const DIAS_HOJE = 2

export const ACOES_POR_AREA: Record<string, string[]> = {
  'Família': ['Divórcio litigioso', 'Divórcio consensual', 'Reconhecimento e dissolução de união estável', 'Guarda', 'Regulamentação de convivência', 'Fixação de pensão alimentícia', 'Execução de alimentos', 'Revisional de alimentos', 'Exoneração de alimentos', 'Investigação de paternidade', 'Partilha de bens'],
  'Sucessões': ['Inventário judicial', 'Inventário extrajudicial', 'Arrolamento', 'Abertura e cumprimento de testamento', 'Sobrepartilha', 'Petição de herança', 'Alvará judicial'],
  'Previdenciário': ['Aposentadoria por tempo de contribuição', 'Aposentadoria por idade', 'Aposentadoria especial', 'Aposentadoria da pessoa com deficiência', 'Auxílio por incapacidade temporária', 'Benefício de prestação continuada (BPC/LOAS)', 'Pensão por morte', 'Revisão de benefício', 'Salário-maternidade'],
  'Trabalhista': ['Reclamação trabalhista', 'Reconhecimento de vínculo', 'Verbas rescisórias', 'Horas extras', 'Rescisão indireta', 'Acidente de trabalho / doença ocupacional'],
  'Cível': ['Ação de cobrança', 'Indenização por danos morais e materiais', 'Obrigação de fazer', 'Usucapião', 'Ação de despejo', 'Tutela de urgência antecedente'],
  'Consumidor': ['Indenização por danos morais (consumidor)', 'Revisional de contrato bancário', 'Obrigação de fazer c/c indenização', 'Declaratória de inexistência de débito', 'Negativação indevida'],
}
export const DOCS_POR_AREA: Record<string, string[]> = {
  'Família': ['Documento de identidade e CPF', 'Comprovante de residência', 'Certidão de casamento atualizada', 'Certidão de nascimento dos filhos', 'Comprovante de renda', 'Comprovantes de despesas dos filhos', 'Escritura / contrato de união estável', 'Documentos dos bens (imóveis e veículos)', 'Conversas e provas'],
  'Sucessões': ['Certidão de óbito', 'Documento de identidade e CPF do falecido e dos herdeiros', 'Certidão de casamento / nascimento dos herdeiros', 'Certidão de bens imóveis (matrícula atualizada)', 'IPTU', 'CRLV / documentos dos veículos', 'Extratos bancários', 'Testamento (se houver)', 'Certidão negativa de tributos'],
  'Previdenciário': ['CTPS', 'CNIS', 'PPP', 'LTCAT / laudos técnicos', 'Carnês / GPS de contribuição', 'Certidão de tempo de contribuição', 'Carta de concessão ou indeferimento do INSS', 'Laudos e atestados médicos', 'Documento de identidade, CPF e comprovante de residência', 'Certidão de casamento / nascimento / óbito'],
  'Trabalhista': ['CTPS', 'Termo de rescisão (TRCT)', 'Contracheques', 'Extrato do FGTS', 'Contrato de trabalho', 'Controle de ponto', 'Conversas e provas (WhatsApp)', 'Documento de identidade e CPF'],
  'Cível': ['Documento de identidade e CPF', 'Comprovante de residência', 'Contrato', 'Comprovantes de pagamento', 'Notificação extrajudicial', 'Conversas e provas', 'Certidões'],
  'Consumidor': ['Documento de identidade e CPF', 'Comprovante de residência', 'Contrato / fatura', 'Protocolos de atendimento', 'Extrato de negativação (SPC/Serasa)', 'Comprovantes de pagamento', 'Conversas e provas'],
  'Outra': ['Documento de identidade e CPF', 'Comprovante de residência', 'Procuração', 'Declaração de hipossuficiência'],
}
export const semAcento = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const sem = semAcento
export const acoesDaArea = (area: string | null | undefined) => (area && ACOES_POR_AREA[area]) || Object.values(ACOES_POR_AREA).flat()
export const docsDaArea = (area: string | null | undefined) => DOCS_POR_AREA[area || ''] || DOCS_POR_AREA['Outra']!

const diasEntre = (de: string, ate: string) => Math.round((Date.parse(ate + 'T12:00:00Z') - Date.parse(de + 'T12:00:00Z')) / 864e5)
export const indiceEtapa = (e: EtapaInicial) => ETAPAS_INI.findIndex(x => x[0] === e)
export const nomeEtapa = (e: EtapaInicial) => ETAPAS_INI.find(x => x[0] === e)?.[1] ?? e
export const proximaEtapa = (e: EtapaInicial): EtapaInicial | null => ETAPAS_INI[indiceEtapa(e) + 1]?.[0] ?? null
export const emAndamento = (i: Pick<InicialSecretaria, 'etapa'>) => i.etapa !== 'protocolada'
export const checklistPendente = (i: Pick<InicialSecretaria, 'checklist'>): ItemChecklist[] => (Array.isArray(i.checklist) ? i.checklist : []).filter(c => !c.ok)

export type NivelAlerta = 'atrasada' | 'vencendo' | 'ok' | 'sem'
export interface Alerta { nivel: NivelAlerta; data: string | null; tipo: 'fatal' | 'meta' | null; dias: number | null }
/** Alerta de uma inicial ainda não protocolada: vale a data mais próxima entre a meta de protocolo e o prazo fatal. Protocolada não alerta. */
export function alerta(i: Pick<InicialSecretaria, 'etapa' | 'meta_protocolo' | 'prazo_fatal'>, hoje: string): Alerta | null {
  if (!emAndamento(i)) return null
  const c: { data: string; tipo: 'fatal' | 'meta' }[] = []
  if (i.prazo_fatal) c.push({ data: i.prazo_fatal, tipo: 'fatal' })
  if (i.meta_protocolo) c.push({ data: i.meta_protocolo, tipo: 'meta' })
  if (!c.length) return { nivel: 'sem', data: null, tipo: null, dias: null }
  c.sort((a, b) => a.data.localeCompare(b.data) || (a.tipo === 'fatal' ? -1 : 1))
  const p = c[0]!, dias = diasEntre(hoje, p.data)
  return { nivel: dias < 0 ? 'atrasada' : dias <= DIAS_FAIXA ? 'vencendo' : 'ok', data: p.data, tipo: p.tipo, dias }
}

export function resumoIniciais(lista: InicialSecretaria[], hoje: string) {
  let andamento = 0, atrasadas = 0, vencendo = 0
  for (const i of lista) {
    if (!emAndamento(i)) continue
    andamento++
    const a = alerta(i, hoje)
    if (a?.nivel === 'atrasada') atrasadas++
    else if (a?.nivel === 'vencendo') vencendo++
  }
  return { andamento, atrasadas, vencendo }
}

export interface PrazoFaixa { id: InicialSecretaria['id']; cliente: string; acao: string | null; data: string; tipo: 'fatal' | 'meta'; dias: number; atrasado: boolean }
/** "Prazos dos próximos 7 dias": cada data (meta e fatal) de iniciais em andamento; as vencidas vêm primeiro, marcadas, para não sumirem da vista. */
export function prazosProximos(lista: InicialSecretaria[], hoje: string): PrazoFaixa[] {
  const fim = addDays(hoje, DIAS_FAIXA), out: PrazoFaixa[] = []
  for (const i of lista) {
    if (!emAndamento(i)) continue
    for (const [tipo, data] of [['fatal', i.prazo_fatal], ['meta', i.meta_protocolo]] as const) {
      if (data && data <= fim) out.push({ id: i.id, cliente: i.cliente, acao: i.acao, data, tipo, dias: diasEntre(hoje, data), atrasado: data < hoje })
    }
  }
  return out.sort((a, b) => a.data.localeCompare(b.data) || (a.tipo === 'fatal' ? -1 : 1) || a.cliente.localeCompare(b.cliente))
}

/** O que vai para a faixa "Hoje" e para o número da aba: atrasadas ou com a data mais próxima em até 2 dias. */
export function paraHoje(lista: InicialSecretaria[], hoje: string) {
  return lista.map(i => ({ i, a: alerta(i, hoje) })).filter(x => x.a && x.a.dias != null && x.a.dias <= DIAS_HOJE).sort((x, y) => x.a!.dias! - y.a!.dias!)
}
export const seloIniciais = (lista: InicialSecretaria[], hoje: string) => paraHoje(lista, hoje).length

/** Busca (cliente, ação, parte contrária, processo) e filtro por área; sem acento e sem diferenciar maiúsculas. */
export function filtrarIniciais(lista: InicialSecretaria[], busca: string, area: string) {
  const q = sem(busca), qd = q.replace(/\D/g, '')
  return lista.filter(i => (!area || i.area === area) && (!q || [i.cliente, i.acao, i.parte_contraria, i.processo_numero].some(v => sem(v).includes(q)) || (qd.length >= 4 && (i.processo_numero || '').replace(/\D/g, '').includes(qd))))
}
const peso = (i: InicialSecretaria) => (i.prioridade === 'alta' ? 0 : i.prioridade === 'normal' ? 1 : 2)
/** Ordem do card dentro da coluna: protocoladas pelas mais recentes; as demais pela data mais próxima, depois prioridade. */
export function ordenarColuna(lista: InicialSecretaria[], etapa: EtapaInicial, hoje: string) {
  const col = lista.filter(i => i.etapa === etapa)
  if (etapa === 'protocolada') return col.sort((a, b) => (b.protocolo_data || '').localeCompare(a.protocolo_data || '') || a.cliente.localeCompare(b.cliente))
  return col.sort((a, b) => (alerta(a, hoje)?.data ?? '9999').localeCompare(alerta(b, hoje)?.data ?? '9999') || peso(a) - peso(b) || a.cliente.localeCompare(b.cliente))
}

/** Sugestões de documentos da área que ainda não estão no checklist. */
export function docsSugeridos(area: string | null | undefined, checklist: ItemChecklist[]) {
  const tem = new Set((checklist || []).map(c => sem(c.texto)))
  return docsDaArea(area).filter(d => !tem.has(sem(d)))
}
export function adicionarDoc(checklist: ItemChecklist[], texto: string): ItemChecklist[] {
  const t = String(texto ?? '').trim().slice(0, 120)
  if (!t || (checklist || []).some(c => sem(c.texto) === sem(t))) return checklist || []
  return [...(checklist || []), { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), texto: t, ok: false }]
}
/** Checklist vindo de fora: no máximo 40 itens, texto limpo, sem repetidos. */
export function limparChecklist(v: unknown): ItemChecklist[] {
  if (!Array.isArray(v)) return []
  const vistos = new Set<string>(), out: ItemChecklist[] = []
  for (const c of v.slice(0, 40)) {
    const texto = String((c as any)?.texto ?? '').trim().slice(0, 120), k = sem(texto)
    if (!texto || vistos.has(k)) continue
    vistos.add(k)
    out.push({ id: String((c as any)?.id ?? '').replace(/[^\w-]/g, '').slice(0, 30) || 'c' + out.length + Math.random().toString(36).slice(2, 6), texto, ok: !!(c as any)?.ok })
  }
  return out
}

/** Número único do CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO): confere o dígito verificador (módulo 97). */
export function formataCNJ(v: unknown): string {
  const d = String(v ?? '').replace(/\D/g, '')
  return d.length === 20 ? `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d[13]}.${d.slice(14, 16)}.${d.slice(16)}` : String(v ?? '').trim()
}
export function cnjValido(v: unknown): boolean {
  const d = String(v ?? '').replace(/\D/g, '')
  if (d.length !== 20) return false
  const s = d.slice(0, 7) + d.slice(9) + d.slice(7, 9)
  let r = 0
  for (const ch of s) r = (r * 10 + Number(ch)) % 97
  return r === 1
}

/** Erro de uma ficha (texto para a tela) ou ''. Mesmas regras do banco. */
export function erroInicial(i: Partial<InicialSecretaria>): string {
  if (!String(i.cliente ?? '').trim()) return 'Informe o cliente.'
  if (i.meta_protocolo && i.prazo_fatal && i.meta_protocolo > i.prazo_fatal) return 'A meta de protocolo não pode ser depois do prazo fatal.'
  if (i.etapa === 'protocolada' && !i.protocolo_data) return 'Informe a data do protocolo.'
  if (i.processo_numero && !cnjValido(i.processo_numero)) return 'Número do processo fora do padrão CNJ (0000000-00.0000.0.00.0000). Confira os dígitos.'
  return ''
}

// ─────────── campo "O que você precisa?" ───────────
export type OpInicial = 'consulta' | 'nova' | 'avancar' | 'doc_pendente' | 'doc_recebido'
export interface PropostaInicial {
  op: OpInicial; inicial_id?: InicialSecretaria['id']; cliente?: string; acao?: string; meta?: string; doc?: string; docs?: ItemChecklist[]
  titulo?: string; itens?: { id: InicialSecretaria['id']; texto: string }[]; candidatos?: { id: InicialSecretaria['id']; texto: string }[]; aviso?: string; entendeu: string[]
}
const ehInicialTxt = (t: string) => /\binicia(l|is)\b|\bpeticao\b|\bpeticoes\b/.test(t)
const rotulo = (i: InicialSecretaria) => `${i.cliente}${i.acao ? ' — ' + i.acao : ''}`

/** Procura no texto o cliente de uma inicial (nome inteiro ou primeiro nome). Devolve os candidatos, do mais ao menos específico. */
export function acharInicial(t: string, lista: InicialSecretaria[]): InicialSecretaria[] {
  const inteiros = lista.filter(i => sem(i.cliente).length >= 3 && t.includes(sem(i.cliente)))
  if (inteiros.length) return inteiros
  return lista.filter(i => { const p = sem(i.cliente).split(/\s+/)[0] ?? ''; return p.length >= 3 && new RegExp(`\\b${p}\\b`).test(t) })
}
/**
 * Entende pedidos sobre iniciais. Devolve null quando o texto não fala de inicial (o Início segue com o fluxo normal).
 * Sempre uma PROPOSTA: nada é gravado antes da confirmação.
 */
export function interpretarInicial(texto: string, hoje: string, lista: InicialSecretaria[]): PropostaInicial | null {
  const original = String(texto ?? '').trim().slice(0, 400), t = sem(original)
  const cand = acharInicial(t, lista.filter(emAndamento))
  if (!ehInicialTxt(t)) return null
  const ativas = lista.filter(emAndamento)

  if (/\b(quais|qual|mostre|mostra|liste|lista|ver|tem alguma|ha alguma)\b/.test(t) || (!cand.length && /\b(atrasad|vencen|vence|vencem|pendente|andamento|prazo)/.test(t) && !/\bnova\b|\bcriar\b/.test(t))) {
    const a = ativas.map(i => ({ i, al: alerta(i, hoje) }))
    let sel = a, titulo = 'Iniciais em andamento'
    if (/atrasad/.test(t)) { sel = a.filter(x => x.al?.nivel === 'atrasada'); titulo = 'Iniciais atrasadas' }
    else if (/\b(vencen|vence|vencem|prazo|semana)/.test(t)) { sel = a.filter(x => x.al && x.al.dias != null && x.al.dias <= DIAS_FAIXA); titulo = 'Iniciais com prazo nos próximos 7 dias (e atrasadas)' }
    else if (/\b(documento|doc|pendencia|pendente|falta)/.test(t)) { sel = a.filter(x => checklistPendente(x.i).length); titulo = 'Iniciais com documentos pendentes' }
    return { op: 'consulta', titulo, entendeu: ['Consulta às iniciais'], itens: sel.slice(0, 20).map(x => ({ id: x.i.id, texto: rotulo(x.i) + (x.al?.data ? ` · ${x.al.tipo === 'fatal' ? 'prazo fatal' : 'meta'} ${x.al.data.split('-').reverse().join('/')}` : '') + (checklistPendente(x.i).length ? ` · ${checklistPendente(x.i).length} doc(s) pendente(s)` : '')})) }
  }
  if (/\b(nova|novo|criar|abrir|cadastrar|cadastre|crie|abra)\b/.test(t) && ehInicialTxt(t)) {
    const m = original.match(/\b(?:d[eoa]|para|cliente)\s+([A-ZÀ-Ú][\p{L}'’.-]+(?:\s+(?:d[aeo]s?|e)?\s*[A-ZÀ-Ú][\p{L}'’.-]+){0,4})/u)
    const area = AREAS_INI.find(a => sem(a) !== 'outra' && t.includes(sem(a)))
    const acoes = (area ? ACOES_POR_AREA[area] : Object.values(ACOES_POR_AREA).flat()) || []
    const acao = acoes.find(a => t.includes(sem(a))) || acoes.find(a => { const k = sem(a).split(/\s+/)[0] ?? ''; return k.length > 4 && t.includes(k) })
    const meta = acharData(t, hoje)?.iso
    const entendeu = ['Nova inicial']; if (m) entendeu.push('cliente: ' + m[1]); if (acao) entendeu.push('ação: ' + acao); if (meta) entendeu.push('meta: ' + meta.split('-').reverse().join('/'))
    return { op: 'nova', cliente: m?.[1]?.trim() ?? '', acao: acao ?? '', meta: meta ?? '', entendeu }
  }
  if (!cand.length) return { op: 'consulta', titulo: 'Não achei essa inicial', itens: [], aviso: 'Não encontrei uma inicial em andamento com o nome citado. Confira o nome do cliente.', entendeu: [] }
  const alvos = cand.map(i => ({ id: i.id, texto: rotulo(i) }))
  const base = { inicial_id: cand[0]!.id, candidatos: alvos.length > 1 ? alvos : undefined }
  if (/\bavanc/.test(t)) return { op: 'avancar', ...base, entendeu: ['Avançar a inicial'] }
  if (/\b(recebi|chegou|chegaram|recebido|entregou|juntou)\b/.test(t)) {
    const pend = checklistPendente(cand[0]!)
    const hit = pend.find(c => t.includes(sem(c.texto))) || pend.find(c => sem(c.texto).split(/[\s/()]+/).some(p => p.length >= 3 && new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t)))
    return { op: 'doc_recebido', ...base, doc: hit?.id as string | undefined, docs: pend, entendeu: ['Documento recebido'], aviso: hit ? undefined : 'Escolha qual documento chegou.' }
  }
  if (/\b(falta|faltam|pendente|pedir|cobrar|precisa)\b/.test(t)) {
    let doc = original.replace(/^.*?\b(?:falta|faltam|pendente|pedir|cobrar|precisa(?: de)?)\b[:\s]*/i, '')
    for (const i of cand) doc = doc.replace(new RegExp(i.cliente.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '')
    doc = doc.replace(/\b(?:inicial|peti[cç][aã]o)\b/gi, '').replace(/\b(?:d[aeo]s?|para|do cliente|da cliente)\s*$/i, '').replace(/^[\s:,.-]+|[\s:,.-]+$/g, '').slice(0, 120)
    const premarcado = original.match(/:\s*(?:falta(?:m)?\s+)?(.+)$/)?.[1]?.trim()
    return { op: 'doc_pendente', ...base, doc: doc || premarcado || '', entendeu: ['Documento pendente'] }
  }
  return { op: 'consulta', titulo: rotulo(cand[0]!), itens: [{ id: cand[0]!.id, texto: `${nomeEtapa(cand[0]!.etapa)} · ${checklistPendente(cand[0]!).length} doc(s) pendente(s)` }], aviso: 'Não entendi o que fazer com essa inicial. Tente "avançar", "falta CTPS" ou "recebi o CNIS".', entendeu: [] }
}
