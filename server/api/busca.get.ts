import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../utils/security'
import { sanitizarBusca } from '../utils/crm'

interface Resultado { tipo: 'contato' | 'caso' | 'tarefa' | 'documento' | 'recibo'; titulo: string; subtitulo: string; link: string }

export default defineEventHandler(async (event): Promise<Resultado[]> => {
  await requireStaff(event, 'busca')
  const q = sanitizarBusca(getQuery(event).q)
  if (q.length < 2) return []
  const client = await serverSupabaseClient(event)
  const digitos = q.replace(/\D/g, '')

  const [contatos, casos, tarefas, recibos] = await Promise.all([
    client.from('contatos').select('id, nome, telefone, email, etapa, demanda')
      .or(`nome.ilike.%${q}%,email.ilike.%${q}%,demanda.ilike.%${q}%${digitos.length >= 4 ? `,telefone.ilike.%${digitos}%` : ''}`).limit(6),
    client.from('casos').select('id, titulo, numero_processo, contato_id, contato:contatos(nome)').or(`titulo.ilike.%${q}%,numero_processo.ilike.%${q}%`).limit(6),
    client.from('tarefas_internas').select('id, titulo').eq('concluida', false).ilike('titulo', `%${q}%`).limit(6),
    client.from('recibos').select('id, nome_cliente, referente_a, valor').or(`nome_cliente.ilike.%${q}%,referente_a.ilike.%${q}%`).limit(6),
  ])

  const resultados: Resultado[] = []
  for (const c of contatos.data ?? []) {
    const ehCliente = ['ativo', 'concluido'].includes(c.etapa)
    resultados.push({ tipo: 'contato', titulo: c.nome ?? 'Sem nome', subtitulo: [ehCliente ? 'Cliente' : 'Lead', c.demanda].filter(Boolean).join(' · ') || c.telefone || '', link: `/crm?abrir=${c.id}` })
  }
  for (const c of casos.data ?? []) {
    resultados.push({ tipo: 'caso', titulo: c.titulo ?? 'Caso sem título', subtitulo: [c.numero_processo, (c.contato as any)?.nome].filter(Boolean).join(' · '), link: `/crm?abrir=${c.contato_id}&ficha=casos` })
  }
  for (const t of tarefas.data ?? []) {
    resultados.push({ tipo: 'tarefa', titulo: t.titulo, subtitulo: 'Tarefa', link: '/tarefas' })
  }
  for (const r of recibos.data ?? []) {
    resultados.push({ tipo: 'recibo', titulo: `Recibo — ${r.nome_cliente}`, subtitulo: `${r.referente_a} · R$ ${Number(r.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, link: `/api/recibos/${r.id}/pdf` })
  }
  return resultados
})
