// E2E do link público de formulário: servidor Nuxt REAL (build) + Supabase FALSO em memória + Chromium para a página da cliente.
import { spawn } from 'node:child_process'
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
import { DB, criar, servidor } from './fake-supabase.mjs'
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) { falhas++ } }
const agora = Date.now(); const iso = d => new Date(agora + d * 864e5).toISOString()
const perg = (id, texto, tipo, extra = {}) => ({ id, texto, tipo, opcoes: [], ajuda: null, arquivada: false, escopo: 'cliente', versao: 1, ...extra })
const seed = () => ({
  profiles: [{ id: 'staff-1', role: 'equipe', name: 'Lara', email: 'lara@exemplo.com' }],
  contatos: [{ id: 1, nome: 'Beatriz Cardoso', telefone: '5571999990001', etapa: 'ativo' }, { id: 2, nome: 'Outra Pessoa', telefone: '5571999990002', etapa: 'ativo' }],
  casos: [{ id: 1, contato_id: 1, titulo: 'Divórcio consensual' }, { id: 2, contato_id: 2, titulo: 'Inventário (de outra pessoa)' }],
  escritorio: [{ chave: 'advogada_nome', valor: 'Lara Café' }],
  formularios: [
    { id: 5, nome: 'Dados da família', descricao: 'Para o divórcio', contexto: 'cliente', procedimentos: [], ativo: true, situacao: 'publicado', versao: 3, instrucoes: 'Tenha a certidão em mãos.', finalidade: 'Preparar a petição', mensagem_final: 'Recebido! Entro em contato.' },
    { id: 6, nome: 'Questionário do divórcio', descricao: null, contexto: 'demanda', procedimentos: [], ativo: true, situacao: 'publicado', versao: 1 },
    { id: 7, nome: 'Rascunho', descricao: null, contexto: 'cliente', procedimentos: [], ativo: false, situacao: 'rascunho', versao: 1 },
  ],
  formulario_secoes: [{ id: 50, formulario_id: 5, titulo: 'Sua família', descricao: null, ordem: 0, mostrar_se: null }, { id: 60, formulario_id: 6, titulo: 'Bens', descricao: null, ordem: 0, mostrar_se: null }],
  formulario_perguntas: [perg(101, 'Nome do cônjuge', 'texto_curto'), perg(102, 'Tem filhos?', 'sim_nao'), perg(103, 'Quantos filhos?', 'numero'), perg(104, 'Regime de bens', 'lista_suspensa', { opcoes: ['Comunhão parcial', 'Separação total'] }), perg(201, 'Possui imóvel?', 'sim_nao', { escopo: 'demanda' })],
  formulario_itens: [
    { id: 1, formulario_id: 5, pergunta_id: 101, ordem: 0, obrigatoria: true, secao_id: 50, mostrar_se: null }, { id: 2, formulario_id: 5, pergunta_id: 102, ordem: 1, obrigatoria: true, secao_id: 50, mostrar_se: null },
    { id: 3, formulario_id: 5, pergunta_id: 103, ordem: 2, obrigatoria: true, secao_id: 50, mostrar_se: { juntar: 'e', regras: [{ pergunta_id: 102, operador: 'igual', valor: 'Sim' }] } }, { id: 4, formulario_id: 5, pergunta_id: 104, ordem: 3, obrigatoria: false, secao_id: 50, mostrar_se: null },
    { id: 5, formulario_id: 6, pergunta_id: 201, ordem: 0, obrigatoria: true, secao_id: 60, mostrar_se: null },
  ],
  formulario_envios: [], formulario_envio_respostas: [], contato_respostas: [], caso_respostas: [], atividades: [], notifications: [], auditoria: [],
})

