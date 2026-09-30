import { requireStaff } from '../../utils/security'
import { apiGoogleDoUsuario } from '../../utils/googleApi'
import { caixaDeEmail } from '../../utils/secretariaEmail'
import type { CaixaSub } from '../../../shared/data/secretaria'

/** Caixa de entrada: ?sub=principal (7 dias) | naolidos (14 dias) | tudo (3 dias). */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'secretaria/email')
  const sub = String(getQuery(event).sub ?? 'principal')
  if (!['principal', 'naolidos', 'tudo'].includes(sub)) throw createError({ statusCode: 400, message: 'Caixa inválida.' })
  const { api, admin } = await apiGoogleDoUsuario(event, userId)
  return caixaDeEmail(api, admin, userId, sub as CaixaSub)
})
