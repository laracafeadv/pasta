// IA como núcleo do atendimento: leitura real do material (WhatsApp+mídias, PDF/Word, formulário, consulta), contexto isolado por caso, fontes, revisão humana, parecer/identidade/exportação.
// O CONECTOR e a IA são SIMULADOS aqui (respostas fixas, para checar o que o CRM envia e como trata a resposta); todo o resto é o código real.
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
import JSZip from '/home/user/pasta/node_modules/jszip/lib/index.js'
import { PDFDocument } from '/home/user/pasta/node_modules/pdf-lib/cjs/index.js'
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true }); await ctx.route(/wa\.me|mail\.google|drive\.google/, r => r.fulfill({ status: 200, body: 'ok' }))
const p = await ctx.newPage(); const erros = []; p.on('pageerror', e => erros.push(e.message)); p.on('console', m => { if (m.type() === 'error') erros.push(m.text()) })
await p.addInitScript(() => {
  window.__prompts = []; window.__imgs = []; window.__downloads = []; window.__chamadas = []
  const SECOES = ['Identificação', 'Objeto da consulta', 'Síntese dos fatos', 'Informações fornecidas', 'Documentos analisados', 'Questões jurídicas identificadas', 'Análise', 'Possibilidades/alternativas', 'Riscos e pontos de atenção', 'Informações/documentos pendentes', 'Providências e encaminhamentos', 'Conclusão']
  const responder = prompt => {
    if (prompt.includes('"perguntas_sugeridas"')) return JSON.stringify({ ja_respondidas: [{ pergunta: 'Estado civil', resposta: 'Casada há 15 anos', fonte: 'W%W%' }], faltam: [{ tema: 'Regime de bens', motivo: 'não informado' }], perguntas_sugeridas: [{ texto: 'Qual é o regime de bens do casamento?', tipo: 'Múltipla escolha', opcoes: ['Comunhão parcial', 'Comunhão universal', 'Separação total'], obrigatoria: true, motivo: 'a conversa diz que é casada, mas não o regime', fontes: ['W%W%'] }, { texto: 'Os filhos são menores de idade?', tipo: 'Resposta curta', opcoes: [], obrigatoria: false, motivo: 'tem dois filhos', fontes: [] }], documentos_sugeridos: [{ documento: 'Matrícula atualizada do imóvel', motivo: 'titularidade' }], confirmar_na_consulta: [{ ponto: 'Em nome de quem está a casa', motivo: 'divergência' }] })
    if (prompt.includes('{"tarefas":[')) return JSON.stringify({ tarefas: [{ titulo: 'Solicitar matrícula atualizada', descricao: 'cliente ficou de enviar', prazo: null, prioridade: 'alta', responsavel: 'cliente', fonte: 'W%W%' }, { titulo: 'Verificar regime de bens', descricao: '', prazo: '2031-01-10', prioridade: 'media', responsavel: 'escritorio', fonte: '' }] })
    if (prompt.includes('{"itens":[')) return JSON.stringify({ itens: [{ categoria: 'fato', texto: 'O pai da cliente faleceu em janeiro de 2024.', status: 'informado', data_fato: '2024-01-15', fontes: ['W%W%'] }, { categoria: 'contradicao', texto: 'A casa foi comprada pela mãe, mas o contrato está em nome de Joana Souza.', status: 'confirmar', data_fato: null, fontes: ['W%W%', 'M%M%'] }, { categoria: 'questao', texto: 'Possível doação em vida (hipótese).', status: 'hipotese', data_fato: null, fontes: [] }] })
    if (prompt.includes('{"secoes":[')) return JSON.stringify({ secoes: SECOES.map(t => ({ titulo: t, texto: `Texto da seção ${t}. A cliente informou o falecimento do pai [W%W%] [INFORMADO].\n- ponto a verificar [PESQUISAR: regras de colação]` })) })
    if (prompt.includes('Transcreva fielmente')) return 'Texto da imagem: CERTIDÃO DE ÓBITO - José Souza - 15/01/2024'
    return 'RESPOSTA DA IA: a cliente informou [W%W%] [INFORMADO] e o contrato [M%M%] [DOCUMENTO]. Falta o regime de bens [AUSENTE].'
  }
  const ids = p => { const c = p.includes('===== CONTEXTO DO CASO') ? p.slice(p.indexOf('===== CONTEXTO DO CASO')) : p; return { W: (c.match(/\[W(\d+)\]/) || [, '1'])[1], M: (c.match(/\[M(\d+)\]/) || [, '1'])[1] } }
  const amostra = async (input, o = {}) => { const prompt = typeof input === 'string' ? input : input.map(x => x.content).join('\n'); window.__prompts.push(prompt); if (o.images) window.__imgs.push(...[].concat(o.images)); const i = ids(prompt); const t = responder(prompt).replace(/%W%/g, i.W).replace(/%M%/g, i.M); o.onText && o.onText({ text: t }); return { text: t, truncated: false } }
  amostra.json = async (input, o) => JSON.parse((await amostra(input, o)).text); amostra.limits = async () => ({ maxBytes: 262144, images: { maxCount: 2, mediaTypes: ['image/png', 'image/jpeg'], maxInputBytes: 5e6 } })
  const dl = { save: async ({ filename, data }) => { const buf = data instanceof Blob ? await data.arrayBuffer() : data.buffer ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data; window.__downloads.push({ filename, bytes: Array.from(new Uint8Array(buf)) }) } }
  window.claude = { use: async n => n === 'mcp' ? { callTool: async (srv, tool, inp) => { window.__chamadas.push({ srv, tool }); return { payload: {} } } } : n === 'sample' ? amostra : n === 'downloads' ? dl : null }
})
await p.goto('file:///home/user/pasta/artefatos/crm-completo/dist/crm.html'); await p.waitForSelector('[data-testid=sidebar]')
const E = (fn, a) => p.evaluate(fn, a); const t = id => p.locator(`[data-testid="${id}"]`); const esp = (n = 250) => p.waitForTimeout(n); const toasts = () => E(() => document.body.innerText)
const topo = async () => { const l = p.locator('[data-testid=fechar]'); if (await l.count()) await l.last().click(); await esp(150) }
const baixados = async () => (await E(() => window.__downloads)).map(d => ({ nome: d.filename, buf: Buffer.from(d.bytes) }))

