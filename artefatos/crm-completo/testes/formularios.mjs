// Formulários (nativos, publicados no banco, link público individual) e WhatsApp (Cloud API via fila) — o BANCO é simulado no teste
// por um mini-motor SQL dentro da página; a Edge Function pública e os handlers reais são testados em /home/user/pasta/tests/whatsapp.
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.route(/wa\.me|mail\.google|drive\.google/, r => r.fulfill({ status: 200, body: 'ok' }))
const p = await ctx.newPage(); const erros = []; p.on('pageerror', e => erros.push(e.message)); p.on('console', m => { if (m.type() === 'error') erros.push(m.text()) })
await p.addInitScript(() => {
  const BD = window.__bd = { contatos: [], casos: [], formularios: [], envios: [], respostas: [], saida: [], mensagens: [], templates: [], diag: null, seq: 100 }; window.__sql = []
  const dividir = s => { const o = []; let atual = '', asp = false; for (let i = 0; i < s.length; i++) { const ch = s[i]; if (ch === "'") { if (asp && s[i + 1] === "'") { atual += "''"; i++; continue } asp = !asp } if (ch === ',' && !asp) { o.push(atual.trim()); atual = ''; continue } atual += ch } o.push(atual.trim()); return o }
  const un = t => { t = String(t).trim().replace(/::(jsonb|date)$/, ''); if (t === 'null') return null; if (t === 'true') return true; if (t === 'false') return false; if (/^-?\d+$/.test(t)) return Number(t); if (t.startsWith("'")) return t.slice(1, -1).replace(/''/g, "'"); return t }
  const ret = rows => ({ payload: '<untrusted-data-x>\n' + JSON.stringify(rows) + '\n</untrusted-data-x>' })
  const exec = q => { q = q.trim(); let m
    if ((m = q.match(/^select id from public\.contatos where telefone = '(\d+)' limit 1/))) return BD.contatos.filter(c => c.telefone === m[1]).map(c => ({ id: c.id }))
    if ((m = q.match(/^insert into public\.contatos \(telefone, nome, email, origem, etapa, exemplo\) values \((.*)\) returning id$/s))) { const v = dividir(m[1]).map(un); const c = { id: ++BD.seq, telefone: v[0], nome: v[1], email: v[2], origem: v[3], etapa: v[4], exemplo: v[5] }; BD.contatos.push(c); return [{ id: c.id }] }
    if ((m = q.match(/^select id from public\.casos where contato_id = (\d+) and lower\(titulo\) = lower\((.*)\) limit 1$/s))) return BD.casos.filter(c => c.contato_id === Number(m[1]) && c.titulo.toLowerCase() === un(m[2]).toLowerCase()).map(c => ({ id: c.id }))
    if ((m = q.match(/^insert into public\.casos \(contato_id, titulo, area, tipo, status, exemplo\) values \((.*)\) returning id$/s))) { const v = dividir(m[1]).map(un); const c = { id: ++BD.seq, contato_id: v[0], titulo: v[1], area: v[2], tipo: v[3], status: v[4], exemplo: v[5] }; BD.casos.push(c); return [{ id: c.id }] }
    if ((m = q.match(/^insert into public\.formularios \(ref, nome, descricao, contexto, situacao, ativo, versao, estrutura, publicado_em\) values \((.*)\) on conflict \(ref\) where ref is not null do update set (.*) returning id, versao$/s))) { const v = dividir(m[1]).map(un); let f = BD.formularios.find(x => x.ref === v[0]); if (f) { Object.assign(f, { nome: v[1], descricao: v[2], contexto: v[3], situacao: 'publicado', estrutura: JSON.parse(v[7]) }); f.versao++ } else { f = { id: ++BD.seq, ref: v[0], nome: v[1], descricao: v[2], contexto: v[3], situacao: 'publicado', versao: 1, estrutura: JSON.parse(v[7]) }; BD.formularios.push(f) } return [{ id: f.id, versao: f.versao }] }
    if ((m = q.match(/^update public\.formularios set situacao = '(\w+)', ativo = (true|false) where ref = '(.*)'$/))) { const f = BD.formularios.find(x => x.ref === m[3]); if (f) f.situacao = m[1]; return [] }
    if ((m = q.match(/^insert into public\.formulario_envios \(formulario_id, contato_id, caso_id, token, expira_em, prazo_resposta, versao_formulario, estrutura, status\) select (.*) from public\.formularios f where f\.ref = '(.*)' and f\.situacao = 'publicado' returning id, versao_formulario$/s))) { const f = BD.formularios.find(x => x.ref === m[2] && x.situacao === 'publicado'); if (!f) return []; const v = dividir(m[1]).map(un); const e = { id: ++BD.seq, formulario_id: f.id, contato_id: v[1], caso_id: v[2], token: v[3], expira_em: v[4], prazo_resposta: v[5], versao_formulario: f.versao, estrutura: f.estrutura, status: 'gerado' }; BD.envios.push(e); return [{ id: e.id, versao_formulario: e.versao_formulario }] }
    if ((m = q.match(/^select id, token, status, enviado_em, visualizado_em, iniciado_em, respondido_em, expira_em, respondente, consentimento_em from public\.formulario_envios where token in \((.*)\)$/s))) { const tk = dividir(m[1]).map(un); return BD.envios.filter(e => tk.includes(e.token)) }
    if ((m = q.match(/^select pergunta_ref, ordem, pergunta_texto, pergunta_tipo, secao_titulo, resposta from public\.formulario_envio_respostas where envio_id = (\d+)/))) return BD.respostas.filter(r => r.envio_id === Number(m[1])).sort((a, b) => a.ordem - b.ordem)
    if ((m = q.match(/^update public\.formulario_envios set (.*) where id = (\d+)/s))) { const e = BD.envios.find(x => x.id === Number(m[2])); if (!e) return []; if (/status = 'cancelado'/.test(m[1])) e.status = 'cancelado'; if (/expira_em = '/.test(m[1])) e.expira_em = un(m[1].match(/expira_em = ('.*?')( |$)/)[1]); const c = m[1].match(/canal_envio = '(\w+)'/); if (c) { e.canal_envio = c[1]; e.enviado_em = e.enviado_em || new Date().toISOString(); if (e.status === 'gerado') e.status = 'enviado' } return [] }
    /* WhatsApp */
    if (/^select m\.id, m\.created_at, m\.direcao/.test(q)) return BD.mensagens.filter(x => !x.exemplo)
    if (/from public\.escritorio where chave = 'wa_ultimo_webhook'/.test(q)) return BD.diag ? [{ valor: JSON.stringify(BD.diag), updated_at: BD.diag.em }] : []
    if ((m = q.match(/^insert into public\.whatsapp_saida \(contato_id, caso_id, telefone, tipo, texto, criado_por\) values \((.*)\) returning id$/s))) { const v = dividir(m[1]).map(un); const s = { id: ++BD.seq, contato_id: v[0], caso_id: v[1], telefone: v[2], tipo: v[3], texto: v[4], status: 'pendente' }; BD.saida.push(s); return [{ id: s.id }] }
    if ((m = q.match(/^insert into public\.whatsapp_saida \(contato_id, caso_id, telefone, tipo, template_nome, template_idioma, template_params, criado_por\) values \((.*)\) returning id$/s))) { const v = dividir(m[1]).map(un); const s = { id: ++BD.seq, contato_id: v[0], caso_id: v[1], telefone: v[2], tipo: v[3], template_nome: v[4], template_idioma: v[5], template_params: JSON.parse(v[6]), status: 'pendente' }; BD.saida.push(s); return [{ id: s.id }] }
    if (/^insert into public\.whatsapp_saida \(tipo, criado_por\) values \('sincronizar_templates'/.test(q)) { const s = { id: ++BD.seq, tipo: 'sincronizar_templates', status: 'pendente' }; BD.saida.push(s); return [{ id: s.id }] }
    if ((m = q.match(/^select id, status, erro, wa_message_id from public\.whatsapp_saida where id in \((.*)\)$/))) { const ids = m[1].split(',').map(Number); return BD.saida.filter(s => ids.includes(s.id)) }
    if (/from public\.whatsapp_templates/.test(q)) return BD.templates
    if ((m = q.match(/^update public\.mensagens_whatsapp set caso_id = (\d+) where contato_id = (\d+) and caso_id is null$/))) { BD.mensagens.filter(x => x.cid === Number(m[2]) && !x.caso_id).forEach(x => { x.caso_id = Number(m[1]) }); return [] }
    throw new Error('SQL não previsto no teste: ' + q.slice(0, 160)) }
  window.claude = { use: async n => n === 'mcp' ? { callTool: async (srv, tool, inp) => { window.__sql.push({ srv, tool, q: inp.query }); if (srv === 'Supabase') return ret(exec(inp.query)); return { payload: {} } } } : null }
  /* simulações do LADO DE FORA (o que a Meta e a cliente fariam): */
  window.__clienteResponde = (token, respostas, quem) => { const e = BD.envios.find(x => x.token === token); e.status = 'respondido'; e.respondido_em = new Date().toISOString(); e.respondente = quem || null; e.consentimento_em = e.respondido_em; let o = 0; for (const s of e.estrutura.secoes) for (const i of s.itens) if (respostas[i.pergunta_id] !== undefined) BD.respostas.push({ envio_id: e.id, ordem: o++, pergunta_ref: String(i.pergunta_id), pergunta_texto: i.texto, pergunta_tipo: i.tipo, secao_titulo: s.titulo, resposta: respostas[i.pergunta_id] }) }
})
await p.goto('file:///home/user/pasta/artefatos/crm-completo/dist/crm.html'); await p.waitForSelector('[data-testid=sidebar]')
const E = (fn, a) => p.evaluate(fn, a); const t = id => p.locator(`[data-testid="${id}"]`); const esp = (n = 200) => p.waitForTimeout(n); const sqls = () => E(() => window.__sql.map(x => x.q)); const bd = () => E(() => window.__bd)

/* 0. Estrutura limpa: nada de formulário, pergunta ou envio de exemplo */
ok(await E(() => DB.formularios.length === 0 && DB.envios.length === 0), 'o CRM começa SEM formulários, perguntas ou envios de exemplo')
await E(() => ir('formularios')); await esp(); ok((await p.locator('main').innerText()).includes('Nenhum formulário'), 'tela de formulários começa vazia')

/* 1. Eu crio: formulário vazio → perguntas por mim → salvar como rascunho */
await t('novo-formulario').click(); await t('novo-nome').fill('Dados da família'); await t('novo-criar').click(); await esp()
ok(await E(() => DB.formularios[0].secoes[0].itens.length === 0 && DB.formularios[0].situacao === 'rascunho' && !!DB.formularios[0].ref), 'novo formulário nasce vazio, em rascunho e com identificador próprio')
await t('add-pergunta-0').click(); await t('edit-texto').fill('Nome do cônjuge'); await t('edit-obrigatoria').check().catch(() => {}); await esp()
await t('add-pergunta-0').click(); await t('edit-texto').fill('Tem filhos?'); await p.selectOption('[data-testid=edit-tipo]', 'sim_nao'); await esp()
await t('salvar').click(); await esp()
ok(await E(() => DB.formularios[0].secoes[0].itens.map(i => i.texto).join('|') === 'Nome do cônjuge|Tem filhos?' && DB.formularios[0].situacao === 'rascunho'), 'perguntas escritas por mim, salvas como rascunho')
ok(!(await sqls()).some(q => /formularios/.test(q)), 'rascunho não vai para o banco real (só publicado)')

/* 2. Publicar (versão 1) */
await t('publicar-form').click(); await esp(500)
let B = await bd(); ok(B.formularios.length === 1 && B.formularios[0].versao === 1 && B.formularios[0].situacao === 'publicado' && B.formularios[0].estrutura.secoes[0].itens.length === 2, 'publicar grava a versão 1 no banco, com as 2 perguntas')
ok(await E(() => { const f = DB.formularios[0]; return f.situacao === 'publicado' && f.pub_versao === 1 && !!f.site_id }), 'formulário local fica publicado (v1) e ligado ao banco')
ok(await t('publicar-form').count() === 0, 'sem alterações: não oferece republicar')

/* 3. Editar depois → alterações não publicadas → v2 */
await t('add-pergunta-1').click().catch(async () => { await t('add-pergunta-0').click() }); await t('edit-texto').fill('E-mail'); await p.selectOption('[data-testid=edit-tipo]', 'email'); await esp(); await t('salvar').click(); await esp()
ok((await t('construtor').innerText()).includes('Alterações não publicadas') && await t('publicar-form').count() === 1, 'editar depois mostra "Alterações não publicadas"')
ok((await bd()).formularios[0].versao === 1 && (await bd()).formularios[0].estrutura.secoes[0].itens.length === 2, 'o banco continua com a versão 1 até eu publicar de novo')
await E(() => { const i = DB.formularios[0].secoes[0].itens.find(x => x.tipo === 'email'); i.mapear = 'email'; salvar('formularios') }); await E(() => ir('formularios')); await E(() => ir('formularios', { editar: DB.formularios[0].id })); await esp()
await t('publicar-form').click(); await esp(500); B = await bd()
ok(B.formularios[0].versao === 2 && B.formularios[0].estrutura.secoes[0].itens.length === 3, 'publicar de novo sobe para a versão 2 (3 perguntas)')

/* 4. Tipo que o link público não suporta é recusado com explicação (nada falso) */
await E(() => { const f = DB.formularios[0]; f.secoes[0].itens.push({ pergunta_id: 9999, texto: 'Envie a certidão', tipo: 'arquivo', opcoes: [], ajuda: null, obrigatoria: false, mostrar_se: null }) }); const antesV = (await bd()).formularios[0].versao
await E(() => publicarForm(DB.formularios[0])); await esp(); ok((await bd()).formularios[0].versao === antesV && (await p.locator('body').innerText()).includes('ainda não suporta'), 'pergunta de envio de arquivo: não publica e explica')
await E(() => { DB.formularios[0].secoes[0].itens = DB.formularios[0].secoes[0].itens.filter(i => i.pergunta_id !== 9999); salvar('formularios') })

/* 5. Enviar: pessoa real + demanda → link público individual */
await E(() => { const c = clonar(DB.contatos[0]); Object.assign(c, { id: 50, nome: 'Maria Teste', telefone: '5571988880000', email: null, etapa: 'ativo', real: true, exemplo: false, qualificacao: null, respostas: {}, site_id: null }); DB.contatos.push(c); const d = clonar(DB.demandas[0]); Object.assign(d, { id: 80, contato_id: 50, titulo: 'Divórcio da Maria', site_id: null, exemplo: false }); DB.demandas.push(d); salvar('*') })
await E(() => abrirFicha(50)); await esp(); await t('enviar-formulario').click(); await esp()
ok((await p.locator('.modal-input[data-testid=env-form]').innerText()).includes('Dados da família — v2'), 'só formulários publicados aparecem, com a versão')
await t('env-caso').selectOption('80'); await t('env-prazo').fill('2031-03-10'); await t('env-validade').fill('20'); await t('gerar-link').click(); await esp(600)
B = await bd(); const env = B.envios[0]
ok(B.contatos.length === 1 && B.contatos[0].telefone === '5571988880000' && B.contatos[0].exemplo === false && B.casos.length === 1 && B.casos[0].titulo === 'Divórcio da Maria' && B.casos[0].contato_id === B.contatos[0].id, 'pessoa e demanda reais criadas no banco (uma vez), ligadas entre si')
ok(env && env.formulario_id === B.formularios[0].id && env.contato_id === B.contatos[0].id && env.caso_id === B.casos[0].id && env.prazo_resposta === '2031-03-10' && env.versao_formulario === 2 && env.estrutura.secoes[0].itens.length === 3 && env.token.length === 32 && env.status === 'gerado', 'envio no banco: formulário, versão 2, pessoa, demanda, prazo, token e estrutura congelada')
ok((await p.locator('body').innerText()).includes('Link criado com sucesso') && (await t('link-form').inputValue()) === 'https://laracafeadv.github.io/pasta/formulario/?t=' + env.token, 'tela "Link criado com sucesso" com a URL pública individual')
ok(await t('copiar-link').count() === 1 && await t('env-whatsapp').count() === 1 && await t('env-email').count() === 1 && await t('ver-formulario').count() === 1 && await t('ver-respostas-envio').count() === 1, 'botões: copiar, WhatsApp, e-mail, ver formulário e ver respostas')
ok(Math.abs(new Date(env.expira_em) - (Date.now() + 20 * 864e5)) < 120000, 'validade de 20 dias')
await t('copiar-link').click(); await esp(400); ok((await bd()).envios[0].status === 'enviado' && (await bd()).envios[0].canal_envio === 'manual', 'copiar o link marca como "enviado" (manual) também no banco')

/* 6. Versão congelada: editar e publicar v3 não muda o que a cliente recebeu */
await E(() => { DB.formularios[0].secoes[0].itens[0].texto = 'Nome do cônjuge (EDITADO)'; salvar('formularios') }); await E(() => publicarForm(DB.formularios[0])); await esp(400); B = await bd()
ok(B.formularios[0].versao === 3 && B.envios[0].versao_formulario === 2 && B.envios[0].estrutura.secoes[0].itens[0].texto === 'Nome do cônjuge', 'v3 publicada; o envio já feito continua na v2, com o texto original')

/* 7. A cliente responde (lado de fora) → o CRM recebe, vincula e deixa revisar */
const ids = await E(() => DB.formularios[0].secoes[0].itens.map(i => i.pergunta_id))
await E(([tok, ids]) => window.__clienteResponde(tok, { [ids[0]]: 'João Silva', [ids[1]]: 'Sim', [ids[2]]: 'maria.nova@exemplo.com' }, 'Maria'), [env.token, ids])
await E(() => ir('formularios', { aba: 'respostas' })); await esp(); await t('sincronizar-form-site').click(); await esp(600)
ok(await E(() => { const e = DB.envios[0]; return e.status === 'respondido' && e.nova === true && e.respondente === 'Maria' && e.respostas[DB.formularios[0].secoes[0].itens[2].pergunta_id] === 'maria.nova@exemplo.com' && e.caso_id === 80 }), 'resposta chega ao CRM: respondido, ligado à pessoa e à demanda, com as respostas por pergunta')
ok((await t('aba-respostas').innerText()).includes('(1)'), 'aviso de resposta nova na aba')
await E(() => ir('hoje')); await esp(); ok((await p.locator('main').innerText()).includes('Formulário respondido para revisar'), 'a resposta aparece no Hoje')
await E(() => verEnvio(DB.envios[0])); await esp(); const det = await t('detalhe-resposta').innerText(); ok(det.includes('João Silva') && det.includes('maria.nova@exemplo.com') && det.includes('Divórcio da Maria') && det.includes('Maria'), 'visualização: respostas organizadas, demanda e quem respondeu')
await t('revisar-aplicar').click(); await esp(); await t('aplicar-cadastro').click(); await esp(300); ok(await E(() => contato(50).email) === 'maria.nova@exemplo.com', 'e-mail respondido vai ao cadastro depois da minha conferência')
await E(() => abrirFicha(50)); await esp(); ok((await p.locator('[data-testid=ficha]').innerText()).includes('Respondido'), 'na ficha da pessoa o formulário aparece como respondido'); await E(() => fecharTodas())

/* 8. Cancelar, prorrogar e despublicar */
await E(() => { const e = DB.envios[0]; e.status = 'gerado'; e.respondido_em = null; const b = window.__bd.envios[0]; b.status = 'enviado'; b.respondido_em = null }) // volta a aberto só para testar o cancelamento
await E(() => painelEnvio(DB.envios[0])); await esp(); await t('cancelar-link').click(); await esp(); await p.getByRole('button', { name: /^Cancelar link$/ }).last().click(); await esp(500)
ok((await bd()).envios[0].status === 'cancelado', 'cancelar encerra o link no banco (a cliente não abre mais)')
await E(() => fecharTodas()); await E(() => ir('formularios')); await esp(); await t('sit-filtro-publicado').click(); await esp(); await E(() => despublicarForm(DB.formularios[0], 'rascunho')); await esp(400)
ok((await bd()).formularios[0].situacao === 'arquivado' && await E(() => DB.formularios[0].situacao) === 'rascunho', 'despublicar: no banco deixa de aceitar novos links; aqui volta a rascunho')
await E(() => enviarFormulario(contato(50), null)); await esp(); ok((await p.locator('body').innerText()).includes('Publique um formulário antes de enviar'), 'sem formulário publicado não dá para gerar link')

/* 9. Dados de exemplo: marcados e removíveis; seeds antigos de formulário são limpos */
ok(await E(() => ehExemplo(DB.contatos[0]) && !ehExemplo(contato(50))), 'pessoas de exemplo ficam marcadas; a pessoa real não')
await E(() => { DB.formularios.push({ id: 1, nome: 'Dados da consulta', secoes: [], situacao: 'publicado' }); CONFIG.v_sem_form_exemplo = false; migrarSeedsDeFormularios() }); ok(await E(() => !DB.formularios.some(f => f.nome === 'Dados da consulta')), 'formulários de exemplo das versões antigas são removidos (uma vez)')
await E(() => limparDadosDeExemplo()); await esp(); await p.getByRole('button', { name: /Remover exemplos/ }).click(); await esp(300)
ok(await E(() => DB.contatos.every(c => !ehExemplo(c)) && DB.contatos.length === 1 && DB.demandas.length === 1 && DB.demandas[0].id === 80), 'remover exemplos apaga só os exemplos; a pessoa e a demanda reais ficam')

/* ============ WHATSAPP ============ */
await E(() => { window.__bd.contatos.push({ id: 500, telefone: '5571988880000', nome: 'Maria Teste' }); const m = (id, dir, txt, h, st, cid = 500, wa = 'wamid.' + id) => ({ id, created_at: new Date(Date.now() - h * 3600e3).toISOString(), direcao: dir, conteudo: txt, tipo: 'text', wa_message_id: wa, status: st, erro: null, caso_id: null, cid, telefone: cid === 500 ? '5571988880000' : '5571977776666', nome: cid === 500 ? 'Maria Teste' : 'Novo Contato' }); window.__bd.mensagens.push(m(1, 'entrada', 'Bom dia, doutora!', 1, 'recebida'), m(2, 'saida', 'Bom dia, Maria!', 0.9, 'lida'), m(3, 'entrada', 'Oi, quero uma consulta', 3, 'recebida', 600), m(4, 'entrada', 'MENSAGEM DE EXEMPLO', 2, 'recebida', 700)); window.__bd.mensagens[3].exemplo = true })
await E(() => ir('comunicacao')); await esp(); ok((await p.locator('main').innerText()).includes('WhatsApp ainda não consultado'), 'antes de consultar: estado honesto (não finge conexão)')
await t('sincronizar-wa').click(); await esp(700)
ok((await p.locator('main').innerText()).includes('Aguardando a Meta'), 'sem eventos da Meta: "Aguardando a Meta" (falta configurar)')
ok(await E(() => DB.comunicacoes.filter(m => m.ext_id === 'wa:wamid.1' || m.ext_id === 'wa:wamid.2').length === 2 && DB.comunicacoes.find(m => m.ext_id === 'wa:wamid.2').wa_status === 'lida' && contato(50).site_id === 500), 'mensagens do banco entram na pessoa certa (pelo telefone), com o status')
ok(!(await E(() => DB.comunicacoes.some(m => m.texto === 'MENSAGEM DE EXEMPLO'))), 'mensagens de dados de exemplo não entram')
ok(await t('associar-numero').count() === 1 && (await p.locator('main').innerText()).includes('Novo Contato'), 'número desconhecido não cria pessoa sozinho: aparece para eu associar')
const antesN = await E(() => DB.contatos.length); await t('associar-numero').click(); await esp(); await t('salvar').click(); await esp(600)
ok(await E(() => DB.contatos.length === 2 && DB.contatos.at(-1).telefone === '5571977776666' && DB.comunicacoes.some(m => m.texto === 'Oi, quero uma consulta')), 'associar criando a pessoa: a conversa passa a existir no CRM')
await E(() => { window.__bd.diag = { ok: true, em: new Date().toISOString(), gravadas: 2 } }); await t('sincronizar-wa').click(); await esp(500); ok(!(await p.locator('main').innerText()).includes('Aguardando a Meta'), 'com evento da Meta registrado, o aviso some')
await E(() => { window.__bd.diag = { ok: false, motivo: 'assinatura não confere (App Secret diferente)', em: new Date().toISOString() } }); await t('sincronizar-wa').click(); await esp(500); ok((await p.locator('main').innerText()).includes('assinatura não confere'), 'assinatura inválida é mostrada com o motivo')

/* responder pelo CRM — dentro da janela de 24h: texto livre pela API */
await E(() => { UI.com.sel = 50; render() }); await esp(); await t('comp-texto').fill("Olá, Maria! Segue o 'andamento'."); await t('wa-enviar-api').click(); await esp(600)
let S = (await bd()).saida; ok(S.length === 1 && S[0].tipo === 'texto' && S[0].texto === "Olá, Maria! Segue o 'andamento'." && S[0].telefone === '5571988880000' && S[0].contato_id === 500, 'resposta enfileirada no banco com o texto exato (aspas escapadas), telefone e pessoa')
ok((await t('wa-status').last().innerText()).includes('Na fila'), 'mensagem aparece como "Na fila" — ainda NÃO como enviada')
await E(() => { const s = window.__bd.saida[0]; s.status = 'enviada'; s.wa_message_id = 'wamid.OUT1'; window.__bd.mensagens.push({ id: 9, created_at: new Date().toISOString(), direcao: 'saida', conteudo: s.texto, tipo: 'text', wa_message_id: 'wamid.OUT1', status: 'enviada', erro: null, caso_id: null, cid: 500, telefone: '5571988880000', nome: 'Maria Teste' }) }); await E(() => sincronizarWhatsApp(true)); await esp(400)
ok(await E(() => { const l = DB.comunicacoes.filter(m => m.direcao === 'saida' && /andamento/.test(m.texto)); return l.length === 1 && l[0].wa_status === 'enviada' && l[0].ext_id === 'wa:wamid.OUT1' }), 'quando a Meta aceita: vira "Enviada" e não duplica a mensagem')
await E(() => { window.__bd.mensagens.find(m => m.id === 9).status = 'entregue' }); await E(() => sincronizarWhatsApp(true)); ok(await E(() => DB.comunicacoes.find(m => m.ext_id === 'wa:wamid.OUT1').wa_status === 'entregue'), 'status de entrega chega depois (entregue)')
/* falha */
await E(() => { UI.com.sel = 50; render() }); await esp(); await t('comp-texto').fill('Segunda mensagem'); await t('wa-enviar-api').click(); await esp(500)
await E(() => { const s = window.__bd.saida[1]; s.status = 'falhou'; s.erro = 'Falta o segredo WHATSAPP_TOKEN nas Edge Functions do Supabase.' }); await E(() => atualizarSaidasWa(true)); await esp(300)
ok((await p.locator('[data-testid=wa-status]').last().innerText()).includes('Falhou') && (await t('wa-erro').last().innerText()).includes('WHATSAPP_TOKEN'), 'falha: marcada "Falhou" com o motivo exato (nunca como enviada)')
/* fora da janela: só modelo aprovado */
await E(() => { DB.comunicacoes.filter(m => m.contato_id === 50 && m.direcao === 'entrada').forEach(m => { m.created_at = new Date(Date.now() - 3 * 864e5).toISOString() }); render() }); await esp(); await E(() => { UI.com.sel = 50; render() }); await esp()
await t('comp-texto').fill('Mensagem fora da janela'); await t('wa-enviar-api').click(); await esp(600)
ok(await t('sem-modelos').count() === 1 && (await p.locator('body').innerText()).includes('Fora da janela de 24 horas'), 'fora da janela de 24 h: exige modelo aprovado e explica (nenhum modelo sincronizado ainda)')
await E(() => { window.__bd.templates.push({ nome: 'lembrete_consulta', idioma: 'pt_BR', categoria: 'UTILITY', status: 'APPROVED', componentes: [{ type: 'BODY', text: 'Olá {{1}}, sua consulta é em {{2}}.' }] }) }); await E(() => { fecharTodas(); return lerModelosWa() }); await E(() => { escolherModeloWa(contato(50), null, '') }); await esp(500)
ok(await t('tpl-lembrete_consulta').count() === 1, 'modelos aprovados vêm da Meta (sincronizados), não escritos no código')
await t('tpl-lembrete_consulta').click(); await t('tpl-param-1').fill('Maria'); await t('tpl-param-2').fill('10/10'); await t('enviar-modelo').click(); await esp(500); S = (await bd()).saida.at(-1)
ok(S.tipo === 'template' && S.template_nome === 'lembrete_consulta' && S.template_idioma === 'pt_BR' && S.template_params.join('|') === 'Maria|10/10', 'modelo enfileirado com nome, idioma e variáveis')
/* vincular conversa à demanda */
await E(() => { UI.com.sel = 50; render() }); await esp(); await t('vincular-conversa').click(); await esp(); await t('salvar').click(); await esp(600)
ok(await E(() => DB.comunicacoes.filter(m => m.contato_id === 50 && m.canal === 'whatsapp').every(m => m.caso_id === 80)) && (await sqls()).some(q => /^update public\.mensagens_whatsapp set caso_id = \d+ where contato_id = \d+ and caso_id is null$/.test(q)), 'conversa vinculada à demanda (aqui e no banco)')
/* segurança: SQL livre é recusado */
ok(await E(() => sqlEscrita('delete from public.contatos').then(() => false, e => e.code === 'recusado')) && await E(() => sqlEscrita("update public.formulario_envios_x set a = 1").then(() => false, e => e.code === 'recusado')) && await E(() => sqlEscrita('drop table public.contatos').then(() => false, e => e.code === 'recusado')), 'o artifact só escreve pelos construtores permitidos (SQL livre é recusado)')
/* Conexões: passo a passo e URL do webhook */
await E(() => ir('config', { aba: 'conexoes' })); await esp(); const cx = await p.locator('main').innerText(); ok(await t('bloco-whatsapp').count() === 1 && (await t('url-webhook').innerText()) === 'https://cuaeuazmgwdhfozrqkin.supabase.co/functions/v1/crm-api/whatsapp' && cx.includes('WHATSAPP_APP_SECRET') && cx.includes('Sem Vercel') || cx.includes('sem Vercel'), 'Conexões: estado real, URL do webhook e passo a passo da Meta')
ok(await t('cfg-pagina-url').count() === 1, 'Conexões: endereço da página pública configurável')
ok(erros.length === 0, 'sem erros: ' + erros.slice(0, 3).join(' | '))
await b.close(); console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK'); process.exit(falhas ? 1 : 0)
