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
    if (error.code === '23505') throw createError({ statusCode: 409, message: 'Já existe um caso com este número de processo.' })
    console.error('[casos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao abrir o caso.' })
  }
  await registrarAtividade(event, data.contato_id, 'Sistema', `Caso aberto: ${data.titulo}${data.numero_processo ? ` (${data.numero_processo})` : ''}.`, userId)
  await auditar(event, 'abriu caso', 'caso', data.id, { contato_id: data.contato_id })
  return data
})
