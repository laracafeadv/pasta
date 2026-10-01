'use strict'
/* ============ Dados: armazenamento, dados de exemplo e regras do ciclo de vida ============
   - Estruturas = as do CRM real (shared/types/crm.ts). Os dados dos clientes são FICTÍCIOS (exemplo).
   - Os 66 modelos de mensagem e o formulário "Dados da consulta" são os reais.
   - Persistência: banco do Artifact (data/users/<id>/crm_<coleção>) quando disponível; senão localStorage. */
const COLECOES = ['contatos', 'demandas', 'processos', 'partes', 'movimentacoes', 'etapas', 'pendencias', 'compromissos', 'tarefas', 'documentos', 'honorarios', 'lancamentos', 'atividades', 'mensagens', 'intimacoes', 'formularios', 'envios', 'modelos', 'notas', 'auditoria', 'iniciais']
const DB = {}
const CONFIG = { escritorio: {}, gestao: {}, perfil: {}, revisoes: [], checklist_manual: {}, seq: {} }
const ARM = { modo: 'memoria', uid: null, colecao: null, pendente: new Set(), timer: null, estado: 'iniciando' }

const d = n => hojeISO(n)
const agora = (minDesloc = 0) => new Date(Date.now() + minDesloc * 6e4).toISOString()
const proximoId = col => { const m = Math.max(0, ...(DB[col] || []).map(x => x.id || 0)); CONFIG.seq[col] = Math.max(CONFIG.seq[col] || 0, m) + 1; return CONFIG.seq[col] }

