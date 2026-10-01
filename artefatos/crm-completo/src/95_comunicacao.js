'use strict'
/* ============ Comunicação: um só lugar para WhatsApp, e-mail, ligações e reuniões ============
   REAL aqui:     registrar/ver o histórico por cliente e por demanda; abrir o WhatsApp com a mensagem pronta; modelos com variáveis;
                  e-mail pelo conector Gmail da sua conta (buscar, importar, rascunho, enviar) — quando você autoriza.
   NÃO ocorre aqui: receber mensagem de WhatsApp automaticamente nem enviá-la sem você tocar no aplicativo (precisa de servidor + API oficial). */
UI.com = { aba: 'caixa', sel: null, canal: 'todos', q: '', so_sem_resposta: false }
const MCP = { api: undefined }
async function obterMcp() { if (MCP.api !== undefined) return MCP.api; try { MCP.api = window.claude && window.claude.use ? await window.claude.use('mcp') : null } catch (e) { MCP.api = null } return MCP.api }
const erroCopy = e => { const c = e && e.code; return c === 'not_granted' || c === 'permission_denied' ? 'Você não autorizou o acesso ao Gmail para este CRM.' : c === 'server_not_connected' ? 'O conector Gmail não está conectado à sua conta.' : c === 'indisponivel' ? 'O conector de e-mail não está disponível neste ambiente.' : c === 'rate_limited' ? 'Muitas chamadas seguidas; tente de novo em instantes.' : 'Não consegui falar com o Gmail agora' + (e && e.message ? ' (' + String(e.message).slice(0, 80) + ')' : '') + '.' }
async function gmail(tool, input) { const m = await obterMcp(); if (!m) throw { code: 'indisponivel' }; const r = await m.callTool('Gmail', tool, input, { cache: false }); return r && r.payload !== undefined ? r.payload : r }
const emailDe = s => { const m = String(s || '').match(/<([^>]+)>/); return (m ? m[1] : String(s || '')).trim().toLowerCase() }
const baseB64 = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = no; r.readAsDataURL(f) })

