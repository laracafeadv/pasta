import { serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../utils/security'

/** Pré-preenche os dados do recibo a partir do cliente e, se informado, do honorário. */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'recibos/dados')
  const q = getQuery(event)
  const contatoId = Number(q.contato_id)
  if (!Number.isInteger(contatoId) || contatoId <= 0) throw createError({ statusCode: 400, message: 'Informe o cliente.' })
  const honorarioId = q.honorario_id ? Number(q.honorario_id) : null
  const admin = serverSupabaseServiceRole(event)

  const [{ data: contato }, { data: qual }, { data: honorario }] = await Promise.all([
    admin.from('contatos').select('nome').eq('id', contatoId).single(),
    admin.from('qualificacao').select('nome_completo, cpf').eq('contato_id', contatoId).maybeSingle(),
    honorarioId ? admin.from('honorarios').select('valor, descricao, forma_pagamento, parcelas').eq('id', honorarioId).maybeSingle() : Promise.resolve({ data: null }),
  ])

  return {
    nome_cliente: qual?.nome_completo || contato?.nome || '',
    documento_cliente: qual?.cpf || '',
    valor: honorario?.valor ?? null,
    referente_a: honorario?.descricao || '',
    forma_pagamento: honorario?.forma_pagamento || '',
    numero_parcela: honorario?.parcelas ? String(honorario.parcelas) : '',
  }
})
