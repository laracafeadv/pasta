'use strict'
/* ============ Google Forms + Google Sheets → CRM ============
   Envio: o CRM gera um CÓDIGO por Pessoa/Demanda (LC-<pessoa>-<demanda>-XXXX) e coloca no link pré-preenchido do Google Forms.
   Leitura: o conector do Google Drive (como você) lê a planilha de respostas; a linha com aquele código vira a resposta daquele envio.
   Sem código (ou código desconhecido): a resposta vai para “sem identificação” e você vincula à Pessoa/Demanda com um clique.
   Nada é simulado: se o Drive não estiver conectado ou a planilha não abrir, o botão mostra o motivo. */
const fone55 = t => { let d = String(t || '').replace(/\D/g, ''); if (d.length === 10 || d.length === 11) d = '55' + d; return /^\d{12,13}$/.test(d) ? d : '' }
/* Dados de demonstração nunca se misturam com os reais: ficam marcados (exemplo=true) e podem ser removidos de uma vez. */
const ehExemplo = x => x.exemplo === true || (x.exemplo === undefined && x.id <= 9 && !x.real)

/* ---------- link do envio: o link do Google Forms com o código desta Pessoa/Demanda ---------- */
function linkRealDoEnvio(e) {
  const f = formularioDe(e.formulario_id); if (!f || !f.google_url) return ''
  const u = f.google_url; const cod = encodeURIComponent(e.codigo || '')
  return u.replace(new RegExp('([?&]entry\\.\\d+=)' + CODIGO_MARCA + '(?=&|$)', 'g'), '$1' + cod)
}

/* ---------- enviar: escolher Pessoa, Demanda e formulário → gerar o envio com código ---------- */
function enviarFormulario(c, f, opc = {}) {
  const ativos = DB.formularios.filter(x => situacaoForm(x) === 'publicado' && analisarLinkForms(x.google_url).ok)
  if (!ativos.length) { aviso('Cadastre e ative um formulário do Google Forms antes (Formulários › Cadastrar formulário).', 'erro'); return }
  const S = { cid: c ? c.id : '', fid: f && ativos.some(x => x.id === f.id) ? f.id : ativos[0].id, caso: opc.caso || '', prazo: '' }
  const corpo = h('div', { class: 'space-y-4', 'data-testid': 'envio-config' })
  const des = () => {
    const form = ativos.find(x => x.id === Number(S.fid)); const casos = S.cid ? demandasDe(Number(S.cid)) : []
    const sel = (rot, valor, ops, onchange, tid) => h('label', { class: 'block' }, rotuloCampo(rot), h('select', { class: 'modal-input', 'data-testid': tid, onchange: ev => { onchange(ev.target.value); des() } }, ops.map(([v, t]) => h('option', { value: v, selected: String(v) === String(valor) }, t))))
    corpo.replaceChildren(
      c ? h('p', { class: 'text-sm' }, h('b', {}, 'Pessoa: '), c.nome) : sel('Pessoa', S.cid, [['', 'Escolha…'], ...DB.contatos.map(x => [x.id, (x.nome || x.telefone) + (ehExemplo(x) ? ' (exemplo)' : '')])], v => { S.cid = v ? Number(v) : ''; S.caso = '' }, 'env-cliente'),
      sel('Formulário', S.fid, ativos.map(x => [x.id, x.nome]), v => { S.fid = Number(v) }, 'env-form'),
      !analisarLinkForms(form.google_url).temCodigo ? alerta('aviso', null, 'Este formulário não tem o marcador CODIGO no link: a resposta chegará sem identificação automática.') : null,
      S.cid ? sel(form.contexto === 'demanda' ? 'Demanda (obrigatória para este formulário)' : 'Demanda (opcional)', S.caso, [['', form.contexto === 'demanda' ? 'Escolha…' : '— sem demanda —'], ...casos.map(x => [x.id, x.titulo])], v => { S.caso = v ? Number(v) : '' }, 'env-caso') : null,
      h('label', { class: 'block' }, rotuloCampo('Data limite para resposta (opcional)'), h('input', { type: 'date', class: 'modal-input', value: S.prazo, 'data-testid': 'env-prazo', onchange: ev => { S.prazo = ev.target.value } })),
      h('p', { class: 'text-xs text-gray-500' }, 'O CRM gera um código para esta Pessoa' + (S.caso ? ' e Demanda' : '') + ' e o coloca no link do Google Forms. Quando a cliente responder, a resposta é reconhecida pelo código ao ler a planilha.'))
  }
  des()
  modal({ titulo: 'Enviar formulário', largura: 'max-w-xl', corpo, rodape: fechar => [btn('Cancelar', { tipo: 'sec', onclick: fechar }), btn('Gerar envio', { tid: 'gerar-link', onclick: () => {
    const form = ativos.find(x => x.id === Number(S.fid)); if (!S.cid) { aviso('Escolha a pessoa.', 'erro'); return } if (form.contexto === 'demanda' && !S.caso) { aviso('Este formulário é de uma demanda: escolha a demanda.', 'erro'); return }
    const e = criarEnvio(form, Number(S.cid), S.caso ? Number(S.caso) : null, S.prazo || null)
    fechar(); render(); painelEnvio(e, false, true)
  } })] })
}
function criarEnvio(form, cid, casoId, prazo) {
  const codigo = novoCodigo(cid, casoId)
  const e = { id: proximoId('envios'), created_at: agora(), formulario_id: form.id, formulario_nome: form.nome, contato_id: cid, caso_id: casoId || null, codigo, token: codigo, modo: 'google', origem: 'artefato', prazo_resposta: prazo || null, status: 'gerado', enviado_em: null, canal_envio: null, lembretes: [], respondido_em: null, respostas: {}, resumo: null }
  DB.envios.push(e); registrar(cid, 'Anotação', `Envio do formulário “${form.nome}” gerado (código ${codigo}).`, casoId || null); auditar('form_gerar_envio', nomeContato(cid) + ' · ' + form.nome); salvar('envios'); return e
}

