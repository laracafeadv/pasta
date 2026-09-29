import { TIPOS_INTIMACAO } from '../../shared/types/crm'
import { calcularPrazo } from '../../shared/utils/juridico'
import { registrarAtividade } from './crm'

const hojeSP = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
const somarDias = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const dataBR = (iso: string) => iso.split('-').reverse().join('/')
const erro = (statusCode: number, message: string) => createError({ statusCode, message })
const DATA = /^\d{4}-\d{2}-\d{2}$/

export interface IntimacaoEntrada { processo_id: number; data_publicacao: string; tipo: string; conteudo: string | null; dias_prazo: number | null; data_trabalho: string | null }

/** Valida o corpo de uma intimação (registro manual). */
export function limparIntimacao(body: any, { parcial = false }: { parcial?: boolean } = {}): Partial<IntimacaoEntrada> {
  const d: Partial<IntimacaoEntrada> = {}
  if (!parcial || 'processo_id' in body) { d.processo_id = Number(body?.processo_id); if (!Number.isInteger(d.processo_id) || d.processo_id <= 0) throw erro(400, 'Escolha o processo judicial.') }
  if (!parcial || 'data_publicacao' in body) { d.data_publicacao = String(body?.data_publicacao ?? ''); if (!DATA.test(d.data_publicacao)) throw erro(400, 'Informe a data da publicação/intimação.') }
  if (!parcial || 'tipo' in body) { d.tipo = String(body?.tipo ?? ''); if (!(TIPOS_INTIMACAO as readonly string[]).includes(d.tipo)) throw erro(400, 'Escolha o tipo da intimação.') }
  if ('conteudo' in body) d.conteudo = String(body.conteudo ?? '').trim().slice(0, 4000) || null
  if ('dias_prazo' in body) {
    const n = body.dias_prazo === '' || body.dias_prazo == null ? null : Number(body.dias_prazo)
    if (n != null && !(Number.isInteger(n) && n >= 1 && n <= 365)) throw erro(400, 'O prazo é de 1 a 365 dias úteis.')
    d.dias_prazo = n
  }
  if ('data_trabalho' in body) { const t = body.data_trabalho ? String(body.data_trabalho) : null; if (t && !DATA.test(t)) throw erro(400, 'Data de trabalho inválida.'); d.data_trabalho = t }
  return d
}

/** Data em que o escritório trabalha o prazo: por padrão 2 dias antes do vencimento (nunca no passado). */
export function dataTrabalhoPadrao(vencimento: string, hoje = hojeSP()) {
  const alvo = somarDias(vencimento, -2)
  return alvo < hoje ? hoje : alvo
}

/**
 * Registra a intimação e faz o que ela pede: o PRAZO (dias úteis, vence no dia calculado) na agenda, a TAREFA de trabalho,
 * o ANDAMENTO no processo e o histórico. Sem prazo informado, nasce uma tarefa "analisar e definir o prazo" para hoje:
 * intimação nunca fica sem próxima ação.
 */
