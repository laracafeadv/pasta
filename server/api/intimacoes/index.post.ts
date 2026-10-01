import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparIntimacao, registrarIntimacao, type IntimacaoEntrada } from '../../utils/intimacoes'
import { auditar } from '../../utils/auditoria'

/** Registra uma intimação de processo judicial: cria o prazo, a tarefa e o andamento. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'intimacoes/create')
  const d = limparIntimacao((await readBody(event)) ?? {}) as IntimacaoEntrada
  const r = await registrarIntimacao(event, await serverSupabaseClient(event), d, userId)
  await auditar(event, 'registrou intimação', 'intimacao', r.intimacao.id, { processo_id: d.processo_id })
  return r
})
