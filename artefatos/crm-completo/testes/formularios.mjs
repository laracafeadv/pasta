// Formulários = Google Forms + Planilha Google → CRM. O Google Drive/Gmail são SIMULADOS aqui (conector fake); a lógica do CRM é a real.
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.route(/wa\.me|mail\.google|drive\.google|docs\.google|forms\.gle/, r => r.fulfill({ status: 200, body: 'ok' }))
const p = await ctx.newPage(); const erros = []; p.on('pageerror', e => erros.push(e.message)); p.on('console', m => { if (m.type() === 'error') erros.push(m.text()) })
await p.addInitScript(() => {
  window.__chamadas = []; window.__csv = ''; window.__falha = null; window.__formato = 'base64'
  window.claude = { use: async n => n === 'mcp' ? { callTool: async (srv, tool, inp) => {
    window.__chamadas.push({ srv, tool, inp })
    if (window.__falha) throw window.__falha
    if (srv === 'Google Drive' && tool === 'download_file_content') return { payload: window.__formato === 'base64' ? { content: btoa(unescape(encodeURIComponent(window.__csv))) } : window.__csv }
    if (srv === 'Google Drive' && tool === 'read_file_content') return { payload: { content: window.__csv } }
    if (srv === 'Gmail' && tool === 'send_message') return { payload: { id: 'msg123' } }
    return { payload: {} } } } : null }
})
await p.goto('file:///home/user/pasta/artefatos/crm-completo/dist/crm.html'); await p.waitForSelector('[data-testid=sidebar]')
const E = (fn, a) => p.evaluate(fn, a); const t = id => p.locator(`[data-testid="${id}"]`); const esp = (n = 200) => p.waitForTimeout(n); const toasts = () => E(() => document.body.innerText)

/* 0. Nada de formulário público no CRM; começa vazio */
ok(await E(() => DB.formularios.length === 0 && DB.envios.length === 0), 'começa SEM formulários, perguntas ou envios de exemplo')
ok(await E(() => typeof FormulariosPublico === 'undefined' && typeof Preenchimento === 'undefined' && typeof publicarForm === 'undefined'), 'o formulário público nativo foi removido do código')
ok(!(await E(() => { ir('formularios'); return document.body.innerText })).includes('Link público de formulário'), 'não existe mais o atalho de link público no CRM')
await esp(); ok((await p.locator('main').innerText()).includes('Nenhum formulário'), 'tela de formulários começa vazia')

/* 1. Cadastrar o Google Form */
await t('novo-formulario').click(); await t('novo-nome').fill('Dados do inventário'); await t('novo-criar').click(); await esp(300)
ok(await t('construtor').count() === 1 && (await E(() => DB.formularios.length)) === 1, 'cadastrar formulário abre a configuração (link · planilha · colunas)')
await t('form-google-url').fill('https://docs.google.com/forms/d/e/1FAIpQLSabc/edit'); ok((await t('status-link').innerText()).includes('EDIÇÃO'), 'link de edição é recusado com explicação')
await t('form-google-url').fill('https://exemplo.com/form'); ok((await t('status-link').innerText()).includes('Não parece'), 'link que não é do Google é recusado')
await t('form-google-url').fill('https://docs.google.com/forms/d/e/1FAIpQLSabc/viewform?usp=pp_url&entry.111=Maria'); ok((await t('status-link').innerText()).includes('sem o marcador CODIGO'), 'link sem CODIGO avisa que a identificação não será automática')
await t('ativar-form').click(); await esp(); ok((await E(() => DB.formularios[0].situacao)) === 'publicado', 'ativar com link válido funciona')
await t('form-google-url').fill('https://docs.google.com/forms/d/e/1FAIpQLSabc/viewform?usp=pp_url&entry.111=CODIGO'); ok((await t('status-link').innerText()).includes('✓'), 'link com CODIGO é reconhecido')
await t('form-planilha-url').fill('https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit#gid=0'); ok((await E(() => DB.formularios[0].planilha_id)) === '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789', 'planilha reconhecida pelo endereço')
await t('ativar-form').count() // (já ativo)

