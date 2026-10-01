import { FASES_PROCESSUAIS, NATUREZAS_PROCESSO, PROCESSO_CAMPOS, STATUS_DEMANDA, pick } from '../../shared/types/crm'
import { DESFECHOS_EXTRAJUDICIAL, desfechosDa, etapaAtual, tipoProcedimentoPorNome, TIPOS_PROCEDIMENTO_EXTRAJUDICIAL, AGUARDANDO_PENDENCIA } from '../../shared/data/procedimentos'
import { formatarCnj, numeroCnjValido } from '../../shared/utils/juridico'
import { registrarAtividade } from './crm'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const hojeSP = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
const erro = (statusCode: number, message: string) => createError({ statusCode, message })

/**
 * Valida e normaliza um processo JUDICIAL ou procedimento EXTRAJUDICIAL. Os dois compartilham a tabela, mas cada
 * um só aceita os campos do seu fluxo:
 *  - judicial: CNJ (validado), tribunal, vara/juízo, comarca, fase processual, valor da causa, link no tribunal;
 *  - extrajudicial: tipo de procedimento (obrigatório), cartório/serventia, protocolo, comarca/cidade; a fase é
 *    derivada das ETAPAS (não se digita) e não existe tribunal nem CNJ.
 * A conclusão (status "encerrado" + desfecho) só acontece por `concluirProcesso`.
 */
export function limparProcesso(body: Record<string, any>, { criando = false }: { criando?: boolean } = {}) {
  const d = pick(body ?? {}, PROCESSO_CAMPOS) as Record<string, any>
  for (const [k, v] of Object.entries(d)) if (typeof v === 'string') d[k] = v.trim() || null
  if ('natureza' in d && !(d.natureza in NATUREZAS_PROCESSO)) throw erro(400, 'Natureza inválida.')
  if (d.status && !(d.status in STATUS_DEMANDA)) throw erro(400, 'Status inválido.')
  if (d.status === 'encerrado') throw erro(400, 'Para encerrar, use "Concluir" e informe o desfecho.')
  if ('caso_id' in d) d.caso_id = Number(d.caso_id)
  if ('responsavel_id' in d) {
    if (d.responsavel_id && !UUID.test(String(d.responsavel_id))) throw erro(400, 'Responsável inválido.')
    d.responsavel_id = d.responsavel_id || null
  }
  if ('valor' in d) {
    d.valor = d.valor === '' || d.valor == null ? null : Number(d.valor)
    if (d.valor != null && !(d.valor >= 0 && d.valor < 1e12)) throw erro(400, 'Valor inválido.')
  }
  if (!d.data_inicio) delete d.data_inicio
  delete d.data_encerramento // vem da conclusão

  if (d.natureza === 'judicial') {
    if (d.tipo_procedimento) throw erro(400, 'Tipo de procedimento é do extrajudicial; no processo judicial use o tribunal, a vara e a fase.')
    d.tipo_procedimento = null
    if (d.numero) {
      if (!numeroCnjValido(d.numero)) throw erro(400, 'Número de processo inválido: confira os dígitos (padrão CNJ NNNNNNN-DD.AAAA.J.TR.OOOO).')
      d.numero = formatarCnj(d.numero)
    }
    if (d.fase && !(FASES_PROCESSUAIS as readonly string[]).includes(d.fase)) throw erro(400, 'Fase processual inválida.')
  } else if (d.natureza === 'extrajudicial') {
    if (d.tribunal) throw erro(400, 'Tribunal é do processo judicial; no procedimento extrajudicial informe o cartório/serventia.')
    d.tribunal = null
    delete d.fase // derivada das etapas
    if (d.tipo_procedimento && !tipoProcedimentoPorNome(d.tipo_procedimento)) throw erro(400, 'Tipo de procedimento inválido.')
    if (criando && !d.tipo_procedimento) throw erro(400, 'Escolha o tipo de procedimento: ele define as etapas formais.')
  }
  return d
}

/** Cria as etapas formais do procedimento extrajudicial a partir do modelo do tipo escolhido. */
export async function semearEtapas(client: any, processoId: number, tipoNome: string | null | undefined) {
  const tipo = tipoProcedimentoPorNome(tipoNome)
  if (!tipo) return 0
  const { data: ja } = await client.from('processo_etapas').select('id').eq('processo_id', processoId).limit(1)
  if (ja?.length) return 0
  const linhas = tipo.etapas.map((e, i) => ({ processo_id: processoId, ordem: i + 1, titulo: e.titulo, status: 'pendente', observacao: e.dica ?? null }))
  await client.from('processo_etapas').insert(linhas)
  await sincronizarFase(client, processoId)
  return linhas.length
}

/** A "fase" do procedimento extrajudicial é a etapa em andamento (a primeira ainda pendente). */
export async function sincronizarFase(client: any, processoId: number) {
  const { data: p } = await client.from('processos').select('natureza').eq('id', processoId).maybeSingle()
  if (p?.natureza !== 'extrajudicial') return
  const { data: etapas } = await client.from('processo_etapas').select('ordem, status, titulo').eq('processo_id', processoId)
  const fase = etapas?.length ? (etapaAtual(etapas) ?? 'Etapas cumpridas') : null
  await client.from('processos').update({ fase, updated_at: new Date().toISOString() }).eq('id', processoId)
}

