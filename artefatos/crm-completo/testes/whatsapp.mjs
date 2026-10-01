// WhatsApp exportado → CRM → IA que ajuda (sem enviar). O conector e a IA são SIMULADOS; o leitor de conversa, a importação e o assistente são os reais.
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } }); await ctx.route(/wa\.me|mail\.google|drive\.google|cdnjs/, r => r.fulfill({ status: 200, body: 'ok' }))
const p = await ctx.newPage(); const erros = []; p.on('pageerror', e => erros.push(e.message)); p.on('console', m => { if (m.type() === 'error') erros.push(m.text()) })
await p.addInitScript(() => {
  window.__chamadas = []; window.__prompts = []
  const amostra = async (prompt, o = {}) => { window.__prompts.push(prompt); const texto = 'RASCUNHO DA IA'; o.onText && o.onText({ text: texto }); return { text: texto, truncated: false } }; amostra.limits = async () => ({ tools: false })
  window.claude = { use: async n => n === 'mcp' ? { callTool: async (srv, tool, inp) => { window.__chamadas.push({ srv, tool, inp }); return { payload: {} } } } : n === 'sample' ? amostra : null }
})
await p.goto('file:///home/user/pasta/artefatos/crm-completo/dist/crm.html'); await p.waitForSelector('[data-testid=sidebar]')
const E = (fn, a) => p.evaluate(fn, a); const t = id => p.locator(`[data-testid="${id}"]`); const esp = (n = 200) => p.waitForTimeout(n); const toasts = () => E(() => document.body.innerText)

/* 1. Leitor do arquivo exportado */
const ANDROID = ['12/03/2024 14:05 - As mensagens e as chamadas são protegidas com a criptografia de ponta a ponta.', '12/03/2024 14:05 - Maria Souza: Bom dia, Dra.', '12/03/2024 14:06 - Lara Café Advocacia: Bom dia, Maria! Como posso ajudar?', '12/03/2024 14:07 - Maria Souza: Preciso de ajuda', 'com o inventário do meu pai.', 'Ele faleceu em janeiro.', '13/03/2024 09:10 - Maria Souza: <Mídia oculta>', '13/03/2024 09:12 - Lara Café Advocacia: Pode me enviar a certidão de óbito?'].join('\n')
const IOS = ['[12/03/2024 14:05:10] Maria Souza: Oi', '[12/03/2024 14:06:00] Lara Café Advocacia: ‎imagem ocultada', '[12/03/2024 14:06:30] Maria Souza: Recebeu?'].join('\n')
const MDY = ['3/25/24, 2:05 PM - Maria: hi there', '3/25/24, 2:06 PM - Lara: hello'].join('\n')
const r = await E(([a, i, m]) => ({ a: parseWhatsApp(a), i: parseWhatsApp(i), m: parseWhatsApp(m), vazio: parseWhatsApp('qualquer coisa\nsem datas') }), [ANDROID, IOS, MDY])
ok(r.a.mensagens.length === 5 && r.a.sistema === 1 && r.a.autores.map(x => x.nome).join('|') === 'Maria Souza|Lara Café Advocacia', 'Android: 5 mensagens, 1 aviso do sistema ignorado, 2 participantes')
ok(r.a.mensagens[2].texto === 'Preciso de ajuda\ncom o inventário do meu pai.\nEle faleceu em janeiro.' && r.a.mensagens[2].quando.startsWith('2024-03-12T17:07'), 'mensagem de várias linhas vira uma só, com horário de Brasília convertido')
ok(r.a.mensagens[3].midia === true && r.a.mensagens[4].midia === false, 'mídia omitida é reconhecida')
ok(r.i.mensagens.length === 3 && r.i.mensagens[1].midia === true && r.i.mensagens[0].quando.startsWith('2024-03-12T17:05:10'), 'iPhone: formato [data hora] e imagem ocultada')
ok(r.m.mensagens[0].quando.startsWith('2024-03-25T17:05') && r.m.ordem === 'mda', 'formato americano com AM/PM (mês/dia detectado)')
ok(r.vazio.mensagens.length === 0, 'texto que não é conversa não gera mensagens')

