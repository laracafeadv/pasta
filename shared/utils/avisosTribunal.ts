/**
 * Leitura dos avisos dos tribunais que chegam por e-mail (remetentes @jus.br: eproc, PJe Push, nomeações).
 * Funções puras: recebem a mensagem já no formato simples abaixo (vinda da API do Gmail) e devolvem o aviso, ou null
 * quando não é aviso de tribunal (remetente fora de @jus.br, alerta de login/senha/acesso).
 */
export interface MensagemSimples { sender?: string; subject?: string; snippet?: string; date?: string; labelIds?: string[]; viewUrl?: string }
export interface AvisoTribunal {
  tribunal: string; chave: 'tjba' | 'trt5' | 'jf' | 'nac'; cnj: string; movimentacao: string; dataMov: string; dataEmail: string
  intimacao: boolean; quando: string; link: string
}
export const CNJ_RE = /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/
const ALERTA_RE = /senha|novo acesso|acesso (?:a|à|ao) |login|c[oó]digo de (?:verifica|acesso|seguran)|redefin|autentica|\btoken\b|confirm[ea] (?:seu|o seu) (?:e-?mail|cadastro)|verifica[cç][aã]o em (?:duas|2)/i
const INTIMACAO_RE = /intima|prazo|cita[cç][aã]o|notifica|decis[aã]o|despacho|senten[cç]a|audi[eê]ncia|publica[cç][aã]o|manifest|vista |mandado|edital|nomea|designa/i
export const ehJus = (email?: string) => /@([\w-]+\.)*jus\.br$/i.test(String(email ?? '').trim())
export const primeiraLinha = (t?: string) => String(t ?? '').replace(/\s+/g, ' ').trim()

export function tribunalDoRemetente(email?: string): { sigla: string; chave: AvisoTribunal['chave'] } {
  const dom = (String(email ?? '').split('@')[1] ?? '').toLowerCase()
  if (/(^|\.)tjba\.jus\.br$/.test(dom)) return { sigla: 'TJBA', chave: 'tjba' }
  if (/(^|\.)trt5\.jus\.br$/.test(dom)) return { sigla: 'TRT5', chave: 'trt5' }
  if (/(^|\.)(trf1|jfba)\.jus\.br$/.test(dom)) return { sigla: 'Justiça Federal', chave: 'jf' }
  const lab = dom.replace(/\.jus\.br$/, '').split('.').pop() || dom
  return { sigla: lab.toUpperCase(), chave: 'nac' }
}

/** Linhas "dd/mm/aaaa hh:mm - movimento" (tabela do PJe Push) → [{data:'aaaa-mm-dd', hora, texto}] */
export function extrairMovimentos(texto?: string) {
  const out: { data: string; hora: string; texto: string }[] = []
  for (const l of String(texto ?? '').split('\n')) {
    const m = l.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}:\d{2}))?\s+-\s+(.+?)\s*\|?\s*$/)
    if (m) out.push({ data: `${m[3]}-${m[2]}-${m[1]}`, hora: m[4] ?? '', texto: (m[5] ?? '').replace(/^\|\s*/, '').trim() })
  }
  return out
}

export function avisoDoTribunal(msg: MensagemSimples, corpo = ''): AvisoTribunal | null {
  if (!msg || !ehJus(msg.sender)) return null
  const assunto = primeiraLinha(msg.subject), previa = primeiraLinha(msg.snippet)
  if (ALERTA_RE.test(assunto) || ALERTA_RE.test(previa)) return null
  const cnj = (assunto.match(CNJ_RE) ?? corpo.match(CNJ_RE) ?? previa.match(CNJ_RE) ?? [''])[0]
  const movs = extrairMovimentos(corpo)
  const mov = movs[0] ?? null
  const t = tribunalDoRemetente(msg.sender)
  const movimentacao = mov ? mov.texto : (assunto.replace(CNJ_RE, '').replace(/\s{2,}/g, ' ').trim() || previa.slice(0, 120))
  const tudo = `${assunto} ${movimentacao} ${movs.map(x => x.texto).join(' ')}`.replace(/conclusos? para (?:decis[aã]o|despacho|senten[cç]a)/gi, '')
  return { tribunal: t.sigla, chave: t.chave, cnj, movimentacao: movimentacao.slice(0, 300), dataMov: mov?.data ?? '', dataEmail: String(msg.date ?? '').slice(0, 10), intimacao: INTIMACAO_RE.test(tudo), quando: msg.date ?? '', link: msg.viewUrl ?? '' }
}