function montarSemente() {
  const MODELOS = typeof MODELOS_REAIS !== 'undefined' ? MODELOS_REAIS : []
  const C = (id, { criado, desde, ult, ...o }) => ({ id, created_at: agora(-60 * 24 * (criado ?? 20)), updated_at: agora(-60), telefone: '55719990' + String(1000 + id), nome: null, email: null, cidade: 'Salvador', origem: null, area: null, demanda: null, parte_contraria: null, resumo: null, sentimento: null, urgencia: null, interesses: [], objecoes: [], etapa: 'novo', motivo_perda: null, proxima_acao: null, proxima_data: null, responsavel_id: null, etapa_desde: agora(-60 * 24 * (desde ?? 2)), consulta_em: null, data_nascimento: null, classificacao: null, classificacao_desde: null, nps: null, ultimo_contato_em: agora(-60 * 24 * (ult ?? 1)), obs_relacionamento: null, dor: null, objetivo: null, nao_contatar: false, tem_filhos: null, ia_ativa: false, consentimento_em: agora(-60 * 24 * 5), ultima_mensagem_em: agora(-60 * 24 * (ult ?? 1)), ...o })
  const contatos = [
    C(1, { nome: 'Marina Albuquerque', email: 'marina.exemplo@email.com', origem: 'Instagram', area: 'Direito de Família', demanda: 'Divórcio', urgencia: 'Alta', sentimento: 'Neutro', resumo: 'Casada há 12 anos, quer se separar com acordo. Tem 2 filhos pequenos.', etapa: 'novo', desde: 0, ult: 0, proxima_acao: 'Responder pessoalmente', proxima_data: d(0), tem_filhos: true }),
    C(2, { nome: 'Rafaela Souza', origem: 'Google', area: 'Sucessões', demanda: 'Inventário', urgencia: 'Média', sentimento: 'Neutro', resumo: 'Pai faleceu há 4 meses; 3 herdeiros e um imóvel.', etapa: 'qualificacao', desde: 1, ult: 1, proxima_acao: 'Convidar para a consulta estratégica', proxima_data: d(0) }),
    C(3, { nome: 'Camila Torres', email: 'camila.exemplo@email.com', origem: 'Indicação de cliente', area: 'Planejamento Matrimonial', demanda: 'Pacto antenupcial', urgencia: 'Média', sentimento: 'Positivo', resumo: 'Casamento marcado para daqui a 3 meses; quer separação total de bens.', etapa: 'agendado', desde: 3, ult: 1, consulta_em: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10) + 'T17:00:00.000Z', proxima_acao: 'Lembrete da consulta (dia anterior)', proxima_data: d(1), data_nascimento: '1992-' + d(0).slice(5) }),
    C(4, { nome: 'Patrícia Lima', origem: 'Site', area: 'Direito de Família', demanda: 'Guarda e convivência', urgencia: 'Alta', sentimento: 'Negativo', resumo: 'Pai não cumpre o regime de convivência.', etapa: 'diagnostico', desde: 1, ult: 1, consulta_em: agora(-60 * 26), proxima_acao: 'Mensagem de feedback pós-consulta', proxima_data: d(0), tem_filhos: true }),
    C(5, { nome: 'Juliana Menezes', origem: 'Instagram', area: 'Direito de Família', demanda: 'Pensão alimentícia', urgencia: 'Média', sentimento: 'Neutro', resumo: 'Quer revisar o valor da pensão.', etapa: 'proposta', desde: 2, ult: 2, proxima_acao: 'Follow-up 24h da proposta', proxima_data: d(-1), objecoes: ['Preço'] }),
    C(6, { nome: 'Beatriz Cardoso', email: 'beatriz.exemplo@email.com', origem: 'Indicação de cliente', area: 'Direito de Família', demanda: 'Divórcio', urgencia: 'Média', sentimento: 'Positivo', etapa: 'ativo', desde: 25, criado: 40, ult: 3, parte_contraria: 'Paulo Cardoso', resumo: 'Divórcio consensual, sem filhos menores; partilha igualitária de dois imóveis.', proxima_acao: 'Acompanhar lavratura no cartório', proxima_data: d(3), tem_filhos: false, data_nascimento: '1988-03-14' }),
    C(7, { nome: 'Helena Prado', origem: 'Google', area: 'Sucessões', demanda: 'Inventário', urgencia: 'Média', sentimento: 'Neutro', etapa: 'ativo', desde: 60, criado: 80, ult: 12, parte_contraria: null, resumo: 'Inventário judicial; irmão discorda da partilha.', proxima_acao: 'Relatório semanal', proxima_data: d(-2) }),
    C(8, { nome: 'Fernanda Rocha', origem: 'Instagram', area: 'Direito de Família', demanda: 'Guarda e convivência', urgencia: 'Alta', sentimento: 'Neutro', etapa: 'ativo', desde: 40, criado: 55, ult: 2, tem_filhos: true, proxima_acao: 'Preparar audiência de conciliação', proxima_data: d(5) }),
    C(9, { nome: 'Luciana Martins', origem: 'Indicação de parceiro/conhecido', area: 'Planejamento Matrimonial', demanda: 'Pacto antenupcial', urgencia: 'Baixa', sentimento: 'Positivo', etapa: 'ativo', desde: 8, criado: 18, ult: 1, proxima_acao: 'Enviar o formulário da cliente (dados e documentos)', proxima_data: d(0) }),
    C(10, { nome: 'Sônia Barreto', origem: 'Indicação de cliente', area: 'Direito de Família', demanda: 'União estável', urgencia: 'Baixa', sentimento: 'Positivo', etapa: 'concluido', desde: 35, criado: 120, ult: 33, nps: 10, classificacao: 'promotora', classificacao_desde: agora(-60 * 24 * 30), proxima_acao: 'Pós-venda 30 dias', proxima_data: d(0) }),
    C(11, { nome: 'Carla Dias', origem: 'Instagram', area: 'Direito de Família', demanda: 'Divórcio', urgencia: 'Média', etapa: 'perdido', motivo_perda: 'Achou caro', desde: 50, criado: 70, ult: 50, objecoes: ['Preço'] }),
    C(12, { nome: 'Renata Gomes', origem: 'Google', area: 'Sucessões', demanda: 'Testamento', etapa: 'perdido', motivo_perda: 'Não respondeu', desde: 20, criado: 30, ult: 20 }),
    C(13, { nome: 'Paulo Cardoso', etapa: 'relacionado', origem: 'Outros', area: 'Direito de Família', desde: 25, criado: 25, ult: 25, telefone: '55719990' + '1013' }),
    C(14, { nome: 'Antônio Prado', etapa: 'relacionado', origem: 'Outros', area: 'Sucessões', desde: 60, criado: 60, ult: 60 }),
    C(15, { nome: 'Tatiane Alves', origem: 'Site', area: 'Consultoria Jurídica', demanda: 'Trabalhista', etapa: 'perdido', motivo_perda: 'Fora da área de atuação', desde: 15, criado: 16, ult: 15 }),
  ]
  // qualificação de exemplo (CPF de teste válido, publicamente conhecido; não é de pessoa real)
  for (const i of [5, 6]) contatos[i].qualificacao = { nome_completo: contatos[i].nome, cpf: '529.982.247-25', rg: '12.345.678-90', orgao_emissor: 'SSP/BA', nacionalidade: 'brasileira', estado_civil: i === 5 ? 'casado(a)' : 'viúvo(a)', profissao: 'servidora pública', endereco: 'Rua Exemplo, 100', bairro: 'Pituba', cep: '41810-000', cidade: 'Salvador', uf: 'BA' }
  const cnj = (seq, tr) => { const nnnnnnn = String(seq).padStart(7, '0'); const dv = String(98 - Number((BigInt(nnnnnnn + '2026' + '8' + tr + '0001' + '00') % 97n))).padStart(2, '0'); return `${nnnnnnn}-${dv}.2026.8.${tr}.0001` }
  const demandas = [
    { id: 1, contato_id: 6, titulo: 'Divórcio consensual — Beatriz', area: 'Direito de Família', tipo: 'extrajudicial', status: 'ativo', data_abertura: d(-25), data_encerramento: null, procedimento: 'divorcio/extrajudicial', observacoes: 'Partilha igualitária; sem filhos menores.', analise: 'Consensual, sem filhos menores nem incapazes: cabe escritura em cartório.', fatos: 'Casamento em 2014, regime comunhão parcial; dois imóveis.', estrategia: 'Escritura pública com partilha igualitária.', riscos: 'Dependência de documentação dos imóveis atualizada.', conclusao: 'Via extrajudicial é a mais rápida.', decisao: 'viavel' },
    { id: 2, contato_id: 7, titulo: 'Inventário judicial — Espólio Prado', area: 'Sucessões', tipo: 'judicial', status: 'ativo', data_abertura: d(-60), procedimento: 'inventario/judicial', observacoes: 'Herdeiro discorda da avaliação do imóvel.', analise: 'Inventário judicial por litígio entre herdeiros.', riscos: 'Prazo do ITCMD; avaliação do imóvel.', decisao: 'ressalvas' },
    { id: 3, contato_id: 8, titulo: 'Guarda e alimentos — Fernanda', area: 'Direito de Família', tipo: 'judicial', status: 'ativo', data_abertura: d(-40), procedimento: 'guarda-alimentos/padrao', observacoes: 'Pedido de guarda compartilhada e alimentos.', decisao: 'viavel' },
    { id: 4, contato_id: 9, titulo: 'Pacto antenupcial — Luciana', area: 'Planejamento Matrimonial', tipo: 'documental', status: 'ativo', data_abertura: d(-8), procedimento: 'pacto-antenupcial/padrao', observacoes: 'Separação total de bens.', decisao: 'viavel' },
    { id: 5, contato_id: 10, titulo: 'União estável — Sônia', area: 'Direito de Família', tipo: 'extrajudicial', status: 'encerrado', data_abertura: d(-110), data_encerramento: d(-35), resultado: 'exito', procedimento: 'dissolucao-ue/extrajudicial', observacoes: 'Dissolução consensual concluída.', decisao: 'viavel' },
    { id: 6, contato_id: 4, titulo: 'Consulta — Patrícia Lima', area: 'Direito de Família', tipo: 'consultivo', status: 'ativo', data_abertura: d(-2), procedimento: null, observacoes: 'Consulta realizada; falta a proposta.', fatos: 'Pai não cumpre convivência fixada em acordo.', analise: 'Cabe execução do acordo / busca e apreensão de convivência.', riscos: 'Provas das recusas ainda frágeis.', decisao: 'ressalvas' },
  ].map(x => ({ created_at: agora(-60 * 24 * (-diasEntre(d(0), x.data_abertura))), data_encerramento: null, resultado: null, analise: null, fatos: null, estrategia: null, conclusao: null, riscos: null, decisao: null, responsavel_id: null, ...x }))
  const processos = [
    { id: 1, caso_id: 1, contato_id: 6, natureza: 'extrajudicial', numero: null, tipo_procedimento: 'Divórcio / dissolução extrajudicial (escritura)', orgao: '1º Tabelionato de Notas — Salvador', comarca: 'Salvador', uf: 'BA', fase: 'Protocolo / agendamento', status: 'ativo', valor: null, link: null, data_inicio: d(-18), observacoes: 'Escritura agendada para data a confirmar.', responsavel_nome: 'Lara Café' },
    { id: 2, caso_id: 2, contato_id: 7, natureza: 'judicial', numero: cnj(1234, '05'), tribunal: 'tjba', orgao: '2ª Vara de Família e Sucessões', comarca: 'Salvador', uf: 'BA', fase: 'Instrução', status: 'ativo', valor: 640000, link: null, data_inicio: d(-52), observacoes: 'Aguardando avaliação do imóvel.', responsavel_nome: 'Lara Café' },
    { id: 3, caso_id: 3, contato_id: 8, natureza: 'judicial', numero: cnj(5678, '05'), tribunal: 'tjba', orgao: '1ª Vara de Família', comarca: 'Lauro de Freitas', uf: 'BA', fase: 'Postulatória (petição inicial)', status: 'ativo', valor: null, link: null, data_inicio: d(-30), observacoes: null, responsavel_nome: 'Lara Café' },
  ].map(x => ({ created_at: agora(-60 * 24 * 20), data_encerramento: null, desfecho: null, tribunal: null, ...x }))
  const E = (processo_id, ordem, titulo, status, data_prevista) => ({ id: 0, processo_id, ordem, titulo, status, data_prevista: data_prevista || null, concluida_em: status === 'concluida' ? agora(-60 * 24 * 3) : null, observacao: null })
  const tp = CRM.TIPOS_PROCEDIMENTO_EXTRAJUDICIAL.find(t => t.id === 'divorcio') || CRM.TIPOS_PROCEDIMENTO_EXTRAJUDICIAL[1]
  const etapas = tp.etapas.map((e, i) => E(1, i + 1, e.titulo, i < 2 ? 'concluida' : 'pendente', i === 2 ? d(6) : null)).map((e, i) => ({ ...e, id: i + 1 }))
  const pendencias = [{ id: 1, processo_id: 1, descricao: 'Certidão atualizada de um dos imóveis (matrícula)', aguardando: 'cliente', prazo: d(4), resolvida_em: null, observacao: null, created_at: agora(-60 * 24 * 4) }]
  const partes = [
    { id: 1, created_at: agora(-60 * 24 * 25), caso_id: 1, contato_id: 13, nome: 'Paulo Cardoso', papel: 'Cônjuge / companheiro(a)', polo: null, processo_id: 1, documento: null, telefone: '55719991013', email: null, observacao: 'Cônjuge; concorda com a partilha.' },
    { id: 2, created_at: agora(-60 * 24 * 50), caso_id: 2, contato_id: 14, nome: 'Antônio Prado', papel: 'Herdeiro', polo: 'passivo', processo_id: 2, documento: null, telefone: null, email: null, observacao: 'Irmão que discorda da avaliação.' },
  ]
  const movimentacoes = [
    { id: 1, created_at: agora(-60 * 24 * 12), processo_id: 2, data: d(-12), tipo: 'Petição / protocolo', texto: 'Protocolada manifestação sobre a avaliação do imóvel.' },
    { id: 2, created_at: agora(-60 * 24 * 7), processo_id: 2, data: d(-7), tipo: 'Decisão / despacho', texto: 'Despacho determina nova avaliação por perito.' },
    { id: 3, created_at: agora(-60 * 24 * 3), processo_id: 3, data: d(-3), tipo: 'Andamento', texto: 'Citação da parte contrária expedida.' },
  ]
  const compromissos = [
    { id: 1, tipo: 'consulta', titulo: 'Consulta — Camila Torres', contato_id: 3, caso_id: null, inicio: contatos[2].consulta_em, data_limite: null, data_publicacao: null, dias_prazo: null, local: 'Google Meet', status: 'pendente', observacao: null, processo_id: null },
    { id: 2, tipo: 'prazo', titulo: 'Manifestar sobre laudo de avaliação', contato_id: 7, caso_id: 2, inicio: null, data_limite: d(4), data_publicacao: d(-12), dias_prazo: 15, local: null, status: 'pendente', observacao: 'Prazo em dias úteis (CPC).', processo_id: 2 },
    { id: 3, tipo: 'audiencia', titulo: 'Audiência de conciliação — Fernanda', contato_id: 8, caso_id: 3, inicio: new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10) + 'T13:30:00.000Z', data_limite: null, data_publicacao: null, dias_prazo: null, local: 'Fórum de Lauro de Freitas', status: 'pendente', observacao: null, processo_id: 3 },
    { id: 4, tipo: 'prazo', titulo: 'Réplica à contestação', contato_id: 8, caso_id: 3, inicio: null, data_limite: d(-1), data_publicacao: d(-22), dias_prazo: 15, local: null, status: 'pendente', observacao: 'Atrasado — decidir hoje.', processo_id: 3 },
    { id: 5, tipo: 'reuniao', titulo: 'Reunião com cartório — escritura', contato_id: 6, caso_id: 1, inicio: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10) + 'T12:00:00.000Z', data_limite: null, data_publicacao: null, dias_prazo: null, local: 'Cartório', status: 'pendente', observacao: null, processo_id: 1 },
  ]
  const T = (id, titulo, prazo, prioridade, contato_id, caso_id, concl = false) => ({ id, titulo, descricao: null, concluida: concl, prazo, prioridade, contato_id, caso_id, processo_id: null, created_at: agora(-60 * 24), updated_at: agora(-60 * 24) })
  const tarefas = [
    T(1, 'Enviar minuta da escritura para a cliente', d(0), 'alta', 6, 1), T(2, 'Pedir certidão do imóvel à cliente', d(-1), 'media', 6, 1),
    T(3, 'Preparar roteiro da audiência', d(3), 'alta', 8, 3), T(4, 'Enviar proposta à Patrícia', d(1), 'alta', 4, 6),
    T(5, 'Revisar cláusulas do pacto', d(2), 'media', 9, 4), T(6, 'Atualizar planilha de bens do espólio', d(-3), 'baixa', 7, 2), T(7, 'Arquivar documentos da Sônia', d(-10), 'baixa', 10, 5, true),
  ]
  const DOC = (id, contato_id, caso_id, descricao, obrigatorio, status, extra) => ({ id, contato_id, caso_id, processo_id: null, parte_id: null, origem: 'solicitado', arquivo_provedor: null, arquivo_ref: null, arquivo_url: null, arquivo_nome: null, arquivo_em: null, descricao, obrigatorio, status, observacao: null, ordem: id, atualizado_em: agora(-60 * 24), ...extra })
  let n = 0
  const documentos = []
  const gerar = (contato_id, caso_id, area, statusDe) => { [...CRM.DOCUMENTOS_POR_AREA['*'], ...(CRM.DOCUMENTOS_POR_AREA[area] || []), ...CRM.DOCUMENTOS_POR_AREA.fim].forEach(([desc, ob], i) => { n++; documentos.push(DOC(n, contato_id, caso_id, desc, ob, statusDe(i, desc), {})) }) }
  gerar(6, 1, 'Direito de Família', (i) => i < 3 ? 'conferido' : i < 5 ? 'recebido' : 'pendente')
  gerar(7, 2, 'Sucessões', (i) => i < 6 ? 'conferido' : 'pendente')
  gerar(9, 4, 'Planejamento Matrimonial', (i) => i < 2 ? 'recebido' : 'pendente')
  documentos.push(DOC(++n, 6, 1, 'Minuta de escritura de divórcio', false, 'rascunho', { origem: 'produzido' }), DOC(++n, 7, 2, 'Petição — manifestação sobre avaliação', false, 'final', { origem: 'produzido', processo_id: 2 }))
  const H = (id, contato_id, caso_id, tipo, status, valor, extra) => ({ id, contato_id, caso_id, tipo, status, valor, entrada: null, mensalidade: null, exito_pct: null, forma_pagamento: 'PIX', parcelas: 1, observacoes: null, created_at: agora(-60 * 24 * 10), updated_at: agora(-60 * 24 * 3), ...extra })
  const honorarios = [
    H(1, 6, 1, 'Contrato fixo', 'Contratado', 4500, { parcelas: 3 }), H(2, 7, 2, 'Em camadas', 'Contratado', 6000, { entrada: 2000, mensalidade: 500, exito_pct: 8 }),
    H(3, 8, 3, 'Contrato fixo', 'Pago', 5200), H(4, 9, 4, 'Contrato fixo', 'Contratado', 2800), H(5, 10, 5, 'Contrato fixo', 'Pago', 3600),
    H(6, 5, null, 'Contrato fixo', 'Proposta', 3000), H(7, 4, 6, 'Consulta', 'Pago', 350), H(8, 3, null, 'Consulta', 'Contratado', 350),
  ]
  const L = (id, tipo, descricao, categoria, valor, vencimento, pago_em, extra) => ({ id, tipo, descricao, categoria, valor, vencimento, pago_em, recorrente: false, contato_id: null, caso_id: null, observacao: null, ...extra })
  const lancamentos = [
    L(1, 'receber', 'Honorários — Beatriz (1/3)', 'Honorários', 1500, d(-10), d(-9), { contato_id: 6, caso_id: 1 }), L(2, 'receber', 'Honorários — Beatriz (2/3)', 'Honorários', 1500, d(5), null, { contato_id: 6, caso_id: 1 }),
    L(3, 'receber', 'Honorários — Helena (entrada)', 'Honorários', 2000, d(-30), d(-28), { contato_id: 7, caso_id: 2 }), L(4, 'receber', 'Honorários — Helena (mensal)', 'Honorários', 500, d(-2), null, { contato_id: 7, caso_id: 2 }),
    L(5, 'pagar', 'Anuidade OAB', 'Impostos e OAB', 1200, d(12), null), L(6, 'pagar', 'Software e sistemas', 'Software e sistemas', 290, d(8), null, { recorrente: true }),
    L(7, 'pagar', 'Aluguel e condomínio', 'Aluguel e condomínio', 1800, d(-3), d(-3), { recorrente: true }),
  ]
  const A = (id, contato_id, tipo, texto, dias, extra) => ({ id, contato_id, caso_id: null, tipo, texto, created_at: agora(-60 * 24 * dias), autor: 'Lara Café', ...extra })
  const atividades = [
    A(1, 6, 'Reunião', 'Consulta realizada por vídeo; decidido divórcio extrajudicial.', 30), A(2, 6, 'Documento recebido', 'Recebeu RG, CPF e certidão de casamento.', 22, { caso_id: 1 }), A(3, 6, 'WhatsApp', 'Enviada a lista de documentos dos imóveis.', 15, { caso_id: 1 }),
    A(4, 7, 'Anotação', 'Herdeiro Antônio pediu nova avaliação do imóvel.', 9, { caso_id: 2 }), A(5, 4, 'Reunião', 'Consulta estratégica concluída.', 1), A(6, 10, 'Relacionamento', 'Nota 10 na pesquisa de satisfação.', 30),
  ]
  const M = (id, contato_id, direcao, texto, min) => ({ id, contato_id, direcao, tipo: 'texto', texto, created_at: agora(-min), lida: direcao === 'saida' })
  const mensagens = [
    M(1, 1, 'entrada', 'Oi, boa tarde! Vi seu Instagram. Quero saber como funciona um divórcio com acordo.', 40), M(2, 1, 'entrada', 'Tenho dois filhos pequenos, isso muda alguma coisa?', 38),
    M(3, 2, 'entrada', 'Meu pai faleceu em maio, preciso fazer o inventário.', 60 * 26), M(4, 2, 'saida', 'Sinto muito pela perda. Posso te explicar os caminhos em uma conversa rápida?', 60 * 25),
    M(5, 4, 'saida', 'Obrigada pela confiança na consulta de hoje, Patrícia. Amanhã envio nosso feedback.', 60 * 24), M(6, 6, 'entrada', 'Dra., a certidão do apartamento saiu! Mando por aqui?', 60 * 5),
  ]
  const I = (id, contato_id, caso_id, processo_id, tipo, texto, data, status) => ({ id, created_at: agora(-60 * 24), contato_id, caso_id, processo_id, tipo, texto, data_publicacao: data, status, prazo_dias: null, observacao: null })
  const intimacoes = [
    I(1, 7, 2, 2, 'Despacho', 'Intime-se o inventariante para se manifestar sobre o laudo de avaliação em 15 dias.', d(-1), 'a_tratar'),
    I(2, 8, 3, 3, 'Audiência designada', 'Designada audiência de conciliação.', d(-6), 'tratada'),
  ]
  return { contatos, demandas, processos, partes, movimentacoes, etapas, pendencias, compromissos, tarefas, documentos, honorarios, lancamentos, atividades, mensagens, intimacoes, modelos: MODELOS.map((m, i) => ({ id: i + 1, ...m })), notas: [{ id: 1, caso_id: 2, tipo: 'observacao', texto: 'Cliente pediu relatório quinzenal.', created_at: agora(-60 * 24 * 6), autor_nome: 'Lara Café' }], auditoria: [], iniciais: semearIniciais(), formularios: semearFormularios(), envios: semearEnvios() }
}

