import { serverSupabaseClient } from '#supabase/server'
import { AGUARDANDO_PENDENCIA } from '../../../shared/data/procedimentos'
import { requireStaff } from '../../utils/security'
import { registrarAtividade } from '../../utils/crm'

/** Resolver (ou reabrir) e ajustar uma pendência. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'processos/pendencias/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const b = (await readBody<Record<string, any>>(event)) ?? {}
  const d: Record<string, any> = {}
  if ('descricao' in b) { d.descricao = String(b.descricao ?? '').trim().slice(0, 500); if (!d.descricao) throw createError({ statusCode: 400, message: 'Descreva a pendência.' }) }
  if ('aguardando' in b) { if (!(b.aguardando in AGUARDANDO_PENDENCIA)) throw createError({ statusCode: 400, message: 'Escolha quem precisa resolver.' }); d.aguardando = b.aguardando }
  if ('prazo' in b) d.prazo = /^\d{4}-\d{2}-\d{2}$/.test(String(b.prazo ?? '')) ? b.prazo : null
  if ('observacao' in b) d.observacao = String(b.observacao ?? '').trim().slice(0, 1000) || null
  if ('resolvida' in b) d.resolvida_em = b.resolvida ? new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) : null
  const client = await serverSupabaseClient(event)
  const { data: antes } = await client.from('processo_pendencias').select('processo_id, descricao, resolvida_em').eq('id', id).maybeSingle()
  if (!antes) throw createError({ statusCode: 404, message: 'Pendência não encontrada.' })
  const { data, error } = await client.from('processo_pendencias').update(d).eq('id', id).select().single()
  if (error) throw createError({ statusCode: 500, message: 'Erro ao salvar a pendência.' })
  if ('resolvida' in b && !!b.resolvida !== !!antes.resolvida_em) {
    const { data: p } = await client.from('processos').select('caso_id, contato_id').eq('id', antes.processo_id).maybeSingle()
    if (p) await registrarAtividade(event, p.contato_id, 'Sistema', `Pendência ${b.resolvida ? 'resolvida' : 'reaberta'}: ${antes.descricao}`, userId, null, p.caso_id, antes.processo_id)
  }
  return data
})