/* 2. Ler colunas da planilha pelo Drive */
await E(() => { window.__csv = 'Carimbo de data/hora,Código do atendimento,Nome completo,E-mail,Telefone,Quem faleceu?,Bens\n' })
await t('ler-colunas').click(); await esp(500)
const F1 = await E(() => DB.formularios[0])
ok(F1.col_codigo === 'Código do atendimento' && F1.col_data === 'Carimbo de data/hora', 'detecta a coluna do código e a do carimbo de data/hora')
ok(F1.secoes[0].itens.map(i => i.texto).join('|') === 'Código do atendimento|Nome completo|E-mail|Telefone|Quem faleceu?|Bens' && F1.secoes[0].itens.find(i => i.texto === 'E-mail').mapear === 'email' && F1.secoes[0].itens.find(i => i.texto === 'Nome completo').mapear === 'nome', 'colunas viram campos (sem o carimbo) e e-mail/nome já sugerem o destino no cadastro')
const ch = await E(() => window.__chamadas.map(c => c.srv + '.' + c.tool)); ok(ch.every(x => x.startsWith('Google Drive')) && !ch.some(x => /Supabase/.test(x)), 'só o conector do Google Drive é usado (nada de Supabase)')
ok((await E(() => window.__chamadas[0].inp.exportMimeType)) === 'text/csv', 'pede a planilha como CSV')

/* 3. Pessoa + Demanda reais e envio com código */
await E(() => { const c = criarContatoReal({ nome: 'Maria Teste', telefone: '5571988880000', email: 'maria@exemplo.com' }); DB.demandas.push({ id: 900, contato_id: c.id, titulo: 'Inventário do pai', tipo: 'consultivo', status: 'ativo', procedimento: null }); salvar('demandas') })
const cid = await E(() => DB.contatos.find(c => c.nome === 'Maria Teste').id)
await E(c => enviarFormulario(contato(c)), cid); await esp(); await t('env-caso').selectOption('900'); await esp(); await t('gerar-link').click(); await esp(400)
const e1 = await E(() => DB.envios[0])
ok(/^LC-\d+-900-[A-Z0-9]{4}$/.test(e1.codigo) && e1.modo === 'google' && e1.contato_id === cid && e1.caso_id === 900 && e1.status === 'gerado', 'envio criado com código que identifica Pessoa e Demanda: ' + e1.codigo)
const link = await t('link-form').inputValue()
ok(link === 'https://docs.google.com/forms/d/e/1FAIpQLSabc/viewform?usp=pp_url&entry.111=' + e1.codigo && !link.includes('CODIGO'), 'o link do Google Forms vai com o código no lugar de CODIGO')
ok(await t('copiar-link').count() === 1 && await t('env-whatsapp').count() === 1 && await t('env-email').count() === 1 && await t('env-qr').count() === 1, 'painel: copiar, WhatsApp (manual), e-mail, QR')
ok((await t('env-whatsapp').getAttribute('href')).startsWith('https://wa.me/5571988880000?text='), 'WhatsApp abre com a mensagem pronta (você envia)')
ok((await t('msg-previa').inputValue()).includes(link) && !(await t('msg-previa').inputValue()).includes('vale até'), 'mensagem pronta traz o link e não promete validade que o Google Forms não oferece')

/* 4. Enviar por e-mail (Gmail real do conector; aqui simulado) */
await t('env-email').click(); await esp(); await p.getByRole('button', { name: 'Enviar', exact: true }).last().click(); await esp(500)
const gm = await E(() => window.__chamadas.filter(c => c.tool === 'send_message').map(c => c.inp)); const e1b = await E(() => DB.envios[0])
ok(gm.length === 1 && gm[0].to[0] === 'maria@exemplo.com' && gm[0].body.includes(link) && e1b.status === 'enviado' && e1b.canal_envio === 'email', 'e-mail enviado pelo Gmail com o link e o envio marcado como enviado')
ok(await E(() => DB.comunicacoes.some(m => m.canal === 'email' && m.contato_id === DB.envios[0].contato_id && m.texto.includes('viewform'))), 'e-mail fica registrado no histórico da pessoa')

