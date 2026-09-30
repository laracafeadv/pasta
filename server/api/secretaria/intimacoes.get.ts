import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { configGoogle } from '../../utils/googleConfig'
import { lerConexao } from '../../utils/google'
import { apiGoogleDoUsuario } from '../../utils/googleApi'
import { intimacoesDoGmail } from '../../utils/secretariaEmail'
import type { AvisoItem, AvisoLancado } from '../../../shared/data/secretaria'

/** Avisos dos tribunais (Gmail, últimos 14 dias) e quais já tiveram o prazo lançado. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'secretaria/intimacoes')
  const cfg = configGoogle(event)
  const vazio = { conectado: false, configurado: cfg.configurado, itens: [] as AvisoItem[], lancados: {} as Record<string, AvisoLancado> }
  if (!cfg.configurado || !(await lerConexao(serverSupabaseServiceRole(event), userId))) return vazio
  const { api, admin } = await apiGoogleDoUsuario(event, userId)
  const itens = await intimacoesDoGmail(api, admin, userId)
  const { data } = await (await serverSupabaseClient(event)).from('avisos_prazos').select('thread_id, prazo, evento_link').eq('user_id', userId)
  return { conectado: true, configurado: true, itens, lancados: Object.fromEntries(((data ?? []) as any[]).map(r => [r.thread_id, { prazo: r.prazo, evento_link: r.evento_link } as AvisoLancado])) }
})
