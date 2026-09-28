import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'documentos-gerados/detalhe')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { data, error } = await (await serverSupabaseClient(event)).from('documentos_gerados')
    .select('*, contato:contatos(nome), modelo:documento_modelos(nome)').eq('id', id).maybeSingle()
  if (error || !data) throw createError({ statusCode: 404, message: 'Documento não encontrado.' })
  return { ...data, contato_nome: (data.contato as any)?.nome ?? null, modelo_nome: (data.modelo as any)?.nome ?? null }
})
