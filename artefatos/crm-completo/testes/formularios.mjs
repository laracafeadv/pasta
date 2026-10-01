// Jornada de formulários: criar → publicar → enviar (link/WhatsApp/e-mail/QR) → cliente preenche → recebimento → revisão → cadastro.
// Conectores (Gmail, Drive, Supabase) SIMULADOS no teste; o artefato publicado usa os reais.
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.route(/wa\.me|mail\.google|drive\.google/, r => r.fulfill({ status: 200, body: 'ok' }))
const p = await ctx.newPage(); const erros = []; p.on('pageerror', e => erros.push(e.message)); p.on('console', m => { if (m.type() === 'error') erros.push(m.text()) })
await p.addInitScript(() => {
  window.__calls = []; window.__siteRows = []; window.__siteResp = []
  const mcp = { callTool: async (srv, tool, inp) => { window.__calls.push({ srv, tool, inp })
    if (srv === 'Supabase') { const q = inp.query; const dev = r => ({ payload: '<untrusted-data-x>\n' + JSON.stringify(r) + '\n</untrusted-data-x>' })
      if (/from public\.contatos where telefone/.test(q)) return dev([{ id: 77 }]); if (/from public\.formularios f where/.test(q)) return dev([{ id: 5, perguntas: 4 }]); if (/^insert into public\.formulario_envios/.test(q)) return dev([{ id: 900 }]); if (/^update public\.formulario_envios/.test(q)) return dev([])
      if (/from public\.formulario_envios e join/.test(q)) return dev(window.__siteRows); if (/from public\.formulario_envio_respostas/.test(q)) return dev(window.__siteResp); return dev([]) }
    if (srv === 'Google Drive' && tool === 'create_file') return { payload: { id: 'ARQ' + String(window.__calls.length).padStart(9, '0'), title: inp.title, viewUrl: 'https://drive.google.com/file/d/X/view' } }
    if (srv === 'Gmail' && tool === 'send_message') return { payload: { id: 'SENT1' } }
    return { payload: {} } } }
  window.claude = { use: async n => n === 'mcp' ? mcp : null }
})
await p.goto('file:///home/user/pasta/artefatos/crm-completo/dist/crm.html'); await p.waitForSelector('[data-testid=sidebar]')
const E = (fn, a) => p.evaluate(fn, a); const t = id => p.locator(`[data-testid="${id}"]`); const esp = (n = 200) => p.waitForTimeout(n); const calls = () => E(() => window.__calls)

/* 1. Construtor: formulário com os tipos novos, em rascunho */
const fid = await E(() => {
  const id = proximoId('formularios'); let n = 900; const P = (texto, tipo, x = {}) => ({ pergunta_id: ++n, texto, tipo, opcoes: [], ajuda: null, obrigatoria: true, mostrar_se: null, ...x })
  const doc = DB.documentos.find(d => d.caso_id === 1 && d.status === 'pendente'); window.__docDesc = doc ? doc.descricao : null; window.__docId = doc ? doc.id : null
  DB.formularios.push({ id, nome: 'Dados completos', descricao: 'Dados e documentos', contexto: 'cliente', procedimentos: [], ativo: false, situacao: 'rascunho', updated_at: agora(), validade_dias: 15, instrucoes: 'Tenha o RG em mãos.', finalidade: 'Preparar a procuração.', mensagem_final: 'Recebido, obrigada!', secoes: [{ id: null, titulo: 'Dados', descricao: null, mostrar_se: null, itens: [P('E-mail', 'email', { mapear: 'email' }), P('CPF', 'cpf_cnpj', { mapear: 'cpf' }), P('Melhor horário', 'horario', { obrigatoria: false }), P('Endereço', 'endereco', { mapear: 'endereco' }), P('Documento enviado', 'arquivo', { doc_desc: doc ? doc.descricao : 'Documento' }), P('Assinatura', 'assinatura')] }] }); salvar('formularios'); return id })
