// Testa as Edge Functions do WhatsApp (handlers reais, supabase-js real) contra um PostgREST falso em memória e uma "Meta" falsa.
// Rodar: node --experimental-strip-types tests/whatsapp/funcoes.test.mjs
import { createHmac } from 'node:crypto'
import { createClient } from '/home/user/pasta/node_modules/@supabase/supabase-js/dist/index.mjs'
import { DB, criar, servidor } from '../formulario-link/fake-supabase.mjs'
import { receberWebhook, enviarSaida } from '../../supabase/functions/_shared/handlers.ts'
import { corpoDeEnvio, extrairEventos } from '../../supabase/functions/_shared/whatsapp.ts'

let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const PORTA = 4020; const fake = await servidor(PORTA)
const db = createClient(`http://localhost:${PORTA}`, 'chave', { auth: { persistSession: false } })
const SEG = 'segredo-do-app', env = vars => ({ get: k => vars[k] })
const AMB = env({ WHATSAPP_VERIFY_TOKEN: 'verifica123', WHATSAPP_APP_SECRET: SEG, WHATSAPP_TOKEN: 'tok', WHATSAPP_PHONE_NUMBER_ID: '111222', WHATSAPP_WABA_ID: '999' })
const seed = () => ({ profiles: [{ id: 'u1', role: 'equipe' }, { id: 'u2', role: 'user' }], contatos: [{ id: 1, nome: 'Beatriz Cardoso', telefone: '5571999990001' }], casos: [{ id: 5, contato_id: 1, titulo: 'Divórcio' }], mensagens_whatsapp: [], whatsapp_saida: [], whatsapp_templates: [], notifications: [], escritorio: [] })
criar(seed())
const assinar = corpo => 'sha256=' + createHmac('sha256', SEG).update(corpo).digest('hex')
const post = (payload, { assinatura } = {}) => { const corpo = JSON.stringify(payload); return receberWebhook(new Request('http://x/whatsapp-webhook', { method: 'POST', body: corpo, headers: { 'x-hub-signature-256': assinatura === undefined ? assinar(corpo) : assinatura } }), db, AMB) }
const valor = v => ({ object: 'whatsapp_business_account', entry: [{ id: 'W', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '111222' }, ...v } }] }] })
const msg = (id, from, texto, extra = {}) => valor({ contacts: [{ wa_id: from, profile: { name: 'Maria Nova' } }], messages: [{ from, id, timestamp: '1790000000', type: 'text', text: { body: texto }, ...extra }] })

/* verificação */
const v1 = await receberWebhook(new Request('http://x/?hub.mode=subscribe&hub.verify_token=verifica123&hub.challenge=abc'), db, AMB); ok(v1.status === 200 && await v1.text() === 'abc', 'GET: verificação da Meta devolve o desafio')
ok((await receberWebhook(new Request('http://x/?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=abc'), db, AMB)).status === 403, 'GET: token errado é recusado')
ok((await receberWebhook(new Request('http://x/?hub.mode=subscribe&hub.verify_token=&hub.challenge=abc'), db, env({}))).status === 403, 'GET: sem token configurado, recusa')

/* assinatura */
ok((await post(msg('wamid.A', '5571999990001', 'oi'), { assinatura: 'sha256=00' })).status === 401 && DB.mensagens_whatsapp.length === 0, 'POST: assinatura inválida é recusada e nada é gravado')
ok((await post(msg('wamid.A', '5571999990001', 'oi'), { assinatura: null })).status === 401, 'POST: sem assinatura é recusado')
ok((await receberWebhook(new Request('http://x', { method: 'POST', body: '{}', headers: { 'x-hub-signature-256': assinar('{}') } }), db, env({}))).status === 401, 'POST: sem App Secret configurado, recusa tudo')
ok(JSON.parse(DB.escritorio.at(-1).valor).ok === false, 'diagnóstico registra a falha de assinatura')

