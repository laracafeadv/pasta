'use strict'
/* ============ Trabalho: Dashboard, Hoje, Tarefas, Prazos, Intimações, Agenda + compositor de mensagens ============ */
let formIntimacao = () => {}
const UI = { hoje: { f: 'todos' }, tarefas: { f: 'abertas', q: '' }, prazos: { f: 'abertos' }, intim: { f: 'a_tratar' }, agenda: { mes: null } }
const saudacao = () => { const h_ = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone: TZ }).format(new Date())); return h_ < 12 ? 'Bom dia' : h_ < 18 ? 'Boa tarde' : 'Boa noite' }

/* ---- compositor de mensagem (modelos reais + variáveis [NOME], [DATA]…) ---- */
function preencherModelo(texto, c) {
  const e = CONFIG.escritorio; const dc = c?.consulta_em
  const mapa = { 'NOME': (c?.nome || '').split(' ')[0] || '[NOME]', 'SAUDAÇÃO': saudacao(), 'DRA': 'Dra. ' + (e.advogada_nome || 'Lara').split(' ')[0], 'DATA': dc ? dataLonga(dc) : '[DATA]', 'HORA': dc ? hhmm(dc) : '[HORA]', 'PLATAFORMA': e.plataforma_consulta || '[PLATAFORMA]', 'VALOR DA CONSULTA': e.valor_consulta || '[VALOR DA CONSULTA]', 'PIX': e.chave_pix || '[PIX]', 'DADOS BANCÁRIOS': e.dados_bancarios || '[DADOS BANCÁRIOS]', 'DURAÇÃO': e.duracao_consulta || '[DURAÇÃO]', 'LINK GOOGLE': e.link_avaliacao || '[LINK GOOGLE]' }
  return String(texto).replace(/\[([^\]]+)\]/g, (m, k) => mapa[k] ?? m)
}
const abrirMensagem = (contatoId, atalho) => abrirComunicacao(contatoId, { atalho })
const somarDiasUteis = (iso, n) => { let cur = iso, k = 0; while (k < n) { cur = somarDias(cur, 1); const w = CRM.dow(cur); if (w !== 0 && w !== 6) k++ } return cur }

/* ---- tarefa: formulário ---- */
const CAMPOS_TAREFA = () => [{ chave: 'titulo', rotulo: 'Tarefa', obrigatorio: true, largo: true }, { chave: 'prazo', rotulo: 'Data', tipo: 'data', obrigatorio: true, dica: 'Obrigatória: separa “hoje” de “depois”.' }, { chave: 'prioridade', rotulo: 'Prioridade', tipo: 'select', opcoes: Object.entries(CRM.PRIORIDADES_TAREFA) }, { chave: 'contato_id', rotulo: 'Cliente', tipo: 'select', opcoes: opcoesContatos(), numerico: true }, { chave: 'caso_id', rotulo: 'Demanda', tipo: 'select', opcoes: opcoesDemandas(), numerico: true }, { chave: 'descricao', rotulo: 'Detalhes', tipo: 'textarea' }]
function editarTarefa(t, padrao = {}) {
  modalForm(t ? 'Editar tarefa' : 'Nova tarefa', CAMPOS_TAREFA(), t || { prazo: hojeISO(), prioridade: 'media', ...padrao }, v => {
    if (t) Object.assign(t, v, { updated_at: agora() }); else DB.tarefas.push({ id: proximoId('tarefas'), concluida: false, processo_id: null, created_at: agora(), updated_at: agora(), ...v })
    if (v.contato_id) registrar(v.contato_id, 'Anotação', (t ? 'Tarefa editada: ' : 'Tarefa criada: ') + v.titulo, v.caso_id); salvar('tarefas')
  }, { extra: t ? btn('Excluir', { tipo: 'perigo', onclick: () => confirmar('Excluir tarefa?', 'Esta ação não pode ser desfeita.', 'Excluir', () => { DB.tarefas = DB.tarefas.filter(x => x.id !== t.id); salvar('tarefas'); render(); aviso('Tarefa excluída.') }) }) : null })
}
const nomeDemanda = id => demanda(id)?.titulo || ''
function linhaTarefa(t, compacto) {
  const s = t.concluida ? null : situacaoOf(t.prazo)
  return h('div', { class: 'flex flex-wrap items-start gap-x-3 gap-y-1.5 py-2.5', 'data-testid': 'tarefa' },
    h('input', { type: 'checkbox', class: 'mt-1 w-4 h-4 accent-[#6f5636]', checked: t.concluida, 'aria-label': 'Concluir: ' + t.titulo, onclick: () => { concluirTarefa(t, !t.concluida); render() }, 'data-testid': 'tarefa-check' }),
    h('div', { class: 'min-w-0 flex-1 basis-40' }, h('p', { class: 'text-sm font-semibold ' + (t.concluida ? 'line-through text-gray-400' : '') }, t.titulo), h('p', { class: 'text-[11px] text-gray-500 flex flex-wrap gap-x-2' }, t.contato_id ? h('button', { type: 'button', class: 'hover:underline', onclick: () => abrirFicha(t.contato_id) }, nomeContato(t.contato_id)) : null, t.caso_id ? h('span', {}, '· ' + nomeDemanda(t.caso_id)) : null)),
    compacto ? null : badge(CRM.PRIORIDADES_TAREFA[t.prioridade], t.prioridade === 'alta' ? 'vermelho' : t.prioridade === 'media' ? 'ambar' : 'cinza'),
    t.concluida ? badge('Concluída', 'verde') : badgeData(t.prazo), btnIcone('ph:pencil-simple-bold', 'Editar tarefa', () => editarTarefa(t)))
}

