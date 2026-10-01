'use strict'
/* ============ FORMULÁRIOS › FLUXO (cadastrar o Google Form → gerar envio com código → enviar → ler a planilha → revisar → aplicar ao cadastro) ============
   REAL no artifact:   cadastro do formulário (link do Google Forms + planilha), envio com CÓDIGO que identifica Pessoa e Demanda,
                       mensagem pronta para WhatsApp (você envia) e e-mail (Gmail, como você), leitura da planilha pelo conector do Google Drive,
                       respostas ligadas à Pessoa e à Demanda, revisão e aplicação ao cadastro com conferência.
   FORA do artifact:   a página que a cliente abre e o armazenamento da resposta são do Google (Forms + Sheets). */
const MASC_CPF = v => { const d = String(v).replace(/\D/g, ''); return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : d.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : String(v) }
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
/* data digitada pela cliente (dd/mm/aaaa) → AAAA-MM-DD */
const isoDeDataBR = v => { const m = String(v).trim().match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/); if (m) { const a = m[3].length === 2 ? (Number(m[3]) > 30 ? '19' : '20') + m[3] : m[3]; return `${a}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` } return /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? String(v).slice(0, 10) : String(v) }

/* ---------- situação do formulário e estado do envio ---------- */
const FORM_CFG = () => ({ lembreteDias: 3, ...(CONFIG.form || {}) })
const SITUACOES = { rascunho: ['Em configuração', 'cinza'], publicado: ['Ativo', 'verde'], arquivado: ['Arquivado', 'ambar'] }
const situacaoForm = f => f.situacao || (f.ativo === false ? 'arquivado' : 'publicado')
const ESTADOS = { gerado: ['Link gerado (não enviado)', 'cinza'], enviado: ['Enviado', 'azul'], respondido: ['Respondido', 'verde'], cancelado: ['Cancelado', 'cinza'] }
const estadoEnvio = e => e.status
const abertoEnvio = e => !['respondido', 'cancelado'].includes(e.status)
const atrasadoEnvio = e => abertoEnvio(e) && e.prazo_resposta && e.prazo_resposta < hojeISO()
const badgeEnvio = e => { const k = estadoEnvio(e); const [n, c] = ESTADOS[k] || [k, 'cinza']; return h('span', { class: 'inline-flex gap-1 items-center', 'data-testid': 'status-envio' }, badge(n, c), atrasadoEnvio(e) ? badge('Prazo vencido', 'vermelho') : null, e.nova ? badge('Nova', 'roxo') : null) }
const eventosEnvio = e => [[e.created_at, 'Envio gerado (código ' + (e.codigo || '—') + ')'], [e.enviado_em, 'Enviado por ' + ({ whatsapp: 'WhatsApp', email: 'e-mail', manual: 'meio informado' }[e.canal_envio] || 'meio informado')], ...(e.lembretes || []).map(l => [l.em, 'Lembrete enviado por ' + ({ whatsapp: 'WhatsApp', email: 'e-mail', manual: 'meio informado' }[l.canal] || 'meio informado')]), [e.respondido_em, 'Respondeu no Google Forms'], [e.importado_em, 'Resposta lida da planilha'], [e.revisado_em, 'Revisado no escritório'], [e.aplicado_em, 'Dados aplicados ao cadastro'], [e.cancelado_em, 'Envio cancelado']].filter(x => x[0]).sort((a, b) => a[0].localeCompare(b[0]))
const nomeFormEnvio = e => (formularioDe(e.formulario_id) || {}).nome || e.formulario_nome || 'Formulário'
const estruturaDoEnvio = e => e.snap || (formularioDe(e.formulario_id) ? itensDe(formularioDe(e.formulario_id)).map(i => ({ pergunta_id: i.pergunta_id, texto: i.texto, tipo: i.tipo || 'texto_curto', mapear: i.mapear || null })) : [])