/* mensagens */
ok((await post(msg('wamid.A', '5571999990001', 'Bom dia, doutora!'))).status === 200, 'POST: mensagem válida aceita')
const m1 = DB.mensagens_whatsapp[0]; ok(m1.contato_id === 1 && m1.direcao === 'entrada' && m1.autor === 'cliente' && m1.conteudo === 'Bom dia, doutora!' && m1.status === 'recebida', 'mensagem vinculada à pessoa pelo telefone')
ok(DB.contatos.length === 1, 'não cria pessoa duplicada quando o número já existe')
ok(DB.notifications.length === 1 && DB.notifications[0].user_id === 'u1', 'equipe é notificada (e só a equipe)')
await post(msg('wamid.A', '5571999990001', 'Bom dia, doutora!')); ok(DB.mensagens_whatsapp.length === 1, 'reentrega da Meta não duplica (wa_message_id único)')
await post(msg('wamid.B', '71988887777', 'Quero uma consulta')); const novo = DB.contatos.find(c => c.telefone === '5571988887777')
ok(novo && novo.nome === 'Maria Nova' && novo.etapa === 'novo' && DB.mensagens_whatsapp.at(-1).contato_id === novo.id, 'número desconhecido vira lead novo (uma vez) e a mensagem fica ligada a ele')
await post(msg('wamid.C', '5571988887777', 'Segunda mensagem')); ok(DB.contatos.filter(c => c.telefone === '5571988887777').length === 1, 'segunda mensagem do mesmo número não duplica a pessoa')
await post(msg('wamid.D', '5571999990001', '', { type: 'image', image: { id: 'M1', mime_type: 'image/jpeg', caption: 'minha certidão' } })); ok(/imagem.*minha certidão/.test(DB.mensagens_whatsapp.at(-1).conteudo) && DB.mensagens_whatsapp.at(-1).metadata?.midia_pendente, 'mídia: registra a mensagem e sinaliza que o arquivo não foi baixado')

/* status */
const st = (id, status, extra = {}) => valor({ statuses: [{ id, status, timestamp: '1790000100', recipient_id: '5571999990001', ...extra }] })
DB.mensagens_whatsapp.push({ id: 900, contato_id: 1, direcao: 'saida', autor: 'equipe', conteudo: 'oi', wa_message_id: 'wamid.OUT', status: 'enviada' })
await post(st('wamid.OUT', 'delivered')); ok(DB.mensagens_whatsapp.find(m => m.id === 900).status === 'entregue', 'status: entregue')
await post(st('wamid.OUT', 'read')); ok(DB.mensagens_whatsapp.find(m => m.id === 900).status === 'lida', 'status: lida')
await post(st('wamid.OUT', 'delivered')); ok(DB.mensagens_whatsapp.find(m => m.id === 900).status === 'lida', 'status atrasado não faz a mensagem "regredir"')
DB.mensagens_whatsapp.push({ id: 901, contato_id: 1, direcao: 'saida', autor: 'equipe', conteudo: 'x', wa_message_id: 'wamid.F', status: 'enviada' })
await post(st('wamid.F', 'failed', { errors: [{ code: 131026, title: 'Message undeliverable' }] })); const f = DB.mensagens_whatsapp.find(m => m.id === 901); ok(f.status === 'falhou' && /não tem WhatsApp/.test(f.erro), 'status: falhou com explicação em português')

/* ecos (coexistência) */
const eco = (id, to, texto) => ({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'smb_message_echoes', value: { message_echoes: [{ from: '5571000000000', to, id, timestamp: '1790000200', type: 'text', text: { body: texto } }] } }] }] })
await post(eco('wamid.E1', '5571999990001', 'Respondi pelo celular')); const e1 = DB.mensagens_whatsapp.at(-1); ok(e1.direcao === 'saida' && e1.conteudo === 'Respondi pelo celular' && e1.metadata.origem === 'app_celular', 'coexistência: o que foi digitado no celular entra na conversa')
const antes = DB.mensagens_whatsapp.length; await post(eco('wamid.E2', '5571911112222', 'conversa pessoal')); ok(DB.mensagens_whatsapp.length === antes, 'coexistência: conversa de quem não é contato não entra no CRM')