const ESCRITORIO_EXEMPLO = { advogada_nome: 'Lara Café', oab: '00000/BA', advogada_qualificacao: 'brasileira, solteira', email: 'contato@exemplo.com.br', telefone: '(71) 90000-0000', endereco: 'Rua Exemplo, 100, Pituba, Salvador/BA', cidade_foro: 'Salvador/BA', proposta_valor: 'Advocacia humana e estratégica para famílias e sucessões.', tom_de_voz: 'Acolhedor; sem ponto final no fim das mensagens.', nao_atende: 'Trabalhista e previdenciário: encaminho a parceiras.', valor_consulta: 'R$ 350,00', consulta_abatida: 'sim', duracao_consulta: '60 minutos', plataforma_consulta: 'Google Meet', horario_atendimento: 'segunda a sexta, das 9h às 18h', chave_pix: 'exemplo@pix.com', dados_bancarios: 'Banco, agência, conta, titular (exemplo)', link_avaliacao: 'https://g.page/exemplo' }
const GESTAO_EXEMPLO = { horas_produtivas_mes: 120, margem_desejada: 30, saldo_caixa: 8500, pro_labore: 6000, horas_estimadas: 20 }

/* ---------- persistência ---------- */
function carregarSemente() { const s = montarSemente(); for (const c of COLECOES) DB[c] = s[c] || []; CONFIG.escritorio = clonar(ESCRITORIO_EXEMPLO); CONFIG.gestao = clonar(GESTAO_EXEMPLO); CONFIG.perfil = { nome: 'Lara Café', papel: 'admin', email: 'contato@exemplo.com.br' }; CONFIG.revisoes = []; CONFIG.checklist_manual = {}; CONFIG.seq = {} }
function salvar(col) { ARM.pendente.add(col || '*'); clearTimeout(ARM.timer); ARM.timer = setTimeout(descarregar, 500); renderBarraArmazenamento() }
async function descarregar() {
  const cols = ARM.pendente.has('*') ? [...COLECOES, 'config'] : [...ARM.pendente]; ARM.pendente.clear()
  try {
    if (ARM.modo === 'db' && ARM.colecao) { for (const c of cols) await ARM.colecao.doc('crm_' + c).set(c === 'config' ? { v: JSON.stringify(CONFIG) } : { v: JSON.stringify(DB[c]) }); ARM.estado = 'salvo' }
    else { lsSet('db', { DB, CONFIG }); ARM.estado = 'salvo (neste navegador)' }
  } catch (e) { ARM.estado = 'erro ao salvar'; aviso('Não foi possível salvar: ' + (e.message || e.code || 'erro'), 'erro') }
  renderBarraArmazenamento()
}
function renderBarraArmazenamento() { const el = $('estadoSalvo'); if (el) el.textContent = ARM.estado }
async function iniciarArmazenamento(aoCarregar) {
  carregarSemente()
  try {
    const claude = window.claude
    const db = claude && claude.use ? await claude.use('db') : null
    const user = claude && claude.use ? await claude.use('user') : null
    const uid = db && user ? await user.id() : null
    if (db && uid) {
      ARM.modo = 'db'; ARM.uid = uid; ARM.colecao = db.collection('data/users/' + uid)
      const meta = await ARM.colecao.doc('crm_meta').get()
      if (meta.exists) {
        for (const c of COLECOES) { const s = await ARM.colecao.doc('crm_' + c).get(); if (s.exists) DB[c] = JSON.parse(s.data().v) }
        const cf = await ARM.colecao.doc('crm_config').get(); if (cf.exists) Object.assign(CONFIG, JSON.parse(cf.data().v))
        ARM.estado = 'carregado do banco'
      } else { await ARM.colecao.doc('crm_meta').set({ semeado: true, em: agora(), versao: 1 }); ARM.pendente.add('*'); await descarregar(); ARM.estado = 'dados de exemplo gravados' }
    } else {
      const s = lsGet('db', null)
      if (s && s.DB) { Object.assign(DB, s.DB); Object.assign(CONFIG, s.CONFIG); ARM.estado = 'carregado deste navegador' } else ARM.estado = 'dados de exemplo (neste navegador)'
      ARM.modo = 'local'
    }
  } catch (e) { ARM.estado = 'sem banco: usando o navegador'; ARM.modo = 'local' }
  aoCarregar && aoCarregar(); renderBarraArmazenamento()
}
function restaurarExemplo() { carregarSemente(); salvar('*'); ARM.estado = 'dados de exemplo restaurados' }

