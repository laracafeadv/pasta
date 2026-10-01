import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../../utils/security'
import { apiGoogleDoUsuario } from '../../../../utils/googleApi'
import { lancarPrazoAviso } from '../../../../utils/secretariaEmail'
import { auditar } from '../../../../utils/auditoria'

/** Lança o prazo de um aviso: evento no Google Agenda (avisos 3 dias e 1 dia antes), prazo e lembrete na Secretária. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'secretaria/lancar-prazo')
  const id = String(getRouterParam(event, 'id') ?? '')
  if (!/^[\w-]{1,64}$/.test(id)) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { api, admin } = await apiGoogleDoUsuario(event, userId)
  const r = await lancarPrazoAviso(api, admin, await serverSupabaseClient(event), userId, id, (await readBody(event)) ?? {})
  await auditar(event, 'lançou prazo de intimação (Secretária)', 'secretaria', r.item_id, { vence: r.vence })
  return r
})
