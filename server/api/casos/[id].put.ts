import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparCaso, sincronizarClienteComDemandas } from '../../utils/casos'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'casos/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const d = limparCaso(await readBody(event))
  delete d.contato_id
  const { data, error } = await (await serverSupabaseClient(event)).from('casos').update(d).eq('id', id).select().single()
  if (error) {
    throw createError({ statusCode: 500, message: 'Erro ao salvar o caso.' })
  }
  if ('status' in d) await sincronizarClienteComDemandas(event, await serverSupabaseClient(event), data.contato_id, userId)
  await auditar(event, 'editou caso', 'caso', id, { campos: Object.keys(d) })
  return data
})
