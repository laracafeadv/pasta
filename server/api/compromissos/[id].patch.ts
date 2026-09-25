import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparCompromisso } from '../../utils/compromissos'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'compromissos/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const d = limparCompromisso(await readBody(event))
  const { data, error } = await (await serverSupabaseClient(event)).from('compromissos').update(d).eq('id', id).select().single()
  if (error) throw createError({ statusCode: 500, message: 'Erro ao salvar o compromisso.' })
  await auditar(event, d.status === 'concluido' ? 'concluiu compromisso' : 'editou compromisso', 'compromisso', id, { campos: Object.keys(d) })
  return data
})
