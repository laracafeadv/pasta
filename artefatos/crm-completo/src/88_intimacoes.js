'use strict'
/* ============ INTIMAÇÕES / PUBLICAÇÕES: entrada real, vínculo seguro, prazo só com confirmação ============
   O que o Artifact FAZ de verdade: ler o seu Gmail (conector, como você), reconhecer o número CNJ, ligar ao processo cadastrado,
   guardar texto/datas/histórico e sugerir prazo com a calculadora forense, SEMPRE para você conferir.
   O que o Artifact NÃO faz: receber PUSH. Ele só roda com o CRM aberto: não há como o tribunal "empurrar" nada para cá.
   A API oficial do CNJ (DJEN) bloqueia acesso de fora do Brasil (testado: 403 a partir do Supabase); sem servidor no Brasil não há como chamá-la.
   Regras de segurança: nenhuma intimação é inventada; sem número CNJ válido (ou remetente que você marcou como confiável) o e-mail é ignorado;
   dúvida no vínculo → “não vinculada”; dúvida no prazo → “revisar”; o CRM nunca cria prazo sozinho. */
const INT_CFG = () => (CONFIG.intim = { remetentes: '', palavras: '', dias: 30, ultima_busca: null, ...(CONFIG.intim || {}) })
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
const remetenteConfiavel = sender => { const d = dominioDe(sender); const lista = INT_CFG().remetentes.split(/[,;\s]+/).map(x => x.trim().toLowerCase()).filter(Boolean); return /\.jus\.br$/.test(d) || lista.some(x => d === x || d.endsWith('.' + x) || emailDe(sender) === x) }
function cnjsDoTexto(t) { const a = String(t).match(CNJ_RE) || []; const b = (String(t).match(CNJ_PURO_RE) || []).map(CRM.formatarCnj); return [...new Set([...a, ...b])].filter(n => CRM.numeroCnjValido(n)) }
function extrairIntimacoes(m) {
  const corpo = String(m.corpo || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim(); const tudo = (m.assunto || '') + '\n' + corpo
  const cnjs = cnjsDoTexto(tudo); const conf = remetenteConfiavel(m.remetente)
  if (!cnjs.length && !conf) return []
  const emailData = m.data ? diaDe(new Date(m.data).toISOString()) : hojeISO()
  const posDe = cnj => { const p = corpo.indexOf(cnj); return p >= 0 ? p : corpo.indexOf(normCnj(cnj)) }
  const pedacos = cnjs.length <= 1 ? [{ cnj: cnjs[0] || null, t: corpo }] : cnjs.map((cnj, i) => { const pos = posDe(cnj); const ini = Math.max(0, pos - 200); const prox = cnjs.slice(i + 1).map(posDe).filter(x => x > pos).sort((a, b) => a - b)[0]; return { cnj, t: corpo.slice(ini, prox != null ? Math.max(pos + 50, prox - 200) : undefined) } })
  return pedacos.map(({ cnj, t }) => {
    const texto = t.slice(0, 4000); const datas = datasDoTexto(texto); const tipo = (TIPOS_INT_RE.find(([, re]) => re.test(texto)) || [])[0] || TIPO_DEFAULT
    const pub = datas.publicacao || datas.disponibilizacao || emailData
    return { ext_id: 'gmail:' + m.id + '#' + (cnj ? normCnj(cnj) : 'sem'), fonte: 'email', numero_cnj: cnj, tribunal: (tribunalDoCnj(cnj) || [])[1] || null, tipo, assunto: m.assunto || '', remetente: m.remetente || '', remetente_oficial: conf, texto, link: m.link || null, recebida_em: m.data ? new Date(m.data).toISOString() : agora(), data_publicacao: pub, data_estimada: !(datas.publicacao || datas.disponibilizacao), datas, prazo: analisarPrazo(texto, datas, cnj) }
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

/* ---------- ler o Gmail ---------- */
const consultaGmail = () => { const c = INT_CFG(); const base = `(intimação OR intimacao OR "diário de justiça" OR "comunicação processual" OR publicação OR djen OR expediente${c.palavras.trim() ? ' OR ' + c.palavras.trim().split(/[,;]+/).map(x => '"' + x.trim() + '"').filter(x => x !== '""').join(' OR ') : ''}) newer_than:${Math.max(1, Math.min(365, Number(c.dias) || 30))}d -in:sent`; const rem = c.remetentes.split(/[,;\s]+/).map(x => x.trim()).filter(Boolean); return rem.length ? `(${base}) OR from:(${rem.join(' OR ')})` : base }
let LENDO_INT = false
async function buscarIntimacoesNoEmail(opc = {}) {
  if (LENDO_INT) return null; LENDO_INT = true; const r = { novas: 0, ignoradas: 0, jaTinha: 0, emails: 0 }
  try {
    const t = await gmail('search_threads', { query: consultaGmail(), pageSize: 25, view: 'THREAD_VIEW_MINIMAL' }); const threads = (t && t.threads) || []
    for (const th of threads.slice(0, 25)) {
      let msgs = []; try { const x = await gmail('get_thread', { threadId: th.id, messageFormat: 'PLAIN_TEXT' }); msgs = (x && x.messages) || [] } catch (e) { if (e && /not_granted|permission_denied|server_not_connected|indisponivel/.test(e.code || '')) throw e; msgs = th.messages || [] }
      for (const m of msgs) {
        if (!m.id) continue; r.emails++
        const dono = (CONFIG.escritorio.email || '').toLowerCase(); if (dono && emailDe(m.sender) === dono) continue
        const ex = extrairIntimacoes({ id: m.id, assunto: m.subject, remetente: m.sender, data: m.date, corpo: m.plaintext_body || m.plaintextBody || m.snippet || '', link: m.viewUrl || m.view_url || th.viewUrl || th.view_url || null })
        if (!ex.length) { r.ignoradas++; continue }
        for (const d of ex) { if (registrarIntimacaoRecebida(d)) r.novas++; else r.jaTinha++ }
      }
    }
    INT_CFG().ultima_busca = agora(); CONFIG.integr.intim_ok = true; salvar('config'); if (r.novas) salvar('intimacoes')
    if (!opc.silencioso || r.novas) aviso(r.novas ? `${plural(r.novas, 'intimação nova', 'intimações novas')} no CRM` + (r.ignoradas ? `; ${plural(r.ignoradas, 'e-mail ignorado', 'e-mails ignorados')} (sem número de processo)` : '') + '.' : `Nenhuma intimação nova. ${plural(r.emails, 'e-mail lido', 'e-mails lidos')}` + (r.ignoradas ? `, ${r.ignoradas} sem número de processo` : '') + '.')
    render(); if (typeof atualizarCamadas === 'function') atualizarCamadas(); return r
  } catch (e) { if (!opc.silencioso) aviso(erroCopy(e), 'erro'); return null }
  finally { LENDO_INT = false }
}

/* ---------- estados e prazos para filtros/alertas ---------- */
const dataPrazoIntim = i => { const q = i.compromisso_id ? DB.compromissos.find(c => c.id === i.compromisso_id) : null; if (q) return q.status === 'pendente' ? { d: diaDe(dataDoCompromisso(q)), tipo: 'criado' } : null; return i.prazo && i.prazo.estado === 'sugerido' ? { d: i.prazo.sugerida_em, tipo: 'sugerido' } : null }
const semVinculo = i => !i.processo_id && !i.contato_id
const FILTROS_INT = [
  ['novas', 'Novas', i => !i.lida && i.status === 'a_tratar'],
  ['a_tratar', 'A tratar', i => i.status === 'a_tratar'],
  ['sem_vinculo', 'Não vinculadas', i => i.status === 'a_tratar' && semVinculo(i)],
  ['revisar', 'Prazo a revisar', i => i.status === 'a_tratar' && i.prazo && i.prazo.estado === 'revisar' && !i.compromisso_id],
  ['proximo', 'Prazo próximo', i => { const p = i.status === 'a_tratar' && dataPrazoIntim(i); return !!p && p.d >= hojeISO() && p.d <= somarDias(hojeISO(), 7) }],
  ['vencido', 'Prazo vencido', i => { const p = i.status === 'a_tratar' && dataPrazoIntim(i); return !!p && p.d < hojeISO() }],
  ['vinculadas', 'Vinculadas', i => !semVinculo(i)],
  ['tratada', 'Tratadas (histórico)', i => i.status === 'tratada'],
  ['todas', 'Todas', () => true],
]
const intimacoesNovas = () => DB.intimacoes.filter(i => !i.lida && i.status === 'a_tratar').length

/* ---------- detalhe ---------- */
function abrirIntimacao(i) {
  if (!i.lida) { i.lida = true; hist(i, 'Aberta (marcada como lida).'); salvar('intimacoes') }
  const corpo = h('div', { class: 'space-y-4', 'data-testid': 'intim-detalhe' }); let alvoProc = i.processo_id || ''
  const des = () => {
    const proc = i.processo_id ? processo(i.processo_id) : null; const pz = i.prazo || { estado: 'nenhum' }; const ativo = (CONFIG.escritorio || {})
    corpo.replaceChildren(
      h('div', { class: 'flex flex-wrap items-center gap-2' }, badge(i.tipo, 'cinza'), semVinculo(i) ? badge('Não vinculada', 'ambar') : badge('Vinculada' + (i.vinculo === 'automatico' ? ' (automática)' : ' (manual)'), 'verde'), i.status === 'tratada' ? badge('Tratada', 'verde') : null, i.repetida_de ? badge('Parece repetida (#' + i.repetida_de + ')', 'ambar') : null, i.fonte === 'email' && !i.remetente_oficial ? badge('Remetente não oficial', 'vermelho') : null),
      i.fonte === 'email' && !i.remetente_oficial ? alerta('aviso', 'Confira a origem', 'Este e-mail não veio de um domínio .jus.br nem de um remetente que você marcou como confiável. Confirme no sistema do tribunal antes de agir (golpes imitam intimações).') : null,
      h('div', { class: 'grid gap-x-4 gap-y-1 sm:grid-cols-2 text-sm' }, h('p', {}, h('b', {}, 'Processo: '), i.numero_cnj || 'não identificado no texto'), h('p', {}, h('b', {}, 'Tribunal: '), i.tribunal || '—'), h('p', {}, h('b', {}, 'Pessoa: '), i.contato_id ? nomeContato(i.contato_id) : '—'), h('p', {}, h('b', {}, 'Demanda: '), i.caso_id ? nomeDemanda(i.caso_id) : '—'), h('p', {}, h('b', {}, 'Recebida em: '), i.recebida_em ? dataHora(i.recebida_em) : dataLonga(i.created_at)), h('p', {}, h('b', {}, 'Publicação: '), dataLonga(i.data_publicacao) + (i.data_estimada ? ' (data do e-mail: o texto não traz a de publicação)' : '')), h('p', {}, h('b', {}, 'Origem: '), i.fonte === 'email' ? 'e-mail de ' + (i.remetente || '?') : i.fonte === 'manual' || !i.fonte ? 'registrada por você' : i.fonte), i.link ? h('p', {}, h('a', { href: i.link, target: '_blank', rel: 'noopener', class: 'underline' }, 'Abrir o e-mail no Gmail')) : null),
      h('div', {}, h('p', { class: 'section-label mb-1' }, 'Texto'), h('div', { class: 'whitespace-pre-wrap text-sm rounded-2xl border border-gray-200 dark:border-zinc-700 p-3 max-h-56 overflow-y-auto', 'data-testid': 'intim-texto' }, i.texto)),
      semVinculo(i) || !i.processo_id ? h('div', { class: 'rounded-2xl border border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-2' }, h('p', { class: 'text-sm font-semibold' }, 'Vincular a um processo'), h('select', { class: 'modal-input', 'data-testid': 'intim-processo', onchange: ev => { alvoProc = ev.target.value ? Number(ev.target.value) : '' } }, h('option', { value: '' }, 'Escolha o processo…'), DB.processos.map(p => h('option', { value: p.id, selected: p.id === alvoProc }, (p.numero || p.orgao || 'Processo ' + p.id) + ' · ' + nomeContato(p.contato_id)))), btn('Vincular', { mini: true, tid: 'intim-vincular', onclick: () => { if (!alvoProc) { aviso('Escolha o processo.', 'erro'); return } const p = processo(alvoProc); i.processo_id = p.id; i.caso_id = p.caso_id || null; i.contato_id = p.contato_id || null; i.vinculo = 'manual'; hist(i, 'Vinculada manualmente ao processo ' + (p.numero || p.id) + '.'); salvar('intimacoes'); des(); render() } })) : h('div', { class: 'flex items-center gap-2 text-sm' }, h('span', {}, 'Vinculada ao processo ', h('b', {}, proc ? proc.numero : '—')), btn('Desvincular', { mini: true, tipo: 'fantasma', tid: 'intim-desvincular', onclick: () => { i.processo_id = null; i.caso_id = null; i.contato_id = null; i.vinculo = null; hist(i, 'Vínculo removido.'); salvar('intimacoes'); des(); render() } })),
      h('div', { class: 'rounded-2xl border p-3 space-y-2 ' + (pz.estado === 'sugerido' ? 'border-secondary/50 bg-secondary/5' : pz.estado === 'revisar' ? 'border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20' : 'border-gray-200 dark:border-zinc-700'), 'data-testid': 'intim-prazo' },
        h('p', { class: 'text-sm font-semibold' }, pz.estado === 'sugerido' ? 'Prazo SUGERIDO (não criado): ' + dataLonga(pz.sugerida_em) : pz.estado === 'revisar' ? 'Prazo a REVISAR' : 'Nenhum prazo identificado no texto'),
        pz.motivo ? h('p', { class: 'text-xs text-gray-600 dark:text-zinc-300' }, pz.motivo) : h('p', { class: 'text-xs text-gray-500' }, 'Se houver prazo, defina-o você na calculadora. O CRM só sugere quando o texto é claro.'),
        pz.candidatos && pz.candidatos.length ? h('ul', { class: 'text-[11px] text-gray-500 list-disc pl-4' }, pz.candidatos.map(c => h('li', {}, '“…' + c.trecho + '…”'))) : null,
        i.compromisso_id ? h('p', { class: 'text-xs text-green-700 dark:text-green-400' }, '✓ Prazo criado na Agenda.') : h('div', { class: 'flex flex-wrap gap-2' }, btn(pz.estado === 'sugerido' ? 'Criar prazo com esta data (você confere)' : 'Criar prazo…', { mini: true, icone: 'ph:hourglass-high-bold', tid: 'intim-criar-prazo', onclick: () => { APOS_CRIAR_COMPROMISSO = q => { i.compromisso_id = q.id; hist(i, 'Prazo criado por você na Agenda para ' + dataLonga(q.data_limite) + '.'); salvar('intimacoes') }; editarCompromisso(null, { tipo: 'prazo', titulo: 'Prazo: ' + i.tipo + (i.numero_cnj ? ' — ' + i.numero_cnj : ''), contato_id: i.contato_id || '', caso_id: i.caso_id || '', processo_id: i.processo_id || '', data_publicacao: i.data_publicacao, data_limite: pz.estado === 'sugerido' ? pz.sugerida_em : '', observacao: 'Origem: intimação #' + i.id + '. ' + (pz.motivo || 'Prazo definido manualmente.') }) } }), btn('Calculadora de prazos', { mini: true, tipo: 'fantasma', icone: 'ph:calculator-bold', onclick: () => calculadoraPrazo() }))),
      h('div', {}, h('p', { class: 'section-label mb-1' }, 'Histórico'), h('ol', { class: 'text-xs text-gray-600 dark:text-zinc-300 space-y-0.5', 'data-testid': 'intim-historico' }, (i.historico || []).map(x => h('li', {}, dataHora(x.em) + ' — ' + x.texto)))))
  }
  des()
  modal({ titulo: 'Intimação / publicação', largura: 'max-w-3xl', corpo, aoFechar: render, rodape: fechar => [btn('Excluir', { tipo: 'perigo', tid: 'intim-excluir', onclick: () => confirmar('Excluir esta intimação do CRM?', 'Use para e-mails que não eram intimação. O e-mail no Gmail não é alterado, mas ele pode ser importado de novo na próxima busca.', 'Excluir', () => { DB.intimacoes = DB.intimacoes.filter(x => x.id !== i.id); salvar('intimacoes'); fechar(); render() }) }), i.status === 'a_tratar' ? btn('Marcar como tratada', { tid: 'intim-tratada', onclick: () => { i.status = 'tratada'; hist(i, 'Marcada como tratada.'); salvar('intimacoes'); fechar(); aviso('Intimação tratada.'); render() } }) : btn('Reabrir', { tipo: 'sec', tid: 'intim-reabrir', onclick: () => { i.status = 'a_tratar'; hist(i, 'Reaberta.'); salvar('intimacoes'); fechar(); render() } })] })
}

/* ---------- tela ---------- */
UI.intim = { f: 'a_tratar', ...(UI.intim || {}) }
VIEWS.intimacoes = () => {
  const cfg = INT_CFG(); const f = FILTROS_INT.some(x => x[0] === UI.intim.f) ? UI.intim.f : 'a_tratar'; const def = FILTROS_INT.find(x => x[0] === f)
  const itens = DB.intimacoes.filter(def[2]).sort((a, b) => String(b.recebida_em || b.created_at).localeCompare(String(a.recebida_em || a.created_at)))
  formIntimacao = (i, pad) => modalForm(i ? 'Editar intimação' : 'Registrar intimação', [{ chave: 'contato_id', rotulo: 'Cliente (opcional)', tipo: 'select', opcoes: [['', '— não vinculada —'], ...opcoesContatos()], numerico: true }, { chave: 'processo_id', rotulo: 'Processo', tipo: 'select', opcoes: [['', '— nenhum —'], ...DB.processos.map(x => [x.id, x.numero || x.orgao])], numerico: true }, { chave: 'tipo', rotulo: 'Tipo', tipo: 'select', opcoes: CRM.TIPOS_INTIMACAO }, { chave: 'data_publicacao', rotulo: 'Data da publicação', tipo: 'data', obrigatorio: true }, { chave: 'texto', rotulo: 'Texto / resumo', tipo: 'textarea', obrigatorio: true }], i || { tipo: 'Despacho', data_publicacao: hojeISO(), ...(pad || {}) }, v => { const p = v.processo_id ? processo(v.processo_id) : null; if (i) Object.assign(i, v); else { const n = { id: proximoId('intimacoes'), created_at: agora(), recebida_em: agora(), fonte: 'manual', lida: true, caso_id: p?.caso_id || null, status: 'a_tratar', prazo_dias: null, observacao: null, numero_cnj: p ? p.numero : null, vinculo: p ? 'manual' : null, historico: [], prazo: { estado: 'nenhum' }, ...v, contato_id: v.contato_id || (p ? p.contato_id : null) || null }; hist(n, 'Registrada manualmente por você.'); DB.intimacoes.push(n) } salvar('intimacoes') })
  const campo = (rot, k, ph, tid) => h('label', { class: 'block' }, rotuloCampo(rot), (() => { const t = h('input', { class: 'modal-input !text-sm', placeholder: ph, 'data-testid': tid }); t.value = cfg[k] || ''; t.addEventListener('change', () => { cfg[k] = t.value.trim(); salvar('config') }); return t })())
  const fonte = h('details', { class: 'painel !p-4', open: !CONFIG.integr.intim_ok, 'data-testid': 'intim-fonte' }, h('summary', { class: 'cursor-pointer text-sm font-semibold flex items-center gap-2' }, ic('ph:envelope-simple-bold'), 'De onde vêm as intimações', badge(CONFIG.integr.intim_ok ? 'E-mail ligado' : 'E-mail não testado', CONFIG.integr.intim_ok ? 'verde' : 'cinza')),
    h('div', { class: 'mt-3 space-y-3' },
      h('ul', { class: 'text-xs text-gray-600 dark:text-zinc-300 space-y-1 list-disc pl-5' }, h('li', {}, h('b', {}, 'E-mail (Gmail): '), 'REAL. O CRM lê os e-mails de intimação/publicação da sua conta quando você clica em “Buscar no e-mail” e, depois da primeira busca bem-sucedida, ao abrir o CRM. Só entra e-mail com número de processo válido (CNJ) ou de remetente que você marcar como confiável.'), h('li', {}, h('b', {}, 'Colar o texto: '), 'REAL, manual (botão “Ler texto de intimação”).'), h('li', {}, h('b', {}, 'PUSH / API do CNJ (DJEN): '), 'NÃO é possível aqui. O Artifact não recebe notificações e só roda com o CRM aberto; a API oficial do CNJ recusa acesso de fora do Brasil (testei a partir do seu Supabase, nos EUA: bloqueio 403). Exigiria um servidor no Brasil, fora do Artifact.')),
      h('div', { class: 'grid gap-3 sm:grid-cols-3' }, campo('Remetentes confiáveis (domínios ou e-mails, separados por vírgula)', 'remetentes', 'ex.: tjba.jus.br, jusbrasil.com.br', 'intim-remetentes'), campo('Palavras extras da busca (opcional)', 'palavras', 'ex.: Astrea, monitoramento', 'intim-palavras'), campo('Buscar e-mails dos últimos (dias)', 'dias', '30', 'intim-dias')),
      h('p', { class: 'text-[11px] text-gray-500' }, 'Domínios .jus.br já são considerados oficiais. Se você recebe resumos de publicações de um serviço (Jusbrasil, Astrea, Digesto…), coloque o domínio dele acima. Um e-mail com vários processos vira uma intimação por processo.'),
      h('p', { class: 'text-[11px] text-gray-400' }, cfg.ultima_busca ? 'Última busca: ' + dataHora(cfg.ultima_busca) : 'Nenhuma busca feita ainda.')))
  return pagina('Intimações', 'Publicações recebidas, vinculadas ao processo e com prazo só depois da sua conferência. Nada é criado sozinho.', [btn('Buscar no e-mail', { icone: 'ph:envelope-simple-bold', tid: 'buscar-intimacoes', onclick: () => buscarIntimacoesNoEmail() }), btn('Ler texto de intimação', { tipo: 'sec', icone: 'ph:sparkle-bold', onclick: abrirAnaliseIntimacao, tid: 'ler-intimacao' }), btn('Registrar intimação', { tipo: 'sec', icone: 'ph:plus-bold', onclick: () => formIntimacao(null), tid: 'nova-intimacao' })],
    fonte,
    h('div', { class: 'flex flex-wrap gap-1.5' }, FILTROS_INT.map(([id, nome, fn]) => h('button', { type: 'button', class: 'filtro ' + (id === f ? 'filtro-ativo' : ''), 'data-testid': 'intim-filtro-' + id, onclick: () => { UI.intim.f = id; render() } }, `${nome} (${DB.intimacoes.filter(fn).length})`))),
    itens.length ? h('div', { class: 'space-y-2' }, itens.map(i => { const pz = dataPrazoIntim(i); return h('div', { class: 'painel !p-4 flex flex-wrap items-start gap-3 ' + (!i.lida && i.status === 'a_tratar' ? 'border-l-4 !border-l-secondary' : ''), 'data-testid': 'intimacao' }, ic('ph:megaphone-bold', 'text-xl text-primary dark:text-cafe-creme mt-0.5'),
      h('div', { class: 'min-w-0 flex-1 basis-64' }, h('p', { class: 'font-semibold text-sm flex flex-wrap items-center gap-1.5' }, i.tipo, !i.lida && i.status === 'a_tratar' ? badge('Nova', 'roxo') : null, semVinculo(i) ? badge('Não vinculada', 'ambar') : badge(nomeContato(i.contato_id) || 'Vinculada', 'verde'), i.prazo && i.prazo.estado === 'revisar' && !i.compromisso_id ? badge('Prazo a revisar', 'ambar') : null, pz ? badge((pz.tipo === 'criado' ? 'Prazo ' : 'Prazo sugerido ') + dataLonga(pz.d), pz.d < hojeISO() && i.status === 'a_tratar' ? 'vermelho' : 'azul') : null), h('p', { class: 'text-[11px] text-gray-500' }, (i.numero_cnj || 'sem número de processo') + ' · publicação ' + dataLonga(i.data_publicacao) + (i.fonte === 'email' ? ' · e-mail' : '')), h('p', { class: 'text-sm text-gray-600 dark:text-zinc-300 mt-1 line-clamp-2' }, i.texto)),
      btn('Abrir', { mini: true, tid: 'intim-abrir', onclick: () => abrirIntimacao(i) })) })) : estadoVazio('ph:megaphone-bold', f === 'a_tratar' || f === 'todas' ? 'Nenhuma intimação no CRM' : 'Nada nesta visão', f === 'a_tratar' || f === 'todas' ? 'Clique em “Buscar no e-mail” para trazer as intimações que chegaram ao seu Gmail, ou registre uma manualmente. Nada aqui é de exemplo.' : 'Mude o filtro acima.'))
}
/* limpeza única: as 2 intimações de exemplo das versões antigas não existem mais */
function migrarIntimacoesExemplo() {
  if (CONFIG.v_sem_intim_exemplo) return
  const EX = ['Intime-se o inventariante para se manifestar sobre o laudo de avaliação em 15 dias.', 'Designada audiência de conciliação.']
  DB.intimacoes = DB.intimacoes.filter(i => i.fonte || !EX.includes(i.texto)); CONFIG.v_sem_intim_exemplo = true; salvar('intimacoes'); salvar('config')
}
