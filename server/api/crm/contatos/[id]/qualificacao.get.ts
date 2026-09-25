import { serverSupabaseServiceRole } from '#supabase/server'
import { CAMPOS_CONFIDENCIAIS, type Qualificacao } from '../../../../../shared/types/crm'
import { mascararDocumento } from '../../../../../shared/utils/juridico'
import { requireStaff } from '../../../../utils/security'
import { auditar } from '../../../../utils/auditoria'

// Qualificação do cliente. CPF/RG: completos para admin, mascarados para a equipe.
export default defineEventHandler(async (event) => {
  const { role } = await requireStaff(event, 'qualificacao/get')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })

  const { data } = await serverSupabaseServiceRole(event).from('qualificacao').select('*').eq('contato_id', id).maybeSingle()
  const q = (data ?? { contato_id: id }) as Qualificacao
  if (role !== 'admin') {
    for (const c of CAMPOS_CONFIDENCIAIS) q[c] = mascararDocumento(q[c])
    q.mascarado = true
  } else if (data && (data.cpf || data.rg)) {
    await auditar(event, 'visualizou dados confidenciais', 'contato', id)
  }
  return q
})
