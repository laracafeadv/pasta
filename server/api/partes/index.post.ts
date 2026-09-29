import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparParte } from '../../utils/partes'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'partes/create')
  const d = limparParte(await readBody(event))
  if (!d.caso_id || !d.nome) throw createError({ statusCode: 400, message: 'Informe a demanda e o nome.' })
  const { data, error } = await (await serverSupabaseClient(event)).from('partes').insert(d).select().single()
  if (error) throw createError({ statusCode: 500, message: 'Erro ao adicionar.' })
  await auditar(event, 'adicionou parte', 'parte', data.id, { caso_id: d.caso_id })
  return data
})
