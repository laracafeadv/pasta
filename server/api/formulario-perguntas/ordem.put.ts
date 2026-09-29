import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'

/**
 * Reordena o banco de perguntas: recebe a lista de ids na nova ordem.
 * Opcionalmente troca o nome de uma seção inteira ({ renomear: { de, para } }).
 */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formulario-perguntas/order')
  const body = await readBody(event)
  const client = await serverSupabaseClient(event)
  if (body?.renomear) {
    const de = String(body.renomear.de ?? '').trim()
    const para = String(body.renomear.para ?? '').trim().slice(0, 60)
    if (!de || !para) throw createError({ statusCode: 400, message: 'Informe o nome da seção.' })
    const { error } = await client.from('formulario_perguntas').update({ secao: para }).eq('secao', de)
    if (error) throw createError({ statusCode: 500, message: 'Erro ao renomear a seção.' })
    return { success: true }
  }
  const ids: number[] = (Array.isArray(body?.ids) ? body.ids : []).map(Number).filter((n: number) => Number.isInteger(n) && n > 0).slice(0, 500)
  const resultados = await Promise.all(ids.map((id, i) => client.from('formulario_perguntas').update({ ordem: i + 1 }).eq('id', id)))
  if (resultados.some(r => r.error)) throw createError({ statusCode: 500, message: 'Erro ao reordenar.' })
  return { success: true }
})
