import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../utils/security'
import { auditar } from '../../utils/auditoria'
import { CHAVES_PERMITIDAS, carregarEscritorio } from '../../utils/escritorio'

export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'escritorio/put')
  const body = await readBody<Record<string, unknown>>(event)
  const linhas = Object.keys(body ?? {})
    .filter(k => CHAVES_PERMITIDAS.has(k))
    .map(k => ({ chave: k, valor: String(body[k] ?? '').trim().slice(0, 2000), updated_at: new Date().toISOString() }))
  const admin = serverSupabaseServiceRole(event)
  if (linhas.length) {
    const { error } = await admin.from('escritorio').upsert(linhas, { onConflict: 'chave' })
    if (error) {
      console.error('[escritorio] Erro:', error)
      throw createError({ statusCode: 500, message: 'Erro ao salvar os dados do escritório.' })
    }
    await auditar(event, 'alterou dados do escritório', 'escritorio', null, { campos: linhas.map(l => l.chave) })
  }
  return carregarEscritorio(admin)
})