ok(await E(() => ['horario', 'cpf_cnpj', 'endereco', 'arquivo', 'assinatura'].every(x => CRM.TIPO(x))), 'tipos novos registrados (horário, CPF/CNPJ, endereço, arquivo, assinatura)')
await E(i => ir('formularios', { editar: i }), fid); await esp(300)
ok(await t('config-envio').count() === 1 && await t('aviso-sensivel').count() === 1, 'construtor: instruções/finalidade/validade e aviso de dados sensíveis')
ok(await t('publicar-form').count() === 1 && await t('arquivar-form').count() === 0, 'rascunho mostra "Publicar" (não "Arquivar")')
await t('card-E-mail').click(); await esp(); ok(await t('edit-mapear').count() === 1, 'pergunta de e-mail oferece "Levar ao cadastro"')
await t('form-titulo').fill('Dados completos do cliente'); await t('form-validade').fill('20'); await esp()
await t('publicar-form').click(); await esp(300)
ok(await E(i => situacaoForm(formularioDe(i)) === 'publicado' && formularioDe(i).ativo === true && formularioDe(i).validade_dias === 20 && formularioDe(i).nome === 'Dados completos do cliente', fid), 'publicar salva e muda a situação para publicado')

/* 2. Situação: rascunho não é enviável; arquivado some */
await E(() => { const f = DB.formularios.find(x => x.id === 1); f.situacao = 'rascunho'; f.ativo = false }); ok(await E(() => formsDoEscopo('demanda').every(f => f.id !== 1)), 'rascunho não entra nos formulários da ficha')
await E(() => { const f = DB.formularios.find(x => x.id === 1); f.situacao = 'publicado'; f.ativo = true })
await E(() => ir('formularios')); await esp(); await t('sit-filtro-arquivado').click(); await esp(); ok(await t('form-' + fid).count() === 0, 'lista filtra por situação')
await t('sit-filtro-publicado').click(); await esp(); await t('arquivar-' + fid).click(); await esp(); ok(await E(i => situacaoForm(formularioDe(i)) === 'arquivado', fid), 'arquivar pela lista')
await t('sit-filtro-arquivado').click(); await esp(); await t('publicar-' + fid).click(); await esp(); ok(await E(i => situacaoForm(formularioDe(i)) === 'publicado', fid), 'republicar pela lista')

/* 3. Envio — link de teste (sem site): honesto, não envia */
await E(() => abrirFicha(6)); await esp(); await t('enviar-formulario').click(); await esp(); await t('env-form').selectOption(String(fid)); await t('env-caso').selectOption('1'); await t('env-prazo').fill('2020-01-01'); ok(await t('modo-site').isDisabled(), 'sem endereço do site, link real fica indisponível'); await t('gerar-link').click(); await esp(300)

const e1 = await E(() => DB.envios.at(-1)); ok(e1.modo === 'teste' && e1.status === 'gerado' && e1.caso_id === 1 && e1.token.length === 32 && /^[A-Za-z0-9_-]+$/.test(e1.token) && !e1.enviado_em, 'envio de teste: token 192 bits, vinculado à demanda, não marcado como enviado')
ok(await t('env-whatsapp').isDisabled() && await t('env-email').isDisabled() && await t('copiar-link').isDisabled(), 'link de teste: WhatsApp/e-mail/copiar desabilitados (nada falso)')
ok((await t('painel-envio').innerText()).includes('Link de teste') && (await t('msg-previa').inputValue()).includes('Beatriz'), 'painel explica o limite e mostra a prévia da mensagem')
ok(await E(() => atrasadoEnvio(DB.envios.at(-1))) === true, 'prazo vencido sinalizado')
await p.keyboard.press('Escape'); await E(() => fecharTodas())

