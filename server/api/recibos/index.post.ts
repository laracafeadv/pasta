import { serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { valorPorExtenso } from '../../../shared/utils/extenso'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'recibos/create')
  const b = await readBody<{
    honorario_id?: number | null; contato_id?: number; nome_cliente?: string; documento_cliente?: string | null
    valor?: number; referente_a?: string; forma_pagamento?: string | null; numero_parcela?: string | null; data?: string
  }>(event)

  const contatoId = Number(b?.contato_id)
  if (!Number.isInteger(contatoId) || contatoId <= 0) throw createError({ statusCode: 400, message: 'Informe o cliente.' })
  const nomeCliente = String(b?.nome_cliente ?? '').trim()
  if (!nomeCliente) throw createError({ statusCode: 400, message: 'Informe o nome do cliente.' })
  const valor = Number(b?.valor)
  if (!Number.isFinite(valor) || valor <= 0) throw createError({ statusCode: 400, message: 'Informe um valor válido.' })
  const referenteA = String(b?.referente_a ?? '').trim()
  if (!referenteA) throw createError({ statusCode: 400, message: 'Informe o que o pagamento refere.' })

  const admin = serverSupabaseServiceRole(event)
  const { data, error } = await admin.from('recibos').insert({
    honorario_id: b?.honorario_id || null,
    contato_id: contatoId,
    nome_cliente: nomeCliente,
    documento_cliente: b?.documento_cliente?.trim() || null,
    valor,
    valor_extenso: valorPorExtenso(valor),
    referente_a: referenteA,
    forma_pagamento: b?.forma_pagamento?.trim() || null,
    numero_parcela: b?.numero_parcela?.trim() || null,
    data: b?.data || new Date().toISOString().slice(0, 10),
    criado_por: userId,
  }).select().single()
  if (error) {
    console.error('[recibos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao salvar o recibo.' })
  }
  await auditar(event, 'gerou recibo', 'recibo', data.id)
  return { id: data.id }
})