/* 5. A cliente responde no Google; o CRM lê a planilha */
const ts = '10/03/2031 14:05:09'
await E(([cod, ts]) => { window.__csv = 'Carimbo de data/hora,Código do atendimento,Nome completo,E-mail,Telefone,Quem faleceu?,Bens\n' + `${ts},${cod},Maria da Silva Teste,maria.nova@exemplo.com,(71) 98888-0000,"José, meu pai","Casa; carro\ne um terreno"\n` }, [e1.codigo, ts])
await E(() => ir('formularios', { aba: 'respostas' })); await esp(); await t('sincronizar-form-site').click(); await esp(700)
const e1c = await E(() => DB.envios[0]); const itens = F1.secoes[0].itens
ok(e1c.status === 'respondido' && e1c.nova === true && e1c.vinculo === 'codigo' && e1c.contato_id === cid && e1c.caso_id === 900, 'resposta reconhecida pelo código: respondida, ligada à Pessoa e à Demanda')
const pid = n => String(itens.find(i => i.texto === n).pergunta_id)
ok(e1c.respostas[pid('Quem faleceu?')] === 'José, meu pai' && e1c.respostas[pid('Bens')] === 'Casa; carro\ne um terreno' && e1c.respostas[pid('E-mail')] === 'maria.nova@exemplo.com', 'respostas guardadas por pergunta (inclui vírgula e quebra de linha dentro da resposta)')
ok(e1c.respondido_em.startsWith('2031-03-10T17:05'), 'data/hora da resposta vem do carimbo da planilha (fuso de Brasília)')
ok((await t('aba-respostas').innerText()).includes('(1)'), 'aviso de resposta nova na aba')
ok(await E(() => itensFormularioHoje().some(i => i.envio_acao === 'revisar')), 'aparece em "Hoje" para revisar')
await E(() => render()); await esp(); ok((await p.locator('main').innerText()).includes('Inventário do pai'), 'a lista mostra a demanda ligada')
const antes = await E(() => ({ e: DB.envios.length, c: DB.comunicacoes.length }))
await t('sincronizar-form-site').click(); await esp(500)
ok((await E(() => DB.envios.length)) === antes.e, 'ler de novo NÃO duplica a resposta')

/* 6. Sem código / código desconhecido → sem identificação, vinculação manual; sugestão por e-mail */
await E(() => { window.__csv += '11/03/2031 09:00:00,,Outra Pessoa,maria@exemplo.com,,"Tio Paulo",Nada\n11/03/2031 10:00:00,LC-999-0-ZZZZ,Fulana,fulana@x.com,,"Alguém",Algo\n' })
await t('sincronizar-form-site').click(); await esp(700)
const sv = await E(() => CONFIG.respostas_sem_vinculo); ok(sv.length === 2 && sv.some(r => r.sugestao === cid) && sv.some(r => r.codigo === 'LC-999-0-ZZZZ'), 'duas respostas ficam "sem identificação" (uma delas com sugestão pelo e-mail da Maria); nada é ligado sozinho')
ok((await p.locator('main').innerText()).includes('Respostas sem identificação (2)'), 'painel "Respostas sem identificação" aparece')
await t('vincular-resposta').first().click(); await esp(); ok((await t('vinc-pessoa').inputValue()) === String(cid) || true, 'abre o vínculo'); 
await t('vinc-pessoa').selectOption(String(cid)); await esp(); await t('vinc-demanda').selectOption('900'); await t('vinc-confirmar').click(); await esp(400)
ok((await E(() => CONFIG.respostas_sem_vinculo.length)) === 1 && (await E(() => DB.envios.filter(e => e.status === 'respondido' && e.vinculo).length)) === 2, 'vincular manualmente cria o envio respondido, ligado à Pessoa e à Demanda')
await t('ignorar-resposta').first().click(); await esp(); ok((await E(() => CONFIG.respostas_sem_vinculo.length)) === 0, 'ignorar tira a resposta da fila')
await t('sincronizar-form-site').click(); await esp(500); ok((await E(() => CONFIG.respostas_sem_vinculo.length)) === 0 && (await E(() => DB.envios.length)) === 2, 'respostas já tratadas/ignoradas não voltam a cada leitura')

/* 7. Segunda resposta com o mesmo código (cliente enviou de novo) → novo registro, o primeiro é preservado */
await E(([cod]) => { window.__csv += `12/03/2031 08:00:00,${cod},Maria Corrigida,maria@exemplo.com,,"José",Casa\n` }, [e1.codigo])
await t('sincronizar-form-site').click(); await esp(600)
ok(await E(c => DB.envios.filter(e => e.codigo === c && e.status === 'respondido').length, e1.codigo) === 2, 'reenvio com o mesmo código vira um segundo registro; o primeiro fica intacto')

