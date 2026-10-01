import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { estadoDoEnvio, urlDoEnvio } from '../../../utils/formularioEnvios'

/** Um envio com as respostas EXATAMENTE como foram dadas (pergunta, tipo e opções da época). */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/envios/detalhe')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const client = await serverSupabaseClient(event)
  const { data: e } = await client.from('formulario_envios')
    .select('id, created_at, formulario_id, contato_id, caso_id, token, expira_em, prazo_resposta, status, enviado_em, canal_envio, visualizado_em, iniciado_em, respondido_em, consentimento_em, respondente, versao_formulario, contato:contatos(nome, resumo), formulario:formularios(nome, versao), caso:casos(titulo)')
    .eq('id', id).maybeSingle()
  if (!e) throw createError({ statusCode: 404, message: 'Envio não encontrado.' })
  const { data: respostas } = await client.from('formulario_envio_respostas')
    .select('id, ordem, pergunta_id, pergunta_texto, pergunta_tipo, pergunta_opcoes, pergunta_versao, secao_titulo, resposta').eq('envio_id', id).order('ordem')
  const x = e as any
  return { ...x, contato_nome: x.contato?.nome ?? null, resumo: x.contato?.resumo ?? null, formulario_nome: x.formulario?.nome ?? null, versao_atual: x.formulario?.versao ?? null, caso_titulo: x.caso?.titulo ?? null, estado: estadoDoEnvio(x), ...urlDoEnvio(x.token), respostas: respostas ?? [] }
})
