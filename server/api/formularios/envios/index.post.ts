import { requireStaff } from '../../../utils/security'
import { adminDe, criarEnvio, urlDoEnvio, VALIDADE_PADRAO_DIAS } from '../../../utils/formularioEnvios'
import { registrarAtividade } from '../../../utils/crm'
import { auditar } from '../../../utils/auditoria'

/** Gera o link público individual: pessoa + formulário publicado + demanda (opcional/obrigatória conforme o formulário). */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'formularios/envios/criar')
  const b = (await readBody<Record<string, unknown>>(event)) ?? {}
  const contatoId = Number(b.contato_id), formularioId = Number(b.formulario_id)
  if (!Number.isInteger(contatoId) || contatoId <= 0 || !Number.isInteger(formularioId) || formularioId <= 0) throw createError({ statusCode: 400, message: 'Escolha a pessoa e o formulário.' })
  const casoId = b.caso_id == null || b.caso_id === '' ? null : Number(b.caso_id)
  if (casoId != null && (!Number.isInteger(casoId) || casoId <= 0)) throw createError({ statusCode: 400, message: 'Demanda inválida.' })
  const validade = b.validade_dias == null || b.validade_dias === '' ? VALIDADE_PADRAO_DIAS : Number(b.validade_dias)
  const prazo = typeof b.prazo_resposta === 'string' && b.prazo_resposta ? b.prazo_resposta : null

  const envio = await criarEnvio(adminDe(event), { contatoId, formularioId, casoId, validadeDias: validade, prazoResposta: prazo, geradoPor: userId })
  await registrarAtividade(event, contatoId, 'Sistema', `Link do formulário “${envio.formulario_nome}” gerado (válido por ${validade} dias).`, userId, null, casoId)
  await auditar(event, 'gerou link de formulário', 'formulario_envio', envio.id, { formulario_id: formularioId, contato_id: contatoId, caso_id: casoId })
  return { id: envio.id, token: envio.token, ...urlDoEnvio(envio.token), expira_em: envio.expira_em, prazo_resposta: envio.prazo_resposta, status: envio.status, versao: envio.versao_formulario, formulario_nome: envio.formulario_nome }
})
