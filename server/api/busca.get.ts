import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../utils/security'
import { sanitizarBusca } from '../utils/crm'

interface Resultado { tipo: 'contato' | 'caso' | 'tarefa' | 'documento'; titulo: string; subtitulo: string; link: string }

export default defineEventHandler(async (event): Promise<Resultado[]> => {
  await requireStaff(event, 'busca')
  const q = sanitizarBusca(getQuery(event).q)
  if (q.length < 2) return []
  const client = await serverSupabaseClient(event)

  const [contatos, casos, tarefas, documentos] = await Promise.all([
    client.from('contatos').select('id, nome, telefone, etapa, demanda').or(`nome.ilike.%${q}%,telefone.ilike.%${q}%`).limit(6),
    client.from('casos').select('id, titulo, numero_processo, contato_id, contato:contatos(nome)').or(`titulo.ilike.%${q}%,numero_processo.ilike.%${q}%`).limit(6),
    client.from('tarefas_internas').select('id, titulo, coluna').eq('concluida', false).ilike('titulo', `%${q}%`).limit(6),
    client.from('documentos').select('id, descricao, contato_id, contato:contatos(nome)').ilike('descricao', `%${q}%`).limit(6),
  ])

  const resultados: Resultado[] = []
  for (const c of contatos.data ?? []) {
    resultados.push({ tipo: 'contato', titulo: c.nome ?? 'Sem nome', subtitulo: [c.etapa, c.demanda].filter(Boolean).join(' · ') || c.telefone || '', link: `/crm?abrir=${c.id}` })
  }
  for (const c of casos.data ?? []) {
    resultados.push({ tipo: 'caso', titulo: c.titulo ?? 'Caso sem título', subtitulo: [c.numero_processo, (c.contato as any)?.nome].filter(Boolean).join(' · '), link: `/crm?abrir=${c.contato_id}&ficha=casos` })
  }
  for (const t of tarefas.data ?? []) {
    resultados.push({ tipo: 'tarefa', titulo: t.titulo, subtitulo: 'Tarefa interna', link: '/crm' })
  }
  for (const d of documentos.data ?? []) {
    resultados.push({ tipo: 'documento', titulo: d.descricao, subtitulo: `Documento de ${(d.contato as any)?.nome ?? 'cliente'}`, link: `/crm?abrir=${d.contato_id}&ficha=documentos` })
  }
  return resultados
})
