import { CONFIG_PADRAO, type ConfigSecretaria, type SuspensaoExpediente } from '../../shared/data/secretaria'
import { contarPrazo, TRIBUNAIS, type ContextoPrazo } from '../../shared/utils/calendarioForense'
import type { InicioSecretaria, ItemAgenda, LembreteRapido } from '../../shared/data/secretaria'
import { hojeBR } from './crm'

const erro = (statusCode: number, message: string) => createError({ statusCode, message })
export const ehData = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v + 'T00:00:00Z').getTime())
export const ehHora = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)

export async function lerConfig(client: any): Promise<ConfigSecretaria> {
  const { data } = await client.from('secretaria_config').select('tribunal, pontos_facultativos, cidade, atalhos').maybeSingle()
  if (!data) return { ...CONFIG_PADRAO, atalhos: CONFIG_PADRAO.atalhos.map(a => ({ ...a })) }
  return { tribunal: data.tribunal, pontos_facultativos: !!data.pontos_facultativos, cidade: data.cidade || 'Salvador', atalhos: Array.isArray(data.atalhos) && data.atalhos.length ? data.atalhos : CONFIG_PADRAO.atalhos }
}
export async function lerSuspensoes(client: any): Promise<SuspensaoExpediente[]> {
  const { data } = await client.from('suspensoes_expediente').select('id, de, ate, tribunal, motivo').order('de').limit(300)
  return (data ?? []) as SuspensaoExpediente[]
}
export function contextoPrazo(cfg: ConfigSecretaria, susp: SuspensaoExpediente[]): ContextoPrazo {
  return { trib: cfg.tribunal, ssa: /salvador/i.test(cfg.cidade), fac: cfg.pontos_facultativos, susp: susp.map(s => ({ de: s.de, ate: s.ate, trib: s.tribunal, motivo: s.motivo })) }
}

/** Atalhos vindos do cliente: só http(s), tamanho limitado, sem ids repetidos. */
export function limparAtalhos(v: unknown) {
  if (!Array.isArray(v)) throw erro(400, 'Atalhos inválidos.')
  const vistos = new Set<string>()
  return v.slice(0, 24).map((a: any, i) => {
    const nome = String(a?.nome ?? '').trim().slice(0, 40) || 'Atalho'
    let url = String(a?.url ?? '').trim().slice(0, 300)
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url
    if (url) { try { const u = new URL(url); if (!['http:', 'https:'].includes(u.protocol)) url = '' } catch { url = '' } }
    let id = String(a?.id ?? '').replace(/[^\w-]/g, '').slice(0, 30) || 'a' + i
    while (vistos.has(id)) id += 'x'
    vistos.add(id)
    return { id, nome, url }
  })
}

const COLS_ITEM = 'id, user_id, tipo, titulo, dia, hora, local, cliente, obs'
const paraItem = (c: any, userId: string): ItemAgenda => ({ id: c.id, tipo: c.tipo, titulo: c.titulo, dia: c.dia, hora: c.hora ? String(c.hora).slice(0, 5) : null, local: c.local ?? null, cliente: c.cliente ?? null, obs: c.obs ?? null, meu: c.user_id === userId })

/**
 * Tudo que o Início mostra: agenda própria dos próximos 14 dias, prazos vencidos ainda abertos (nunca somem da vista),
 * lembretes da usuária, suspensões e configuração.
 */