/* ---------- ler a planilha (Google Sheets) pelo conector do Google Drive ---------- */
function csvParse(texto) {
  const t = String(texto).replace(/^﻿/, ''); const linha1 = t.split(/\r?\n/)[0] || ''; const cont = ch => (linha1.match(new RegExp(ch === '\t' ? '\t' : '\\' + ch, 'g')) || []).length
  const sep = cont('\t') > cont(',') && cont('\t') >= cont(';') ? '\t' : cont(';') > cont(',') ? ';' : ','
  const out = []; let linha = []; let campo = ''; let asp = false
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (asp) { if (ch === '"') { if (t[i + 1] === '"') { campo += '"'; i++ } else asp = false } else campo += ch; continue }
    if (ch === '"' && campo === '') asp = true
    else if (ch === sep) { linha.push(campo); campo = '' }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; linha.push(campo); campo = ''; if (linha.some(x => x !== '') || linha.length > 1) out.push(linha); linha = [] }
    else campo += ch
  }
  if (campo !== '' || linha.length) { linha.push(campo); if (linha.some(x => x !== '')) out.push(linha) }
  return out
}
function tabelaDeTexto(txt) {
  const t = String(txt || '').trim(); if (!t) return []
  const ls = t.split(/\r?\n/).filter(x => x.trim())
  if (ls[0].trim().startsWith('|')) return ls.filter(l => !/^\s*\|?\s*:?-{2,}/.test(l)).map(l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()))
  return csvParse(t)
}
function decodificarConteudo(r) {
  const cand = typeof r === 'string' ? r : r && (r.content ?? r.data ?? r.base64 ?? r.contentBase64 ?? r.fileContent ?? r.text ?? r.body)
  if (cand == null) return JSON.stringify(r || '')
  const s = String(cand); const sem = s.replace(/\s/g, '')
  if (!/[ ,;\t]/.test(s.trim()) && sem.length > 8 && sem.length % 4 === 0 && /^[A-Za-z0-9+/]+=*$/.test(sem)) { try { return new TextDecoder('utf-8').decode(Uint8Array.from(atob(sem), c => c.charCodeAt(0))) } catch (e) { /* não era base64 */ } }
  return s
}
async function lerTabelaPlanilha(id) {
  if (!idOk(id)) throw { code: 'invalido', message: 'ID de planilha inválido' }
  let ultimo
  try { const tab = tabelaDeTexto(decodificarConteudo(await driveC('download_file_content', { fileId: id, exportMimeType: 'text/csv' }))); if (tab.length && tab[0].length > 1) return tab } catch (e) { if (e && /not_granted|permission_denied|server_not_connected|indisponivel/.test(e.code || '')) throw e; ultimo = e }
  try { const tab = tabelaDeTexto(textoDoArquivo(await driveC('read_file_content', { fileId: id }))); if (tab.length && tab[0].length > 1) return tab } catch (e) { ultimo = e }
  throw { code: 'formato', message: 'não consegui ler uma tabela desta planilha' + (ultimo && ultimo.message ? ' (' + String(ultimo.message).slice(0, 80) + ')' : '') + '. Confira se ela é uma planilha Google que a sua conta consegue abrir e se a primeira aba é a das respostas' }
}
const ehColData = h_ => /carimbo|timestamp|data\/hora|data e hora/i.test(h_)
function papelAutomatico(titulo) {
  const t = semAcento(titulo); if (/e-?mail/.test(t)) return 'email'; if (/telefone|celular|whats/.test(t)) return 'telefone'; if (/\bcpf\b/.test(t)) return 'cpf'; if (/nascimento/.test(t)) return 'data_nascimento'; if (/^nome( completo)?\b|nome completo/.test(t)) return 'nome'; return null
}
function itensDaPlanilha(F, cab) {
  const mapa = new Map()
  cab.forEach((tit, i) => {
    if (!tit || ehColData(tit) || mapa.has(tit)) return
    let it = itensDe(F).find(x => x.texto === tit)
    if (!it) { it = { pergunta_id: novoIdPergunta(), texto: tit, tipo: 'texto_curto', mapear: /c[oó]digo/i.test(tit) ? null : papelAutomatico(tit) }; F.secoes[0].itens.push(it); if (!F.col_codigo && /c[oó]digo/i.test(tit)) F.col_codigo = tit }
    mapa.set(tit, it)
  })
  if (!F.col_data) { const d = cab.find(ehColData); if (d) F.col_data = d }
  return mapa
}
async function lerColunasDaPlanilha(F) {
  try { const tab = await lerTabelaPlanilha(F.planilha_id); const antes = itensDe(F).length; itensDaPlanilha(F, tab[0].map(x => String(x).trim())); F.updated_at = agora(); salvar('formularios'); CONFIG.integr.gforms_ok = true; salvar('config'); aviso(`${plural(itensDe(F).length - antes, 'coluna nova', 'colunas novas')} lida(s) da planilha.` + (F.col_codigo ? '' : ' Marque qual coluna é o CÓDIGO.')); return true }
  catch (e) { aviso(e && e.code === 'formato' || e && e.code === 'invalido' ? e.message : erroConector(e, 'Google Drive'), 'erro'); return false }
}
const hash32 = s => { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return (x >>> 0).toString(36) }
function dataDaPlanilha(s) {
  const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?/); if (!m) { const d = new Date(s); return isNaN(d) ? null : d.toISOString() }
  let [, a, b, y, hh, mm, ss] = m; let dia = Number(a), mes = Number(b); if (mes > 12 && dia <= 12) [dia, mes] = [mes, dia]
  const d = new Date(`${y}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T${hh.padStart(2, '0')}:${mm}:${(ss || '00').padStart(2, '0')}-03:00`); return isNaN(d) ? null : d.toISOString()
}
function sugestaoDeContato(F, valores) {
  const por_ = k => itensDe(F).filter(i => i.mapear === k).map(i => String(valores[i.pergunta_id] || '').trim()).filter(Boolean)
  const em = por_('email').map(x => x.toLowerCase()); const tel = por_('telefone').map(x => x.replace(/\D/g, '').slice(-9)).filter(x => x.length >= 8)
  const achados = DB.contatos.filter(c => (c.email && em.includes(String(c.email).toLowerCase())) || (c.telefone && tel.some(t => String(c.telefone).replace(/\D/g, '').endsWith(t))))
  return achados.length === 1 ? achados[0].id : null
}
function receberResposta(e, F, valores, ts, hash, vinculo) {
  e.respostas = valores; e.snap = estruturaDoEnvio(e); e.formulario_nome = F.nome; e.respondido_em = ts || agora(); e.importado_em = agora(); e.status = 'respondido'; e.nova = true; e.linha_hash = hash; e.vinculo = vinculo || 'codigo'
  registrar(e.contato_id, 'Documento recebido', `Formulário respondido: ${F.nome}`, e.caso_id); salvar('envios')
}
let LENDO_GF = false
async function sincronizarRespostasGoogle(opc = {}) {
  if (LENDO_GF) return 0
  const forms = DB.formularios.filter(f => f.planilha_id && situacaoForm(f) !== 'arquivado'); if (!forms.length) { if (!opc.silencioso) aviso('Nenhum formulário tem planilha cadastrada.', 'erro'); return 0 }
  LENDO_GF = true; let novas = 0, semV = 0
  try {
    for (const F of forms) {
      const tab = await lerTabelaPlanilha(F.planilha_id); const cab = tab[0].map(x => String(x).trim()); const mapa = itensDaPlanilha(F, cab)
      const iCod = F.col_codigo ? cab.indexOf(F.col_codigo) : -1; const iData = F.col_data ? cab.indexOf(F.col_data) : -1; const sem = CONFIG.respostas_sem_vinculo = CONFIG.respostas_sem_vinculo || []
      for (const linha of tab.slice(1)) {
        if (!linha.some(x => String(x).trim())) continue
        const hash = hash32(F.id + '|' + linha.join('\u0001'))
        if (DB.envios.some(e => e.linha_hash === hash) || sem.some(x => x.hash === hash) || (F.ignoradas || []).includes(hash)) continue
        const valores = {}; cab.forEach((tit, i) => { const it = mapa.get(tit); if (it && i !== iCod && String(linha[i] || '').trim()) valores[it.pergunta_id] = String(linha[i]).trim() })
        const ts = iData >= 0 ? dataDaPlanilha(linha[iData]) : null; const cod = iCod >= 0 ? String(linha[iCod] || '').trim().toUpperCase() : ''
        let e = cod ? DB.envios.find(x => x.codigo === cod && x.formulario_id === F.id) : null
        if (e && e.status === 'respondido') e = criarIrmao(e)
        if (!e && CODIGO_RE.test(cod)) { const [, cid, casoId] = cod.match(CODIGO_RE); if (contato(Number(cid)) && (Number(casoId) === 0 || demanda(Number(casoId)))) e = criarEnvioDeCodigo(F, Number(cid), Number(casoId) || null, cod) }
        if (e && e.status !== 'cancelado') { receberResposta(e, F, valores, ts, hash, 'codigo'); novas++ }
        else { sem.push({ hash, formulario_id: F.id, formulario_nome: F.nome, quando: ts || agora(), valores, codigo: cod || null, sugestao: sugestaoDeContato(F, valores) }); semV++ }
      }
    }
    CONFIG.integr.form_sync = agora(); CONFIG.integr.gforms_ok = true; salvar('config'); salvar('envios'); salvar('formularios')
    if (!opc.silencioso || novas || semV) aviso(novas || semV ? `${plural(novas, 'resposta nova ligada', 'respostas novas ligadas')} a Pessoa/Demanda` + (semV ? ` e ${plural(semV, 'sem identificação', 'sem identificação')} (veja em Envios e respostas).` : '.') : 'Nenhuma resposta nova na planilha.')
    render(); atualizarCamadas && atualizarCamadas(); return novas + semV
  } catch (e) { if (!opc.silencioso) aviso(e && (e.code === 'formato' || e.code === 'invalido') ? e.message : erroConector(e, 'Google Drive'), 'erro'); return 0 }
  finally { LENDO_GF = false }
}
const criarIrmao = e => { const n = { ...clonar(e), id: proximoId('envios'), status: 'gerado', respostas: {}, snap: null, respondido_em: null, importado_em: null, nova: false, linha_hash: null, revisado_em: null, aplicado_em: null, aplicado_log: [], created_at: agora() }; DB.envios.push(n); return n }
function criarEnvioDeCodigo(F, cid, casoId, codigo) { const e = { id: proximoId('envios'), created_at: agora(), formulario_id: F.id, formulario_nome: F.nome, contato_id: cid, caso_id: casoId, codigo, token: codigo, modo: 'google', origem: 'planilha', prazo_resposta: null, status: 'gerado', enviado_em: null, canal_envio: null, lembretes: [], respondido_em: null, respostas: {}, resumo: null }; DB.envios.push(e); return e }

