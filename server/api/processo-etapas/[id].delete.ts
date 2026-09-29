import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { sincronizarFase } from '../../utils/processos'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'processos/etapas/delete')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const client = await serverSupabaseClient(event)
  const { data: e } = await client.from('processo_etapas').select('processo_id').eq('id', id).maybeSingle()
  await client.from('processo_etapas').delete().eq('id', id)
  if (e) await sincronizarFase(client, e.processo_id)
  return { success: true }
})
