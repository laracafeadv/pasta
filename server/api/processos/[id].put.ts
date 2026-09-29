import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparProcesso } from '../../utils/processos'
import { sincronizarAtuacao } from '../../utils/demandas'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'processos/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const client = await serverSupabaseClient(event)
  const { data: atual } = await client.from('processos').select('natureza, caso_id').eq('id', id).single()
  if (!atual) throw createError({ statusCode: 404, message: 'Não encontrado.' })
  const body = await readBody(event)
  const d = limparProcesso({ natureza: atual.natureza, ...body })
  delete d.caso_id
  const { data, error } = await client.from('processos').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) {
    if (error.code === '23505') throw createError({ statusCode: 409, message: 'Já existe um processo com este número.' })
    throw createError({ statusCode: 500, message: 'Erro ao salvar.' })
  }
  if (d.natureza && d.natureza !== atual.natureza) await sincronizarAtuacao(client, atual.caso_id, event, userId)
  await auditar(event, 'editou processo', 'processo', id, { campos: Object.keys(d) })
  return data
})
