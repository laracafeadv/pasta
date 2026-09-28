import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparItens, substituirItens } from '../../utils/formularios'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/create')
  const body = await readBody(event)
  const nome = String(body?.nome ?? '').trim()
  if (!nome) throw createError({ statusCode: 400, message: 'Dê um nome para o formulário.' })
  const itens = limparItens(body?.itens)
  const client = await serverSupabaseClient(event)
  const { data, error } = await client.from('formularios').insert({ nome }).select().single()
  if (error) {
    console.error('[formularios] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao criar o formulário.' })
  }
  await substituirItens(client, data.id, itens)
  await auditar(event, 'criou formulário', 'formulario', data.id)
  return { id: data.id }
})
