import { serverSupabaseClient } from '#supabase/server'
import type { Contato } from '../../../../shared/types/crm'
import { requireStaff } from '../../../utils/security'

// "O que precisa de você hoje": todo caso aberto deve ter uma próxima ação com data.
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'crm/hoje')
  const client = await serverSupabaseClient(event)
  const hoje = new Date().toISOString().slice(0, 10)
  const em7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)

  const { data, error } = await client
    .from('contatos')
    .select('*')
    .not('etapa', 'in', '(concluido,perdido)')
    .order('proxima_data', { ascending: true, nullsFirst: true })
    .limit(500)

  if (error) {
    console.error('[crm/hoje] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao montar a agenda.' })
  }

  const abertos = (data ?? []) as Contato[]
  const semAcao = (c: Contato) => !c.proxima_acao || !c.proxima_data

  return {
    atrasadas: abertos.filter(c => !semAcao(c) && c.proxima_data! < hoje),
    hoje: abertos.filter(c => !semAcao(c) && c.proxima_data === hoje),
    semAcao: abertos.filter(semAcao).sort((a, b) => a.updated_at.localeCompare(b.updated_at)),
    semana: abertos.filter(c => !semAcao(c) && c.proxima_data! > hoje && c.proxima_data! <= em7),
    transferidas: abertos.filter(c => !c.ia_ativa),
  }
})
