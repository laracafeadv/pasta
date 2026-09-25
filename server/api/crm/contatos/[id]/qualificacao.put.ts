import { serverSupabaseServiceRole } from '#supabase/server'
import { CAMPOS_CONFIDENCIAIS, QUALIFICACAO_CAMPOS, UFS, pick } from '../../../../../shared/types/crm'
import { cpfValido, mascararDocumento } from '../../../../../shared/utils/juridico'
import { requireStaff } from '../../../../utils/security'
import { auditar, camposAlterados } from '../../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  const { userId, role } = await requireStaff(event, 'qualificacao/put')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })

  const admin = serverSupabaseServiceRole(event)
  const { data: atual } = await admin.from('qualificacao').select('*').eq('contato_id', id).maybeSingle()
  const dados = pick(await readBody(event), QUALIFICACAO_CAMPOS) as Record<string, any>

  for (const [k, v] of Object.entries(dados)) dados[k] = v == null ? null : String(v).trim().slice(0, 300) || null

  // Campo confidencial que volta mascarado (ou com *) = sem alteração: mantém o que está no banco.
  for (const c of CAMPOS_CONFIDENCIAIS) {
    if (!(c in dados)) continue
    const v = dados[c]
    if (v && (v.includes('*') || v === mascararDocumento(atual?.[c]))) {
      dados[c] = atual?.[c] ?? null
      continue
    }
    if (c === 'cpf' && v) {
      if (!cpfValido(v)) throw createError({ statusCode: 400, message: 'CPF inválido.' })
      dados.cpf = v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
  }
  if (dados.uf && !UFS.includes(dados.uf.toUpperCase())) throw createError({ statusCode: 400, message: 'UF inválida.' })
  if (dados.uf) dados.uf = dados.uf.toUpperCase()

  const { error } = await admin.from('qualificacao').upsert({ contato_id: id, ...dados, updated_at: new Date().toISOString(), updated_by: userId })
  if (error) {
    console.error('[qualificacao] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao salvar a qualificação.' })
  }
  const alterados = camposAlterados(atual, dados)
  if (alterados.length) await auditar(event, 'editou qualificação do cliente', 'contato', id, { campos: alterados })

  const { data } = await admin.from('qualificacao').select('*').eq('contato_id', id).single()
  if (role !== 'admin') {
    for (const c of CAMPOS_CONFIDENCIAIS) data[c] = mascararDocumento(data[c])
    data.mascarado = true
  }
  return data
})