/* ================= INÍCIO (Hoje + indicadores do dia; antes eram Dashboard, Hoje e Secretária) ================= */
VIEWS.inicio = () => {
  const itens = hojeItens(); const leads = DB.contatos.filter(ehLead); const ativos = DB.contatos.filter(c => c.etapa === 'ativo')
  const aReceber = DB.lancamentos.filter(l => l.tipo === 'receber' && !l.pago_em).reduce((s, l) => s + l.valor, 0)
  const prox = DB.compromissos.filter(p => p.status === 'pendente' && p.tipo !== 'prazo' && diaDe(dataDoCompromisso(p)) >= hojeISO()).sort((a, b) => dataDoCompromisso(a).localeCompare(dataDoCompromisso(b))).slice(0, 4)
  EMBED = true; let hojeEl; try { hojeEl = VIEWS.hoje() } finally { EMBED = false }
  return pagina(`${saudacao()}, ${(CONFIG.perfil.nome || '').split(' ')[0]}`, new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }), [btn('Nova tarefa', { icone: 'ph:plus-bold', onclick: () => editarTarefa(null), tid: 'nova-tarefa-dash' }), btn('Novo contato', { tipo: 'sec', icone: 'ph:user-plus-bold', onclick: () => editarContato(null) })],
    grade(4, kpi('Pedem atenção', itens.length, 'lista abaixo'), kpi('Leads em aberto', leads.length, plural(leads.filter(c => c.etapa === 'novo').length, 'novo', 'novos'), () => ir('pessoas', { aba: 'funil' })), kpi('Clientes ativos', ativos.length, `${DB.demandas.filter(x => x.status === 'ativo' && x.tipo !== 'consultivo').length} demandas`, () => ir('pessoas', { aba: 'clientes' })), kpi('A receber', brl(aReceber), 'lançamentos em aberto', () => ir('financeiro'))),
    h('div', { class: 'grid gap-5 lg:grid-cols-[1fr_340px]' }, h('div', { class: 'min-w-0' }, painel('Hoje', hojeEl)), h('div', { class: 'space-y-5 min-w-0' },
      painel('Carga dos próximos 14 dias', graficoCarga()),
      painel('Próximos compromissos', prox.length ? lista(prox.map(p => [ic(CRM.TIPOS_COMPROMISSO[p.tipo].icone, 'text-lg text-primary dark:text-cafe-creme mt-0.5'), h('div', { class: 'min-w-0 flex-1' }, h('p', { class: 'font-semibold truncate' }, p.titulo), h('p', { class: 'text-[11px] text-gray-500' }, `${dataLonga(p.inicio)} · ${hhmm(p.inicio)}${p.local ? ' · ' + p.local : ''}`)), badge(diaRelativo(diaDe(p.inicio)), 'azul')])) : estadoVazio('ph:calendar-blank-bold', 'Agenda livre')))))
}

