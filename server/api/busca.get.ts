import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../utils/security'
import { sanitizarBusca } from '../utils/crm'

interface Resultado { tipo: 'contato' | 'caso' | 'tarefa'; titulo: string; subtitulo: string; link: string }

export default defineEventHandler(async (event): Promise<Resultado[]> => {
  await requireStaff(event, 'busca')
  const q = sanitizarBusca(getQuery(event).q)
  if (q.length < 2) return []
  const client = await serverSupabaseClient(event)
  const digitos = q.replace(/\D/g, '')

  const [contatos, casos, tarefas] = await Promise.all([
    client.from('contatos').select('id, nome, telefone, email, etapa, demanda, parte_contraria')
      .or(`nome.ilike.%${q}%,email.ilike.%${q}%,demanda.ilike.%${q}%,parte_contraria.ilike.%${q}%${digitos.length >= 4 ? `,telefone.ilike.%${digitos}%` : ''}`).limit(6),
    client.from('casos').select('id, titulo, numero_processo, contato_id, contato:contatos(nome)').or(`titulo.ilike.%${q}%,numero_processo.ilike.%${q}%,parte_contraria.ilike.%${q}%`).limit(6),
    client.from('tarefas_internas').select('id, titulo').eq('concluida', false).ilike('titulo', `%${q}%`).limit(6),
  ])

  const resultados: Resultado[] = []
  for (const c of contatos.data ?? []) {
    const ehCliente = ['ativo', 'concluido'].includes(c.etapa)
    resultados.push({ tipo: 'contato', titulo: c.nome ?? 'Sem nome', subtitulo: [ehCliente ? 'Cliente' : 'Lead', c.demanda, c.parte_contraria ? `x ${c.parte_contraria}` : null].filter(Boolean).join(' · ') || c.telefone || '', link: `/crm?abrir=${c.id}` })
  }
  for (const c of casos.data ?? []) {
    resultados.push({ tipo: 'caso', titulo: c.titulo ?? 'Demanda sem título', subtitulo: ['Demanda', c.numero_processo, (c.contato as any)?.nome].filter(Boolean).join(' · '), link: `/crm?abrir=${c.contato_id}&ficha=casos` })
  }
  for (const t of tarefas.data ?? []) {
    resultados.push({ tipo: 'tarefa', titulo: t.titulo, subtitulo: 'Tarefa', link: '/clientes?aba=tarefas' })
  }
  return resultados
})
