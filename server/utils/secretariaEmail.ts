import { avisoDoTribunal, ehJus, primeiraLinha, type AvisoTribunal } from '../../shared/utils/avisosTribunal'
import { contarPrazo, TRIBUNAIS } from '../../shared/utils/calendarioForense'
import type { AvisoItem, CaixaSub, MailItem } from '../../shared/data/secretaria'
import type { Api } from './google'
import { contextoPrazo, ehData, lerConfig, lerSuspensoes } from './secretaria'

const erro = (statusCode: number, message: string, data?: unknown) => createError({ statusCode, message, data })

async function emLotes<T, R>(lista: T[], n: number, fn: (x: T) => Promise<R>): Promise<(R | undefined)[]> {
  const res: (R | undefined)[] = new Array(lista.length); let i = 0
  await Promise.all(Array.from({ length: Math.min(n, lista.length) }, async () => {
    while (i < lista.length) { const k = i++; try { res[k] = await fn(lista[k]!) } catch (e) { console.error('[google] falha em um e-mail:', (e as any)?.message); res[k] = undefined } }
  }))
  return res
}
async function lerCache(admin: any, userId: string, ids: string[]): Promise<Map<string, { versao: string; dados: any }>> {
  const m = new Map<string, { versao: string; dados: any }>()
  if (!ids.length) return m
  const { data } = await admin.from('google_avisos_cache').select('thread_id, versao, dados').eq('user_id', userId).in('thread_id', ids)
  for (const r of (data ?? []) as any[]) m.set(r.thread_id, { versao: r.versao, dados: r.dados })
  return m
}
const gravaCache = (admin: any, userId: string, thread_id: string, versao: string, dados: unknown) => admin.from('google_avisos_cache').upsert({ user_id: userId, thread_id, versao, dados, atualizado_em: new Date().toISOString() }, { onConflict: 'user_id,thread_id' })
export const LIMITE_NOVOS = 40

/**
 * Avisos dos tribunais dos últimos 14 dias (remetentes @jus.br; alertas de login/senha ficam de fora).
 * O corpo de cada e-mail só é lido quando o e-mail é novo ou mudou (historyId); o resto vem do cache.
 */
export async function intimacoesDoGmail(api: Api, admin: any, userId: string): Promise<AvisoItem[]> {
  const base = 'from:jus.br newer_than:14d'
  const [threads, naoLidas] = await Promise.all([api.listarThreads(base, 100), api.listarThreads(base + ' is:unread', 100)])
  const lidas = new Set(naoLidas.map(t => t.id))
  const cache = await lerCache(admin, userId, threads.map(t => t.id))
  const novos = threads.filter(t => cache.get(t.id)?.versao !== t.historyId).slice(0, LIMITE_NOVOS)
  await emLotes(novos, 5, async (t) => {
    const ms = (await api.threadCompleto(t.id)).filter(m => ehJus(m.sender))
    const m = ms[ms.length - 1]
    const aviso = m ? avisoDoTribunal(m, m.plaintextBody) : null
    await gravaCache(admin, userId, t.id, t.historyId, aviso)
    cache.set(t.id, { versao: t.historyId, dados: aviso })
  })
  const itens: AvisoItem[] = []
  for (const t of threads) {
    const a = cache.get(t.id)?.dados as AvisoTribunal | null | undefined
    if (a) itens.push({ ...a, id: t.id, naoLida: lidas.has(t.id) })
  }
  return itens.sort((x, y) => String(y.quando).localeCompare(String(x.quando)))
}

const QUERIES: Record<CaixaSub, { q: string; naoLidos: string }> = {
  principal: { q: 'in:inbox category:primary newer_than:7d', naoLidos: 'in:inbox is:unread newer_than:7d' },
  naolidos: { q: 'is:unread newer_than:14d', naoLidos: 'is:unread newer_than:14d' },
  tudo: { q: 'in:inbox newer_than:3d', naoLidos: 'in:inbox is:unread newer_than:3d' },
}
/** Caixa de entrada nas três janelas do pedido: Principal (7 dias), Não lidos (14 dias) e Tudo (3 dias). */
export async function caixaDeEmail(api: Api, admin: any, userId: string, sub: CaixaSub): Promise<MailItem[]> {
  const Q = QUERIES[sub]
  const [threads, naoLidas] = await Promise.all([api.listarThreads(Q.q, 40), sub === 'naolidos' ? Promise.resolve(null) : api.listarThreads(Q.naoLidos, 100)])
  const lidas = naoLidas ? new Set(naoLidas.map(t => t.id)) : null
  const chaves = threads.map(t => 'm:' + t.id)
  const cache = await lerCache(admin, userId, chaves)
  const precisam = threads.filter(t => cache.get('m:' + t.id)?.versao !== t.historyId)
  await emLotes(precisam, 5, async (t) => {
    const ms = await api.threadMeta(t.id), m = ms[ms.length - 1] ?? {}
    const d = { de: m.sender ?? '', assunto: primeiraLinha(m.subject) || '(sem assunto)', previa: primeiraLinha(m.snippet), quando: m.date ?? '', link: m.viewUrl ?? '' }
    await gravaCache(admin, userId, 'm:' + t.id, t.historyId, d)
    cache.set('m:' + t.id, { versao: t.historyId, dados: d })
  })
  const out: MailItem[] = []
  for (const t of threads) {
    const d = cache.get('m:' + t.id)?.dados
    if (d) out.push({ id: t.id, de: d.de, assunto: d.assunto, previa: d.previa || t.snippet, quando: d.quando, link: d.link, naoLida: lidas ? lidas.has(t.id) : true })
  }
  return out.sort((x, y) => String(y.quando).localeCompare(String(x.quando)))
}