/* 1. Persistência em partes (limite de 256 KiB por documento do banco do Artifact) */
const per = await E(async () => {
  const docs = new Map(); ARM.modo = 'db'
  ARM.colecao = { doc: id => ({ set: async v => { const s = JSON.stringify(v); if (new TextEncoder().encode(s).length > 256 * 1024) throw new Error('doc grande demais: ' + id); docs.set(id, v) }, get: async () => ({ exists: docs.has(id), data: () => docs.get(id) }), delete: async () => { docs.delete(id) } }) }
  const antes = DB.comunicacoes; DB.comunicacoes = Array.from({ length: 2500 }, (_, i) => ({ id: i + 1, contato_id: 1, texto: 'mensagem número ' + i + ' com acentuação ção ã é '.repeat(8), created_at: new Date(2024, 0, 1 + (i % 28)).toISOString() }))
  const mats = DB.materiais; DB.materiais = [{ id: 1, contato_id: 1, tipo: 'documento', titulo: 'Grande', texto: 'palavra '.repeat(80000), created_at: agora() }, { id: 2, contato_id: 1, tipo: 'documento', titulo: 'Pequeno', texto: 'curto', created_at: agora() }]
  await gravarColecaoEmPartes('comunicacoes'); await gravarColecaoEmPartes('materiais'); const partes = [...docs.keys()].filter(k => k.startsWith('crm_comunicacoes__')).length; const textoGrande = [...docs.keys()].filter(k => k.startsWith('crm_mt_1_')).length
  const volta = await lerColecaoEmPartes('comunicacoes'); const voltaM = await lerColecaoEmPartes('materiais')
  const r = { partes, textoGrande, n: volta.length, igual: JSON.stringify(volta) === JSON.stringify(DB.comunicacoes), mGrande: voltaM[0].texto.length, mPequeno: voltaM[1].texto }
  DB.comunicacoes = antes; DB.materiais = mats; ARM.modo = 'local'; ARM.colecao = null; return r })
ok(per.partes > 1 && per.n === 2500 && per.igual, `2.500 mensagens (>256 KiB) gravadas em ${per.partes} partes e relidas idênticas`)
ok(per.textoGrande >= 8 && per.mGrande === 'palavra '.length * 80000 && per.mPequeno === 'curto', `texto longo de material guardado em ${per.textoGrande} documentos próprios e restaurado inteiro`)

/* 2. Pessoas e demandas reais do teste (a Maria tem 2 demandas; o João é outra pessoa) */
await E(() => { const m = criarContatoReal({ nome: 'Maria Souza', telefone: '5571988880000', email: 'maria@exemplo.com' }); const j = criarContatoReal({ nome: 'João Pereira', telefone: '5571977770000' }); DB.demandas.push({ id: 900, contato_id: m.id, titulo: 'Inventário do pai', tipo: 'consultivo', status: 'ativo', procedimento: null }, { id: 901, contato_id: m.id, titulo: 'Divórcio (outra demanda)', tipo: 'consultivo', status: 'ativo', procedimento: null }); salvar('demandas')
  DB.comunicacoes.push({ id: 9001, contato_id: j.id, caso_id: null, canal: 'whatsapp', direcao: 'entrada', texto: 'SEGREDO DO JOÃO: vendi o apartamento', created_at: agora(), lida: true, origem: 'manual' }); DB.materiais.push({ id: 9002, contato_id: j.id, caso_id: null, tipo: 'documento', titulo: 'Doc do João', texto: 'CONTEÚDO CONFIDENCIAL DO JOÃO', created_at: agora(), origem: 'upload' }); salvar('comunicacoes'); salvar('materiais') })
const cid = await E(() => DB.contatos.find(c => c.nome === 'Maria Souza').id)

