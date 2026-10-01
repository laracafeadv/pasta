// Testa a API pública do formulário (handler real + supabase-js real + PostgREST falso).
// Rodar: node --experimental-strip-types --no-warnings tests/whatsapp/formulario.test.mjs
import { createClient } from '/home/user/pasta/node_modules/@supabase/supabase-js/dist/index.mjs'
import { DB, criar, servidor } from '../formulario-link/fake-supabase.mjs'
import { formularioPublico } from '../../supabase/functions/_shared/handlers.ts'
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const PORTA = 4021; const fake = await servidor(PORTA); const db = createClient(`http://localhost:${PORTA}`, 'k', { auth: { persistSession: false } })
const P = (id, texto, tipo, x = {}) => ({ pergunta_id: id, texto, tipo, opcoes: [], ajuda: null, obrigatoria: false, mostrar_se: null, ...x })
const estrutura = { nome: 'Meu formulário', descricao: 'd', instrucoes: 'Leia', finalidade: 'Atendimento', mensagem_final: 'Obrigada!', secoes: [{ titulo: 'Parte 1', mostrar_se: null, itens: [
  P('p1', 'Nome do cônjuge', 'texto_curto', { obrigatoria: true }), P('p2', 'Tem filhos?', 'sim_nao', { obrigatoria: true }), P('p3', 'Quantos?', 'numero', { obrigatoria: true, mostrar_se: { juntar: 'e', regras: [{ pergunta_id: 'p2', operador: 'igual', valor: 'Sim' }] } }),
  P('p4', 'CPF', 'cpf_cnpj'), P('p5', 'Endereço', 'endereco'), P('p6', 'Horário', 'horario'), P('p7', 'Regime', 'lista_suspensa', { opcoes: ['A', 'B'] }), P('p8', 'Assinatura', 'assinatura'), P('p9', 'Mapa', 'arquivo')] }] }
const TOK = 'T'.repeat(32)
const seed = () => ({ profiles: [{ id: 'u1', role: 'equipe' }], contatos: [{ id: 1, nome: 'Beatriz Cardoso', telefone: '5571999990001' }], casos: [{ id: 5, contato_id: 1, titulo: 'Divórcio' }], escritorio: [{ chave: 'advogada_nome', valor: 'Lara Café' }],
  formulario_envios: [{ id: 1, contato_id: 1, caso_id: 5, token: TOK, status: 'gerado', expira_em: new Date(Date.now() + 864e5).toISOString(), respondido_em: null, prazo_resposta: '2031-01-01', versao_formulario: 4, estrutura }], formulario_envio_respostas: [], atividades: [], notifications: [] })
criar(seed())
const get = t => formularioPublico(new Request(`http://x/?t=${t}`), db); const post = (b, q = '') => formularioPublico(new Request(`http://x/${q}`, { method: 'POST', body: JSON.stringify(b) }), db)
const base = { p1: 'João', p2: 'Sim', p3: '2' }

