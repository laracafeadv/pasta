import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../../../utils/security'

/**
 * Entrega a mídia de uma mensagem (áudio, imagem, documento) por link temporário.
 * O bucket é privado: sem este endpoint, ninguém de fora acessa os arquivos.
 */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'crm/midia')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })

  const { data: msg } = await (await serverSupabaseClient(event)).from('mensagens_whatsapp').select('midia_path').eq('id', id).single()
  if (!msg?.midia_path) throw createError({ statusCode: 404, message: 'Esta mensagem não tem arquivo.' })

  const baixar = getQuery(event).baixar === '1'
  const { data, error } = await serverSupabaseServiceRole(event).storage.from('whatsapp')
    .createSignedUrl(msg.midia_path, 300, baixar ? { download: true } : undefined)
  if (error || !data?.signedUrl) throw createError({ statusCode: 500, message: 'Não foi possível abrir o arquivo.' })

  setHeader(event, 'Cache-Control', 'private, no-store')
  return sendRedirect(event, data.signedUrl, 302)
})
