'use strict'
/* ============ INTIMAÇÕES / PUBLICAÇÕES: entrada real, vínculo seguro, prazo só com confirmação ============
   O que o Artifact FAZ de verdade: ler o seu Gmail (conector, como você), reconhecer o número CNJ, ligar ao processo cadastrado,
   guardar texto/datas/histórico e sugerir prazo com a calculadora forense, SEMPRE para você conferir.
   O que o Artifact NÃO faz: receber PUSH. Ele só roda com o CRM aberto: não há como o tribunal "empurrar" nada para cá.
   A API oficial do CNJ (DJEN) bloqueia acesso de fora do Brasil (testado: 403 a partir do Supabase); sem servidor no Brasil não há como chamá-la.
   Regras de segurança: nenhuma intimação é inventada; sem número CNJ válido (ou remetente que você marcou como confiável) o e-mail é ignorado;
   dúvida no vínculo → “não vinculada”; dúvida no prazo → “revisar”; o CRM nunca cria prazo sozinho. */
const INT_CFG = () => (CONFIG.intim = { remetentes: '', palavras: '', dias: 14, ultima_busca: null, ...(CONFIG.intim || {}) })
const CNJ_RE = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g
const CNJ_PURO_RE = /(?<![\d.-])\d{20}(?![\d])/g
const normCnj = s => String(s || '').replace(/\D/g, '')
const TRIB_CNJ = { '8.05': ['tjba', 'TJBA'], '5.05': ['trt5', 'TRT5'], '4.01': ['jf', 'Justiça Federal (TRF1)'] }
const tribunalDoCnj = cnj => { const m = String(cnj || '').match(/\.(\d)\.(\d{2})\.\d{4}$/); return m ? TRIB_CNJ[m[1] + '.' + m[2]] || null : null }

/* ---------- leitura do texto de uma publicação ---------- */
const dataBR = (d, m, a) => `${a}-${m}-${d}`
function datasDoTexto(t) {
  const pega = re => { const m = String(t).match(re); return m ? dataBR(m[1], m[2], m[3]) : null }
  return { disponibilizacao: pega(/disponibiliza[^\d]{0,60}(\d{2})\/(\d{2})\/(\d{4})/i), publicacao: pega(/publica[^\d]{0,60}(\d{2})\/(\d{2})\/(\d{4})/i) }
}
const PRAZO_RES = [
  /\bprazo\s+(?:legal\s+|comum\s+|sucessivo\s+|[uú]nico\s+)?de\s+(\d{1,3})\s*(?:\([^)]{0,40}\)\s*)?dias?(?:\s+(?:[uú]teis|corridos))?/gi,
  /\b(?:em|no\s+prazo\s+de|por)\s+(\d{1,3})\s*(?:\([^)]{0,40}\)\s*)?dias?(?:\s+(?:[uú]teis|corridos))?/gi,
  /\b(\d{1,3})\s*(?:\([^)]{0,40}\)\s*)?dias?\s+(?:[uú]teis|corridos)/gi,
]
function prazosCitados(t) {
  const out = new Map()
  for (const re of PRAZO_RES) { re.lastIndex = 0; let m; while ((m = re.exec(t))) { const dias = Number(m[1]); if (!(dias >= 1 && dias <= 365)) continue; const modo = /corridos/i.test(m[0]) ? 'corridos' : /[uú]teis/i.test(m[0]) ? 'uteis' : null; const k = dias + '|' + (modo || ''); if (!out.has(k)) out.set(k, { dias, modo, trecho: corta(t.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40), 160) }) } }
  // “15 dias” e “15 dias úteis” são o mesmo prazo: fica a versão mais informativa
  const lista = [...out.values()]; return lista.filter(x => x.modo || !lista.some(y => y.modo && y.dias === x.dias))
}
function proximoDiaUtil(iso, trib) { let d = iso, n = 0; do { d = somarDias(d, 1); n++ } while (CRM.motivoNaoUtil(d, { trib, ssa: true, fac: false }) && n < 15); return d }
/* sugere uma data SÓ quando o texto traz um único prazo, diz se é útil/corrido e traz uma data de publicação/disponibilização */
function analisarPrazo(texto, datas, cnj) {
  const c = prazosCitados(texto); const tribInfo = tribunalDoCnj(cnj); const trib = tribInfo ? tribInfo[0] : 'tjba'
  if (!c.length) return { estado: 'nenhum', candidatos: [] }
  const base = { candidatos: c, tribunal: trib, tribunal_certo: !!tribInfo }
  if (c.length > 1) return { ...base, estado: 'revisar', motivo: 'O texto cita mais de um prazo: ' + c.map(x => x.dias + ' dias' + (x.modo ? ' ' + (x.modo === 'uteis' ? 'úteis' : 'corridos') : '')).join(', ') + '. Leia o texto e escolha o certo.' }
  const p = c[0]
  if (!p.modo) return { ...base, estado: 'revisar', dias: p.dias, motivo: `Cita ${p.dias} dias, mas não diz se são úteis ou corridos. Confira a regra aplicável e use a calculadora.` }
  const pub = datas.publicacao || (datas.disponibilizacao ? proximoDiaUtil(datas.disponibilizacao, trib) : null)
  if (!pub) return { ...base, estado: 'revisar', dias: p.dias, modo: p.modo, motivo: `Cita ${p.dias} dias ${p.modo === 'uteis' ? 'úteis' : 'corridos'}, mas o texto não traz a data de disponibilização/publicação: informe a data na calculadora.` }
  const r = calcularPrazoCpc(pub, p.dias, trib, p.modo)
  return { ...base, estado: 'sugerido', dias: p.dias, modo: p.modo, publicacao_considerada: pub, sugerida_em: r.vencimento, motivo: `${p.dias} dias ${p.modo === 'uteis' ? 'úteis' : 'corridos'} contados da publicação (${dataLonga(pub)})` + (datas.publicacao ? '' : ', considerada o primeiro dia útil após a disponibilização (CPC, art. 224, §2º)') + (tribInfo ? '' : '. O tribunal não foi identificado pelo número: calculei com o calendário do TJBA, confira') + '. Conferência obrigatória: feriados e suspensões do tribunal.' }
}