export async function registrarIntimacao(event: any, client: any, entrada: IntimacaoEntrada, userId: string | null) {
  const { data: p } = await client.from('processos').select('id, natureza, numero, caso_id, contato_id, status, caso:casos(titulo)').eq('id', entrada.processo_id).maybeSingle()
  if (!p) throw erro(404, 'Processo não encontrado.')
  if (p.natureza !== 'judicial') throw erro(400, 'Intimação é de processo judicial. No procedimento extrajudicial registre a exigência em "Exigências / pendências".')
  const { data: i, error } = await client.from('intimacoes').insert({
    processo_id: p.id, caso_id: p.caso_id, contato_id: p.contato_id, data_publicacao: entrada.data_publicacao, tipo: entrada.tipo,
    conteudo: entrada.conteudo, dias_prazo: entrada.dias_prazo, responsavel_id: userId,
  }).select().single()
  if (error || !i) throw erro(500, 'Não foi possível registrar a intimação.')
  const rotulo = `${entrada.tipo}${p.numero ? ` — ${p.numero}` : ''}`
  let vencimento: string | null = null
  let conferir: string[] = []
  let ignorados: string[] = []
  const upd: Record<string, any> = {}
  if (entrada.dias_prazo) {
    const c = calcularPrazo(entrada.data_publicacao, entrada.dias_prazo)
    vencimento = c.vencimento; conferir = c.conferir; ignorados = c.ignorados
    const { data: comp } = await client.from('compromissos').insert({
      tipo: 'prazo', titulo: `Prazo: ${rotulo}`, contato_id: p.contato_id, caso_id: p.caso_id, processo_id: p.id,
      data_publicacao: entrada.data_publicacao, dias_prazo: entrada.dias_prazo, data_limite: vencimento, responsavel_id: userId,
    }).select('id').single()
    if (comp) upd.compromisso_id = comp.id
  }
  const trabalho = entrada.data_trabalho ?? (vencimento ? dataTrabalhoPadrao(vencimento) : hojeSP())
  const { data: tar } = await client.from('tarefas_internas').insert({
    titulo: vencimento ? `Cumprir prazo (${entrada.tipo}) — vence ${dataBR(vencimento)}` : `Analisar intimação (${entrada.tipo}) e definir o prazo`,
    descricao: entrada.conteudo, prazo: trabalho, prioridade: 'alta', contato_id: p.contato_id, caso_id: p.caso_id, processo_id: p.id,
  }).select('id').single()
  if (tar) upd.tarefa_id = tar.id
  if (Object.keys(upd).length) await client.from('intimacoes').update(upd).eq('id', i.id)
  await client.from('movimentacoes').insert({
    processo_id: p.id, data: entrada.data_publicacao, tipo: 'Publicação / intimação', autor_id: userId,
    texto: `${entrada.tipo}${entrada.conteudo ? `: ${entrada.conteudo.slice(0, 400)}` : ''}${vencimento ? ` — prazo de ${entrada.dias_prazo} dias úteis, vence em ${dataBR(vencimento)}.` : ' — prazo a definir.'}`,
  })
  await registrarAtividade(event, p.contato_id, 'Andamento', `Intimação registrada em ${p.caso?.titulo ?? 'demanda'}: ${rotulo}${vencimento ? ` (prazo até ${dataBR(vencimento)})` : ' (prazo a definir)'}.`, userId, null, p.caso_id, p.id)
  return { intimacao: { ...i, ...upd }, vencimento, conferir, ignorados, dataTrabalho: trabalho }
}

/** Define (ou corrige) o prazo de uma intimação já registrada: cria ou atualiza o prazo na agenda e a tarefa. */
export async function definirPrazoIntimacao(event: any, client: any, id: number, dias: number, dataPublicacao: string | null, userId: string | null) {
  const { data: i } = await client.from('intimacoes').select('*').eq('id', id).maybeSingle()
  if (!i) throw erro(404, 'Intimação não encontrada.')
  if (i.status === 'tratada') throw erro(409, 'Intimação já tratada: reabra para alterar o prazo.')
  const pub = dataPublicacao ?? i.data_publicacao
  const c = calcularPrazo(pub, dias)
  const { data: p } = await client.from('processos').select('numero').eq('id', i.processo_id).maybeSingle()
  const rotulo = `${i.tipo}${p?.numero ? ` — ${p.numero}` : ''}`
  let compId = i.compromisso_id
  if (compId) await client.from('compromissos').update({ data_publicacao: pub, dias_prazo: dias, data_limite: c.vencimento, updated_at: new Date().toISOString() }).eq('id', compId)
  else {
    const { data: comp } = await client.from('compromissos').insert({ tipo: 'prazo', titulo: `Prazo: ${rotulo}`, contato_id: i.contato_id, caso_id: i.caso_id, processo_id: i.processo_id, data_publicacao: pub, dias_prazo: dias, data_limite: c.vencimento, responsavel_id: userId }).select('id').single()
    compId = comp?.id ?? null
  }
  const trabalho = dataTrabalhoPadrao(c.vencimento)
  const titulo = `Cumprir prazo (${i.tipo}) — vence ${dataBR(c.vencimento)}`
  if (i.tarefa_id) await client.from('tarefas_internas').update({ titulo, prazo: trabalho, updated_at: new Date().toISOString() }).eq('id', i.tarefa_id)
  else {
    const { data: tar } = await client.from('tarefas_internas').insert({ titulo, descricao: i.conteudo, prazo: trabalho, prioridade: 'alta', contato_id: i.contato_id, caso_id: i.caso_id, processo_id: i.processo_id }).select('id').single()
    if (tar) await client.from('intimacoes').update({ tarefa_id: tar.id }).eq('id', id)
  }
  await client.from('intimacoes').update({ dias_prazo: dias, data_publicacao: pub, compromisso_id: compId }).eq('id', id)
  await registrarAtividade(event, i.contato_id, 'Sistema', `Prazo da intimação definido: ${dias} dias úteis, vence em ${dataBR(c.vencimento)}.`, userId, null, i.caso_id, i.processo_id)
  return { vencimento: c.vencimento, conferir: c.conferir, ignorados: c.ignorados, dataTrabalho: trabalho }
}

