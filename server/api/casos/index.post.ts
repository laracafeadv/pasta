import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparCaso } from '../../utils/casos'
import { registrarAtividade } from '../../utils/crm'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'casos/create')
  const d = limparCaso(await readBody(event))
  if (!d.contato_id) throw createError({ statusCode: 400, message: 'Escolha o cliente.' })
  const { data, error } = await (await serverSupabaseClient(event)).from('casos').insert({ responsavel_id: userId, ...d }).select().single()
  if (error) {
    console.error('[casos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao abrir a demanda.' })
  }
  await registrarAtividade(event, data.contato_id, 'Sistema', `Demanda aberta: ${data.titulo}.`, userId)
  await auditar(event, 'abriu demanda', 'caso', data.id, { contato_id: data.contato_id })
  return data
})