/* ---------- uma mensagem de e-mail → zero, uma ou várias intimações ---------- */
const TIPO_DEFAULT = 'Outro'
const dominioDe = s => { const e = emailDe(s); const m = e.match(/@([^>\s]+)/); return m ? m[1] : '' }
const remetenteConfiavel = sender => { const d = dominioDe(sender); const lista = INT_CFG().remetentes.split(/[,;\s]+/).map(x => x.trim().toLowerCase()).filter(Boolean); return /\.jus\.br$/.test(d) || /(^|\.)jus\.br$/.test(d) || lista.some(x => d === x || d.endsWith('.' + x) || emailDe(sender) === x) }
function cnjsDoTexto(t) { const a = String(t).match(CNJ_RE) || []; const b = (String(t).match(CNJ_PURO_RE) || []).map(CRM.formatarCnj); return [...new Set([...a, ...b])].filter(n => CRM.numeroCnjValido(n)) }
/* avisos de acesso, senha, login, verificação: nunca são intimação (ex.: “Alerta de novo acesso” da PDPJ) */
const ALERTA_ACESSO_RE = /(novo acesso|novo dispositivo|alerta de (acesso|login|seguran)|\bsenha\b|redefin|recupera[çc][ãa]o de (conta|acesso|senha)|c[óo]digo de (verifica|acesso|seguran)|autentica[çc][ãa]o|token de acesso|\blogin\b|confirm\w*\s+(o\s+|seu\s+)?e-?mail|ative sua conta|acesso (n[ãa]o autorizado|suspeito)|conta (bloqueada|criada))/i
const ehAlertaDeAcesso = (assunto, previa) => ALERTA_ACESSO_RE.test(String(assunto || '') + ' ' + String(previa || '').slice(0, 300))
/* tribunal pelo domínio do remetente (tjba.jus.br → TJBA) ou pelo número CNJ */
function tribunalDoRemetente(sender) { const d = dominioDe(sender); const m = d.match(/(?:^|\.)((?:tj[a-z]{2}|trf\d|trt\d{1,2}|tre-?[a-z]{2}|trf|stj|stf|tst|stm|cnj|tjdft))\.jus\.br$/i); return m ? m[1].toUpperCase().replace('TRE-', 'TRE-') : null }
const calendarioDoTribunal = (nomeOuCnj) => { const n = String(nomeOuCnj || '').toLowerCase(); if (/^tjba|8\.05/.test(n)) return 'tjba'; if (/^trt5|5\.05/.test(n)) return 'trt5'; if (/^trf1|4\.01|jf/.test(n)) return 'jf'; return null }
/* movimentação mais recente do aviso (PJe Push traz uma tabela “Data - Movimento”; os demais, “Movimento/Evento: …” ou o assunto) */
function extrairMovimento(texto, assunto) {
  const linhas = String(texto || '').split('\n'); const movs = []
  for (const l of linhas) { const m = l.match(/^\s*\|?\s*(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}:\d{2}))?\s*[-–]\s*(.+?)\s*\|?\s*$/); if (m && !/data\s*-\s*movimento/i.test(l)) movs.push({ data: `${m[3]}-${m[2]}-${m[1]}`, hora: m[4] || '', texto: m[5].replace(/\s+\|$/, '').trim() }) }
  if (movs.length) { movs.sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora)); return { descricao: movs[0].texto, data: movs[0].data, hora: movs[0].hora, outros: movs.length - 1 } }
  const campo = String(texto || '').match(/(?:Movimenta[çc][ãa]o|Movimento|Evento|Ato|Tipo de (?:comunica[çc][ãa]o|ato|documento))[^:\n]{0,30}:\s*([^\n]{3,160})/i)
  if (campo) return { descricao: campo[1].trim(), data: null, hora: '', outros: 0 }
  const ass = String(assunto || '').replace(/^\s*\[[^\]]*\]\s*/, '').replace(/\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g, '').replace(/\s{2,}/g, ' ').trim()
  return { descricao: ass || 'Aviso do tribunal', data: null, hora: '', outros: 0 }
}
/* “intimação ou prazo” (vai para a faixa Hoje) × “movimentação/outros” (só em Tudo) */
const INTIM_PRAZO_RE = /(intima[çc]|prazo|cita[çc][ãa]o|nomea[çc]|publica[çc][ãa]o|audi[eê]ncia|ci[êe]ncia|despacho|senten[çc]a|decis[ãa]o (?:interlocut|proferid|publicad)|expedi[çc][ãa]o de (?:intima|cita|mandado|edital|carta)|vista (?:ao|à|para|dos)|manifest)/i
const ehIntimacaoPrazo = x => !/conclus|certid[ãa]o|juntada|remetid|recebid[oa]s? (?:os )?autos/i.test(String(x.movimento || '')) ? INTIM_PRAZO_RE.test(String(x.movimento || '') + ' ' + String(x.assunto || '') + ' ' + String(x.tipo || '')) : /intima[çc]|prazo|cita[çc]|nomea/i.test(String(x.movimento || ''))
function extrairIntimacoes(m) {
  const corpo = String(m.corpo || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim(); const tudo = (m.assunto || '') + '\n' + corpo
  if (ehAlertaDeAcesso(m.assunto, corpo.slice(0, 300))) return []
  const cnjs = cnjsDoTexto(tudo); const conf = remetenteConfiavel(m.remetente)
  if (!cnjs.length && !conf) return []
  const emailData = m.data ? diaDe(new Date(m.data).toISOString()) : hojeISO()
  const posDe = cnj => { const p = corpo.indexOf(cnj); return p >= 0 ? p : corpo.indexOf(normCnj(cnj)) }
  const pedacos = cnjs.length <= 1 ? [{ cnj: cnjs[0] || null, t: corpo }] : cnjs.map((cnj, i) => { const pos = posDe(cnj); const ini = Math.max(0, pos - 200); const prox = cnjs.slice(i + 1).map(posDe).filter(x => x > pos).sort((a, b) => a - b)[0]; return { cnj, t: corpo.slice(ini, prox != null ? Math.max(pos + 50, prox - 200) : undefined) } })
  return pedacos.map(({ cnj, t }) => {
    const texto = t.slice(0, 4000); const datas = datasDoTexto(texto); const mov = extrairMovimento(texto, m.assunto); const tipo = (TIPOS_INT_RE.find(([, re]) => re.test(mov.descricao + ' ' + texto)) || [])[0] || TIPO_DEFAULT
    const pub = datas.publicacao || datas.disponibilizacao || mov.data || emailData
    const d = { ext_id: 'gmail:' + m.id + '#' + (cnj ? normCnj(cnj) : 'sem'), fonte: 'email', gmail_msg_id: m.id, gmail_thread_id: m.threadId || null, numero_cnj: cnj, tribunal: tribunalDoRemetente(m.remetente) || (tribunalDoCnj(cnj) || [])[1] || null, tipo, assunto: m.assunto || '', remetente: m.remetente || '', remetente_oficial: conf, texto, link: m.link || null, recebida_em: m.data ? new Date(m.data).toISOString() : agora(), data_publicacao: pub, data_estimada: !(datas.publicacao || datas.disponibilizacao || mov.data), movimento: mov.descricao, movimento_data: mov.data, movimento_hora: mov.hora, movimento_extra: mov.outros, datas, prazo: analisarPrazo(texto, datas, cnj) }
    d.intimacao_prazo = ehIntimacaoPrazo(d); return d
  })
}

/* ---------- gravar + vincular ---------- */
function vincularAuto(i) {
  if (!i.numero_cnj || !i.remetente_oficial) return false   // remetente não confiável nunca vincula sozinho
  const ps = DB.processos.filter(p => normCnj(p.numero) === normCnj(i.numero_cnj)); if (ps.length !== 1) return false
  const p = ps[0]; i.processo_id = p.id; i.caso_id = p.caso_id || null; i.contato_id = p.contato_id || null; i.vinculo = 'automatico'; hist(i, 'Vinculada automaticamente ao processo ' + p.numero + ' (número CNJ idêntico).'); return true
}
const hist = (i, texto) => { (i.historico = i.historico || []).push({ em: agora(), texto }) }
function registrarIntimacaoRecebida(d) {
  if (DB.intimacoes.some(x => x.ext_id === d.ext_id)) return null
  const i = { id: proximoId('intimacoes'), created_at: agora(), status: 'a_tratar', lida: false, contato_id: null, caso_id: null, processo_id: null, vinculo: null, compromisso_id: null, observacao: null, prazo_dias: null, historico: [], ...d }
  hist(i, 'Recebida por ' + (d.fonte === 'email' ? 'e-mail' : d.fonte) + (d.remetente ? ' de ' + d.remetente : '') + '.')
  if (!vincularAuto(i)) hist(i, d.numero_cnj && !d.remetente_oficial && DB.processos.some(p => normCnj(p.numero) === normCnj(d.numero_cnj)) ? 'O processo existe no CRM, mas o remetente não é oficial nem confiável: NÃO vinculada automaticamente. Confira a origem e vincule você, se for legítima.' : d.numero_cnj ? 'Processo ' + d.numero_cnj + ' não encontrado no CRM (ou mais de um com o mesmo número): fica NÃO VINCULADA para você associar.' : 'Sem número de processo no texto: fica NÃO VINCULADA.')
  if (i.prazo && i.prazo.estado === 'revisar') hist(i, 'Prazo a revisar: ' + i.prazo.motivo)
  if (i.prazo && i.prazo.estado === 'sugerido') hist(i, 'Sugestão de prazo (NÃO criado): ' + dataLonga(i.prazo.sugerida_em) + '. ' + i.prazo.motivo)
  const parecida = DB.intimacoes.find(x => x.numero_cnj && x.numero_cnj === i.numero_cnj && x.data_publicacao === i.data_publicacao && x.tipo === i.tipo)
  if (parecida) { i.repetida_de = parecida.id; hist(i, 'Parece repetir a intimação #' + parecida.id + ' (mesmo processo, data e tipo).') }
  DB.intimacoes.push(i); return i
}

/* ---------- ler o Gmail (últimos 14 dias; remetentes @jus.br + os que você marcar) ---------- */
const consultaGmail = () => { const c = INT_CFG(); const dias = Math.max(1, Math.min(60, Number(c.dias) || 14)); const rem = c.remetentes.split(/[,;\s]+/).map(x => x.trim()).filter(Boolean); return `(from:jus.br${rem.length ? ' OR from:(' + rem.join(' OR ') + ')' : ''}) newer_than:${dias}d -in:sent -in:draft` }
const naoLidaNoGmail = m => ((m.labelIds || m.label_ids || []).includes('UNREAD'))
let LENDO_INT = false
async function buscarIntimacoesNoEmail(opc = {}) {
  if (LENDO_INT) return null; LENDO_INT = true; const r = { novas: 0, ignoradas: 0, alertas: 0, jaTinha: 0, emails: 0 }
  try {
    let threads = []; let token = null
    for (let pg = 0; pg < 2; pg++) { const t = await gmail('search_threads', { query: consultaGmail(), pageSize: 50, view: 'THREAD_VIEW_MINIMAL', ...(token ? { pageToken: token } : {}) }); threads = threads.concat((t && t.threads) || []); token = t && (t.nextPageToken || t.next_page_token); if (!token) break }
    const dono = (CONFIG.escritorio.email || '').toLowerCase()
    for (const th of threads) {
      const mins = (th.messages || []).filter(m => m.id && remetenteConfiavel(m.sender) && (!dono || emailDe(m.sender) !== dono)); if (!mins.length) continue
      const novos = []
      for (const m of mins) { r.emails++; if (ehAlertaDeAcesso(m.subject, m.snippet)) { r.alertas++; continue } const ja = DB.intimacoes.filter(i => i.gmail_msg_id === m.id || String(i.ext_id || '').startsWith('gmail:' + m.id + '#')); if (ja.length) { r.jaTinha += ja.length; const nl = naoLidaNoGmail(m); ja.forEach(i => { i.nao_lida_gmail = nl; i.lida = !nl || !!i.aberta_local; if (!i.link) i.link = m.viewUrl || m.view_url || th.viewUrl || th.view_url || null }); continue } novos.push(m) }
      if (!novos.length) continue
      let msgs = []; try { const x = await gmail('get_thread', { threadId: th.id, messageFormat: 'PLAIN_TEXT' }); msgs = (x && x.messages) || [] } catch (e) { if (e && /not_granted|permission_denied|server_not_connected|indisponivel/.test(e.code || '')) throw e; msgs = [] }
      for (const mn of novos) {
        const full = msgs.find(x => x.id === mn.id) || mn; const ex = extrairIntimacoes({ id: mn.id, threadId: th.id, assunto: full.subject || mn.subject, remetente: full.sender || mn.sender, data: full.date || mn.date, corpo: full.plaintextBody || full.plaintext_body || mn.snippet || '', link: mn.viewUrl || mn.view_url || full.viewUrl || th.viewUrl || th.view_url || null })
        if (!ex.length) { r.ignoradas++; continue }
        for (const d of ex) { d.nao_lida_gmail = naoLidaNoGmail(mn); d.lida = !d.nao_lida_gmail; if (registrarIntimacaoRecebida(d)) r.novas++; else r.jaTinha++ }
      }
    }
    INT_CFG().ultima_busca = agora(); CONFIG.integr.intim_ok = true; salvar('config'); salvar('intimacoes')
    if (!opc.silencioso || r.novas) aviso(r.novas ? `${plural(r.novas, 'aviso novo', 'avisos novos')} no CRM` + (r.alertas ? `; ${plural(r.alertas, 'alerta de acesso ignorado', 'alertas de acesso ignorados')}` : '') + '.' : `Nenhum aviso novo. ${plural(r.emails, 'e-mail de tribunal lido', 'e-mails de tribunais lidos')}` + (r.alertas ? `, ${plural(r.alertas, 'alerta de acesso ignorado', 'alertas de acesso ignorados')}` : '') + '.')
    render(); if (typeof atualizarCamadas === 'function') atualizarCamadas(); return r
  } catch (e) { if (!opc.silencioso) aviso(erroCopy(e), 'erro'); return null }
  finally { LENDO_INT = false }
}

/* ---------- estados e prazos para filtros/alertas ---------- */
const dataPrazoIntim = i => { if (i.prazo_lancado) { const q = i.compromisso_id ? DB.compromissos.find(c => c.id === i.compromisso_id) : null; if (q && q.status !== 'pendente') return null; return { d: i.prazo_lancado.vence, tipo: 'criado' } } const q = i.compromisso_id ? DB.compromissos.find(c => c.id === i.compromisso_id) : null; if (q) return q.status === 'pendente' ? { d: diaDe(dataDoCompromisso(q)), tipo: 'criado' } : null; return i.prazo && i.prazo.estado === 'sugerido' ? { d: i.prazo.sugerida_em, tipo: 'sugerido' } : null }
const semVinculo = i => !i.processo_id && !i.contato_id
const ehAvisoDePrazo = i => i.intimacao_prazo !== false
/** intimação/prazo que ainda não teve o prazo lançado: vai para a faixa Hoje e para o número da aba */
const semPrazoLancado = i => i.status === 'a_tratar' && ehAvisoDePrazo(i) && !i.prazo_lancado && !i.compromisso_id
const intimacoesNovas = () => DB.intimacoes.filter(i => !i.lida && i.status === 'a_tratar').length
const diaSemana = iso => { try { return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' }) } catch (e) { return '' } }
const dmCurto = iso => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : ''

/* ---------- lançar prazo: calcula o vencimento, mostra antes, cria o lembrete e o evento no Google Agenda (avisos 3 dias e 1 dia antes) ---------- */
const AVISOS_PRAZO_DIAS = [3, 1], HORA_AVISO = 9
async function criarEventoPrazoNoGoogle(p, i) {
  const vence = p.data_limite; const desc = [`Prazo lançado pelo CRM (${p.dias_prazo} dias ${p.modo_prazo === 'corridos' ? 'corridos' : 'úteis'}, ciência em ${dataLonga(p.data_publicacao)}, calendário ${CRM.TRIBUNAIS[p.calendario] || p.calendario}).`, i.numero_cnj ? 'Processo: ' + i.numero_cnj : '', i.movimento ? 'Movimentação: ' + i.movimento : '', i.link ? 'E-mail: ' + i.link : '', 'Confira sempre a contagem no sistema do tribunal.'].filter(Boolean).join('\n')
  const r = await conector('Google Calendar', 'create_event', { summary: `⚖️ Prazo: ${i.movimento || i.tipo}${i.numero_cnj ? ' — ' + i.numero_cnj : ''}`, description: desc, startTime: `${vence}T00:00:00-03:00`, endTime: `${somarDias(vence, 1)}T00:00:00-03:00`, allDay: true, timeZone: 'America/Bahia', overrideReminders: AVISOS_PRAZO_DIAS.map(d => ({ method: 'popup', minutes: d * 1440 - HORA_AVISO * 60 })) })
  const id = r && (r.id || r.eventId || (r.event && r.event.id)); if (!id) throw { code: 'invalido', message: 'o Google Agenda não devolveu o id do evento' }; return id
}
function lancarPrazo(i, aoFim) {
  const sug = i.prazo || {}; const trib0 = calendarioDoTribunal(i.tribunal) || calendarioDoTribunal(i.numero_cnj) || 'tjba'
  const S = { dias: sug.dias || 15, modo: sug.modo || 'uteis', ciencia: i.data_publicacao || diaDe(i.recebida_em || i.created_at) || hojeISO(), trib: trib0 }
  const prev = h('div', { class: 'rounded-2xl border border-secondary/50 bg-secondary/10 p-3 space-y-1', 'data-testid': 'prazo-previa' }); let ocupado = false
  const calc = () => { if (!(Number(S.dias) >= 1 && Number(S.dias) <= 365) || !/^\d{4}-\d{2}-\d{2}$/.test(S.ciencia)) return null; try { return calcularPrazoCpc(S.ciencia, Number(S.dias), S.trib, S.modo) } catch (e) { return null } }
  const pintar = () => { const r = calc(); prev.replaceChildren(r ? h('p', { class: 'text-base font-semibold', 'data-testid': 'prazo-vence' }, 'Vence em ' + dataLonga(r.vencimento) + ' (' + diaSemana(r.vencimento) + ')') : h('p', { class: 'text-sm text-gray-500' }, 'Informe dias (1 a 365) e a data da ciência.'), r ? h('p', { class: 'text-[11px] text-gray-600 dark:text-zinc-300' }, `${S.dias} dias ${S.modo === 'uteis' ? 'úteis' : 'corridos'} contados a partir do dia seguinte à ciência (${dataLonga(S.ciencia)}), calendário: ${CRM.TRIBUNAIS[S.trib]}.`) : null, r && r.pulados && r.pulados.length ? h('p', { class: 'text-[11px] text-gray-500' }, 'Dias não contados/prorrogados: ' + r.pulados.slice(0, 6).map(x => dmCurto(x.d) + ' (' + x.motivo + ')').join('; ') + (r.pulados.length > 6 ? '…' : '')) : null, h('p', { class: 'text-[11px] text-amber-700 dark:text-amber-300' }, 'Conferência obrigatória: confirme feriados, suspensões e a regra de contagem no sistema do tribunal. O CRM só ajuda no cálculo.')) }
  const campo = (rot, el) => h('label', { class: 'block' }, rotuloCampo(rot), el)
  const dias = h('input', { type: 'number', min: 1, max: 365, class: 'modal-input', value: S.dias, 'data-testid': 'prazo-dias', oninput: ev => { S.dias = ev.target.value; pintar() } })
  const modo = h('select', { class: 'modal-input', 'data-testid': 'prazo-modo', onchange: ev => { S.modo = ev.target.value; pintar() } }, [['uteis', 'Dias úteis'], ['corridos', 'Dias corridos']].map(([v, t]) => h('option', { value: v, selected: v === S.modo }, t)))
  const ciencia = h('input', { type: 'date', class: 'modal-input', value: S.ciencia, 'data-testid': 'prazo-ciencia', onchange: ev => { S.ciencia = ev.target.value; pintar() } })
  const trib = h('select', { class: 'modal-input', 'data-testid': 'prazo-trib', onchange: ev => { S.trib = ev.target.value; pintar() } }, Object.entries(CRM.TRIBUNAIS).map(([k, t]) => h('option', { value: k, selected: k === S.trib }, t)))
  pintar()
  modal({ titulo: 'Lançar prazo', largura: 'max-w-lg', corpo: h('div', { class: 'space-y-3', 'data-testid': 'lancar-prazo' }, h('p', { class: 'text-sm' }, h('b', {}, i.numero_cnj || 'Sem número de processo'), ' — ' + (i.movimento || i.tipo) + (i.tribunal ? ' (' + i.tribunal + ')' : '')), sug.estado === 'sugerido' ? alerta('info', null, 'Sugestão do texto: ' + sug.motivo) : sug.estado === 'revisar' ? alerta('aviso', null, sug.motivo) : null, h('div', { class: 'grid gap-3 sm:grid-cols-2' }, campo('Dias do prazo', dias), campo('Contagem', modo), campo('Data da ciência', ciencia), campo('Calendário do tribunal', trib)), prev, h('p', { class: 'text-[11px] text-gray-500' }, `Ao confirmar: cria o prazo na Agenda do CRM (aparece em Hoje) e o evento no Google Agenda, com avisos ${AVISOS_PRAZO_DIAS.join(' e ')} dia(s) antes, às ${HORA_AVISO}h.`)),
    rodape: f => [btn('Cancelar', { tipo: 'sec', onclick: f }), btn('Confirmar e lançar prazo', { tid: 'prazo-confirmar', onclick: async ev => {
      const r = calc(); if (!r || ocupado) { if (!r) aviso('Confira dias e data da ciência.', 'erro'); return } ocupado = true; const bt = ev.currentTarget; bt.disabled = true; bt.textContent = 'Lançando…'
      const q = { id: proximoId('compromissos'), status: 'pendente', tipo: 'prazo', titulo: 'Prazo: ' + (i.movimento || i.tipo) + (i.numero_cnj ? ' — ' + i.numero_cnj : ''), contato_id: i.contato_id || null, caso_id: i.caso_id || null, processo_id: i.processo_id || null, data_limite: r.vencimento, data_publicacao: S.ciencia, dias_prazo: Number(S.dias), modo_prazo: S.modo, calendario: S.trib, avisos_dias: AVISOS_PRAZO_DIAS, intimacao_id: i.id, observacao: `Lançado a partir da intimação #${i.id}. ${i.link ? 'E-mail: ' + i.link : ''}` }
      DB.compromissos.push(q); salvar('compromissos')
      i.prazo_lancado = { vence: r.vencimento, dias: Number(S.dias), modo: S.modo, trib: S.trib, ciencia: S.ciencia, em: agora(), gcal_id: null, gcal_erro: null }; i.compromisso_id = q.id; i.aberta_local = true; i.lida = true
      hist(i, `Prazo lançado: ${S.dias} dias ${S.modo === 'uteis' ? 'úteis' : 'corridos'} a partir de ${dataLonga(S.ciencia)} → vence ${dataLonga(r.vencimento)} (calendário ${CRM.TRIBUNAIS[S.trib]}).`)
      let msgGoogle = ''
      try { const gid = await criarEventoPrazoNoGoogle(q, i); q.gcal_id = gid; i.prazo_lancado.gcal_id = gid; hist(i, 'Evento criado no Google Agenda com avisos 3 e 1 dia antes.'); msgGoogle = ' e evento criado no Google Agenda' } catch (e) { i.prazo_lancado.gcal_erro = (e && e.message) || erroConector(e, 'Google Agenda'); hist(i, 'Prazo criado no CRM, mas o evento no Google Agenda falhou: ' + i.prazo_lancado.gcal_erro); msgGoogle = '. ATENÇÃO: o evento no Google Agenda NÃO foi criado (' + erroConector(e, 'Google Agenda') + ')' }
      auditar('prazo_lancado', (i.numero_cnj || '') + ' → ' + r.vencimento); salvar('compromissos'); salvar('intimacoes'); f(); aviso(`Prazo lançado: vence ${dataLonga(r.vencimento)}${msgGoogle}.`, i.prazo_lancado.gcal_erro ? 'erro' : 'ok'); aoFim && aoFim(); render(); if (typeof atualizarCamadas === 'function') atualizarCamadas()
    } })] })
}
async function reenviarEventoGoogle(i, aoFim) {
  const q = DB.compromissos.find(c => c.id === i.compromisso_id); if (!q) { aviso('O prazo não existe mais na Agenda.', 'erro'); return }
  try { const gid = await criarEventoPrazoNoGoogle(q, i); q.gcal_id = gid; i.prazo_lancado.gcal_id = gid; i.prazo_lancado.gcal_erro = null; hist(i, 'Evento criado no Google Agenda (nova tentativa).'); salvar('compromissos'); salvar('intimacoes'); aviso('Evento criado no Google Agenda.'); aoFim && aoFim(); render() } catch (e) { aviso('Não consegui criar o evento: ' + erroConector(e, 'Google Agenda'), 'erro') }
}
const etiquetaPrazo = i => i.prazo_lancado ? 'Prazo lançado · vence ' + dmCurto(i.prazo_lancado.vence) : null

/* ---------- detalhe ---------- */
function abrirIntimacao(i) {
  if (!i.lida || !i.aberta_local) { i.lida = true; i.aberta_local = true; hist(i, 'Aberta no CRM.'); salvar('intimacoes') }
  const corpo = h('div', { class: 'space-y-4', 'data-testid': 'intim-detalhe' }); let alvoProc = i.processo_id || ''
  const des = () => {
    const proc = i.processo_id ? processo(i.processo_id) : null; const pz = i.prazo || { estado: 'nenhum' }
    corpo.replaceChildren(
      h('div', { class: 'flex flex-wrap items-center gap-2' }, badge(i.tipo, 'cinza'), i.tribunal ? badge(i.tribunal, 'azul') : null, semVinculo(i) ? badge('Não vinculada', 'ambar') : badge('Vinculada' + (i.vinculo === 'automatico' ? ' (automática)' : ' (manual)'), 'verde'), etiquetaPrazo(i) ? badge(etiquetaPrazo(i), 'verde') : null, i.status === 'tratada' ? badge('Tratada', 'verde') : null, i.repetida_de ? badge('Parece repetida (#' + i.repetida_de + ')', 'ambar') : null, i.fonte === 'email' && !i.remetente_oficial ? badge('Remetente não oficial', 'vermelho') : null),
      i.fonte === 'email' && !i.remetente_oficial ? alerta('aviso', 'Confira a origem', 'Este e-mail não veio de um domínio .jus.br nem de um remetente que você marcou como confiável. Confirme no sistema do tribunal antes de agir (golpes imitam intimações).') : null,
      h('div', { class: 'grid gap-x-4 gap-y-1 sm:grid-cols-2 text-sm' }, h('p', {}, h('b', {}, 'Processo: '), i.numero_cnj || 'não identificado no texto'), h('p', {}, h('b', {}, 'Tribunal: '), i.tribunal || '—'), h('p', {}, h('b', {}, 'Movimentação: '), i.movimento || i.tipo), h('p', {}, h('b', {}, 'Data: '), dataLonga(i.movimento_data || i.data_publicacao) + (i.movimento_hora ? ' ' + i.movimento_hora : '') + (i.data_estimada ? ' (data do e-mail)' : '')), h('p', {}, h('b', {}, 'Pessoa: '), i.contato_id ? nomeContato(i.contato_id) : '—'), h('p', {}, h('b', {}, 'Demanda: '), i.caso_id ? nomeDemanda(i.caso_id) : '—'), h('p', {}, h('b', {}, 'Recebida em: '), i.recebida_em ? dataHora(i.recebida_em) : dataLonga(i.created_at)), h('p', {}, h('b', {}, 'Origem: '), i.fonte === 'email' ? 'e-mail de ' + (i.remetente || '?') : i.fonte === 'manual' || !i.fonte ? 'registrada por você' : i.fonte), i.link ? h('p', {}, h('a', { href: i.link, target: '_blank', rel: 'noopener', class: 'underline', onclick: () => { i.aberta_local = true; i.lida = true; salvar('intimacoes') } }, 'Abrir o e-mail no Gmail')) : null),
      h('div', {}, h('p', { class: 'section-label mb-1' }, 'Texto'), h('div', { class: 'whitespace-pre-wrap text-sm rounded-2xl border border-gray-200 dark:border-zinc-700 p-3 max-h-56 overflow-y-auto', 'data-testid': 'intim-texto' }, i.texto)),
      semVinculo(i) || !i.processo_id ? h('div', { class: 'rounded-2xl border border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-2' }, h('p', { class: 'text-sm font-semibold' }, 'Vincular a um processo'), h('select', { class: 'modal-input', 'data-testid': 'intim-processo', onchange: ev => { alvoProc = ev.target.value ? Number(ev.target.value) : '' } }, h('option', { value: '' }, 'Escolha o processo…'), DB.processos.map(p => h('option', { value: p.id, selected: p.id === alvoProc }, (p.numero || p.orgao || 'Processo ' + p.id) + ' · ' + nomeContato(p.contato_id)))), btn('Vincular', { mini: true, tid: 'intim-vincular', onclick: () => { if (!alvoProc) { aviso('Escolha o processo.', 'erro'); return } const p = processo(alvoProc); i.processo_id = p.id; i.caso_id = p.caso_id || null; i.contato_id = p.contato_id || null; i.vinculo = 'manual'; hist(i, 'Vinculada manualmente ao processo ' + (p.numero || p.id) + '.'); salvar('intimacoes'); des(); render() } })) : h('div', { class: 'flex items-center gap-2 text-sm' }, h('span', {}, 'Vinculada ao processo ', h('b', {}, proc ? proc.numero : '—')), btn('Desvincular', { mini: true, tipo: 'fantasma', tid: 'intim-desvincular', onclick: () => { i.processo_id = null; i.caso_id = null; i.contato_id = null; i.vinculo = null; hist(i, 'Vínculo removido.'); salvar('intimacoes'); des(); render() } })),
      h('div', { class: 'rounded-2xl border p-3 space-y-2 ' + (i.prazo_lancado ? 'border-green-400/60 bg-green-50/60 dark:bg-green-950/20' : pz.estado === 'sugerido' ? 'border-secondary/50 bg-secondary/5' : pz.estado === 'revisar' ? 'border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20' : 'border-gray-200 dark:border-zinc-700'), 'data-testid': 'intim-prazo' },
        h('p', { class: 'text-sm font-semibold' }, i.prazo_lancado ? etiquetaPrazo(i) : pz.estado === 'sugerido' ? 'Prazo SUGERIDO (não lançado): ' + dataLonga(pz.sugerida_em) : pz.estado === 'revisar' ? 'Prazo a REVISAR' : 'Nenhum prazo identificado no texto'),
        i.prazo_lancado ? h('p', { class: 'text-xs' }, `${i.prazo_lancado.dias} dias ${i.prazo_lancado.modo === 'uteis' ? 'úteis' : 'corridos'} · ciência ${dataLonga(i.prazo_lancado.ciencia)} · calendário ${CRM.TRIBUNAIS[i.prazo_lancado.trib] || i.prazo_lancado.trib}`) : pz.motivo ? h('p', { class: 'text-xs text-gray-600 dark:text-zinc-300' }, pz.motivo) : h('p', { class: 'text-xs text-gray-500' }, 'Se houver prazo, lance-o: o CRM calcula o vencimento e você confere antes de confirmar.'),
        i.prazo_lancado && i.prazo_lancado.gcal_erro ? h('div', { class: 'space-y-1' }, alerta('aviso', 'Google Agenda', 'O evento não foi criado: ' + i.prazo_lancado.gcal_erro), btn('Tentar criar o evento de novo', { mini: true, tipo: 'sec', tid: 'intim-regcal', onclick: () => reenviarEventoGoogle(i, des) })) : i.prazo_lancado ? h('p', { class: 'text-xs text-green-700 dark:text-green-400' }, '✓ Prazo na Agenda do CRM e evento no Google Agenda (avisos 3 e 1 dia antes).') : null,
        !i.prazo_lancado ? btn('Lançar prazo', { mini: true, icone: 'ph:hourglass-high-bold', tid: 'intim-lancar', onclick: () => lancarPrazo(i, des) }) : null),
      h('div', {}, h('p', { class: 'section-label mb-1' }, 'Histórico'), h('ol', { class: 'text-xs text-gray-600 dark:text-zinc-300 space-y-0.5', 'data-testid': 'intim-historico' }, (i.historico || []).map(x => h('li', {}, dataHora(x.em) + ' — ' + x.texto)))))
  }
  des()
  modal({ titulo: 'Intimação / publicação', largura: 'max-w-3xl', corpo, aoFechar: render, rodape: fechar => [btn('Excluir', { tipo: 'perigo', tid: 'intim-excluir', onclick: () => confirmar('Excluir esta intimação do CRM?', 'Use para e-mails que não eram intimação. O e-mail no Gmail não é alterado, mas ele pode ser importado de novo na próxima leitura.', 'Excluir', () => { DB.intimacoes = DB.intimacoes.filter(x => x.id !== i.id); salvar('intimacoes'); fechar(); render() }) }), i.status === 'a_tratar' ? btn('Marcar como tratada', { tid: 'intim-tratada', onclick: () => { i.status = 'tratada'; hist(i, 'Marcada como tratada.'); salvar('intimacoes'); fechar(); aviso('Intimação tratada.'); render() } }) : btn('Reabrir', { tipo: 'sec', tid: 'intim-reabrir', onclick: () => { i.status = 'a_tratar'; hist(i, 'Reaberta.'); salvar('intimacoes'); fechar(); render() } })] })
}

/* ---------- tela (Secretária › Intimações) ---------- */
UI.intim = { f: 'prazos', n: 8, ...(UI.intim || {}) }
const DJEN_URL = 'https://comunica.pje.jus.br/'
VIEWS.intimacoes = () => {
  const cfg = INT_CFG(); const f = UI.intim.f === 'tudo' ? 'tudo' : 'prazos'
  const todos = DB.intimacoes.slice().sort((a, b) => String((b.movimento_data || b.data_publicacao || '') + (b.recebida_em || b.created_at)).localeCompare(String((a.movimento_data || a.data_publicacao || '') + (a.recebida_em || a.created_at))))
  const prazos = todos.filter(ehAvisoDePrazo); const lista_ = f === 'prazos' ? prazos : todos; const visiveis = lista_.slice(0, UI.intim.n)
  formIntimacao = (i, pad) => modalForm(i ? 'Editar intimação' : 'Registrar intimação', [{ chave: 'contato_id', rotulo: 'Cliente (opcional)', tipo: 'select', opcoes: [['', '— não vinculada —'], ...opcoesContatos()], numerico: true }, { chave: 'processo_id', rotulo: 'Processo', tipo: 'select', opcoes: [['', '— nenhum —'], ...DB.processos.map(x => [x.id, x.numero || x.orgao])], numerico: true }, { chave: 'tipo', rotulo: 'Tipo', tipo: 'select', opcoes: CRM.TIPOS_INTIMACAO }, { chave: 'data_publicacao', rotulo: 'Data da publicação', tipo: 'data', obrigatorio: true }, { chave: 'texto', rotulo: 'Texto / resumo', tipo: 'textarea', obrigatorio: true }], i || { tipo: 'Despacho', data_publicacao: hojeISO(), ...(pad || {}) }, v => { const p = v.processo_id ? processo(v.processo_id) : null; if (i) Object.assign(i, v); else { const n = { id: proximoId('intimacoes'), created_at: agora(), recebida_em: agora(), fonte: 'manual', lida: true, aberta_local: true, caso_id: p?.caso_id || null, status: 'a_tratar', prazo_dias: null, observacao: null, numero_cnj: p ? p.numero : null, movimento: v.tipo, vinculo: p ? 'manual' : null, historico: [], prazo: { estado: 'nenhum' }, intimacao_prazo: true, ...v, contato_id: v.contato_id || (p ? p.contato_id : null) || null }; hist(n, 'Registrada manualmente por você.'); DB.intimacoes.push(n) } salvar('intimacoes') })
  const campo = (rot, k, ph, tid) => h('label', { class: 'block' }, rotuloCampo(rot), (() => { const t = h('input', { class: 'modal-input !text-sm', placeholder: ph, 'data-testid': tid }); t.value = cfg[k] || ''; t.addEventListener('change', () => { cfg[k] = t.value.trim(); salvar('config') }); return t })())
  const linha = i => { const pz = dataPrazoIntim(i); const naoLida = !i.lida
    return h('div', { class: 'painel !p-4 flex flex-wrap items-start gap-3 ' + (i.status === 'tratada' ? 'opacity-60' : ''), 'data-testid': 'intimacao' },
      h('span', { class: 'mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ' + (naoLida ? 'bg-secondary' : 'bg-transparent'), title: naoLida ? 'Não lida' : '', 'data-testid': naoLida ? 'ponto-nao-lida' : 'ponto-lida' }),
      h('div', { class: 'min-w-0 flex-1 basis-64' },
        h('p', { class: 'flex flex-wrap items-center gap-1.5 text-sm' }, i.tribunal ? badge(i.tribunal, 'azul') : badge('Tribunal não identificado', 'cinza'), h('span', { class: 'font-mono text-[13px] ' + (naoLida ? 'font-bold' : 'font-medium') }, i.numero_cnj || 'sem número de processo'), semVinculo(i) ? badge('Não vinculada', 'ambar') : badge(nomeContato(i.contato_id) || 'Vinculada', 'verde'), etiquetaPrazo(i) ? badge(etiquetaPrazo(i), 'verde') : semPrazoLancado(i) ? badge('Sem prazo lançado', 'ambar') : null, i.status === 'tratada' ? badge('Tratada', 'cinza') : null),
        h('p', { class: 'text-sm mt-1 ' + (naoLida ? 'font-semibold' : '') }, i.movimento || i.tipo, i.movimento_extra ? h('span', { class: 'text-[11px] text-gray-500' }, ` (+${i.movimento_extra} movimento${i.movimento_extra > 1 ? 's' : ''})`) : null),
        h('p', { class: 'text-[11px] text-gray-500' }, dataLonga(i.movimento_data || i.data_publicacao) + (i.movimento_hora ? ' ' + i.movimento_hora : '') + (i.data_estimada ? ' · data do e-mail' : '') + (i.fonte === 'email' ? '' : ' · registrada por você') + (i.fonte === 'email' && !i.remetente_oficial ? ' · remetente não oficial' : ''))),
      h('div', { class: 'flex flex-wrap items-center gap-1.5 shrink-0' }, !i.prazo_lancado && i.status === 'a_tratar' ? btn('Lançar prazo', { mini: true, icone: 'ph:hourglass-high-bold', tid: 'lancar-prazo', onclick: () => lancarPrazo(i) }) : null, i.link ? h('a', { href: i.link, target: '_blank', rel: 'noopener', 'data-testid': 'abrir-email', class: 'btn-mini inline-flex items-center gap-1 border border-gray-300 dark:border-zinc-700 rounded-full px-3 py-1.5 text-xs', onclick: () => { i.aberta_local = true; i.lida = true; salvar('intimacoes'); setTimeout(render, 200) } }, ic('ph:envelope-simple-open-bold'), 'Abrir e-mail') : null, btn('Detalhes', { mini: true, tipo: 'sec', tid: 'intim-abrir', onclick: () => abrirIntimacao(i) })))
  }
  return pagina('Intimações', 'Avisos de tribunais (@jus.br) que chegaram ao seu Gmail nos últimos ' + (Number(cfg.dias) || 14) + ' dias. Você lança o prazo; nada é criado sozinho.', [btn('Atualizar do Gmail', { icone: 'ph:arrows-clockwise-bold', tid: 'buscar-intimacoes', onclick: () => buscarIntimacoesNoEmail() }), btn('Ler texto de intimação', { tipo: 'sec', icone: 'ph:sparkle-bold', onclick: abrirAnaliseIntimacao, tid: 'ler-intimacao' }), btn('Registrar intimação', { tipo: 'sec', icone: 'ph:plus-bold', onclick: () => formIntimacao(null), tid: 'nova-intimacao' })],
    alerta('info', 'O painel não substitui a consulta oficial', h('span', {}, 'Mostra só o que chegou ao seu e-mail. Intimações e publicações oficiais ficam no DJEN: ', h('a', { href: DJEN_URL, target: '_blank', rel: 'noopener', class: 'underline font-semibold', 'data-testid': 'link-djen' }, 'abrir o DJEN (comunica.pje.jus.br)'), '. Confira sempre lá e no sistema do tribunal.')),
    h('div', { class: 'flex flex-wrap items-center gap-2' }, h('button', { type: 'button', class: 'filtro ' + (f === 'prazos' ? 'filtro-ativo' : ''), 'data-testid': 'intim-filtro-prazos', onclick: () => { UI.intim.f = 'prazos'; UI.intim.n = 8; render() } }, `Intimações e prazos (${prazos.length})`), h('button', { type: 'button', class: 'filtro ' + (f === 'tudo' ? 'filtro-ativo' : ''), 'data-testid': 'intim-filtro-tudo', onclick: () => { UI.intim.f = 'tudo'; UI.intim.n = 8; render() } }, `Tudo (${todos.length})`), h('span', { class: 'text-[11px] text-gray-400', 'data-testid': 'intim-atualizado' }, cfg.ultima_busca ? 'Atualizado às ' + horaCurta(cfg.ultima_busca) + ' de ' + dataLonga(diaDe(cfg.ultima_busca)) : 'Ainda não atualizado: clique em “Atualizar do Gmail”.')),
    visiveis.length ? h('div', { class: 'space-y-2' }, visiveis.map(linha)) : estadoVazio('ph:megaphone-bold', 'Nenhum aviso aqui', f === 'prazos' ? 'Clique em “Atualizar do Gmail” para ler os avisos dos tribunais, ou veja “Tudo”.' : 'Nenhum e-mail de tribunal nos últimos dias (alertas de login e senha são ignorados).'),
    lista_.length > visiveis.length ? btn(`Ver mais (${lista_.length - visiveis.length})`, { tipo: 'sec', tid: 'ver-mais', onclick: () => { UI.intim.n += 8; render() } }) : null,
    h('details', { class: 'painel !p-4', 'data-testid': 'intim-ajustes' }, h('summary', { class: 'cursor-pointer text-sm font-semibold flex items-center gap-2' }, ic('ph:sliders-horizontal-bold'), 'Ajustes da leitura do Gmail'),
      h('div', { class: 'mt-3 space-y-3' }, h('p', { class: 'text-xs text-gray-600 dark:text-zinc-300' }, 'O CRM lê e-mails de remetentes @jus.br (eproc, PJe Push, nomeações…) e ignora alertas de acesso, login e senha. A leitura acontece com o CRM aberto (não é push): ao abrir o CRM e quando você clica em Atualizar.'), h('div', { class: 'grid gap-3 sm:grid-cols-2' }, campo('Outros remetentes confiáveis (opcional)', 'remetentes', 'ex.: jusbrasil.com.br, astrea.net', 'intim-remetentes'), campo('Dias a ler', 'dias', '14', 'intim-dias')))))
}

/* limpeza única: as 2 intimações de exemplo das versões antigas não existem mais */
function migrarIntimacoesExemplo() {
  if (CONFIG.v_sem_intim_exemplo) return
  const EX = ['Intime-se o inventariante para se manifestar sobre o laudo de avaliação em 15 dias.', 'Designada audiência de conciliação.']
  DB.intimacoes = DB.intimacoes.filter(i => i.fonte || !EX.includes(i.texto)); CONFIG.v_sem_intim_exemplo = true; salvar('intimacoes'); salvar('config')
}
