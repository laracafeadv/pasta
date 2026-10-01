import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { adicionarParte, type ParteEntrada } from '../../utils/partes'
import { auditar } from '../../utils/auditoria'

/** Adiciona parte/interessado: pessoa já cadastrada (pessoa_id) OU nova (nova_pessoa) — nunca duplica a pessoa. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'partes/create')
  const b = (await readBody(event)) ?? {}
  if (!Number(b.caso_id)) throw createError({ statusCode: 400, message: 'Informe a demanda.' })
  const r = await adicionarParte(event, await serverSupabaseClient(event), { ...b, caso_id: Number(b.caso_id), pessoa_id: Number(b.pessoa_id) || null } as ParteEntrada, userId)
  await auditar(event, 'adicionou parte', 'parte', r.parte.id, { caso_id: r.parte.caso_id, contato_id: r.parte.contato_id })
  return r
})