const FAKE = 4010, APP = 3777
const fake = await servidor(FAKE); criar(seed())
const sessao = Buffer.from(JSON.stringify({ access_token: Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: 'staff-1', aud: 'authenticated', exp: Math.floor(agora / 1000) + 3600, role: 'authenticated', email: 'lara@exemplo.com' })).toString('base64url') + '.c2ln', refresh_token: 'r', expires_at: Math.floor(agora / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user: { id: 'staff-1', aud: 'authenticated', role: 'authenticated', email: 'lara@exemplo.com' } })).toString('base64url')
const COOKIE = `sb-localhost-auth-token=base64-${sessao}`
const app = spawn('node', ['/home/user/pasta/.output/server/index.mjs'], { env: { ...process.env, PORT: String(APP), SUPABASE_URL: `http://localhost:${FAKE}`, SUPABASE_KEY: 'pub', SUPABASE_SECRET_KEY: 'secret', NUXT_PUBLIC_SITE_URL: `http://localhost:${APP}`, NODE_ENV: 'production' } })
let log = ''; app.stdout.on('data', d => { log += d }); app.stderr.on('data', d => { log += d })
for (let i = 0; i < 40; i++) { try { await fetch(`http://localhost:${APP}/formulario/x`); break } catch { await new Promise(r => setTimeout(r, 300)) } }
const api = async (m, p, body, cookie = true) => { const r = await fetch(`http://localhost:${APP}${p}`, { method: m, headers: { 'content-type': 'application/json', ...(cookie ? { cookie: COOKIE } : {}) }, body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await r.json() } catch { /* sem corpo */ } return { s: r.status, j } }
try {
  /* 1. gerar link (equipe autenticada) */
  ok((await api('POST', '/api/formularios/envios', { contato_id: 1, formulario_id: 5 }, false)).s === 401, 'sem login não gera link (401)')
  ok((await api('POST', '/api/formularios/envios', { contato_id: 1, formulario_id: 7 })).s === 409, 'formulário em rascunho não pode ser enviado')
  ok((await api('POST', '/api/formularios/envios', { contato_id: 1, formulario_id: 6 })).s === 400, 'formulário de demanda exige a demanda')
  ok((await api('POST', '/api/formularios/envios', { contato_id: 1, formulario_id: 5, caso_id: 2 })).s === 400, 'demanda de OUTRA pessoa é recusada')
  ok((await api('POST', '/api/formularios/envios', { contato_id: 1, formulario_id: 5, validade_dias: 0 })).s === 400, 'validade inválida é recusada')
  const g = await api('POST', '/api/formularios/envios', { contato_id: 1, formulario_id: 5, caso_id: 1, validade_dias: 15, prazo_resposta: '2031-01-31' })
  ok(g.s === 200 && g.j.token.length === 32 && g.j.url === `http://localhost:${APP}/formulario/${g.j.token}` && g.j.status === 'gerado' && g.j.versao === 3, 'gera link individual: URL pública, status "gerado", versão 3 (' + g.s + ')')
  const e = DB.formulario_envios[0]
  ok(e.contato_id === 1 && e.caso_id === 1 && e.formulario_id === 5 && e.prazo_resposta === '2031-01-31' && e.estrutura.secoes[0].itens.length === 4 && e.gerado_por === 'staff-1', 'envio liga pessoa, demanda, formulário, prazo e congela a estrutura')
  ok(Math.abs(new Date(e.expira_em) - (agora + 15 * 864e5)) < 60000, 'validade de 15 dias')
  ok(DB.atividades.some(a => /Link do formulário/.test(a.texto) && a.caso_id === 1), 'gerar o link entra no histórico da pessoa/demanda')
  const T = g.j.token

  /* 2. versão congelada */
  DB.formulario_perguntas.find(p => p.id === 101).texto = 'Nome da esposa (EDITADO DEPOIS)'
  const pub = await api('GET', `/api/formulario-publico/${T}`, null, false)
  ok(pub.s === 200 && pub.j.secoes[0].itens[0].texto === 'Nome do cônjuge', 'cliente vê a pergunta como foi enviada (versão congelada)')
  ok(pub.j.primeiroNome === 'Beatriz' && pub.j.advogada === 'Dra. Lara Café' && pub.j.formulario.instrucoes && pub.j.prazo_resposta === '2031-01-31', 'página pública traz nome, advogada, instruções e prazo')
  const vazamento = JSON.stringify(pub.j); ok(!/telefone|5571999990001|contato_id|honorari|Outra Pessoa|token/i.test(vazamento), 'resposta pública não vaza dados internos, outras pessoas ou o token')
  ok(DB.formulario_envios[0].status === 'visualizado' && DB.formulario_envios[0].visualizado_em, 'abrir o link marca "visualizado"')
  ok((await api('POST', `/api/formulario-publico/${T}/iniciar`, null, false)).s === 200 && DB.formulario_envios[0].status === 'iniciado', 'primeira digitação marca "iniciado"')

  /* 3. responder */
  const R = { 101: 'João Silva', 102: 'Sim', 103: '2', 104: 'Comunhão parcial' }
  ok((await api('POST', `/api/formulario-publico/${T}`, { respostas: R }, false)).s === 400, 'sem aceitar a privacidade não envia')
  ok((await api('POST', `/api/formulario-publico/${T}`, { respostas: { ...R, 101: '' }, consentimento: true }, false)).s === 400, 'pergunta obrigatória vazia bloqueia')
  ok(DB.formulario_envios[0].status === 'iniciado' && !DB.formulario_envio_respostas.length, 'tentativas inválidas não gravam nada')
  const env = await api('POST', `/api/formulario-publico/${T}`, { respostas: R, respondente: 'Beatriz', consentimento: true }, false)
  ok(env.s === 200 && env.j.mensagem === 'Recebido! Entro em contato.', 'envio aceito, com a mensagem final do formulário (' + env.s + ')')
  const e2 = DB.formulario_envios[0]
  ok(e2.status === 'respondido' && e2.respondido_em && e2.consentimento_em && e2.respondente === 'Beatriz', 'envio fica "respondido" com data, ciência de privacidade e respondente')
  const rs = DB.formulario_envio_respostas
  ok(rs.length === 4 && rs.every(r => r.envio_id === e2.id && r.pergunta_versao === 3) && rs[0].pergunta_texto === 'Nome do cônjuge' && rs.find(r => r.pergunta_id === 104).pergunta_opcoes.length === 2, 'respostas guardam a pergunta COMO ERA (texto, tipo, opções, versão), ligadas ao link')
  ok(DB.contato_respostas.length === 4 && DB.caso_respostas.length === 0, 'formulário de cliente atualiza a ficha da PESSOA')
  ok(DB.notifications.some(n => /respondeu/.test(n.message) && n.user_id === 'staff-1'), 'a equipe recebe notificação de resposta')
  ok(DB.atividades.some(a => /Formulário respondido/.test(a.texto) && a.caso_id === 1), 'resposta entra no histórico da pessoa e da demanda')
  ok((await api('POST', `/api/formulario-publico/${T}`, { respostas: R, consentimento: true }, false)).s === 409, 'segunda resposta ao mesmo link é recusada')
  const rep = await api('GET', `/api/formulario-publico/${T}`, null, false); ok(rep.s === 200 && rep.j.respondido === true, 'abrir de novo mostra "já respondido"')

  /* 4. lógica condicional */
  const g2 = (await api('POST', '/api/formularios/envios', { contato_id: 1, formulario_id: 5 })).j
  const r2 = await api('POST', `/api/formulario-publico/${g2.token}`, { respostas: { 101: 'X', 102: 'Não', 103: '9' }, consentimento: true }, false)
  const linhas2 = DB.formulario_envio_respostas.filter(r => r.envio_id === g2.id); ok(r2.s === 200 && !linhas2.some(l => l.pergunta_id === 103), 'pergunta condicional escondida é descartada')

  /* 5. formulário de demanda grava na DEMANDA */
  const g3 = (await api('POST', '/api/formularios/envios', { contato_id: 1, formulario_id: 6, caso_id: 1 })).j
  const r3 = await api('POST', `/api/formulario-publico/${g3.token}`, { respostas: { 201: 'Sim' }, consentimento: true }, false)
  ok(r3.s === 200 && DB.caso_respostas.length === 1 && DB.caso_respostas[0].caso_id === 1, 'formulário de demanda atualiza a ficha da DEMANDA')

  /* 6. status, cancelar, expirar, link inválido */
  const g4 = (await api('POST', '/api/formularios/envios', { contato_id: 1, formulario_id: 5 })).j
  ok((await api('PATCH', `/api/formularios/envios/${g4.id}`, { acao: 'enviado', canal: 'whatsapp' })).s === 200 && DB.formulario_envios.find(x => x.id === g4.id).status === 'enviado' && DB.formulario_envios.find(x => x.id === g4.id).canal_envio === 'whatsapp', 'marcar como enviado por WhatsApp')
  ok((await api('PATCH', `/api/formularios/envios/${g4.id}`, { acao: 'cancelar' })).s === 200 && (await api('GET', `/api/formulario-publico/${g4.token}`, null, false)).s === 404, 'cancelar link: a cliente não abre mais')
  ok((await api('PATCH', `/api/formularios/envios/${e2.id}`, { acao: 'cancelar' })).s === 409, 'não cancela o que já foi respondido')
  const g5 = (await api('POST', '/api/formularios/envios', { contato_id: 1, formulario_id: 5 })).j
  DB.formulario_envios.find(x => x.id === g5.id).expira_em = iso(-1)
  const exp = await api('GET', `/api/formulario-publico/${g5.token}`, null, false); const inv = await api('GET', `/api/formulario-publico/${'z'.repeat(32)}`, null, false)
  ok(exp.s === 404 && inv.s === 404 && exp.j.message === inv.j.message, 'link expirado e link inexistente respondem igual (sem revelar)')
  ok((await api('GET', '/api/formulario-publico/curto', null, false)).s === 404, 'token fora do formato é recusado')
  ok((await api('PATCH', `/api/formularios/envios/${g5.id}`, { acao: 'prorrogar', dias: 10 })).s === 200 && new Date(DB.formulario_envios.find(x => x.id === g5.id).expira_em) > new Date(), 'prorrogar validade reabre o link')

  /* 7. consulta pela equipe */
  const lista = await api('GET', '/api/formularios/envios?contato_id=1'); const lp = lista.j.find(x => x.id === g.j.id)
  ok(lista.s === 200 && lp.estado === 'respondido' && lp.caso_titulo === 'Divórcio consensual' && lp.formulario_nome === 'Dados da família' && lp.versao === 3 && lista.j.some(x => ['expirado', 'gerado', 'cancelado'].includes(x.estado)), 'lista por pessoa traz estados, demanda, formulário e versão')
  ok((await api('GET', '/api/formularios/envios?caso_id=1')).j.length >= 2 && (await api('GET', '/api/formularios/envios?contato_id=2')).j.length === 0, 'lista por demanda e isolamento entre pessoas')
  const det = await api('GET', `/api/formularios/envios/${g.j.id}`); ok(det.s === 200 && det.j.respostas.length === 4 && det.j.respostas[0].pergunta_texto === 'Nome do cônjuge' && det.j.respondente === 'Beatriz', 'detalhe: respostas com a pergunta como foi respondida')
  ok((await api('GET', `/api/formularios/envios/${g.j.id}`, null, false)).s === 401, 'detalhe exige equipe autenticada')

  /* 8. página da cliente no navegador (celular) */
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
  const ctx = await b.newContext({ viewport: { width: 400, height: 900 } }); const p = await ctx.newPage(); const erros = []; let semVercel = false; p.on('pageerror', x => erros.push(x.message)); p.on('response', r => { if (r.request().resourceType() === 'script' && !(r.headers()['content-type'] || '').includes('javascript')) { if (/speed-insights/.test(r.url())) semVercel = true } })
  const g6 = (await api('POST', '/api/formularios/envios', { contato_id: 1, formulario_id: 5, caso_id: 1, prazo_resposta: '2031-02-01' })).j
  await p.goto(g6.url); await p.waitForSelector('[data-testid=publico-titulo]', { timeout: 15000 })
  const corpo = await p.locator('body').innerText()
  ok(/Dados da família/.test(corpo) && /Tenha a certidão/.test(corpo) && /Dra\. Lara Café/.test(corpo), 'página da cliente: título, instruções e identidade do escritório')
  ok(!/Financeiro|Pessoas|Demandas|Configurações|Hoje/.test(corpo) && new URL(p.url()).pathname.startsWith('/formulario/'), 'página da cliente: sem menu do CRM e sem redirecionar ao login')
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'celular: sem rolagem horizontal')
  await p.getByTestId('pergunta-Nome da esposa (EDITADO DEPOIS)').locator('input').fill('Pedro'); await p.waitForTimeout(500)
  ok(DB.formulario_envios.find(x => x.id === g6.id).status === 'iniciado', 'digitar no celular marca "iniciado" no CRM')
  await p.getByTestId('pergunta-Tem filhos?').getByText('Sim', { exact: true }).click()
  await p.getByTestId('pergunta-Quantos filhos?').locator('input').fill('1')
  await p.getByTestId('avancar').click(); await p.waitForTimeout(300)
  ok(await p.getByTestId('erro-envio').count() === 1, 'sem aceitar a privacidade o botão não envia')
  await p.getByTestId('aceite-privacidade').check(); await p.getByTestId('avancar').click(); await p.waitForSelector('[data-testid=formulario-enviado]', { timeout: 10000 })
  ok((await p.getByTestId('formulario-enviado').innerText()).includes('Formulário enviado com sucesso.') && DB.formulario_envios.find(x => x.id === g6.id).status === 'respondido', 'cliente envia pelo celular: "Formulário enviado com sucesso." e CRM fica "respondido"')
  await p.goto(`http://localhost:${APP}/formulario/${'q'.repeat(32)}`); await p.waitForSelector('[data-testid=link-invalido]', { timeout: 10000 })
  ok((await p.getByTestId('link-invalido').innerText()).includes('não é mais válido'), 'link inválido mostra mensagem amigável')
  const reais = erros.filter(m => !(semVercel && /Unexpected token '<'/.test(m))) // script de métricas existe só na Vercel
  ok(reais.length === 0, 'sem erros de JavaScript na página pública: ' + reais.slice(0, 2).join(' | '))
  await b.close()
} catch (err) { console.log('ERRO NO TESTE', err); falhas++; console.log(log.slice(-1500)) }
app.kill(); fake.close()
console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK'); process.exit(falhas ? 1 : 0)
