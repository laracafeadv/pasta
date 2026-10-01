import { AREAS, DEMANDA_CAMPOS, DECISOES_DEMANDA, RESULTADOS_DEMANDA, STATUS_DEMANDA, TIPOS_DEMANDA, pick } from '../../shared/types/crm'
import { PROCEDIMENTOS } from '../../shared/data/checklist'
import { registrarAtividade } from './crm'

/** Valida os campos da DEMANDA (os dados de processo/procedimento vivem em processos). */
export function limparDemanda(body: Record<string, any>) {
  const d = pick(body ?? {}, DEMANDA_CAMPOS) as Record<string, any>
  for (const [k, v] of Object.entries(d)) if (typeof v === 'string') d[k] = v.trim() || null
  if ('titulo' in d && !d.titulo) throw createError({ statusCode: 400, message: 'Dê um título à demanda.' })
  if (d.tipo && !(d.tipo in TIPOS_DEMANDA)) throw createError({ statusCode: 400, message: 'Tipo inválido.' })
  if (d.status && !(d.status in STATUS_DEMANDA)) throw createError({ statusCode: 400, message: 'Status inválido.' })
  if (d.resultado && !(d.resultado in RESULTADOS_DEMANDA)) throw createError({ statusCode: 400, message: 'Resultado inválido.' })
  if (d.decisao && !(d.decisao in DECISOES_DEMANDA)) throw createError({ statusCode: 400, message: 'Decisão inválida.' })
  for (const k of ['analise', 'fatos', 'estrategia', 'conclusao'] as const) if (k in d && d[k]) d[k] = String(d[k]).slice(0, 8000)
  if ('riscos' in d && d.riscos) d.riscos = String(d.riscos).slice(0, 4000)
  if (d.procedimento && !PROCEDIMENTOS.some(p => p.valor === d.procedimento)) throw createError({ statusCode: 400, message: 'Procedimento inválido.' })
  if (d.area && !(d.area in AREAS)) throw createError({ statusCode: 400, message: 'Área inválida.' })
  if ('responsavel_id' in d) {
    if (d.responsavel_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(d.responsavel_id))) throw createError({ statusCode: 400, message: 'Responsável inválido.' })
    d.responsavel_id = d.responsavel_id || null
  }
  if ('contato_id' in d) d.contato_id = Number(d.contato_id)
  if (d.status === 'encerrado' && !d.data_encerramento) d.data_encerramento = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  return d
}

/**
 * A atuação da demanda acompanha os seus processos/procedimentos: com processo judicial ela é
 * "judicial"; só com procedimento extrajudicial, "extrajudicial". Sem nenhum, mantém o que foi escolhido.
 */
export async function sincronizarAtuacao(client: any, casoId: number, event?: any, userId: string | null = null) {
  const [{ data }, { data: caso }] = await Promise.all([
    client.from('processos').select('natureza').eq('caso_id', casoId),
    client.from('casos').select('tipo, titulo, contato_id, procedimento').eq('id', casoId).maybeSingle(),
  ])
  const naturezas = new Set((data ?? []).map((p: { natureza: string }) => p.natureza))
  const tipo = naturezas.has('judicial') ? 'judicial' : naturezas.has('extrajudicial') ? 'extrajudicial' : null
  if (!tipo || !caso) return
  const mudou: Record<string, string> = {}
  if (caso.tipo !== tipo) mudou.tipo = tipo
  // A demanda é a MESMA: só o roteiro do serviço acompanha a forma (ex.: Divórcio extrajudicial → judicial).
  const novaVariante = variantePara(caso.procedimento, tipo)
  if (novaVariante && novaVariante !== caso.procedimento) mudou.procedimento = novaVariante
  if (!Object.keys(mudou).length) return
  await client.from('casos').update(mudou).eq('id', casoId)
  if (!event) return
  // A evolução (consultiva/documental → extrajudicial/judicial) fica no histórico da demanda.
  if (mudou.tipo) await registrarAtividade(event, caso.contato_id, 'Sistema', `Atuação da demanda "${caso.titulo}": ${TIPOS_DEMANDA[caso.tipo as keyof typeof TIPOS_DEMANDA] ?? caso.tipo} → ${TIPOS_DEMANDA[tipo]}.`, userId, null, casoId)
  if (mudou.procedimento) await registrarAtividade(event, caso.contato_id, 'Sistema', `Roteiro do serviço da demanda "${caso.titulo}" ajustado para ${PROCEDIMENTOS.find(p => p.valor === mudou.procedimento)?.rotulo ?? mudou.procedimento}.`, userId, null, casoId)
}

/** Se o serviço da demanda tem a variante da nova forma (judicial/extrajudicial), devolve o valor dela. */
export function variantePara(procedimento: string | null | undefined, tipo: 'judicial' | 'extrajudicial'): string | null {
  if (!procedimento) return null
  const [servico, variante] = procedimento.split('/')
  const outra = tipo === 'judicial' ? 'extrajudicial' : 'judicial'
  if (!variante?.startsWith(outra)) return null
  return PROCEDIMENTOS.find(p => p.servico === servico && p.variante.startsWith(tipo))?.valor ?? null
}

/**
 * Ciclo de vida do cliente acompanha as demandas: cliente ativo com todas as demandas encerradas
 * passa a "Concluído" (continua cadastrado, para o relacionamento futuro); ao abrir ou reabrir
 * uma demanda, volta a "Ativo". Leads não são afetados.
 */
export async function sincronizarClienteComDemandas(event: any, client: any, contatoId: number, userId: string | null = null) {
  const { data: contato } = await client.from('contatos').select('etapa').eq('id', contatoId).maybeSingle()
  if (!contato || !['ativo', 'concluido'].includes(contato.etapa)) return
  const { data: demandas } = await client.from('casos').select('status').eq('contato_id', contatoId)
  if (!demandas?.length) return
  const abertas = demandas.some((d: { status: string }) => d.status !== 'encerrado')
  const destino = abertas ? 'ativo' : 'concluido'
  if (destino === contato.etapa) return
  await client.from('contatos').update({ etapa: destino, etapa_desde: new Date().toISOString() }).eq('id', contatoId)
  await registrarAtividade(event, contatoId, 'Sistema', destino === 'concluido' ? 'Todas as demandas foram encerradas: cliente concluído (segue cadastrado para novas demandas).' : 'Nova demanda em andamento: cliente ativo.', userId)
}
