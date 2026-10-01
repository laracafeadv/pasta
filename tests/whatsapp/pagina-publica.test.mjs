// Página estática do formulário (docs/formulario/index.html) no Chromium em tamanho de celular, falando com o handler REAL da API (supabase-js + PostgREST falso).
// Rodar: CHROME=... node --experimental-strip-types --no-warnings tests/whatsapp/pagina-publica.test.mjs
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
import { createClient } from '/home/user/pasta/node_modules/@supabase/supabase-js/dist/index.mjs'
import { DB, criar, servidor } from '../formulario-link/fake-supabase.mjs'
import { formularioPublico } from '../../supabase/functions/_shared/handlers.ts'
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const fake = await servidor(4022); const db = createClient('http://localhost:4022', 'k', { auth: { persistSession: false } })
const P = (id, texto, tipo, x = {}) => ({ pergunta_id: id, texto, tipo, opcoes: [], ajuda: null, obrigatoria: false, mostrar_se: null, ...x })
const estrutura = { nome: 'Questionário da Dra.', descricao: 'Preencha com calma.', instrucoes: 'Tenha o RG em mãos.', finalidade: 'Preparar o seu caso', mensagem_final: 'Entro em contato em 2 dias.', secoes: [{ titulo: 'Sobre você', itens: [
  P('a', 'Seu nome completo', 'texto_curto', { obrigatoria: true }), P('b', 'Tem filhos?', 'sim_nao', { obrigatoria: true }), P('c', 'Quantos filhos?', 'numero', { obrigatoria: true, mostrar_se: { juntar: 'e', regras: [{ pergunta_id: 'b', operador: 'igual', valor: 'Sim' }] } }),
  P('d', 'CPF', 'cpf_cnpj'), P('e', 'Endereço', 'endereco'), P('f', 'Regime', 'lista_suspensa', { opcoes: ['Parcial', 'Total'] }), P('g', 'Assinatura', 'assinatura', { obrigatoria: true })] }] }
