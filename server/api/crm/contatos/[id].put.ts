import { serverSupabaseClient } from '#supabase/server'
import { etapa, type Contato } from '../../../../shared/types/crm'
import { requireStaff } from '../../../utils/security'
import { limparContato, registrarAtividade } from '../../../utils/crm'
import { auditar, camposAlterados } from '../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'crm/update')
  const client = await serverSupabaseClient(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })

  const data = limparContato(await readBody(event))

  const { data: anterior } = await client.from('contatos').select('*').eq('id', id).single()

  const { data: updated, error } = await client.from('contatos').update(data).eq('id', id).select().single()
  if (error) {
    if (error.code === '23505') throw createError({ statusCode: 409, message: 'Já existe um contato com este telefone.' })
    console.error('[crm] Erro ao atualizar contato:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao atualizar contato.' })
  }

  if (anterior && data.etapa && anterior.etapa !== data.etapa) {
    const motivo = data.etapa === 'perdido' && updated.motivo_perda ? ` (${updated.motivo_perda})` : ''
    await registrarAtividade(event, id, 'Sistema', `Etapa: ${etapa(anterior.etapa).nome} → ${etapa(data.etapa).nome}${motivo}`, userId)
  }

  const alterados = camposAlterados(anterior, data as Record<string, any>)
  if (alterados.length) await auditar(event, 'editou contato', 'contato', id, { campos: alterados })
  return updated as Contato
})