/* ================= HOJE ================= */
const TIPO_HOJE = { acao: ['Próximas ações', 'ph:arrow-fat-line-right-bold'], tarefa: ['Tarefas', 'ph:check-square-bold'], prazo: ['Prazos', 'ph:hourglass-high-bold'], intimacao: ['Intimações', 'ph:megaphone-bold'], mensagem: ['Mensagens', 'ph:chat-circle-text-bold'], aniversario: ['Aniversários', 'ph:cake-bold'], relatorio: ['Relatório semanal', 'ph:file-text-bold'] }
VIEWS.hoje = () => {
  const todos = hojeItens(); const f = UI.hoje.f
  const lista_ = f === 'todos' ? todos : todos.filter(i => i.tipo === f)
  const contagem = t => todos.filter(i => i.tipo === t).length
  const card = i => {
    const c = i.contato_id ? contato(i.contato_id) : null
    const acoes = []
    if (c && i.tipo === 'mensagem') acoes.push(btn('Responder', { mini: true, icone: 'ph:chats-circle-bold', onclick: () => abrirComunicacao(c.id), tid: 'hoje-msg' }))
    else if (c && i.tipo === 'relatorio') acoes.push(btn('Atualização', { mini: true, icone: 'ph:file-text-bold', onclick: () => abrirAtualizacao(c), tid: 'hoje-atualizacao' }))
    else if (c && i.modelo) acoes.push(btn('Mensagem', { mini: true, icone: 'ph:chat-circle-text-bold', onclick: () => abrirMensagem(c.id, i.modelo), tid: 'hoje-msg' }))
    if (i.tipo === 'acao') acoes.push(btn('Feito', { mini: true, tipo: 'sec', icone: 'ph:check-bold', onclick: () => abrirAndamento(c) }), btn('Adiar 1 dia', { mini: true, tipo: 'fantasma', onclick: () => { c.proxima_data = somarDias(hojeISO(), 1); salvar('contatos'); render() } }))
    if (i.tipo === 'tarefa') acoes.push(btn('Concluir', { mini: true, tipo: 'sec', icone: 'ph:check-bold', onclick: () => { concluirTarefa(por('tarefas', i.tarefa_id)); render() } }))
    if (i.tipo === 'prazo') acoes.push(btn('Cumprido', { mini: true, tipo: 'sec', icone: 'ph:check-bold', onclick: () => { const q = por('compromissos', i.compromisso_id); q.status = 'concluido'; q.concluido_em = agora(); salvar('compromissos'); render() } }))
    if (i.tipo === 'intimacao') acoes.push(btn('Tratar', { mini: true, tipo: 'sec', onclick: () => ir('intimacoes') }))
    if (i.tipo === 'mensagem') acoes.push(btn('Marcar lida', { mini: true, tipo: 'fantasma', onclick: () => { DB.comunicacoes.filter(m => m.contato_id === i.contato_id).forEach(m => { m.lida = true }); salvar('comunicacoes'); render() } }))
    return h('div', { class: 'flex flex-wrap items-center gap-3 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 px-4 py-3', 'data-testid': 'hoje-item' }, ic(TIPO_HOJE[i.tipo][1], 'text-xl text-primary dark:text-cafe-creme shrink-0'), h('div', { class: 'min-w-0 flex-1 basis-48' }, h('p', { class: 'text-sm font-semibold' }, i.titulo), c ? h('button', { type: 'button', class: 'text-xs text-gray-500 hover:underline', onclick: () => abrirFicha(c.id) }, c.nome) : null), i.atraso ? badge('Atrasado', 'vermelho') : null, badge(diaRelativo(i.quando), i.atraso ? 'vermelho' : 'ambar'), h('div', { class: 'flex flex-wrap gap-1.5' }, acoes))
  }
  return pagina('Hoje', null, null,
    h('div', { class: 'flex flex-wrap gap-1.5' }, [{ id: 'todos', nome: `Tudo (${todos.length})` }, ...Object.keys(TIPO_HOJE).filter(t => contagem(t)).map(t => ({ id: t, nome: `${TIPO_HOJE[t][0]} (${contagem(t)})` }))].map(x => h('button', { type: 'button', class: 'filtro ' + (x.id === f ? 'filtro-ativo' : ''), onclick: () => { UI.hoje.f = x.id; render() } }, x.nome))),
    lista_.length ? h('div', { class: 'space-y-2' }, lista_.map(card)) : estadoVazio('ph:sun-bold', 'Tudo em dia', 'Nada pede sua atenção agora. Que tal revisar o Remarketing ou os Leads?', btn('Ir para Leads', { onclick: () => ir('leads') })))
}
function abrirAndamento(c) {
  if (!c) return
  const cad = CRM.CADENCIA[c.etapa]
  modalForm('Registrar andamento — ' + c.nome, [{ chave: 'canal', rotulo: 'Como foi o contato', tipo: 'select', opcoes: [['whatsapp', 'WhatsApp'], ['email', 'E-mail'], ['ligacao', 'Ligação'], ['reuniao', 'Reunião'], ['nota', 'Só uma anotação']] }, { chave: 'texto', rotulo: 'O que aconteceu', tipo: 'textarea', obrigatorio: true }, { chave: 'proxima_acao', rotulo: 'Próxima ação', dica: cad ? 'Sugerida pela cadência da etapa: ' + cad.acao : null }, { chave: 'proxima_data', rotulo: 'Quando', tipo: 'data' }], { canal: 'whatsapp', proxima_acao: c.proxima_acao, proxima_data: c.proxima_data }, v => {
    novaComunicacao({ contato_id: c.id, canal: v.canal, direcao: 'saida', texto: v.texto }); const seq = CRM.SEQUENCIA_FOLLOWUP.find(s => s.se.test(c.proxima_acao || ''))
    c.proxima_acao = v.proxima_acao !== c.proxima_acao ? v.proxima_acao : (seq ? seq.acao : v.proxima_acao); c.proxima_data = v.proxima_data !== c.proxima_data ? v.proxima_data : (seq ? (seq.diasUteis ? somarDiasUteis(hojeISO(), seq.dias) : somarDias(hojeISO(), seq.dias)) : v.proxima_data); salvar('contatos')
  }, { rotulo: 'Registrar' })
}

/* ================= TAREFAS ================= */
VIEWS.tarefas = () => {
  const { f, q } = UI.tarefas; const h_ = hojeISO()
  const base = DB.tarefas.filter(t => !q || semAcento(t.titulo + nomeContato(t.contato_id)).includes(semAcento(q)))
  const conj = { abertas: base.filter(t => !t.concluida), hoje: base.filter(t => !t.concluida && t.prazo === h_), atrasadas: base.filter(t => !t.concluida && t.prazo < h_), concluidas: base.filter(t => t.concluida) }
  const itens = conj[f].sort((a, b) => a.prazo.localeCompare(b.prazo))
  return pagina('Tarefas', 'Algo que exige execução, acompanhamento ou prazo interno. Sempre com data.', [btn('Nova tarefa', { icone: 'ph:plus-bold', onclick: () => editarTarefa(null), tid: 'nova-tarefa' })],
    h('div', { class: 'flex flex-wrap items-center gap-3 justify-between' }, filtros([{ id: 'abertas', nome: `Abertas (${conj.abertas.length})` }, { id: 'hoje', nome: `Hoje (${conj.hoje.length})` }, { id: 'atrasadas', nome: `Atrasadas (${conj.atrasadas.length})` }, { id: 'concluidas', nome: `Concluídas (${conj.concluidas.length})` }], f, id => { UI.tarefas.f = id; render() }), h('div', { class: 'w-full sm:w-72' }, busca(q, v => { UI.tarefas.q = v; render() }, 'Buscar tarefa ou cliente'))),
    painel(null, itens.length ? h('div', { class: 'divide-y divide-gray-100 dark:divide-zinc-800' }, itens.map(t => linhaTarefa(t))) : estadoVazio('ph:check-square-bold', f === 'concluidas' ? 'Nenhuma tarefa concluída' : 'Nenhuma tarefa aqui', 'Crie uma tarefa com data para ela aparecer no Hoje.', btn('Nova tarefa', { onclick: () => editarTarefa(null) }))))
}

