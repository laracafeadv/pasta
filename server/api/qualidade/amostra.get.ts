import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'

/** Sorteia casos ativos que não foram revisados nos últimos 30 dias (auditoria interna por amostragem). */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'qualidade/amostra')
  const n = Math.min(10, Math.max(1, Number(getQuery(event).n) || 3))
  const client = await serverSupabaseClient(event)
  const desde = new Date(Date.now() - 30 * 864e5).toISOString()
  const [{ data: casos }, { data: recentes }] = await Promise.all([
    client.from('casos').select('id, titulo, contato_id, contato:contatos(id, nome), processos(numero)').eq('status', 'ativo').limit(1000),
    client.from('revisoes').select('caso_id').gte('created_at', desde).limit(1000),
  ])
  const revisados = new Set((recentes ?? []).map(r => r.caso_id))
  const candidatos = (casos ?? []).filter(c => !revisados.has(c.id))
  for (let i = candidatos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidatos[i], candidatos[j]] = [candidatos[j]!, candidatos[i]!]
  }
  return candidatos.slice(0, n).map(c => ({ ...c, numero_processo: (c as any).processos?.find((p: { numero: string | null }) => p.numero)?.numero ?? null }))
})
