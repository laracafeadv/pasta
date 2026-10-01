import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { sanitizarBusca } from '../../utils/crm'

/** Busca de pessoa para vincular (nome, e-mail ou telefone). Devolve poucas, já com o papel dela no sistema. */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'pessoas/buscar')
  const q = sanitizarBusca(String(getQuery(event).q ?? '').trim())
  if (q.length < 2) return []
  const dig = q.replace(/\D/g, '')
  const filtros = [`nome.ilike.%${q}%`, `email.ilike.%${q}%`]
  if (dig.length >= 4) filtros.push(`telefone.ilike.%${dig}%`)
  const { data, error } = await (await serverSupabaseClient(event)).from('contatos').select('id, nome, telefone, email, etapa').or(filtros.join(',')).order('nome').limit(8)
  if (error) throw createError({ statusCode: 500, message: 'Erro na busca.' })
  return data ?? []
})