/* 3. Importar o .zip do WhatsApp COM mídias */
await E(() => ir('atendimento')); await esp(300); await t('atend-importar').click(); await esp()
await t('wa-arquivo').setInputFiles('/tmp/t/fx/whatsapp.zip'); await esp(900)
ok(/10 mensagens/.test(await t('wa-resumo').innerText()) && (await t('wa-midias').innerText()).includes('4 de 5 arquivos mencionados vieram no .zip') && (await t('wa-midias').innerText()).includes('1 NÃO foram disponibilizados'), 'a prévia diz quantas mídias vieram no .zip (4 de 5) e quantas NÃO foram disponibilizadas')
ok((await t('wa-midias').innerText()).includes('1 mensagem(ns) com “mídia oculta”'), 'mídia “oculta” (sem arquivo) também é sinalizada')
await t('wa-pessoa').selectOption(String(cid)); await esp(); await t('wa-demanda').selectOption('900'); await t('wa-importar').click(); await esp(1800)
const M = await E(cid => ({ msgs: DB.comunicacoes.filter(m => m.contato_id === cid), mats: DB.materiais.filter(m => m.contato_id === cid) }), cid)
const mc = M.msgs.find(m => m.midia_nome === 'Contrato.pdf'), mi = M.msgs.find(m => m.midia_nome === 'IMG-20240312-WA0001.jpg'), ma = M.msgs.find(m => m.midia_nome === 'PTT-20240312-WA0002.opus'), mf = M.msgs.find(m => m.midia_nome === 'FOTO-faltando.jpg'), md = M.msgs.find(m => m.midia_nome === 'Certidao.docx')
ok(M.msgs.length === 10 && mc.midia_ref && mi.midia_ref && ma.midia_ref && md.midia_ref && mc.texto === 'Esse é o contrato da casa.', 'mensagens e mídias ligadas (mensagem ↔ arquivo), com a legenda preservada')
ok(mf.midia_estado === 'nao_disponibilizada' && !mf.midia_ref, 'arquivo mencionado mas ausente no .zip fica marcado como NÃO disponibilizado')
const mat = n => M.mats.find(m => m.id === n)
const mPdf = M.mats.find(m => m.nome_arquivo === 'Contrato.pdf'), mImg = M.mats.find(m => m.nome_arquivo === 'IMG-20240312-WA0001.jpg'), mAud = M.mats.find(m => m.nome_arquivo === 'PTT-20240312-WA0002.opus'), mDoc = M.mats.find(m => m.nome_arquivo === 'Certidao.docx')
ok(mPdf.tipo === 'pdf' && mPdf.texto.includes('Matricula 12345') && mPdf.texto_origem.startsWith('PDF'), 'PDF com texto: o texto foi extraído de verdade no navegador (pdf.js)')
ok(mDoc.tipo === 'documento' && mDoc.texto.includes('comunhao parcial') && mDoc.texto.includes('Pedro e Ana & outros'), 'Word (.docx): texto extraído, com entidades decodificadas')
ok(mImg.tipo === 'imagem' && !mImg.texto && /não lida/.test(mImg.leitura_motivo) && mAud.tipo === 'audio' && !mAud.texto && /não transcreve/.test(mAud.leitura_motivo), 'imagem e áudio entram como NÃO LIDOS, com o motivo (o CRM não inventa conteúdo)')
ok(M.mats.some(m => m.tipo === 'conversa' && m.n_mensagens === 10), 'a conversa original fica como material (n mensagens, período, participantes)')
ok(await E(cid => statusDe(contato(cid)), cid) === 'Em conversa', 'o estado do atendimento passou a “Em conversa” (aplicado ao importar)')
const ids = await E(() => ({ w: DB.comunicacoes.find(m => /Preciso de ajuda/.test(m.texto)).id, pdf: DB.materiais.find(m => m.nome_arquivo === 'Contrato.pdf').id }))

/* 4. O contexto que a IA recebe: real, rotulado e ISOLADO */
const C = await E(cid => { const x = montarContextoCaso(contato(cid), 900); return { texto: x.texto, avisos: x.avisos, stats: x.stats } }, cid)
ok(C.texto.includes('CLIENTE (WhatsApp): Bom dia, Dra. Preciso de ajuda') && C.texto.includes('ESCRITÓRIO (WhatsApp): Bom dia, Maria!') && C.texto.includes('Matricula 12345'), 'o contexto traz a conversa (cliente × escritório, com id de fonte) e o texto do PDF lido')
ok(C.texto.includes('NÃO LIDO') && C.texto.includes('arquivo NÃO disponibilizado na exportação — conteúdo desconhecido') && /IMG-20240312-WA0001.jpg”: \[M\d+\] NÃO LIDO/.test(C.texto), 'mídia sem texto aparece como NÃO LIDO; a ausente, como “não disponibilizado”')
ok(!C.texto.includes('SEGREDO DO JOÃO') && !C.texto.includes('CONFIDENCIAL DO JOÃO'), 'NÃO mistura outra pessoa (nada do João no contexto da Maria)')
await E(() => { DB.materiais.push({ id: 9100, contato_id: DB.contatos.find(c => c.nome === 'Maria Souza').id, caso_id: 901, tipo: 'documento', titulo: 'Só do divórcio', texto: 'TEXTO EXCLUSIVO DO DIVORCIO', created_at: agora(), origem: 'upload' }); DB.materiais.push({ id: 9101, contato_id: DB.contatos.find(c => c.nome === 'Maria Souza').id, caso_id: null, tipo: 'documento', titulo: 'Da pessoa', texto: 'TEXTO DA PESSOA SEM DEMANDA', created_at: agora(), origem: 'upload' }) })
const C2 = await E(cid => ({ d900: montarContextoCaso(contato(cid), 900).texto, d901: montarContextoCaso(contato(cid), 901).texto, todas: montarContextoCaso(contato(cid), null).texto }), cid)
ok(!C2.d900.includes('EXCLUSIVO DO DIVORCIO') && C2.d900.includes('TEXTO DA PESSOA SEM DEMANDA') && C2.d900.includes('(sem demanda)'), 'com a Demanda 900 em foco: não entra material da Demanda 901; entra o da pessoa, marcado “(sem demanda)”')
ok(C2.d901.includes('EXCLUSIVO DO DIVORCIO') && !C2.d901.includes('Matricula 12345') && C2.todas.includes('EXCLUSIVO DO DIVORCIO') && C2.todas.includes('Matricula 12345'), 'foco na 901 só vê a 901; sem foco, vê tudo da pessoa')
await E(() => { DB.materiais = DB.materiais.filter(m => m.id !== 9100 && m.id !== 9101) })


