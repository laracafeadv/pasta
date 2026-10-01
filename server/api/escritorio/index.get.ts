import { serverSupabaseServiceRole } from '#supabase/server'
import { CHAVES_GESTAO } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'
import { carregarEscritorio } from '../../utils/escritorio'

export default defineEventHandler(async (event) => {
  const { role } = await requireStaff(event, 'escritorio/get')
  const dados = await carregarEscritorio(serverSupabaseServiceRole(event))
  // Números de gestão (saldo, margem, horas) são só da administração.
  if (role !== 'admin') for (const k of CHAVES_GESTAO) delete dados[k]
  return dados
})