export interface PedidoPrazo { dias?: unknown; modo?: unknown; ciencia?: unknown; tribunal?: unknown }
/**
 * "Lançar prazo" de uma intimação: calcula o vencimento no servidor, cria o evento no Google Agenda (avisos 3 dias e 1 dia antes),
 * o prazo na agenda da Secretária e o lembrete, e marca o e-mail como "Prazo lançado". O evento vem primeiro: se falhar, nada é marcado.
 */
export async function lancarPrazoAviso(api: Api, admin: any, client: any, userId: string, threadId: string, b: PedidoPrazo) {
  const dias = Number(b.dias), modo = b.modo === 'corridos' ? 'corridos' : b.modo === 'uteis' ? 'uteis' : null
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) throw erro(400, 'Informe os dias do prazo (1 a 365).')
  if (!modo) throw erro(400, 'Escolha dias úteis ou corridos.')
  if (!ehData(b.ciencia)) throw erro(400, 'Informe a data da ciência.')
  if (typeof b.tribunal !== 'string' || !(b.tribunal in TRIBUNAIS)) throw erro(400, 'Escolha o calendário do tribunal.')
  const { data: ja } = await client.from('avisos_prazos').select('thread_id').eq('thread_id', threadId).eq('user_id', userId).maybeSingle()
  if (ja) throw erro(409, 'O prazo deste aviso já foi lançado.')
  const cache = await lerCache(admin, userId, [threadId])
  const aviso = cache.get(threadId)?.dados as AvisoTribunal | null | undefined
  if (!aviso) throw erro(404, 'Não encontrei esse aviso. Atualize a lista.')
  const cfg = await lerConfig(client), susp = await lerSuspensoes(client)
  const r = contarPrazo(b.ciencia, dias, { ...contextoPrazo(cfg, susp), trib: b.tribunal }, modo)
  const base = ((aviso.cnj ? aviso.cnj + ' — ' : '') + (aviso.movimentacao || 'intimação')).slice(0, 150)
  const fmt = (iso: string) => iso.split('-').reverse().join('/')
  const descricao = `Prazo de ${dias} ${modo === 'corridos' ? 'dias corridos' : 'dias úteis'} a partir da ciência em ${fmt(b.ciencia)} (${TRIBUNAIS[b.tribunal]}). Tribunal: ${aviso.tribunal}. E-mail: ${aviso.link || '—'}\nCalculado pela Secretária do CRM: confirme no sistema do tribunal.`
  const evento = await api.criarEvento({ titulo: 'PRAZO FATAL — ' + base, dia: r.vencimento, descricao, avisos: [4320, 1440] })
  try {
    const { data: item, error: e1 } = await client.from('secretaria_itens').insert({ user_id: userId, tipo: 'prazo', titulo: base.slice(0, 200), dia: r.vencimento, obs: descricao.slice(0, 1000), dias_prazo: dias, data_intimacao: b.ciencia, tribunal: b.tribunal }).select('id').single()
    if (e1 || !item) throw e1 ?? new Error('item')
    const { data: lem, error: e2 } = await client.from('lembretes_rapidos').insert({ user_id: userId, texto: ('Prazo: ' + base).slice(0, 300), data: r.vencimento, item_id: item.id }).select('id').single()
    if (e2 || !lem) throw e2 ?? new Error('lembrete')
    const { error: e3 } = await client.from('avisos_prazos').insert({ user_id: userId, thread_id: threadId, prazo: r.vencimento, dias, modo, ciencia: b.ciencia, tribunal: b.tribunal, item_id: item.id, lembrete_id: lem.id, evento_id: evento.id, evento_link: evento.link })
    if (e3) throw e3
    return { vence: r.vencimento, evento_link: evento.link, item_id: item.id as number }
  } catch (e) {
    console.error('[secretaria/prazo] evento criado, mas falhou gravar:', (e as any)?.message)
    throw erro(500, `O evento foi criado no Google Agenda (vence ${fmt(r.vencimento)}), mas não consegui gravar a marcação aqui. Não lance de novo: já está no Google Agenda.`)
  }
}