/* ================= PRAZOS ================= */
function linhaPrazo(p, compacto) {
  const dia = diaDe(dataDoCompromisso(p)); const s = p.status === 'concluido' ? null : situacaoOf(dia); const pr = p.processo_id ? processo(p.processo_id) : null
  return h('div', { class: 'flex flex-wrap items-start gap-x-3 gap-y-1.5 py-2.5', 'data-testid': 'prazo' },
    ic(CRM.TIPOS_COMPROMISSO[p.tipo].icone, 'text-lg text-primary dark:text-cafe-creme mt-0.5'),
    h('div', { class: 'min-w-0 flex-1 basis-40' }, h('p', { class: 'text-sm font-semibold ' + (p.status !== 'pendente' ? 'line-through text-gray-400' : '') }, p.titulo), h('p', { class: 'text-[11px] text-gray-500' }, [p.contato_id ? nomeContato(p.contato_id) : null, pr?.numero ? 'Proc. ' + pr.numero : null, p.dias_prazo ? `${p.dias_prazo} dias úteis desde ${dataLonga(p.data_publicacao)}` : null].filter(Boolean).join(' · '))),
    p.status === 'concluido' ? badge('Cumprido', 'verde') : badge((s === 'atrasado' ? 'Atrasado · ' : '') + dataCurta(dia) + ' · ' + diaRelativo(dia), sitCor(s)),
    compacto ? btnIcone('ph:check-bold', 'Marcar como cumprido', () => { p.status = 'concluido'; p.concluido_em = agora(); salvar('compromissos'); render(); aviso('Prazo cumprido.') }) : [p.status === 'pendente' ? btnIcone('ph:check-bold', 'Marcar como cumprido', () => { p.status = 'concluido'; p.concluido_em = agora(); salvar('compromissos'); render(); aviso('Prazo cumprido.') }) : btnIcone('ph:arrow-counter-clockwise-bold', 'Reabrir', () => { p.status = 'pendente'; salvar('compromissos'); render() }), btnIcone('ph:pencil-simple-bold', 'Editar', () => editarCompromisso(p))])
}
function editarCompromisso(p, padrao = {}) {
  const tipo = (p && p.tipo) || padrao.tipo || 'prazo'
  const campos = [{ chave: 'tipo', rotulo: 'Tipo', tipo: 'select', opcoes: Object.entries(CRM.TIPOS_COMPROMISSO).map(([k, v]) => [k, v.nome]) }, { chave: 'titulo', rotulo: 'Título', obrigatorio: true, largo: true }, { chave: 'contato_id', rotulo: 'Cliente', tipo: 'select', opcoes: opcoesContatos(), numerico: true }, { chave: 'caso_id', rotulo: 'Demanda', tipo: 'select', opcoes: opcoesDemandas(), numerico: true }, { chave: 'processo_id', rotulo: 'Processo', tipo: 'select', opcoes: [['', '— nenhum —'], ...DB.processos.map(x => [x.id, x.numero || x.orgao])], numerico: true }, { chave: 'data_limite', rotulo: 'Data-limite (prazos)', tipo: 'data' }, { chave: 'inicio', rotulo: 'Início (audiência/consulta/reunião)', tipo: 'datahora' }, { chave: 'local', rotulo: 'Local / plataforma' }, { chave: 'observacao', rotulo: 'Observação', tipo: 'textarea' }, ...(p ? [] : [{ chave: 'preparar', rotulo: 'Criar tarefa de preparação 3 dias úteis antes (só para prazos)', tipo: 'check', largo: true }])]
  modalForm(p ? 'Editar compromisso' : 'Novo compromisso', campos, p || { tipo, preparar: AUTO().preparacaoPrazo && tipo === 'prazo', ...padrao }, v => {
    if (v.tipo === 'prazo' && !v.data_limite) return { erro: 'Prazo precisa de data-limite (use a calculadora para chegar nela).' }
    if (v.tipo !== 'prazo' && !v.inicio && !v.data_limite) return { erro: 'Informe a data e hora.' }
    const prep = v.preparar; delete v.preparar
    if (p) Object.assign(p, v); else { DB.compromissos.push({ id: proximoId('compromissos'), status: 'pendente', data_publicacao: null, dias_prazo: null, ...v }); if (prep && v.tipo === 'prazo' && v.data_limite) { let d = v.data_limite, k = 0; while (k < 3) { d = somarDias(d, -1); const w = CRM.dow(d); if (w !== 0 && w !== 6) k++ } DB.tarefas.push({ id: proximoId('tarefas'), titulo: 'Preparar: ' + v.titulo, descricao: 'Criada automaticamente a partir do prazo.', concluida: false, prazo: d < hojeISO() ? hojeISO() : d, prioridade: 'alta', contato_id: v.contato_id, caso_id: v.caso_id, processo_id: v.processo_id, created_at: agora(), updated_at: agora() }); salvar('tarefas') } } salvar('compromissos')
  }, { extra: p ? [h('a', { href: linkGoogleAgenda(p), target: '_blank', rel: 'noopener', class: 'btn-mini inline-flex items-center gap-1 border border-gray-300 dark:border-zinc-700' }, ic('ph:google-logo-bold'), 'Adicionar ao Google Agenda'), btn('Baixar .ics', { mini: true, tipo: 'fantasma', onclick: () => baixarIcs([p], 'compromisso.ics') }), btn(p.gcal_id ? 'No Google Agenda ✔' : 'Criar no Google Agenda', { mini: true, tipo: 'sec', icone: 'ph:calendar-plus-bold', disabled: !!p.gcal_id, tid: 'gcal-criar', title: 'Cria o evento pelo conector Google Agenda da sua conta', onclick: async () => { if (await enviarAoGoogleAgenda(p)) { document.querySelector('[data-testid=fechar]')?.click(); render() } } }), btn('Excluir', { tipo: 'perigo', onclick: () => confirmar('Excluir compromisso?', 'Será removido da agenda e dos prazos.', 'Excluir', () => { DB.compromissos = DB.compromissos.filter(x => x.id !== p.id); salvar('compromissos'); render() }) })] : null })
}
function calculadoraPrazo() {
  const pub = h('input', { type: 'date', class: 'modal-input', value: hojeISO(), 'data-testid': 'calc-pub', 'aria-label': 'Data de publicação' })
  const dias = h('input', { type: 'number', class: 'modal-input', value: 15, min: 1, 'data-testid': 'calc-dias', 'aria-label': 'Dias do prazo' })
  const trib = h('select', { class: 'modal-input', 'data-testid': 'calc-trib', 'aria-label': 'Calendário' }, Object.entries(CRM.TRIBUNAIS).map(([k, v]) => h('option', { value: k }, v)))
  const modo = h('select', { class: 'modal-input', 'aria-label': 'Modo de contagem' }, h('option', { value: 'uteis' }, 'Dias úteis (CPC art. 219)'), h('option', { value: 'corridos' }, 'Dias corridos'))
  const res = h('div', { class: 'space-y-2', 'data-testid': 'calc-res' })
  const calc = () => {
    res.replaceChildren(); if (!pub.value || !(Number(dias.value) > 0)) { res.append(h('p', { class: 'text-sm text-gray-500' }, 'Informe a data e os dias.')); return }
    const r = CRM.contarPrazo(pub.value, Number(dias.value), { trib: trib.value, ssa: true, fac: false }, modo.value)
    res.append(h('div', { class: 'rounded-2xl bg-cafe text-cafe-creme p-4' }, h('p', { class: 'text-[10px] uppercase tracking-widest opacity-60' }, 'Vence em'), h('p', { class: 'font-serif text-2xl' }, new Date(r.vencimento + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })), h('p', { class: 'text-xs opacity-70' }, diaRelativo(r.vencimento))))
    if (r.pulados.length) res.append(h('details', { class: 'text-xs text-gray-600 dark:text-zinc-300' }, h('summary', { class: 'cursor-pointer font-semibold' }, `${r.pulados.length} dia(s) descontado(s)`), h('ul', { class: 'mt-1 space-y-0.5' }, r.pulados.map(p => h('li', {}, `${dataLonga(p.d)} — ${p.motivo}`)))))
    res.append(btn('Salvar como prazo', { icone: 'ph:floppy-disk-bold', tipo: 'sec', onclick: () => editarCompromisso(null, { tipo: 'prazo', data_limite: r.vencimento, titulo: '', dias_prazo: Number(dias.value), data_publicacao: pub.value }) }))
  }
  ;[pub, dias, trib, modo].forEach(e => e.addEventListener('input', calc)); calc()
  return painel('Calculadora de prazos', h('div', { class: 'grid gap-3 sm:grid-cols-2' }, h('label', {}, rotuloCampo('Publicação'), pub), h('label', {}, rotuloCampo('Dias'), dias), h('label', {}, rotuloCampo('Calendário'), trib), h('label', {}, rotuloCampo('Contagem'), modo)), h('div', { class: 'mt-3' }, res), h('details', { class: 'mt-3 text-[11px] text-amber-700 dark:text-amber-300' }, h('summary', { class: 'cursor-pointer font-semibold' }, 'O que ainda não foi confirmado nos calendários'), h('ul', { class: 'list-disc pl-5 mt-1 space-y-1' }, CRM.NAO_CONFIRMADO.map(t => h('li', {}, t)))))
}
VIEWS.prazos = () => {
  const f = UI.prazos.f; const todos = DB.compromissos.filter(p => p.tipo === 'prazo' || p.tipo === 'audiencia')
  const lista_ = { abertos: todos.filter(p => p.status === 'pendente'), atrasados: todos.filter(p => p.status === 'pendente' && situacaoOf(diaDe(dataDoCompromisso(p))) === 'atrasado'), cumpridos: todos.filter(p => p.status === 'concluido') }[f].sort((a, b) => dataDoCompromisso(a).localeCompare(dataDoCompromisso(b)))
  return pagina('Prazos', 'Data-limite relevante, processual ou combinada. Contagem em dias úteis, com feriados e recesso forense.', [btn('Novo prazo', { icone: 'ph:plus-bold', onclick: () => editarCompromisso(null, { tipo: 'prazo' }), tid: 'novo-prazo' })],
    h('div', { class: 'grid gap-5 lg:grid-cols-[1fr_380px]' }, h('div', { class: 'space-y-3 min-w-0' }, filtros([{ id: 'abertos', nome: 'Abertos' }, { id: 'atrasados', nome: 'Atrasados' }, { id: 'cumpridos', nome: 'Cumpridos' }], f, id => { UI.prazos.f = id; render() }), painel(null, lista_.length ? h('div', { class: 'divide-y divide-gray-100 dark:divide-zinc-800' }, lista_.map(p => linhaPrazo(p))) : estadoVazio('ph:hourglass-high-bold', 'Nenhum prazo nesta visão'))), calculadoraPrazo()))
}

