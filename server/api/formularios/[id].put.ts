import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const body = await readBody(event)
  const nome = String(body?.nome ?? '').trim()
  const perguntas = Array.isArray(body?.perguntas) ? body.perguntas.map((p: unknown) => String(p).trim()).filter(Boolean) : []
  if (!nome) throw createError({ statusCode: 400, message: 'Dê um nome para o modelo.' })
  const { data, error } = await (await serverSupabaseClient(event)).from('formulario_templates').update({ nome, perguntas }).eq('id', id).select().single()
  if (error) {
    console.error('[formularios] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao salvar o modelo.' })
  }
  await auditar(event, 'editou modelo de formulário', 'formulario_template', id)
  return data
})