/* ---------- respostas sem identificação: vincular à Pessoa/Demanda ---------- */
function vincularRespostaSemCodigo(r) {
  const F = formularioDe(r.formulario_id); if (!F) { aviso('O formulário desta resposta não existe mais.', 'erro'); return }
  const S = { cid: r.sugestao || '', caso: '' }; const corpo = h('div', { class: 'space-y-3' })
  const des = () => corpo.replaceChildren(h('div', { class: 'rounded-xl border border-gray-200 dark:border-zinc-700 p-3 text-xs space-y-0.5 max-h-48 overflow-y-auto' }, Object.entries(r.valores).slice(0, 12).map(([pid, v]) => h('p', {}, h('b', {}, (itensDe(F).find(i => String(i.pergunta_id) === pid) || {}).texto || pid, ': '), String(v).slice(0, 160)))),
    h('label', { class: 'block' }, rotuloCampo('Pessoa'), h('select', { class: 'modal-input', 'data-testid': 'vinc-pessoa', onchange: ev => { S.cid = ev.target.value ? Number(ev.target.value) : ''; S.caso = ''; des() } }, h('option', { value: '' }, 'Escolha…'), DB.contatos.map(c => h('option', { value: c.id, selected: c.id === S.cid }, c.nome + (c.id === r.sugestao ? ' (sugerida pelo e-mail/telefone)' : ''))))),
    S.cid ? h('label', { class: 'block' }, rotuloCampo('Demanda (opcional)'), h('select', { class: 'modal-input', 'data-testid': 'vinc-demanda', onchange: ev => { S.caso = ev.target.value ? Number(ev.target.value) : '' } }, h('option', { value: '' }, '— sem demanda —'), demandasDe(S.cid).map(d => h('option', { value: d.id }, d.titulo)))) : null)
  des()
  modal({ titulo: 'Vincular resposta', largura: 'max-w-lg', corpo, rodape: fechar => [btn('Cancelar', { tipo: 'sec', onclick: fechar }), btn('Vincular', { tid: 'vinc-confirmar', onclick: () => {
    if (!S.cid) { aviso('Escolha a pessoa.', 'erro'); return }
    const e = criarEnvioDeCodigo(F, Number(S.cid), S.caso ? Number(S.caso) : null, novoCodigo(Number(S.cid), S.caso || 0)); e.origem = 'planilha'; e.status = 'gerado'
    receberResposta(e, F, r.valores, r.quando, r.hash, S.cid === r.sugestao ? 'contato' : 'manual'); CONFIG.respostas_sem_vinculo = CONFIG.respostas_sem_vinculo.filter(x => x.hash !== r.hash); salvar('config'); fechar(); aviso('Resposta vinculada.'); render(); atualizarCamadas && atualizarCamadas() } })] })
}
function ignorarRespostaSemCodigo(r) { const F = formularioDe(r.formulario_id); if (F) { F.ignoradas = [...(F.ignoradas || []), r.hash]; salvar('formularios') } CONFIG.respostas_sem_vinculo = (CONFIG.respostas_sem_vinculo || []).filter(x => x.hash !== r.hash); salvar('config'); render() }
function painelSemVinculo() {
  const l = CONFIG.respostas_sem_vinculo || []; if (!l.length) return null
  return painel('Respostas sem identificação (' + l.length + ')', h('p', { class: 'text-xs text-gray-500 mb-2' }, 'Chegaram na planilha sem um código reconhecido. Nada é ligado sozinho: escolha a Pessoa (e a Demanda).'), lista(l.map(r => { const nm = Object.values(r.valores).slice(0, 2).map(v => String(v).slice(0, 40)).join(' · '); return [h('div', { class: 'flex-1 min-w-0' }, h('p', { class: 'font-semibold truncate' }, r.formulario_nome + (r.codigo ? ' · código “' + r.codigo + '” não reconhecido' : '')), h('p', { class: 'text-[11px] text-gray-500 truncate' }, dataHora(r.quando) + ' · ' + nm + (r.sugestao ? ' · parece ser ' + nomeContato(r.sugestao) : ''))), btn('Vincular', { mini: true, tid: 'vincular-resposta', onclick: () => vincularRespostaSemCodigo(r) }), btn('Ignorar', { mini: true, tipo: 'fantasma', tid: 'ignorar-resposta', onclick: () => ignorarRespostaSemCodigo(r) })] })))
}