/* 4. Preenchimento pela cliente (atendimento): validações, parcial, upload, assinatura */
await E(() => { const c = contato(6); c.drive_pasta_id = null; c.drive_subpastas = null; const e = DB.envios.at(-1); e.prazo_resposta = null; ir('publico', { token: e.token }) }); await esp(300)
ok((await t('instrucoes').innerText()).includes('RG') && await t('publico-titulo').count() === 1, 'página da cliente mostra título e instruções')
ok(await E(() => DB.envios.at(-1).status) === 'visualizado', 'abrir o link marca "visualizado"')
const pid = async k => await E(k_ => itensDe(formularioDe(DB.envios.at(-1).formulario_id)).find(i => i.texto === k_).pergunta_id, k)
await p.locator('[data-pid="901"]').fill('bia@exemplo.com'); await esp(600)
ok(await E(() => DB.envios.at(-1).status) === 'iniciado', 'começar a preencher marca "iniciado"')
await p.locator('[data-pid="902"]').fill('11122233344'); await p.locator('[data-pid="903"]').fill('14:30')
await p.locator('[data-pid="904-cep"]').fill('41810000'); await p.locator('[data-pid="904-logradouro"]').fill('Rua das Flores'); await p.locator('[data-pid="904-numero"]').fill('45'); await p.locator('[data-pid="904-bairro"]').fill('Pituba'); await p.locator('[data-pid="904-cidade"]').fill('Salvador'); await p.locator('[data-pid="904-uf"]').selectOption('BA')
await p.setInputFiles('[data-testid="arquivo-905"]', { name: 'certidao.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 teste') }); await esp(300)
await p.setInputFiles('[data-testid="arquivo-905"]', { name: 'virus.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') }); await esp(300)
ok(await E(() => (document.querySelector('[data-testid=arquivo-905]').closest('div').querySelectorAll('li').length)) === 1, 'upload: aceita PDF e recusa tipo não permitido')
await t('assinatura-canvas').scrollIntoViewIfNeeded(); const cv = await t('assinatura-canvas').boundingBox(); await p.mouse.move(cv.x + 30, cv.y + 60); await p.mouse.down(); await p.mouse.move(cv.x + 120, cv.y + 100, { steps: 6 }); await p.mouse.move(cv.x + 200, cv.y + 50, { steps: 6 }); await p.mouse.up(); await esp()
await t('avancar').click(); await esp(); ok((await t('publico-titulo').count()) === 1 && await p.getByText('CPF inválido.').count() === 1, 'CPF inválido bloqueia')
await p.locator('[data-pid="902"]').fill('529.982.247-25'); await esp(); await t('aceite-privacidade').check(); await t('avancar').click(); await esp(300)
ok((await t('erro-envio').innerText()).includes('pasta do Drive'), 'arquivo sem pasta do Drive vinculada: bloqueia e explica (não perde o arquivo em silêncio)')
await E(() => { const c = contato(6); c.drive_pasta_id = 'PASTA00000001'; c.drive_pasta_url = 'https://drive.google.com/drive/folders/PASTA00000001' })
await t('avancar').click(); await esp(500)
ok(await t('obrigada').count() === 1 && (await t('obrigada').innerText()).includes('Recebido, obrigada!'), 'conclusão mostra a mensagem do formulário')
const env = await E(() => DB.envios.at(-1)); ok(env.status === 'respondido' && env.nova === true && env.consentimento_em && env.caso_id === 1 && env.anexos.length === 1 && env.anexos[0].drive_id && /^data:image\/png/.test(env.respostas['906']) && env.respostas['904'].cidade === 'Salvador', 'resposta guardada: status, ciência de privacidade, demanda, anexo no Drive, assinatura e endereço')
const cr = (await calls()).filter(x => x.tool === 'create_file').at(-1); ok(cr && cr.inp.parentId === 'PASTA00000001' && cr.inp.title === 'certidao.pdf' && cr.inp.base64Content, 'anexo foi enviado à pasta do cliente no Drive')
ok(await E(() => contato(6).respostas['901'] === 'bia@exemplo.com' && !contato(6).respostas['906']), 'respostas ligadas à ficha (sem gravar a imagem da assinatura no cadastro)')
ok(await E(() => contato(6).email) !== 'bia@exemplo.com', 'cadastro NÃO é sobrescrito automaticamente (depende da revisão)')

