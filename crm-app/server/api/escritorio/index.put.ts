import { serverSupabaseServiceRole } from '#supabase/server'
import { ESCRITORIO_CAMPOS } from '../../../shared/types/crm'
import { requireAdmin } from '../../utils/security'
import { auditar } from '../../utils/auditoria'
import { carregarEscritorio } from '../../utils/escritorio'

export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'escritorio/put')
  const body = await readBody<Record<string, unknown>>(event)
  const linhas = ESCRITORIO_CAMPOS
    .filter(c => body && c.chave in body)
    .map(c => ({ chave: c.chave, valor: String(body[c.chave] ?? '').trim().slice(0, 500), updated_at: new Date().toISOString() }))
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
