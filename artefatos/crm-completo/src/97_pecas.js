"use strict"
/* ============ Peças: procuração, contrato de honorários e relatório semanal ============
   Textos = os mesmos do CRM do site (server/api/pecas/*). Dados faltantes saem como [MARCADOR] para completar à mão.
   Formato: arquivo .doc (Word abre); o .docx e o envio ao Drive continuam sendo do CRM do site (servidor). */
const MESES_EXT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const dataExtensoHoje = () => { const [a, m, d] = hojeISO().split('-').map(Number); return `${d} de ${MESES_EXT[m - 1]} de ${a}` }
const vv = (x, rot) => (x && String(x).trim()) || `[${rot}]`
function qualificacaoTexto(q, nomeFallback) {
  q = q || {}; const endereco = [q.endereco, q.bairro].filter(Boolean).join(', ')
  return `${vv(q.nome_completo || nomeFallback, 'NOME COMPLETO')}, ${vv(q.nacionalidade, 'nacionalidade')}, ${vv(q.estado_civil, 'estado civil')}, ${vv(q.profissao, 'profissão')}, portador(a) do RG nº ${vv(q.rg, 'RG')}${q.orgao_emissor ? ` ${q.orgao_emissor}` : ''}, inscrito(a) no CPF sob o nº ${vv(q.cpf, 'CPF')}, residente e domiciliado(a) em ${vv(endereco, 'endereço')}, ${vv(q.cidade, 'cidade')}/${vv(q.uf, 'UF')}, CEP ${vv(q.cep, 'CEP')}`
}
const advogadaTexto = e => `${vv(e.advogada_nome, 'NOME DA ADVOGADA')}, ${vv(e.advogada_qualificacao, 'nacionalidade, estado civil')}, advogada inscrita na OAB sob o nº ${vv(e.oab, 'OAB')}, com escritório profissional em ${vv(e.endereco, 'endereço do escritório')}, e-mail ${vv(e.email, 'e-mail')}`
const escHtml = t => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** Blocos {titulo, texto, negrito, centro, espaco(twips/20=pt)} → documento que o Word abre (Times New Roman 12, justificado). */
function docWord(titulo, blocos) {
  const p = b => `<p style="text-align:${b.centro ? 'center' : 'justify'};line-height:150%;margin:0 0 ${Math.round((b.espaco ?? 200) / 20)}pt">${b.titulo ? `<b>${escHtml(b.titulo)} </b>` : ''}${b.negrito ? `<b>${escHtml(b.negrito)}</b>` : ''}${escHtml(b.texto || '')}</p>`
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${escHtml(titulo)}</title><style>@page{margin:2.5cm 2cm 2cm 3cm}body{font-family:'Times New Roman',serif;font-size:12pt}</style></head><body><p style="text-align:center;margin:0 0 20pt"><b style="font-size:14pt">${escHtml(titulo)}</b></p>${blocos.map(p).join('')}</body></html>`
}
const textoSimples = blocos => blocos.map(b => [b.titulo, b.negrito, b.texto].filter(Boolean).join(' ')).join('\n\n')
async function entregarPeca(c, tipo, descricao, titulo, blocos) {
  const nome = CRM.nomeArquivoPadrao({ data: hojeISO(), contatoId: c.id, tipo, descricao: descricao || undefined, extensao: 'doc' }); const html = docWord(titulo, blocos)
  registrar(c.id, 'Peça / pesquisa', `${tipo} gerada (${nome}).`); auditar('gerar_peca', `${tipo} — ${c.nome}`)
  const falt = [...new Set((textoSimples(blocos).match(/\[[^\]]+\]/g) || []))]
  try { const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; if (!dl) throw new Error('indisponível'); await dl.save({ filename: nome, data: html }); aviso(`${tipo} gerada.` + (falt.length ? ` Complete ${falt.length} campo(s) entre [colchetes] antes de usar.` : '')) } catch (e) { copiar(textoSimples(blocos)); aviso('Download indisponível aqui: copiei o texto da peça. Cole no Word.') }
  return { nome, faltam: falt }
}
function gerarProcuracao(c, casoId) {
  const e = CONFIG.escritorio; const q = c.qualificacao || {}; const caso = casoId ? demanda(casoId) : null
  const proc = caso ? processosDe(caso.id).find(p => p.numero && p.natureza === 'judicial') : null; const contraria = caso ? DB.partes.find(p => p.caso_id === caso.id && p.papel === 'Parte contrária') : null
  const finalidade = caso ? `, especialmente para atuar na demanda "${caso.titulo}"${proc ? `, processo nº ${proc.numero}` : ''}${contraria ? `, em face de ${contraria.nome}` : ''}` : c.demanda ? `, especialmente para tratar de ${c.demanda.toLowerCase()}` : ''
  return entregarPeca(c, 'Procuração', c.demanda, 'PROCURAÇÃO', [
    { titulo: 'OUTORGANTE:', texto: `${qualificacaoTexto(q, c.nome)}.` }, { titulo: 'OUTORGADA:', texto: `${advogadaTexto(e)}.` },
    { titulo: 'PODERES:', texto: 'Pelo presente instrumento particular de procuração, o(a) OUTORGANTE nomeia e constitui a OUTORGADA sua bastante procuradora, a quem confere amplos poderes para o foro em geral, com a cláusula ad judicia et extra, em qualquer juízo, instância ou tribunal, podendo propor contra quem de direito as ações competentes e defendê-lo(a) nas contrárias, seguindo umas e outras até final decisão, usando os recursos legais e acompanhando-os, conferindo-lhe ainda poderes especiais para confessar, reconhecer a procedência do pedido, transigir, desistir, renunciar ao direito sobre o qual se funda a ação, receber, dar quitação e firmar compromisso, podendo ainda substabelecer esta a outrem, com ou sem reserva de iguais poderes, dando tudo por bom, firme e valioso' + `${finalidade}.` },
    { texto: `${vv(e.cidade_foro || q.cidade, 'Cidade/UF')}, ${dataExtensoHoje()}.`, espaco: 900 }, { texto: '_______________________________________________', centro: true, espaco: 0 }, { texto: vv(q.nome_completo || c.nome, 'NOME COMPLETO'), centro: true, espaco: 0 }])
}
function gerarContrato(hon) {
  const c = contato(hon.contato_id); const e = CONFIG.escritorio; const qq = c.qualificacao || {}
  const valor = `${brl2(hon.valor)} (${CRM.valorPorExtenso(hon.valor)})`; const parcelas = Number(hon.parcelas) || 1
  const pagamento = parcelas > 1 ? `em ${parcelas} parcelas mensais de ${brl2(Number(hon.valor) / parcelas)}` : 'em parcela única'
  const caso = hon.caso_id ? demanda(hon.caso_id) : null; const objeto = (caso && caso.titulo) || c.demanda || 'serviços advocatícios'
  const exito = hon.tipo === 'Êxito'; const camadas = hon.tipo === 'Em camadas'
  const mensal = Number(hon.mensalidade) || 0; const pct = Number(hon.exito_pct) || 0
  const textoCamadas = [`Pelos serviços, o(a) CONTRATANTE pagará à CONTRATADA: (a) honorários iniciais de ${valor}, ${pagamento}, por meio de ${vv(hon.forma_pagamento, 'forma de pagamento')}`, mensal > 0 ? `(b) honorários mensais de ${brl2(mensal)} (${CRM.valorPorExtenso(mensal)}), a partir do mês seguinte ao protocolo da primeira peça` : null, pct > 0 ? `(${mensal > 0 ? 'c' : 'b'}) honorários de êxito de ${String(pct).replace('.', ',')}% sobre o proveito econômico efetivamente obtido, devidos no seu recebimento` : null].filter(Boolean).join('; ') + '.'
  return entregarPeca(c, 'Contrato de honorários', c.demanda, 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS', [
    { titulo: 'CONTRATANTE:', texto: `${qualificacaoTexto(qq, c.nome)}.` }, { titulo: 'CONTRATADA:', texto: `${advogadaTexto(e)}.` },
    { texto: 'As partes acima identificadas têm, entre si, justo e acertado o presente contrato, que se regerá pelas cláusulas seguintes e pelo Estatuto da Advocacia (Lei nº 8.906/1994) e pelo Código de Ética e Disciplina da OAB.' },
    { titulo: 'CLÁUSULA 1ª — DO OBJETO.', texto: `A CONTRATADA prestará ao(à) CONTRATANTE serviços advocatícios referentes a: ${objeto}, compreendendo a orientação jurídica, a elaboração das peças necessárias e o acompanhamento até o seu encerramento na instância em que se iniciar.` },
    { titulo: 'CLÁUSULA 2ª — DOS HONORÁRIOS.', texto: camadas ? textoCamadas : exito ? `Pelos serviços, o(a) CONTRATANTE pagará à CONTRATADA honorários de êxito correspondentes a ${valor}${hon.observacoes ? ` (${hon.observacoes})` : ''}, devidos no recebimento do proveito econômico.` : `Pelos serviços, o(a) CONTRATANTE pagará à CONTRATADA o valor total de ${valor}, ${pagamento}, por meio de ${vv(hon.forma_pagamento, 'forma de pagamento')}.` },
    { titulo: 'Parágrafo único.', texto: 'Os honorários de sucumbência, se houver, pertencem exclusivamente à CONTRATADA (art. 23 da Lei nº 8.906/1994) e não se compensam com os honorários contratuais.' },
    { titulo: 'CLÁUSULA 3ª — DAS DESPESAS.', texto: 'Custas processuais, emolumentos, taxas, perícias, cópias, deslocamentos e demais despesas necessárias à execução dos serviços não estão incluídos nos honorários e serão suportados pelo(a) CONTRATANTE, mediante prévia ciência.' },
    { titulo: 'CLÁUSULA 4ª — DAS OBRIGAÇÕES.', texto: 'A CONTRATADA obriga-se a empregar todo o zelo e a técnica profissional na defesa dos interesses do(a) CONTRATANTE, mantendo-o(a) informado(a) do andamento, sendo sua obrigação de meio e não de resultado. O(A) CONTRATANTE obriga-se a fornecer, com veracidade e em tempo hábil, as informações e os documentos solicitados.' },
    { titulo: 'CLÁUSULA 5ª — DA RESCISÃO.', texto: 'O contrato poderá ser rescindido por qualquer das partes mediante comunicação escrita. Em caso de revogação do mandato pelo(a) CONTRATANTE, serão devidos os honorários proporcionais aos serviços já prestados, sem prejuízo dos já vencidos.' },
    { titulo: 'CLÁUSULA 6ª — DO SIGILO E DOS DADOS PESSOAIS.', texto: 'A CONTRATADA manterá sigilo profissional sobre as informações recebidas e tratará os dados pessoais do(a) CONTRATANTE exclusivamente para a execução deste contrato, nos termos da Lei nº 13.709/2018 (LGPD).' },
    { titulo: 'CLÁUSULA 7ª — DO FORO.', texto: `Fica eleito o foro da comarca de ${vv(e.cidade_foro, 'cidade/UF')} para dirimir quaisquer dúvidas oriundas deste contrato.` },
    { texto: 'E, por estarem justas e contratadas, as partes assinam o presente em duas vias de igual teor.' }, { texto: `${vv(e.cidade_foro, 'Cidade/UF')}, ${dataExtensoHoje()}.`, espaco: 900 },
    { texto: '_______________________________________________', centro: true, espaco: 0 }, { texto: `${vv(qq.nome_completo || c.nome, 'NOME COMPLETO')} — CONTRATANTE`, centro: true, espaco: 700 },
    { texto: '_______________________________________________', centro: true, espaco: 0 }, { texto: `${vv(e.advogada_nome, 'NOME DA ADVOGADA')} — OAB ${vv(e.oab, 'OAB')} — CONTRATADA`, centro: true, espaco: 0 }])
}
/** Relatório semanal ao cliente: monta o texto dos dados (feito na semana, próximos passos, o que falta) — serve de documento e de mensagem. */
function blocosRelatorio(c, casoId) {
  const hoje = hojeISO(), inicio = somarDias(hoje, -7), em30 = somarDias(hoje, 30); const e = CONFIG.escritorio
  const dms = demandasDe(c.id).filter(d => d.status === 'ativo' && d.tipo !== 'consultivo' && (casoId == null || d.id === casoId)); const ids = new Set(dms.map(d => d.id))
  const blocos = [{ titulo: 'Cliente:', texto: vv(c.nome, 'NOME'), espaco: 60 }, { titulo: 'Período:', texto: `${dataLonga(inicio)} a ${dataLonga(hoje)}` }]
  for (const d of dms) { blocos.push({ titulo: 'Demanda:', texto: d.titulo, espaco: 30 }); for (const p of processosDe(d.id)) if (p.status !== 'encerrado') blocos.push({ titulo: p.natureza === 'judicial' ? 'Processo:' : 'Procedimento:', texto: `${p.numero ? `nº ${p.numero}` : 'sem número'}${p.orgao ? ` (${p.orgao})` : ''}`, espaco: 30 }) }
  const feitos = [...DB.compromissos.filter(x => x.contato_id === c.id && (casoId == null || x.caso_id === casoId) && x.status === 'concluido' && x.concluido_em && x.concluido_em.slice(0, 10) >= inicio).map(x => ({ data: x.concluido_em.slice(0, 10), t: x.titulo })), ...DB.movimentacoes.filter(m => DB.processos.some(p => p.id === m.processo_id && ids.has(p.caso_id)) && m.data >= inicio).map(m => ({ data: m.data, t: `${m.tipo}: ${m.texto}` }))].sort((a, b) => a.data.localeCompare(b.data))
  blocos.push({ negrito: 'O que foi feito nesta semana', espaco: 80 })
  if (feitos.length) feitos.forEach(f => blocos.push({ texto: `• ${dataLonga(f.data)} — ${f.t}`, espaco: 40 })); else blocos.push({ texto: '[DESCREVA O ANDAMENTO DA SEMANA, OU: "Sem movimentação processual nesta semana; a demanda segue em acompanhamento."]' })
  const prox = DB.compromissos.filter(x => x.contato_id === c.id && (casoId == null || x.caso_id === casoId) && x.status === 'pendente' && diaDe(dataDoCompromisso(x)) >= hoje && diaDe(dataDoCompromisso(x)) <= em30).sort((a, b) => dataDoCompromisso(a).localeCompare(dataDoCompromisso(b)))
  blocos.push({ negrito: 'Próximos passos', espaco: 80 }); if (prox.length) prox.forEach(x => blocos.push({ texto: `• ${dataLonga(diaDe(dataDoCompromisso(x)))} — ${CRM.TIPOS_COMPROMISSO[x.tipo].nome}: ${x.titulo}${x.local ? ` (${x.local})` : ''}`, espaco: 40 })); else blocos.push({ texto: 'Nenhum prazo ou audiência marcado para os próximos 30 dias.' })
  const pend = DB.documentos.filter(d => d.contato_id === c.id && d.status === 'pendente' && d.origem !== 'produzido' && (casoId == null || d.caso_id === casoId))
  blocos.push({ negrito: 'O que precisamos de você', espaco: 80 }); if (pend.length) pend.forEach(d => blocos.push({ texto: `• Enviar: ${d.descricao}`, espaco: 40 })); else blocos.push({ texto: 'Por enquanto, nada. Avisaremos se precisarmos de algum documento ou informação.' })
  blocos.push({ texto: `Qualquer dúvida, estamos à disposição. ${vv(e.advogada_nome ? `Dra. ${e.advogada_nome}` : '', 'NOME DA ADVOGADA')}${e.oab ? ` — OAB ${e.oab}` : ''}.`, espaco: 0 }, { texto: 'Documento confidencial, protegido pelo sigilo profissional.', centro: true })
  return blocos
}
const gerarRelatorioSemanal = (c, casoId) => entregarPeca(c, 'Relatório semanal', c.demanda, 'RELATÓRIO SEMANAL', blocosRelatorio(c, casoId))
/** Atualização por mensagem (WhatsApp/e-mail): mesma base do relatório, em texto curto, aberta na Comunicação para você revisar. */
function mensagemAtualizacao(c, casoId) {
  const b = blocosRelatorio(c, casoId); const sec = n => { const i = b.findIndex(x => x.negrito === n); const f = []; for (let k = i + 1; k < b.length && !b[k].negrito && !b[k].centro && b[k].texto && !/^Qualquer dúvida/.test(b[k].texto); k++) f.push(b[k].texto); return f }
  const feito = sec('O que foi feito nesta semana'), prox = sec('Próximos passos'), falta = sec('O que precisamos de você')
  return [`Olá, ${(c.nome || '[NOME]').split(' ')[0]}! Atualização do seu caso:`, '', 'Nesta semana:', ...feito, '', 'Próximos passos:', ...prox, '', 'O que precisamos de você:', ...falta].join('\n')
}
function abrirAtualizacao(c, casoId) { const m = modal({ titulo: 'Atualização para ' + c.nome, largura: 'max-w-2xl', corpo: h('div', { class: 'space-y-2' }, h('p', { class: 'text-xs text-gray-500' }, 'Gerada dos dados do CRM (feito na semana, próximos passos, documentos pendentes). Revise e envie pelo WhatsApp ou e-mail.'), (() => { const t = h('textarea', { class: 'modal-input min-h-[260px]', 'data-testid': 'atualizacao-texto', 'aria-label': 'Texto da atualização' }); t.value = mensagemAtualizacao(c, casoId); t.setAttribute('data-pronto', '1'); return t })()), rodape: f => [btn('Copiar', { tipo: 'sec', icone: 'ph:copy-bold', onclick: () => copiar(document.querySelector('[data-testid=atualizacao-texto]').value) }), btn('Baixar relatório (.doc)', { tipo: 'sec', icone: 'ph:file-doc-bold', tid: 'atualizacao-doc', onclick: () => gerarRelatorioSemanal(c, casoId) }), btn('Levar para a conversa', { icone: 'ph:chats-circle-bold', tid: 'atualizacao-conversa', onclick: () => { const txt = document.querySelector('[data-testid=atualizacao-texto]').value; f(); abrirComunicacao(c.id, { texto: txt, caso: casoId }) } })] }) }