/* ---------- seletores ---------- */
const por = (col, id) => (DB[col] || []).find(x => x.id === Number(id))
const contato = id => por('contatos', id)
const demanda = id => por('demandas', id)
const processo = id => por('processos', id)
const nomeContato = id => contato(id)?.nome || 'Sem nome'
const demandasDe = cid => DB.demandas.filter(x => x.contato_id === cid)
const processosDe = did => DB.processos.filter(x => x.caso_id === did)
const docsDe = (cid, did) => DB.documentos.filter(x => x.contato_id === cid && (did == null || x.caso_id === did))
const ehLead = c => ['novo', 'qualificacao', 'agendado', 'diagnostico', 'proposta'].includes(c.etapa)
const ehCliente = c => ['ativo', 'concluido'].includes(c.etapa)
const tarefaSit = t => situacaoOf(t.prazo)
const situacaoOf = data => CRM.situacaoData(data, hojeISO())
const dataDoCompromisso = c => CRM.dataCompromisso(c)
const compromissoSit = c => situacaoOf(diaDe(dataDoCompromisso(c)))
const etapaInfo = id => CRM.etapa(id)
const pendenciasHoje = () => hojeItens().length

/* ---------- Hoje: o que o sistema lembra (regras do CRM: mensagens você envia) ---------- */
function hojeItens() {
  const h = hojeISO(), it = []
  for (const c of DB.contatos) {
    if (c.proxima_data && c.proxima_data <= h && ['novo', 'qualificacao', 'agendado', 'diagnostico', 'proposta', 'ativo', 'concluido'].includes(c.etapa)) it.push({ tipo: 'acao', contato_id: c.id, titulo: c.proxima_acao || 'Próxima ação', quando: c.proxima_data, atraso: c.proxima_data < h, modelo: Object.values(CRM.CADENCIA).find(x => x.acao === c.proxima_acao)?.modelo || null })
    if (c.data_nascimento && c.data_nascimento.slice(5) === h.slice(5) && c.etapa !== 'perdido') it.push({ tipo: 'aniversario', contato_id: c.id, titulo: 'Aniversário de ' + (c.nome || ''), quando: h, modelo: '/aniversario' })
    if (c.etapa === 'ativo' && c.ultimo_contato_em && diasEntre(diaDe(c.ultimo_contato_em), h) >= 7) it.push({ tipo: 'relatorio', contato_id: c.id, titulo: 'Cliente ativa há ' + diasEntre(diaDe(c.ultimo_contato_em), h) + ' dias sem novidade', quando: h, modelo: '/relatorio-semanal' })
  }
  for (const t of DB.tarefas) if (!t.concluida && t.prazo <= h) it.push({ tipo: 'tarefa', contato_id: t.contato_id, tarefa_id: t.id, titulo: t.titulo, quando: t.prazo, atraso: t.prazo < h })
  for (const p of DB.compromissos) if (p.status === 'pendente' && (p.tipo === 'prazo') && diaDe(dataDoCompromisso(p)) <= hojeISO(2)) it.push({ tipo: 'prazo', contato_id: p.contato_id, compromisso_id: p.id, titulo: p.titulo, quando: diaDe(dataDoCompromisso(p)), atraso: diaDe(dataDoCompromisso(p)) < h })
  for (const m of DB.intimacoes) if (m.status === 'a_tratar') it.push({ tipo: 'intimacao', contato_id: m.contato_id, intimacao_id: m.id, titulo: 'Intimação a tratar: ' + m.tipo, quando: m.data_publicacao })
  for (const m of DB.mensagens) if (m.direcao === 'entrada' && !m.lida) it.push({ tipo: 'mensagem', contato_id: m.contato_id, titulo: 'Mensagem sem resposta: “' + m.texto.slice(0, 46) + '…”', quando: diaDe(m.created_at) })
  return it.sort((a, b) => (a.quando < b.quando ? -1 : 1))
}
function remarketingElegiveis() {
  const lim = CRM.REMARKETING_INTERVALO_DIAS
  return DB.contatos.filter(c => c.etapa === 'perdido' && !c.nao_contatar && !CRM.MOTIVOS_SEM_REMARKETING.includes(c.motivo_perda)).map(c => { const ult = c.ultimo_remarketing_em || c.etapa_desde; const dias = diasEntre(diaDe(ult), hojeISO()); return { contato: c, dias, pronto: dias >= lim, faltam: Math.max(0, lim - dias) } })
}
function classificarPorNps(nota) { return nota == null ? null : nota >= 9 ? 'promotora' : nota >= 7 ? 'neutra' : 'detratora' }

