import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { auditar } from '../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'documento-modelos/duplicar')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const client = await serverSupabaseClient(event)
  const { data: original } = await client.from('documento_modelos').select('nome, categoria, descricao, conteudo').eq('id', id).single()
  if (!original) throw createError({ statusCode: 404, message: 'Modelo não encontrado.' })
  const { data, error } = await client.from('documento_modelos').insert({ ...original, nome: `${original.nome} (cópia)` }).select().single()
  if (error) throw createError({ statusCode: 500, message: 'Erro ao duplicar o modelo.' })
  await auditar(event, 'duplicou modelo de documento', 'documento_modelo', data.id)
  return { id: data.id }
})