/* ================= INTIMAÇÕES ================= */
VIEWS.intimacoes = () => {
  const f = UI.intim.f; const itens = DB.intimacoes.filter(i => i.status === f).sort((a, b) => b.data_publicacao.localeCompare(a.data_publicacao))
  formIntimacao = (i, pad) => modalForm(i ? 'Editar intimação' : 'Registrar intimação', [{ chave: 'contato_id', rotulo: 'Cliente', tipo: 'select', opcoes: opcoesContatos(), numerico: true, obrigatorio: true }, { chave: 'processo_id', rotulo: 'Processo', tipo: 'select', opcoes: [['', '— nenhum —'], ...DB.processos.map(x => [x.id, x.numero || x.orgao])], numerico: true }, { chave: 'tipo', rotulo: 'Tipo', tipo: 'select', opcoes: CRM.TIPOS_INTIMACAO }, { chave: 'data_publicacao', rotulo: 'Data da publicação', tipo: 'data', obrigatorio: true }, { chave: 'texto', rotulo: 'Texto / resumo', tipo: 'textarea', obrigatorio: true }], i || { tipo: 'Despacho', data_publicacao: hojeISO(), ...(pad || {}) }, v => { const p = v.processo_id ? processo(v.processo_id) : null; if (i) Object.assign(i, v); else DB.intimacoes.push({ id: proximoId('intimacoes'), created_at: agora(), caso_id: p?.caso_id || null, status: 'a_tratar', prazo_dias: null, observacao: null, ...v }); salvar('intimacoes') })
  return pagina('Intimações', 'Publicações a tratar. Ao tratar, transforme em prazo na calculadora.', [btn('Ler texto de intimação', { tipo: 'sec', icone: 'ph:sparkle-bold', onclick: abrirAnaliseIntimacao, tid: 'ler-intimacao' }), btn('Registrar intimação', { icone: 'ph:plus-bold', onclick: () => formIntimacao(null), tid: 'nova-intimacao' })],
    filtros([{ id: 'a_tratar', nome: `A tratar (${DB.intimacoes.filter(i => i.status === 'a_tratar').length})` }, { id: 'tratada', nome: 'Tratadas' }], f, id => { UI.intim.f = id; render() }),
    itens.length ? h('div', { class: 'space-y-2' }, itens.map(i => h('div', { class: 'painel !p-4 flex flex-wrap items-start gap-3', 'data-testid': 'intimacao' }, ic('ph:megaphone-bold', 'text-xl text-primary dark:text-cafe-creme mt-0.5'), h('div', { class: 'min-w-0 flex-1' }, h('p', { class: 'font-semibold text-sm' }, i.tipo, h('span', { class: 'font-normal text-gray-500' }, ' · ' + nomeContato(i.contato_id) + (i.processo_id ? ' · ' + (processo(i.processo_id)?.numero || '') : ''))), h('p', { class: 'text-sm text-gray-600 dark:text-zinc-300 mt-1' }, i.texto), h('p', { class: 'text-[11px] text-gray-400 mt-1' }, 'Publicada em ' + dataLonga(i.data_publicacao))), h('div', { class: 'flex gap-1.5' }, i.status === 'a_tratar' ? [btn('Criar prazo', { mini: true, tipo: 'sec', icone: 'ph:hourglass-high-bold', onclick: () => editarCompromisso(null, { tipo: 'prazo', titulo: 'Prazo: ' + i.tipo, contato_id: i.contato_id, caso_id: i.caso_id, processo_id: i.processo_id, data_publicacao: i.data_publicacao }) }), btn('Marcar tratada', { mini: true, onclick: () => { i.status = 'tratada'; salvar('intimacoes'); render(); aviso('Intimação tratada.') } })] : btn('Reabrir', { mini: true, tipo: 'sec', onclick: () => { i.status = 'a_tratar'; salvar('intimacoes'); render() } }), btnIcone('ph:pencil-simple-bold', 'Editar', () => formIntimacao(i)))))) : estadoVazio('ph:megaphone-bold', 'Nenhuma intimação aqui', 'No CRM real, as publicações chegam pela integração com diários oficiais; aqui você pode registrar manualmente.'))
}