/** Marca a intimação como tratada (e dá baixa no prazo e na tarefa) — ou reabre. */
export async function tratarIntimacao(event: any, client: any, id: number, { obs, reabrir }: { obs?: string; reabrir?: boolean }, userId: string | null) {
  const { data: i } = await client.from('intimacoes').select('*').eq('id', id).maybeSingle()
  if (!i) throw erro(404, 'Intimação não encontrada.')
  const agora = new Date().toISOString()
  if (reabrir) {
    if (i.status !== 'tratada') throw erro(409, 'A intimação não está tratada.')
    await client.from('intimacoes').update({ status: 'a_tratar', tratada_em: null, tratada_obs: null }).eq('id', id)
    if (i.compromisso_id) await client.from('compromissos').update({ status: 'pendente', concluido_em: null }).eq('id', i.compromisso_id)
    if (i.tarefa_id) await client.from('tarefas_internas').update({ concluida: false }).eq('id', i.tarefa_id)
    await registrarAtividade(event, i.contato_id, 'Sistema', `Intimação reaberta (${i.tipo}).`, userId, null, i.caso_id, i.processo_id)
    return { status: 'a_tratar' }
  }
  if (i.status === 'tratada') throw erro(409, 'Já está tratada.')
  await client.from('intimacoes').update({ status: 'tratada', tratada_em: agora, tratada_obs: String(obs ?? '').trim().slice(0, 1000) || null }).eq('id', id)
  if (i.compromisso_id) await client.from('compromissos').update({ status: 'concluido', concluido_em: agora }).eq('id', i.compromisso_id)
  if (i.tarefa_id) await client.from('tarefas_internas').update({ concluida: true }).eq('id', i.tarefa_id)
  await registrarAtividade(event, i.contato_id, 'Andamento', `Intimação tratada (${i.tipo})${obs ? `: ${String(obs).slice(0, 300)}` : '.'}`, userId, null, i.caso_id, i.processo_id)
  return { status: 'tratada' }
}

/** Exclui um registro feito por engano: some também o prazo e a tarefa gerados, se ainda pendentes. */
export async function excluirIntimacao(client: any, id: number) {
  const { data: i } = await client.from('intimacoes').select('compromisso_id, tarefa_id, status').eq('id', id).maybeSingle()
  if (!i) return
  await client.from('intimacoes').delete().eq('id', id)
  if (i.compromisso_id) await client.from('compromissos').delete().eq('id', i.compromisso_id).eq('status', 'pendente')
  if (i.tarefa_id) await client.from('tarefas_internas').delete().eq('id', i.tarefa_id).eq('concluida', false)
}
