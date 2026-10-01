import { banco, db, zerar } from '../formularios/fake-db'
import { assinarEstado, cifrar, criarApiGoogle, decifrar, mensagemSimples, salvarConexao, tokenDeAcesso, urlAutorizacao, verificarEstado, type Api } from '../../server/utils/google'
import { caixaDeEmail, intimacoesDoGmail, lancarPrazoAviso, LIMITE_NOVOS } from '../../server/utils/secretariaEmail'
import { contarPrazo } from '../../shared/utils/calendarioForense'

;(globalThis as any).createError = (o: any) => Object.assign(new Error(o.message), o)
let falhas = 0
const ok = (c: boolean, n: string) => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}`); if (!c) falhas++ }
const lanca = async (fn: () => any, trecho?: string) => { try { await fn(); return null } catch (e: any) { return trecho ? (String(e.message).includes(trecho) ? e : null) : e } }
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url')
const U = 'u-lara', SEG = 'segredo-do-app'

// ── cifra e estado do OAuth ──
const c1 = cifrar('refresh-token-123', SEG)
ok(!c1.includes('refresh-token') && decifrar(c1, SEG) === 'refresh-token-123' && cifrar('x', SEG) !== cifrar('x', SEG), 'tokens cifrados (AES-GCM), cada cifra com IV próprio')
ok(!!(await lanca(() => decifrar(c1, 'outro-segredo'))) && !!(await lanca(() => decifrar(c1.slice(0, -4) + 'AAAA', SEG))), 'cifra com outro segredo ou adulterada não abre')
const st = assinarEstado(U, SEG, 1_000_000)
ok(verificarEstado(st, SEG, 1_000_000 + 60_000) === U, 'state válido devolve a usuária')
ok(verificarEstado(st, SEG, 1_000_000 + 11 * 60_000) === null && verificarEstado(st, 'outro', 1_000_000) === null && verificarEstado(st.replace(U, 'u-outra'), SEG, 1_000_000) === null && verificarEstado('lixo', SEG) === null, 'state expirado (10 min), com outro segredo, adulterado ou lixo é recusado')
const url = urlAutorizacao({ clientId: 'cid', clientSecret: SEG, redirectUri: 'https://crm.test/api/google/callback' }, st)
ok(/access_type=offline/.test(url) && /prompt=consent/.test(url) && /gmail\.readonly/.test(url) && /calendar\.events/.test(url) && !/gmail\.modify|gmail\.send|mail\.google\.com%2F&|auth%2Fcalendar&/.test(url) && url.includes(encodeURIComponent('https://crm.test/api/google/callback')), 'pedido ao Google: acesso contínuo, Gmail SOMENTE leitura e Agenda só para eventos')

// ── armazenamento da conexão e renovação do token ──
zerar(); db.google_conexoes = []
const fetchReal = (globalThis as any).fetch
let chamadas: any[] = []
;(globalThis as any).fetch = async (url: string, init: any) => {
  chamadas.push({ url: String(url), corpo: String(init?.body ?? '') })
  if (/invalid/.test(chamadas.at(-1).corpo) ) return { ok: false, status: 400, json: async () => ({ error: 'invalid_grant' }) }
  return { ok: true, status: 200, json: async () => ({ access_token: 'acesso-novo', expires_in: 3600 }) }
}
await salvarConexao(banco, U, { access_token: 'acesso-1', expires_in: 3600, refresh_token: 'refresh-1', scope: 'x' }, 'lara@gmail.com', SEG)
const row = db.google_conexoes[0]
ok(row.user_id === U && row.email === 'lara@gmail.com' && !JSON.stringify(row).includes('refresh-1') && !JSON.stringify(row).includes('acesso-1'), 'conexão gravada com os tokens cifrados (nada em texto puro)')
const cfg = { clientId: 'cid', clientSecret: SEG, redirectUri: 'r' }
ok((await tokenDeAcesso(banco, cfg, U)) === 'acesso-1' && chamadas.length === 0, 'token ainda válido é reaproveitado (sem ir ao Google)')
row.expira_em = new Date(Date.now() + 10_000).toISOString()
ok((await tokenDeAcesso(banco, cfg, U)) === 'acesso-novo' && /grant_type=refresh_token/.test(chamadas[0].corpo) && decifrar(db.google_conexoes[0].access_token_enc, SEG) === 'acesso-novo', 'token perto de vencer é renovado com o refresh token e guardado cifrado')
await salvarConexao(banco, U, { access_token: 'acesso-2', expires_in: 3600 }, 'lara@gmail.com', SEG)
ok(decifrar(db.google_conexoes[0].refresh_token_enc, SEG) === 'refresh-1', 'reconectar sem novo refresh token mantém o anterior')
db.google_conexoes[0].expira_em = new Date(Date.now() - 1000).toISOString(); db.google_conexoes[0].refresh_token_enc = cifrar('invalid', SEG)
const e409 = await lanca(() => tokenDeAcesso(banco, cfg, U))
ok(e409?.statusCode === 409 && e409.data?.conectar === true && db.google_conexoes.length === 0, 'refresh recusado (invalid_grant): apaga a conexão e pede para conectar de novo')
ok((await lanca(() => tokenDeAcesso(banco, cfg, U)))?.data?.conectar === true, 'sem conexão: pede para conectar')
;(globalThis as any).fetch = fetchReal

// ── mensagens da API do Gmail ──
const htmlPush = '<html><body><p>Informamos que o processo a seguir sofreu movimentação:</p><p>Número do Processo: 0000123-45.2025.8.05.0001</p><table><tr><th>Data - Movimento</th></tr><tr><td>30/09/2026 17:13 - Expedição de intimação para manifestação em 15 dias</td></tr><tr><td>30/09/2026 17:12 - Conclusos para decisão</td></tr></table></body></html>'
const gmailMsg = (id: string, from: string, subject: string, html: string, labels = ['INBOX'], ms = Date.parse('2026-09-30T20:30:35Z')) => ({ id, labelIds: labels, snippet: 'prévia', internalDate: String(ms), payload: { mimeType: 'multipart/alternative', headers: [{ name: 'From', value: from }, { name: 'Subject', value: subject }], parts: [{ mimeType: 'text/html', body: { data: b64(html) } }] } })
const ms = mensagemSimples(gmailMsg('m1', 'PJe TJBA <pje@tjba.jus.br>', '[Push] Movimentação processual do processo 0000123-45.2025.8.05.0001', htmlPush, ['INBOX', 'UNREAD']), 'thr1', 'lara@gmail.com', true)
ok(ms.sender === 'pje@tjba.jus.br' && ms.date === '2026-09-30T20:30:35.000Z' && ms.labelIds!.includes('UNREAD') && /authuser=lara%40gmail\.com#all\/thr1$/.test(ms.viewUrl!), 'mensagem do Gmail: remetente limpo, data ISO, etiquetas e link para abrir')
ok(/30\/09\/2026 17:13 - Expedição de intimação para manifestação em 15 dias\n/.test(ms.plaintextBody!) && !/<td>/.test(ms.plaintextBody!), 'corpo em HTML vira texto com uma linha por movimentação')

// ── Gmail: avisos dos tribunais com cache ──
const T = (id: string, h: string) => ({ id, historyId: h, snippet: 'x' })
const corpos: Record<string, any[]> = {
  a: [mensagemSimples(gmailMsg('a', 'pje@tjba.jus.br', '[Push] Movimentação processual do processo 0000123-45.2025.8.05.0001', htmlPush, ['INBOX', 'UNREAD']), 'a', null, true)],
  b: [mensagemSimples(gmailMsg('b', 'sso@cnj.jus.br', 'Alerta de novo acesso', 'Detectamos um acesso à PDPJ', ['INBOX', 'UNREAD']), 'b', null, true)],
  c: [mensagemSimples(gmailMsg('c', 'eproc@trf1.jus.br', 'Intimação eletrônica - processo 0000777-22.2025.4.01.3300', 'Você foi intimado', ['INBOX'], Date.parse('2026-09-29T12:00:00Z')), 'c', null, true)],
}
let cCompleto = 0, cLista: string[] = []
const fake = (over: Partial<Api> = {}): Api => ({
  async listarThreads(q) { cLista.push(q); if (/from:jus\.br/.test(q) && /is:unread/.test(q)) return [T('a', 'h1'), T('b', 'h1')]; if (/from:jus\.br/.test(q)) return [T('a', 'h1'), T('b', 'h1'), T('c', 'h1')]; return [] },
  async threadMeta() { return [] }, async threadCompleto(id) { cCompleto++; return corpos[id]! },
  async criarEvento() { return { id: 'ev1', link: 'https://cal/ev1' } }, async buscarEventos() { return [] }, async criarConsulta() { return { id: 'c', link: 'l', meet: '' } }, ...over,
})
zerar(); db.google_avisos_cache = []
let av = await intimacoesDoGmail(fake(), banco, U)
ok(av.length === 2 && !av.some(x => x.id === 'b'), 'alerta de novo acesso (sso@cnj.jus.br) é ignorado')
const a = av.find(x => x.id === 'a')!
ok(a.tribunal === 'TJBA' && a.cnj === '0000123-45.2025.8.05.0001' && a.movimentacao === 'Expedição de intimação para manifestação em 15 dias' && a.dataMov === '2026-09-30' && a.naoLida === true && a.intimacao === true && /#all\/a$/.test(a.link), 'aviso: tribunal, CNJ, movimentação, data, não lida, link')
ok(av.find(x => x.id === 'c')!.naoLida === false && av[0]!.id === 'a', 'lida × não lida (pela busca is:unread) e mais recente primeiro')
ok(cCompleto === 3 && /newer_than:14d/.test(cLista[0]!), 'leu o corpo dos 3 e-mails novos; janela de 14 dias')
cCompleto = 0; av = await intimacoesDoGmail(fake(), banco, U)
ok(cCompleto === 0 && av.length === 2, 'segunda leitura: tudo vem do cache (nenhum corpo relido)')
const f2 = fake({ async listarThreads(q) { return /is:unread/.test(q) ? [] : [T('a', 'h2'), T('b', 'h1'), T('c', 'h1')] } })
cCompleto = 0; av = await intimacoesDoGmail(f2, banco, U)
ok(cCompleto === 1 && av.find(x => x.id === 'a')!.naoLida === false, 'e-mail que mudou (historyId novo) é relido; o resto não')
const muitos = Array.from({ length: 70 }, (_, i) => T('m' + i, 'h'))
for (const t of muitos) corpos[t.id] = corpos.c!
cCompleto = 0; await intimacoesDoGmail(fake({ async listarThreads(q) { return /is:unread/.test(q) ? [] : muitos } }), banco, U)
ok(cCompleto === LIMITE_NOVOS, `no máximo ${LIMITE_NOVOS} e-mails novos lidos por atualização (o resto na próxima)`)
const falha = fake({ async threadCompleto(id) { if (id === 'c') throw new Error('boom'); return corpos[id]! } }); db.google_avisos_cache = []
av = await intimacoesDoGmail(falha, banco, U)
ok(av.some(x => x.id === 'a') && !av.some(x => x.id === 'c'), 'falha ao ler um e-mail não derruba os demais')

// ── Gmail: caixa de entrada ──
const meta: Record<string, any[]> = { p1: [{ sender: 'cliente@exemplo.com', subject: 'Documentos', snippet: 'Segue', date: '2026-09-30T18:00:00Z', viewUrl: 'u1' }], p2: [{ sender: 'a@x.com', subject: 'Antiga', date: '2026-09-25T10:00:00Z', viewUrl: 'u' }, { sender: 'a@x.com', subject: 'Re: Antiga', snippet: 'nova', date: '2026-09-30T19:00:00Z', viewUrl: 'u2' }] }
let qs: string[] = [], nMeta = 0
const fm = fake({ async listarThreads(q) { qs.push(q); if (/is:unread/.test(q) && !/^is:unread/.test(q)) return [T('p2', 'h')]; return [T('p1', 'h'), T('p2', 'h')] }, async threadMeta(id) { nMeta++; return meta[id]! } })
zerar(); db.google_avisos_cache = []
let cx = await caixaDeEmail(fm, banco, U, 'principal')
ok(qs.includes('in:inbox category:primary newer_than:7d') && cx.length === 2 && cx[0]!.id === 'p2' && cx[0]!.assunto === 'Re: Antiga' && cx[0]!.naoLida === true && cx[1]!.naoLida === false, 'Principal (7 dias): mais recente da conversa, não lido em destaque')
nMeta = 0; await caixaDeEmail(fm, banco, U, 'principal'); ok(nMeta === 0, 'e-mail sem mudança não é buscado de novo (cache)')
qs = []; cx = await caixaDeEmail(fm, banco, U, 'naolidos')
ok(qs[0] === 'is:unread newer_than:14d' && cx.every(x => x.naoLida), 'Não lidos (14 dias): todos marcados como não lidos')
qs = []; await caixaDeEmail(fm, banco, U, 'tudo'); ok(qs[0] === 'in:inbox newer_than:3d', 'Tudo (3 dias)')

// ── lançar prazo ──
const preparar = () => { zerar(); db.google_avisos_cache = [{ user_id: U, thread_id: 'a', versao: 'h1', dados: { tribunal: 'TJBA', chave: 'tjba', cnj: '0000123-45.2025.8.05.0001', movimentacao: 'Expedição de intimação para manifestação em 15 dias', dataMov: '2026-09-30', dataEmail: '2026-09-30', intimacao: true, quando: '2026-09-30T20:30:35Z', link: 'https://mail/a' } }]; for (const t of ['avisos_prazos', 'secretaria_itens', 'lembretes_rapidos', 'secretaria_config', 'suspensoes_expediente']) db[t] = [] }
preparar()
let evento: any = null
const fa = fake({ async criarEvento(e) { evento = e; return { id: 'ev9', link: 'https://cal/ev9' } } })
const r = await lancarPrazoAviso(fa, banco, banco, U, 'a', { dias: 15, modo: 'uteis', ciencia: '2026-09-30', tribunal: 'tjba' })
const esperado = contarPrazo('2026-09-30', 15, { trib: 'tjba', ssa: true, fac: false }, 'uteis').vencimento
ok(r.vence === esperado && esperado === '2026-10-22', 'vencimento calculado no servidor: 15 dias úteis de 30/09/2026 = 22/10')
ok(evento.dia === '2026-10-22' && JSON.stringify(evento.avisos) === '[4320,1440]' && /^PRAZO FATAL — 0000123-45\.2025\.8\.05\.0001/.test(evento.titulo) && /15 dias úteis/.test(evento.descricao) && /https:\/\/mail\/a/.test(evento.descricao), 'evento no Google Agenda: vencimento, avisos de 3 dias e 1 dia, título com o CNJ, link do e-mail')
ok(db.secretaria_itens.length === 1 && db.secretaria_itens[0].tipo === 'prazo' && db.secretaria_itens[0].dia === '2026-10-22' && db.secretaria_itens[0].dias_prazo === 15 && db.secretaria_itens[0].data_intimacao === '2026-09-30', 'prazo criado na agenda da Secretária')
ok(db.lembretes_rapidos.length === 1 && db.lembretes_rapidos[0].data === '2026-10-22' && /^Prazo: 0000123/.test(db.lembretes_rapidos[0].texto) && db.lembretes_rapidos[0].item_id === db.secretaria_itens[0].id, 'lembrete criado e ligado ao prazo')
const m = db.avisos_prazos[0]
ok(m.thread_id === 'a' && m.prazo === '2026-10-22' && m.modo === 'uteis' && m.evento_link === 'https://cal/ev9' && m.tribunal === 'tjba', 'aviso marcado como "Prazo lançado" com a data e o evento')
ok(!!(await lanca(() => lancarPrazoAviso(fa, banco, banco, U, 'a', { dias: 15, modo: 'uteis', ciencia: '2026-09-30', tribunal: 'tjba' }), 'já foi lançado')) && db.secretaria_itens.length === 1, 'não lança duas vezes o mesmo aviso')
preparar(); db.secretaria_config = [{ user_id: U, tribunal: 'tjba', pontos_facultativos: false, cidade: 'Salvador', atalhos: [] }]; db.suspensoes_expediente = [{ id: 1, de: '2026-10-05', ate: '2026-10-05', tribunal: 'todos', motivo: 'x' }]
const rc = await lancarPrazoAviso(fa, banco, banco, U, 'a', { dias: 15, modo: 'corridos', ciencia: '2026-09-30', tribunal: 'trt5' })
ok(rc.vence === contarPrazo('2026-09-30', 15, { trib: 'trt5', ssa: true, fac: false, susp: [{ de: '2026-10-05', ate: '2026-10-05', trib: 'todos' }] }, 'corridos').vencimento && /corridos/.test(db.secretaria_itens[0].obs), 'dias corridos, calendário do TRT5 e suspensões anotadas valem')
preparar(); let chamou = 0
const fr = fake({ async criarEvento() { chamou++; throw Object.assign(new Error('Faltou uma permissão do Google'), { statusCode: 403 }) } })
ok(!!(await lanca(() => lancarPrazoAviso(fr, banco, banco, U, 'a', { dias: 15, modo: 'uteis', ciencia: '2026-09-30', tribunal: 'tjba' }), 'permissão')) && chamou === 1 && db.secretaria_itens.length === 0 && db.lembretes_rapidos.length === 0 && db.avisos_prazos.length === 0, 'se o evento falhar, NADA é gravado nem marcado como lançado')
preparar(); const clienteQuebrado = { from: (t: string) => t === 'avisos_prazos' ? { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }), insert: () => ({ then: (r: any) => r({ data: null, error: { message: 'x' } }) }) } : banco.from(t) }
const eq = await lanca(() => lancarPrazoAviso(fa, banco, clienteQuebrado, U, 'a', { dias: 15, modo: 'uteis', ciencia: '2026-09-30', tribunal: 'tjba' }), 'Não lance de novo')
ok(eq?.statusCode === 500, 'evento criado mas falha ao gravar: mensagem manda NÃO lançar de novo')
preparar()
ok(!!(await lanca(() => lancarPrazoAviso(fa, banco, banco, U, 'a', { dias: 0, modo: 'uteis', ciencia: '2026-09-30', tribunal: 'tjba' }), 'dias')) && !!(await lanca(() => lancarPrazoAviso(fa, banco, banco, U, 'a', { dias: 5, modo: 'x', ciencia: '2026-09-30', tribunal: 'tjba' }), 'úteis ou corridos')) && !!(await lanca(() => lancarPrazoAviso(fa, banco, banco, U, 'a', { dias: 5, modo: 'uteis', ciencia: '30/09', tribunal: 'tjba' }), 'ciência')) && !!(await lanca(() => lancarPrazoAviso(fa, banco, banco, U, 'a', { dias: 5, modo: 'uteis', ciencia: '2026-09-30', tribunal: 'stj' }), 'calendário')) && !!(await lanca(() => lancarPrazoAviso(fa, banco, banco, U, 'zzz', { dias: 5, modo: 'uteis', ciencia: '2026-09-30', tribunal: 'tjba' }), 'Não encontrei')), 'dados inválidos e aviso inexistente são recusados')

// ── API real do Google (corpo das chamadas) com fetch simulado ──
const reqs: any[] = []
;(globalThis as any).fetch = async (url: string, init: any) => { reqs.push({ url: String(url), init }); return { ok: true, status: 200, json: async () => ({ id: 'e1', htmlLink: 'https://cal/e1', threads: [{ id: 't', historyId: '9', snippet: 's' }] }) } }
const real = criarApiGoogle('TOKEN', 'lara@gmail.com')
await real.listarThreads('from:jus.br newer_than:14d', 10)
ok(reqs[0].url.startsWith('https://gmail.googleapis.com/gmail/v1/users/me/threads?') && reqs[0].url.includes('q=from%3Ajus.br+newer_than%3A14d') && reqs[0].init.headers.authorization === 'Bearer TOKEN' && !reqs[0].init.method, 'lista de conversas: endpoint do Gmail, só leitura (GET), busca correta')
const ev = await real.criarEvento({ titulo: 'PRAZO FATAL — x', dia: '2026-10-22', descricao: 'd', avisos: [4320, 1440] })
const corpoEv = JSON.parse(reqs[1].init.body)
ok(reqs[1].url === 'https://www.googleapis.com/calendar/v3/calendars/primary/events' && reqs[1].init.method === 'POST' && corpoEv.start.date === '2026-10-22' && corpoEv.end.date === '2026-10-23' && corpoEv.colorId === '11' && corpoEv.reminders.useDefault === false && JSON.stringify(corpoEv.reminders.overrides) === '[{"method":"popup","minutes":4320},{"method":"popup","minutes":1440}]' && ev.link === 'https://cal/e1', 'evento do Google Agenda: dia todo, vermelho, lembretes 3 dias e 1 dia antes')
// agenda: buscar eventos e criar consulta
;(globalThis as any).fetch = async (url: string, init: any) => { reqs.push({ url: String(url), init }); return { ok: true, status: 200, json: async () => ({ id: 'c1', htmlLink: 'https://cal/c1', hangoutLink: 'https://meet/x', items: [{ status: 'confirmed', summary: 'CONSULTA — Maria', description: 'd', htmlLink: 'https://cal/m', start: { dateTime: '2026-10-05T13:00:00Z' } }, { status: 'cancelled', summary: 'x', start: { date: '2026-10-06' } }, { status: 'confirmed', summary: 'Dia todo', start: { date: '2026-10-07' } }] }) } }
const evs = await real.buscarEventos('Maria', '2026-09-30', '2027-01-28')
const uEv = new URL(reqs.at(-1).url)
ok(uEv.pathname === '/calendar/v3/calendars/primary/events' && uEv.searchParams.get('q') === 'Maria' && uEv.searchParams.get('timeMin') === '2026-09-30T00:00:00-03:00' && uEv.searchParams.get('singleEvents') === 'true' && evs.length === 2 && evs[0]!.dia === '2026-10-05' && evs[0]!.hora === '10:00' && evs[1]!.dia === '2026-10-07' && evs[1]!.hora === '', 'buscar eventos: consulta pelo nome, horário da Bahia, cancelados fora, dia inteiro sem hora')
const cn = await real.criarConsulta({ titulo: 'CONSULTA — Maria', dia: '2026-10-05', hora: '14:30', duracaoMin: 90, online: true, local: 'On-line', descricao: 'd', avisos: [1440, 60] })
const cb = JSON.parse(reqs.at(-1).init.body)
ok(reqs.at(-1).url.includes('conferenceDataVersion=1') && cb.start.dateTime === '2026-10-05T14:30:00-03:00' && cb.end.dateTime === '2026-10-05T16:00:00-03:00' && cb.colorId === '5' && JSON.stringify(cb.reminders.overrides.map((r: any) => r.minutes)) === '[1440,60]' && cb.conferenceData.createRequest.conferenceSolutionKey.type === 'hangoutsMeet' && cn.meet === 'https://meet/x', 'criar consulta: horário da Bahia, 90 min, lembretes 1 dia e 1 hora antes, Google Meet quando on-line')
await real.criarConsulta({ titulo: 't', dia: '2026-10-05', hora: '09:00', duracaoMin: 60, online: false, local: 'Presencial', descricao: 'd', avisos: [1440, 60] })
ok(reqs.at(-1).url.includes('conferenceDataVersion=0') && !('conferenceData' in JSON.parse(reqs.at(-1).init.body)), 'consulta presencial não pede Meet')
;(globalThis as any).fetch = async () => ({ ok: false, status: 403, json: async () => ({ error: { message: 'Request had insufficient authentication scopes.' } }) })
ok(!!(await lanca(() => real.listarThreads('x', 5), 'Faltou uma permissão')), 'permissão faltando no Google vira mensagem clara')
;(globalThis as any).fetch = fetchReal
console.log(falhas ? falhas + ' FALHA(S)' : 'Todos os testes passaram'); process.exit(falhas ? 1 : 0)