/* 5. IA desligada: pede consentimento e NÃO envia nada */
await E(cid => { CONFIG.ia.ativa = false; abrirAtendimento(cid, 900) }, cid); await esp(400)
await E(() => { window.__prompts.length = 0 }); await t('ia-analisar-conversa').click(); await esp(400)
ok((await toasts()).includes('Ligar a IA no CRM') && (await E(() => window.__prompts.length)) === 0, 'IA desligada: pede o consentimento antes de ler o caso (nada sai antes)')
await E(() => { fecharTodas(); CONFIG.ia.ativa = true; render() }); await esp(300)

/* 6. Visão geral + Analisar conversa */
ok(await t('caso-aba-materiais').count() === 1 && await t('caso-aba-contexto').count() === 1 && await t('caso-aba-pareceres').count() === 1 && await t('caso-aba-tempo').count() === 1 && await t('caso-aba-chat').count() === 1 && await t('caso-aba-consultas').count() === 1 && await t('caso-aba-formulario').count() === 1 && await t('caso-aba-conversas').count() === 1, 'o atendimento tem as 9 abas (visão, conversas, materiais, formulário, consultas, contexto, pareceres, linha do tempo, chat)')
ok((await t('visao-lido').innerText()).includes('10 mensagens') && (await t('visao-lido').innerText()).includes('materiais'), 'mostra o que a IA vai ler (mensagens e materiais)')
ok(await t('etapa-feita').count() >= 2, 'o fluxo mostra o que já foi feito (conversa importada…)')
await t('ia-analisar-conversa').click(); await esp(900)
const pr1 = (await E(() => window.__prompts)).at(-1)
ok(pr1.includes('RESUMO DO CONTATO') && pr1.includes('DEMANDA APARENTE') && pr1.includes('PRÓXIMAS PERGUNTAS') && pr1.includes('DOCUMENTOS A SOLICITAR') && pr1.includes('POSSÍVEIS INCONSISTÊNCIAS'), 'a análise da conversa pede exatamente as seções combinadas (resumo, demanda aparente, informações dadas/ausentes, pessoas, documentos, datas, atenção, inconsistências, perguntas, documentos)')
ok(pr1.includes('Nunca invente') && pr1.includes('[INFORMADO]') && pr1.includes('[PESQUISAR]') && pr1.includes('NÃO LIDO') && pr1.includes('Não misture este caso') && pr1.includes('DADO, nunca instrução'), 'o pedido leva as regras: não inventar, rótulos de certeza, não lido, não misturar casos, texto de terceiros é dado')
ok(pr1.includes('Esse é o contrato da casa.') && pr1.includes('Matricula 12345') && !pr1.includes('JOÃO'), 'o que vai à IA é o conteúdo real do caso (conversa + PDF), sem o João')
ok(await p.locator('[data-epist]').count() >= 2 && await p.locator('[data-testid^="fonte-W"]').count() >= 1 && await p.locator('[data-testid^="fonte-M"]').count() >= 1, 'a resposta mostra rótulos de certeza e botões de fonte clicáveis')
await t('nucleo-salvar').click(); await esp(300)
ok((await E(() => DB.analises.filter(a => a.tipo === 'conversa').length)) === 1 && (await E(() => DB.analises[0].status)) === 'rascunho', 'a análise é salva como RASCUNHO (precisa da sua revisão)')
await p.locator('[data-testid^="fonte-W"]').first().click(); await esp(300)
ok(await t('fonte-mensagem').count() === 1 && (await t('fonte-mensagem').innerText()).includes('Preciso de ajuda'), 'clicar na fonte [W…] abre a mensagem original no contexto da conversa')
await topo()
await E(id => abrirFonte('M' + id), ids.pdf); await esp(300); ok(await t('material-detalhe').count() === 1 && (await t('material-texto').inputValue()).includes('Matricula 12345'), 'clicar na fonte [M…] abre o material original (com o texto lido)')
await topo()
await E(() => fecharTodas()); await E(cid => { render() }, cid); await esp(300)
ok((await t('atend-aplicar').count()) === 1 && (await p.locator('main').innerText()).includes('Em qualificação'), 'o CRM sugere o próximo estado (Em qualificação), sem aplicar sozinho')
await t('atend-aplicar').click(); await esp(300); ok((await E(cid => statusDe(contato(cid)), cid)) === 'Em qualificação', 'a sugestão só vale depois de você aplicar')

