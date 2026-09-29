import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparParte } from '../../utils/partes'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'partes/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const d = limparParte(await readBody(event))
  delete d.caso_id
  const { data, error } = await (await serverSupabaseClient(event)).from('partes').update(d).eq('id', id).select().single()
  if (error) throw createError({ statusCode: 500, message: 'Erro ao salvar.' })
  return data
})