/* ---------- auditoria + histórico ---------- */
function auditar(acao, detalhe) { DB.auditoria.unshift({ id: proximoId('auditoria'), em: agora(), quem: CONFIG.perfil.nome || 'Você', acao, detalhe }); DB.auditoria = DB.auditoria.slice(0, 300); salvar('auditoria') }
function registrar(contato_id, tipo, texto, caso_id) { DB.atividades.unshift({ id: proximoId('atividades'), contato_id, caso_id: caso_id || null, tipo, texto, created_at: agora(), autor: CONFIG.perfil.nome || 'Você' }); salvar('atividades') }

/* ---------- regras do ciclo de vida (as mesmas do CRM real) ---------- */
function moverEtapa(c, nova, extra = {}) {
  const antes = c.etapa; if (antes === nova) return { ok: true }
  if (nova === 'agendado' && !(extra.consulta_em || c.consulta_em)) return { erro: 'Informe a data e hora da consulta para mover para “Consulta agendada”.' }
  if (nova === 'perdido' && !(extra.motivo_perda || c.motivo_perda)) return { erro: 'Informe o motivo para marcar como “Não contratou”.' }
  c.etapa = nova; c.etapa_desde = agora(); c.updated_at = agora(); Object.assign(c, extra)
  if (nova !== 'perdido') c.motivo_perda = nova === 'perdido' ? c.motivo_perda : null
  const cad = CRM.CADENCIA[nova]; if (cad) { c.proxima_acao = cad.acao; c.proxima_data = somarDias(hojeISO(), cad.dias < 0 ? 0 : cad.dias) } else { c.proxima_acao = null; c.proxima_data = null }
  if (nova === 'agendado') { const iso = c.consulta_em; const ex = DB.compromissos.find(x => x.tipo === 'consulta' && x.contato_id === c.id && x.status === 'pendente'); if (ex) ex.inicio = iso; else DB.compromissos.push({ id: proximoId('compromissos'), tipo: 'consulta', titulo: 'Consulta — ' + (c.nome || 'contato'), contato_id: c.id, caso_id: null, inicio: iso, data_limite: null, data_publicacao: null, dias_prazo: null, local: CONFIG.escritorio.plataforma_consulta || null, status: 'pendente', observacao: null, processo_id: null }); salvar('compromissos') }
  registrar(c.id, 'Anotação', `Etapa: ${CRM.etapa(antes).nome} → ${CRM.etapa(nova).nome}` + (extra.motivo_perda ? ` (${extra.motivo_perda})` : ''))
  auditar('mover_etapa', `${c.nome}: ${antes} → ${nova}`); salvar('contatos'); return { ok: true }
}
function salvarNps(c, nota) { c.nps = nota; c.classificacao = classificarPorNps(nota); c.classificacao_desde = agora(); registrar(c.id, 'Relacionamento', `Nota NPS ${nota} → ${CRM.CLASSIFICACOES[c.classificacao].nome}`); salvar('contatos') }
function abrirDemanda(o) {
  const c = contato(o.contato_id); const dm = { id: proximoId('demandas'), created_at: agora(), data_abertura: hojeISO(), data_encerramento: null, status: 'ativo', resultado: null, observacoes: null, analise: null, fatos: null, estrategia: null, conclusao: null, riscos: null, decisao: null, responsavel_id: null, procedimento: null, ...o }
  DB.demandas.push(dm)
  if (dm.tipo !== 'consultivo' && c && ['novo', 'qualificacao', 'agendado', 'diagnostico', 'proposta'].includes(c.etapa)) moverEtapa(c, 'ativo')
  if (dm.tipo !== 'consultivo') gerarDocumentos(dm)
  registrar(dm.contato_id, 'Anotação', 'Demanda aberta: ' + dm.titulo, dm.id); auditar('abrir_demanda', dm.titulo); salvar('demandas'); salvar('documentos'); return dm
}
function gerarDocumentos(dm) {
  const base = [...CRM.DOCUMENTOS_POR_AREA['*'], ...(CRM.DOCUMENTOS_POR_AREA[dm.area] || []), ...CRM.DOCUMENTOS_POR_AREA.fim]
  for (const [desc, ob] of base) if (!DB.documentos.some(x => x.caso_id === dm.id && x.descricao === desc)) DB.documentos.push({ id: proximoId('documentos'), contato_id: dm.contato_id, caso_id: dm.id, processo_id: null, parte_id: null, origem: 'solicitado', arquivo_provedor: null, arquivo_ref: null, arquivo_url: null, arquivo_nome: null, arquivo_em: null, descricao: desc, obrigatorio: ob, status: 'pendente', observacao: null, ordem: DB.documentos.length + 1, atualizado_em: agora() })
}
function encerrarDemanda(dm, resultado) {
  if (!resultado) return { erro: 'Informe o resultado (êxito, acordo, parcial, sem êxito ou desistência).' }
  const abertos = DB.processos.filter(p => p.caso_id === dm.id && p.status === 'ativo'); if (abertos.length) return { erro: `Há ${abertos.length} processo(s)/procedimento(s) ativo(s). Conclua-os antes de encerrar a demanda.` }
  dm.status = 'encerrado'; dm.resultado = resultado; dm.data_encerramento = hojeISO(); const c = contato(dm.contato_id)
  const outras = DB.demandas.some(x => x.contato_id === dm.contato_id && x.id !== dm.id && x.status === 'ativo' && x.tipo !== 'consultivo')
  if (c && !outras && c.etapa === 'ativo') { moverEtapa(c, 'concluido'); c.proxima_acao = 'Pós-venda 30 dias'; c.proxima_data = somarDias(hojeISO(), 30) }
  registrar(dm.contato_id, 'Anotação', `Demanda encerrada: ${dm.titulo} (${CRM.RESULTADOS_DEMANDA[resultado]})`, dm.id); auditar('encerrar_demanda', dm.titulo); salvar('demandas'); salvar('contatos'); return { ok: true }
}
function excluirDemanda(dm) { if (DB.processos.some(p => p.caso_id === dm.id)) return { erro: 'Esta demanda tem processos/procedimentos. Remova-os primeiro (o CRM bloqueia a exclusão para não perder histórico).' }; DB.demandas = DB.demandas.filter(x => x.id !== dm.id); DB.documentos = DB.documentos.filter(x => x.caso_id !== dm.id); DB.partes = DB.partes.filter(x => x.caso_id !== dm.id); auditar('excluir_demanda', dm.titulo); salvar('demandas'); salvar('documentos'); salvar('partes'); return { ok: true } }
function excluirProcesso(p) { DB.movimentacoes = DB.movimentacoes.filter(x => x.processo_id !== p.id); DB.etapas = DB.etapas.filter(x => x.processo_id !== p.id); DB.pendencias = DB.pendencias.filter(x => x.processo_id !== p.id); DB.processos = DB.processos.filter(x => x.id !== p.id); DB.compromissos.forEach(x => { if (x.processo_id === p.id) x.processo_id = null }); auditar('excluir_processo', p.numero || p.orgao || String(p.id)); ['movimentacoes', 'etapas', 'pendencias', 'processos', 'compromissos'].forEach(salvar); return { ok: true } }
function excluirContato(c) {
  if (demandasDe(c.id).length) return { erro: 'Esta pessoa tem demandas. Encerre/remova as demandas antes de excluir o cadastro.' }
  DB.contatos = DB.contatos.filter(x => x.id !== c.id); for (const col of ['atividades', 'mensagens', 'tarefas', 'documentos', 'honorarios', 'compromissos', 'envios']) DB[col] = DB[col].filter(x => x.contato_id !== c.id)
  auditar('excluir_contato', c.nome || c.telefone); COLECOES.forEach(salvar); return { ok: true }
}
function concluirTarefa(t, v = true) { t.concluida = v; t.updated_at = agora(); salvar('tarefas'); if (t.contato_id) registrar(t.contato_id, 'Anotação', (v ? 'Tarefa concluída: ' : 'Tarefa reaberta: ') + t.titulo, t.caso_id) }
function calcularPrazoCpc(publicacao, dias, tribunal = 'tjba', modo = 'uteis') { return CRM.contarPrazo(publicacao, Number(dias), { trib: tribunal, ssa: true, fac: false }, modo) }

