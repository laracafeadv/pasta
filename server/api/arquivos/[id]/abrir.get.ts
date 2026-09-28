import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../../utils/security'

/** Abre (ou baixa, com ?baixar=1) um documento por link temporário — o bucket é privado. */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'arquivos/abrir')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { data: arq } = await (await serverSupabaseClient(event)).from('arquivos').select('path, nome').eq('id', id).maybeSingle()
  if (!arq) throw createError({ statusCode: 404, message: 'Documento não encontrado.' })

  const baixar = getQuery(event).baixar === '1'
  const { data, error } = await serverSupabaseServiceRole(event).storage.from('documentos')
    .createSignedUrl(arq.path, 300, baixar ? { download: arq.nome } : undefined)
  if (error || !data?.signedUrl) throw createError({ statusCode: 500, message: 'Não foi possível abrir o documento.' })
  setHeader(event, 'Cache-Control', 'private, no-store')
  return sendRedirect(event, data.signedUrl, 302)
})
