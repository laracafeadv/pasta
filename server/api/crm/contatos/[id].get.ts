import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { dataCompromisso, type Atividade, type Caso, type Compromisso, type Contato, type Documento, type Honorario, type MensagemWhatsapp } from '../../../../shared/types/crm'
import { requireStaff } from '../../../utils/security'
import { montarChecklist } from '../../../utils/checklist'

// Visão 360 do contato: ficha, honorários, conversa de WhatsApp e atividades.
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'crm/detail')
  const client = await serverSupabaseClient(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })

  const [contato, honorarios, mensagens, atividades, documentos, casos, compromissos, qualificacao, tarefas, marcas] = await Promise.all([
    client.from('contatos').select('*').eq('id', id).single(),
    client.from('honorarios').select('*').eq('contato_id', id).order('created_at', { ascending: false }),
    client.from('mensagens_whatsapp').select('*').eq('contato_id', id).order('id', { ascending: false }).limit(300),
    client.from('atividades').select('*, autor:profiles(name)').eq('contato_id', id).order('created_at', { ascending: false }).limit(200),
    client.from('documentos').select('*').eq('contato_id', id).order('ordem'),
    client.from('casos').select('*').eq('contato_id', id).order('created_at', { ascending: false }),
    client.from('compromissos').select('*').eq('contato_id', id).eq('status', 'pendente').order('data_limite', { ascending: true }).limit(50),
    // Checklist: só a presença de CPF/endereço interessa (os valores não saem do servidor).
    serverSupabaseServiceRole(event).from('qualificacao').select('cpf, endereco').eq('contato_id', id).maybeSingle(),
    client.from('tarefas_internas').select('id, titulo, prazo, prioridade, caso_id').eq('contato_id', id).eq('concluida', false).order('prazo').limit(50),
    client.from('checklist_marcas').select('caso_id, chave, concluido_em, autor:profiles(name)').eq('contato_id', id),
  ])

  if (contato.error || !contato.data) throw createError({ statusCode: 404, message: 'Contato não encontrado.' })
  for (const r of [honorarios, mensagens, atividades, documentos, casos, compromissos, tarefas, marcas]) if (r.error) console.error('[crm/detail] Erro parcial:', r.error)

  // "Análise da consulta" (antigo Diagnóstico): vem das respostas às perguntas dessa seção, nas demandas do cliente.
  let analise: { updated_at: string | null } | null = null
  const idsCasos = (casos.data ?? []).map(c => c.id)
  if (idsCasos.length) {
    const { data: perguntasAnalise } = await client.from('formulario_perguntas').select('id').eq('secao', 'Análise da consulta')
    const idsPerg = (perguntasAnalise ?? []).map(p => p.id)
    if (idsPerg.length) {
      const { data: ultima } = await client.from('caso_respostas').select('updated_at').in('caso_id', idsCasos).in('pergunta_id', idsPerg).order('updated_at', { ascending: false }).limit(1)
      analise = ultima?.[0] ? { updated_at: ultima[0].updated_at } : null
    }
  }

  return {
    contato: contato.data as Contato,
    honorarios: (honorarios.data ?? []) as Honorario[],
    mensagens: ((mensagens.data ?? []) as MensagemWhatsapp[]).reverse(),
    atividades: (atividades.data ?? []) as Atividade[],
    documentos: (documentos.data ?? []) as Documento[],
    casos: (casos.data ?? []) as Caso[],
    tarefas: (tarefas.data ?? []) as { id: number; titulo: string; prazo: string; prioridade: string; caso_id: number | null }[],
    compromissos: ((compromissos.data ?? []) as Compromisso[]).sort((a, b) => dataCompromisso(a).localeCompare(dataCompromisso(b))),
    checklist: montarChecklist({
      contato: contato.data as any,
      honorarios: (honorarios.data ?? []) as any[],
      documentos: (documentos.data ?? []) as any[],
      casos: (casos.data ?? []) as any[],
      qualificacao: (qualificacao.data ?? null) as any,
      analise,
      marcas: (marcas.data ?? []) as any[],
    }),
  }
})
