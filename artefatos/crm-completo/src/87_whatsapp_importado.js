'use strict'
/* ============ WhatsApp exportado → CRM → IA que ajuda (mas nunca envia) ============
   Fluxo: você usa o WhatsApp Business normalmente → no aplicativo, “Exportar conversa” → traz o arquivo (.txt ou .zip) para cá →
   o CRM lê, separa quem escreveu o quê, liga à Pessoa e à Demanda e guarda no histórico (sem duplicar se você importar de novo) →
   a IA analisa e sugere respostas → você revisa, copia e envia SOZINHA pelo WhatsApp.
   NÃO existe aqui: receber mensagem automaticamente nem enviar pelo CRM. O WhatsApp exporta só quando você pede. */

/* ---------- leitura do arquivo exportado ---------- */
const LIMPA_WA = s => String(s).replace(/[‎‏‪-‮]/g, '').replace(/[  ]/g, ' ')
const RE_WA = [
  /^\[(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4}),? (\d{1,2}):(\d{2})(?::(\d{2}))?(?: ?([AaPp])\.? ?[Mm]\.?)?\] (.*)$/,           // iPhone: [12/03/2024 14:05:10] Nome: texto
  /^(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4}),? (?:às )?(\d{1,2}):(\d{2})(?::(\d{2}))?(?: ?([AaPp])\.? ?[Mm]\.?)? ?[-–] (.*)$/       // Android: 12/03/2024 14:05 - Nome: texto
]
const MIDIA_WA = /^(<(m[ií]dia|media) (oculta|omitida|omitted)>|(imagem|v[ií]deo|[áa]udio|figurinha|sticker|documento|gif|contato) (oculta|omitida|ocultad[oa])|image omitted|video omitted|audio omitted|sticker omitted|document omitted|.+\.(jpe?g|png|webp|mp4|opus|ogg|m4a|pdf|docx?|xlsx?|vcf)\s*\((arquivo anexado|file attached)\)|(arquivo anexado|file attached))$/i
const RE_ANEXO = [/(?:^|\s)([^\s:<>"|?*\\/]+\.[A-Za-z0-9]{2,5})\s*\((?:arquivo anexado|file attached)\)/i, /<(?:anexado|attached):\s*([^>]+?)\s*>/i]
function midiaDe(t) { for (const re of RE_ANEXO) { const m = String(t).match(re); if (m) return { nome: m[1].trim(), trecho: m[0] } } return { nome: null, trecho: '' } }
function parseWhatsApp(texto) {
  const linhas = LIMPA_WA(texto).replace(/^﻿/, '').split(/\r?\n/); const brutas = []; let ult = null; let sistema = 0
  for (const ln of linhas) {
    let m = null; for (const re of RE_WA) { m = ln.match(re); if (m) break }
    if (m) {
      const resto = m[8]; const i = resto.indexOf(': ')
      if (i > 0 && i < 60) { ult = { d: [Number(m[1]), Number(m[2]), Number(m[3])], h: [Number(m[4]), Number(m[5]), Number(m[6] || 0)], ap: m[7] ? m[7].toLowerCase() : null, autor: resto.slice(0, i).trim(), texto: resto.slice(i + 2) }; brutas.push(ult) }
      else { ult = null; sistema++ }
    } else if (ult) ult.texto += '\n' + ln
  }
  if (!brutas.length) return { mensagens: [], autores: [], sistema, ordem: 'dma' }
  const dmy = brutas.some(x => x.d[0] > 12); const mdy = !dmy && brutas.some(x => x.d[1] > 12); const ordem = mdy ? 'mda' : 'dma'
  const mensagens = []
  for (const x of brutas) {
    let [a, b, ano] = x.d; let dia = ordem === 'mda' ? b : a; let mes = ordem === 'mda' ? a : b; if (ano < 100) ano += ano > 70 ? 1900 : 2000
    let hh = x.h[0]; if (x.ap === 'p' && hh < 12) hh += 12; if (x.ap === 'a' && hh === 12) hh = 0
    const iso = new Date(`${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T${String(hh).padStart(2, '0')}:${String(x.h[1]).padStart(2, '0')}:${String(x.h[2]).padStart(2, '0')}-03:00`)
    if (isNaN(iso)) continue
    const t = x.texto.trim(); const md = midiaDe(t); const legenda = md.nome ? t.replace(md.trecho, '').trim() : t; mensagens.push({ quando: iso.toISOString(), autor: x.autor, texto: md.nome ? legenda : t, midia: !!md.nome || MIDIA_WA.test(t), midia_nome: md.nome })
  }
  const contagem = new Map(); mensagens.forEach(m => contagem.set(m.autor, (contagem.get(m.autor) || 0) + 1))
  return { mensagens, autores: [...contagem.entries()].sort((a, b) => b[1] - a[1]).map(([nome, n]) => ({ nome, n })), sistema, ordem }
}
/* o arquivo exportado pode vir em .zip (com mídia): lê o texto e guarda a lista de arquivos para ligar às mensagens */
async function lerExportacaoWa(file) {
  if (/\.zip$/i.test(file.name)) {
    const zip = await CRM.JSZip.loadAsync(file); const nomes = Object.keys(zip.files).filter(n => /\.txt$/i.test(n) && !zip.files[n].dir)
    if (!nomes.length) throw new Error('não há arquivo .txt dentro do .zip'); nomes.sort((a, b) => (/_chat\.txt$|conversa/i.test(a) ? 0 : 1) - (/_chat\.txt$|conversa/i.test(b) ? 0 : 1))
    const entradas = new Map(); for (const n of Object.keys(zip.files)) { if (zip.files[n].dir || n === nomes[0]) continue; entradas.set(n.split('/').pop().toLowerCase(), zip.files[n]) }
    return { texto: await zip.files[nomes[0]].async('string'), entradas }
  }
  return { texto: await file.text(), entradas: new Map() }
}

/* ---------- importar para a Pessoa / Demanda ---------- */
const extWa = (cid, m) => 'wx:' + hash32(cid + '|' + m.quando + '|' + m.autor + '|' + m.texto)
const pareceTelefone = s => /^\+?[\d\s()-]{10,}$/.test(String(s).trim())
const nomeSemelhante = (a, b) => { const x = semAcento(a).split(/\s+/)[0]; const y = semAcento(b).split(/\s+/)[0]; return x.length > 2 && x === y }
function importarConversaWhatsApp(opc = {}) {
  const S = { texto: '', lido: null, eu: '', cid: opc.contato ? opc.contato.id : '', caso: opc.caso || '', nome_arquivo: '', entradas: new Map(), drive: false }
  const corpo = h('div', { class: 'space-y-4', 'data-testid': 'import-wa' })
  const area = h('textarea', { class: 'modal-input text-xs', rows: 4, placeholder: '…ou cole aqui o texto da conversa exportada', 'data-testid': 'wa-colar', oninput: ev => { S.texto = ev.target.value; S.nome_arquivo = 'texto colado' } })
  const arq = h('input', { type: 'file', accept: '.txt,.zip,text/plain,application/zip', 'data-testid': 'wa-arquivo', 'aria-label': 'Arquivo exportado do WhatsApp', onchange: async ev => { const f = ev.target.files[0]; if (!f) return; try { const x = await lerExportacaoWa(f); S.texto = x.texto; S.entradas = x.entradas; S.nome_arquivo = f.name; area.value = ''; ler() } catch (e) { aviso('Não consegui abrir o arquivo: ' + (e && e.message || e), 'erro') } } })
  const ler = () => {
    if (!S.texto.trim()) { aviso('Escolha o arquivo ou cole o texto da conversa.', 'erro'); return }
    const r = parseWhatsApp(S.texto); if (!r.mensagens.length) { S.lido = null; des(); aviso('Não reconheci mensagens neste texto. Use “Exportar conversa” do WhatsApp (formato .txt).', 'erro'); return }
    S.lido = r; const sug = r.autores.find(a => semAcento(a.nome).includes('lara') || semAcento(a.nome).includes('escritorio')); S.eu = sug ? sug.nome : ''
    if (!S.cid) { const outros = r.autores.filter(a => a.nome !== S.eu); const achado = DB.contatos.find(c => outros.some(o => nomeSemelhante(o.nome, c.nome) || (pareceTelefone(o.nome) && c.telefone && String(c.telefone).endsWith(o.nome.replace(/\D/g, '').slice(-9))))); if (achado) S.cid = achado.id }
    des()
  }
  const des = () => {
    const r = S.lido; const outros = r ? r.autores.filter(a => a.nome !== S.eu) : []
    const sel = (rot, valor, ops, onchange, tid) => h('label', { class: 'block' }, rotuloCampo(rot), h('select', { class: 'modal-input', 'data-testid': tid, onchange: ev => { onchange(ev.target.value); des() } }, ops.map(([v, t]) => h('option', { value: v, selected: String(v) === String(valor) }, t))))
    const periodo = r ? `${dataLonga(r.mensagens[0].quando)} a ${dataLonga(r.mensagens[r.mensagens.length - 1].quando)}` : ''
    corpo.replaceChildren(
      alerta('info', 'Como exportar', 'No WhatsApp Business: abra a conversa › ⋮ (Android) ou o nome do contato (iPhone) › Mais › Exportar conversa › “Incluir mídia” (gera um .zip com as fotos, PDFs e áudios) ou “Sem mídia” (só o texto). Envie o arquivo para você mesma (e-mail ou Drive) e escolha-o aqui. O CRM só lê o que você importar.'),
      h('div', { class: 'space-y-2' }, h('label', { class: 'block' }, rotuloCampo('Arquivo da conversa (.txt ou .zip)'), arq), area, btn('Ler conversa', { mini: true, tipo: 'sec', icone: 'ph:file-text-bold', tid: 'wa-ler', onclick: ler })),
      r ? h('div', { class: 'space-y-3 border-t border-gray-100 dark:border-zinc-800 pt-3' },
        h('p', { class: 'text-sm', 'data-testid': 'wa-resumo' }, h('b', {}, plural(r.mensagens.length, 'mensagem', 'mensagens')), ' · ' + periodo + ' · ' + r.autores.map(a => `${a.nome} (${a.n})`).join(', ')), (() => { const com = r.mensagens.filter(m => m.midia_nome); const disp = com.filter(m => S.entradas.has(m.midia_nome.toLowerCase())).length; const oc = r.mensagens.filter(m => m.midia && !m.midia_nome).length; return (com.length || oc) ? h('p', { class: 'text-xs ' + (disp === com.length && !oc ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-300'), 'data-testid': 'wa-midias' }, `Mídias: ${com.length ? disp + ' de ' + com.length + ' arquivos mencionados vieram no .zip' : 'nenhum arquivo nomeado'}${com.length - disp ? '; ' + (com.length - disp) + ' NÃO foram disponibilizados na exportação (ficam marcados como não disponíveis)' : ''}${oc ? '; ' + oc + ' mensagem(ns) com “mídia oculta” (sem arquivo)' : ''}.`) : null })(),
        sel('Quem é você (escritório) nesta conversa?', S.eu, [['', 'Escolha…'], ...r.autores.map(a => [a.nome, a.nome])], v => { S.eu = v }, 'wa-eu'),
        S.eu ? sel('Pessoa no CRM', S.cid, [['', 'Escolha…'], ...(!S.cid && outros[0] && !pareceTelefone(outros[0].nome) ? [['__nova', '➕ Cadastrar nova: ' + outros[0].nome]] : []), ...DB.contatos.map(c => [c.id, c.nome + (ehExemplo(c) ? ' (exemplo)' : '')])], v => { S.cid = v === '__nova' ? v : (v ? Number(v) : ''); S.caso = '' }, 'wa-pessoa') : null,
        S.eu && S.cid && S.cid !== '__nova' ? sel('Demanda (opcional)', S.caso, [['', '— sem demanda —'], ...demandasDe(Number(S.cid)).map(d => [d.id, d.titulo])], v => { S.caso = v ? Number(v) : '' }, 'wa-demanda') : null,
        S.entradas.size && S.cid && S.cid !== '__nova' && contato(Number(S.cid)) && contato(Number(S.cid)).drive_pasta_id ? h('label', { class: 'flex items-center gap-2 text-sm' }, h('input', { type: 'checkbox', class: 'accent-[#6f5636]', 'data-testid': 'wa-drive', onchange: ev => { S.drive = ev.target.checked } }), 'Guardar as mídias no Drive do cliente (até 8 MB cada)') : null,
        outros.length > 1 ? alerta('aviso', null, 'Há mais de um participante além de você: todas as mensagens deles serão tratadas como “da cliente”. Se for um grupo, confira.') : null) : null)
  }
  des()
  modal({ titulo: 'Importar conversa do WhatsApp', largura: 'max-w-xl', corpo, rodape: fechar => [btn('Cancelar', { tipo: 'sec', onclick: fechar }), btn('Importar', { tid: 'wa-importar', onclick: async ev => {
    const r = S.lido; if (!r) { aviso('Leia a conversa primeiro.', 'erro'); return } if (!S.eu) { aviso('Diga quem é você na conversa.', 'erro'); return } if (!S.cid) { aviso('Escolha a Pessoa.', 'erro'); return }
    const botao = ev && ev.currentTarget; if (botao) { botao.disabled = true; botao.textContent = 'Importando…' }
    let c; if (S.cid === '__nova') { const outro = r.autores.find(a => a.nome !== S.eu); c = criarContatoReal({ nome: outro.nome, telefone: null, origem: 'whatsapp' }) } else c = contato(Number(S.cid))
    const caso = S.caso ? Number(S.caso) : null; let novas = 0, ja = 0, midias = 0, semMidia = 0; const existentes = new Map(DB.comunicacoes.filter(m => m.contato_id === c.id && m.ext_id).map(m => [m.ext_id, m])); const pend = []
    for (const m of r.mensagens) {
      const ext = extWa(c.id, m); const minha = m.autor === S.eu; const ex = existentes.get(ext)
      if (ex) { ja++; if (m.midia_nome && !ex.midia_ref && S.entradas.has(m.midia_nome.toLowerCase())) pend.push({ msg: ex, nome: m.midia_nome }); continue }
      const msg = { id: proximoId('comunicacoes'), contato_id: c.id, caso_id: caso, processo_id: null, canal: 'whatsapp', direcao: minha ? 'saida' : 'entrada', assunto: null, texto: m.midia_nome ? (m.texto || '[anexo]') : m.midia ? '[mídia omitida na exportação]' : m.texto.slice(0, 4000), anexos: [], origem: 'whatsapp-exportacao', ext_id: ext, link: null, created_at: m.quando, lida: true, autor_wa: m.autor }
      if (m.midia_nome) { msg.midia_nome = m.midia_nome; if (S.entradas.has(m.midia_nome.toLowerCase())) pend.push({ msg, nome: m.midia_nome }); else { msg.midia_estado = 'nao_disponibilizada'; semMidia++ } }
      DB.comunicacoes.push(msg); existentes.set(ext, msg); novas++
    }
    for (const { msg, nome } of pend) { try { const blob = await S.entradas.get(nome.toLowerCase()).async('blob'); const file = new File([blob], nome); const mat = await materialDeArquivo(c, caso, file, { origem: 'whatsapp-exportacao', data: msg.created_at, mensagem_id: msg.id, drive: S.drive }); msg.midia_ref = mat.id; msg.midia_estado = 'disponivel'; msg.midia_nome = nome; midias++ } catch (e) { msg.midia_estado = 'nao_disponibilizada' } }
    if (novas || !DB.materiais.some(x => x.tipo === 'conversa' && x.contato_id === c.id && x.nome_arquivo === S.nome_arquivo)) criarMaterial({ contato_id: c.id, caso_id: caso, tipo: 'conversa', titulo: 'Conversa do WhatsApp — ' + S.nome_arquivo, origem: 'whatsapp-exportacao', nome_arquivo: S.nome_arquivo, n_mensagens: r.mensagens.length, periodo: [r.mensagens[0].quando, r.mensagens[r.mensagens.length - 1].quando], participantes: r.autores.map(a => a.nome), data: r.mensagens[r.mensagens.length - 1].quando, texto: S.texto.length < 800000 ? S.texto : '', texto_origem: 'arquivo exportado (original)' })
    const ult = DB.comunicacoes.filter(m => m.contato_id === c.id).map(m => m.created_at).sort().pop(); if (ult) { c.ultimo_contato_em = ult > (c.ultimo_contato_em || '') ? ult : c.ultimo_contato_em; c.updated_at = agora() }
    registrar(c.id, 'Anotação', `Conversa do WhatsApp importada: ${plural(novas, 'mensagem nova', 'mensagens novas')}` + (ja ? ` (${ja} já existiam)` : '') + (midias ? `; ${plural(midias, 'mídia ligada à mensagem', 'mídias ligadas às mensagens')}` : '') + (semMidia ? `; ${semMidia} sem arquivo na exportação` : '') + ` — arquivo “${S.nome_arquivo}”.`, caso); auditar('importar_whatsapp', c.nome + ' · ' + novas)
    if (c.atendimento === undefined || !c.atendimento) { c.atendimento = { status: 'Em conversa', desde: agora() } } else if (['Novo contato'].includes(c.atendimento.status)) { c.atendimento = { status: 'Em conversa', desde: agora() } }
    salvar('comunicacoes'); salvar('contatos'); salvar('materiais'); fechar(); UI.com.sel = c.id; UI.comAbas.aba = 'caixa'; aviso(novas ? `${plural(novas, 'mensagem importada', 'mensagens importadas')}.` + (midias ? ` ${plural(midias, 'mídia ligada', 'mídias ligadas')}.` : '') + (ja ? ` ${ja} já estavam no CRM.` : '') : (midias ? `${plural(midias, 'mídia ligada', 'mídias ligadas')} a mensagens já importadas.` : 'Nada novo: todas as mensagens já estavam no CRM.')); if (R.rota !== 'comunicacao') ir('comunicacao', { contato: c.id }); else render()
  } })] })
}
/* liga ao mesmo tempo todas as mensagens de uma Pessoa que ainda não têm demanda */
function vincularConversaADemanda(c) {
  const ds = demandasDe(c.id); if (!ds.length) { aviso('Esta pessoa ainda não tem demanda.', 'erro'); return }
  const sem = DB.comunicacoes.filter(m => m.contato_id === c.id && !m.caso_id); let alvo = ds[0].id
  modal({ titulo: 'Vincular conversa a uma demanda', largura: 'max-w-md', corpo: h('div', { class: 'space-y-3' }, h('p', { class: 'text-sm' }, plural(sem.length, 'mensagem sem demanda', 'mensagens sem demanda') + ' de ' + c.nome + '.'), h('select', { class: 'modal-input', 'data-testid': 'vinc-conversa-demanda', onchange: ev => { alvo = Number(ev.target.value) } }, ds.map(d => h('option', { value: d.id }, d.titulo)))), rodape: f => [btn('Cancelar', { tipo: 'sec', onclick: f }), btn('Vincular', { tid: 'vinc-conversa-ok', onclick: () => { sem.forEach(m => { m.caso_id = alvo }); salvar('comunicacoes'); f(); aviso('Mensagens vinculadas.'); render() } })] })
}

/* ---------- assistente da conversa (IA): analisa e escreve rascunho; NUNCA envia ---------- */
const ASSIST = [
  ['Análise', [['analisar', 'O que o cliente está pedindo', 'Diga, em tópicos curtos, o que a cliente está pedindo ou quer, o contexto e o tom emocional. Só com base na conversa.'], ['resumo', 'Resumir a conversa', 'Resuma a conversa em até 10 linhas, em ordem cronológica, destacando datas, decisões e o último ponto em aberto.'], ['faltam', 'O que ainda falta informar', 'Liste as informações que a cliente AINDA NÃO forneceu e que a advogada precisaria para avançar (dados pessoais, fatos, datas, partes, bens). Indique o que já foi informado. Não invente.'], ['docs', 'Documentos a solicitar', 'Liste os documentos que provavelmente precisam ser pedidos à cliente para este assunto, com uma linha de motivo cada, separando “já enviados ou mencionados” de “a pedir”. Diga que a Dra. confirma a lista.'], ['fatos', 'Organizar os fatos', 'Organize os fatos relatados pela cliente em lista numerada, em ordem cronológica, citando a data da mensagem quando houver. Separe fatos, opiniões e pedidos. Não acrescente nada.'], ['pendencias', 'Pendências', 'Identifique as pendências: perguntas da cliente sem resposta, promessas do escritório, documentos aguardados e prazos mencionados.']]],
  ['Resposta (rascunho)', [['resposta', 'Sugerir resposta', 'Escreva UMA resposta para a última mensagem da cliente, curta (até ~600 caracteres), estilo WhatsApp, só o texto da mensagem.'], ['objetiva', 'Mais objetiva', 'Escreva UMA resposta mais OBJETIVA para a última mensagem da cliente (até ~400 caracteres), só o texto.'], ['acolhedora', 'Mais acolhedora', 'Escreva UMA resposta mais ACOLHEDORA, mas profissional, para a última mensagem da cliente (até ~600 caracteres), só o texto.'], ['proximo', 'Explicar o próximo passo', 'Escreva UMA mensagem explicando à cliente o próximo passo, em linguagem simples (até ~600 caracteres), sem prometer resultado, só o texto.'], ['simular', 'Simular a continuação', 'Simule como a conversa poderia continuar nas próximas 4 trocas, alternando ESCRITÓRIO e CLIENTE. Deixe claro no início que é uma SIMULAÇÃO hipotética e que as falas da cliente são suposições.']]],
]
function conversaParaIA(c, casoId, max = 120) {
  const ms = comunicacoesDe(c.id, casoId).filter(m => m.canal === 'whatsapp' || m.canal === 'email').slice(-max); let total = 0; const linhas = []
  for (let i = ms.length - 1; i >= 0; i--) { const m = ms[i]; const l = `[${dataCurta(m.created_at)} ${new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}] ${m.direcao === 'entrada' ? 'CLIENTE' : 'ESCRITÓRIO'}: ${corta(m.texto, 500)}`; total += l.length; if (total > 14000) break; linhas.unshift(l) }
  return { texto: linhas.join('\n'), n: linhas.length }
}
function AssistenteConversa(c, casoId) {
  const extra = h('input', { class: 'modal-input !text-sm', placeholder: 'Opcional: orientação (ex.: “sem citar prazo”, “mais curta”) ou peça outra coisa', 'data-testid': 'assist-livre', 'aria-label': 'Orientação para a IA' })
  const abrir = (id, rot, instrucao) => janelaNucleo({ c, casoId, titulo: rot + ' — ' + c.nome, tipo: 'assist_' + id, tarefa: instrucao + (extra.value.trim() ? '\nOrientação adicional da advogada: ' + extra.value.trim() : '') + '\nFoco: a CONVERSA ([W…]); use as demais fontes só para confirmar ou contradizer.' })
  const grupos = ASSIST.map(([titulo, lista_]) => h('div', { class: 'space-y-1.5' }, h('p', { class: 'section-label' }, titulo), h('div', { class: 'flex flex-wrap gap-1.5' }, lista_.map(([id, rot, instrucao]) => h('button', { type: 'button', class: 'chip', 'data-testid': 'assist-' + id, onclick: () => abrir(id, rot, instrucao) }, rot)))))
  const livreBtn = btn('Pedir', { mini: true, icone: 'ph:sparkle-bold', tid: 'assist-pedir', class: 'ia-btn', onclick: () => { if (!extra.value.trim()) { aviso('Escreva o que você precisa.', 'erro'); return } abrir('livre', 'Pedido à IA', 'Atenda ao pedido da advogada sobre este caso: ' + extra.value.trim()) } })
  extra.addEventListener('keydown', ev => { if (ev.key === 'Enter') livreBtn.click() })
  return h('div', { class: 'space-y-3', 'data-testid': 'assistente-conversa' }, alerta('info', null, 'A IA lê a conversa e o resto do material deste caso e devolve rascunhos com as fontes. Ela NÃO envia nada: você revisa, copia e envia pelo WhatsApp.'), ...grupos, h('div', { class: 'flex gap-2' }, h('div', { class: 'flex-1' }, extra), livreBtn), btn('Abrir o atendimento completo (contexto, materiais, formulário, consulta, parecer)', { mini: true, tipo: 'sec', icone: 'ph:brain-bold', tid: 'assist-atendimento', onclick: () => { fecharTodas(); abrirAtendimento(c.id, casoId) } }))
}