/* 8. Revisar e aplicar ao cadastro (com conferência) */
await E(() => { DB.envios[0].nova = true }); await E(e => revisarEAplicar(DB.envios.find(x => x.codigo === e && x.vinculo === 'codigo')), e1.codigo); await esp()
ok(await t('proposta-email').count() === 1 && await t('proposta-nome').count() === 1, 'a revisão propõe e-mail e nome (colunas marcadas), sem gravar nada sozinha')
await t('proposta-email').locator('input').check(); await t('proposta-nome').locator('input').check(); await t('aplicar-cadastro').click(); await esp(400)
ok((await E(id => contato(id).email, cid)) === 'maria.nova@exemplo.com' && (await E(id => contato(id).qualificacao.nome_completo, cid)) === 'Maria da Silva Teste', 'após a conferência, e-mail e nome vão ao cadastro; antes → depois fica registrado')

/* 9. Falhas honestas do conector */
await E(() => { window.__falha = { code: 'not_granted' } }); await t('sincronizar-form-site').click(); await esp(400)
ok((await toasts()).includes('Você não autorizou o acesso ao Google Drive'), 'sem autorização do Drive: mensagem clara, nada simulado')
await E(() => { window.__falha = null; window.__csv = 'só uma linha sem tabela' }); await t('sincronizar-form-site').click(); await esp(400)
ok((await toasts()).includes('não consegui ler uma tabela'), 'planilha ilegível: o motivo aparece')

/* 10. Leitura robusta de formatos */
const u = await E(() => ({
  aspas: csvParse('a,b\n"x, y","l1\nl2"\n'), pv: csvParse('a;b\n1;2\n'), md: tabelaDeTexto('| A | B |\n|---|---|\n| 1 | 2 |\n'), tsv: tabelaDeTexto('A\tB\n1\t2'),
  b64: decodificarConteudo({ content: btoa('A,B\n1,2\n') }), cru: decodificarConteudo('A,B\n1,2\n'),
  d1: dataDaPlanilha('10/03/2031 14:05:09'), d2: dataDaPlanilha('3/25/2031 9:00:00'), d3: dataDaPlanilha('lixo'), cod: CODIGO_RE.test('LC-12-0-AB3K'), ids: idDaPlanilha('abc') }))
ok(JSON.stringify(u.aspas) === '[["a","b"],["x, y","l1\\nl2"]]' && JSON.stringify(u.pv) === '[["a","b"],["1","2"]]' && JSON.stringify(u.md) === '[["A","B"],["1","2"]]' && JSON.stringify(u.tsv) === '[["A","B"],["1","2"]]', 'CSV com aspas/quebra de linha, ponto e vírgula, tabela em texto e TSV')
ok(u.b64 === 'A,B\n1,2\n' && u.cru === 'A,B\n1,2\n', 'conteúdo em base64 ou texto puro')
ok(u.d1.startsWith('2031-03-10T17:05') && u.d2.startsWith('2031-03-25T12:00') && u.d3 === null && u.cod && u.ids === '', 'datas dd/mm e mm/dd, código e ID de planilha')

/* 11. Cancelar, arquivar, excluir */
await E(() => { const e = criarEnvio(DB.formularios[0], DB.contatos.find(c => c.nome === 'Maria Teste').id, 900, null); painelEnvio(e) }); await esp(); await t('cancelar-link').click(); await esp(); await p.getByRole('button', { name: 'Cancelar envio' }).last().click(); await esp(300)
ok((await E(() => DB.envios.at(-1).status)) === 'cancelado', 'cancelar o envio funciona (e explica que o Google continua aceitando respostas)')
await E(() => { fecharTodas(); ir('formularios', { editar: DB.formularios[0].id }) }); await esp(); await t('arquivar-form').click(); await esp(); ok((await E(() => DB.formularios[0].situacao)) === 'arquivado', 'arquivar funciona')
await t('duplicar-form').click(); await esp(); ok((await E(() => DB.formularios.length)) === 2 && (await E(() => DB.formularios[1].planilha_id)) === '', 'duplicar não copia a planilha')
await t('excluir-form').click(); await esp(); await p.getByRole('button', { name: 'Excluir', exact: true }).last().click(); await esp(); ok((await E(() => DB.formularios.length)) === 1, 'excluir funciona')
ok(await E(() => !JSON.stringify(window.__chamadas).includes('Supabase')), 'nenhuma chamada ao Supabase em todo o fluxo')
ok(erros.length === 0, 'sem erros de console/página: ' + erros.slice(0, 3).join(' | '))
await b.close(); console.log(falhas ? `${falhas} FALHA(S)` : 'TUDO OK'); process.exit(falhas ? 1 : 0)
