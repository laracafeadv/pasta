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
    const t = x.texto.trim(); mensagens.push({ quando: iso.toISOString(), autor: x.autor, texto: t, midia: MIDIA_WA.test(t) })
  }
  const contagem = new Map(); mensagens.forEach(m => contagem.set(m.autor, (contagem.get(m.autor) || 0) + 1))
  return { mensagens, autores: [...contagem.entries()].sort((a, b) => b[1] - a[1]).map(([nome, n]) => ({ nome, n })), sistema, ordem }
}
/* o arquivo exportado pode vir em .zip (com mídia): lê só o texto */
let JSZIP = null
async function carregarJSZip() {
  if (window.JSZip) return window.JSZip; if (JSZIP) return JSZIP
  JSZIP = new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload = () => ok(window.JSZip); s.onerror = () => no(new Error('não consegui carregar o leitor de .zip')); document.head.appendChild(s) }); return JSZIP
}
async function textoDoArquivoWa(file) {
  if (/\.zip$/i.test(file.name)) {
    const Z = await carregarJSZip(); const zip = await Z.loadAsync(file); const nomes = Object.keys(zip.files).filter(n => /\.txt$/i.test(n) && !zip.files[n].dir)
    if (!nomes.length) throw new Error('não há arquivo .txt dentro do .zip'); nomes.sort((a, b) => (/_chat\.txt$|conversa/i.test(a) ? 0 : 1) - (/_chat\.txt$|conversa/i.test(b) ? 0 : 1))
    return zip.files[nomes[0]].async('string')
  }
  return file.text()
}

