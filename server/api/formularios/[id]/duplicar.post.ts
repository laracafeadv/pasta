import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { auditar } from '../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/duplicar')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const client = await serverSupabaseClient(event)

  const [{ data: original }, { data: itens }] = await Promise.all([
    client.from('formularios').select('nome').eq('id', id).single(),
    client.from('formulario_itens').select('pergunta_id, ordem, obrigatoria').eq('formulario_id', id).order('ordem'),
  ])
  if (!original) throw createError({ statusCode: 404, message: 'Formulário não encontrado.' })

  const { data: novo, error } = await client.from('formularios').insert({ nome: `${original.nome} (cópia)` }).select().single()
  if (error) throw createError({ statusCode: 500, message: 'Erro ao duplicar o formulário.' })
  if (itens?.length) {
    await client.from('formulario_itens').insert(itens.map(i => ({ formulario_id: novo.id, pergunta_id: i.pergunta_id, ordem: i.ordem, obrigatoria: i.obrigatoria })))
  }
  await auditar(event, 'duplicou formulário', 'formulario', novo.id)
  return { id: novo.id }
})
