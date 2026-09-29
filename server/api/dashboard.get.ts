import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../utils/security'
import { hojeBR } from '../utils/crm'
import { montarDashboard, type EntradaDashboard } from '../utils/dashboard'

/**
 * Dashboard: uma única chamada que reúne o que o Hoje, as Tarefas, os Prazos, os Clientes e o
 * Financeiro já guardam. Nada é gravado aqui e nenhum dado novo é criado. Cada tabela é lida uma
 * vez (colunas mínimas, com limite) e a conta é feita em memória.
 * Lançamentos financeiros só vão para a administração.
 */
export default defineEventHandler(async (event) => {
  const { role } = await requireStaff(event, 'dashboard')
  const client = await serverSupabaseClient(event)
  const hoje = hojeBR()
  const agora = Date.now()
  const dias = [7, 30, 90].includes(Number(getQuery(event).dias)) ? Number(getQuery(event).dias) : 30
  const desde = new Date(agora - dias * 864e5).toISOString()
  const ler = (q: PromiseLike<{ data: unknown; error: unknown }>, nome: string) => q.then((r) => {
    if (r.error) console.error(`[dashboard] ${nome}:`, r.error)
    return (r.data ?? []) as any[]
  })
  const contar = (q: PromiseLike<{ count: number | null; error: unknown }>, nome: string) => q.then((r) => {
    if (r.error) console.error(`[dashboard] ${nome}:`, r.error)
    return r.count ?? 0
  })

  const [contatos, casos, compromissos, tarefas, docs, honorarios, atividades, envios, mensagens, tarefasConcluidas, prazosCumpridos, lancamentos] = await Promise.all([
    ler(client.from('contatos').select('id, nome, etapa, created_at, proxima_acao, proxima_data, ultima_mensagem_em, nao_contatar, sugestao_resposta').limit(2000), 'contatos'),
    ler(client.from('casos').select('id, titulo, status, contato:contatos(id, nome), processos(fase, status, natureza)').limit(1000), 'casos'),
    ler(client.from('compromissos')
      .select('id, tipo, titulo, inicio, data_limite, local, contato_id, caso_id, contato:contatos(id, nome), caso:casos(id, titulo)')
      .eq('status', 'pendente').limit(500), 'compromissos'),
    ler(client.from('tarefas_internas')
      .select('id, titulo, prazo, prioridade, contato_id, caso_id, contato:contatos(id, nome), caso:casos(id, titulo)')
      .eq('concluida', false).order('prazo').limit(500), 'tarefas'),
    ler(client.from('documentos').select('contato_id').eq('status', 'pendente').eq('obrigatorio', true).limit(2000), 'documentos'),
    ler(client.from('honorarios').select('status, tipo, valor, created_at, data_contratacao').limit(2000), 'honorarios'),
    ler(client.from('atividades').select('id, created_at, tipo, texto, contato_id, contato:contatos(id, nome)').order('created_at', { ascending: false }).limit(30), 'atividades'),
    ler(client.from('formulario_envios').select('contato_id, status, created_at, respondido_em, contato:contatos(id, nome)').gte('created_at', new Date(agora - 60 * 864e5).toISOString()).limit(500), 'formularios'),
    ler(client.from('mensagens_whatsapp').select('contato_id, direcao, created_at').order('created_at', { ascending: false }).limit(300), 'mensagens'),
    contar(client.from('tarefas_internas').select('id', { count: 'exact', head: true }).eq('concluida', true).gte('updated_at', desde), 'tarefas concluídas'),
    contar(client.from('compromissos').select('id', { count: 'exact', head: true }).eq('tipo', 'prazo').eq('status', 'concluido').gte('concluido_em', desde), 'prazos cumpridos'),
    // Contas a receber são da administração: a equipe não recebe esses dados.
    role === 'admin'
      ? ler(serverSupabaseServiceRole(event).from('lancamentos').select('tipo, valor, vencimento, pago_em').limit(5000), 'lancamentos')
      : Promise.resolve(null),
  ])

  return montarDashboard({
    hoje, agora, dias, papel: role === 'admin' ? 'admin' : 'equipe',
    contatos, casos, compromissos, tarefas, honorarios, atividades, envios, mensagens, lancamentos,
    docsPendentes: docs, tarefasConcluidas, prazosCumpridos,
  } as EntradaDashboard)
})
