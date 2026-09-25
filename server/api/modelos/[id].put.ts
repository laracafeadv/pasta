import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparModelo } from '../../utils/modelos'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'modelos/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const d = limparModelo(await readBody(event))
  const { data, error } = await (await serverSupabaseClient(event)).from('modelos_mensagem').update(d).eq('id', id).select().single()
  if (error) {
    if (error.code === '23505') throw createError({ statusCode: 409, message: 'Já existe um modelo com esse atalho.' })
    console.error('[modelos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao salvar modelo.' })
  }
  await auditar(event, 'editou modelo de mensagem', 'modelo', id)
  return data
})