/* ---------- checklist do atendimento: automático a partir dos dados + manual ---------- */
function checklistAtendimento(c) {
  const maxFase = CRM.FASE_MAXIMA_POR_ETAPA[c.etapa] || 0; const dms = demandasDe(c.id); const hon = DB.honorarios.filter(x => x.contato_id === c.id); const docs = docsDe(c.id); const man = CONFIG.checklist_manual[c.id] || {}
  const envResp = DB.envios.some(x => x.contato_id === c.id && x.status === 'respondido')
  const auto = {
    consulta_paga: hon.some(x => x.tipo === 'Consulta' && x.status === 'Pago'), consulta_agendada: !!c.consulta_em, pre_form: envResp, diagnostico: dms.some(x => x.analise || x.riscos || x.decisao),
    proposta: hon.some(x => ['Proposta', 'Contratado', 'Pago'].includes(x.status)), honorario_fechado: hon.some(x => ['Contratado', 'Pago'].includes(x.status)), dados_contrato: !!(c.email && c.telefone),
    contrato_assinado: docs.filter(x => /Procuração assinada|Contrato de honorários assinado/.test(x.descricao)).length > 0 && docs.filter(x => /Procuração assinada|Contrato de honorários assinado/.test(x.descricao)).every(x => ['recebido', 'conferido'].includes(x.status)),
    pasta_drive: !!c.drive_pasta_url, caso_aberto: dms.some(x => x.tipo !== 'consultivo'), docs_obrigatorios: docs.filter(x => x.obrigatorio && x.origem === 'solicitado').length > 0 && docs.filter(x => x.obrigatorio && x.origem === 'solicitado').every(x => ['recebido', 'conferido', 'dispensado'].includes(x.status)),
    caso_encerrado: dms.some(x => x.status === 'encerrado' && x.resultado), nps: c.nps != null,
  }
  return CRM.ITENS_ATENDIMENTO.filter(i => i.fase <= maxFase).map(i => ({ ...i, feito: i.tipo === 'auto' ? !!auto[i.chave] : !!man[i.chave] }))
}
const docsResumo = (cid, did) => { const l = docsDe(cid, did).filter(x => x.origem !== 'produzido'); return { total: l.length, ok: l.filter(x => ['recebido', 'conferido', 'dispensado'].includes(x.status)).length, pend: l.filter(x => x.status === 'pendente' && x.obrigatorio).length } }