/* 2. Importar para a Pessoa e a Demanda (pela tela) */
await E(() => { const c = criarContatoReal({ nome: 'Maria Souza', telefone: '5571988880000', email: 'maria@exemplo.com' }); DB.demandas.push({ id: 900, contato_id: c.id, titulo: 'Inventário do pai', tipo: 'consultivo', status: 'ativo', procedimento: null }); salvar('demandas'); ir('comunicacao') }); await esp(400)
const cid = await E(() => DB.contatos.find(c => c.nome === 'Maria Souza').id)
ok(await t('importar-whatsapp').count() === 1 && !(await toasts()).includes('Atualizar WhatsApp'), 'Caixa tem “Importar conversa do WhatsApp” e não finge conexão automática')
await t('importar-whatsapp').click(); await esp()
await t('wa-arquivo').setInputFiles({ name: 'Conversa do WhatsApp com Maria Souza.txt', mimeType: 'text/plain', buffer: Buffer.from(ANDROID, 'utf8') }); await esp(400)
ok((await t('wa-resumo').innerText()).includes('5 mensagens') && (await t('wa-resumo').innerText()).includes('Maria Souza (3)'), 'prévia: quantidade, período e participantes')
ok((await t('wa-eu').inputValue()) === 'Lara Café Advocacia', 'sugere quem é o escritório')
ok((await t('wa-pessoa').inputValue()) === String(cid), 'reconhece a Pessoa pelo nome (sem criar ninguém sozinho)')
await t('wa-demanda').selectOption('900'); await t('wa-importar').click(); await esp(500)
const com = await E(id => DB.comunicacoes.filter(m => m.contato_id === id && m.origem === 'whatsapp-exportacao'), cid)
ok(com.length === 5 && com.every(m => m.canal === 'whatsapp' && m.caso_id === 900 && m.created_at), 'mensagens guardadas no histórico, ligadas à Pessoa e à Demanda, com data original')
ok(com.filter(m => m.direcao === 'entrada').length === 3 && com.filter(m => m.direcao === 'saida').length === 2 && com.find(m => /certid/.test(m.texto)).direcao === 'saida', 'separa o que é da cliente (entrada) e o que é seu (saída)')
ok(com.some(m => m.texto === '[mídia omitida na exportação]'), 'mídia aparece como aviso, sem inventar conteúdo')
ok((await E(id => DB.contatos.length)) === (await E(() => DB.contatos.length)) && (await E(() => DB.contatos.filter(c => c.nome === 'Maria Souza').length)) === 1, 'não duplicou a pessoa')
/* reimportar o mesmo arquivo + mensagens novas */
const ANDROID2 = ANDROID + '\n14/03/2024 08:00 - Maria Souza: Enviei a certidão agora.'
await E(() => importarConversaWhatsApp({ contato: contato(DB.contatos.find(c => c.nome === 'Maria Souza').id) })); await esp()
await t('wa-colar').fill(ANDROID2); await t('wa-ler').click(); await esp(); await t('wa-importar').click(); await esp(400)
ok((await E(id => DB.comunicacoes.filter(m => m.contato_id === id && m.origem === 'whatsapp-exportacao').length, cid)) === 6, 'importar de novo traz só a mensagem nova (5 já existiam)')
ok((await toasts()).includes('1 mensagem importada'), 'avisa quantas entraram e quantas já existiam')

/* 3. Ver a conversa, buscar dentro dela, vincular à demanda */
await E(id => { UI.com.sel = id; ir('comunicacao', { contato: id }) }, cid); await esp(400)
ok(await t('msg').count() >= 6, 'a conversa aparece no CRM (bolhas da cliente e suas)')
await t('busca-conversa').fill('inventario'); await esp(200); ok(await t('msg').count() === 1 && (await t('msg').first().innerText()).includes('inventário'), 'busca dentro da conversa (sem diferenciar acentos)')
await t('busca-conversa').fill('zzz'); await esp(200); ok(await t('msg').count() === 0, 'busca sem resultado')
await t('busca-conversa').fill('')
await E(id => { DB.comunicacoes.filter(m => m.contato_id === id).forEach(m => { m.caso_id = null }); salvar('comunicacoes'); vincularConversaADemanda(contato(id)) }, cid); await esp(); await t('vinc-conversa-ok').click(); await esp(300)
ok(await E(id => DB.comunicacoes.filter(m => m.contato_id === id).every(m => m.caso_id === 900), cid), 'vincular a conversa inteira a uma demanda')

