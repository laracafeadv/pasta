import { serverSupabaseServiceRole } from '#supabase/server'
import type { Qualificacao } from '../../../shared/types/crm'
import { requireAdmin } from '../../utils/security'
import { carregarEscritorio } from '../../utils/escritorio'
import { advogadaTexto, dataExtenso, gerarDocx, nomeArquivo, qualificacaoTexto, v } from '../../utils/pecas'
import { auditar } from '../../utils/auditoria'

// Procuração ad judicia et extra, com poderes especiais do art. 105 do CPC.
export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'pecas/procuracao')
  const q = getQuery(event)
  const contatoId = Number(q.contato)
  if (!Number.isInteger(contatoId) || contatoId <= 0) throw createError({ statusCode: 400, message: 'Informe o cliente.' })
  const admin = serverSupabaseServiceRole(event)

  const [{ data: contato }, { data: qual }, escritorio, { data: caso }] = await Promise.all([
    admin.from('contatos').select('nome, demanda, parte_contraria').eq('id', contatoId).single(),
    admin.from('qualificacao').select('*').eq('contato_id', contatoId).maybeSingle(),
    carregarEscritorio(admin),
    q.caso ? admin.from('casos').select('titulo, numero_processo, parte_contraria').eq('id', Number(q.caso)).eq('contato_id', contatoId).maybeSingle() : Promise.resolve({ data: null }),
  ])
  if (!contato) throw createError({ statusCode: 404, message: 'Cliente não encontrado.' })
  const qq = (qual ?? {}) as Partial<Qualificacao>

  const finalidade = caso
    ? `, especialmente para atuar no caso "${caso.titulo}"${caso.numero_processo ? `, processo nº ${caso.numero_processo}` : ''}${caso.parte_contraria ? `, em face de ${caso.parte_contraria}` : ''}`
    : contato.demanda ? `, especialmente para tratar de ${contato.demanda.toLowerCase()}` : ''

  const buffer = await gerarDocx('PROCURAÇÃO', [
    { titulo: 'OUTORGANTE:', texto: `${qualificacaoTexto(qq, contato.nome)}.` },
    { titulo: 'OUTORGADA:', texto: `${advogadaTexto(escritorio)}.` },
    { titulo: 'PODERES:', texto: 'Pelo presente instrumento particular de procuração, o(a) OUTORGANTE nomeia e constitui a OUTORGADA sua bastante procuradora, '
      + 'a quem confere amplos poderes para o foro em geral, com a cláusula ad judicia et extra, em qualquer juízo, instância ou tribunal, '
      + 'podendo propor contra quem de direito as ações competentes e defendê-lo(a) nas contrárias, seguindo umas e outras até final decisão, '
      + 'usando os recursos legais e acompanhando-os, conferindo-lhe ainda poderes especiais para confessar, reconhecer a procedência do pedido, '
      + 'transigir, desistir, renunciar ao direito sobre o qual se funda a ação, receber, dar quitação e firmar compromisso, '
      + 'podendo ainda substabelecer esta a outrem, com ou sem reserva de iguais poderes, dando tudo por bom, firme e valioso'
      + `${finalidade}.` },
    { texto: `${v(escritorio.cidade_foro || qq.cidade, 'Cidade/UF')}, ${dataExtenso()}.`, espaco: 900 },
    { texto: '_______________________________________________', centro: true, espaco: 0 },
    { texto: v(qq.nome_completo || contato.nome, 'NOME COMPLETO'), centro: true, espaco: 0 },
  ])

  await auditar(event, 'gerou procuração', 'contato', contatoId)
  setHeaders(event, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': `attachment; filename="${nomeArquivo('procuracao', qq.nome_completo || contato.nome)}"`,
    'Cache-Control': 'private, no-store',
  })
  return buffer
})