const g = await get(TOK); const gj = await g.json()
ok(g.status === 200 && gj.primeiroNome === 'Beatriz' && gj.advogada === 'Dra. Lara Café' && gj.formulario.nome === 'Meu formulário' && gj.secoes[0].itens.length === 9, 'GET: devolve só o formulário daquele link (nome, instruções, perguntas)')
ok(!/telefone|5571999990001|contato_id|caso_id/.test(JSON.stringify(gj)), 'GET: não vaza dados internos')
ok(DB.formulario_envios[0].status === 'visualizado' && DB.formulario_envios[0].visualizado_em, 'GET: marca "aberto" (visualizado)')
ok(g.headers.get('access-control-allow-origin') === '*' && (await formularioPublico(new Request('http://x', { method: 'OPTIONS' }), db)).status === 204, 'CORS liberado para a página estática')
ok((await get('curto')).status === 404 && (await get('x'.repeat(32))).status === 404, 'link inexistente / fora do formato: 404 com a mesma mensagem')
ok((await post({ t: TOK }, '?acao=iniciar')).status === 200 && DB.formulario_envios[0].status === 'iniciado', 'iniciar: marca "iniciado"')
ok((await post({ t: TOK, respostas: base })).status === 400, 'sem aceitar a privacidade: recusa')
ok((await (await post({ t: TOK, respostas: { ...base, p1: '' }, consentimento: true })).json()).erro.includes('obrigatória'), 'obrigatória vazia: recusa')
ok((await (await post({ t: TOK, respostas: { ...base, p4: '111.111.111-11' }, consentimento: true })).json()).erro.includes('CPF'), 'CPF inválido: recusa')
ok((await (await post({ t: TOK, respostas: { ...base, p5: { cep: '40000', logradouro: 'Rua A', cidade: 'Salvador', uf: 'BA' } }, consentimento: true })).json()).erro.includes('CEP'), 'CEP inválido: recusa')
ok((await post({ t: TOK, respostas: { ...base, p7: 'Z' }, consentimento: true })).status === 400 && (await post({ t: TOK, respostas: { ...base, p6: '25:00' }, consentimento: true })).status === 400, 'opção/horário inválidos: recusa')
ok(DB.formulario_envio_respostas.length === 0 && DB.formulario_envios[0].status === 'iniciado', 'tentativas inválidas não gravam nada')
const r = await post({ t: TOK, respostas: { ...base, p4: '529.982.247-25', p5: { cep: '41810-000', logradouro: 'Rua A', numero: '1', cidade: 'Salvador', uf: 'BA' }, p6: '14:30', p7: 'B', p8: 'data:image/png;base64,iVBORw0KGgo=', p9: 'x' }, consentimento: true, respondente: 'Beatriz' })
ok(r.status === 200 && (await r.json()).mensagem === 'Obrigada!', 'envio válido aceito, com a mensagem final')
const e = DB.formulario_envios[0]; ok(e.status === 'respondido' && e.respondido_em && e.consentimento_em && e.respondente === 'Beatriz', 'envio: respondido com data, consentimento e respondente')
const rs = DB.formulario_envio_respostas
ok(rs.length === 8 && rs.every(x => x.envio_id === 1 && x.pergunta_versao === 4) && rs[0].pergunta_ref === 'p1' && rs[0].resposta === 'João' && rs.find(x => x.pergunta_ref === 'p5').resposta.cidade === 'Salvador', 'respostas por pergunta, com a versão enviada (tipo "arquivo" não suportado é ignorado, nada inventado)')
ok(!rs.some(x => x.pergunta_ref === 'p9'), 'tipo não suportado no link público (arquivo) não é gravado')
ok(DB.atividades.length === 1 && DB.atividades[0].caso_id === 5 && DB.notifications.length === 1 && DB.notifications[0].user_id === 'u1', 'histórico (pessoa/demanda) e notificação da equipe')
ok((await post({ t: TOK, respostas: base, consentimento: true })).status === 409 && (await (await get(TOK)).json()).respondido === true, 'segunda resposta recusada; link mostra "já respondido"')
// condicional: oculta não é obrigatória nem gravada
criar(seed()); const r2 = await post({ t: TOK, respostas: { p1: 'X', p2: 'Não', p3: '9' }, consentimento: true }); ok(r2.status === 200 && !DB.formulario_envio_respostas.some(x => x.pergunta_ref === 'p3'), 'pergunta condicional escondida é descartada')
// cancelado / expirado
criar(seed()); DB.formulario_envios[0].status = 'cancelado'; ok((await get(TOK)).status === 404, 'cancelado: 404')
criar(seed()); DB.formulario_envios[0].expira_em = new Date(Date.now() - 1000).toISOString(); ok((await get(TOK)).status === 404 && (await post({ t: TOK, respostas: base, consentimento: true })).status === 404, 'expirado: 404 (GET e POST)')
fake.close(); console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK'); process.exit(falhas ? 1 : 0)