function semearIniciais() {
  const I = (id, cliente, acao, area, etapa, meta, fatal, prioridade, docs) => ({ id, cliente, acao, area, parte_contraria: null, meta_protocolo: meta, prazo_fatal: fatal, prazo_fatal_tipo: fatal ? 'prescricao' : null, prioridade, etapa, etapa_desde: agora(-60 * 24 * 2), checklist: docs.map(([texto, ok]) => ({ texto, ok })), obs: null, processo_numero: null, protocolo_data: null })
  return [
    I(1, 'Beatriz Cardoso', 'Divórcio consensual', 'Família', 'redacao', d(2), null, 'alta', [['Certidão de casamento', true], ['Comprovante de residência', true], ['Matrícula dos imóveis', false]]),
    I(2, 'Fernanda Rocha', 'Guarda e alimentos', 'Família', 'revisao', d(-1), null, 'alta', [['Certidão de nascimento dos filhos', true], ['Comprovantes de renda', true]]),
    I(3, 'Helena Prado', 'Alvará judicial', 'Sucessões', 'aguardando', d(10), d(40), 'normal', [['Certidão de óbito', true], ['Extratos bancários do falecido', false]]),
    I(4, 'Luciana Martins', 'Ação de reconhecimento de união estável', 'Família', 'produzir', d(6), null, 'baixa', [['Provas da convivência', false]]),
  ]
}
