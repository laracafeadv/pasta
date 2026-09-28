import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparModeloDocumento } from '../../utils/documentoModelos'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'documento-modelos/create')
  const d = limparModeloDocumento(await readBody(event))
  const { data, error } = await (await serverSupabaseClient(event)).from('documento_modelos').insert(d).select().single()
  if (error) {
    console.error('[documento-modelos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao salvar o modelo.' })
  }
  await auditar(event, 'criou modelo de documento', 'documento_modelo', data.id)
  return data
})
