// Regras do formulário público (puras): visibilidade condicional + validação/normalização por tipo. Mesma lógica do construtor do CRM.
export type Valor = string | string[] | Record<string, string> | null
export interface Regra { pergunta_id: number | string; operador: string; valor?: string | null }
export interface Condicao { juntar: 'e' | 'ou'; regras: Regra[] }
export interface Pergunta { pergunta_id: number | string; texto: string; tipo: string; opcoes?: string[]; ajuda?: string | null; obrigatoria?: boolean; mostrar_se?: Condicao | null }
export interface Secao { titulo?: string; descricao?: string | null; mostrar_se?: Condicao | null; itens: Pergunta[] }
export class ErroForm extends Error { status: number; constructor(msg: string, status = 400) { super(msg); this.status = status } }

const semAcento = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const num = (v: unknown) => Number(String(v).trim().replace(/\./g, '').replace(',', '.'))
export const vazio = (v: unknown): boolean => v == null || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && !Object.values(v as object).some(Boolean))

function avaliarRegra(r: Regra, v: Valor | undefined): boolean {
  const alvo = String(r.valor ?? '')
  switch (r.operador) {
    case 'preenchida': return !vazio(v)
    case 'vazia': return vazio(v)
    case 'igual': { if (Array.isArray(v)) return v.includes(alvo); if (vazio(v)) return false; const t = String(v).trim(); if (/^-?[\d.,]+$/.test(t) && /^-?[\d.,]+$/.test(alvo.trim())) return num(t) === num(alvo); return semAcento(t) === semAcento(alvo.trim()) }
    case 'diferente': return !avaliarRegra({ ...r, operador: 'igual' }, v)
    case 'contem': return Array.isArray(v) ? v.includes(alvo) : (!vazio(v) && semAcento(String(v)).includes(semAcento(alvo)))
    case 'nao_contem': return !avaliarRegra({ ...r, operador: 'contem' }, v)
    case 'maior': return !vazio(v) && Number.isFinite(num(v)) && num(v) > num(alvo)
    case 'menor': return !vazio(v) && Number.isFinite(num(v)) && num(v) < num(alvo)
    default: return true
  }
}
const avaliarCondicao = (c: Condicao | null | undefined, resp: Record<string, Valor | undefined>) => { if (!c || !c.regras?.length) return true; const r = c.regras.map(x => avaliarRegra(x, resp[String(x.pergunta_id)])); return c.juntar === 'ou' ? r.some(Boolean) : r.every(Boolean) }

/** Percorre na ordem; a resposta de uma pergunta escondida não conta para as condições das seguintes. */
export function visibilidade(secoes: Secao[], respostas: Record<string, Valor | undefined>) {
  const efetivas: Record<string, Valor | undefined> = {}; const secs = new Set<number>(); const perguntas = new Set<string>()
  secoes.forEach((s, si) => { const ok = avaliarCondicao(s.mostrar_se, efetivas); if (ok) secs.add(si); for (const p of s.itens) if (ok && avaliarCondicao(p.mostrar_se, efetivas)) { perguntas.add(String(p.pergunta_id)); efetivas[String(p.pergunta_id)] = respostas[String(p.pergunta_id)] } })
  return { secs, perguntas }
}

const cpfOk = (d: string) => { if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false; for (const n of [9, 10]) { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const dv = (s * 10) % 11 % 10; if (dv !== Number(d[n])) return false } return true }
const cnpjOk = (d: string) => { if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false; const dv = (n: number) => { let s = 0, p = n - 7; for (let i = 0; i < n; i++) { s += Number(d[i]) * p--; if (p < 2) p = 9 } const r = s % 11; return r < 2 ? 0 : 11 - r }; return dv(12) === Number(d[12]) && dv(13) === Number(d[13]) }
const UFS = new Set(['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'])
export const TIPOS_SUPORTADOS = new Set(['texto_curto', 'texto_longo', 'numero', 'data', 'horario', 'email', 'telefone', 'cpf_cnpj', 'endereco', 'sim_nao', 'selecao_unica', 'lista_suspensa', 'selecao_multipla', 'assinatura'])

