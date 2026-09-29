import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../../../utils/security'
import { auditar } from '../../../../utils/auditoria'
import { CHAVES_MANUAIS_ATENDIMENTO, itensDoProcedimento } from '../../../../utils/checklist'

/**
 * Marca ou desmarca um item MANUAL do checklist (atendimento ou etapa de um caso).
 * Itens automáticos não são gravados: eles vêm de dados que o CRM já tem.
 * Desmarcar apaga a marcação, então dá para desfazer.
 */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'checklist/put')
  const contatoId = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(contatoId) || contatoId <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const body = await readBody<{ chave?: string; caso_id?: number | null; concluido?: boolean }>(event)
  const chave = String(body?.chave ?? '')
  const casoId = body?.caso_id ? Number(body.caso_id) : null
  if (!chave || typeof body?.concluido !== 'boolean') throw createError({ statusCode: 400, message: 'Item inválido.' })

  const client = await serverSupabaseClient(event)
  // A chave precisa existir na definição atual: ou é um item manual do atendimento, ou uma etapa do procedimento do caso.
  if (casoId) {
    const { data: caso } = await client.from('casos').select('id, contato_id, procedimento').eq('id', casoId).maybeSingle()
    if (!caso || caso.contato_id !== contatoId) throw createError({ statusCode: 404, message: 'Caso não encontrado.' })
    if (!itensDoProcedimento(caso.procedimento).some(i => i.chave === chave)) throw createError({ statusCode: 400, message: 'Esta etapa não faz parte do procedimento do caso.' })
  } else if (!CHAVES_MANUAIS_ATENDIMENTO.has(chave)) {
    throw createError({ statusCode: 400, message: 'Este item é automático e não pode ser marcado à mão.' })
  }

  if (body.concluido) {
    const { error } = await client.from('checklist_marcas').insert({ contato_id: contatoId, caso_id: casoId, chave, concluido_por: userId })
    if (error && error.code !== '23505') { // 23505 = já estava marcado
      console.error('[checklist] Erro:', error)
      throw createError({ statusCode: 500, message: 'Não foi possível marcar.' })
    }
  } else {
    let q = client.from('checklist_marcas').delete().eq('contato_id', contatoId).eq('chave', chave)
    q = casoId ? q.eq('caso_id', casoId) : q.is('caso_id', null)
    const { error } = await q
    if (error) {
      console.error('[checklist] Erro:', error)
      throw createError({ statusCode: 500, message: 'Não foi possível desfazer.' })
    }
  }
  await auditar(event, body.concluido ? 'marcou checklist' : 'desfez checklist', 'contato', contatoId, { chave, caso_id: casoId })

  if (!body.concluido) return { quando: null, quem: null }
  const { data: perfil } = await serverSupabaseServiceRole(event).from('profiles').select('name').eq('id', userId).maybeSingle()
  return { quando: new Date().toISOString(), quem: perfil?.name ?? null }
})
