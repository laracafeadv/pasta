import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'

/** Aniversariantes de um mês (quadro antigo: uma coluna por mês). Inclui clientes encerrados. */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'crm/aniversarios')
  const mes = String(getQuery(event).mes ?? '').padStart(2, '0')
  if (!/^(0[1-9]|1[0-2])$/.test(mes)) throw createError({ statusCode: 400, message: 'Mês inválido.' })
  const { data, error } = await (await serverSupabaseClient(event))
    .from('contatos')
    .select('id, nome, telefone, etapa, data_nascimento, classificacao, nao_contatar')
    .not('data_nascimento', 'is', null)
    .limit(5000)
  if (error) throw createError({ statusCode: 500, message: 'Erro interno ao carregar aniversários.' })
  return (data ?? [])
    .filter(c => String(c.data_nascimento).slice(5, 7) === mes)
    .sort((a, b) => String(a.data_nascimento).slice(8).localeCompare(String(b.data_nascimento).slice(8)))
})
