import { serverSupabaseServiceRole } from '#supabase/server'
import type { Qualificacao } from '../../../shared/types/crm'
import { requireAdmin } from '../../utils/security'
import { carregarEscritorio } from '../../utils/escritorio'
import { advogadaTexto, dataExtenso, entregarPeca, gerarDocx, qualificacaoTexto, v } from '../../utils/pecas'
import { brlServidor } from '../../utils/formato'
import { valorPorExtenso } from '../../../shared/utils/extenso'
import { auditar } from '../../utils/auditoria'

// Contrato de prestação de serviços advocatícios a partir de um honorário registrado.
export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'pecas/contrato')
  const id = Number(getQuery(event).honorario)
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Informe o honorário.' })
  const admin = serverSupabaseServiceRole(event)

  const { data: h } = await admin.from('honorarios').select('*').eq('id', id).single()
  if (!h) throw createError({ statusCode: 404, message: 'Honorário não encontrado.' })
  const [{ data: contato }, { data: qual }, escritorio] = await Promise.all([
    admin.from('contatos').select('nome, demanda, area').eq('id', h.contato_id).single(),
    admin.from('qualificacao').select('*').eq('contato_id', h.contato_id).maybeSingle(),
    carregarEscritorio(admin),
  ])
  const qq = (qual ?? {}) as Partial<Qualificacao>
  const valor = `${brlServidor(h.valor)} (${valorPorExtenso(h.valor)})`
  const parcelas = Number(h.parcelas) || 1
  const pagamento = parcelas > 1
    ? `em ${parcelas} parcelas mensais de ${brlServidor(Number(h.valor) / parcelas)}`
    : 'em parcela única'
  const objeto = h.descricao || contato?.demanda || 'serviços advocatícios'
  const exito = h.tipo === 'Êxito'

  const buffer = await gerarDocx('CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS', [
    { titulo: 'CONTRATANTE:', texto: `${qualificacaoTexto(qq, contato?.nome)}.` },
    { titulo: 'CONTRATADA:', texto: `${advogadaTexto(escritorio)}.` },
    { texto: 'As partes acima identificadas têm, entre si, justo e acertado o presente contrato, que se regerá pelas cláusulas seguintes e pelo Estatuto da Advocacia (Lei nº 8.906/1994) e pelo Código de Ética e Disciplina da OAB.' },
    { titulo: 'CLÁUSULA 1ª — DO OBJETO.', texto: `A CONTRATADA prestará ao(à) CONTRATANTE serviços advocatícios referentes a: ${objeto}, compreendendo a orientação jurídica, a elaboração das peças necessárias e o acompanhamento até o seu encerramento na instância em que se iniciar.` },
    { titulo: 'CLÁUSULA 2ª — DOS HONORÁRIOS.', texto: exito
      ? `Pelos serviços, o(a) CONTRATANTE pagará à CONTRATADA honorários de êxito correspondentes a ${valor}${h.observacao ? ` (${h.observacao})` : ''}, devidos no recebimento do proveito econômico.`
      : `Pelos serviços, o(a) CONTRATANTE pagará à CONTRATADA o valor total de ${valor}, ${pagamento}, por meio de ${v(h.forma_pagamento, 'forma de pagamento')}${h.data_contratacao ? `, vencendo a primeira em ${new Date(h.data_contratacao + 'T12:00').toLocaleDateString('pt-BR')}` : ''}.` },
    { titulo: 'Parágrafo único.', texto: 'Os honorários de sucumbência, se houver, pertencem exclusivamente à CONTRATADA (art. 23 da Lei nº 8.906/1994) e não se compensam com os honorários contratuais.' },
    { titulo: 'CLÁUSULA 3ª — DAS DESPESAS.', texto: 'Custas processuais, emolumentos, taxas, perícias, cópias, deslocamentos e demais despesas necessárias à execução dos serviços não estão incluídos nos honorários e serão suportados pelo(a) CONTRATANTE, mediante prévia ciência.' },
    { titulo: 'CLÁUSULA 4ª — DAS OBRIGAÇÕES.', texto: 'A CONTRATADA obriga-se a empregar todo o zelo e a técnica profissional na defesa dos interesses do(a) CONTRATANTE, mantendo-o(a) informado(a) do andamento, sendo sua obrigação de meio e não de resultado. O(A) CONTRATANTE obriga-se a fornecer, com veracidade e em tempo hábil, as informações e os documentos solicitados.' },
    { titulo: 'CLÁUSULA 5ª — DA RESCISÃO.', texto: 'O contrato poderá ser rescindido por qualquer das partes mediante comunicação escrita. Em caso de revogação do mandato pelo(a) CONTRATANTE, serão devidos os honorários proporcionais aos serviços já prestados, sem prejuízo dos já vencidos.' },
    { titulo: 'CLÁUSULA 6ª — DO SIGILO E DOS DADOS PESSOAIS.', texto: 'A CONTRATADA manterá sigilo profissional sobre as informações recebidas e tratará os dados pessoais do(a) CONTRATANTE exclusivamente para a execução deste contrato, nos termos da Lei nº 13.709/2018 (LGPD).' },
    { titulo: 'CLÁUSULA 7ª — DO FORO.', texto: `Fica eleito o foro da comarca de ${v(escritorio.cidade_foro, 'cidade/UF')} para dirimir quaisquer dúvidas oriundas deste contrato.` },
    { texto: 'E, por estarem justas e contratadas, as partes assinam o presente em duas vias de igual teor.' },
    { texto: `${v(escritorio.cidade_foro, 'Cidade/UF')}, ${dataExtenso()}.`, espaco: 900 },
    { texto: '_______________________________________________', centro: true, espaco: 0 },
    { texto: `${v(qq.nome_completo || contato?.nome, 'NOME COMPLETO')} — CONTRATANTE`, centro: true, espaco: 700 },
    { texto: '_______________________________________________', centro: true, espaco: 0 },
    { texto: `${v(escritorio.advogada_nome, 'NOME DA ADVOGADA')} — OAB ${v(escritorio.oab, 'OAB')} — CONTRATADA`, centro: true, espaco: 0 },
  ])

  await auditar(event, 'gerou contrato de honorários', 'honorario', id)
  return entregarPeca(event, { buffer, contatoId: h.contato_id, tipo: 'Contrato de honorários', descricao: contato?.demanda, subpasta: 'contrato' })
})