/* 4. Envio continua manual */
await E(id => { UI.com.sel = id; ir('comunicacao', { contato: id }) }, cid); await esp(300)
ok(await t('wa-abrir').count() === 1 && await t('wa-enviar-api').count() === 0, 'só existe o envio manual (abrir o WhatsApp com o texto pronto)')
await t('comp-texto').fill('Olá, Maria! Recebi a certidão.'); ok((await t('wa-abrir').getAttribute('href')).startsWith('https://wa.me/5571988880000?text='), 'link do WhatsApp com a mensagem pronta')
await t('wa-copiar').click(); await esp(100)

/* 5. Assistente de IA: analisa e sugere, nunca envia */
await E(() => { document.querySelector('[data-testid=assistente-detalhes]').open = true }); await E(() => { CONFIG.ia.ativa = false }); await t('assist-resposta').click(); await esp(300)
ok((await toasts()).includes('Ligar a IA no CRM'), 'com a IA desligada, pede o consentimento antes de enviar a conversa')
await E(() => { fecharTodas(); CONFIG.ia.ativa = true; render() }); await esp(300); await E(() => { document.querySelector('[data-testid=assistente-detalhes]').open = true })
const ids = ['analisar', 'resumo', 'faltam', 'docs', 'fatos', 'pendencias', 'resposta', 'objetiva', 'acolhedora', 'proximo', 'simular']
for (const id of ids) ok(await t('assist-' + id).count() === 1, 'ação disponível: ' + id)
await E(() => { window.__prompts.length = 0; window.__chamadas.length = 0 }); await t('assist-resposta').click(); await esp(500)
let pr = await E(() => window.__prompts)
ok(pr.length === 1 && pr[0].includes('CLIENTE: Preciso de ajuda') && pr[0].includes('ESCRITÓRIO: Bom dia, Maria!') && pr[0].includes('NÃO envia nada') && pr[0].includes('UMA resposta'), 'o pedido leva a conversa (cliente × escritório) e a instrução de não enviar')
ok(!/@exemplo|5571988880000/.test(pr[0].split('CONVERSA')[0]), 'a ficha enviada à IA não leva e-mail nem telefone')
ok((await t('assist-saida').innerText()) === 'RASCUNHO DA IA', 'a sugestão aparece para você revisar')
await t('assist-livre').fill('sem citar prazo'); await t('assist-simular').click(); await esp(400); pr = await E(() => window.__prompts)
ok(pr.length === 2 && pr[1].includes('SIMULAÇÃO') && pr[1].includes('sem citar prazo'), 'simular a continuação aceita orientação extra')
await t('assist-livre').fill('Quais datas a cliente citou?'); await t('assist-pedir').click(); await esp(400); pr = await E(() => window.__prompts); ok(pr.length === 3 && pr[2].includes('Quais datas a cliente citou?'), 'pedido livre à IA sobre a conversa')
await t('assist-salvar').click(); await esp(200); ok(await E(id => DB.atividades.some(a => a.contato_id === id && /Análise\/sugestão \(IA\)/.test(a.texto || a.descricao || '')), cid), 'salvar como anotação registra na linha do tempo')
const env = await E(() => window.__chamadas.filter(c => ['send_message', 'create_draft'].includes(c.tool)).length); ok(env === 0, 'em nenhum momento a IA/CRM enviou mensagem (zero chamadas de envio)')
await E(() => { DB.comunicacoes = DB.comunicacoes.filter(m => m.contato_id !== DB.contatos.find(c => c.nome === 'Maria Souza').id) ; render() }); await esp(200)

/* 6. Tela de conexões: honesta */
await E(() => ir('conexoes')); await esp(300); const tx = await p.locator('main').innerText()
ok(tx.includes('WhatsApp Business (conversa exportada)') && tx.includes('Google Forms + Planilhas') && !/Cloud API|Vercel|Supabase/.test(tx), 'Conexões descreve WhatsApp por exportação e Google Forms; não promete API automática nem cita Vercel/Supabase')
ok(erros.length === 0, 'sem erros de console/página: ' + erros.slice(0, 3).join(' | '))
await b.close(); console.log(falhas ? `${falhas} FALHA(S)` : 'TUDO OK'); process.exit(falhas ? 1 : 0)
