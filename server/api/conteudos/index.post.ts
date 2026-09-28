import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparConteudo } from '../../utils/conteudos'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'conteudos/create')
  const d = limparConteudo((await readBody(event)) ?? {}, true)
  const { data, error } = await (await serverSupabaseClient(event)).from('conteudos').insert(d).select().single()
  if (error) {
    console.error('[conteudos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao salvar o conteúdo.' })
  }
  return data
})