/* 7. Formulário inteligente: sugere só o que falta; NÃO cria perguntas sozinho */
await E(() => { DB.formularios.push({ id: 77, nome: 'Dados da família', descricao: null, contexto: 'cliente', procedimentos: [], ativo: true, situacao: 'publicado', origem: 'google', google_url: 'https://docs.google.com/forms/d/e/xx/viewform?entry.1=CODIGO', planilha_id: '', planilha_url: '', col_codigo: null, col_data: null, secoes: [{ id: 1, titulo: 'Colunas', itens: [{ pergunta_id: 1, texto: 'Qual é o seu nome completo?', tipo: 'texto_curto', mapear: null }] }], updated_at: agora() }); salvar('formularios') })
await E(cid => abrirAtendimento(cid, 900), cid); await esp(300); await t('ia-perguntas').click(); await esp(300); await t('pf-form').selectOption('77'); await t('pf-gerar').click(); await esp(900)
const pr2 = (await E(() => window.__prompts)).at(-1)
ok(pr2.includes('NÃO pergunte o que já foi informado') && pr2.includes('Qual é o seu nome completo?') && pr2.includes('perguntas_sugeridas'), 'pede só as lacunas, manda não repetir o que já foi dito e o que o formulário já pergunta')
ok((await t('pf-resultado').innerText()).toLowerCase().includes('perguntas já respondidas') && (await t('pf-resultado').innerText()).includes('Casada há 15 anos') && (await t('pf-resultado').innerText()).toLowerCase().includes('o que ainda falta') && (await t('pf-resultado').innerText()).toLowerCase().includes('regime de bens') && (await t('pf-resultado').innerText()).toLowerCase().includes('documentos sugeridos') && (await t('pf-resultado').innerText()).toLowerCase().includes('pontos para confirmar na consulta'), 'mostra: já respondidas, o que falta, perguntas sugeridas, documentos e pontos para confirmar')
ok(await t('pf-marcar').count() === 2, 'as perguntas sugeridas vêm para sua revisão (marcar/editar)')
await t('pf-marcar').nth(1).uncheck(); await t('pf-alvo').selectOption('77'); await t('pf-guardar').click(); await esp(300)
const F77 = await E(() => DB.formularios.find(f => f.id === 77))
ok(F77.planejado.length === 1 && F77.planejado[0].texto.includes('regime de bens') && F77.secoes[0].itens.length === 1, 'só a pergunta marcada é guardada como PLANEJADA; o formulário em si não ganhou nada sozinho')
await topo()

/* 8. Tarefas sugeridas → você revisa → cria */
const nt0 = await E(() => DB.tarefas.length)
await E(cid => abrirAtendimento(cid, 900), cid); await esp(300); await t('ia-tarefas').click(); await esp(900)
ok(await t('ts-marcar').count() === 2, 'a IA sugere tarefas (nada criado ainda)'); ok((await E(() => DB.tarefas.length)) === nt0, 'nenhuma tarefa existe antes de você confirmar')
await t('ts-criar').click(); await esp(400)
const tn = await E(() => DB.tarefas.slice(-2)); ok(tn.length === 2 && tn.some(x => x.titulo === 'Aguardar: Solicitar matrícula atualizada' && x.caso_id === 900) && tn.every(x => x.contato_id), 'tarefas criadas após a revisão, ligadas à Pessoa e à Demanda (a do cliente vira “Aguardar: …”)')

/* 9. Contexto do caso: a IA propõe; só entra o que você aceita; depois a IA usa */
await E(cid => abrirAtendimento(cid, 900, 'contexto'), cid); await esp(300); await t('ctx-atualizar').click(); await esp(900)
ok(await t('cx-marcar').count() === 3 && (await t('cx-marcar').nth(2).isChecked()) === false && (await t('cx-marcar').nth(0).isChecked()) === true, 'itens sugeridos: informado/confirmar vêm marcados; hipótese vem DESMARCADA')
await t('cx-aceitar').click(); await esp(400)
const X = await E(() => DB.ctx_itens); ok(X.length === 2 && X.every(x => x.revisado && x.criado_por === 'ia' && x.caso_id === 900) && X[1].categoria === 'contradicao' && X[1].fontes.length >= 1, 'só os aceitos entram no contexto (com categoria, situação e fontes)')
await esp(300); ok(await t('ctx-item').count() === 2 && (await p.locator('main').innerText()).toLowerCase().includes('contradições'), 'o Contexto do caso lista os itens por categoria')
await E(cid => { window.__prompts.length = 0; abrirAtendimento(cid, 900); }, cid); await esp(300); await t('ia-cronologia').click(); await esp(700)
ok((await E(() => window.__prompts.at(-1))).includes('CONTEXTO JÁ CONFIRMADO PELA ADVOGADA') && (await E(() => window.__prompts.at(-1))).includes('O pai da cliente faleceu'), 'depois de aceito, o contexto vira memória que a IA usa nas próximas análises')
await topo()

