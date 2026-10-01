import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { dataCompromisso, type DemandaNota, type Atividade, type Demanda, type Compromisso, type Contato, type Documento, type Honorario, type MensagemWhatsapp, type Movimentacao, type Parte, type Processo } from '../../../../shared/types/crm'
import type { ProcessoEtapa, ProcessoPendencia } from '../../../../shared/data/procedimentos'
import { requireStaff } from '../../../utils/security'
import { montarChecklist } from '../../../utils/checklist'

// Visão 360 do contato: ficha, honorários, conversa de WhatsApp e atividades.
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'crm/detail')
  const client = await serverSupabaseClient(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })

  const [contato, honorarios, mensagens, atividades, documentos, casos, compromissos, qualificacao, tarefas, marcas, processos] = await Promise.all([
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
    client.from('processos').select('*').eq('contato_id', id).order('created_at', { ascending: false }),
  ])

  if (contato.error || !contato.data) throw createError({ statusCode: 404, message: 'Contato não encontrado.' })
  for (const r of [honorarios, mensagens, atividades, documentos, casos, compromissos, tarefas, marcas, processos]) if (r.error) console.error('[crm/detail] Erro parcial:', r.error)

  // Análise do escritório (antigo Diagnóstico): vem dos campos próprios da demanda.
  const idsCasos0 = (casos.data ?? []).map(c => c.id)
  const [notasQ, equipeQ] = await Promise.all([
    idsCasos0.length ? client.from('demanda_notas').select('id, created_at, caso_id, tipo, texto, autor_id, autor:profiles(name)').in('caso_id', idsCasos0).order('created_at', { ascending: false }).order('id', { ascending: false }) : Promise.resolve({ data: [] as any[] }),
    client.from('profiles').select('id, name').in('role', ['admin', 'equipe']),
  ])
  const notas = ((notasQ.data ?? []) as any[]).map(n => ({ id: n.id, created_at: n.created_at, caso_id: n.caso_id, tipo: n.tipo, texto: n.texto, autor_id: n.autor_id, autor_nome: n.autor?.name ?? null })) as DemandaNota[]
  const responsaveis = Object.fromEntries(((equipeQ.data ?? []) as { id: string; name: string | null }[]).map(p => [p.id, p.name ?? '—']))
  const comAnalise = [
    ...(casos.data ?? []).filter(c => c.analise || c.fatos || c.estrategia || c.conclusao || c.decisao || c.riscos).map(c => c.updated_at as string),
    ...notas.map(n => n.created_at),
  ].sort().reverse()
  const analise: { updated_at: string | null } | null = comAnalise.length ? { updated_at: comAnalise[0] ?? null } : null
  const idsCasos = (casos.data ?? []).map(c => c.id)

  // Partes das demandas e movimentações dos processos (carregadas juntas: são poucas por cliente).
  const idsProcessos = (processos.data ?? []).map(p => p.id)
  const [partes, movimentacoes, etapas, pendencias, participacoes] = await Promise.all([
    idsCasos.length ? client.from('partes').select('*, contato:contatos(id, nome, etapa)').in('caso_id', idsCasos).order('id') : Promise.resolve({ data: [] as Parte[] }),
    idsProcessos.length ? client.from('movimentacoes').select('*').in('processo_id', idsProcessos).order('data', { ascending: false }).order('id', { ascending: false }).limit(400) : Promise.resolve({ data: [] as Movimentacao[] }),
    idsProcessos.length ? client.from('processo_etapas').select('*').in('processo_id', idsProcessos).order('ordem') : Promise.resolve({ data: [] as ProcessoEtapa[] }),
    idsProcessos.length ? client.from('processo_pendencias').select('*').in('processo_id', idsProcessos).order('created_at') : Promise.resolve({ data: [] as ProcessoPendencia[] }),
    // Onde ESTA pessoa aparece como parte/interessada em demandas (de outros clientes, ou dela mesma).
    client.from('partes').select('id, papel, polo, caso_id, caso:casos(id, titulo, contato_id, cliente:contatos(id, nome))').eq('contato_id', id).order('id', { ascending: false }).limit(100),
  ])

  return {
    contato: contato.data as Contato,
    honorarios: (honorarios.data ?? []) as Honorario[],
    mensagens: ((mensagens.data ?? []) as MensagemWhatsapp[]).reverse(),
    atividades: (atividades.data ?? []) as Atividade[],
    documentos: (documentos.data ?? []) as Documento[],
    casos: (casos.data ?? []) as Demanda[],
    notas,
    responsaveis,
    processos: (processos.data ?? []) as Processo[],
    partes: (partes.data ?? []) as Parte[],
    participacoes: ((participacoes.data ?? []) as any[]).filter(x => x.caso && x.caso.contato_id !== id).map(x => ({ id: x.id as number, papel: x.papel as string, polo: x.polo as string | null, caso_id: x.caso_id as number, demanda: x.caso.titulo as string, cliente_id: x.caso.contato_id as number, cliente: (x.caso.cliente?.nome ?? '—') as string })),
    movimentacoes: (movimentacoes.data ?? []) as Movimentacao[],
    etapas: (etapas.data ?? []) as ProcessoEtapa[],
    pendencias: (pendencias.data ?? []) as ProcessoPendencia[],
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
