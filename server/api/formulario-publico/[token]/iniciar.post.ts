import { adminDe, envioPorToken } from '../../../utils/formularioEnvios'

/** A cliente começou a preencher (primeira digitação): marca "iniciado". Idempotente e sem corpo. */
export default defineEventHandler(async (event) => {
  const admin = adminDe(event)
  const e = await envioPorToken(admin, getRouterParam(event, 'token'))
  await admin.from('formulario_envios').update({ status: 'iniciado', iniciado_em: new Date().toISOString() }).eq('id', e.id).in('status', ['gerado', 'enviado', 'visualizado'])
  return { ok: true }
})