/* 5. Recebimento: caixa, Hoje, detalhe, revisão, edição, aplicação ao cadastro */
await E(() => ir('formularios', { aba: 'respostas' })); await esp(); ok((await t('aba-respostas').innerText()).includes('(1)'), 'aba mostra quantas respostas aguardam revisão')
await t('est-filtro-revisar').click(); await esp(); ok(await t('ver-resposta').count() === 1 && (await t('status-envio').first().innerText()).includes('Nova'), 'filtro "a revisar" lista a resposta nova')
await E(() => ir('hoje')); await esp(); ok((await p.locator('main').innerText()).includes('Formulário respondido para revisar'), 'Hoje avisa de resposta nova')
await E(() => ir('formularios', { aba: 'respostas' })); await esp(); await t('est-filtro-revisar').click(); await t('ver-resposta').click(); await esp()
const det = await t('detalhe-resposta').innerText(); ok(det.includes('Quem respondeu') && det.includes('link individual') && det.includes('Ciência da privacidade') && det.includes('Rua das Flores') && det.includes('529.982.247-25') && det.includes('certidao.pdf') && det.includes('Demanda'), 'detalhe: quem, quando, privacidade, endereço, CPF, anexo e demanda')
ok(await t('resp-Assinatura').locator('img').count() === 1, 'assinatura aparece na revisão')
ok(await E(() => DB.envios.at(-1).nova) === false, 'abrir a resposta tira o selo "Nova"')
await t('marcar-revisado').click(); await esp(); ok(await E(() => !!DB.envios.at(-1).revisado_em), 'marcar como revisado'); await E(() => verEnvio(DB.envios.at(-1))); await esp()
await t('editar-respostas').click(); await esp(); await t('ed-901').fill('beatriz.nova@exemplo.com'); await t('salvar-edicao').click(); await esp()
const ed = await E(() => DB.envios.at(-1)); ok(ed.respostas['901'] === 'beatriz.nova@exemplo.com' && ed.respostas_originais['901'] === 'bia@exemplo.com' && ed.editado_em, 'edição interna preserva o original')
await E(() => verEnvio(DB.envios.at(-1))); await esp(); await t('revisar-aplicar').click(); await esp()
ok(await t('proposta-email').count() === 1 && await t('proposta-cpf').count() === 1 && await t('proposta-endereco').count() === 1, 'revisão propõe e-mail, CPF e endereço')
await t('proposta-email').locator('input').uncheck(); ok(!(await t('proposta-endereco').locator('input').isChecked()), 'onde o cadastro já tem outro valor, a proposta vem desmarcada'); await t('proposta-endereco').locator('input').check(); await t('aplicar-cadastro').click(); await esp(300)
const c6 = await E(() => contato(6)); ok(c6.qualificacao.cpf === '529.982.247-25' && c6.qualificacao.endereco.startsWith('Rua das Flores, 45') && c6.qualificacao.cep === '41810-000' && c6.email === 'beatriz.exemplo@email.com', 'só o que foi marcado vai ao cadastro (e-mail ficou como estava)')
const e2 = await E(() => DB.envios.at(-1)); ok(e2.aplicado_em && e2.aplicado_log.some(l => l.campo === 'Endereço' || l.campo === 'CPF' || l.campo.includes('CPF')), 'alterações registradas (antes → depois)')
if (await E(() => window.__docId)) { const d = await E(() => DB.documentos.find(x => x.id === window.__docId)); ok(d.arquivo_provedor === 'drive' && d.status !== 'pendente', 'arquivo recebido vinculado ao documento pendente da demanda') } else ok(true, '(sem documento pendente no seed)')
ok(await E(() => DB.atividades.some(a => a.contato_id === 6 && /aplicados ao cadastro/.test(a.texto))), 'histórico do cliente registra a aplicação')
await E(() => abrirFicha(6)); await esp(); ok((await p.locator('[data-testid=ficha]').innerText()).includes('Respondido'), 'ficha do cliente lista o envio como respondido')

