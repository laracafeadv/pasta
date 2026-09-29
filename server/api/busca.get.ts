import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../utils/security'
import { sanitizarBusca } from '../utils/crm'

interface Resultado { tipo: 'contato' | 'caso' | 'processo' | 'parte' | 'tarefa'; titulo: string; subtitulo: string; link: string }

/** Busca global: pessoa, demanda, processo/procedimento (por número), parte/interessado e tarefa. Tudo leva à ficha do cliente. */
export default defineEventHandler(async (event): Promise<Resultado[]> => {
  await requireStaff(event, 'busca')
  const q = sanitizarBusca(getQuery(event).q)
  if (q.length < 2) return []
  const client = await serverSupabaseClient(event)
  const digitos = q.replace(/\D/g, '')

  const [contatos, casos, processos, partes, tarefas] = await Promise.all([
    client.from('contatos').select('id, nome, telefone, email, etapa, demanda')
      .or(`nome.ilike.%${q}%,email.ilike.%${q}%,demanda.ilike.%${q}%${digitos.length >= 4 ? `,telefone.ilike.%${digitos}%` : ''}`).limit(6),
    client.from('casos').select('id, titulo, contato_id, contato:contatos(nome)').ilike('titulo', `%${q}%`).limit(6),
    client.from('processos').select('id, numero, natureza, orgao, contato_id, contato:contatos(nome), caso:casos(titulo)').or(`numero.ilike.%${q}%,orgao.ilike.%${q}%`).limit(6),
    client.from('partes').select('id, nome, papel, caso:casos(titulo, contato_id, contato:contatos(nome))').ilike('nome', `%${q}%`).limit(6),
    client.from('tarefas_internas').select('id, titulo').eq('concluida', false).ilike('titulo', `%${q}%`).limit(6),
  ])

  const r: Resultado[] = []
  for (const c of contatos.data ?? []) {
    const ehCliente = ['ativo', 'concluido'].includes(c.etapa)
    r.push({ tipo: 'contato', titulo: c.nome ?? 'Sem nome', subtitulo: [ehCliente ? 'Cliente' : 'Lead', c.demanda].filter(Boolean).join(' · ') || c.telefone || '', link: `/crm?abrir=${c.id}` })
  }
  for (const c of casos.data ?? []) {
    r.push({ tipo: 'caso', titulo: c.titulo ?? 'Demanda sem título', subtitulo: ['Demanda', (c.contato as any)?.nome].filter(Boolean).join(' · '), link: `/crm?abrir=${c.contato_id}&ficha=casos` })
  }
  for (const p of processos.data ?? []) {
    r.push({ tipo: 'processo', titulo: p.numero || p.orgao || 'Processo', subtitulo: [p.natureza === 'judicial' ? 'Processo judicial' : 'Procedimento extrajudicial', (p.caso as any)?.titulo, (p.contato as any)?.nome].filter(Boolean).join(' · '), link: `/crm?abrir=${p.contato_id}&ficha=casos` })
  }
  for (const p of partes.data ?? []) {
    const caso = p.caso as any
    if (caso?.contato_id) r.push({ tipo: 'parte', titulo: p.nome, subtitulo: [p.papel, caso.titulo, caso.contato?.nome].filter(Boolean).join(' · '), link: `/crm?abrir=${caso.contato_id}&ficha=casos` })
  }
  for (const t of tarefas.data ?? []) r.push({ tipo: 'tarefa', titulo: t.titulo, subtitulo: 'Tarefa', link: '/tarefas' })
  return r
})
