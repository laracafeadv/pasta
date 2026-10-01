import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { criarItem } from '../../utils/secretaria'
import { auditar } from '../../utils/auditoria'

/** Cria o que foi confirmado no campo "O que você precisa?" (prazo, audiência, consulta, reunião, tarefa ou lembrete). */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'secretaria/criar')
  const r = await criarItem(await serverSupabaseClient(event), userId, (await readBody<Record<string, any>>(event)) ?? {})
  await auditar(event, 'criou item pela Secretária', 'secretaria', r.id, { tipo: r.tipo })
  return r
})
