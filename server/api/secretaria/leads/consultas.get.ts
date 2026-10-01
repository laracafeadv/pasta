import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { configGoogle } from '../../../utils/googleConfig'
import { lerConexao } from '../../../utils/google'
import { apiGoogleDoUsuario } from '../../../utils/googleApi'
import { consultasNaAgenda, listarLeads } from '../../../utils/leadsSecretaria'

/** Para cada lead da coluna "Ag. consulta": confere no Google Agenda se existe consulta com o nome dele (verde/amarelo/vermelho). */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'secretaria/leads-consultas')
  const cfg = configGoogle(event)
  if (!cfg.configurado || !(await lerConexao(serverSupabaseServiceRole(event), userId))) return { conectado: false, consultas: {} }
  const { api } = await apiGoogleDoUsuario(event, userId)
  return { conectado: true, consultas: await consultasNaAgenda(api, await listarLeads(await serverSupabaseClient(event))) }
})
