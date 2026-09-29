import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparEstrutura, salvarEstrutura } from '../../utils/formularioEstrutura'
import { auditar } from '../../utils/auditoria'

/** Salva o formulário inteiro (título, contexto, seções, perguntas, opções, obrigatoriedade e lógica). */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const estrutura = limparEstrutura(await readBody(event))
  const r = await salvarEstrutura(await serverSupabaseClient(event), id, estrutura)
  await auditar(event, 'editou formulário', 'formulario', id, { ...r.relatorio, remapeamento: undefined })
  return { success: true, ...r.relatorio }
})
