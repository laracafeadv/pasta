import { AREAS_INI, ETAPAS_INI, PRIORIDADES, TIPOS_FATAL, checklistPendente, cnjValido, erroInicial, formataCNJ, limparChecklist } from '../../shared/utils/iniciaisSecretaria'
import type { InicialEntrada, InicialSecretaria } from '../../shared/data/secretaria'
import { ehData } from './secretaria'

const erro = (statusCode: number, message: string) => createError({ statusCode, message })
const ETAPA_IDS = ETAPAS_INI.map(e => e[0]) as string[]
const texto = (v: unknown, max: number) => { const t = String(v ?? '').trim().slice(0, max); return t || null }
const dataOuNull = (v: unknown, nome: string) => { if (v === '' || v == null) return null; if (!ehData(v)) throw erro(400, `${nome} inválida.`); return v as string }

/** Whitelist e validação do que vem do navegador. `criar` exige o cliente. A etapa só muda por aqui com as regras de `moverInicial`. */
export function limparInicial(b: Record<string, any>, criar = false): InicialEntrada {
  const d: Record<string, any> = {}
  if ('cliente' in b || criar) { const c = texto(b.cliente, 120); if (!c) throw erro(400, 'Informe o cliente.'); d.cliente = c }
  for (const [k, max] of [['acao', 160], ['parte_contraria', 160], ['obs', 2000]] as const) if (k in b) d[k] = texto(b[k], max)
  if ('area' in b) { const a = texto(b.area, 60); if (a && !AREAS_INI.includes(a)) throw erro(400, 'Área inválida.'); d.area = a }
  if ('meta_protocolo' in b) d.meta_protocolo = dataOuNull(b.meta_protocolo, 'Meta de protocolo')
  if ('prazo_fatal' in b) d.prazo_fatal = dataOuNull(b.prazo_fatal, 'Prazo fatal')
  if ('prazo_fatal_tipo' in b) { const t = texto(b.prazo_fatal_tipo, 20); if (t && !TIPOS_FATAL.some(x => x[0] === t)) throw erro(400, 'Tipo de prazo fatal inválido.'); d.prazo_fatal_tipo = t }
  if ('prioridade' in b) { if (!PRIORIDADES.some(x => x[0] === b.prioridade)) throw erro(400, 'Prioridade inválida.'); d.prioridade = b.prioridade }
  if ('etapa' in b) { if (!ETAPA_IDS.includes(b.etapa)) throw erro(400, 'Etapa inválida.'); d.etapa = b.etapa }
  if ('checklist' in b) d.checklist = limparChecklist(b.checklist)
  if ('protocolo_data' in b) d.protocolo_data = dataOuNull(b.protocolo_data, 'Data do protocolo')
  if ('processo_numero' in b) {
    const n = texto(b.processo_numero, 40)
    if (n && !cnjValido(n)) throw erro(400, 'Número do processo fora do padrão CNJ (0000000-00.0000.0.00.0000). Confira os dígitos.')
    d.processo_numero = n ? formataCNJ(n) : null
  }
  return d as InicialEntrada
}
const erroDoBanco = (e: any) => { console.error('[iniciais]', e?.message); return erro(e?.code === '23514' ? 400 : 500, e?.code === '23514' ? 'Dados inválidos para a inicial (confira as datas: a meta não pode passar do prazo fatal; protocolada exige a data do protocolo).' : 'Não foi possível salvar a inicial.') }
/** Valida a ficha como ela ficará: mesmas regras do banco, com mensagem clara. */
function conferir(f: Partial<InicialSecretaria>) { const m = erroInicial(f); if (m) throw erro(400, m) }

export async function listarIniciais(client: any): Promise<InicialSecretaria[]> {
  const { data, error } = await client.from('secretaria_iniciais').select('*').order('meta_protocolo', { ascending: true, nullsFirst: false }).limit(2000)
  if (error) throw erroDoBanco(error)
  return (data ?? []) as InicialSecretaria[]
}
async function ler(client: any, id: number): Promise<InicialSecretaria> {
  const { data } = await client.from('secretaria_iniciais').select('*').eq('id', id).maybeSingle()
  if (!data) throw erro(404, 'Inicial não encontrada.')
  return data as InicialSecretaria
}
export async function criarInicial(client: any, userId: string, b: Record<string, any>) {
  const d = limparInicial(b, true)
  conferir(d)
  const { data, error } = await client.from('secretaria_iniciais').insert({ user_id: userId, ...d }).select('*').single()
  if (error) throw erroDoBanco(error)
  return data as InicialSecretaria
}
export async function atualizarInicial(client: any, id: number, b: Record<string, any>) {
  const atual = await ler(client, id)
  const d = limparInicial(b) as Record<string, any>
  conferir({ ...atual, ...d })
  if (d.etapa && d.etapa !== atual.etapa) d.etapa_desde = new Date().toISOString()
  const { data, error } = await client.from('secretaria_iniciais').update(d).eq('id', id).select('*').single()
  if (error) throw erroDoBanco(error)
  return data as InicialSecretaria
}
/**
 * Muda a etapa (arrastar, "Avançar"). Para "Protocolada" exige a data (e valida o número, se vier). Chegar a "Pronta" ou "Protocolada" com documentos
 * pendentes só passa com `confirmar_pendencias: true` (a tela pergunta antes). Voltar de "Protocolada" mantém a data e o número.
 */
export async function moverInicial(client: any, id: number, b: Record<string, any>) {
  const atual = await ler(client, id)
  if (!ETAPA_IDS.includes(b.etapa)) throw erro(400, 'Etapa inválida.')
  if (b.etapa === atual.etapa) return atual
  const pend = checklistPendente(atual).length
  if ((b.etapa === 'pronta' || b.etapa === 'protocolada') && pend && b.confirmar_pendencias !== true) throw erro(409, `Ainda há ${pend} documento(s) pendente(s). Confirme para avançar mesmo assim.`)
  const d: Record<string, any> = { etapa: b.etapa, etapa_desde: new Date().toISOString() }
  if (b.etapa === 'protocolada') Object.assign(d, limparInicial({ protocolo_data: b.protocolo_data, ...('processo_numero' in b ? { processo_numero: b.processo_numero } : {}) }))
  conferir({ ...atual, ...d })
  const { data, error } = await client.from('secretaria_iniciais').update(d).eq('id', id).select('*').single()
  if (error) throw erroDoBanco(error)
  return data as InicialSecretaria
}
export async function excluirInicial(client: any, id: number) {
  const { error } = await client.from('secretaria_iniciais').delete().eq('id', id)
  if (error) throw erroDoBanco(error)
  return { ok: true }
}
