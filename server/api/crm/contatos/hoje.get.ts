import { serverSupabaseClient } from '#supabase/server'
import { dataCompromisso, type Compromisso, type Contato } from '../../../../shared/types/crm'
import { requireStaff } from '../../../utils/security'
import { hojeBR } from '../../../utils/crm'
import { enviarLembretes } from '../../../utils/lembretes'

// "O que precisa de você hoje": todo caso aberto deve ter uma próxima ação com data.
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'crm/hoje')
  const client = await serverSupabaseClient(event)
  const hoje = hojeBR()
  const em7 = hojeBR(7)

  const { data, error } = await client
    .from('contatos')
    .select('*')
    .not('etapa', 'in', '(concluido,perdido)')
    .order('proxima_data', { ascending: true, nullsFirst: true })
    .limit(500)

  if (error) {
    console.error('[crm/hoje] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao montar a agenda.' })
  }

  const abertos = (data ?? []) as Contato[]

  // Aniversariantes do dia (clientes e contatos), para o gesto de relacionamento do playbook.
  const mmdd = hoje.slice(5)
  const { data: nascidos } = await client.from('contatos').select('id, nome, telefone, data_nascimento, classificacao').not('data_nascimento', 'is', null).limit(2000)
  const aniversarios = (nascidos ?? []).filter(c => String(c.data_nascimento).slice(5) === mmdd)
  const semAcao = (c: Contato) => !c.proxima_acao || !c.proxima_data

  // Prazos e compromissos: vencidos, de hoje e dos próximos 3 dias.
  const em3 = hojeBR(3)
  const { data: agenda } = await client.from('compromissos')
    .select('*, contato:contatos(id, nome), caso:casos(id, titulo, numero_processo)')
    .eq('status', 'pendente').limit(300)
  const compromissos = ((agenda ?? []) as Compromisso[])
    .filter(c => { const d = dataCompromisso(c); return d && d <= em3 })
    .sort((a, b) => dataCompromisso(a).localeCompare(dataCompromisso(b)))

  // Lembretes automáticos de prazos (uma vez por dia, na primeira abertura).
  await enviarLembretes(event).catch(e => console.error('[crm/hoje] Lembretes:', e))

  // Relatório semanal (quadro antigo, "Mensagens de WhatsApp"): cliente ativo sem notícia há 7+ dias.
  const seteDias = Date.now() - 7 * 864e5
  const semRelatorio = abertos.filter((c) => {
    if (c.etapa !== 'ativo' || c.nao_contatar) return false
    const ultimo = [c.ultimo_contato_em, c.ultima_mensagem_em].filter(Boolean).sort().at(-1)
    return !ultimo || new Date(ultimo).getTime() < seteDias
  })

  return {
    semRelatorio,
    compromissos,
    atrasadas: abertos.filter(c => !semAcao(c) && c.proxima_data! < hoje),
    hoje: abertos.filter(c => !semAcao(c) && c.proxima_data === hoje),
    semAcao: abertos.filter(semAcao).sort((a, b) => a.updated_at.localeCompare(b.updated_at)),
    semana: abertos.filter(c => !semAcao(c) && c.proxima_data! > hoje && c.proxima_data! <= em7),
    transferidas: abertos.filter(c => !c.ia_ativa),
    sugestoes: abertos.filter(c => c.sugestao_resposta),
    aniversarios,
  }
})
