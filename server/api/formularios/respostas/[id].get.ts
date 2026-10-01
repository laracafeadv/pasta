import { serverSupabaseClient } from '#supabase/server'
import type { FormularioEnvioDetalhe } from '../../../../shared/types/crm'
import { requireStaff } from '../../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/respostas/detalhe')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const client = await serverSupabaseClient(event)

  const { data: envio, error } = await client.from('formulario_envios')
    .select('id, created_at, formulario_id, contato_id, token, expira_em, visualizado_em, respondido_em, status, contato:contatos(nome, resumo), formulario:formularios(nome)')
    .eq('id', id).maybeSingle()
  if (error || !envio) throw createError({ statusCode: 404, message: 'Envio não encontrado.' })

  const { data: respostas } = await client.from('formulario_envio_respostas')
    .select('id, ordem, pergunta_texto, pergunta_tipo, resposta')
    .eq('envio_id', id).order('ordem')

  const c = envio.contato as any
  const f = envio.formulario as any
  return {
    ...envio, contato_nome: c?.nome ?? null, formulario_nome: f?.nome ?? null,
    resumo: c?.resumo ?? null, respostas: respostas ?? [],
  } as FormularioEnvioDetalhe
})
