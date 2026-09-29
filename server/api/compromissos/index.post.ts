import { serverSupabaseClient } from '#supabase/server'
import { TIPOS_COMPROMISSO } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'
import { limparCompromisso } from '../../utils/compromissos'
import { registrarAtividade } from '../../utils/crm'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'compromissos/create')
  const d = limparCompromisso(await readBody(event))
  if (!d.titulo || !d.tipo) throw createError({ statusCode: 400, message: 'Informe tipo e descrição.' })
  if (!d.inicio && !d.data_limite) throw createError({ statusCode: 400, message: 'Informe a data.' })
  const { data, error } = await (await serverSupabaseClient(event)).from('compromissos').insert({ responsavel_id: userId, ...d }).select().single()
  if (error) {
    console.error('[compromissos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao salvar o compromisso.' })
  }
  if (data.contato_id) await registrarAtividade(event, data.contato_id, 'Sistema', `${TIPOS_COMPROMISSO[data.tipo as keyof typeof TIPOS_COMPROMISSO].nome} agendado: ${data.titulo}.`, userId, null, data.caso_id ?? null)
  await auditar(event, 'criou compromisso', 'compromisso', data.id, { tipo: data.tipo })
  return data
})
