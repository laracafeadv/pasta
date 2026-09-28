import { serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { coletarDados } from '../../utils/documentoGerador'

/** Busca os valores conhecidos do CRM pra pré-preencher o formulário de geração. */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'documentos-gerados/dados')
  const q = getQuery(event)
  const contatoId = Number(q.contato_id)
  if (!Number.isInteger(contatoId) || contatoId <= 0) throw createError({ statusCode: 400, message: 'Informe o cliente.' })
  const casoId = q.caso_id ? Number(q.caso_id) : null
  const honorarioId = q.honorario_id ? Number(q.honorario_id) : null
  const admin = serverSupabaseServiceRole(event)
  return coletarDados(admin, { contatoId, casoId, honorarioId })
})
