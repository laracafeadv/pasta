import { requireStaff } from '../../../utils/security'
import { adminDe, estadoDoEnvio } from '../../../utils/formularioEnvios'
import { registrarAtividade } from '../../../utils/crm'
import { auditar } from '../../../utils/auditoria'

/** Ações sobre um link: marcar como enviado (WhatsApp/e-mail/manual), cancelar, prorrogar validade ou data limite. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'formularios/envios/acao')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const b = (await readBody<Record<string, any>>(event)) ?? {}
  const admin = adminDe(event)
  const { data: e } = await admin.from('formulario_envios').select('id, contato_id, caso_id, status, expira_em, respondido_em, enviado_em').eq('id', id).maybeSingle()
  if (!e) throw createError({ statusCode: 404, message: 'Envio não encontrado.' })
  const estado = estadoDoEnvio(e)
  const agora = new Date().toISOString()

  if (b.acao === 'enviado') {
    if (!['whatsapp', 'email', 'manual'].includes(b.canal)) throw createError({ statusCode: 400, message: 'Canal inválido.' })
    if (estado === 'respondido' || estado === 'cancelado') throw createError({ statusCode: 409, message: 'Este link não está mais em aberto.' })
    // Não rebaixa o status se a cliente já abriu/iniciou; só registra o envio.
    const patch: Record<string, unknown> = { enviado_em: e.enviado_em ?? agora, canal_envio: b.canal }
    if (e.status === 'gerado') patch.status = 'enviado'
    await admin.from('formulario_envios').update(patch).eq('id', id)
    await registrarAtividade(event, e.contato_id, 'Sistema', `Link do formulário enviado por ${({ whatsapp: 'WhatsApp', email: 'e-mail', manual: 'outro meio' } as any)[b.canal]}.`, userId, null, e.caso_id)
  } else if (b.acao === 'cancelar') {
    if (estado === 'respondido') throw createError({ statusCode: 409, message: 'Já respondido: não há o que cancelar.' })
    await admin.from('formulario_envios').update({ status: 'cancelado', cancelado_em: agora }).eq('id', id)
    await registrarAtividade(event, e.contato_id, 'Sistema', 'Link de formulário cancelado.', userId, null, e.caso_id)
  } else if (b.acao === 'prorrogar') {
    const dias = Number(b.dias)
    if (!Number.isInteger(dias) || dias < 1 || dias > 90) throw createError({ statusCode: 400, message: 'Prorrogue de 1 a 90 dias.' })
    if (estado === 'respondido' || estado === 'cancelado') throw createError({ statusCode: 409, message: 'Este link não está mais em aberto.' })
    const base = Math.max(Date.now(), new Date(e.expira_em).getTime())
    await admin.from('formulario_envios').update({ expira_em: new Date(base + dias * 864e5).toISOString(), ...(typeof b.prazo_resposta === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.prazo_resposta) ? { prazo_resposta: b.prazo_resposta } : {}) }).eq('id', id)
  } else throw createError({ statusCode: 400, message: 'Ação inválida.' })
  await auditar(event, `formulário: ${b.acao}`, 'formulario_envio', id)
  return { success: true }
})
