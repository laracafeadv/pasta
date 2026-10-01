import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { estadoDoEnvio, urlDoEnvio } from '../../../utils/formularioEnvios'

/** Envios de formulário (links individuais) — por pessoa e/ou demanda. ?contato_id= &caso_id= &estado= */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/envios/lista')
  const q = getQuery(event)
  const client = await serverSupabaseClient(event)
  let query = client.from('formulario_envios')
    .select('id, created_at, formulario_id, contato_id, caso_id, token, expira_em, prazo_resposta, status, enviado_em, canal_envio, visualizado_em, iniciado_em, respondido_em, respondente, versao_formulario, contato:contatos(nome), formulario:formularios(nome), caso:casos(titulo)')
    .order('created_at', { ascending: false }).limit(300)
  if (q.contato_id) query = query.eq('contato_id', Number(q.contato_id))
  if (q.caso_id) query = query.eq('caso_id', Number(q.caso_id))
  const { data, error } = await query
  if (error) { console.error('[formularios/envios] Erro:', error); throw createError({ statusCode: 500, message: 'Erro ao carregar os formulários enviados.' }) }
  let lista = (data ?? []).map((e: any) => ({
    id: e.id, created_at: e.created_at, formulario_id: e.formulario_id, formulario_nome: e.formulario?.nome ?? null, contato_id: e.contato_id, contato_nome: e.contato?.nome ?? null,
    caso_id: e.caso_id, caso_titulo: e.caso?.titulo ?? null, expira_em: e.expira_em, prazo_resposta: e.prazo_resposta, enviado_em: e.enviado_em, canal_envio: e.canal_envio,
    visualizado_em: e.visualizado_em, iniciado_em: e.iniciado_em, respondido_em: e.respondido_em, respondente: e.respondente, versao: e.versao_formulario,
    estado: estadoDoEnvio(e), ...urlDoEnvio(e.token), pendente_de_prazo: !e.respondido_em && !!e.prazo_resposta && e.prazo_resposta < new Date().toISOString().slice(0, 10),
  }))
  if (q.estado) lista = lista.filter(e => e.estado === String(q.estado))
  return lista
})