/* ---------- importar e-mails do Gmail para o CRM (dedup por id da mensagem) ---------- */
async function importarThreads(threads, achaContato) {
  let novos = 0
  for (const t of threads.slice(0, 12)) {
    let msgs = []
    try { const r = await gmail('get_thread', { threadId: t.id, messageFormat: 'PLAIN_TEXT' }); msgs = (r && r.messages) || [] } catch (e) { msgs = t.messages || [] }
    for (const m of msgs) {
      if (!m.id || DB.comunicacoes.some(x => x.ext_id === m.id)) continue
      const rem = emailDe(m.sender); const dest = (m.to_recipients || m.toRecipients || []).map(emailDe); const rotulos = m.labelIds || m.label_ids || []; const dono = (CONFIG.escritorio.email || '').toLowerCase()
      const c = achaContato(rem, dest); if (!c) continue
      const entrada = rem === (c.email || '').toLowerCase()
      novaComunicacao({ contato_id: c.id, canal: 'email', direcao: entrada ? 'entrada' : 'saida', assunto: m.subject || '(sem assunto)', texto: String(m.plaintext_body || m.plaintextBody || m.snippet || '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 4000), anexos: (m.attachments || []).map(a => ({ nome: a.filename || 'anexo' })), origem: 'gmail', ext_id: m.id, link: m.viewUrl || m.view_url || t.viewUrl || t.view_url || null, lida: entrada ? !rotulos.includes('UNREAD') : true, created_at: m.date ? new Date(m.date).toISOString() : agora() })
      novos++
    }
  }
  return novos
}
async function sincronizarEmailsDe(c) {
  if (!c.email) { aviso('Este cadastro não tem e-mail.', 'erro'); return 0 }
  try { const r = await gmail('search_threads', { query: `from:${c.email} OR to:${c.email} newer_than:365d`, pageSize: 15, view: 'THREAD_VIEW_MINIMAL' }); const n = await importarThreads((r && r.threads) || [], (rem, dest) => (rem === c.email.toLowerCase() || dest.includes(c.email.toLowerCase())) ? c : null); CONFIG.email_sync = agora(); salvar('config'); aviso(n ? `${plural(n, 'e-mail importado', 'e-mails importados')}.` : 'Nenhum e-mail novo.'); return n } catch (e) { aviso(erroCopy(e), 'erro'); return 0 }
}
async function verificarNovosEmails() {
  const com = DB.contatos.filter(c => c.email).slice(0, 25); if (!com.length) { aviso('Nenhum cadastro com e-mail.', 'erro'); return }
  try { const r = await gmail('search_threads', { query: '(' + com.map(c => 'from:' + c.email).join(' OR ') + ') newer_than:14d', pageSize: 30, view: 'THREAD_VIEW_MINIMAL' }); const n = await importarThreads((r && r.threads) || [], (rem) => com.find(c => c.email.toLowerCase() === rem) || null); CONFIG.email_sync = agora(); salvar('config'); aviso(n ? `${plural(n, 'e-mail novo', 'e-mails novos')} de clientes.` : 'Nenhum e-mail novo de clientes.'); render() } catch (e) { aviso(erroCopy(e), 'erro') }
}

/* ---------- conversa de uma pessoa (e, opcionalmente, de uma demanda) + compositor ---------- */
function Thread(cid, opc = {}) {
  const c = contato(cid); if (!c) return estadoVazio('ph:chats-circle-bold', 'Contato não encontrado')
  const E = { canal: opc.canal || UI.com.canalComp || 'whatsapp', caso: opc.caso != null ? String(opc.caso) : '', anexos: [] }
  const raiz = h('div', { class: 'space-y-3', 'data-testid': 'thread' })
  const casosDe = demandasDe(c.id)
  const bolha = m => {
    const entrada = m.direcao === 'entrada'; const cor = entrada ? 'bg-white dark:bg-zinc-800 rounded-bl-sm' : 'bg-primary text-white rounded-br-sm'
    return h('div', { class: 'flex ' + (entrada ? '' : 'justify-end'), 'data-testid': 'msg' }, h('div', { class: 'max-w-[85%] rounded-2xl px-3 py-2 text-sm ' + cor },
      h('p', { class: 'text-[10px] font-bold uppercase tracking-wider opacity-70 flex items-center gap-1' }, ic(CANAIS[m.canal][1]), CANAIS[m.canal][0], m.origem === 'gmail' ? ' · Gmail' : '', m.caso_id ? ' · ' + (nomeDemanda(m.caso_id) || '').slice(0, 28) : ''),
      m.assunto ? h('p', { class: 'font-semibold mt-0.5' }, m.assunto) : null, h('p', { class: 'whitespace-pre-line mt-0.5' }, m.texto),
      m.anexos && m.anexos.length ? h('p', { class: 'text-[11px] mt-1 opacity-80 flex items-center gap-1' }, ic('ph:paperclip-bold'), m.anexos.map(a => a.nome).join(', ')) : null,
      h('p', { class: 'text-[10px] opacity-60 text-right mt-0.5 flex justify-end gap-2 items-center' }, !m.caso_id && casosDe.length ? h('select', { class: 'bg-transparent text-[10px] max-w-[9rem]', 'aria-label': 'Vincular à demanda', onchange: ev => { m.caso_id = Number(ev.target.value) || null; salvar('comunicacoes'); desenhar() } }, h('option', { value: '' }, 'vincular à demanda…'), casosDe.map(d => h('option', { value: d.id }, d.titulo))) : null, m.link ? h('a', { href: m.link, target: '_blank', rel: 'noopener', class: 'underline' }, 'abrir no Gmail') : null, quandoRelativo(m.created_at))))
  }
  const casoSel = h('select', { class: 'selecao text-xs', 'aria-label': 'Vincular esta comunicação à demanda', 'data-testid': 'comp-caso', onchange: ev => { E.caso = ev.target.value } }, h('option', { value: '' }, 'Sem demanda'), casosDe.map(d => h('option', { value: d.id, selected: String(d.id) === E.caso }, d.titulo)))
  const vinculo = () => ({ caso_id: E.caso ? Number(E.caso) : null })
  const texto = h('textarea', { class: 'modal-input', rows: 4, placeholder: 'Escreva aqui. Digite /atalho para usar um modelo.', 'data-testid': 'comp-texto', 'aria-label': 'Texto' })
  const assunto = h('input', { class: 'modal-input', placeholder: 'Assunto', 'data-testid': 'email-assunto', 'aria-label': 'Assunto' }); const para = h('input', { class: 'modal-input', type: 'email', value: c.email || '', placeholder: 'e-mail do destinatário', 'data-testid': 'email-para', 'aria-label': 'Destinatário' })
  if (opc.texto) texto.value = opc.texto
  if (opc.atalho) { const m = DB.modelos.find(x => x.atalho === opc.atalho); if (m) { texto.value = preencherModelo(m.texto, c); assunto.value = m.titulo } }
  texto.addEventListener('input', () => { if (/^\/[\w-]+$/.test(texto.value.trim())) { const m = DB.modelos.find(x => x.atalho === texto.value.trim()); if (m) { texto.value = preencherModelo(m.texto, c); if (!assunto.value) assunto.value = m.titulo } } })
  const modelos = h('select', { class: 'selecao text-xs max-w-[12rem]', 'aria-label': 'Inserir modelo', onchange: ev => { const m = DB.modelos.find(x => x.atalho === ev.target.value); ev.target.value = ''; if (m) { texto.value = preencherModelo(m.texto, c); if (!assunto.value) assunto.value = m.titulo } } }, h('option', { value: '' }, 'Inserir modelo…'), DB.modelos.filter(m => m.ativo !== false).map(m => h('option', { value: m.atalho }, m.atalho + ' ' + m.titulo)))
  const faltam = () => { const f = [...new Set(texto.value.match(/\[[^\]]+\]/g) || [])]; return f }
  const bloqueiaColchetes = () => { const f = faltam(); if (f.length) { aviso('Falta preencher: ' + f.slice(0, 4).join(', '), 'erro'); return true } return false }
  const iaBtn = btn('Sugerir com IA', { mini: true, tipo: 'sec', icone: 'ph:sparkle-bold', class: 'ia-btn', tid: 'ia-sugerir', onclick: () => sugerirResposta(c, E.canal, texto, E.caso ? Number(E.caso) : null, assunto) })
  const enviarEmail = async (modo) => {
    if (!para.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para.value.trim())) { aviso('Informe um e-mail de destino válido.', 'erro'); return }
    if (!assunto.value.trim() || !texto.value.trim()) { aviso('Preencha assunto e texto.', 'erro'); return }
    if (bloqueiaColchetes()) return
    const anexos = []; for (const f of E.anexos) { if (f.size > 8 * 1024 * 1024) { aviso(`“${f.name}” passa de 8 MB.`, 'erro'); return } anexos.push({ filename: f.name, mimeType: f.type || 'application/octet-stream', content: await baseB64(f) }) }
    const inp = { to: [para.value.trim()], subject: assunto.value.trim(), body: texto.value.trim(), ...(anexos.length ? { attachments: anexos } : {}) }
    try {
      if (modo === 'rascunho') { const r = await gmail('create_draft', inp); aviso('Rascunho criado no Gmail. Revise e envie por lá.'); return r }
      const r = await gmail('send_message', inp)
      novaComunicacao({ contato_id: c.id, canal: 'email', direcao: 'saida', assunto: inp.subject, texto: inp.body, anexos: E.anexos.map(f => ({ nome: f.name })), origem: 'gmail', ext_id: r && r.id || null, ...vinculo() }); texto.value = ''; assunto.value = ''; E.anexos = []; aviso('E-mail enviado e registrado.'); desenhar(); render()
    } catch (e) { aviso(erroCopy(e), 'erro') }
  }
  const painelCanal = () => {
    if (E.canal === 'whatsapp') {
      const link = () => whatsappLink(c.telefone) + '?text=' + encodeURIComponent(texto.value)
      return h('div', { class: 'space-y-2' }, texto, h('div', { class: 'flex flex-wrap items-center gap-2' }, modelos, casoSel, iaBtn, h('a', { href: c.telefone ? link() : null, target: '_blank', rel: 'noopener', 'data-testid': 'wa-abrir', class: 'btn-mini inline-flex items-center gap-1.5 !px-4 !py-2 rounded-full bg-primary text-white dark:bg-cafe-creme dark:text-cafe', onclick: ev => { if (!texto.value.trim()) { ev.preventDefault(); aviso('Escreva a mensagem.', 'erro'); return } if (bloqueiaColchetes()) { ev.preventDefault(); return } ev.currentTarget.href = link(); novaComunicacao({ contato_id: c.id, canal: 'whatsapp', direcao: 'saida', texto: texto.value.trim(), ...vinculo() }); texto.value = ''; setTimeout(() => { desenhar(); render() }, 50) } }, ic('ph:whatsapp-logo-bold'), 'Abrir no WhatsApp e registrar'), btn('Registrar recebida', { mini: true, tipo: 'fantasma', tid: 'com-recebida', onclick: () => registrarRecebida(c, 'whatsapp', vinculo(), desenhar) })), h('p', { class: 'text-[11px] text-gray-400' }, 'O CRM abre o WhatsApp com o texto pronto e registra aqui; você toca em enviar no aplicativo. Receber mensagens automaticamente exige a API oficial do WhatsApp (servidor), que um artefato não tem.'))
    }
    if (E.canal === 'email') {
      const arq = h('input', { type: 'file', multiple: true, class: 'text-xs', 'aria-label': 'Anexos', onchange: ev => { E.anexos = [...ev.target.files]; lista_.textContent = E.anexos.map(f => f.name).join(', ') } }); const lista_ = h('span', { class: 'text-[11px] text-gray-500' })
      return h('div', { class: 'space-y-2' }, h('div', { class: 'grid gap-2 sm:grid-cols-2' }, para, assunto), texto, h('div', { class: 'flex flex-wrap items-center gap-2' }, modelos, casoSel, iaBtn, arq, lista_), h('div', { class: 'flex flex-wrap gap-2' }, btn('Criar rascunho no Gmail', { mini: true, tipo: 'sec', icone: 'ph:note-pencil-bold', tid: 'email-rascunho', onclick: () => enviarEmail('rascunho') }), btn('Enviar pelo Gmail', { mini: true, icone: 'ph:paper-plane-tilt-bold', tid: 'email-enviar', onclick: () => { if (!texto.value.trim()) return; confirmar('Enviar e-mail agora?', `Para ${para.value} — “${assunto.value}”. O envio sai da sua conta Gmail e não pode ser desfeito.`, 'Enviar', () => enviarEmail('enviar'), false) } }), btn('Buscar e-mails deste cliente', { mini: true, tipo: 'fantasma', icone: 'ph:arrows-clockwise-bold', tid: 'email-sync', onclick: async () => { await sincronizarEmailsDe(c); desenhar(); render() } }), btn('Registrar recebido', { mini: true, tipo: 'fantasma', onclick: () => registrarRecebida(c, 'email', vinculo(), desenhar) })), h('p', { class: 'text-[11px] text-gray-400' }, 'Usa o conector Gmail da sua conta (você autoriza ao usar). Anexos até 8 MB, enviados junto. Sem o conector, os botões avisam e nada é enviado.'))
    }
    return h('div', { class: 'space-y-2' }, h('p', { class: 'text-xs text-gray-500' }, 'Registre uma ligação, reunião ou anotação de contato para manter o histórico completo.'), btn('Registrar contato', { mini: true, icone: 'ph:plus-bold', tid: 'registrar-contato', onclick: () => modalForm('Registrar contato — ' + c.nome, [{ chave: 'canal', rotulo: 'Tipo', tipo: 'select', opcoes: [['ligacao', 'Ligação'], ['reuniao', 'Reunião'], ['whatsapp', 'WhatsApp'], ['email', 'E-mail'], ['nota', 'Anotação']] }, { chave: 'direcao', rotulo: 'Quem iniciou', tipo: 'select', opcoes: [['saida', 'Eu / escritório'], ['entrada', 'A cliente']] }, { chave: 'caso_id', rotulo: 'Demanda', tipo: 'select', opcoes: [['', 'Sem demanda'], ...casosDe.map(d => [d.id, d.titulo])], numerico: true }, { chave: 'texto', rotulo: 'O que foi tratado', tipo: 'textarea', obrigatorio: true }], { canal: 'ligacao', direcao: 'saida', caso_id: E.caso ? Number(E.caso) : '' }, v => { novaComunicacao({ contato_id: c.id, ...v }) }) }))
  }
  const msgsEl = h('div', { class: 'rounded-2xl bg-[#e9e1d2] dark:bg-zinc-950 p-3 space-y-2 max-h-96 overflow-y-auto', 'data-testid': 'conversa' })
  const desenhar = () => {
    const ms = comunicacoesDe(c.id, opc.caso != null ? opc.caso : null); ms.forEach(m => { if (m.direcao === 'entrada') m.lida = true })
    msgsEl.replaceChildren(...(ms.length ? ms.map(bolha) : [estadoVazio('ph:chats-circle-bold', 'Sem comunicações' + (opc.caso != null ? ' nesta demanda' : ''), 'Registre a primeira abaixo.')]))
    raiz.replaceChildren(msgsEl, abasCanal(), painelCanal()); msgsEl.scrollTop = msgsEl.scrollHeight
  }
  const abasCanal = () => h('div', { class: 'flex gap-1.5' }, [['whatsapp', 'WhatsApp'], ['email', 'E-mail'], ['outro', 'Ligação / reunião']].map(([k, t]) => h('button', { type: 'button', class: 'filtro ' + (E.canal === k ? 'filtro-ativo' : ''), 'data-testid': 'comp-canal-' + k, onclick: () => { E.canal = k; UI.com.canalComp = k; desenhar() } }, t)))
  desenhar(); salvar('comunicacoes'); return raiz
}
function registrarRecebida(c, canal, vinc, depois) {
  modalForm('Registrar mensagem recebida — ' + c.nome, [...(canal === 'email' ? [{ chave: 'assunto', rotulo: 'Assunto' }] : []), { chave: 'texto', rotulo: 'Texto recebido (cole aqui)', tipo: 'textarea', obrigatorio: true }], {}, v => { novaComunicacao({ contato_id: c.id, canal, direcao: 'entrada', lida: true, ...vinc, ...v }); depois && depois() }, { rotulo: 'Registrar' })
}
function abrirComunicacao(cid, opc = {}) { const c = contato(cid); if (!c) return; modal({ titulo: 'Comunicação — ' + c.nome, largura: 'max-w-2xl', corpo: Thread(cid, opc), aoFechar: render }) }

/* ================= COMUNICAÇÃO (módulo: Caixa · Modelos) ================= */
VIEWS.caixa = () => {
  const { canal, q, so_sem_resposta } = UI.com; const conv = new Map()
  for (const m of DB.comunicacoes) { const k = m.contato_id; const a = conv.get(k) || { c: contato(k), ms: [] }; a.ms.push(m); conv.set(k, a) }
  let itens = [...conv.values()].filter(x => x.c).map(x => { x.ms.sort((a, b) => a.created_at.localeCompare(b.created_at)); x.ult = x.ms[x.ms.length - 1]; x.nao = x.ms.filter(m => m.direcao === 'entrada' && !m.lida).length; return x })
  itens = itens.filter(x => (canal === 'todos' || x.ms.some(m => m.canal === canal)) && (!q || semAcento(x.c.nome).includes(semAcento(q))) && (!so_sem_resposta || x.ult.direcao === 'entrada')).sort((a, b) => b.ult.created_at.localeCompare(a.ult.created_at))
  const sel = UI.com.sel && contato(UI.com.sel) ? UI.com.sel : (itens[0] && itens[0].c.id)
  const lista_ = h('div', { class: 'space-y-1.5 max-h-[34rem] overflow-y-auto', 'data-testid': 'com-lista' }, itens.length ? itens.map(x => h('button', { type: 'button', class: 'w-full text-left rounded-2xl border p-3 transition-colors ' + (x.c.id === sel ? 'border-primary bg-primary/5 dark:bg-white/5' : 'border-gray-200/70 dark:border-zinc-800 hover:border-primary/60'), 'data-testid': 'com-item', onclick: () => { UI.com.sel = x.c.id; render() } }, h('div', { class: 'flex items-center gap-2' }, avatar(x.c.nome), h('div', { class: 'min-w-0 flex-1' }, h('p', { class: 'font-semibold text-sm truncate' }, x.c.nome), h('p', { class: 'text-[11px] text-gray-500 truncate flex items-center gap-1' }, ic(CANAIS[x.ult.canal][1]), (x.ult.direcao === 'saida' ? 'Você: ' : '') + (x.ult.assunto || x.ult.texto))), h('div', { class: 'text-right shrink-0' }, h('p', { class: 'text-[10px] text-gray-400' }, quandoRelativo(x.ult.created_at)), x.nao ? h('span', { class: 'inline-flex min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold items-center justify-center' }, x.nao) : null)))) : estadoVazio('ph:chats-circle-bold', 'Nenhuma conversa', 'Registre a primeira comunicação a partir da ficha ou pelo botão “Nova comunicação”.'))
  const nova = () => modalForm('Nova comunicação', [{ chave: 'contato_id', rotulo: 'Pessoa', tipo: 'select', opcoes: DB.contatos.filter(c => c.etapa !== 'relacionado').map(c => [c.id, c.nome]), numerico: true, obrigatorio: true }], {}, v => { UI.com.sel = v.contato_id }, { rotulo: 'Abrir conversa' })
  return pagina('Caixa', null, [btn('WhatsApp do CRM do site', { tipo: 'sec', icone: 'ph:whatsapp-logo-bold', tid: 'sincronizar-wa', title: 'Importa (somente leitura) as mensagens que o CRM do site já recebeu', onclick: async () => { await sincronizarWhatsAppDoSite(); render() } }), btn('Buscar novos e-mails', { tipo: 'sec', icone: 'ph:arrows-clockwise-bold', tid: 'verificar-emails', onclick: verificarNovosEmails }), btn('Nova comunicação', { icone: 'ph:plus-bold', onclick: nova, tid: 'nova-com' })],
    h('div', { class: 'flex flex-wrap items-center gap-3' }, filtros([['todos', 'Todos'], ['whatsapp', 'WhatsApp'], ['email', 'E-mail'], ['ligacao', 'Ligação'], ['reuniao', 'Reunião']].map(([id, nome]) => ({ id, nome })), canal, id => { UI.com.canal = id; render() }), h('label', { class: 'flex items-center gap-2 text-sm' }, h('input', { type: 'checkbox', class: 'accent-[#6f5636]', checked: so_sem_resposta, onclick: () => { UI.com.so_sem_resposta = !so_sem_resposta; render() } }), 'Só sem resposta'), h('div', { class: 'w-full sm:w-64' }, busca(q, v => { UI.com.q = v; render() }, 'Buscar pessoa'))),
    CONFIG.email_sync ? h('p', { class: 'text-[11px] text-gray-400' }, 'Última busca de e-mails: ' + dataHora(CONFIG.email_sync)) : null,
    h('div', { class: 'grid gap-5 lg:grid-cols-[320px_1fr]' }, lista_, sel ? painel(nomeContato(sel), h('div', { class: 'flex flex-wrap gap-2 mb-3' }, btn('Abrir ficha', { mini: true, tipo: 'sec', onclick: () => abrirFicha(sel) }), (demandasDe(sel).length ? h('span', { class: 'text-[11px] text-gray-500 self-center' }, demandasDe(sel).map(d => d.titulo).join(' · ')) : null)), Thread(sel, {})) : painel(null, estadoVazio('ph:chats-circle-bold', 'Escolha uma conversa'))))
}
UI.comAbas = { aba: 'caixa' }
VIEWS.comunicacao = (p) => {
  if (p && p.aba) { UI.comAbas.aba = p.aba; R.p = {} } if (p && p.contato) { UI.com.sel = p.contato; UI.comAbas.aba = 'caixa'; R.p = {} }
  const A = UI.comAbas.aba
  return modulo({ titulo: 'Comunicação', sub: 'WhatsApp, e-mail, ligações e reuniões num só histórico, ligado à pessoa e à demanda.', abasDef: [{ id: 'caixa', nome: 'Caixa', icone: 'ph:chats-circle-bold', n: DB.comunicacoes.filter(m => m.direcao === 'entrada' && !m.lida).length || null }, { id: 'modelos', nome: 'Modelos', icone: 'ph:chat-circle-text-bold' }], ativa: A, aoMudar: id => { UI.comAbas.aba = id; render() }, conteudo: a => VIEWS[a === 'modelos' ? 'modelos' : 'caixa']() })
}