export async function montarInicio(client: any, userId: string): Promise<InicioSecretaria> {
  const hoje = hojeBR(), fim = hojeBR(14)
  const [config, suspensoes, lem, proximos, vencidos] = await Promise.all([
    lerConfig(client), lerSuspensoes(client),
    client.from('lembretes_rapidos').select('id, texto, data, hora, feito, feito_em, item_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(300),
    client.from('secretaria_itens').select(COLS_ITEM).eq('feito', false).gte('dia', hoje).lte('dia', fim).limit(500),
    client.from('secretaria_itens').select(COLS_ITEM).eq('feito', false).eq('tipo', 'prazo').gte('dia', hojeBR(-60)).lt('dia', hoje).limit(100),
  ])
  for (const r of [lem, proximos, vencidos]) if (r.error) console.error('[secretaria/inicio]', r.error)
  const eventos = [...(vencidos.data ?? []), ...(proximos.data ?? [])].map((c: any) => paraItem(c, userId))
    .sort((a, b) => a.dia.localeCompare(b.dia) || (a.hora ?? '').localeCompare(b.hora ?? '') || a.titulo.localeCompare(b.titulo))
  return {
    hoje, config, suspensoes, eventos,
    lembretes: ((lem.data ?? []) as any[]).map((l): LembreteRapido => ({ id: l.id, texto: l.texto, data: l.data, hora: l.hora ? String(l.hora).slice(0, 5) : null, feito: l.feito, feito_em: l.feito_em, item_id: l.item_id })),
  }
}

/**
 * Cria o que a pessoa confirmou em "O que você precisa?": prazo (vencimento calculado AQUI, com tribunal e suspensões anotadas),
 * audiência, consulta, compromisso, tarefa ou lembrete. O cliente nunca define o vencimento.
 */
export async function criarItem(client: any, userId: string, b: Record<string, any>): Promise<{ tipo: string; id: number; vencimento?: string }> {
  let tipo = String(b.tipo ?? '')
  if (tipo === 'reuniao') tipo = 'compromisso'
  const titulo = String(b.titulo ?? '').trim().slice(0, 200)
  if (!titulo) throw erro(400, 'Dê um título.')
  const data = b.data || null, hora = b.hora || null
  if (data && !ehData(data)) throw erro(400, 'Data inválida.')
  if (hora && !ehHora(hora)) throw erro(400, 'Hora inválida.')
  const local = b.local ? String(b.local).trim().slice(0, 200) : null
  const cliente = b.cliente ? String(b.cliente).trim().slice(0, 120) : null
  const falha = (e: any, m: string) => { console.error('[secretaria/criar]', e); return erro(500, m) }

  if (tipo === 'prazo') {
    const dias = Number(b.dias), inicio = b.inicio || hojeBR()
    if (!Number.isInteger(dias) || dias < 1 || dias > 365) throw erro(400, 'Informe os dias do prazo (1 a 365).')
    if (!ehData(inicio)) throw erro(400, 'Data da intimação inválida.')
    const cfg = await lerConfig(client), susp = await lerSuspensoes(client)
    const r = contarPrazo(inicio, dias, contextoPrazo(cfg, susp))
    const obs = `Prazo de ${dias} dias úteis a partir de ${inicio.split('-').reverse().join('/')} (${TRIBUNAIS[cfg.tribunal]}). Calculado na Secretária: confirme no sistema do tribunal.`
    const { data: c, error } = await client.from('secretaria_itens').insert({ user_id: userId, tipo: 'prazo', titulo, dia: r.vencimento, cliente, obs, dias_prazo: dias, data_intimacao: inicio, tribunal: cfg.tribunal }).select('id').single()
    if (error) throw falha(error, 'Não foi possível criar o prazo.')
    return { tipo, id: c.id, vencimento: r.vencimento }
  }
  if (tipo === 'audiencia' || tipo === 'consulta' || tipo === 'compromisso' || tipo === 'tarefa') {
    const dia = data || (tipo === 'tarefa' ? hojeBR() : null)
    if (!dia) throw erro(400, 'Informe a data.')
    const { data: c, error } = await client.from('secretaria_itens').insert({ user_id: userId, tipo, titulo, dia, hora, local, cliente }).select('id').single()
    if (error) throw falha(error, 'Não foi possível criar o item.')
    return { tipo, id: c.id }
  }
  if (tipo === 'lembrete') {
    const { data: l, error } = await client.from('lembretes_rapidos').insert({ user_id: userId, texto: titulo.slice(0, 300), data, hora }).select('id').single()
    if (error) throw falha(error, 'Não foi possível criar o lembrete.')
    return { tipo, id: l.id }
  }
  throw erro(400, 'Tipo inválido.')
}