/* ---------- importar para a Pessoa / Demanda ---------- */
const extWa = (cid, m) => 'wx:' + hash32(cid + '|' + m.quando + '|' + m.autor + '|' + m.texto)
const pareceTelefone = s => /^\+?[\d\s()-]{10,}$/.test(String(s).trim())
const nomeSemelhante = (a, b) => { const x = semAcento(a).split(/\s+/)[0]; const y = semAcento(b).split(/\s+/)[0]; return x.length > 2 && x === y }
function importarConversaWhatsApp(opc = {}) {
  const S = { texto: '', lido: null, eu: '', cid: opc.contato ? opc.contato.id : '', caso: opc.caso || '', nome_arquivo: '' }
  const corpo = h('div', { class: 'space-y-4', 'data-testid': 'import-wa' })
  const area = h('textarea', { class: 'modal-input text-xs', rows: 4, placeholder: '…ou cole aqui o texto da conversa exportada', 'data-testid': 'wa-colar', oninput: ev => { S.texto = ev.target.value; S.nome_arquivo = 'texto colado' } })
  const arq = h('input', { type: 'file', accept: '.txt,.zip,text/plain,application/zip', 'data-testid': 'wa-arquivo', 'aria-label': 'Arquivo exportado do WhatsApp', onchange: async ev => { const f = ev.target.files[0]; if (!f) return; try { S.texto = await textoDoArquivoWa(f); S.nome_arquivo = f.name; area.value = ''; ler() } catch (e) { aviso('Não consegui abrir o arquivo: ' + (e && e.message || e), 'erro') } } })
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
      alerta('info', 'Como exportar', 'No WhatsApp Business: abra a conversa › ⋮ (Android) ou o nome do contato (iPhone) › Mais › Exportar conversa › “Sem mídia”. Envie o arquivo para você mesma (e-mail ou Drive) e escolha-o aqui. O CRM só lê o que você importar.'),
      h('div', { class: 'space-y-2' }, h('label', { class: 'block' }, rotuloCampo('Arquivo da conversa (.txt ou .zip)'), arq), area, btn('Ler conversa', { mini: true, tipo: 'sec', icone: 'ph:file-text-bold', tid: 'wa-ler', onclick: ler })),
      r ? h('div', { class: 'space-y-3 border-t border-gray-100 dark:border-zinc-800 pt-3' },
        h('p', { class: 'text-sm', 'data-testid': 'wa-resumo' }, h('b', {}, plural(r.mensagens.length, 'mensagem', 'mensagens')), ' · ' + periodo + ' · ' + r.autores.map(a => `${a.nome} (${a.n})`).join(', ')),
        sel('Quem é você (escritório) nesta conversa?', S.eu, [['', 'Escolha…'], ...r.autores.map(a => [a.nome, a.nome])], v => { S.eu = v }, 'wa-eu'),
        S.eu ? sel('Pessoa no CRM', S.cid, [['', 'Escolha…'], ...(!S.cid && outros[0] && !pareceTelefone(outros[0].nome) ? [['__nova', '➕ Cadastrar nova: ' + outros[0].nome]] : []), ...DB.contatos.map(c => [c.id, c.nome + (ehExemplo(c) ? ' (exemplo)' : '')])], v => { S.cid = v === '__nova' ? v : (v ? Number(v) : ''); S.caso = '' }, 'wa-pessoa') : null,
        S.eu && S.cid && S.cid !== '__nova' ? sel('Demanda (opcional)', S.caso, [['', '— sem demanda —'], ...demandasDe(Number(S.cid)).map(d => [d.id, d.titulo])], v => { S.caso = v ? Number(v) : '' }, 'wa-demanda') : null,
        outros.length > 1 ? alerta('aviso', null, 'Há mais de um participante além de você: todas as mensagens deles serão tratadas como “da cliente”. Se for um grupo, confira.') : null) : null)
  }
  des()
  modal({ titulo: 'Importar conversa do WhatsApp', largura: 'max-w-xl', corpo, rodape: fechar => [btn('Cancelar', { tipo: 'sec', onclick: fechar }), btn('Importar', { tid: 'wa-importar', onclick: () => {
    const r = S.lido; if (!r) { aviso('Leia a conversa primeiro.', 'erro'); return } if (!S.eu) { aviso('Diga quem é você na conversa.', 'erro'); return } if (!S.cid) { aviso('Escolha a Pessoa.', 'erro'); return }
    let c; if (S.cid === '__nova') { const outro = r.autores.find(a => a.nome !== S.eu); c = criarContatoReal({ nome: outro.nome, telefone: null, origem: 'whatsapp' }) } else c = contato(Number(S.cid))
    const caso = S.caso ? Number(S.caso) : null; let novas = 0, ja = 0; const existentes = new Set(DB.comunicacoes.filter(m => m.contato_id === c.id && m.ext_id).map(m => m.ext_id))
    for (const m of r.mensagens) {
      const ext = extWa(c.id, m); if (existentes.has(ext)) { ja++; continue } existentes.add(ext); const minha = m.autor === S.eu
      DB.comunicacoes.push({ id: proximoId('comunicacoes'), contato_id: c.id, caso_id: caso, processo_id: null, canal: 'whatsapp', direcao: minha ? 'saida' : 'entrada', assunto: null, texto: m.midia ? '[mídia omitida na exportação]' : m.texto.slice(0, 4000), anexos: [], origem: 'whatsapp-exportacao', ext_id: ext, link: null, created_at: m.quando, lida: true, autor_wa: m.autor }); novas++
    }
    const ult = DB.comunicacoes.filter(m => m.contato_id === c.id).map(m => m.created_at).sort().pop(); if (ult) { c.ultimo_contato_em = ult > (c.ultimo_contato_em || '') ? ult : c.ultimo_contato_em; c.updated_at = agora() }
    registrar(c.id, 'Anotação', `Conversa do WhatsApp importada: ${plural(novas, 'mensagem nova', 'mensagens novas')}` + (ja ? ` (${ja} já existiam)` : '') + ` — arquivo “${S.nome_arquivo}”.`, caso); auditar('importar_whatsapp', c.nome + ' · ' + novas)
    salvar('comunicacoes'); salvar('contatos'); fechar(); UI.com.sel = c.id; UI.comAbas.aba = 'caixa'; aviso(novas ? `${plural(novas, 'mensagem importada', 'mensagens importadas')}.` + (ja ? ` ${ja} já estavam no CRM.` : '') : 'Nada novo: todas as mensagens já estavam no CRM.'); if (R.rota !== 'comunicacao') ir('comunicacao', { contato: c.id }); else render()
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
  const saida = h('div', { class: 'whitespace-pre-wrap text-sm min-h-[5rem] rounded-2xl border border-gray-200 dark:border-zinc-700 p-3 bg-white/60 dark:bg-zinc-900/50', 'data-testid': 'assist-saida' }, 'Escolha uma ação acima ou escreva o que precisa.')
  const extra = h('input', { class: 'modal-input !text-sm', placeholder: 'Opcional: orientação (ex.: “sem citar prazo”, “mais curta”) ou peça outra coisa', 'data-testid': 'assist-livre', 'aria-label': 'Orientação para a IA' })
  let ctl = null; let ultimo = ''; let ultimoPedido = null
  const barra = h('div', { class: 'flex flex-wrap gap-2' })
  const botoesSaida = () => barra.replaceChildren(btn('Copiar', { mini: true, tipo: 'sec', icone: 'ph:copy-bold', tid: 'assist-copiar', onclick: () => ultimo ? copiar(ultimo) : aviso('Nada para copiar ainda.', 'erro') }), btn('Salvar como anotação', { mini: true, tipo: 'fantasma', tid: 'assist-salvar', onclick: () => { if (!ultimo) return; registrar(c.id, 'Peça / pesquisa', 'Análise/sugestão (IA): ' + ultimo, casoId || null); aviso('Salvo na linha do tempo.') } }), btn('Refazer', { mini: true, tipo: 'fantasma', tid: 'assist-refazer', onclick: () => ultimoPedido && rodar(ultimoPedido) }))
  const rodar = (pedido) => {
    const conv = conversaParaIA(c, casoId); if (!conv.n) { aviso('Não há mensagens nesta conversa para analisar. Importe a conversa do WhatsApp primeiro.', 'erro'); return }
    ultimoPedido = pedido
    exigirIA(async s => {
      ctl && ctl.abort(); ctl = new AbortController(); saida.textContent = 'Pensando…'; ultimo = ''
      const ficha = ctxCliente(c, casoId).split('\nÚLTIMAS COMUNICAÇÕES')[0]; const livre = extra.value.trim()
      const instr = pedido.id === 'livre' ? livre : pedido.instrucao + (livre ? '\nOrientação adicional da advogada: ' + livre : '')
      const prompt = REGRAS_IA + `\n\nVocê está AJUDANDO a advogada a analisar uma conversa de WhatsApp com a cliente. Você NÃO envia nada: apenas analisa e escreve rascunhos para ela revisar, copiar e enviar sozinha. Tom do escritório: ${CONFIG.escritorio.tom_de_voz || 'acolhedor'}. Se algo importante exigir análise jurídica, diga que a Dra. confirma. Use [COLCHETES] para o que faltar.\n\nTAREFA: ${instr}\n\nFICHA:\n${ficha}\n\nCONVERSA (${conv.n} mensagens, mais antigas primeiro):\n${conv.texto}`
      try { const r = await s(prompt, { cache: false, modelTier: 'default', signal: ctl.signal, onText: ({ text }) => { ultimo = text; saida.textContent = text } }); ultimo = r.text; saida.textContent = r.text + (r.truncated ? '\n\n(resposta cortada)' : ''); botoesSaida() }
      catch (e) { if (e && e.code === 'cancelled') return; saida.textContent = (e && e.text ? e.text + '\n\n' : '') + iaErro(e) }
    })
  }
  const grupos = ASSIST.map(([titulo, lista_]) => h('div', { class: 'space-y-1.5' }, h('p', { class: 'section-label' }, titulo), h('div', { class: 'flex flex-wrap gap-1.5' }, lista_.map(([id, rot, instrucao]) => h('button', { type: 'button', class: 'chip', 'data-testid': 'assist-' + id, onclick: () => rodar({ id, instrucao }) }, rot)))))
  const livreBtn = btn('Pedir', { mini: true, icone: 'ph:sparkle-bold', tid: 'assist-pedir', class: 'ia-btn', onclick: () => { if (!extra.value.trim()) { aviso('Escreva o que você precisa.', 'erro'); return } rodar({ id: 'livre', instrucao: '' }) } })
  extra.addEventListener('keydown', ev => { if (ev.key === 'Enter') livreBtn.click() })
  return h('div', { class: 'space-y-3', 'data-testid': 'assistente-conversa' }, alerta('info', null, 'A IA lê a conversa e a ficha (sem CPF, RG, endereço, telefone ou e-mail da ficha; o que a cliente escreveu nas mensagens vai como está) e devolve rascunhos. Ela NÃO envia nada: você revisa, copia e envia pelo WhatsApp.'), ...grupos, h('div', { class: 'flex gap-2' }, h('div', { class: 'flex-1' }, extra), livreBtn), saida, barra)
}
