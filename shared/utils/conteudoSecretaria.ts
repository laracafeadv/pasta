import { addDays } from './calendarioForense'

/**
 * Regras puras das abas Notícias e Conteúdo: janela de 10 dias, agrupamento por dia, links seguros e a revisão do Provimento 205/2021 da OAB
 * (sem captação de clientela, sem promessa de resultado, sem valores). A revisão é um ALERTA para a advogada decidir — não reescreve nada.
 */
export const DIAS_NOTICIAS = 10
export const AREAS_NOTICIA = ['Família', 'Sucessões', 'Tribunais superiores', 'TRT5', 'TJBA', 'INSS', 'OAB/BA'] as const
export interface Noticia { id: string; titulo: string; resumo: string; fonte: string; link: string; area: string; publicadaEm?: string | null; dia: string; coletadoEm?: string }

export function linkSeguro(url: unknown): string {
  try { const u = new URL(String(url ?? '').trim()); return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '' } catch { return '' }
}
const semAcento = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Notícias dentro da janela (padrão 10 dias contados pelo dia da coleta), sem repetir o mesmo link, só com link seguro e título. */
export function noticiasValidas(lista: Noticia[], hoje: string, dias = DIAS_NOTICIAS): Noticia[] {
  const corte = addDays(hoje, -dias), vistos = new Set<string>(), out: Noticia[] = []
  for (const n of [...lista].sort((a, b) => String(b.coletadoEm || b.dia).localeCompare(String(a.coletadoEm || a.dia)))) {
    const link = linkSeguro(n.link)
    if (!n || !String(n.titulo ?? '').trim() || !link || !/^\d{4}-\d{2}-\d{2}$/.test(n.dia || '') || n.dia < corte || n.dia > hoje) continue
    if (vistos.has(link)) continue
    vistos.add(link); out.push({ ...n, link })
  }
  return out
}
/** Ids que a tarefa diária deve apagar: mais velhas que a janela (ou sem dia válido). */
export const idsParaApagar = (lista: Noticia[], hoje: string, dias = DIAS_NOTICIAS) => lista.filter(n => !/^\d{4}-\d{2}-\d{2}$/.test(n.dia || '') || n.dia < addDays(hoje, -dias)).map(n => n.id)

export function agruparNoticias(lista: Noticia[], hoje: string, area = ''): { dia: string; rotulo: string; itens: Noticia[] }[] {
  const por = new Map<string, Noticia[]>()
  for (const n of noticiasValidas(lista, hoje)) { if (area && n.area !== area) continue; (por.get(n.dia) ?? por.set(n.dia, []).get(n.dia)!).push(n) }
  return [...por.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([dia, itens]) => ({ dia, rotulo: dia === hoje ? 'Hoje' : dia === addDays(hoje, -1) ? 'Ontem' : '', itens }))
}
export const areasPresentes = (lista: Noticia[], hoje: string) => [...new Set(noticiasValidas(lista, hoje).map(n => n.area))].sort()

export interface AlertaProvimento { regra: string; trecho: string }
const REGRAS: [string, RegExp][] = [
  ['Valores e preços não devem constar (Provimento 205/2021)', /r\$\s*\d|\b\d+\s*reais\b|\b\d+\s*(?:mil|k)\s*reais\b|\bpor\s+apenas\b|\bparcel(?:a|e|amos)\b|\bhonorarios?\s+(?:de|a partir)\b|\bpreco\b|\bvalor(?:es)? (?:da|de) consulta\b/],
  ['Gratuidade e descontos configuram captação', /\bgratis\b|\bgratuit[oa]s?\b|\bsem custo\b|\bdesconto\b|\bpromocao\b|\boferta\b|\bbrinde\b|\bsorteio\b/],
  ['Promessa ou garantia de resultado', /\bgarant(?:id[oa]s?|imos|e|ia)\b|\b100\s*%|\bcausa ganha\b|\bsucesso (?:certo|garantido)\b|\bvitoria (?:certa|garantida)\b|\bresultado (?:certo|garantido)\b|\bnao tem erro\b|\bvoce (?:vai|ira) ganhar\b|\bganhe\b/],
  ['Chamada para contratar ou captar clientela', /\bcontrate\b|\bcontratem\b|\bagende (?:sua|uma|a) (?:consulta|conversa)\b|\bfale comigo\b|\bchame no (?:direct|whats)|\bme chame\b|\bentre em contato\b|\bpreencha o formulario\b|\bsaiba como contratar\b/],
  ['Sensacionalismo ou mercantilização', /\burgente\b|\bultim[ao]s? vagas?\b|\baproveite\b|\bnao perca\b|\bso hoje\b|\bunico escritorio\b|\bmelhor advogad[oa]\b|\bnumero 1\b/],
]
/** Revisa um texto de conteúdo e devolve o que merece olhar antes de publicar (vazio = nada encontrado, o que NÃO substitui a leitura dela). */
export function revisarProvimento205(texto: unknown): AlertaProvimento[] {
  const t = semAcento(texto), out: AlertaProvimento[] = [], vistos = new Set<string>()
  for (const [regra, re] of REGRAS) {
    const m = re.exec(t); if (!m) continue
    const trecho = String(texto ?? '').slice(m.index, m.index + m[0].length) || m[0]
    if (!vistos.has(regra)) { vistos.add(regra); out.push({ regra, trecho }) }
  }
  return out
}
export interface IdeiaPost { titulo: string; formato: string; gancho: string; roteiro: string }
/** Ideias vindas da IA: só texto, tamanhos limitados, no máximo 20. */
export function limparIdeias(v: unknown): IdeiaPost[] {
  if (!Array.isArray(v)) return []
  const s = (x: unknown, n: number) => String(x ?? '').replace(/\s+\n/g, '\n').trim().slice(0, n)
  return v.slice(0, 20).map((i: any) => ({ titulo: s(i?.titulo, 140), formato: s(i?.formato, 60), gancho: s(i?.gancho, 400), roteiro: s(i?.roteiro, 3000) })).filter(i => i.titulo || i.gancho || i.roteiro)
}
/** Assunto do e-mail → consulta de Gmail (aspas e operadores neutralizados). */
export const consultaAssunto = (assunto: string) => { const a = String(assunto ?? '').replace(/["\\(){}]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120); return a ? `subject:(${a})` : '' }
