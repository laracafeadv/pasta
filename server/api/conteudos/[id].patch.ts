import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparConteudo } from '../../utils/conteudos'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'conteudos/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const d = limparConteudo((await readBody(event)) ?? {}, false)
  const { data, error } = await (await serverSupabaseClient(event)).from('conteudos').update(d).eq('id', id).select().single()
  if (error) {
    console.error('[conteudos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao salvar o conteúdo.' })
  }
  return data
})