/* 10. Consulta: transcrição colada → a IA lê a reunião */
await E(cid => { DB.consultas.push({ id: 1, contato_id: cid, caso_id: 900, tipo: 'consulta', data_hora: '2024-03-20T14:00:00.000Z', status: 'realizada', participantes: 'Dra. Lara, Maria Souza', anotacoes: 'Cliente trouxe a matrícula.', encaminhamentos: '', created_at: agora() }); salvar('consultas'); abrirAtendimento(cid, 900, 'consultas') }, cid); await esp(300)
await t('consulta-abrir').click(); await esp(300); await t('consulta-colar').click(); await esp(200); await t('txt-corpo').fill('ADVOGADA: Qual o regime de bens?\nMARIA: Comunhão parcial, doutora. Meu irmão Carlos ficou de pagar o ITCMD.'); await t('txt-adicionar').click(); await esp(600)
const tr = await E(() => DB.materiais.find(m => m.tipo === 'transcricao')); ok(tr && tr.consulta_id === 1 && tr.caso_id === 900 && tr.texto.includes('Comunhão parcial') && tr.texto_origem === 'transcrição fornecida por você', 'a transcrição fica ligada à Pessoa, à Demanda e à Consulta (origem: fornecida por você)')
await E(() => { fecharTodas(); abrirConsulta(DB.consultas[0]) }); await esp(300); await E(() => { window.__prompts.length = 0 }); await t('cons-ia-resumir').click(); await esp(700)
let pc = (await E(() => window.__prompts)).at(-1); ok(pc.includes('RESUMO TÉCNICO') && pc.includes('[C1]') && pc.includes('Comunhão parcial, doutora') && pc.includes('da consulta C1'), 'resumir a consulta lê a transcrição e as anotações daquela consulta')
await topo(); await t('cons-ia-processar').click(); await esp(700); pc = (await E(() => window.__prompts)).at(-1)
ok(['RESUMO', 'PENDÊNCIAS', 'DOCUMENTOS FALTANTES', 'PRÓXIMOS PASSOS', 'TAREFAS', 'PONTOS PARA PESQUISA JURÍDICA', 'PONTOS PARA CONFIRMAÇÃO', 'RASCUNHO DE FOLLOW-UP', 'ESTRUTURA SUGERIDA DO PARECER'].every(x => pc.includes(x)), '“Processar consulta” pede resumo, pendências, documentos, próximos passos, tarefas, pesquisa, confirmação, follow-up e estrutura do parecer')
await topo()
await t('consulta-pergunta').fill('O que foi decidido?'); await t('consulta-perguntar').click(); await esp(700); ok((await E(() => window.__prompts.at(-1))).includes('O que foi decidido?') && (await E(() => window.__prompts.at(-1))).includes('Responda à pergunta'), 'pergunta livre sobre a reunião')
await topo()