/* ---------- Limpeza única: formulários e envios de exemplo das versões anteriores ---------- */
const NOMES_FORM_EXEMPLO = ['Dados da consulta', 'Pré-consulta (exemplo)', 'Dados para o contrato (exemplo)']
function migrarSeedsDeFormularios() {
  if (CONFIG.v_sem_form_exemplo) return
  DB.formularios = DB.formularios.filter(f => f.site_id || !(NOMES_FORM_EXEMPLO.includes(f.nome) && f.id <= 3))
  DB.envios = DB.envios.filter(e => e.site_id || !/^(a1b2c3d4e5f6a1b2c3d4e5f6|f6e5d4c3b2a1f6e5d4c3b2a1|0a1b2c3d4e5f0a1b2c3d4e5f)$/.test(e.token || ''))
  CONFIG.v_sem_form_exemplo = true; salvar('formularios'); salvar('envios'); salvar('config')
}
function limparDadosDeExemplo() {
  const ex = DB.contatos.filter(ehExemplo); if (!ex.length) { aviso('Não há dados de exemplo.'); return }
  confirmar('Remover os dados de exemplo?', `${plural(ex.length, 'pessoa de exemplo', 'pessoas de exemplo')} e tudo que está ligado a elas (demandas, prazos, tarefas, documentos, comunicações, formulários) serão removidos deste CRM. Os dados reais que você cadastrar não são afetados.`, 'Remover exemplos', () => {
    const ids = new Set(ex.map(c => c.id)); const dem = new Set(DB.demandas.filter(d => ids.has(d.contato_id)).map(d => d.id)); const proc = new Set(DB.processos.filter(p => dem.has(p.caso_id)).map(p => p.id))
    DB.demandas = DB.demandas.filter(d => !dem.has(d.id)); DB.processos = DB.processos.filter(p => !proc.has(p.id)); DB.partes = DB.partes.filter(x => !proc.has(x.processo_id) && !dem.has(x.caso_id)); DB.movimentacoes = DB.movimentacoes.filter(x => !proc.has(x.processo_id)); DB.etapas = DB.etapas.filter(x => !proc.has(x.processo_id)); DB.pendencias = DB.pendencias.filter(x => !proc.has(x.processo_id))
    for (const col of ['atividades', 'comunicacoes', 'tarefas', 'documentos', 'honorarios', 'compromissos', 'envios', 'intimacoes']) DB[col] = DB[col].filter(x => !ids.has(x.contato_id))
    DB.lancamentos = DB.lancamentos.filter(x => !dem.has(x.caso_id) && !ids.has(x.contato_id)); DB.contatos = DB.contatos.filter(c => !ids.has(c.id)); DB.notas = DB.notas.filter(n => !dem.has(n.caso_id))
    auditar('limpar_exemplos', plural(ex.length, 'pessoa', 'pessoas')); salvar('*'); aviso('Dados de exemplo removidos.'); render()
  })
}
