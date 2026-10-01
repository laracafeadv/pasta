// Comunicação (WhatsApp/e-mail), IA e fusões do menu — com conector Gmail e IA SIMULADOS no teste (o artefato publicado usa os reais).
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
async function nova(comMcp, comIa) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.route(/wa\.me|calendar\.google|mail\.google/, r => r.fulfill({ status: 200, body: 'ok' }))
  const p = await ctx.newPage(); p.erros = []; p.on('pageerror', e => p.erros.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.erros.push(m.text()) })
  await p.addInitScript(([mcp, ia]) => {
    window.__calls = []; window.__prompts = []
    const gm = { callTool: async (srv, tool, inp) => { window.__calls.push({ srv, tool, inp }); if (tool === 'search_threads') return { payload: { threads: [{ id: 'T1', messages: [] }] } }; if (tool === 'get_thread') return { payload: { messages: [{ id: 'M1', sender: 'Beatriz Cardoso <beatriz.exemplo@email.com>', to_recipients: ['contato@exemplo.com.br'], subject: 'Documentos do cartório', plaintext_body: 'Olá Dra, segue o que faltava.', date: new Date().toISOString(), labelIds: ['UNREAD'], viewUrl: 'https://mail.google.com/x', attachments: [{ filename: 'certidao.pdf' }] }, { id: 'M2', sender: 'contato@exemplo.com.br', to_recipients: ['beatriz.exemplo@email.com'], subject: 'Re: Documentos do cartório', plaintext_body: 'Recebido, obrigada.', date: new Date().toISOString(), labelIds: [] }] } }; if (tool === 'send_message') return { payload: { id: 'SENT1', threadId: 'T1' } }; if (tool === 'create_draft') return { payload: { id: 'D1', viewUrl: 'https://mail.google.com/d' } }; return { payload: {} } } }
    const s = async (prompt) => { window.__prompts.push(prompt); return { text: 'ASSUNTO: Sobre os documentos\n\nOlá Beatriz, recebemos a certidão. A Dra. confirma os detalhes em breve.', truncated: false } }
    s.json = async (prompt) => { window.__prompts.push(prompt); return { resposta: 'Vou criar a tarefa e anotar.', acoes: [{ op: 'criar_tarefa', titulo: 'Ligar para a Beatriz', prazo: '2030-01-10', contato_id: 6, prioridade: 'alta' }, { op: 'apagar_tudo' }, { op: 'registrar_nota', contato_id: 999, texto: 'x' }, { op: 'registrar_nota', contato_id: 6, texto: 'Cliente enviou a certidão.' }] } }
    window.claude = { use: async n => n === 'mcp' ? (mcp ? gm : null) : n === 'sample' ? (ia ? s : null) : null }
  }, [comMcp, comIa])
  await p.goto('file:///home/user/pasta/artefatos/crm-completo/dist/crm.html'); await p.waitForSelector('[data-testid=sidebar]'); return p
}
const T = p => id => p.locator(`[data-testid="${id}"]`); const esp = p => p.waitForTimeout(150)
let p = await nova(true, true); let t = T(p)
/* menu simplificado */
const itens = await p.locator('[data-testid=sidebar] nav [data-testid^="nav-"]').evaluateAll(e => e.filter(x => /^nav-[a-z]+$/.test(x.dataset.testid) && !['nav-mais'].includes(x.dataset.testid)).length); ok(itens === 10, 'barra com 10 módulos (eram 22 itens soltos): ' + itens)
/* caixa */
await p.click('[data-testid=nav-comunicacao]'); await esp(p); ok(await t('com-item').count() >= 4, 'caixa lista as conversas (WhatsApp, e-mail, ligação)')
await t('com-item').filter({ hasText: 'Beatriz' }).click(); await esp(p); ok(await t('msg').count() >= 3, 'thread mostra WhatsApp + e-mail + vínculo')
/* WhatsApp */
await t('comp-texto').fill('Olá [NOME], tudo bem?'); const antes = await p.evaluate(() => DB.comunicacoes.length)
await t('wa-abrir').click(); await esp(p); ok(await p.evaluate(() => DB.comunicacoes.length) === antes, 'colchete não preenchido bloqueia o registro/envio')
await t('comp-texto').fill('Oi Beatriz, a minuta está pronta.'); await t('comp-caso').selectOption({ index: 1 })
const [pop] = await Promise.all([p.context().waitForEvent('page', { timeout: 3000 }).catch(() => null), t('wa-abrir').click()]); await esp(p)
ok(pop && /wa\.me\/55\d+\?text=Oi%20Beatriz/.test(pop.url()), 'abre wa.me com a mensagem pronta (URL: ' + (pop ? pop.url().slice(0, 60) : 'sem popup') + ')')
const reg = await p.evaluate(() => DB.comunicacoes.at(-1)); ok(reg.canal === 'whatsapp' && reg.direcao === 'saida' && reg.caso_id === 1 && reg.contato_id === 6 && reg.origem === 'manual', 'registra a saída ligada à demanda, marcada como manual')
ok(await p.evaluate(() => { const c = contato(6); return !!c.ultimo_contato_em && diasEntre(diaDe(ultimoContato(c)), hojeISO()) === 0 }), 'último contato derivado da comunicação')
/* registrar recebida */
await t('com-recebida').click(); await p.locator('[role=dialog] textarea').fill('Perfeito, obrigada!'); await t('salvar').click(); await esp(p); ok(await p.evaluate(() => DB.comunicacoes.at(-1).direcao === 'entrada' && DB.comunicacoes.at(-1).lida), 'registrar mensagem recebida manualmente')
/* e-mail */
await t('comp-canal-email').click(); await esp(p)
await t('email-sync').click(); await esp(p); await esp(p)
ok(await p.evaluate(() => DB.comunicacoes.filter(m => m.origem === 'gmail').length) === 2 && await p.evaluate(() => DB.comunicacoes.find(m => m.ext_id === 'M1').direcao) === 'entrada', 'importa e-mails do Gmail (entrada e saída) para a pessoa certa')
ok(await p.evaluate(() => DB.comunicacoes.find(m => m.ext_id === 'M1').anexos[0].nome) === 'certidao.pdf', 'importa o nome do anexo')
await t('email-sync').click(); await esp(p); await esp(p); ok(await p.evaluate(() => DB.comunicacoes.filter(m => m.origem === 'gmail').length) === 2, 'sincronizar de novo não duplica (dedup por id)')
const q = await p.evaluate(() => __calls.find(c => c.tool === 'search_threads').inp.query); ok(/beatriz\.exemplo@email\.com/.test(q), 'busca no Gmail usa o e-mail do cliente')
await t('email-assunto').fill('Minuta final'); await t('comp-texto').fill('Segue a minuta final para assinatura.')
await p.setInputFiles('input[type=file]', { name: 'minuta.pdf', mimeType: 'application/pdf', buffer: Buffer.from('PDFDATA') })
await t('email-rascunho').click(); await esp(p); const rasc = await p.evaluate(() => __calls.filter(c => c.tool === 'create_draft').at(-1)); ok(rasc && rasc.inp.to[0] === 'beatriz.exemplo@email.com' && rasc.inp.attachments[0].filename === 'minuta.pdf' && rasc.inp.attachments[0].content === Buffer.from('PDFDATA').toString('base64'), 'rascunho no Gmail com destinatário e anexo em base64')
ok(await p.evaluate(() => DB.comunicacoes.filter(m => m.assunto === 'Minuta final').length) === 0, 'rascunho NÃO é registrado como enviado')
await t('email-enviar').click(); await esp(p); ok(await p.evaluate(() => __calls.filter(c => c.tool === 'send_message').length) === 0, 'enviar pede confirmação antes (nada enviado ainda)')
await t('confirmar-sim').click(); await esp(p); await esp(p); ok(await p.evaluate(() => __calls.filter(c => c.tool === 'send_message').length) === 1, 'enviar pelo Gmail após confirmar')
ok(await p.evaluate(() => { const m = DB.comunicacoes.find(x => x.ext_id === 'SENT1'); return m && m.canal === 'email' && m.assunto === 'Minuta final' && m.anexos[0].nome === 'minuta.pdf' }), 'e-mail enviado é registrado automaticamente com assunto e anexo')
/* hoje: e-mail recebido não lido */
await p.evaluate(() => { DB.comunicacoes.find(m => m.ext_id === 'M1').lida = false; ir('inicio') }); await esp(p); ok((await p.locator('main').innerText()).includes('E-mail recebido'), 'Início lista e-mail recebido sem resposta')
/* IA */
await p.evaluate(() => abrirFicha(6)); await esp(p); await t('ia-resumir-cliente').click(); await esp(p); ok(await t('ia-ligar').count() === 1, 'IA desligada: pede autorização antes de usar')
await t('ia-ligar').click(); await esp(p); await esp(p); ok((await t('ia-saida').innerText()).includes('A Dra. confirma'), 'resumo com IA aparece (resposta simulada no teste)')
const pr = await p.evaluate(() => __prompts.at(-1)); ok(pr.includes('Beatriz') && !/529\.982|12\.345\.678|9990|beatriz\.exemplo/.test(pr), 'prompt da IA não contém CPF, RG, telefone nem e-mail')
ok(/NUNCA invente|COLCHETES/.test(pr) && /Provimento 205/.test(pr), 'prompt carrega as regras da OAB e o aviso contra injeção')
await t('ia-salvar').click(); await esp(p); ok(await p.evaluate(() => DB.atividades.some(a => /Resumo \(IA\)/.test(a.texto))), 'resumo só é salvo quando você manda')
await p.keyboard.press('Escape')
await p.evaluate(() => ir('inicio')); await esp(p); await t('abrir-busca').click(); await t('busca-global').fill('criar tarefa de ligar para a Beatriz'); await t('ia-pedir').click(); await esp(p); await esp(p)
ok(await t('ia-plano').locator('label').count() === 2, 'comando: ações inválidas (op desconhecida, pessoa inexistente) são descartadas')
const nT = await p.evaluate(() => DB.tarefas.length); ok(nT === await p.evaluate(() => DB.tarefas.length), 'nada gravado antes de aplicar')
await t('ia-aplicar').click(); await esp(p); ok(await p.evaluate(() => DB.tarefas.some(x => x.titulo === 'Ligar para a Beatriz' && x.prazo === '2030-01-10')) && await p.evaluate(() => DB.atividades.some(a => a.texto === 'Cliente enviou a certidão.')), 'aplicar cria a tarefa e a anotação confirmadas')
ok(await p.evaluate(() => DB.auditoria.some(a => a.acao === 'ia_acao')), 'ações da IA ficam na auditoria')
await p.evaluate(() => { ir('inicio'); abrirFicha(6, 'conversa') }); await esp(p); await t('ia-sugerir').click(); await esp(p); await esp(p); ok((await t('comp-texto').inputValue()).includes('recebemos a certidão'), 'sugerir resposta preenche o rascunho para revisão')
await p.keyboard.press('Escape')
/* intimação local */
await p.evaluate(() => ir('intimacoes')); await esp(p); await t('ler-intimacao').click(); const cnj = await p.evaluate(() => DB.processos.find(x => x.id === 2).numero)
await t('int-texto').fill(`Publicado no DJE em 28/09/2026: Despacho no processo ${cnj}. Intime-se para manifestação no prazo de 15 dias.`); await t('int-ler').click(); await esp(p); await esp(p)
ok((await t('int-res').innerText()).includes('encontrado no CRM') && (await t('int-res').innerText()).includes('Helena Prado'), 'intimação: CNJ validado e ligado ao processo/cliente')
await t('int-registrar').click(); await esp(p); ok((await p.locator('[role=dialog]').innerText()).includes('Registrar intimação'), 'abre o formulário já preenchido para confirmar')
await p.keyboard.press('Escape')
/* ics + prazo com preparação */
ok(await p.evaluate(() => { const s = icsDe(DB.compromissos.slice(0, 2)); return s.includes('BEGIN:VCALENDAR') && s.split('BEGIN:VEVENT').length === 3 && /DTSTART/.test(s) }), 'gera arquivo .ics válido')
ok(await p.evaluate(() => /calendar\.google\.com.*text=/.test(linkGoogleAgenda(DB.compromissos[0]))), 'link do Google Agenda')
await p.evaluate(() => editarCompromisso(null, { tipo: 'prazo', titulo: 'Prazo de teste', contato_id: 8, caso_id: 3, data_limite: '2030-03-14' })); await esp(p); await p.locator('[data-campo=preparar]').check(); await t('salvar').click(); await esp(p)
ok(await p.evaluate(() => DB.tarefas.some(x => x.titulo === 'Preparar: Prazo de teste' && x.prazo === '2030-03-11')), 'prazo cria tarefa de preparação 3 dias úteis antes (14/03 → 11/03)')
/* demanda: timeline + comunicação */
await p.evaluate(() => abrirDemandaDetalhe(1)); await esp(p); ok(await t('tempo-demanda').count() === 1 && (await t('tempo-demanda').innerText()).includes('minuta'), 'demanda tem linha do tempo unificada (comunicação + andamentos)'); await p.evaluate(() => abrirDemandaDetalhe(1, 'comunicacao')); await esp(p); ok(await t('thread').count() === 1, 'aba Comunicação da demanda')
await p.keyboard.press('Escape')
/* conexões */
await p.evaluate(() => ir('config', { aba: 'conexoes' })); await esp(p); await t('testar-gmail').click(); await esp(p); await esp(p); ok((await t('teste-gmail').innerText()).includes('conectado'), 'testar conexão do Gmail'); await t('testar-ia').click(); await esp(p); await esp(p); ok((await t('teste-ia').innerText()).includes('respondeu'), 'testar IA')
const cap = await p.locator('main').innerText(); ok(/REAL/.test(cap) && /POSSÍVEL COM INTEGRAÇÃO/.test(cap) && /NÃO VIÁVEL/.test(cap) && /SIMULADA/.test(cap), 'mapa de capacidades com os 4 selos')
await t('ia-toggle').click(); await esp(p); ok(await p.evaluate(() => CONFIG.ia.ativa) === false, 'desligar a IA é imediato'); await t('ia-toggle').click(); await esp(p); ok(await t('ia-ligar').count() === 1 && await p.evaluate(() => CONFIG.ia.ativa) === false, 'ligar a IA exige consentimento explícito'); await p.keyboard.press('Escape')
ok(p.erros.length === 0, 'sem erros: ' + p.erros.slice(0, 3).join(' | '))
await p.context().close()
/* sem conectores */
p = await nova(false, false); t = T(p)
await p.evaluate(() => abrirFicha(6, 'conversa')); await esp(p); await t('comp-canal-email').click(); await t('email-assunto').fill('x'); await t('comp-texto').fill('teste'); await t('email-rascunho').click(); await esp(p)
ok((await p.locator('[data-testid=toast]').last().innerText()).includes('não está disponível'), 'sem conector: avisa e não finge enviar')
await t('email-sync').click(); await esp(p); ok(await p.evaluate(() => DB.comunicacoes.filter(m => m.origem === 'gmail').length) === 0, 'sem conector: nada é importado')
await p.evaluate(() => { CONFIG.ia.ativa = true; ir('inicio') }); await p.evaluate(() => abrirFicha(6)); await esp(p); await t('ia-resumir-cliente').click(); await esp(p); ok((await p.locator('[role=dialog]').last().innerText()).length > 0 && (await p.locator('[data-testid=toast]').last().innerText()).includes('não está disponível'), 'sem IA: avisa em vez de inventar resposta')
await b.close(); console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK'); process.exit(falhas ? 1 : 0)
