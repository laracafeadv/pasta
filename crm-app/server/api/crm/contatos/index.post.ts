import { serverSupabaseClient } from '#supabase/server'
import type { Contato } from '../../../../shared/types/crm'
import { requireStaff } from '../../../utils/security'
import { limparContato, registrarAtividade } from '../../../utils/crm'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'crm/create')
  const client = await serverSupabaseClient(event)
  const data = limparContato(await readBody(event))

  if (!data.telefone) throw createError({ statusCode: 400, message: 'Telefone (WhatsApp) é obrigatório.' })
  if (!data.nome) throw createError({ statusCode: 400, message: 'Nome é obrigatório.' })

  const { data: created, error } = await client.from('contatos').insert([data]).select().single()

  if (error) {
    if (error.code === '23505') throw createError({ statusCode: 409, message: 'Já existe um contato com este telefone.' })
    console.error('[crm] Erro ao criar contato:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao criar contato.' })
  }

  await registrarAtividade(event, created.id, 'Sistema', `Contato cadastrado manualmente (${created.origem || 'origem não informada'}).`, userId)
  return created as Contato
})
