import { serverSupabaseClient } from '#supabase/server'
import { AGUARDANDO_PENDENCIA } from '../../../../shared/data/procedimentos'
import { requireStaff } from '../../../utils/security'
import { registrarAtividade } from '../../../utils/crm'

/** Registra uma pendência/exigência: o que trava o andamento, quem precisa resolver e até quando. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'processos/pendencias/create')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const b = (await readBody<Record<string, any>>(event)) ?? {}
  const descricao = String(b.descricao ?? '').trim().slice(0, 500)
  if (!descricao) throw createError({ statusCode: 400, message: 'Descreva a pendência.' })
  const aguardando = b.aguardando in AGUARDANDO_PENDENCIA ? b.aguardando : 'cliente'
  const prazo = /^\d{4}-\d{2}-\d{2}$/.test(String(b.prazo ?? '')) ? b.prazo : null
  const client = await serverSupabaseClient(event)
  const { data: p } = await client.from('processos').select('caso_id, contato_id').eq('id', id).maybeSingle()
  if (!p) throw createError({ statusCode: 404, message: 'Não encontrado.' })
  const { data, error } = await client.from('processo_pendencias').insert({ processo_id: id, descricao, aguardando, prazo }).select().single()
  if (error) throw createError({ statusCode: 500, message: 'Erro ao registrar a pendência.' })
  await registrarAtividade(event, p.contato_id, 'Sistema', `Pendência (aguardando ${AGUARDANDO_PENDENCIA[aguardando as keyof typeof AGUARDANDO_PENDENCIA].toLowerCase()}): ${descricao}`, userId, null, p.caso_id, id)
  return data
})