export interface ConclusaoEntrada { desfecho?: string; data?: string; observacao?: string }
/**
 * Concluir processo/procedimento: exige um desfecho próprio da natureza. Extrajudicial com desfecho de sucesso só conclui
 * com todas as etapas cumpridas (ou dispensadas) e sem pendências abertas; desfechos sem sucesso (desistência, cancelamento,
 * conversão em judicial) encerram e resolvem as pendências. Devolve se a demanda ficou sem nenhum processo em andamento.
 */
export async function concluirProcesso(event: any, client: any, id: number, entrada: ConclusaoEntrada, userId: string | null) {
  const { data: p } = await client.from('processos').select('id, natureza, status, caso_id, contato_id, numero, tipo_procedimento').eq('id', id).maybeSingle()
  if (!p) throw erro(404, 'Processo/procedimento não encontrado.')
  if (p.status === 'encerrado') throw erro(409, 'Já está concluído. Reabra para alterar.')
  const desfecho = desfechosDa(p.natureza).find(x => x.valor === entrada.desfecho)
  if (!desfecho) throw erro(400, p.natureza === 'judicial' ? 'Escolha como o processo terminou (sentença, acordo, arquivamento…).' : 'Escolha como o procedimento terminou (escritura lavrada, registro concluído, desistência…).')
  const data = /^\d{4}-\d{2}-\d{2}$/.test(String(entrada.data ?? '')) ? String(entrada.data) : hojeSP()
  const [{ data: etapas }, { data: pend }] = await Promise.all([
    client.from('processo_etapas').select('titulo, status').eq('processo_id', id),
    client.from('processo_pendencias').select('id, descricao').eq('processo_id', id).is('resolvida_em', null),
  ])
  if (p.natureza === 'extrajudicial' && desfecho.sucesso) {
    const faltam = (etapas ?? []).filter((e: any) => e.status === 'pendente')
    if (faltam.length) throw erro(409, `Ainda há etapas pendentes: ${faltam.slice(0, 3).map((e: any) => e.titulo).join('; ')}${faltam.length > 3 ? '…' : ''}. Conclua ou dispense as etapas antes.`)
  }
  if (desfecho.sucesso && pend?.length) throw erro(409, `Há ${pend.length} pendência(s) em aberto: resolva-as antes de concluir.`)
  if (!desfecho.sucesso && pend?.length) await client.from('processo_pendencias').update({ resolvida_em: data, observacao: 'Encerrada com o ' + (p.natureza === 'judicial' ? 'processo' : 'procedimento') }).eq('processo_id', id).is('resolvida_em', null)
  const { error } = await client.from('processos').update({ status: 'encerrado', desfecho: desfecho.valor, data_encerramento: data, updated_at: new Date().toISOString(), ...(entrada.observacao ? { observacoes: String(entrada.observacao).trim().slice(0, 2000) } : {}) }).eq('id', id)
  if (error) throw erro(500, 'Erro ao concluir.')
  const rotulo = p.natureza === 'judicial' ? 'Processo' : 'Procedimento'
  await client.from('movimentacoes').insert({ processo_id: id, data, tipo: 'Conclusão', texto: `${rotulo} concluído: ${desfecho.valor}.`, autor_id: userId })
  await registrarAtividade(event, p.contato_id, 'Sistema', `${rotulo} ${p.numero ? p.numero + ' ' : ''}concluído: ${desfecho.valor}.`, userId, null, p.caso_id, id)
  const { data: abertos } = await client.from('processos').select('id').eq('caso_id', p.caso_id).neq('status', 'encerrado')
  return { desfecho: desfecho.valor, demandaSemProcessoAberto: !(abertos?.length) }
}

/** Reabrir: volta a "ativo" e limpa o desfecho (o histórico da conclusão continua nas movimentações). */
export async function reabrirProcesso(event: any, client: any, id: number, userId: string | null) {
  const { data: p } = await client.from('processos').select('id, natureza, status, caso_id, contato_id, numero').eq('id', id).maybeSingle()
  if (!p) throw erro(404, 'Processo/procedimento não encontrado.')
  if (p.status !== 'encerrado') throw erro(409, 'Não está concluído.')
  await client.from('processos').update({ status: 'ativo', desfecho: null, data_encerramento: null, updated_at: new Date().toISOString() }).eq('id', id)
  await registrarAtividade(event, p.contato_id, 'Sistema', `${p.natureza === 'judicial' ? 'Processo' : 'Procedimento'} ${p.numero ? p.numero + ' ' : ''}reaberto.`, userId, null, p.caso_id, id)
  await sincronizarFase(client, id)
}

export { TIPOS_PROCEDIMENTO_EXTRAJUDICIAL, DESFECHOS_EXTRAJUDICIAL, AGUARDANDO_PENDENCIA }
