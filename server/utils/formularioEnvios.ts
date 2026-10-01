import { randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { SecaoForm } from '../../shared/data/formulario'
import { estruturaPublica } from './formularioEstrutura'

/**
 * Link público individual de formulário: um envio = uma pessoa + um formulário (+ uma demanda) + um código secreto.
 * A estrutura é CONGELADA no envio (coluna estrutura): a cliente responde exatamente o que foi enviado e o histórico
 * não muda se o formulário for editado depois.
 */
export const VALIDADE_PADRAO_DIAS = 30
const TOKEN_RE = /^[A-Za-z0-9_-]{32,64}$/
const erro = (statusCode: number, message: string) => createError({ statusCode, message })

export type EstadoEnvio = 'gerado' | 'enviado' | 'visualizado' | 'iniciado' | 'respondido' | 'expirado' | 'cancelado'

/** Estado exibido: "expirado" é derivado (validade vencida e sem resposta). */
export function estadoDoEnvio(e: { status: string; expira_em: string; respondido_em?: string | null }): EstadoEnvio {
  if (e.status === 'cancelado') return 'cancelado'
  if (e.status === 'respondido' || e.respondido_em) return 'respondido'
  if (new Date(e.expira_em).getTime() < Date.now()) return 'expirado'
  return e.status as EstadoEnvio
}

export const novoToken = () => randomBytes(24).toString('base64url')

export function urlDoEnvio(token: string): { caminho: string; url: string } {
  const base = String(useRuntimeConfig().public.siteUrl || '').replace(/\/+$/, '')
  return { caminho: `/formulario/${token}`, url: `${base}/formulario/${token}` }
}

export interface NovoEnvio { contatoId: number; formularioId: number; casoId: number | null; validadeDias: number; prazoResposta: string | null; geradoPor: string | null }

export async function criarEnvio(admin: SupabaseClient, n: NovoEnvio) {
  if (!Number.isInteger(n.validadeDias) || n.validadeDias < 1 || n.validadeDias > 90) throw erro(400, 'A validade do link deve ficar entre 1 e 90 dias.')
  if (n.prazoResposta && !/^\d{4}-\d{2}-\d{2}$/.test(n.prazoResposta)) throw erro(400, 'Data limite inválida.')
  const { data: contato } = await admin.from('contatos').select('id').eq('id', n.contatoId).maybeSingle()
  if (!contato) throw erro(404, 'Pessoa não encontrada.')
  const { data: f } = await admin.from('formularios').select('id, nome, contexto, situacao, versao').eq('id', n.formularioId).maybeSingle()
  if (!f) throw erro(404, 'Formulário não encontrado.')
  if (f.situacao !== 'publicado') throw erro(409, 'Só formulários publicados podem ser enviados. Publique o formulário primeiro.')
  if (n.casoId != null) {
    const { data: caso } = await admin.from('casos').select('id, contato_id').eq('id', n.casoId).maybeSingle()
    if (!caso || caso.contato_id !== n.contatoId) throw erro(400, 'Essa demanda não pertence a esta pessoa.')
  } else if (f.contexto === 'demanda') throw erro(400, 'Este formulário é de demanda: escolha a demanda.')

  const estrutura = await estruturaPublica(admin, n.formularioId)
  if (!estrutura.secoes.length) throw erro(400, 'O formulário não tem perguntas para a cliente responder.')
  const expira = new Date(Date.now() + n.validadeDias * 864e5).toISOString()
  const { data, error } = await admin.from('formulario_envios').insert({
    formulario_id: f.id, contato_id: n.contatoId, caso_id: n.casoId, token: novoToken(), expira_em: expira, prazo_resposta: n.prazoResposta,
    versao_formulario: f.versao, estrutura, status: 'gerado', gerado_por: n.geradoPor,
  }).select('id, token, expira_em, prazo_resposta, status, versao_formulario').single()
  if (error || !data) { console.error('[formulario-envio] Erro ao criar:', error); throw erro(500, 'Não foi possível gerar o link.') }
  return { ...data, formulario_nome: f.nome }
}

export interface EnvioPublico {
  id: number; contato_id: number; caso_id: number | null; formulario_id: number | null; status: string; expira_em: string; respondido_em: string | null
  prazo_resposta: string | null; versao_formulario: number | null; estrutura: any; contato: { id: number; nome: string | null } | null
}

/** Valida o link. A mensagem é a mesma para link inexistente, expirado ou cancelado (não revela qual). */
export async function envioPorToken(admin: SupabaseClient, token: string | undefined, opts: { permitirRespondido?: boolean } = {}): Promise<EnvioPublico> {
  const invalido = erro(404, 'Este link não é mais válido. Peça um novo ao escritório.')
  if (!token || !TOKEN_RE.test(token)) throw invalido
  const { data } = await admin.from('formulario_envios')
    .select('id, contato_id, caso_id, formulario_id, status, expira_em, respondido_em, prazo_resposta, versao_formulario, estrutura, contato:contatos(id, nome)')
    .eq('token', token).maybeSingle()
  const e = data as unknown as EnvioPublico | null
  if (!e || e.status === 'cancelado') throw invalido
  if (!e.respondido_em && new Date(e.expira_em).getTime() < Date.now()) throw invalido
  if (e.respondido_em && !opts.permitirRespondido) throw erro(409, 'Este formulário já foi respondido. Se precisar corrigir algo, fale com o escritório.')
  // Envio criado sem a estrutura (ex.: gerado direto no banco): congela na primeira abertura, para a cliente responder
  // exatamente o que viu e o histórico não mudar se o formulário for editado depois.
  if (!e.estrutura && e.formulario_id) {
    const est = await estruturaPublica(admin, e.formulario_id).catch(() => null)
    if (est) {
      e.estrutura = est
      if (!e.respondido_em) {
        e.versao_formulario = e.versao_formulario ?? est.versao
        await admin.from('formulario_envios').update({ estrutura: est, versao_formulario: e.versao_formulario }).eq('id', e.id).is('estrutura', null)
      }
    }
  }
  return e
}

export const secoesDoEnvio = (e: EnvioPublico): SecaoForm[] => (e.estrutura?.secoes ?? []) as SecaoForm[]
export const adminDe = (event: H3Event) => serverSupabaseServiceRole(event)
