import { serverSupabaseClient } from '#supabase/server'
import { STATUS_ETAPA } from '../../../shared/data/procedimentos'
import { requireStaff } from '../../utils/security'
import { sincronizarFase } from '../../utils/processos'
import { registrarAtividade } from '../../utils/crm'

/** Concluir, dispensar, reabrir ou ajustar uma etapa do procedimento. A fase do procedimento acompanha. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'processos/etapas/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const b = (await readBody<Record<string, any>>(event)) ?? {}
  const d: Record<string, any> = {}
  if ('titulo' in b) { d.titulo = String(b.titulo ?? '').trim().slice(0, 200); if (!d.titulo) throw createError({ statusCode: 400, message: 'Descreva a etapa.' }) }
  if ('observacao' in b) d.observacao = String(b.observacao ?? '').trim().slice(0, 1000) || null
  if ('data_prevista' in b) d.data_prevista = /^\d{4}-\d{2}-\d{2}$/.test(String(b.data_prevista ?? '')) ? b.data_prevista : null
  if ('status' in b) {
    if (!(b.status in STATUS_ETAPA)) throw createError({ statusCode: 400, message: 'Status inválido.' })
    d.status = b.status
    d.concluida_em = b.status === 'pendente' ? null : (/^\d{4}-\d{2}-\d{2}$/.test(String(b.concluida_em ?? '')) ? b.concluida_em : new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }))
  }
  const client = await serverSupabaseClient(event)
  const { data: antes } = await client.from('processo_etapas').select('status, titulo, processo_id').eq('id', id).maybeSingle()
  if (!antes) throw createError({ statusCode: 404, message: 'Etapa não encontrada.' })
  const { data, error } = await client.from('processo_etapas').update(d).eq('id', id).select().single()
  if (error) throw createError({ statusCode: 500, message: 'Erro ao salvar a etapa.' })
  await sincronizarFase(client, antes.processo_id)
  if (d.status && d.status !== antes.status) {
    const { data: p } = await client.from('processos').select('caso_id, contato_id').eq('id', antes.processo_id).maybeSingle()
    if (p) await registrarAtividade(event, p.contato_id, 'Sistema', `Etapa "${antes.titulo}": ${STATUS_ETAPA[d.status as keyof typeof STATUS_ETAPA].toLowerCase()}.`, userId, null, p.caso_id, antes.processo_id)
  }
  return data
})
