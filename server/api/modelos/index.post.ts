import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparModelo } from '../../utils/modelos'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'modelos/create')
  const d = limparModelo(await readBody(event))
  if (!d.atalho || !d.texto || !d.titulo || !d.categoria) throw createError({ statusCode: 400, message: 'Preencha categoria, título, atalho e texto.' })
  const { data, error } = await (await serverSupabaseClient(event)).from('modelos_mensagem').insert(d).select().single()
  if (error) {
    if (error.code === '23505') throw createError({ statusCode: 409, message: 'Já existe um modelo com esse atalho.' })
    console.error('[modelos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao salvar modelo.' })
  }
  await auditar(event, 'criou modelo de mensagem', 'modelo', data.id)
  return data
})
