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

const TZ = 'America/Sao_Paulo'
const diaDe = (ts: string) => new Date(ts).toLocaleDateString('sv-SE', { timeZone: TZ })
const horaDe = (ts: string) => new Date(ts).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })

/** Tudo que o Início mostra: agenda de 14 dias (compromissos + tarefas), lembretes da usuária, suspensões, configuração e números novos. */
export async function montarInicio(client: any, userId: string): Promise<InicioSecretaria> {
  const hoje = hojeBR(), fim = hojeBR(14), limite = hojeBR(15)
  const colunas = 'id, tipo, titulo, inicio, data_limite, local, responsavel_id, contato:contatos(nome)'
  const [config, suspensoes, lem, comDia, comHora, tar, intim, leads] = await Promise.all([
    lerConfig(client), lerSuspensoes(client),
    client.from('lembretes_rapidos').select('id, texto, data, hora, feito, feito_em, compromisso_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(300),
    client.from('compromissos').select(colunas).eq('status', 'pendente').gte('data_limite', hoje).lte('data_limite', fim).limit(400),
    client.from('compromissos').select(colunas).eq('status', 'pendente').is('data_limite', null).gte('inicio', `${hoje}T00:00:00-03:00`).lt('inicio', `${limite}T00:00:00-03:00`).limit(400),
    client.from('tarefas_internas').select('id, titulo, prazo, contato:contatos(nome)').eq('concluida', false).gte('prazo', hoje).lte('prazo', fim).limit(300),
    client.from('intimacoes').select('id', { count: 'exact', head: true }).eq('status', 'a_tratar'),
    client.from('contatos').select('id', { count: 'exact', head: true }).eq('etapa', 'novo'),
  ])
  for (const r of [lem, comDia, comHora, tar]) if (r.error) console.error('[secretaria/inicio]', r.error)
  const eventos: ItemAgenda[] = []
  const vistos = new Set<number>()
  for (const c of [...(comDia.data ?? []), ...(comHora.data ?? [])] as any[]) {
    if (vistos.has(c.id)) continue
    vistos.add(c.id)
    const dia = c.data_limite || (c.inicio ? diaDe(c.inicio) : '')
    if (!dia) continue
    eventos.push({ k: 'c' + c.id, origem: 'compromisso', id: c.id, tipo: c.tipo === 'reuniao' ? 'compromisso' : c.tipo, titulo: c.titulo, dia, hora: c.inicio ? horaDe(c.inicio) : null, contato: c.contato?.nome ?? null, local: c.local ?? null, meu: !c.responsavel_id || c.responsavel_id === userId })
  }
  for (const t of (tar.data ?? []) as any[]) eventos.push({ k: 't' + t.id, origem: 'tarefa', id: t.id, tipo: 'tarefa', titulo: t.titulo, dia: t.prazo, hora: null, contato: t.contato?.nome ?? null, local: null, meu: true })
  eventos.sort((a, b) => a.dia.localeCompare(b.dia) || (a.hora ?? '').localeCompare(b.hora ?? '') || a.titulo.localeCompare(b.titulo))
  return {
    hoje, config, suspensoes, eventos,
    lembretes: ((lem.data ?? []) as any[]).map((l): LembreteRapido => ({ id: l.id, texto: l.texto, data: l.data, hora: l.hora ? String(l.hora).slice(0, 5) : null, feito: l.feito, feito_em: l.feito_em, compromisso_id: l.compromisso_id })),
    novos: { intimacoes: intim.count ?? 0, leads: leads.count ?? 0 },
  }
}

/**
 * Cria o que a pessoa confirmou em "O que você precisa?": prazo (vencimento calculado AQUI, com tribunal e suspensões anotadas),
 * audiência, consulta, reunião, tarefa ou lembrete. O cliente nunca define o vencimento.
 */
export async function criarItem(client: any, userId: string, b: Record<string, any>): Promise<{ tipo: string; id: number; vencimento?: string }> {
  const tipo = String(b.tipo ?? '')
  const titulo = String(b.titulo ?? '').trim().slice(0, 200)
  if (!titulo) throw erro(400, 'Dê um título.')
  const data = b.data || null, hora = b.hora || null
  if (data && !ehData(data)) throw erro(400, 'Data inválida.')
  if (hora && !ehHora(hora)) throw erro(400, 'Hora inválida.')
  const local = b.local ? String(b.local).trim().slice(0, 200) : null
  const falha = (e: any, m: string) => { console.error('[secretaria/criar]', e); return erro(500, m) }

  if (tipo === 'prazo') {
    const dias = Number(b.dias), inicio = b.inicio || hojeBR()
    if (!Number.isInteger(dias) || dias < 1 || dias > 365) throw erro(400, 'Informe os dias do prazo (1 a 365).')
    if (!ehData(inicio)) throw erro(400, 'Data da intimação inválida.')
    const cfg = await lerConfig(client), susp = await lerSuspensoes(client)
    const r = contarPrazo(inicio, dias, contextoPrazo(cfg, susp))
    const obs = `Prazo de ${dias} dias úteis a partir de ${inicio.split('-').reverse().join('/')} (${TRIBUNAIS[cfg.tribunal]}). Calculado na Secretária: confirme no sistema do tribunal.`
    const { data: c, error } = await client.from('compromissos').insert({ tipo: 'prazo', titulo, data_publicacao: inicio, dias_prazo: dias, data_limite: r.vencimento, observacao: obs, responsavel_id: userId }).select('id').single()
    if (error) throw falha(error, 'Não foi possível criar o prazo.')
    return { tipo, id: c.id, vencimento: r.vencimento }
  }
  if (tipo === 'audiencia' || tipo === 'consulta' || tipo === 'reuniao') {
    if (!data) throw erro(400, 'Informe a data.')
    const row: Record<string, any> = { tipo, titulo, local, responsavel_id: userId }
    if (hora) row.inicio = `${data}T${hora}:00-03:00`; else row.data_limite = data
    const { data: c, error } = await client.from('compromissos').insert(row).select('id').single()
    if (error) throw falha(error, 'Não foi possível criar o compromisso.')
    return { tipo, id: c.id }
  }
  if (tipo === 'tarefa') {
    const { data: t, error } = await client.from('tarefas_internas').insert({ titulo, prazo: data || hojeBR(), prioridade: 'media' }).select('id').single()
    if (error) throw falha(error, 'Não foi possível criar a tarefa.')
    return { tipo, id: t.id }
  }
  if (tipo === 'lembrete') {
    const { data: l, error } = await client.from('lembretes_rapidos').insert({ user_id: userId, texto: titulo.slice(0, 300), data, hora }).select('id').single()
    if (error) throw falha(error, 'Não foi possível criar o lembrete.')
    return { tipo, id: l.id }
  }
  throw erro(400, 'Tipo inválido.')
}
