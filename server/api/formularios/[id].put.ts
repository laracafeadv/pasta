import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparItens, substituirItens } from '../../utils/formularios'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const body = await readBody(event)
  const nome = String(body?.nome ?? '').trim()
  if (!nome) throw createError({ statusCode: 400, message: 'Dê um nome para o formulário.' })
  const ativo = body?.ativo !== false
  const itens = limparItens(body?.itens)
  const client = await serverSupabaseClient(event)
  const { error } = await client.from('formularios').update({ nome, ativo }).eq('id', id)
  if (error) {
    console.error('[formularios] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao salvar o formulário.' })
  }
  await substituirItens(client, id, itens)
  await auditar(event, 'editou formulário', 'formulario', id)
  return { success: true }
})
