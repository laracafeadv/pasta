import { serverSupabaseClient } from '#supabase/server'
import { etapa, normalizarNome, normalizarTelefone } from '../../../../shared/types/crm'
import { requireStaff } from '../../../utils/security'
import { sanitizarBusca } from '../../../utils/crm'

/**
 * Checagem de conflito de interesses (Código de Ética da OAB) e de duplicidade.
 * - conflito: a parte contrária informada já é contato/cliente, ou o nome informado
 *   já aparece como parte contrária em outro caso.
 * - duplicado: mesmo telefone, e-mail ou nome.
 */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'crm/conflitos')
  const client = await serverSupabaseClient(event)
  const q = getQuery(event)
  const nome = sanitizarBusca(q.nome)
  const parte = sanitizarBusca(q.parte)
  const telefone = normalizarTelefone(String(q.telefone ?? ''))
  const email = sanitizarBusca(q.email).toLowerCase()
  const excluir = Number(q.excluir) || 0

  const filtros: string[] = []
  if (nome) filtros.push(`nome.ilike.%${nome}%`, `parte_contraria.ilike.%${nome}%`)
  if (parte) filtros.push(`nome.ilike.%${parte}%`)
  if (telefone.length >= 10) filtros.push(`telefone.eq.${telefone}`)
  if (email) filtros.push(`email.ilike.${email}`)
  if (!filtros.length) return { conflitos: [], duplicados: [] }

  const { data, error } = await client
    .from('contatos')
    .select('id, nome, telefone, email, parte_contraria, etapa')
    .or(filtros.join(','))
    .neq('id', excluir)
    .limit(50)

  if (error) {
    console.error('[crm/conflitos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao checar conflitos.' })
  }

  const n = normalizarNome(nome), p = normalizarNome(parte)
  const conflitos: { id: number; nome: string | null; motivo: string }[] = []
  const duplicados: { id: number; nome: string | null }[] = []

  for (const c of data ?? []) {
    if (p && normalizarNome(c.nome) === p) {
      conflitos.push({ id: c.id, nome: c.nome, motivo: `A parte contrária já está cadastrada como contato/cliente (${etapa(c.etapa).nome}).` })
    }
    if (n && normalizarNome(c.parte_contraria) === n) {
      conflitos.push({ id: c.id, nome: c.nome, motivo: 'Este nome consta como parte contrária no caso deste contato.' })
    }
    if ((telefone.length >= 10 && c.telefone === telefone) || (email && c.email?.toLowerCase() === email) || (n && normalizarNome(c.nome) === n)) {
      duplicados.push({ id: c.id, nome: c.nome })
    }
  }
  // Partes e interessados cadastrados nas demandas (parte contrária, herdeiros…): o nome informado já aparece em outra demanda?
  if (n.length >= 3) {
    const { data: partes } = await client.from('partes').select('nome, papel, caso:casos(titulo, contato_id, contato:contatos(id, nome))').ilike('nome', `%${nome}%`).limit(20)
    for (const p of partes ?? []) {
      const caso = p.caso as any
      if (!caso?.contato || caso.contato.id === excluir || normalizarNome(p.nome) !== n) continue
      conflitos.push({ id: caso.contato.id, nome: caso.contato.nome, motivo: `Este nome consta como "${p.papel}" na demanda "${caso.titulo}".` })
    }
  }
  return { conflitos, duplicados }
})
