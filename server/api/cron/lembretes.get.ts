import { timingSafeEqual } from 'node:crypto'
import { enviarLembretes } from '../../utils/lembretes'

/** Para um agendador externo (ex.: Vercel Cron às 7h): Authorization: Bearer CRON_SECRET. */
export default defineEventHandler(async (event) => {
  const segredo = process.env.CRON_SECRET || ''
  const recebido = (getHeader(event, 'authorization') || '').replace(/^Bearer\s+/i, '')
  const ok = segredo.length >= 16 && recebido.length === segredo.length && timingSafeEqual(Buffer.from(recebido), Buffer.from(segredo))
  if (!ok) throw createError({ statusCode: 401, message: 'Não autorizado.' })
  return { lembretes: await enviarLembretes(event) }
})