/* ---------- mapeamento resposta → cadastro (decisão consciente: nada é gravado sem conferência) ---------- */
const DESTINOS = [['', 'Não levar ao cadastro (fica só no histórico)'], ['nome', 'Nome completo'], ['telefone', 'Telefone'], ['email', 'E-mail'], ['data_nascimento', 'Data de nascimento'], ['cpf', 'CPF'], ['rg', 'RG'], ['estado_civil', 'Estado civil'], ['profissao', 'Profissão'], ['nacionalidade', 'Nacionalidade'], ['endereco', 'Endereço (rua, bairro, cidade, UF, CEP)']]
function propostasDoEnvio(e) {
  const c = contato(e.contato_id); if (!c) return []; const q = c.qualificacao || {}; const out = []
  const atual = { nome: q.nome_completo || c.nome, telefone: c.telefone, email: c.email, data_nascimento: c.data_nascimento, cpf: q.cpf, rg: q.rg, estado_civil: q.estado_civil, profissao: q.profissao, nacionalidade: q.nacionalidade, endereco: [q.endereco, q.bairro, q.cidade && q.uf ? q.cidade + '/' + q.uf : q.cidade, q.cep].filter(Boolean).join(', ') }
  for (const it of estruturaDoEnvio(e)) { const val = e.respostas[it.pergunta_id]; if (!it.mapear || respostaVazia(val) || !DESTINOS.some(d => d[0] === it.mapear)) continue
    const novo = it.mapear === 'cpf' ? MASC_CPF(val) : it.mapear === 'data_nascimento' ? isoDeDataBR(val) : String(Array.isArray(val) ? val.join(', ') : val).trim()
    out.push({ campo: it.mapear, rotulo: DESTINOS.find(d => d[0] === it.mapear)[1].replace(/ \(.*/, ''), pergunta: it.texto, atual: atual[it.mapear] || '', novo, bruto: val, marcar: !atual[it.mapear] || atual[it.mapear] === novo }) }
  return out
}
function aplicarPropostas(e, escolhidas) {
  const c = contato(e.contato_id); c.qualificacao = c.qualificacao || {}; const q = c.qualificacao; const log = []
  const set = (alvo, k, v, nome) => { const antes = alvo[k] ?? ''; if (antes === v) return; log.push({ campo: nome, antes, depois: v }); alvo[k] = v }
  for (const p of escolhidas) {
    if (p.campo === 'nome') { set(q, 'nome_completo', p.novo, 'Nome completo'); if (!c.nome) set(c, 'nome', p.novo, 'Nome') }
    else if (p.campo === 'telefone') { const d = String(p.bruto).replace(/\D/g, ''); set(c, 'telefone', d.length <= 11 ? '55' + d : d, 'Telefone') }
    else if (p.campo === 'email') set(c, 'email', String(p.bruto).trim().toLowerCase(), 'E-mail')
    else if (p.campo === 'data_nascimento') set(c, 'data_nascimento', isoDeDataBR(p.bruto), 'Data de nascimento')
    else if (p.campo === 'endereco') set(q, 'endereco', p.novo, 'Endereço')
    else set(q, p.campo, p.novo, p.rotulo)
  }
  c.updated_at = agora(); salvar('contatos'); return log
}
function revisarEAplicar(e) {
  const props = propostasDoEnvio(e)
  const marcas = props.map(p => p.marcar)
  const linhas = props.map((p, i) => h('label', { class: 'flex items-start gap-3 rounded-xl border border-gray-200 dark:border-zinc-700 p-3 text-sm cursor-pointer', 'data-testid': 'proposta-' + p.campo }, h('input', { type: 'checkbox', checked: marcas[i], class: 'mt-1 accent-[#6f5636]', onchange: ev => { marcas[i] = ev.target.checked } }), h('div', { class: 'min-w-0 flex-1' }, h('p', { class: 'font-semibold' }, p.rotulo, h('span', { class: 'font-normal text-gray-400 text-xs' }, ' · pergunta: ' + p.pergunta)), h('p', { class: 'text-xs text-gray-500' }, 'Hoje no cadastro: ', p.atual ? h('span', {}, p.atual) : h('i', {}, 'vazio')), h('p', { class: 'text-xs' }, 'Resposta: ', h('b', {}, p.novo)), p.atual && p.atual !== p.novo ? h('p', { class: 'text-[11px] text-amber-700 dark:text-amber-300' }, 'Já existe um valor diferente. Marque só se a cliente corrigiu o dado.') : null)))
  modal({ titulo: 'Revisar e aplicar ao cadastro', largura: 'max-w-2xl', corpo: h('div', { class: 'space-y-3', 'data-testid': 'revisao-cadastro' }, h('p', { class: 'text-xs text-gray-500' }, 'Nada é gravado sem a sua conferência. Campos vazios vêm marcados; onde já existe outro valor, a escolha é sua. O que for alterado fica registrado (antes → depois) no histórico.'), ...(linhas.length ? linhas : [h('p', { class: 'text-sm text-gray-500' }, 'Nenhuma pergunta deste formulário está ligada a um campo do cadastro. Na configuração do formulário, escolha “Levar ao cadastro” para a coluna desejada.')])),
    rodape: fechar => [btn('Cancelar', { tipo: 'sec', onclick: fechar }), btn('Aplicar selecionados', { tid: 'aplicar-cadastro', onclick: () => {
      const log = aplicarPropostas(e, props.filter((_, i) => marcas[i])); const docs = []; e.aplicado_em = agora(); e.aplicado_log = [...(e.aplicado_log || []), ...log]; e.revisado_em = e.revisado_em || agora(); e.nova = false
      registrar(e.contato_id, 'Anotação', `Dados do formulário “${nomeFormEnvio(e)}” aplicados ao cadastro` + (log.length ? ': ' + log.map(l => l.campo).join(', ') : ' (nenhuma alteração)') + (docs.length ? '. Documentos: ' + docs.join('; ') : ''), e.caso_id); auditar('form_aplicar_cadastro', nomeContato(e.contato_id) + ' · ' + nomeFormEnvio(e)); salvar('envios'); fechar(); aviso(log.length || docs.length ? 'Dados aplicados ao cadastro.' : 'Nada para alterar.'); render(); atualizarCamadas() } })] })
}


/* ---------- mensagem ao cliente (WhatsApp/e-mail) ---------- */
const primeiroNome = c => String(c.nome || '').trim().split(/\s+/)[0] || ''
function textoEnvio(e, lembrete) {
  const c = contato(e.contato_id); const adv = (CONFIG.escritorio || {}).advogada_nome || 'a Dra. Lara'; const link = linkRealDoEnvio(e) || '[LINK]'
  const prazo = e.prazo_resposta ? ` Se puder, responda até ${dataLonga(e.prazo_resposta)}.` : ''
  return lembrete ? `Olá, ${primeiroNome(c)}! Passando para lembrar do formulário “${nomeFormEnvio(e)}”, que ajuda a ${adv} a cuidar do seu caso.${prazo} Leva poucos minutos e dá para preencher pelo celular: ${link}\nNão altere o campo do código, que já vem preenchido. Qualquer dúvida, é só responder aqui.`
    : `Olá, ${primeiroNome(c)}! Aqui é do escritório da ${adv}. Para avançarmos, preciso que você preencha o formulário “${nomeFormEnvio(e)}”: ${link}${prazo}\nAbre direto no celular, sem cadastro. Não altere o campo do código, que já vem preenchido. As informações são usadas só para o seu atendimento, conforme a LGPD.`
}
function marcarEnviado(e, canal) {
  if (!e.enviado_em) { e.enviado_em = agora(); e.canal_envio = canal; if (e.status === 'gerado') e.status = 'enviado' } else if (canal !== 'manual') (e.lembretes = e.lembretes || []).push({ em: agora(), canal })
  salvar('envios')
}
function marcarEnvioPorTexto(cid, texto, canal) { let n = 0; for (const e of DB.envios) { if (e.contato_id !== cid || !e.token || !String(texto).includes(e.token)) continue; marcarEnviado(e, canal); n++ } return n }


function qrSvg(texto) { try { return CRM.qrSvg ? CRM.qrSvg(texto) : null } catch (e) { return null } }
function painelEnvio(e, lembrete, novo) {
  const c = contato(e.contato_id); const real = linkRealDoEnvio(e); const aberto = abertoEnvio(e); const texto = textoEnvio(e, lembrete); const f = formularioDe(e.formulario_id); const semCod = f && !analisarLinkForms(f.google_url).temCodigo
  const cx = h('div', { class: 'space-y-4', 'data-testid': 'painel-envio' }, h('div', { class: 'flex flex-wrap items-center gap-2' }, badgeEnvio(e), badge('Código ' + (e.codigo || '—'), 'cinza'), h('span', { class: 'text-xs text-gray-500' }, `${nomeContato(e.contato_id)} · ${nomeFormEnvio(e)}` + (e.caso_id ? ' · ' + nomeDemanda(e.caso_id) : ''))),
    real ? h('div', { class: 'space-y-1' }, h('input', { class: 'modal-input', readonly: true, value: real, 'data-testid': 'link-form', onfocus: ev => ev.target.select() }), h('p', { class: 'text-[11px] text-gray-500' }, 'Link do Google Forms já com o código desta Pessoa/Demanda. Envie só para ' + primeiroNome(c) + '; quando ela responder, a resposta é ligada a este cadastro ao ler a planilha.')) : alerta('aviso', 'Sem link', 'Cadastre o link do Google Forms na configuração do formulário.'),
    semCod ? alerta('aviso', 'Este link não leva o código', 'O Google Forms não vai preencher o código sozinho: a resposta chegará sem identificação e você precisará vinculá-la manualmente. Gere o link pré-preenchido com CODIGO (configuração do formulário, passo 1).') : null,
    h('textarea', { class: 'modal-input text-sm', rows: 5, readonly: true, 'data-testid': 'msg-previa' }, texto),
    h('div', { class: 'flex flex-wrap gap-2' }, btn('Copiar link', { mini: true, icone: 'ph:copy-bold', disabled: !real, tid: 'copiar-link', onclick: () => { copiar(real); if (aberto && !e.enviado_em) marcarEnviado(e, 'manual') } }), btn('Copiar mensagem', { mini: true, tipo: 'sec', icone: 'ph:chat-text-bold', disabled: !real, tid: 'copiar-msg', onclick: () => { copiar(texto); if (aberto && !e.enviado_em) marcarEnviado(e, 'manual') } }),
      h('a', { href: real && c && c.telefone ? whatsappLink(c.telefone) + '?text=' + encodeURIComponent(texto) : null, target: '_blank', rel: 'noopener', 'data-testid': 'env-whatsapp', class: 'btn-mini inline-flex items-center gap-1.5 !px-4 !py-2 rounded-full bg-primary text-white dark:bg-cafe-creme dark:text-cafe' + (real && aberto && c && c.telefone ? '' : ' opacity-50 pointer-events-none'), title: 'Abre o WhatsApp com a mensagem pronta; você envia', onclick: () => { marcarEnviado(e, 'whatsapp'); registrar(c.id, 'Mensagem', 'Link do formulário “' + nomeFormEnvio(e) + '” enviado por WhatsApp (você enviou pelo aplicativo).', e.caso_id); salvar('envios'); setTimeout(render, 300) } }, ic('ph:whatsapp-logo-bold'), lembrete ? 'Lembrete: abrir WhatsApp' : 'Abrir WhatsApp com a mensagem'),
      btn(lembrete ? 'Lembrete por e-mail' : 'Enviar por e-mail', { mini: true, icone: 'ph:envelope-simple-bold', disabled: !real || !aberto, title: 'Envia agora pelo Gmail conectado', tid: 'env-email', onclick: () => enviarEnvioPorEmail(e, texto, lembrete) }),
      btn('QR Code', { mini: true, tipo: 'sec', icone: 'ph:qr-code-bold', disabled: !real, tid: 'env-qr', onclick: () => { const svg = qrSvg(real); modal({ titulo: 'QR Code do link', largura: 'max-w-sm', corpo: h('div', { class: 'text-center space-y-2' }, (() => { const d = h('div', { class: 'mx-auto w-56 bg-white p-2 rounded-xl', 'data-testid': 'qr-svg' }); d.innerHTML = svg || ''; return d })(), h('p', { class: 'text-xs text-gray-500' }, 'Para atendimento presencial: a cliente aponta a câmera do celular. O QR leva ao mesmo link, com o código.')) }) } }),
      btn(e.status === 'respondido' ? 'Ver respostas' : 'Ler respostas da planilha', { mini: true, tipo: 'sec', icone: 'ph:list-checks-bold', tid: 'ver-respostas-envio', onclick: async () => { if (e.status !== 'respondido') await sincronizarRespostasGoogle(); if (e.status === 'respondido') { fecharTodas(); verEnvio(e) } else aviso('Ainda sem resposta desta cliente na planilha.') } }),
      btn('Cancelar envio', { mini: true, tipo: 'fantasma', icone: 'ph:prohibit-bold', disabled: !aberto, tid: 'cancelar-link', onclick: () => confirmar('Cancelar este envio?', 'O CRM deixa de esperar a resposta. O link do Google Forms continua funcionando: para parar de aceitar respostas, feche o formulário no Google.', 'Cancelar envio', () => { e.status = 'cancelado'; e.cancelado_em = agora(); auditar('form_cancelar_envio', nomeContato(e.contato_id)); salvar('envios'); render(); atualizarCamadas() }) })),
    h('ol', { class: 'text-xs text-gray-500 space-y-0.5', 'data-testid': 'historico-envio' }, eventosEnvio(e).map(([t, n]) => h('li', {}, dataHora(t) + ' — ' + n))))
  modal({ titulo: novo ? 'Envio criado' : lembrete ? 'Lembrete de formulário' : 'Enviar ao cliente', largura: 'max-w-xl', corpo: cx, aoFechar: render })
}

async function enviarEnvioPorEmail(e, texto, lembrete) {
  const c = contato(e.contato_id)
  if (!c.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) { aviso('Esta pessoa não tem e-mail válido no cadastro.', 'erro'); return }
  const assunto = (lembrete ? 'Lembrete: ' : '') + nomeFormEnvio(e)
  confirmar('Enviar o formulário por e-mail?', `Para ${c.email}, pelo Gmail conectado ao CRM.`, 'Enviar', async () => {
    try {
      const r = await gmail('send_message', { to: [c.email], subject: assunto, body: texto })
      novaComunicacao({ contato_id: c.id, canal: 'email', direcao: 'saida', assunto, texto, origem: 'gmail', ext_id: r && r.id || null, caso_id: e.caso_id || null })
      marcarEnviado(e, 'email'); auditar('form_enviar_email', nomeContato(e.contato_id)); aviso('E-mail enviado e registrado.'); fecharTodas(); render(); atualizarCamadas()
    } catch (err) { aviso(erroCopy(err), 'erro') }
  })
}

/* ---------- ver / revisar / editar respostas ---------- */
function verEnvio(e) {
  const c = contato(e.contato_id); const itens = estruturaDoEnvio(e); const f = formularioDe(e.formulario_id)
  if (e.nova) { e.nova = false; salvar('envios') }
  const secoesDe = f ? f.secoes.map(s => ({ titulo: s.titulo, ids: new Set(s.itens.map(i => i.pergunta_id)) })) : [{ titulo: 'Respostas', ids: new Set(itens.map(i => i.pergunta_id)) }]
  const mostrar = it => h('span', { class: 'text-sm whitespace-pre-line' }, textoResposta(e.respostas[it.pergunta_id]))
  const corpoRespostas = h('div', { class: 'space-y-4', 'data-testid': 'respostas-lista' }, secoesDe.map(s => { const its = itens.filter(i => s.ids.has(i.pergunta_id)); return its.length ? h('section', { class: 'space-y-2' }, h('h4', { class: 'section-label' }, s.titulo || 'Respostas'), ...its.map(it => h('div', { class: 'rounded-xl bg-white/60 dark:bg-zinc-900/50 border border-gray-200/70 dark:border-zinc-800 px-3 py-2', 'data-testid': 'resp-' + it.texto }, h('p', { class: 'text-[11px] text-gray-500' }, it.texto, it.mapear ? h('span', { class: 'ml-1 text-secondary' }, '→ ' + DESTINOS.find(d => d[0] === it.mapear)?.[1].replace(/ \(.*/, '')) : null), mostrar(it)))) : null }), !f || itens.some(i => !secoesDe.some(s => s.ids.has(i.pergunta_id))) ? h('section', { class: 'space-y-2' }, ...itens.filter(i => !secoesDe.some(s => s.ids.has(i.pergunta_id))).map(it => h('div', { class: 'rounded-xl bg-white/60 dark:bg-zinc-900/50 border border-gray-200/70 dark:border-zinc-800 px-3 py-2' }, h('p', { class: 'text-[11px] text-gray-500' }, it.texto), mostrar(it)))) : null)
  modal({ titulo: 'Respostas recebidas', largura: 'max-w-2xl', corpo: h('div', { class: 'space-y-4', 'data-testid': 'detalhe-resposta' },
    h('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm' }, h('p', {}, h('b', {}, 'Cliente: '), c ? c.nome : '—'), h('p', {}, h('b', {}, 'Formulário: '), nomeFormEnvio(e)), e.caso_id ? h('p', {}, h('b', {}, 'Demanda: '), nomeDemanda(e.caso_id)) : null, h('p', {}, h('b', {}, 'Respondido em: '), e.respondido_em ? dataHora(e.respondido_em) : '—'), h('p', {}, h('b', {}, 'Identificação: '), e.vinculo === 'manual' ? 'vinculada manualmente por você' : e.vinculo === 'contato' ? 'pelo e-mail/telefone informado (confirmada por você)' : 'pelo código ' + (e.codigo || '—')), h('p', {}, h('b', {}, 'Origem: '), 'Google Forms (planilha)')),
    e.resumo ? h('div', { class: 'rounded-2xl bg-secondary/10 border border-secondary/30 p-4' }, h('p', { class: 'text-xs font-semibold uppercase tracking-wider text-secondary-dark dark:text-cafe-creme mb-1' }, 'Resumo em palavras da cliente'), h('p', { class: 'text-sm whitespace-pre-line' }, e.resumo)) : null,
    e.revisado_em ? alerta('ok', null, 'Revisado em ' + dataHora(e.revisado_em) + '.') : null, e.editado_em ? alerta('info', null, 'Respostas editadas internamente em ' + dataHora(e.editado_em) + '. As respostas originais da cliente ficam guardadas.') : null,
    corpoRespostas, e.aplicado_log && e.aplicado_log.length ? h('div', { class: 'text-xs text-gray-500' }, h('b', {}, 'Aplicado ao cadastro: '), e.aplicado_log.map(l => `${l.campo}: ${l.antes || '(vazio)'} → ${l.depois}`).join(' · ')) : null,
    h('ol', { class: 'text-xs text-gray-500 space-y-0.5' }, eventosEnvio(e).map(([t, n]) => h('li', {}, dataHora(t) + ' — ' + n)))),
    rodape: fechar => [btn('Abrir ficha', { tipo: 'fantasma', onclick: () => { fechar(); abrirFicha(e.contato_id) } }), btn('Exportar (.csv)', { tipo: 'sec', icone: 'ph:download-bold', tid: 'exportar-csv', onclick: () => exportarEnvio(e) }), btn('Editar respostas', { tipo: 'sec', tid: 'editar-respostas', onclick: () => { fechar(); editarRespostas(e) } }), btn('Aplicar ao cadastro', { tipo: 'sec', tid: 'revisar-aplicar', onclick: () => { fechar(); revisarEAplicar(e) } }), btn(e.revisado_em ? 'Revisado' : 'Marcar como revisado', { tid: 'marcar-revisado', disabled: !!e.revisado_em, onclick: () => { e.revisado_em = agora(); salvar('envios'); fechar(); render(); atualizarCamadas() } })], aoFechar: render })
}
function editarRespostas(e) {
  const itens = estruturaDoEnvio(e); const novo = clonar(e.respostas)
  modal({ titulo: 'Editar respostas (uso interno)', largura: 'max-w-xl', corpo: h('div', { class: 'space-y-3', 'data-testid': 'editar-resp' }, alerta('info', null, 'Use para corrigir um dado evidente (ex.: erro de digitação). As respostas originais da cliente ficam guardadas e a alteração é auditada. '), ...itens.map(it => h('label', { class: 'block' }, rotuloCampo(it.texto), (it.tipo === 'texto_longo' ? h('textarea', { class: 'modal-input', rows: 3, value: novo[it.pergunta_id] || '', 'data-testid': 'ed-' + it.pergunta_id, oninput: ev => { novo[it.pergunta_id] = ev.target.value } }) : h('input', { class: 'modal-input', value: novo[it.pergunta_id] || '', 'data-testid': 'ed-' + it.pergunta_id, oninput: ev => { novo[it.pergunta_id] = ev.target.value } }))))),
    rodape: fechar => [btn('Cancelar', { tipo: 'sec', onclick: fechar }), btn('Salvar edição', { tid: 'salvar-edicao', onclick: () => { const mud = itens.filter(i => (novo[i.pergunta_id] || '') !== (e.respostas[i.pergunta_id] || '')); if (!mud.length) { fechar(); return } e.respostas_originais = e.respostas_originais || clonar(e.respostas); mud.forEach(i => { e.respostas[i.pergunta_id] = novo[i.pergunta_id] || null }); e.editado_em = agora(); auditar('form_editar_resposta', nomeContato(e.contato_id) + ' · ' + mud.map(i => i.texto).join(', ')); registrar(e.contato_id, 'Anotação', 'Respostas do formulário corrigidas internamente: ' + mud.map(i => i.texto).join(', '), e.caso_id); salvar('envios'); fechar(); aviso('Edição salva (original preservado).'); render(); atualizarCamadas() } })] })
}
async function exportarEnvio(e) {
  const csv = '﻿pergunta;resposta\n' + estruturaDoEnvio(e).map(p => `"${p.texto.replace(/"/g, '""')}";"${textoResposta(e.respostas[p.pergunta_id]).replace(/"/g, '""')}"`).join('\n')
  try { const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; if (!dl) throw new Error('indisponível'); await dl.save({ filename: `respostas-${nomeFormEnvio(e).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`, data: csv }) } catch (err) { copiar(csv); aviso('Download indisponível aqui: copiei o CSV para a área de transferência.') }
}

/* ---------- ficha do cliente / da demanda ---------- */
const linhaEnvio = e => [h('div', { class: 'flex-1 min-w-0' }, h('p', { class: 'font-semibold truncate' }, nomeFormEnvio(e)), h('p', { class: 'text-[11px] text-gray-500' }, 'Gerado ' + dataLonga(e.created_at) + (e.caso_id ? ' · ' + nomeDemanda(e.caso_id) : '') + (e.respondido_em ? ' · respondido ' + dataLonga(e.respondido_em) : e.prazo_resposta ? ' · responder até ' + dataLonga(e.prazo_resposta) : ''))), badgeEnvio(e), e.status === 'respondido' ? btn('Ver', { mini: true, tipo: 'sec', onclick: () => verEnvio(e), tid: 'ver-resposta' }) : btn(abertoEnvio(e) ? 'Enviar / lembrar' : 'Abrir', { mini: true, tipo: 'sec', tid: 'abrir-envio', onclick: () => painelEnvio(e, !!e.enviado_em) })]
function fichaPerguntas(c) {
  const forms = formsDoEscopo('cliente'); const envios = DB.envios.filter(e => e.contato_id === c.id).sort((a, b) => b.created_at.localeCompare(a.created_at))
  return h('div', { class: 'space-y-5' }, painel('Formulários enviados', h('div', { class: 'flex justify-end mb-2' }, btn('Enviar formulário', { mini: true, icone: 'ph:paper-plane-tilt-bold', tid: 'enviar-formulario', onclick: () => enviarFormulario(c) })), envios.length ? lista(envios.map(linhaEnvio)) : estadoVazio('ph:paper-plane-tilt-bold', 'Nenhum formulário enviado', 'Escolha um formulário ativo, gere o envio com código e envie o link.')))
}
const painelFormulariosDaDemanda = x => { const envios = DB.envios.filter(e => e.caso_id === x.id).sort((a, b) => b.created_at.localeCompare(a.created_at)); return painel('Formulários desta demanda', h('div', { class: 'flex justify-end mb-2' }, btn('Enviar formulário', { mini: true, icone: 'ph:paper-plane-tilt-bold', tid: 'enviar-form-demanda', onclick: () => enviarFormulario(contato(x.contato_id), null, { caso: x.id }) })), envios.length ? lista(envios.map(linhaEnvio)) : h('p', { class: 'text-sm text-gray-400' }, 'Nenhum formulário ligado a esta demanda.')) }

/* ---------- itens para o “Hoje” e contador do menu ---------- */
function itensFormularioHoje() {
  const out = []; const h0 = hojeISO(); const dias = FORM_CFG().lembreteDias
  for (const e of DB.envios) {
    if (e.nova && e.status === 'respondido') out.push({ tipo: 'formulario', envio_id: e.id, envio_acao: 'revisar', contato_id: e.contato_id, titulo: `Formulário respondido para revisar: ${nomeFormEnvio(e)}`, quando: diaDe(e.respondido_em) })
    else if (abertoEnvio(e) && (atrasadoEnvio(e) || (dias > 0 && e.enviado_em && diasEntre(diaDe((e.lembretes || []).at(-1)?.em || e.enviado_em), h0) >= dias))) out.push({ tipo: 'formulario', envio_id: e.id, envio_acao: 'lembrar', contato_id: e.contato_id, titulo: `Formulário sem resposta há ${diasEntre(diaDe((e.lembretes || []).at(-1)?.em || e.enviado_em), h0)} dias: ${nomeFormEnvio(e)}`, quando: diaDe((e.lembretes || []).at(-1)?.em || e.enviado_em), atraso: atrasadoEnvio(e) })
  }
  return out
}
const formulariosARever = () => DB.envios.filter(e => e.nova && e.status === 'respondido').length

/* ---------- gerenciador: lista e caixa de entrada ---------- */
UI.form.sit = 'publicado'; UI.form.est = 'todos'
VIEWS.formularios = (p) => {
  if (p && p.editar) { if (!CONSTR || CONSTR.id !== p.editar) CONSTR = { id: p.editar, el: Construtor(p.editar) }; return CONSTR.el }
  if (p && p.aba) UI.form.aba = p.aba
  const A = UI.form.aba; let corpo
  const nomeProc = v => (v.endsWith('/*') ? CRM.SERVICOS.find(s => s.id === v.slice(0, -2))?.nome : CRM.PROCEDIMENTOS.find(x => x.valor === v)?.rotulo) || v
  const chips = (lista_, atual, aoEscolher, pre) => h('div', { class: 'flex flex-wrap gap-2' }, lista_.map(([k, t]) => h('button', { type: 'button', class: 'chip ' + (atual === k ? 'chip-escuro' : ''), 'data-testid': pre + k, onclick: () => { aoEscolher(k); render() } }, t)))
  if (A === 'formularios') {
    const vis_ = DB.formularios.filter(f => (UI.form.ctx === 'todos' || f.contexto === UI.form.ctx) && (UI.form.sit === 'todos' || situacaoForm(f) === UI.form.sit))
    const qtd = s => DB.formularios.filter(f => situacaoForm(f) === s).length
    corpo = [h('div', { class: 'flex flex-wrap gap-x-6 gap-y-2' }, chips([['todos', 'Todos'], ...Object.entries(CRM.CONTEXTOS).map(([k, c]) => [k, c.nome])], UI.form.ctx, k => { UI.form.ctx = k }, 'ctx-filtro-'), chips([['publicado', `Ativos (${qtd('publicado')})`], ['rascunho', `Em configuração (${qtd('rascunho')})`], ['arquivado', `Arquivados (${qtd('arquivado')})`], ['todos', 'Todas as situações']], UI.form.sit, k => { UI.form.sit = k }, 'sit-filtro-')),
      vis_.length ? h('div', { class: 'grid grid-cols-1 lg:grid-cols-2 gap-4' }, vis_.map(f => { const sit = situacaoForm(f); const env = DB.envios.filter(e => e.formulario_id === f.id); return h('article', { class: 'rounded-3xl bg-white/70 dark:bg-zinc-900/60 border-l-[3px] border-secondary border-y border-r border-gray-200/70 dark:border-zinc-800 p-5 flex flex-col gap-3', 'data-testid': 'form-' + f.id },
        h('header', { class: 'flex items-start justify-between gap-3' }, h('div', { class: 'min-w-0' }, h('button', { type: 'button', class: 'font-semibold text-lg text-primary dark:text-zinc-100 hover:underline text-left', onclick: () => ir('formularios', { editar: f.id }) }, f.nome), f.descricao ? h('p', { class: 'text-xs text-gray-500 mt-0.5 line-clamp-2' }, f.descricao) : null), h('div', { class: 'flex flex-col items-end gap-1 shrink-0' }, badge(SITUACOES[sit][0], SITUACOES[sit][1]), h('span', { class: 'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-secondary/20 text-secondary-dark dark:text-cafe-creme' }, CRM.CONTEXTOS[f.contexto].nome))),
        h('p', { class: 'text-xs text-gray-400' }, `${itensDe(f).length} coluna(s)` + (f.planilha_id ? ' · planilha ligada' : ' · sem planilha'), f.contexto === 'demanda' ? ' · ' + (f.procedimentos.length ? f.procedimentos.map(nomeProc).join(', ') : 'todas as demandas') : '', ` · ${env.length} envio(s) · ${env.filter(e => e.status === 'respondido').length} respondido(s) · ${env.filter(abertoEnvio).length} pendente(s)`),
        h('div', { class: 'flex flex-wrap gap-2 mt-auto' }, h('button', { type: 'button', class: 'chip', onclick: () => ir('formularios', { editar: f.id }), 'data-testid': 'editar-' + f.id }, 'Editar'), sit === 'publicado' ? h('button', { type: 'button', class: 'chip', 'data-testid': 'enviar-' + f.id, onclick: () => enviarFormulario(null, f) }, 'Enviar') : null, h('button', { type: 'button', class: 'chip', onclick: () => { const id = duplicarForm(f); ir('formularios', { editar: id }) }, 'data-testid': 'duplicar-' + f.id }, 'Duplicar'), sit === 'arquivado' || sit === 'rascunho' ? h('button', { type: 'button', class: 'chip', 'data-testid': 'publicar-' + f.id, onclick: () => { if (ativarForm(f)) render() } }, 'Ativar') : h('button', { type: 'button', class: 'chip', 'data-testid': 'arquivar-' + f.id, onclick: () => { arquivarForm(f); render() } }, 'Arquivar'))) })) : estadoVazio('ph:clipboard-text-bold', 'Nenhum formulário aqui', UI.form.sit === 'publicado' ? 'Cadastre um formulário do Google Forms ou veja os que estão em configuração.' : 'Nada nesta situação.', btn('Cadastrar formulário', { onclick: novoFormulario }))]
  } else {
    const q = semAcento(UI.form.rq); const est = UI.form.est
    const todos = DB.envios.filter(e => (!q || semAcento(nomeContato(e.contato_id)).includes(q)) && (!UI.form.rf || e.formulario_id === Number(UI.form.rf)) && (!UI.form.rde || diaDe(e.respondido_em || e.created_at) >= UI.form.rde) && (!UI.form.rate || diaDe(e.respondido_em || e.created_at) <= UI.form.rate))
    const cont = { todos: todos.length, revisar: todos.filter(e => e.nova && e.status === 'respondido').length, pendentes: todos.filter(abertoEnvio).length, respondidos: todos.filter(e => e.status === 'respondido').length, expirados: todos.filter(e => ['expirado', 'cancelado'].includes(estadoEnvio(e))).length }
    const rows = todos.filter(e => est === 'todos' || (est === 'revisar' && e.nova && e.status === 'respondido') || (est === 'pendentes' && abertoEnvio(e)) || (est === 'respondidos' && e.status === 'respondido') || (est === 'expirados' && ['expirado', 'cancelado'].includes(estadoEnvio(e)))).sort((a, b) => (b.respondido_em || b.created_at).localeCompare(a.respondido_em || a.created_at))
    corpo = [painelSemVinculo(), h('div', { class: 'flex flex-wrap gap-2 items-center' }, chips([['todos', `Todos (${cont.todos})`], ['revisar', `A revisar (${cont.revisar})`], ['pendentes', `Aguardando resposta (${cont.pendentes})`], ['respondidos', `Respondidos (${cont.respondidos})`], ['expirados', `Expirados/cancelados (${cont.expirados})`]], est, k => { UI.form.est = k }, 'est-filtro-')),
      h('div', { class: 'flex flex-wrap gap-2 items-center' }, h('div', { class: 'w-64' }, busca(UI.form.rq, v => { UI.form.rq = v; render() }, 'Buscar por nome da cliente…')), h('select', { class: 'selecao', 'aria-label': 'Formulário', onchange: ev => { UI.form.rf = ev.target.value; render() } }, h('option', { value: '' }, 'Todos os formulários'), DB.formularios.map(f => h('option', { value: f.id, selected: String(f.id) === String(UI.form.rf) }, f.nome))), h('label', { class: 'flex items-center gap-1.5 text-xs text-gray-500' }, 'De', h('input', { type: 'date', class: 'selecao', value: UI.form.rde, 'aria-label': 'De', onchange: ev => { UI.form.rde = ev.target.value; render() } })), h('label', { class: 'flex items-center gap-1.5 text-xs text-gray-500' }, 'até', h('input', { type: 'date', class: 'selecao', value: UI.form.rate, 'aria-label': 'Até', onchange: ev => { UI.form.rate = ev.target.value; render() } })), btn('Ler respostas do Google', { mini: true, tipo: 'sec', icone: 'ph:cloud-arrow-down-bold', tid: 'sincronizar-form-site', onclick: () => sincronizarRespostasGoogle() }),
        h('span', { class: 'text-[11px] text-gray-400' }, CONFIG.integr.form_sync ? 'Última leitura das planilhas: ' + dataHora(CONFIG.integr.form_sync) : 'As respostas entram ao ler a planilha de cada formulário.')),
      tabela([{ nome: 'Cliente', cel: e => link(nomeContato(e.contato_id), () => abrirFicha(e.contato_id)) }, { nome: 'Formulário', cel: e => h('span', {}, nomeFormEnvio(e), e.caso_id ? h('span', { class: 'block text-[11px] text-gray-400' }, nomeDemanda(e.caso_id)) : null) }, { nome: 'Status', cel: badgeEnvio }, { nome: 'Enviado', cel: e => e.enviado_em ? dataHora(e.enviado_em) : h('span', { class: 'text-gray-400' }, 'não enviado') }, { nome: 'Respondeu / prazo', cel: e => e.respondido_em ? dataHora(e.respondido_em) : e.prazo_resposta ? 'até ' + dataLonga(e.prazo_resposta) : '—' }, { nome: '', cel: e => e.status === 'respondido' ? btn('Ver respostas', { mini: true, tipo: 'sec', onclick: () => verEnvio(e), tid: 'ver-resposta' }) : btn(abertoEnvio(e) ? (e.enviado_em ? 'Lembrar / reenviar' : 'Enviar') : 'Abrir', { mini: true, tipo: 'sec', tid: 'abrir-envio', onclick: () => painelEnvio(e, !!e.enviado_em) }) }], rows, { vazio: est === 'todos' ? 'Nenhum envio ainda' : 'Nada nesta visão', vazioTexto: 'Envie um formulário pela ficha do cliente ou pela lista de formulários.', icone: 'ph:paper-plane-tilt-bold' })]
  }
  return pagina('Formulários', 'O formulário é do Google Forms; as respostas vêm da planilha do Google e ficam ligadas à Pessoa e à Demanda pelo código do envio.', A === 'formularios' ? [btn('Cadastrar formulário', { icone: 'ph:plus-bold', onclick: novoFormulario, tid: 'novo-formulario' })] : null,
    h('div', { class: 'flex gap-2' }, h('button', { type: 'button', class: 'tab-btn ' + (A === 'formularios' ? 'tab-btn-ativo' : ''), onclick: () => { UI.form.aba = 'formularios'; render() }, 'data-testid': 'aba-formularios' }, 'Meus formulários'), h('button', { type: 'button', class: 'tab-btn ' + (A === 'respostas' ? 'tab-btn-ativo' : ''), onclick: () => { UI.form.aba = 'respostas'; render() }, 'data-testid': 'aba-respostas' }, 'Envios e respostas' + (formulariosARever() ? ` (${formulariosARever()})` : ''))), ...corpo.filter(Boolean))
}

