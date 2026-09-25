import { serverSupabaseServiceRole } from '#supabase/server'
import { TIPOS_COMPROMISSO, dataCompromisso, type Compromisso } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'
import { carregarEscritorio } from '../../utils/escritorio'
import { entregarPeca, gerarDocx, v } from '../../utils/pecas'
import { hojeBR } from '../../utils/crm'

const br = (iso: string) => iso.split('-').reverse().join('/')

/**
 * Relatório semanal para a cliente (antigo cartão "Relatório semanal"): o que foi feito
 * nos últimos 7 dias, os próximos passos e o que precisamos dela. Só dados que a cliente
 * pode ver: nada de anotações internas, CPF ou financeiro.
 */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'pecas/relatorio-semanal')
  const contatoId = Number(getQuery(event).contato)
  if (!Number.isInteger(contatoId) || contatoId <= 0) throw createError({ statusCode: 400, message: 'Informe a cliente.' })
  const admin = serverSupabaseServiceRole(event)
  const hoje = hojeBR()
  const inicio = hojeBR(-7)
  const em30 = hojeBR(30)

  const [{ data: contato }, { data: casos }, { data: comps }, { data: docs }, escritorio] = await Promise.all([
    admin.from('contatos').select('nome, demanda').eq('id', contatoId).single(),
    admin.from('casos').select('titulo, numero_processo, orgao, status').eq('contato_id', contatoId).eq('status', 'ativo'),
    admin.from('compromissos').select('*').eq('contato_id', contatoId).limit(200),
    admin.from('documentos').select('descricao, status').eq('contato_id', contatoId).eq('status', 'pendente'),
    carregarEscritorio(admin),
  ])
  if (!contato) throw createError({ statusCode: 404, message: 'Cliente não encontrada.' })
  const C = (comps ?? []) as (Compromisso & { concluido_em: string | null })[]
  const feitos = C.filter(c => c.status === 'concluido' && c.concluido_em && c.concluido_em.slice(0, 10) >= inicio)
  const proximos = C.filter(c => c.status === 'pendente' && dataCompromisso(c) >= hoje && dataCompromisso(c) <= em30)
    .sort((a, b) => dataCompromisso(a).localeCompare(dataCompromisso(b)))

  const blocos: { titulo?: string; texto?: string; negrito?: string; centro?: boolean; espaco?: number }[] = [
    { titulo: 'Cliente:', texto: v(contato.nome, 'NOME') , espaco: 60 },
    { titulo: 'Período:', texto: `${br(inicio)} a ${br(hoje)}` },
  ]
  for (const k of casos ?? []) {
    blocos.push({ titulo: 'Caso:', texto: `${k.titulo}${k.numero_processo ? ` — processo nº ${k.numero_processo}` : ''}${k.orgao ? ` (${k.orgao})` : ''}`, espaco: 60 })
  }
  blocos.push({ negrito: 'O que foi feito nesta semana', espaco: 80 })
  if (feitos.length) for (const c of feitos) blocos.push({ texto: `• ${br(c.concluido_em!.slice(0, 10))} — ${c.titulo}`, espaco: 40 })
  else blocos.push({ texto: '[DESCREVA O ANDAMENTO DA SEMANA, OU: "Sem movimentação processual nesta semana; o caso segue em acompanhamento."]' })
  blocos.push({ negrito: 'Próximos passos', espaco: 80 })
  if (proximos.length) for (const c of proximos) blocos.push({ texto: `• ${br(dataCompromisso(c))} — ${TIPOS_COMPROMISSO[c.tipo].nome}: ${c.titulo}${c.local ? ` (${c.local})` : ''}`, espaco: 40 })
  else blocos.push({ texto: 'Nenhum prazo ou audiência marcado para os próximos 30 dias.' })
  blocos.push({ negrito: 'O que precisamos de você', espaco: 80 })
  if (docs?.length) for (const d of docs) blocos.push({ texto: `• Enviar: ${d.descricao}`, espaco: 40 })
  else blocos.push({ texto: 'Por enquanto, nada. Avisaremos se precisarmos de algum documento ou informação.' })
  blocos.push({ texto: `Qualquer dúvida, estamos à disposição. ${v(escritorio.advogada_nome ? `Dra. ${escritorio.advogada_nome}` : '', 'NOME DA ADVOGADA')}${escritorio.oab ? ` — OAB ${escritorio.oab}` : ''}.`, espaco: 0 })
  blocos.push({ texto: 'Documento confidencial, protegido pelo sigilo profissional.', centro: true })

  const buffer = await gerarDocx('RELATÓRIO SEMANAL', blocos)
  return entregarPeca(event, { buffer, contatoId, tipo: 'Relatório semanal', descricao: contato.demanda, subpasta: 'comunicacoes' })
})