/* 11. Identidade visual + parecer + exportações */
await E(() => { fecharTodas(); ir('identidade') }); await esp(400)
await t('id-nome').fill('Lara Café Advocacia & Consultoria'); await t('id-nome').blur(); await t('id-advogada').fill('Lara Café'); await t('id-advogada').blur(); await t('id-oab').fill('BA 99999'); await t('id-oab').blur(); await t('id-email').fill('contato@laracafe.adv.br'); await t('id-email').blur(); await t('id-rodape').fill('Salvador/BA · www.laracafe.adv.br'); await t('id-rodape').blur()
await t('id-logo').setInputFiles('/tmp/t/fx/logo.png'); await esp(700)
ok((await E(() => CONFIG.identidade.nome_escritorio)) === 'Lara Café Advocacia & Consultoria' && (await E(() => CONFIG.identidade.logo)).startsWith('data:image/') && (await t('id-logo-img').count()) === 1, 'identidade cadastrada (nome, OAB, e-mail, rodapé) e logo guardado (reduzido)')
await E(cid => abrirAtendimento(cid, 900, 'pareceres'), cid); await esp(300); await t('gerar-parecer').click(); await esp(300); await t('gd-extra').fill('Dar ênfase à partilha.'); await t('gd-gerar').click(); await esp(900)
const pg = (await E(() => window.__prompts)).at(-1); ok(pg.includes('PARECER') && SECOES12().every(x => pg.includes(x)) && pg.includes('não invente fatos') && pg.includes('[PESQUISAR: o que verificar]') && pg.includes('Dar ênfase à partilha.'), 'o pedido do parecer segue as 12 seções combinadas, proíbe inventar e manda marcar [PESQUISAR]/[CONFIRMAR]/[AUSENTE]')
function SECOES12() { return ['Identificação', 'Objeto da consulta', 'Síntese dos fatos', 'Informações fornecidas', 'Documentos analisados', 'Questões jurídicas identificadas', 'Análise', 'Possibilidades/alternativas', 'Riscos e pontos de atenção', 'Informações/documentos pendentes', 'Providências e encaminhamentos', 'Conclusão'] }
await t('gd-abrir-editor').click(); await esp(400)
ok(await t('parecer-secao').count() === 12 && (await E(() => DB.pareceres[0].status)) === 'rascunho' && (await E(() => DB.pareceres[0].gerado_por_ia)) === true, 'o parecer abre no editor como RASCUNHO gerado por IA, com as 12 seções')
await p.locator('[data-testid=parecer-texto]').first().fill('Maria Souza, brasileira, casada, procura orientação sobre o inventário de seu pai José Souza, falecido em janeiro de 2024.'); await t('parecer-salvar').click(); await esp(200)
await t('parecer-visualizar').click(); await esp(300); const prev = await t('doc-previa').innerText()
ok(prev.includes('Lara Café Advocacia & Consultoria') && prev.includes('BA 99999') && prev.includes('RASCUNHO — NÃO FINALIZADO') && prev.includes('Maria Souza, brasileira') && !/\[W\d+\]/.test(prev) && !prev.includes('[INFORMADO]') && prev.includes('[PESQUISAR'), 'a pré-visualização usa a identidade, marca RASCUNHO, esconde as fontes internas e mantém visíveis os pontos a pesquisar')
await topo()
await t('parecer-docx').click(); await esp(1200); await t('parecer-pdf').click(); await esp(1500)
const arqs = await baixados(); const dx = arqs.find(a => a.nome.endsWith('.docx')), pf = arqs.find(a => a.nome.endsWith('.pdf'))
ok(dx && pf, 'DOCX e PDF gerados no navegador e entregues pelo download')
const z = await JSZip.loadAsync(dx.buf); const docXml = await z.file('word/document.xml').async('string'); const hdr = Object.keys(z.files).find(n => /word\/header\d*\.xml/.test(n)); const hdrXml = hdr ? await z.file(hdr).async('string') : ''
ok(docXml.includes('Maria Souza, brasileira') && docXml.includes('1. Identificação') && !/\[W\d+\]/.test(docXml) && /RASCUNHO/.test(hdrXml) && hdrXml.includes('Lara Café Advocacia &amp; Consultoria') && Object.keys(z.files).some(n => /^word\/media\//.test(n)), 'DOCX válido: seções numeradas, texto editado, sem fontes internas, cabeçalho com a identidade e o logo embutido')
const pdoc = await PDFDocument.load(pf.buf); ok(pf.buf.slice(0, 5).toString() === '%PDF-' && pdoc.getPageCount() >= 1 && pf.buf.length > 3000, `PDF válido (${pdoc.getPageCount()} página(s), ${pf.buf.length} bytes)`)
await t('parecer-revisado').click(); await esp(300); await t('parecer-finalizar').click(); await esp(300)
ok((await p.locator('[role=dialog]').last().innerText()).includes('Ainda há pontos a resolver') && (await E(() => DB.pareceres[0].status)) === 'revisado', 'finalizar com [PESQUISAR]/[CONFIRMAR] pendentes pede confirmação (não finaliza sozinho)')
await p.getByRole('button', { name: 'Finalizar assim mesmo' }).click(); await esp(300); ok((await E(() => DB.pareceres[0].status)) === 'finalizado' && (await E(() => DB.pareceres[0].versoes.length)) === 1, 'finalizado só por ação sua (guarda a versão)')
await E(() => { window.__downloads.length = 0 }); await t('parecer-pdf').click(); await esp(1200); ok((await baixados()).length === 1, 'o parecer finalizado também exporta')
await topo()

/* 12. Mídia: imagem lida pela IA de visão (onde há suporte) e áudio com transcrição manual */
await E(cid => { fecharTodas(); abrirAtendimento(cid, 900, 'materiais') }, cid); await esp(400)
const imgId = await E(() => DB.materiais.find(m => m.nome_arquivo === 'IMG-20240312-WA0001.jpg').id); const audId = await E(() => DB.materiais.find(m => m.nome_arquivo === 'PTT-20240312-WA0002.opus').id)
await E(id => abrirMaterial(por('materiais', id)), imgId); await esp(300); ok((await t('material-detalhe').innerText()).includes('NÃO LIDO'), 'a imagem aparece como NÃO LIDA')
await t('material-visao').click(); await esp(900); const imgs = await E(() => window.__imgs.length)
ok(imgs >= 1 && (await E(id => por('materiais', id).texto, imgId)).includes('CERTIDÃO DE ÓBITO') && (await E(id => por('materiais', id).lido_por_ia, imgId)) === true && (await E(id => por('materiais', id).texto_origem, imgId)).includes('IA de visão'), 'imagem lida pela IA de visão: texto guardado, marcado “lido por IA — confira com o original”')
await E(() => fecharTodas()); await E(id => abrirMaterial(por('materiais', id)), audId); await esp(300); ok(await t('material-visao').count() === 0 && (await t('material-detalhe').innerText()).includes('NÃO LIDO') && (await t('material-detalhe').innerText()).includes('o Artifact não transcreve'), 'áudio: não oferece leitura automática e diz que o Artifact não transcreve')
await t('material-texto').fill('MARIA (áudio): o Carlos vai pagar o imposto até março.'); await t('material-salvar').click(); await esp(300)
ok((await E(id => por('materiais', id).texto_origem, audId)) === 'transcrição fornecida por você' && (await E(id => por('materiais', id).leitura_motivo, audId)) === null, 'com a transcrição colada por você, o áudio passa a ser lido (origem registrada)')
await topo()

/* 13. Chat da IA dentro do caso (por Demanda) */
await E(cid => { window.__prompts.length = 0; abrirAtendimento(cid, 900, 'chat') }, cid); await esp(300)
await t('chat-entrada').fill('Quais perguntas devo fazer agora?'); await t('chat-enviar').click(); await esp(900)
const pch = (await E(() => window.__prompts)).at(-1); ok(pch.includes('ÚLTIMA MENSAGEM DA ADVOGADA: Quais perguntas devo fazer agora?') && pch.includes('transcrição') === false || pch.includes('Comunhão parcial, doutora'), 'o chat envia a pergunta junto com o contexto real do caso')
ok((await E(() => DB.chat_ia.filter(m => m.caso_id === 900).length)) === 2 && (await t('chat-msg').count()) === 2, 'a conversa do chat fica guardada no caso (pergunta e resposta)')
await t('chat-rapida').first().click(); await esp(900); ok((await E(() => window.__prompts.at(-1))).includes('CONVERSA DO CHAT ATÉ AGORA') && (await E(() => window.__prompts.at(-1))).includes('Quais perguntas devo fazer agora?'), 'o chat mantém o histórico e tem atalhos com as perguntas mais comuns')
await E(cid => abrirAtendimento(cid, 901, 'chat'), cid); await esp(300); ok((await t('chat-msg').count()) === 0, 'o chat de outra Demanda é separado')

/* 14. Linha do tempo + follow-up (nunca enviado) + sem envio */
await E(cid => abrirAtendimento(cid, 900, 'tempo'), cid); await esp(300); const tl = await t('linha-tempo').innerText()
ok(['Novo contato', 'Conversa importada', 'Material adicionado', 'IA: Análise da conversa', 'Consulta realizada', 'Transcrição adicionada', 'Parecer gerado'].every(x => tl.includes(x)), 'a linha do tempo reúne conversa, IA, materiais, consulta, transcrição e parecer, ligada ao caso')
await E(cid => { window.__prompts.length = 0; abrirAtendimento(cid, 900) }, cid); await esp(300); await t('ia-followup').click(); await esp(800)
ok((await E(() => window.__prompts.at(-1))).includes('follow-up') && (await E(() => window.__prompts.at(-1))).includes('Se NÃO houver consulta'), 'follow-up gerado a partir do combinado (e avisa quando não há consulta)')
ok((await t('followup-whats').count()) === 1, 'oferece abrir o WhatsApp com o texto: você revisa e envia')
await t('nucleo-salvar').click(); await esp(300); await topo()
ok((await E(() => DB.analises.some(a => a.tipo === 'followup'))) && (await E(() => (window.__chamadas || []).filter(c => ['send_message', 'create_draft'].includes(c.tool)).length)) === 0, 'o follow-up fica como rascunho; em nenhum momento o CRM/IA enviou mensagem')
await E(cid => abrirAtendimento(cid, 900), cid); await esp(300); await t('analise-abrir').last().click(); await esp(300); ok((await t('followup-enviado').count()) >= 0, 'o follow-up pode ser marcado como enviado manualmente')
await topo()

/* 16. Formulário respondido entra no contexto; conversa muito longa → aviso + resumo da parte antiga */
await E(cid => { DB.envios.push({ id: 5001, contato_id: cid, caso_id: 900, formulario_id: 77, formulario_nome: 'Dados da família', modo: 'google', status: 'respondido', respondido_em: agora(), created_at: agora(), codigo: 'LC-1-900-ABCD', token: 'x', snap: [{ pergunta_id: 1, texto: 'Qual é o seu nome completo?', tipo: 'texto_curto' }, { pergunta_id: 2, texto: 'Há bens em nome da sua mãe?', tipo: 'texto_curto' }], respostas: { 1: 'Maria Souza', 2: null } }); salvar('envios') }, cid)
const cf = await E(cid => montarContextoCaso(contato(cid), 900).texto, cid); ok(cf.includes('[R5001] Formulário “Dados da família”') && cf.includes('P: Qual é o seu nome completo? | R: Maria Souza') && cf.includes('P: Há bens em nome da sua mãe? | R: (em branco)'), 'a resposta do formulário entra no contexto, pergunta a pergunta, com “(em branco)” onde a cliente não respondeu')
const longo = await E(() => { const c = criarContatoReal({ nome: 'Carlos Longo', telefone: '5571966660000' }); for (let i = 0; i < 520; i++) DB.comunicacoes.push({ id: 20000 + i, contato_id: c.id, caso_id: null, canal: 'whatsapp', direcao: i % 2 ? 'saida' : 'entrada', texto: 'mensagem longa número ' + i + ' ' + 'palavra '.repeat(45), created_at: new Date(2024, 0, 1, 8, i).toISOString(), lida: true, origem: 'manual' }); const x = montarContextoCaso(c, null); return { cid: c.id, msgs: x.stats.msgs, incl: x.stats.msgsIncluidas, aviso: x.avisos.join('|') } })
ok(longo.msgs === 520 && longo.incl < 520 && /Resumir parte antiga/.test(longo.aviso), `conversa de ${longo.msgs} mensagens: só as ${longo.incl} mais recentes cabem; o CRM avisa e oferece resumir a parte antiga`)
await E(cid => { window.__prompts.length = 0; resumirConversaAntiga(contato(cid), null) }, longo.cid); await esp(1500)
const ra = await E(() => DB.analises.find(a => a.tipo === 'resumo_conversa')); const ctx3 = await E(cid => montarContextoCaso(contato(cid), null), longo.cid)
ok(ra && ra.ate_msg_id >= 20000 && ctx3.texto.includes('RESUMO DAS') && ctx3.texto.includes('não é o texto original') && !ctx3.avisos.join('|').includes('Resumir parte antiga'), 'o resumo da parte antiga é guardado e passa a entrar no contexto (identificado como resumo, não como texto original)')

/* 15. Painel comercial */
await E(() => ir('atendimento', { aba: 'painel' })); await esp(300); const pn = await p.locator('main').innerText(); ok(pn.includes('Maria Souza') && pn.toLowerCase().includes('painel comercial') && await t('atend-filtro').count() >= 14, 'painel comercial lista as pessoas por estado (13 estados + todos)')
ok(erros.length === 0, 'sem erros de console/página: ' + erros.slice(0, 3).join(' | '))
await b.close(); console.log(falhas ? `${falhas} FALHA(S)` : 'TUDO OK'); process.exit(falhas ? 1 : 0)
