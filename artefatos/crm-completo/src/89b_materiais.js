'use strict'
/* ============ MATERIAIS: central de documentos, mídias, transcrições e anotações do caso ============
   O original continua disponível (Drive do cliente, quando você guarda lá; ou nesta sessão); a IA lê o TEXTO que existe:
   - texto/Word/PDF com camada de texto → extraído aqui mesmo, no navegador (sem enviar a ninguém);
   - imagem e PDF escaneado → lidos pela IA de visão SOMENTE onde o ambiente permite (e marcados “lido por IA: confira”);
   - áudio e vídeo → o Artifact NÃO transcreve: você cola a transcrição (ou importa do Drive) e a IA lê o texto;
   - o que não tem texto fica como NÃO LIDO: a IA nunca descreve o que não leu. */
const ARQ_MEM = new Map() // id do material -> arquivo (só nesta sessão; o original durável é o Drive)
const EXT = { imagem: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp'], audio: ['opus', 'ogg', 'mp3', 'm4a', 'wav', 'aac', 'amr', 'oga'], video: ['mp4', 'mov', 'avi', 'mkv', '3gp', 'webm'], pdf: ['pdf'], documento: ['doc', 'docx', 'odt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv', 'json', 'html', 'xml'] }
const extDe = n => (String(n).match(/\.([A-Za-z0-9]{1,5})$/) || [, ''])[1].toLowerCase()
const tipoPorArquivo = (nome, mime) => { const e = extDe(nome); for (const [t, l] of Object.entries(EXT)) if (l.includes(e)) return t; if (/^image\//.test(mime || '')) return 'imagem'; if (/^audio\//.test(mime || '')) return 'audio'; if (/^video\//.test(mime || '')) return 'video'; return 'outro' }
const ICONE_MAT = { documento: 'ph:file-text-bold', pdf: 'ph:file-pdf-bold', imagem: 'ph:image-bold', audio: 'ph:microphone-bold', video: 'ph:video-camera-bold', transcricao: 'ph:subtitles-bold', anotacao: 'ph:note-pencil-bold', conversa: 'ph:chats-circle-bold', outro: 'ph:paperclip-bold', parecer: 'ph:scales-bold', formulario: 'ph:clipboard-text-bold' }
const tamanhoLegivel = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'

/* ---------- extração de texto no navegador ---------- */
const decodificaXml = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/&amp;/g, '&')
async function textoDeDocx(buf) {
  const zip = await CRM.JSZip.loadAsync(buf); const f = zip.file('word/document.xml'); if (!f) throw new Error('não parece um arquivo Word (.docx)')
  const x = await f.async('string'); return decodificaXml(x.replace(/<w:tab\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n').replace(/<\/w:p>/g, '\n').replace(/<w:p[ >]/g, m => m).replace(/<[^>]+>/g, '')).replace(/\n{3,}/g, '\n\n').trim()
}
const PDFJS = () => globalThis['pdfjs-dist/build/pdf'] || globalThis.pdfjsLib
let PDF_PRONTO = false
function prepararPdfJs() { const L = PDFJS(); if (!L) throw new Error('leitor de PDF indisponível'); if (!PDF_PRONTO) { L.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([PDF_WORKER_SRC], { type: 'text/javascript' })); PDF_PRONTO = true } return L }
async function textoDePdf(buf) {
  const L = prepararPdfJs(); const doc = await L.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise; let out = ''; const n = Math.min(doc.numPages, 400)
  for (let i = 1; i <= n; i++) { const p = await doc.getPage(i); const tc = await p.getTextContent(); out += tc.items.map(it => it.str + (it.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+\n/g, '\n').trim() + '\n\n' }
  return { texto: out.trim(), paginas: doc.numPages }
}
/** lê o que for possível de um arquivo local; nunca inventa: se não há texto, devolve o motivo */
async function lerArquivoLocal(file) {
  const tipo = tipoPorArquivo(file.name, file.type); const e = extDe(file.name); const r = { tipo, texto: '', motivo: null, origem_texto: null }
  if (file.size > 30 * 1048576) { r.motivo = 'arquivo grande demais para ler aqui (' + tamanhoLegivel(file.size) + ')'; return r }
  try {
    if (['txt', 'md', 'csv', 'json', 'xml', 'html'].includes(e) || /^text\//.test(file.type)) { r.texto = await file.text(); r.origem_texto = 'arquivo de texto' }
    else if (e === 'docx') { r.texto = await textoDeDocx(await file.arrayBuffer()); r.origem_texto = 'Word (.docx)' }
    else if (e === 'pdf') { const x = await textoDePdf(await file.arrayBuffer()); if (x.texto.replace(/\s/g, '').length < 40) r.motivo = `PDF sem texto selecionável (provável digitalização, ${x.paginas} pág.): use “Ler com IA (visão)” ou transcreva`; else { r.texto = x.texto; r.origem_texto = `PDF (${x.paginas} pág.)` } }
    else if (tipo === 'imagem') r.motivo = 'imagem: ainda não lida (use “Ler com IA (visão)” ou descreva/transcreva)'
    else if (tipo === 'audio') r.motivo = 'áudio: o Artifact não transcreve; cole a transcrição'
    else if (tipo === 'video') r.motivo = 'vídeo: o Artifact não transcreve; cole a transcrição'
    else r.motivo = 'formato sem leitura automática (' + (e || file.type || 'desconhecido') + '): cole o texto ou converta para .docx/.pdf/.txt'
  } catch (err) { r.motivo = 'falha ao ler (' + String(err && err.message || err).slice(0, 80) + ')' }
  if (r.texto.length > 1500000) { r.texto = r.texto.slice(0, 1500000); r.motivo = 'texto cortado em 1.500.000 caracteres' }
  return r
}

/* ---------- criar / achar materiais ---------- */
function criarMaterial(o) {
  const m = { id: proximoId('materiais'), contato_id: null, caso_id: null, tipo: 'outro', titulo: '', origem: 'manual', nome_arquivo: null, mime: null, tamanho: null, drive_id: null, drive_link: null, texto: '', texto_origem: null, leitura_motivo: null, data: agora(), consulta_id: null, mensagem_id: null, created_at: agora(), ...o }
  DB.materiais.push(m); salvar('materiais'); return m
}
async function guardarOriginalNoDrive(c, m, file) {
  if (!c.drive_pasta_id) throw { code: 'sem_pasta', message: 'Vincule a pasta do Drive do cliente (ficha › Drive do cliente) para guardar o original.' }
  if (file.size > 8 * 1048576) throw { code: 'invalido', message: `“${file.name}” passa de 8 MB: guarde direto no Drive` }
  const pai = (c.drive_subpastas && c.drive_subpastas.documentos) || c.drive_pasta_id; const r = await enviarArquivoDrive(file, pai); const a = arquivosDe({ files: [r && r.file ? r.file : r] })[0] || {}
  m.drive_id = a.id || null; m.drive_link = a.link || null; salvar('materiais'); return a
}
async function materialDeArquivo(c, casoId, file, opc = {}) {
  const l = await lerArquivoLocal(file); const m = criarMaterial({ contato_id: c.id, caso_id: casoId || null, tipo: opc.tipo && opc.tipo !== 'auto' ? opc.tipo : l.tipo, titulo: opc.titulo || file.name, origem: opc.origem || 'upload', nome_arquivo: file.name, mime: file.type || null, tamanho: file.size, texto: l.texto, texto_origem: l.origem_texto, leitura_motivo: l.texto ? null : l.motivo, data: opc.data || agora(), consulta_id: opc.consulta_id || null, mensagem_id: opc.mensagem_id || null })
  ARQ_MEM.set(m.id, file); if (opc.drive) { try { await guardarOriginalNoDrive(c, m, file) } catch (e) { m.drive_erro = e && e.message ? e.message : erroConector(e, 'Google Drive'); salvar('materiais') } } return m
}

/* ---------- ler imagem / PDF escaneado pela IA de visão (só onde o ambiente permite) ---------- */
async function blobDoMaterial(m) {
  if (ARQ_MEM.has(m.id)) return ARQ_MEM.get(m.id)
  if (m.drive_id) { const r = await driveC('download_file_content', { fileId: m.drive_id }); const b64 = typeof r === 'string' ? r : r && (r.content || r.data || r.base64); if (b64) return new Blob([Uint8Array.from(atob(String(b64).replace(/\s/g, '')), ch => ch.charCodeAt(0))], { type: m.mime || 'application/octet-stream' }) }
  throw new Error('o arquivo original não está disponível nesta sessão: anexe-o de novo ou guarde-o no Drive')
}
async function paginasPdfComoImagens(blob, max) {
  const L = prepararPdfJs(); const doc = await L.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise; const imgs = []
  for (let i = 1; i <= Math.min(doc.numPages, max); i++) { const p = await doc.getPage(i); const vp = p.getViewport({ scale: 1.6 }); const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height; await p.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise; imgs.push(await new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.85))) }
  return { imgs, total: doc.numPages }
}
function lerMaterialComVisao(m, aoFim) {
  exigirIA(async s => {
    try {
      const lim = await s.limits(); if (!lim || !lim.images) { aviso('Este ambiente não permite enviar imagens à IA. Transcreva o conteúdo e cole no material.', 'erro'); return }
      aviso('Lendo com a IA de visão… pode levar um minuto.'); const blob = await blobDoMaterial(m); let blobs
      if (m.tipo === 'pdf' || /pdf/i.test(m.mime || '')) { const x = await paginasPdfComoImagens(blob, lim.images.maxCount * 3); blobs = x.imgs; if (x.total > blobs.length) aviso(`Só as primeiras ${blobs.length} de ${x.total} páginas serão lidas.`) } else blobs = [blob]
      let texto = ''; const lote = Math.max(1, lim.images.maxCount)
      for (let i = 0; i < blobs.length; i += lote) { const r = await s(`Transcreva fielmente todo o texto legível ${blobs.length > 1 ? 'destas páginas (parte ' + (Math.floor(i / lote) + 1) + ')' : 'desta imagem'}. Se for print/foto de conversa, transcreva as mensagens com remetente e horário quando visíveis. Se for foto de objeto, lugar ou pessoa, descreva só o que se vê, objetivamente. Marque [ilegível] onde não der para ler. NÃO interprete, NÃO resuma e NÃO acrescente nada que não esteja visível. Responda só com a transcrição/descrição.`, { images: blobs.slice(i, i + lote), cache: false, modelTier: 'default' }); texto += (texto ? '\n\n' : '') + r.text }
      m.texto = texto.trim(); m.texto_origem = 'IA de visão (confira com o original)'; m.leitura_motivo = null; m.lido_por_ia = true; salvar('materiais'); aviso('Leitura pronta: confira com o original antes de confiar.'); aoFim && aoFim()
    } catch (e) { aviso(e && e.code ? iaErro(e) : 'Não consegui ler: ' + String(e && e.message || e).slice(0, 120), 'erro') }
  })
}

/* ---------- ver / editar um material ---------- */
function abrirMaterial(m) {
  const c = contato(m.contato_id); const corpo = h('div', { class: 'space-y-3', 'data-testid': 'material-detalhe' })
  const des = () => {
    const lido = !!(m.texto && m.texto.trim()); const area = h('textarea', { class: 'modal-input text-sm min-h-[200px]', rows: 12, 'data-testid': 'material-texto', 'aria-label': 'Texto do material', placeholder: m.tipo === 'audio' || m.tipo === 'video' ? 'Cole aqui a transcrição (feita fora do CRM).' : 'Cole ou corrija aqui o texto deste material.' }); area.value = m.texto || ''
    const caso = h('select', { class: 'modal-input !w-auto text-xs', 'aria-label': 'Demanda', onchange: ev => { m.caso_id = ev.target.value ? Number(ev.target.value) : null; salvar('materiais') } }, h('option', { value: '' }, '(sem demanda)'), demandasDe(m.contato_id).map(d => h('option', { value: d.id, selected: d.id === m.caso_id }, d.titulo)))
    corpo.replaceChildren(
      h('div', { class: 'flex flex-wrap items-center gap-2' }, badge(TIPO_MAT[m.tipo] || m.tipo, 'cinza'), lido ? badge(m.lido_por_ia ? 'Lido por IA — confira' : 'Texto disponível', m.lido_por_ia ? 'ambar' : 'verde') : badge('NÃO LIDO', 'vermelho'), m.drive_link ? badge('No Drive', 'azul') : ARQ_MEM.has(m.id) ? badge('Só nesta sessão', 'ambar') : badge('Original não guardado', 'cinza'), caso),
      h('div', { class: 'grid gap-x-4 gap-y-1 sm:grid-cols-2 text-sm' }, h('p', {}, h('b', {}, 'Título: '), m.titulo), h('p', {}, h('b', {}, 'Pessoa: '), c ? c.nome : '—'), h('p', {}, h('b', {}, 'Origem: '), m.origem || '—'), h('p', {}, h('b', {}, 'Data: '), m.data ? dataHora(m.data) : '—'), m.nome_arquivo ? h('p', {}, h('b', {}, 'Arquivo: '), m.nome_arquivo + (m.tamanho ? ' (' + tamanhoLegivel(m.tamanho) + ')' : '')) : null, m.texto_origem ? h('p', {}, h('b', {}, 'Texto obtido de: '), m.texto_origem) : null),
      !lido ? alerta('aviso', 'A IA não leu este material', m.leitura_motivo || 'Sem texto disponível.') : null, m.drive_erro ? alerta('aviso', 'Original não guardado no Drive', m.drive_erro) : null,
      area,
      h('div', { class: 'flex flex-wrap gap-2' }, btn('Salvar texto', { mini: true, tid: 'material-salvar', onclick: () => { m.texto = area.value; if (m.texto.trim()) { m.leitura_motivo = null; if (!m.texto_origem || m.lido_por_ia === undefined) m.texto_origem = m.texto_origem || 'colado/digitado por você'; if (m.tipo === 'audio' || m.tipo === 'video') m.texto_origem = 'transcrição fornecida por você'; if (m.lido_por_ia) { m.texto_origem = 'IA de visão, revisado por você'; m.lido_por_ia = false } } salvar('materiais'); aviso('Texto salvo.'); des() } }),
        (m.tipo === 'imagem' || m.tipo === 'pdf') ? btn('Ler com IA (visão)', { mini: true, tipo: 'sec', icone: 'ph:eye-bold', tid: 'material-visao', onclick: () => lerMaterialComVisao(m, des) }) : null,
        m.drive_id && !lido ? btn('Ler pelo Drive', { mini: true, tipo: 'sec', icone: 'ph:google-drive-logo-bold', tid: 'material-ler-drive', onclick: async () => { try { const t = textoDoArquivo(await driveC('read_file_content', { fileId: m.drive_id })); if (t.trim().length < 20) throw new Error('o Drive não devolveu texto'); m.texto = t; m.texto_origem = 'leitura do Google Drive'; m.leitura_motivo = null; salvar('materiais'); des() } catch (e) { aviso('Não consegui ler pelo Drive: ' + (e && e.message ? e.message : erroConector(e, 'Google Drive')), 'erro') } } }) : null,
        lido ? btn('Analisar este material com a IA', { mini: true, tipo: 'sec', icone: 'ph:sparkle-bold', class: 'ia-btn', tid: 'material-analisar', onclick: () => janelaNucleo({ c, casoId: m.caso_id, titulo: 'Análise do material — ' + (m.titulo || 'material'), tarefa: `Analise APENAS o material [M${m.id}]: resuma, extraia os fatos e dados relevantes (rotulando), liste o que ele comprova e o que NÃO comprova, e aponte divergências com as demais fontes do caso (conversa, formulário, outros materiais). Cite as fontes.`, tipo: 'material' }) }) : null,
        m.drive_link ? h('a', { href: m.drive_link, target: '_blank', rel: 'noopener', class: 'btn-mini inline-flex items-center gap-1 border border-gray-300 dark:border-zinc-700 rounded-full px-3 py-1.5 text-xs' }, ic('ph:google-drive-logo-bold'), 'Abrir no Drive') : null,
        ARQ_MEM.has(m.id) ? btn('Baixar o original', { mini: true, tipo: 'fantasma', icone: 'ph:download-simple-bold', onclick: async () => { try { const dl = await window.claude.use('downloads'); const f = ARQ_MEM.get(m.id); await dl.save({ filename: f.name, data: new Uint8Array(await f.arrayBuffer()) }) } catch (e) { aviso('Download indisponível aqui.', 'erro') } } }) : null,
        btn('Excluir', { mini: true, tipo: 'perigo', tid: 'material-excluir', onclick: () => confirmar('Excluir este material?', 'Remove do CRM (não apaga arquivos do Drive). As análises já salvas continuam, mas deixam de poder abrir esta fonte.', 'Excluir', () => { DB.materiais = DB.materiais.filter(x => x.id !== m.id); DB.comunicacoes.forEach(x => { if (x.midia_ref === m.id) x.midia_ref = null }); salvar('materiais'); salvar('comunicacoes'); fecharTodas(); render() }) })))
  }
  des(); modal({ titulo: m.titulo || 'Material', largura: 'max-w-3xl', corpo, aoFechar: render })
}

/* ---------- adicionar material: arquivo(s), texto/transcrição, arquivo do Drive ---------- */
function adicionarArquivos(c, casoId, opc = {}) {
  const S = { drive: !!c.drive_pasta_id, tipo: opc.tipo || 'auto', data: hojeISO(), consulta_id: opc.consulta_id || null }
  const input = h('input', { type: 'file', multiple: true, 'data-testid': 'mat-arquivos', 'aria-label': 'Arquivos' }); const prog = h('p', { class: 'text-xs text-gray-500', 'data-testid': 'mat-progresso' })
  const corpo = h('div', { class: 'space-y-3' }, h('p', { class: 'text-xs text-gray-500' }, 'Word (.docx), PDF com texto e arquivos de texto são lidos aqui mesmo. Imagem e PDF escaneado podem ser lidos pela IA de visão depois. Áudio e vídeo precisam de transcrição.'), input,
    h('label', { class: 'block' }, rotuloCampo('Tipo'), h('select', { class: 'modal-input', 'data-testid': 'mat-tipo', onchange: ev => { S.tipo = ev.target.value } }, [['auto', 'Detectar pelo arquivo'], ['documento', 'Documento'], ['pdf', 'PDF'], ['imagem', 'Imagem'], ['audio', 'Áudio'], ['video', 'Vídeo'], ['transcricao', 'Transcrição'], ['outro', 'Outro']].map(([v, t]) => h('option', { value: v, selected: v === S.tipo }, t)))),
    h('label', { class: 'flex items-center gap-2 text-sm' }, h('input', { type: 'checkbox', class: 'accent-[#6f5636]', checked: S.drive, disabled: !c.drive_pasta_id, 'data-testid': 'mat-drive', onchange: ev => { S.drive = ev.target.checked } }), c.drive_pasta_id ? 'Guardar o original no Drive do cliente (até 8 MB)' : 'Guardar no Drive: vincule antes a pasta do cliente (ficha › Drive do cliente). Sem isso, o original só fica nesta sessão e o texto lido fica no CRM.'), prog)
  modal({ titulo: 'Adicionar arquivos ao caso', largura: 'max-w-lg', corpo, rodape: fechar => [btn('Cancelar', { tipo: 'sec', onclick: fechar }), btn('Adicionar', { tid: 'mat-adicionar', onclick: async () => {
    const fs = [...input.files]; if (!fs.length) { aviso('Escolha ao menos um arquivo.', 'erro'); return } let n = 0
    for (const f of fs) { prog.textContent = `Lendo ${++n}/${fs.length}: ${f.name}…`; await materialDeArquivo(c, casoId, f, { tipo: S.tipo, drive: S.drive, data: agora(), consulta_id: S.consulta_id, ...opc }) }
    registrar(c.id, 'Documento recebido', plural(fs.length, 'arquivo adicionado', 'arquivos adicionados') + ' ao caso (Materiais).', casoId); fechar(); aviso(plural(fs.length, 'arquivo adicionado', 'arquivos adicionados') + '.'); render() } })] })
}
function adicionarTexto(c, casoId, opc = {}) {
  const titulo = h('input', { class: 'modal-input', placeholder: opc.tituloPadrao || 'Título (ex.: Transcrição da consulta de 03/10)', 'data-testid': 'txt-titulo' }); const area = h('textarea', { class: 'modal-input text-sm', rows: 12, placeholder: 'Cole aqui o texto, a transcrição ou a anotação.', 'data-testid': 'txt-corpo' }); const arq = h('input', { type: 'file', accept: '.txt,.md,.docx,.pdf', 'data-testid': 'txt-arquivo' })
  let tipo = opc.tipo || 'anotacao'
  arq.addEventListener('change', async () => { const f = arq.files[0]; if (!f) return; const l = await lerArquivoLocal(f); if (l.texto) { area.value = l.texto; if (!titulo.value) titulo.value = f.name.replace(/\.[^.]+$/, '') } else aviso(l.motivo || 'Sem texto neste arquivo.', 'erro') })
  modal({ titulo: opc.titulo || 'Adicionar texto ao caso', largura: 'max-w-2xl', corpo: h('div', { class: 'space-y-3' }, h('label', { class: 'block' }, rotuloCampo('Tipo'), h('select', { class: 'modal-input', 'data-testid': 'txt-tipo', onchange: ev => { tipo = ev.target.value } }, [['anotacao', 'Anotação'], ['transcricao', 'Transcrição (reunião, consulta, áudio)'], ['documento', 'Documento (texto)'], ['outro', 'Outro']].map(([v, t]) => h('option', { value: v, selected: v === tipo }, t)))), titulo, area, h('label', { class: 'block text-xs text-gray-500' }, 'Ou importe o texto de um arquivo (.txt, .docx, .pdf com texto): ', arq)), rodape: fechar => [btn('Cancelar', { tipo: 'sec', onclick: fechar }), btn('Adicionar', { tid: 'txt-adicionar', onclick: () => { if (!area.value.trim()) { aviso('Escreva ou cole o texto.', 'erro'); return } const m = criarMaterial({ contato_id: c.id, caso_id: casoId || null, tipo, titulo: titulo.value.trim() || ({ anotacao: 'Anotação', transcricao: 'Transcrição' }[tipo] || 'Texto') + ' de ' + dataLonga(hojeISO()), origem: 'texto colado por você', texto: area.value.trim(), texto_origem: tipo === 'transcricao' ? 'transcrição fornecida por você' : 'digitado/colado por você', consulta_id: opc.consulta_id || null, data: opc.data || agora() }); registrar(c.id, tipo === 'transcricao' ? 'Reunião' : 'Anotação', (tipo === 'transcricao' ? 'Transcrição adicionada: ' : 'Texto adicionado: ') + m.titulo, casoId); fechar(); aviso('Adicionado ao caso.'); opc.aoAdicionar && opc.aoAdicionar(m); render() } })] })
}
function importarDoDrive(c, casoId, opc = {}) {
  if (!c.drive_pasta_id) { aviso('Vincule antes a pasta do Drive do cliente (ficha › Drive do cliente).', 'erro'); return }
  const lista_ = h('div', { class: 'space-y-1 max-h-72 overflow-y-auto', 'data-testid': 'drive-lista' }, carregando('Lendo a pasta do cliente…'))
  modal({ titulo: 'Trazer arquivo do Drive do cliente', largura: 'max-w-lg', corpo: h('div', { class: 'space-y-2' }, h('p', { class: 'text-xs text-gray-500' }, 'O CRM pede ao Drive o texto do arquivo (PDF, Word, planilha…). Se o Drive não devolver texto, o material fica como NÃO LIDO.'), lista_) })
  listarPasta(c.drive_pasta_id).then(l => { const f = l.filter(a => !a.pasta); lista_.replaceChildren(...(f.length ? f.map(a => h('button', { type: 'button', class: 'w-full text-left rounded-xl border border-gray-200 dark:border-zinc-700 px-3 py-2 text-sm hover:border-primary flex items-center gap-2', 'data-testid': 'drive-item', onclick: async () => { let texto = '', motivo = null; try { texto = textoDoArquivo(await driveC('read_file_content', { fileId: a.id })); if (texto.trim().length < 20) { texto = ''; motivo = 'o Drive não devolveu texto deste arquivo' } } catch (e) { motivo = 'falha ao ler no Drive: ' + (e && e.message ? e.message : erroConector(e, 'Google Drive')) } const m = criarMaterial({ contato_id: c.id, caso_id: casoId || null, tipo: tipoPorArquivo(a.nome, a.mime), titulo: a.nome, origem: 'Google Drive', nome_arquivo: a.nome, mime: a.mime, drive_id: a.id, drive_link: a.link, texto, texto_origem: texto ? 'leitura do Google Drive' : null, leitura_motivo: texto ? null : motivo, data: a.mod || agora(), consulta_id: opc.consulta_id || null }); registrar(c.id, 'Documento recebido', 'Arquivo do Drive trazido ao caso: ' + a.nome, casoId); fecharTodas(); aviso(texto ? 'Arquivo trazido e lido.' : 'Arquivo trazido, mas NÃO lido: ' + motivo, texto ? 'ok' : 'erro'); render() } }, ic(iconeArquivo(a)), a.nome)) : [h('p', { class: 'text-sm text-gray-500' }, 'A pasta não tem arquivos.')])) }).catch(e => lista_.replaceChildren(h('p', { class: 'text-sm text-danger' }, erroConector(e, 'Google Drive'))))
}

/* ---------- central de materiais do caso ---------- */
UI.mat = { q: '', tipo: 'todos' }
function PainelMateriais(c, casoId) {
  const raiz = h('div', { class: 'space-y-3', 'data-testid': 'materiais' })
  const des = () => {
    const todos = DB.materiais.filter(m => doCaso(c, casoId)(m)).sort((a, b) => String(b.data || b.created_at).localeCompare(String(a.data || a.created_at))); const q = semAcento(UI.mat.q)
    const lista_ = todos.filter(m => (UI.mat.tipo === 'todos' || m.tipo === UI.mat.tipo) && (!q || semAcento((m.titulo || '') + ' ' + (m.texto || '') + ' ' + (m.nome_arquivo || '')).includes(q)))
    raiz.replaceChildren(
      h('div', { class: 'flex flex-wrap gap-2' }, btn('Adicionar arquivos', { mini: true, icone: 'ph:upload-simple-bold', tid: 'mat-novo-arquivo', onclick: () => adicionarArquivos(c, casoId) }), btn('Colar texto / transcrição', { mini: true, tipo: 'sec', icone: 'ph:clipboard-text-bold', tid: 'mat-novo-texto', onclick: () => adicionarTexto(c, casoId) }), btn('Do Drive do cliente', { mini: true, tipo: 'sec', icone: 'ph:google-drive-logo-bold', tid: 'mat-do-drive', onclick: () => importarDoDrive(c, casoId) }), btn('Importar conversa do WhatsApp', { mini: true, tipo: 'sec', icone: 'ph:whatsapp-logo-bold', tid: 'mat-whats', onclick: () => importarConversaWhatsApp({ contato: c, caso: casoId || '' }) })),
      h('div', { class: 'flex flex-wrap items-center gap-2' }, h('div', { class: 'w-56' }, busca(UI.mat.q, v => { UI.mat.q = v; des() }, 'Buscar nos materiais…')), h('div', { class: 'flex flex-wrap gap-1.5' }, [['todos', 'Todos'], ['conversa', 'Conversas'], ['documento', 'Documentos'], ['pdf', 'PDFs'], ['imagem', 'Imagens'], ['audio', 'Áudios'], ['video', 'Vídeos'], ['transcricao', 'Transcrições'], ['anotacao', 'Anotações']].map(([k, t]) => h('button', { type: 'button', class: 'filtro ' + (UI.mat.tipo === k ? 'filtro-ativo' : ''), onclick: () => { UI.mat.tipo = k; des() } }, `${t} (${k === 'todos' ? todos.length : todos.filter(m => m.tipo === k).length})`)))),
      lista_.length ? lista(lista_.map(m => [ic(ICONE_MAT[m.tipo] || 'ph:paperclip-bold', 'text-xl text-primary dark:text-cafe-creme'), h('div', { class: 'min-w-0 flex-1' }, h('p', { class: 'font-semibold text-sm truncate' }, m.titulo || m.nome_arquivo || 'Sem título'), h('p', { class: 'text-[11px] text-gray-500' }, `${TIPO_MAT[m.tipo] || (m.tipo === 'conversa' ? 'Conversa' : m.tipo)} · ${dataLonga(String(m.data || m.created_at).slice(0, 10))} · ${m.origem || ''}${m.caso_id ? ' · ' + (nomeDemanda(m.caso_id) || '') : ''}`)), m.tipo === 'conversa' ? badge(plural(m.n_mensagens || 0, 'mensagem', 'mensagens'), 'cinza') : (m.texto && m.texto.trim() ? badge(m.lido_por_ia ? 'Lido por IA' : 'Lido', m.lido_por_ia ? 'ambar' : 'verde') : badge('Não lido', 'vermelho')), btn('Abrir', { mini: true, tipo: 'sec', tid: 'mat-abrir', onclick: () => m.tipo === 'conversa' ? abrirComunicacao(m.contato_id) : abrirMaterial(m) })])) : estadoVazio('ph:folder-open-bold', 'Nenhum material', 'Adicione documentos, imagens, a transcrição de uma consulta, a conversa do WhatsApp ou anotações. A IA lê o texto de cada um.'))
  }
  des(); return raiz
}
