// Integrações (Drive, Agenda, Supabase, IA com ferramentas) com conectores SIMULADOS no teste (o artefato publicado usa os reais).
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.route(/drive\.google|calendar\.google|mail\.google/, r => r.fulfill({ status: 200, body: 'ok' }))
const p = await ctx.newPage(); const erros = []; p.on('pageerror', e => erros.push(e.message)); p.on('console', m => { if (m.type() === 'error') erros.push(m.text()) })
await p.addInitScript(() => {
  window.__calls = []; window.__ferr = null
  const F = 'application/vnd.google-apps.folder'
  const mcp = { callTool: async (srv, tool, inp) => { window.__calls.push({ srv, tool, inp }); if (window.__ferr) throw window.__ferr
    if (srv === 'Google Drive' && tool === 'search_files') return { payload: { files: [{ id: 'PASTA00000001', title: 'SUBPASTA', mimeType: F, viewUrl: 'https://drive.google.com/drive/folders/PASTA00000001' }, { id: 'ARQ000000001', title: 'rg.pdf', mimeType: 'application/pdf', viewUrl: 'https://drive.google.com/file/d/ARQ000000001/view' }] } }
    if (srv === 'Google Drive' && tool === 'create_file') return { payload: { id: 'NOVO' + String(window.__calls.length).padStart(8, '0'), title: inp.title, mimeType: inp.mimeType || 'x', viewUrl: 'https://drive.google.com/x' } }
    if (srv === 'Google Calendar' && tool === 'create_event') return { payload: { id: 'EV123' } }
    if (srv === 'Google Calendar' && tool === 'list_calendars') return { payload: { calendars: [{ id: 'primary' }] } }
    if (srv === 'Supabase' && tool === 'execute_sql') return { payload: '<untrusted-data-abc>\n' + JSON.stringify(window.__rows || []) + '\n</untrusted-data-abc>' }
    return { payload: {} } } }
  let ferr = 0
  const s = async (prompt, o) => { window.__prompt = prompt; if (o && o.tools) { window.__tools = o.tools.map(t => t.name); window.__toolOut = {}; for (const t of o.tools) { try { window.__toolOut[t.name] = JSON.stringify(await t.execute(t.name === 'crm_buscar_pessoas' ? { texto: 'a' } : t.name === 'crm_ficha' || t.name === 'drive_arquivos' ? { contato_id: 6 } : t.name === 'gmail_buscar' ? { consulta: 'x' } : {})) } catch (e) { window.__toolOut[t.name] = 'ERR ' + e.message } } } return { text: 'Resposta de teste.', truncated: false } }
  s.limits = async () => ({ tools: true, images: false }); s.json = async () => ({})
  window.claude = { use: async n => n === 'mcp' ? mcp : n === 'sample' ? s : null }
})
await p.goto('file:///home/user/pasta/artefatos/crm-completo/dist/crm.html'); await p.waitForSelector('[data-testid=sidebar]')
const E = fn => p.evaluate(fn); const calls = () => E(() => window.__calls)
/* Drive */
const lista = await E(() => listarPasta('PASTA00000001')); ok(lista.length === 2 && lista[0].pasta && !lista[1].pasta && lista[1].nome === 'rg.pdf', 'Drive: lista mapeia title/mimeType/viewUrl e distingue pasta')
ok((await calls()).at(-1).inp.query === "parentId = 'PASTA00000001'", 'Drive: consulta por pasta-pai')
ok(await E(() => listarPasta("x' or 1=1").then(() => false, e => e.code === 'invalido')), 'Drive: id malicioso recusado')
await E(() => { DB.contatos.find(c => c.id === 6).nome = 'Beatriz Cardoso'; return criarPastaDoCliente(contato(6)) })
const c6 = await E(() => contato(6)); const nCreate = (await calls()).filter(x => x.tool === 'create_file').length
ok(c6.drive_pasta_id && c6.drive_pasta_nome === 'BEATRIZ CARDOSO' && Object.keys(c6.drive_subpastas).length >= 3 && nCreate === 1 + Object.keys(c6.drive_subpastas).length, 'Drive: cria pasta + subpastas padrão e grava o vínculo no cliente (' + nCreate + ' pastas)')
await E(() => { const d = DB.documentos[0]; window.__d = d.id; const a = { id: 'ARQ000000001', nome: 'rg.pdf', link: 'https://drive.google.com/file/d/ARQ000000001/view' }; vincularArquivoADocumento(d, a) })
const d0 = await E(() => DB.documentos.find(d => d.id === window.__d)); ok(d0.arquivo_provedor === 'drive' && d0.arquivo_ref === 'ARQ000000001' && d0.status !== 'pendente', 'Drive: vincula arquivo a documento e marca como recebido')
/* UI do painel */
await E(() => abrirFicha(6)); await p.waitForTimeout(400)
ok(await p.evaluate(() => /Drive do cliente/.test(document.body.innerText)), 'ficha do cliente mostra o painel do Drive')
/* sem permissão */
await E(() => { window.__ferr = { code: 'not_granted' } }); ok(await E(() => listarPasta('PASTA00000001').then(() => false, e => erroConector(e, 'Google Drive').includes('não autorizou'))), 'Drive: sem permissão → mensagem clara'); await E(() => { window.__ferr = null })
/* Agenda */
await E(() => { DB.compromissos.push({ id: 9001, tipo: 'audiencia', titulo: 'Audiência teste', status: 'pendente', data_limite: '2031-05-05', contato_id: 6 }); return enviarAoGoogleAgenda(DB.compromissos.at(-1)) })
const ev = (await calls()).filter(x => x.tool === 'create_event').at(-1); ok(ev && ev.inp.summary.startsWith('Audiência teste') && ev.inp.allDay === true && ev.inp.startTime.startsWith('2031-05-05') && ev.inp.endTime.startsWith('2031-05-06'), 'Agenda: create_event com dia inteiro correto')
ok(await E(() => DB.compromissos.at(-1).gcal_id === 'EV123'), 'Agenda: guarda o id do evento criado')
/* IA */
ok(await E(() => [ehPergunta('quais prazos tenho esta semana'), ehPergunta('tem algo pendente?'), ehPergunta('criar tarefa ligar para Maria')].join()) === 'true,true,false', 'roteamento: pergunta × comando')
await E(() => { const o = document.createElement('div'); o.id = 'saida'; document.body.append(o); return obterSample().then(s => responderPergunta(s, 'o que está pendente?', o)) }); await p.waitForTimeout(500)
const tools = await E(() => window.__tools); ok(tools && ['crm_buscar_pessoas', 'crm_ficha', 'crm_pendencias', 'agenda_proximos', 'gmail_buscar', 'drive_arquivos'].every(x => tools.includes(x)), 'IA: 6 ferramentas de leitura expostas')
const saidaTools = await E(() => JSON.stringify(window.__toolOut)); ok(!/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(saidaTools) && !/5571999990000/.test(saidaTools) && !/@email|@exemplo/.test(saidaTools), 'IA: ferramentas não devolvem CPF, telefone nem e-mail')
ok(!(await E(() => window.__tools.some(t => /criar|apagar|enviar|gravar|salvar/.test(t)))), 'IA: nenhuma ferramenta de escrita')
/* Conexões */
await E(() => ir('config', { aba: 'conexoes' })); await p.waitForTimeout(300)
const txt = await p.locator('main').innerText(); ok(['FUNCIONALIDADE REAL', 'INTEGRAÇÃO DISPONÍVEL', 'DEPENDE DE API/BACKEND', 'SIMULAÇÃO'].every(x => txt.includes(x)) && /WhatsApp/.test(txt) && /Drive/.test(txt) && /Google Forms/.test(txt), 'Conexões: cards e selos')
for (const id of ['gmail', 'drive', 'agenda']) { const bt = p.locator(`[data-testid="testar-${id}"]`); if (await bt.count()) { await bt.click(); await p.waitForTimeout(400); ok((await p.locator(`[data-testid="teste-${id}"]`).innerText()).length > 3, 'Conexões: testar ' + id) } else ok(false, 'botão testar-' + id) }
ok(erros.length === 0, 'sem erros: ' + erros.slice(0, 3).join(' | '))
await b.close(); console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK'); process.exit(falhas ? 1 : 0)
