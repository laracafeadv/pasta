import { ETAPAS, etapa } from '../../shared/types/crm'
import { registrarAtividade } from './crm'
import { sincronizarClienteComDemandas } from './demandas'

/**
 * Ciclo comercial: Pessoa → Lead → Consulta → Proposta → Contratação → Cliente ativo → Concluído.
 * Lead e cliente são a MESMA pessoa (contatos.etapa). Regras de transição centralizadas aqui:
 * andamento, edição do contato e honorários passam todos por estas funções.
 */
export const ETAPAS_LEAD = ['novo', 'qualificacao', 'agendado', 'diagnostico', 'proposta'] as const
const hojeSP = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
const emDias = (n: number) => new Date(Date.now() + n * 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
const ehLead = (e: string) => (ETAPAS_LEAD as readonly string[]).includes(e)
const ehCliente = (e: string) => e === 'ativo' || e === 'concluido'

/** Bloqueia transições que quebrariam o ciclo (cliente não volta ao funil; só quem contratou é cliente). */
export function validarTransicao(atual: string, destino: string, demandasAbertas: number) {
  if (atual === destino) return
  if (!ETAPAS.some(e => e.id === destino)) throw createError({ statusCode: 400, message: 'Etapa inválida.' })
  if (ehCliente(atual) && (ehLead(destino) || destino === 'perdido' || destino === 'relacionado')) {
    throw createError({ statusCode: 400, message: 'Quem já é cliente não volta ao funil. Para um novo serviço, abra uma nova demanda (ela tem a sua própria proposta).' })
  }
  if (atual === 'concluido' && destino === 'ativo' && demandasAbertas === 0) throw createError({ statusCode: 400, message: 'Para reativar o cliente, abra uma nova demanda.' })
  if (destino === 'relacionado') throw createError({ statusCode: 400, message: 'Pessoa cadastrada é quem só aparece como parte; não se muda para essa etapa por aqui.' })
  if (destino === 'concluido' && !ehCliente(atual)) throw createError({ statusCode: 400, message: 'Só quem contratou pode ser concluído. Registre a contratação primeiro.' })
  if (destino === 'concluido' && demandasAbertas > 0) throw createError({ statusCode: 400, message: 'Ainda há demanda em andamento. Encerre as demandas para concluir o cliente (isso acontece sozinho ao encerrar a última).' })
}

/** Demandas do cliente ainda em andamento (não encerradas). */
export async function demandasAbertas(client: any, contatoId: number): Promise<{ id: number; titulo: string }[]> {
  const { data } = await client.from('casos').select('id, titulo').eq('contato_id', contatoId).neq('status', 'encerrado').order('created_at')
  return data ?? []
}

/**
 * Toda proposta/contrato é de UMA demanda. Se foi informada, confere; se não, usa a única demanda aberta;
 * sem nenhuma, abre uma (a consulta virou serviço); com várias, exige a escolha.
 */
export async function resolverDemandaComercial(event: any, client: any, contato: { id: number; nome?: string | null; area?: string | null; demanda?: string | null }, casoId: number | null | undefined, userId: string | null): Promise<number> {
  if (casoId) {
    const { data } = await client.from('casos').select('id').eq('id', casoId).eq('contato_id', contato.id).maybeSingle()
    if (!data) throw createError({ statusCode: 400, message: 'Essa demanda não pertence a este cliente.' })
    return casoId
  }
  const abertas = await demandasAbertas(client, contato.id)
  if (abertas.length === 1) return abertas[0]!.id
  if (abertas.length > 1) throw createError({ statusCode: 400, message: 'Este cliente tem mais de uma demanda em andamento: escolha a demanda da proposta/contrato.' })
  const titulo = (contato.demanda || contato.area || contato.nome || 'Novo serviço').toString().slice(0, 140)
  const { data: nova, error } = await client.from('casos').insert({ contato_id: contato.id, titulo, area: contato.area || null, tipo: 'consultivo', status: 'ativo', data_abertura: hojeSP(), responsavel_id: userId }).select('id').single()
  if (error || !nova) throw createError({ statusCode: 500, message: 'Não foi possível abrir a demanda deste serviço.' })
  await registrarAtividade(event, contato.id, 'Sistema', `Demanda aberta automaticamente: ${titulo}.`, userId, null, nova.id)
  return nova.id
}

/** "Não contratou": propostas em aberto são canceladas e as demandas de consulta em aberto são encerradas. Nada é apagado. */
export async function encerrarSemContratacao(event: any, client: any, contatoId: number, userId: string | null) {
  const { data: props } = await client.from('honorarios').update({ status: 'Cancelado' }).eq('contato_id', contatoId).eq('status', 'Proposta').select('id')
  const { data: dem } = await client.from('casos').update({ status: 'encerrado', resultado: 'desistencia', data_encerramento: hojeSP() }).eq('contato_id', contatoId).neq('status', 'encerrado').select('id')
  if (props?.length || dem?.length) await registrarAtividade(event, contatoId, 'Sistema', `Não contratou: ${props?.length ?? 0} proposta(s) cancelada(s), ${dem?.length ?? 0} demanda(s) encerrada(s) (histórico mantido).`, userId)
}

/**
 * Honorário criado/alterado fora do "andamento": mantém a etapa da pessoa coerente.
 * - contratado/pago (que não seja a consulta): lead ou "não contratou" vira cliente ativo; concluído volta a ativo.
 * - proposta: lead ainda antes da proposta passa a "Proposta enviada".
 * Cliente que abre nova demanda NÃO volta ao funil: só a demanda ganha a sua proposta.
 */
export async function sincronizarCicloPorHonorario(event: any, client: any, h: { contato_id: number; tipo: string; status: string }, userId: string | null) {
  if (h.tipo === 'Consulta') return
  const { data: c } = await client.from('contatos').select('etapa').eq('id', h.contato_id).maybeSingle()
  if (!c) return
  const agora = new Date().toISOString()
  if ((h.status === 'Contratado' || h.status === 'Pago') && (ehLead(c.etapa) || c.etapa === 'perdido' || c.etapa === 'relacionado')) {
    await client.from('contatos').update({ etapa: 'ativo', etapa_desde: agora, motivo_perda: null, proxima_acao: 'Iniciar o atendimento da demanda contratada', proxima_data: emDias(2) }).eq('id', h.contato_id)
    await registrarAtividade(event, h.contato_id, 'Sistema', `Etapa: ${etapa(c.etapa).nome} → Cliente ativo (contratação registrada).`, userId)
  } else if (h.status === 'Proposta' && ['novo', 'qualificacao', 'agendado', 'diagnostico'].includes(c.etapa)) {
    await client.from('contatos').update({ etapa: 'proposta', etapa_desde: agora, proxima_acao: 'Acompanhar a resposta da proposta', proxima_data: emDias(2) }).eq('id', h.contato_id)
    await registrarAtividade(event, h.contato_id, 'Sistema', `Etapa: ${etapa(c.etapa).nome} → Proposta enviada.`, userId)
  }
  await sincronizarClienteComDemandas(event, client, h.contato_id, userId)
}