/** Normaliza e valida UMA resposta pelo tipo. Devolve null quando vazia. Lança ErroForm com mensagem em português. */
export function normalizar(p: Pergunta, v: unknown): Valor {
  const op = p.opcoes ?? []; const t = (x: unknown, max: number) => (typeof x === 'string' ? x.trim().slice(0, max) : '') || null
  if (p.tipo === 'selecao_multipla') { const l = Array.isArray(v) ? v.map(x => String(x).trim()) : []; const ok = op.filter(o => l.includes(o)); return ok.length ? ok : null }
  if (p.tipo === 'endereco') { const o = v && typeof v === 'object' ? v as Record<string, unknown> : {}; const e: Record<string, string> = {}; for (const k of ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf']) { const s = t(o[k], 120); if (s) e[k] = s }
    if (!Object.keys(e).length) return null; if (e.cep && e.cep.replace(/\D/g, '').length !== 8) throw new ErroForm(`“${p.texto}”: CEP deve ter 8 dígitos.`); if (e.uf && !UFS.has(e.uf)) throw new ErroForm(`“${p.texto}”: UF inválida.`); if (!e.logradouro || !e.cidade || !e.uf) throw new ErroForm(`“${p.texto}”: informe pelo menos rua, cidade e UF.`); return e }
  if (p.tipo === 'assinatura') { const s = typeof v === 'string' ? v : ''; if (!s) return null; if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(s) || s.length > 300_000) throw new ErroForm(`“${p.texto}”: assinatura inválida.`); return s }
  const s = t(Array.isArray(v) ? v[0] : v, p.tipo === 'texto_longo' ? 4000 : 500); if (s == null) return null
  switch (p.tipo) {
    case 'selecao_unica': case 'lista_suspensa': if (!op.includes(s)) throw new ErroForm(`“${p.texto}”: opção inválida.`); return s
    case 'sim_nao': if (s !== 'Sim' && s !== 'Não') throw new ErroForm(`“${p.texto}”: responda Sim ou Não.`); return s
    case 'numero': if (!Number.isFinite(Number(s.replace(',', '.')))) throw new ErroForm(`“${p.texto}”: informe um número.`); return s
    case 'data': if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(Date.parse(s))) throw new ErroForm(`“${p.texto}”: data inválida.`); return s
    case 'horario': if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) throw new ErroForm(`“${p.texto}”: horário inválido.`); return s
    case 'email': if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new ErroForm(`“${p.texto}”: e-mail inválido.`); return s
    case 'telefone': if (s.replace(/\D/g, '').length < 10) throw new ErroForm(`“${p.texto}”: telefone incompleto (com DDD).`); return s
    case 'cpf_cnpj': { const d = s.replace(/\D/g, ''); if (!(d.length === 11 ? cpfOk(d) : d.length === 14 ? cnpjOk(d) : false)) throw new ErroForm(`“${p.texto}”: CPF/CNPJ inválido.`); return s }
    default: return s
  }
}

export interface Linha { pergunta_ref: string; ordem: number; pergunta_texto: string; pergunta_tipo: string; pergunta_opcoes: string[]; secao_titulo: string; resposta: Valor }
export function validar(secoes: Secao[], brutas: Record<string, unknown>): Linha[] {
  const norm: Record<string, Valor> = {}
  for (const s of secoes) for (const p of s.itens) { if (!TIPOS_SUPORTADOS.has(p.tipo)) continue; norm[String(p.pergunta_id)] = normalizar(p, brutas?.[String(p.pergunta_id)]) }
  const vis = visibilidade(secoes, norm); const linhas: Linha[] = []; let ordem = 0
  secoes.forEach((s, si) => { for (const p of s.itens) {
    if (!TIPOS_SUPORTADOS.has(p.tipo) || !vis.secs.has(si) || !vis.perguntas.has(String(p.pergunta_id))) continue
    const r = norm[String(p.pergunta_id)] ?? null
    if (p.obrigatoria && vazio(r)) throw new ErroForm(`A pergunta “${p.texto}” é obrigatória.`)
    linhas.push({ pergunta_ref: String(p.pergunta_id), ordem: ordem++, pergunta_texto: p.texto, pergunta_tipo: p.tipo, pergunta_opcoes: p.opcoes ?? [], secao_titulo: s.titulo ?? '', resposta: r })
  } })
  return linhas
}