/* envio */
let chamadas = []; let seqMeta = 0; const metaOk = async (url, init) => { chamadas.push({ url, init }); seqMeta++; return new Response(JSON.stringify({ messages: [{ id: 'wamid.SENT' + seqMeta }] }), { status: 200 }) }
const meta131047 = async () => new Response(JSON.stringify({ error: { code: 131047, message: 'Re-engagement message' } }), { status: 400 })
const enfileira = (o = {}) => { const id = 100 + DB.whatsapp_saida.length; DB.whatsapp_saida.push({ id, created_at: new Date().toISOString(), contato_id: 1, caso_id: 5, telefone: '5571999990001', tipo: 'texto', texto: 'Olá, Beatriz!', status: 'pendente', tentativas: 0, ...o }); return id }
const envia = (id, f, amb = AMB) => enviarSaida(new Request('http://x', { method: 'POST', body: JSON.stringify({ id }) }), db, amb, f)
const id1 = enfileira(); const r1 = await (await envia(id1, metaOk)).json()
const s1 = DB.whatsapp_saida.find(x => x.id === id1); ok(r1.resultado === 'ok' && s1.status === 'enviada' && s1.wa_message_id === 'wamid.SENT1', 'envio: Meta aceitou → fila "enviada" com o ID da mensagem')
ok(chamadas[0].url === 'https://graph.facebook.com/v25.0/111222/messages' && chamadas[0].init.headers.Authorization === 'Bearer tok' && JSON.parse(chamadas[0].init.body).to === '5571999990001' && JSON.parse(chamadas[0].init.body).text.body === 'Olá, Beatriz!', 'envio: chamada à Graph API correta, token só no servidor')
const mo = DB.mensagens_whatsapp.at(-1); ok(mo.direcao === 'saida' && mo.wa_message_id === 'wamid.SENT1' && mo.caso_id === 5 && mo.status === 'enviada', 'envio: só depois do aceite a mensagem entra na conversa, ligada à demanda')
const n = chamadas.length; await envia(id1, metaOk); ok(chamadas.length === n, 'envio: item já processado não é enviado de novo')
const id2 = enfileira(); const antesM = DB.mensagens_whatsapp.length; await envia(id2, meta131047); const s2 = DB.whatsapp_saida.find(x => x.id === id2)
ok(s2.status === 'falhou' && /24h/.test(s2.erro) && DB.mensagens_whatsapp.length === antesM, 'envio: erro da Meta → "falhou" com motivo claro e NADA marcado como enviado')
const id3 = enfileira(); await envia(id3, metaOk, env({ WHATSAPP_PHONE_NUMBER_ID: '1' })); ok(DB.whatsapp_saida.find(x => x.id === id3).status === 'falhou' && /WHATSAPP_TOKEN/.test(DB.whatsapp_saida.find(x => x.id === id3).erro), 'envio: sem token configurado → falha dizendo exatamente qual segredo falta')
const id4 = enfileira({ tipo: 'template', texto: null, template_nome: 'lembrete_consulta', template_idioma: 'pt_BR', template_params: ['Beatriz', '10/10'] }); chamadas = []; await envia(id4, metaOk)
const c4 = JSON.parse(chamadas[0].init.body); ok(c4.type === 'template' && c4.template.name === 'lembrete_consulta' && c4.template.language.code === 'pt_BR' && c4.template.components[0].parameters.map(p => p.text).join() === 'Beatriz,10/10', 'template: payload no formato da Meta')
ok(DB.mensagens_whatsapp.at(-1).tipo === 'template' && DB.mensagens_whatsapp.at(-1).template_nome === 'lembrete_consulta', 'template: registrado na conversa')
const id5 = enfileira({ tipo: 'sincronizar_templates', texto: null, telefone: '0' }); const metaT = async () => new Response(JSON.stringify({ data: [{ name: 'lembrete_consulta', language: 'pt_BR', status: 'APPROVED', category: 'UTILITY', components: [{ type: 'BODY', text: 'Olá {{1}}' }] }] }), { status: 200 })
await envia(id5, metaT); ok(DB.whatsapp_templates.length === 1 && DB.whatsapp_templates[0].status === 'APPROVED' && DB.whatsapp_saida.find(x => x.id === id5).status === 'enviada', 'templates: sincronizados da Meta (não são escritos à mão)')

/* varredura */
const idOld = enfileira({ created_at: new Date(Date.now() - 120000).toISOString() }); const idNew = enfileira(); const idPreso = enfileira({ status: 'enviando', created_at: new Date(Date.now() - 300000).toISOString() }); chamadas = []
const rv = await (await enviarSaida(new Request('http://x', { method: 'POST', body: JSON.stringify({ varrer: true }) }), db, AMB, metaOk)).json()
ok(DB.whatsapp_saida.find(x => x.id === idOld).status === 'enviada' && DB.whatsapp_saida.find(x => x.id === idNew).status === 'pendente', 'varredura: reprocessa pendente antigo e não mexe no recém-criado')
ok(DB.whatsapp_saida.find(x => x.id === idPreso).status === 'falhou' && /incerto/.test(DB.whatsapp_saida.find(x => x.id === idPreso).erro) && chamadas.length === 1, 'varredura: item preso em "enviando" vira "incerto" e NÃO é reenviado (evita mensagem duplicada)')
ok((await enviarSaida(new Request('http://x', { method: 'POST', body: JSON.stringify({ id: 'abc' }) }), db, AMB, metaOk)).status === 400 && (await enviarSaida(new Request('http://x'), db, AMB, metaOk)).status === 405, 'entrada inválida é recusada')
try { corpoDeEnvio({ tipo: 'texto', telefone: '1', texto: '  ' }); ok(false, 'mensagem vazia') } catch { ok(true, 'mensagem vazia não é enviada') }
ok(extrairEventos({ entry: [{ changes: [{ value: { statuses: [{ id: 'x', status: 'deleted' }] } }] }] }).status.length === 0, 'eventos desconhecidos são ignorados')
fake.close(); console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK'); process.exit(falhas ? 1 : 0)