/* ================= AGENDA ================= */
VIEWS.calendario = () => {
  const hoje = hojeISO(); const mes = UI.agenda.mes || hoje.slice(0, 7); const [ano, m] = mes.split('-').map(Number)
  const primeiro = `${mes}-01`; const inicioGrade = somarDias(primeiro, -CRM.dow(primeiro)); const fimMes = new Date(Date.UTC(ano, m, 0)).getUTCDate()
  const eventos = DB.compromissos.filter(p => p.status !== 'cancelado'); const porDia = {}; eventos.forEach(p => { const k = diaDe(dataDoCompromisso(p)); (porDia[k] = porDia[k] || []).push(p) })
  const nav = n => { const d = new Date(Date.UTC(ano, m - 1 + n, 1)); UI.agenda.mes = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; render() }
  const celulas = Array.from({ length: Math.ceil((CRM.dow(primeiro) + fimMes) / 7) * 7 }, (_, i) => somarDias(inicioGrade, i))
  const COR = { prazo: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200', audiencia: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200', consulta: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200', reuniao: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200', tarefa: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' }
  const proximos = eventos.filter(p => p.status === 'pendente' && diaDe(dataDoCompromisso(p)) >= hoje).sort((a, b) => dataDoCompromisso(a).localeCompare(dataDoCompromisso(b))).slice(0, 8)
  return pagina('Agenda', 'Consultas, audiências, reuniões e prazos num só calendário.', [btn('Novo compromisso', { icone: 'ph:plus-bold', onclick: () => editarCompromisso(null, { tipo: 'consulta' }), tid: 'novo-compromisso' })],
    h('div', { class: 'grid gap-5 lg:grid-cols-[1fr_320px]' },
      painel(null, h('div', { class: 'flex items-center justify-between mb-3' }, btnIcone('ph:caret-left-bold', 'Mês anterior', () => nav(-1)), h('h2', { class: 'titulo capitalize' }, new Date(Date.UTC(ano, m - 1, 1, 12)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })), btnIcone('ph:caret-right-bold', 'Próximo mês', () => nav(1))),
        h('div', { class: 'overflow-x-auto' }, h('div', { class: 'min-w-[560px]' }, h('div', { class: 'grid grid-cols-7 text-[10px] uppercase tracking-widest text-gray-400 mb-1' }, ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map(x => h('div', { class: 'px-1' }, x))), h('div', { class: 'grid grid-cols-7 gap-px bg-gray-200/70 dark:bg-zinc-800 rounded-2xl overflow-hidden border border-gray-200/70 dark:border-zinc-800' }, celulas.map(dia => h('div', { class: 'min-h-[88px] p-1.5 bg-white dark:bg-zinc-900 ' + (dia.slice(0, 7) !== mes ? 'opacity-40' : '') }, h('span', { class: 'text-xs inline-flex w-6 h-6 items-center justify-center rounded-full ' + (dia === hoje ? 'bg-primary text-white' : 'text-gray-500') }, Number(dia.slice(8))), (porDia[dia] || []).slice(0, 3).map(p => h('button', { type: 'button', class: `block w-full text-left truncate rounded-md px-1.5 py-0.5 mt-0.5 text-[10px] font-semibold ${COR[p.tipo]} ${p.status === 'concluido' ? 'line-through opacity-60' : ''}`, onclick: () => editarCompromisso(p), title: p.titulo }, (p.inicio ? hhmm(p.inicio) + ' ' : '') + p.titulo)), (porDia[dia] || []).length > 3 ? h('span', { class: 'text-[10px] text-gray-400' }, `+${porDia[dia].length - 3}`) : null)))))),
      painel('Próximos', proximos.length ? lista(proximos.map(p => [ic(CRM.TIPOS_COMPROMISSO[p.tipo].icone, 'text-lg text-primary dark:text-cafe-creme mt-0.5'), h('div', { class: 'min-w-0 flex-1' }, h('p', { class: 'font-semibold truncate' }, p.titulo), h('p', { class: 'text-[11px] text-gray-500' }, `${CRM.TIPOS_COMPROMISSO[p.tipo].nome} · ${dataCurta(dataDoCompromisso(p))}${p.inicio ? ' · ' + hhmm(p.inicio) : ''}`)), badge(diaRelativo(diaDe(dataDoCompromisso(p))), 'azul')])) : estadoVazio('ph:calendar-blank-bold', 'Nada agendado'),
        h('p', { class: 'text-[11px] text-gray-400 mt-3' }, 'Para levar um compromisso ao Google Agenda: abra-o e use “Adicionar ao Google Agenda” ou baixe o arquivo .ics.'))))
}