/* 6. Link real (site): criação com confirmação, SQL restrito, WhatsApp/e-mail, QR, lembrete, cancelamento */
await E(() => { CONFIG.integr.site_url = 'https://crm.exemplo.com.br/'.replace(/\/$/, ''); CONFIG.integr.supabase = 'cuaeuazmgwdhfozrqkin' })
await E(() => fecharTodas()); await E(() => abrirFicha(6)); await esp(); await t('enviar-formulario').click(); await esp(); await t('env-form').selectOption('2'); ok(await t('modo-site').isEnabled(), 'com endereço do site, link real fica disponível'); await t('modo-site').click(); await t('gerar-link').click(); await esp(); 
ok((await p.locator('body').innerText()).includes('Criar o envio no CRM do site?'), 'link real pede confirmação antes de gravar no site')
const antesW = (await calls()).filter(x => /^insert/.test(x.inp.query || '')).length; ok(antesW === 0, 'nada gravado antes da confirmação'); await p.getByRole('button', { name: /Criar link real/i }).click(); await esp(400)
const ws = (await calls()).filter(x => x.srv === 'Supabase' && /^(insert|update)/.test(x.inp.query)); ok(ws.length === 1 && /^insert into public\.formulario_envios \(formulario_id, contato_id, token, expira_em, status\) values \(5, 77, '[A-Za-z0-9_-]{32}', '[^']+', 'enviado'\) returning id$/.test(ws[0].inp.query), 'única escrita: INSERT parametrizado em formulario_envios')
const e3 = await E(() => DB.envios.at(-1)); ok(e3.modo === 'site' && e3.site_id === 900 && (await t('link-form').inputValue()) === 'https://crm.exemplo.com.br/pc/' + e3.token, 'link individual: endereço do site + /pc/ + código do cliente')
ok(await t('env-whatsapp').isEnabled() && await t('env-email').isEnabled() && await t('copiar-link').isEnabled(), 'link real habilita WhatsApp, e-mail e copiar')
await t('env-qr').click(); await esp(); ok(await t('qr-svg').locator('svg').count() === 1, 'QR Code do link gerado'); await E(() => { fecharTodas(); painelEnvio(DB.envios.at(-1)) }); await esp()
await t('env-whatsapp').click(); await esp(); const txtWa = await t('comp-texto').inputValue(); ok(txtWa.includes('/pc/' + e3.token) && txtWa.includes('LGPD'), 'WhatsApp: mensagem pronta com o link individual')
const [pop] = await Promise.all([p.context().waitForEvent('page', { timeout: 3000 }).catch(() => null), t('wa-abrir').click()]); await esp(300)
ok(pop && /wa\.me\/55\d+\?text=/.test(pop.url()), 'abre o WhatsApp com a mensagem (envio manual pela usuária)')
const e3b = await E(() => DB.envios.at(-1)); ok(e3b.status === 'enviado' && e3b.enviado_em && e3b.canal_envio === 'whatsapp', 'envio marcado como "enviado" só depois de abrir o WhatsApp')
ok(await E(() => DB.comunicacoes.at(-1).canal === 'whatsapp' && DB.comunicacoes.at(-1).texto.includes('/pc/')), 'envio registrado na comunicação do cliente')
await E(() => fecharTodas()); await E(() => { const e = DB.envios.at(-1); e.enviado_em = agora(-60 * 24 * 4); render() }); await esp()
ok((await E(() => itensFormularioHoje().map(x => x.titulo))).some(x => /sem resposta há 4 dias/.test(x)), 'lembrete aparece no Hoje após 3+ dias sem resposta')
await E(() => painelEnvio(DB.envios.at(-1), true)); await esp(); ok((await t('msg-previa').inputValue()).includes('lembrar'), 'mensagem de lembrete'); await t('env-email').click(); await esp()
ok((await t('email-assunto').inputValue()).startsWith('Lembrete: '), 'lembrete por e-mail com assunto pronto'); await t('email-para').fill('beatriz@exemplo.com'); await p.getByRole('button', { name: /^Enviar e-mail|Enviar e registrar/i }).first().click().catch(() => {}); await esp(200)
await E(() => fecharTodas())
await E(() => painelEnvio(DB.envios.at(-1))); await esp(); await t('cancelar-link').click(); await esp(); await p.getByRole('button', { name: /^Cancelar link$/ }).last().click(); await esp(400)
const up = (await calls()).filter(x => /^update public\.formulario_envios set expira_em = now\(\) where id = 900 and respondido_em is null$/.test(x.inp.query || '')); ok(up.length === 1 && await E(() => DB.envios.at(-1).status) === 'cancelado', 'cancelar encerra o link também no site')
ok(await E(() => estadoEnvio(DB.envios.at(-1))) === 'cancelado' && !(await E(() => abertoEnvio(DB.envios.at(-1)))), 'estado cancelado')
ok(await E(() => sqlEnvioSite('delete from public.formulario_envios').then(() => false, e => e.code === 'recusado')) && await E(() => sqlEnvioSite("update public.formulario_envios set status = 'x'").then(() => false, e => e.code === 'recusado')) && await E(() => sqlEnvioSite("insert into public.contatos (nome) values ('x')").then(() => false, e => e.code === 'recusado')), 'escrita no site: qualquer SQL fora do molde é recusado')

/* 7. Ponte de leitura: respostas dadas no site */
await E(() => { const c = contato(6); window.__siteRows = [{ id: 31, token: 'S'.repeat(32), status: 'respondido', created_at: agora(-60 * 24 * 2), visualizado_em: agora(-60 * 24), respondido_em: agora(-60), expira_em: agora(60 * 24 * 10), formulario: 'Pré-consulta (exemplo)', telefone: c.telefone }]; window.__siteResp = [{ ordem: 0, pergunta_texto: 'Conte um pouco da sua situação', pergunta_tipo: 'texto_longo', resposta: 'Preciso do divórcio.' }] })
const n1 = await E(() => sincronizarEnviosDoSite()); const n2 = await E(() => sincronizarEnviosDoSite()); ok(n1 === 1 && n2 === 0, 'busca no site importa a resposta nova uma vez (' + n1 + '/' + n2 + ')')
const es = await E(() => DB.envios.find(x => x.origem === 'site')); ok(es && es.status === 'respondido' && es.nova && es.contato_id === 6 && es.snap[0].texto === 'Conte um pouco da sua situação' && es.respostas.site0 === 'Preciso do divórcio.', 'resposta do site entra ligada ao cliente (pelo telefone), com pergunta e resposta')
await E(i => verEnvio(DB.envios.find(x => x.origem === 'site')), 0); await esp(); ok((await t('detalhe-resposta').innerText()).includes('Preciso do divórcio.') && (await t('detalhe-resposta').innerText()).includes('CRM do site'), 'detalhe mostra a origem e a resposta')
await E(() => fecharTodas())

/* 8. Estados derivados e segurança da página */
const est = await E(() => { const base = { formulario_id: 2, contato_id: 6, token: 'T'.repeat(32), modo: 'teste' }; return [estadoEnvio({ ...base, status: 'enviado', expira_em: agora(-5) }), estadoEnvio({ ...base, status: 'parcial', expira_em: agora(60) }), estadoEnvio({ ...base, status: 'respondido', expira_em: agora(-5) }), estadoEnvio({ ...base, status: 'cancelado', expira_em: agora(60) })].join() }); ok(est === 'expirado,parcial,respondido,cancelado', 'estados: expirado, parcial, respondido e cancelado')
await E(() => { DB.envios.push({ id: 9001, formulario_id: 2, contato_id: 6, token: 'X'.repeat(32), modo: 'teste', status: 'enviado', expira_em: agora(-5), respostas: {}, created_at: agora(-9000) }); ir('publico', { token: 'X'.repeat(32) }) }); await esp(); ok((await p.locator('body').innerText()).includes('Link expirado'), 'link expirado não abre o formulário')
await E(() => ir('publico', { token: 'nao-existe' })); await esp(); ok((await p.locator('body').innerText()).includes('Link inválido'), 'token desconhecido: link inválido (sem revelar nada)')
ok(await E(() => [cnpjValido('11.222.333/0001-81'), cnpjValido('11.222.333/0001-82'), CRM.cpfValido('52998224725'), CRM.cpfValido('11111111111')].join()) === 'true,false,true,false', 'validadores de CNPJ e CPF')
await E(() => ir('formularios', { aba: 'respostas' })); await esp(); ok(await t('sincronizar-form-site').count() === 1, 'botão de busca no site disponível')
ok(erros.length === 0, 'sem erros: ' + erros.slice(0, 3).join(' | '))
await b.close(); console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK'); process.exit(falhas ? 1 : 0)