const TOK = 'K'.repeat(32), TOK2 = 'J'.repeat(32)
criar({ profiles: [{ id: 'u1', role: 'equipe' }], contatos: [{ id: 1, nome: 'Beatriz Cardoso', telefone: '5571999990001' }], casos: [{ id: 5, contato_id: 1, titulo: 'Divórcio' }], escritorio: [{ chave: 'advogada_nome', valor: 'Lara Café' }],
  formulario_envios: [{ id: 1, contato_id: 1, caso_id: 5, token: TOK, status: 'enviado', expira_em: new Date(Date.now() + 864e5).toISOString(), respondido_em: null, prazo_resposta: '2031-02-01', versao_formulario: 2, estrutura }, { id: 2, contato_id: 1, caso_id: 5, token: TOK2, status: 'respondido', expira_em: new Date(Date.now() + 864e5).toISOString(), respondido_em: new Date().toISOString(), versao_formulario: 1, estrutura }], formulario_envio_respostas: [], atividades: [], notifications: [] })
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
const ctx = await b.newContext({ viewport: { width: 400, height: 900 } }); const p = await ctx.newPage(); const erros = []; p.on('pageerror', e => erros.push(e.message))
await p.route(/functions\/v1\/crm-api\/formulario/, async route => { const r = route.request(); try { const resp = await formularioPublico(new Request(r.url(), { method: r.method(), body: r.method() === 'POST' ? r.postData() : undefined }), db); await route.fulfill({ status: resp.status, headers: Object.fromEntries(resp.headers), body: await resp.text() }) } catch (e) { console.log('ROTA ERRO', e); await route.abort() } })
const url = t => 'file:///home/user/pasta/docs/formulario/index.html?t=' + t
await p.goto(url(TOK)); await p.waitForSelector('[data-testid=titulo]')
const corpo = await p.locator('body').innerText()
ok(/Questionário da Dra\./.test(corpo) && /Tenha o RG/.test(corpo) && /Dra\. Lara Café/.test(corpo) && /Olá, Beatriz/.test(corpo) && /01\/02\/2031/.test(corpo), 'mostra título, instruções, identidade e prazo (só do que foi enviado)')
ok(!/Financeiro|Pessoas|Demandas|Configurações|Hoje|Divórcio|5571999990001/.test(corpo), 'sem menu, dados internos, demanda ou telefone')
ok(DB.formulario_envios[0].status === 'visualizado', 'abrir o link marca "aberto"')
ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'celular: sem rolagem horizontal')
ok(await p.getByText('Quantos filhos?').count() === 0, 'pergunta condicional começa escondida')
await p.locator('#q' + 'a').fill('Maria da Silva'); await p.waitForTimeout(300); ok(DB.formulario_envios[0].status === 'iniciado', 'digitar marca "iniciado"')
await p.getByText('Sim', { exact: true }).click(); ok(await p.getByText('Quantos filhos?').count() === 1, 'ao responder Sim, a pergunta condicional aparece')
await p.locator('#qc').fill('2')
await p.locator('#qd').fill('52998224725'); ok(await p.locator('#qd').inputValue() === '529.982.247-25', 'CPF com máscara')
await p.getByLabel('CEP').fill('41810000'); await p.getByLabel('Rua / avenida').fill('Rua das Flores'); await p.getByLabel('Número').fill('45'); await p.getByLabel('Cidade').fill('Salvador'); await p.getByLabel('UF').selectOption('BA'); await p.locator('#qf').selectOption('Total')
await p.locator('#enviar').click(); await p.waitForTimeout(300); ok(await p.locator('.erro-campo').count() === 1 && DB.formulario_envios[0].status === 'iniciado', 'assinatura obrigatória vazia bloqueia o envio (nada gravado)')
await p.locator('canvas').scrollIntoViewIfNeeded(); const cv = await p.locator('canvas').boundingBox(); await p.mouse.move(cv.x + 20, cv.y + 50); await p.mouse.down(); await p.mouse.move(cv.x + 150, cv.y + 90, { steps: 8 }); await p.mouse.move(cv.x + 240, cv.y + 40, { steps: 8 }); await p.mouse.up()
await p.locator('#enviar').click(); await p.waitForTimeout(300); ok((await p.locator('#erro-geral').innerText()).includes('privacidade'), 'sem aceitar a privacidade não envia')
await p.locator('#resp').fill('Maria'); await p.locator('#aceite').check(); await p.locator('#enviar').click(); await p.waitForSelector('[data-testid=enviado]')
ok((await p.getByTestId('enviado').innerText()).includes('Formulário enviado com sucesso.') && (await p.getByTestId('enviado').innerText()).includes('Entro em contato em 2 dias.'), 'cliente envia: "Formulário enviado com sucesso." + mensagem final')
const e = DB.formulario_envios[0]; const rs = DB.formulario_envio_respostas
ok(e.status === 'respondido' && e.respondente === 'Maria' && e.consentimento_em && rs.length === 7 && rs.every(r => r.pergunta_versao === 2), 'CRM recebe: respondido, respondente, ciência de privacidade, 7 respostas na versão 2')
ok(rs.find(r => r.pergunta_ref === 'e').resposta.cidade === 'Salvador' && rs.find(r => r.pergunta_ref === 'd').resposta === '529.982.247-25' && /^data:image\/png/.test(rs.find(r => r.pergunta_ref === 'g').resposta), 'endereço, CPF e assinatura gravados')
ok(DB.atividades.length === 1 && DB.notifications.length === 1, 'histórico e notificação da equipe')
await p.goto(url(TOK)); await p.waitForSelector('#raiz h1'); ok((await p.locator('#raiz').innerText()).includes('já respondido'), 'reabrir o link: já respondido')
await p.goto(url(TOK2)); await p.waitForSelector('#raiz h1'); ok((await p.locator('#raiz').innerText()).includes('já respondido'), 'link de envio respondido não abre o formulário')
await p.goto(url('x'.repeat(32))); await p.waitForSelector('#raiz h1'); ok((await p.locator('#raiz').innerText()).includes('Link indisponível'), 'link inexistente: mensagem amigável')
await p.goto(url('')); await p.waitForSelector('#raiz h1'); ok((await p.locator('#raiz').innerText()).includes('Link inválido'), 'sem código: link inválido')
ok(erros.length === 0, 'sem erros de JavaScript: ' + erros.slice(0, 2).join(' | '))
await b.close(); fake.close(); console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK'); process.exit(falhas ? 1 : 0)