/* ---- gráficos do Dashboard (mesma leitura do CRM: carga de prazos/compromissos/tarefas e recebido por mês) ---- */
function graficoCarga() {
  const h0 = hojeISO(); const dias = Array.from({ length: 14 }, (_, i) => somarDias(h0, i))
  const cont = dia => ({ prazos: DB.compromissos.filter(x => x.status === 'pendente' && x.tipo === 'prazo' && diaDe(dataDoCompromisso(x)) === dia).length, comp: DB.compromissos.filter(x => x.status === 'pendente' && x.tipo !== 'prazo' && diaDe(dataDoCompromisso(x)) === dia).length, tarefas: DB.tarefas.filter(x => !x.concluida && x.prazo === dia).length })
  const atr = { prazos: DB.compromissos.filter(x => x.status === 'pendente' && x.tipo === 'prazo' && diaDe(dataDoCompromisso(x)) < h0).length, comp: 0, tarefas: DB.tarefas.filter(x => !x.concluida && x.prazo < h0).length }
  const cols = [{ rot: '!', atr: true, ...atr }, ...dias.map((d_, i) => ({ rot: i === 0 ? 'hoje' : String(Number(d_.slice(8))), hoje: i === 0, ...cont(d_) }))]
  const tot = c => c.prazos + c.comp + c.tarefas; const max = Math.max(1, ...cols.map(tot))
  return h('div', {}, h('div', { class: 'flex items-end gap-1 sm:gap-1.5 h-32', role: 'img', 'aria-label': 'Carga dos próximos 14 dias: ' + cols.reduce((s, c) => s + tot(c), 0) + ' itens', 'data-testid': 'grafico-carga' }, cols.map(c => h('div', { class: 'flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1 ' + (c.atr ? 'mr-1.5 sm:mr-3' : ''), title: `${c.prazos} prazo(s), ${c.comp} compromisso(s), ${c.tarefas} tarefa(s)` }, h('div', { class: 'w-full flex flex-col-reverse rounded-md overflow-hidden', style: `height:${tot(c) ? Math.max(6, tot(c) / max * 100) : 0}%` }, c.prazos ? h('span', { class: 'block ' + (c.atr ? 'bg-danger' : 'bg-primary dark:bg-cafe-claro'), style: `flex-grow:${c.prazos}` }) : null, c.comp ? h('span', { class: 'block bg-secondary', style: `flex-grow:${c.comp}` }) : null, c.tarefas ? h('span', { class: 'block ' + (c.atr ? 'bg-danger/40' : 'bg-primary/30 dark:bg-zinc-500'), style: `flex-grow:${c.tarefas}` }) : null), h('span', { class: 'text-[9px] sm:text-[10px] leading-none whitespace-nowrap ' + (c.hoje ? 'font-bold text-primary dark:text-zinc-100' : c.atr ? 'font-semibold text-danger' : 'text-gray-400') }, c.rot)))),
    h('div', { class: 'mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500' }, [['bg-primary dark:bg-cafe-claro', 'Prazos'], ['bg-secondary', 'Compromissos'], ['bg-primary/30 dark:bg-zinc-500', 'Tarefas'], ['bg-danger', 'Já atrasado']].map(([k, t]) => h('span', { class: 'inline-flex items-center gap-1.5' }, h('i', { class: 'w-2.5 h-2.5 rounded-sm ' + k }), t))))
}
function graficoReceita() {
  const base = hojeISO().slice(0, 7); const meses = Array.from({ length: 6 }, (_, i) => { const d_ = new Date(Date.UTC(Number(base.slice(0, 4)), Number(base.slice(5)) - 1 - (5 - i), 15)); const k = d_.toISOString().slice(0, 7); return { k, rot: d_.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', ''), v: DB.lancamentos.filter(l => l.tipo === 'receber' && l.pago_em && l.pago_em.slice(0, 7) === k).reduce((s, l) => s + l.valor, 0), atual: i === 5 } })
  const max = Math.max(1, ...meses.map(m => m.v))
  return h('div', { class: 'flex items-end gap-2 h-24', role: 'img', 'aria-label': 'Recebido por mês, últimos 6 meses', 'data-testid': 'grafico-receita' }, meses.map(m => h('div', { class: 'flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1', title: `${m.rot}: ${brl(m.v)}` }, h('span', { class: 'w-full rounded-md ' + (m.atual ? 'bg-primary dark:bg-cafe-claro' : 'bg-primary/30 dark:bg-zinc-500'), style: `height:${m.v ? Math.max(6, m.v / max * 100) : 0}%` }), h('span', { class: 'text-[10px] leading-none ' + (m.atual ? 'font-bold text-primary dark:text-zinc-100' : 'text-gray-400') }, m.rot))))
}

/* ================= AGENDA (módulo: Calendário · Tarefas · Prazos · Intimações) ================= */
UI.ag = { aba: 'calendario' }
VIEWS.agenda = (p) => {
  if (p && p.aba) { UI.ag.aba = p.aba; R.p = {} }
  const A = UI.ag.aba; const sub = { calendario: 'Consultas, audiências, reuniões e prazos num só calendário.', tarefas: 'Algo que exige execução ou acompanhamento. Sempre com data.', prazos: 'Data-limite relevante, processual ou combinada. Contagem em dias úteis, com feriados e recesso forense.', intimacoes: 'Publicações a tratar. Ao tratar, transforme em prazo.' }[A]
  const pendIn = DB.intimacoes.filter(i => i.status === 'a_tratar').length; const atrasT = DB.tarefas.filter(t => !t.concluida && t.prazo < hojeISO()).length
  return modulo({ titulo: 'Agenda', sub, abasDef: [{ id: 'calendario', nome: 'Calendário', icone: 'ph:calendar-bold' }, { id: 'tarefas', nome: 'Tarefas', icone: 'ph:check-square-bold', n: atrasT || null }, { id: 'prazos', nome: 'Prazos', icone: 'ph:hourglass-high-bold' }, { id: 'intimacoes', nome: 'Intimações', icone: 'ph:megaphone-bold', n: pendIn || null }], ativa: A, aoMudar: id => { UI.ag.aba = id; render() }, conteudo: a => VIEWS[a]() })
}
/* ---- levar compromisso para fora do CRM (REAL: link do Google Agenda e arquivo .ics) ---- */
function janelaCompromisso(p) {
  const dia = diaDe(dataDoCompromisso(p)); if (p.inicio) { const i = new Date(p.inicio); const f = new Date(i.getTime() + 60 * 6e4); const fmt = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); return { dia: false, ini: fmt(i), fim: fmt(f) } }
  return { dia: true, ini: dia.replace(/-/g, ''), fim: somarDias(dia, 1).replace(/-/g, '') }
}
const linkGoogleAgenda = p => { const j = janelaCompromisso(p); return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(p.titulo) + '&dates=' + j.ini + '/' + j.fim + '&details=' + encodeURIComponent(p.observacao || '') + '&location=' + encodeURIComponent(p.local || '') }
function icsDe(lista) {
  const esc = t => String(t || '').replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n')
  const ev = lista.map(p => { const j = janelaCompromisso(p); return ['BEGIN:VEVENT', 'UID:crm-' + p.id + '@laracafe', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''), j.dia ? 'DTSTART;VALUE=DATE:' + j.ini : 'DTSTART:' + j.ini, j.dia ? 'DTEND;VALUE=DATE:' + j.fim : 'DTEND:' + j.fim, 'SUMMARY:' + esc(p.titulo), p.local ? 'LOCATION:' + esc(p.local) : null, p.observacao ? 'DESCRIPTION:' + esc(p.observacao) : null, 'END:VEVENT'].filter(Boolean).join('\r\n') })
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lara Cafe//CRM//PT', ...ev, 'END:VCALENDAR'].join('\r\n')
}
async function baixarIcs(lista, nome) { const data = icsDe(lista); try { const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; if (!dl) throw new Error('x'); await dl.save({ filename: nome, data }) } catch (e) { copiar(data); aviso('Download indisponível aqui: copiei o conteúdo do .ics.') } }
