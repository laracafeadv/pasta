'use strict'
/* ============ Formulários = Google Forms (coleta) + Google Sheets (respostas) + CRM (organização) ============
   O formulário PÚBLICO é do Google Forms. Aqui cada "formulário" é o cadastro desse Google Form no CRM:
   link do formulário, planilha de respostas, qual coluna traz o CÓDIGO que identifica Pessoa/Demanda, e o que cada coluna vira no cadastro.
   O CRM lê a planilha (conector Google Drive, como você), reconhece o envio pelo código e guarda as respostas ligadas à Pessoa e à Demanda. */
UI.form = { aba: 'formularios', ctx: 'todos', rq: '', rf: '', rde: '', rate: '' }
const novoIdPergunta = () => { const m = Math.max(0, ...DB.formularios.flatMap(f => f.secoes.flatMap(s => s.itens.map(i => i.pergunta_id)))); CONFIG.seq.pergunta = Math.max(CONFIG.seq.pergunta || 0, m) + 1; return CONFIG.seq.pergunta }

/* ---------- sementes: tudo começa vazio ---------- */
function semearFormularios() { return [] }
function semearEnvios() { return [] }
const formularioDe = id => por('formularios', id)
const itensDe = f => f.secoes.flatMap(s => s.itens)
const formsDoEscopo = (escopo, proc) => DB.formularios.filter(f => situacaoForm(f) === 'publicado' && CRM.escopoDoContexto(f.contexto) === escopo && (escopo === 'cliente' || CRM.procedimentoCasa(f.procedimentos, proc)))
const respostaVazia = v => v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length)
const textoResposta = v => respostaVazia(v) ? '(sem resposta)' : Array.isArray(v) ? v.join(', ') : String(v)

/* ---------- link do Google Forms e planilha ---------- */
const CODIGO_MARCA = 'CODIGO'
function analisarLinkForms(url) {
  const u = String(url || '').trim(); if (!u) return { ok: false, vazio: true }
  if (!/^https:\/\/(docs\.google\.com\/forms\/|forms\.gle\/)/.test(u)) return { ok: false, erro: 'Não parece um link do Google Forms (deve começar com https://docs.google.com/forms/ ou https://forms.gle/).' }
  if (/\/edit(\?|#|$)/.test(u)) return { ok: false, erro: 'Este é o link de EDIÇÃO do formulário. Use o link de resposta (termina em /viewform) ou o pré-preenchido.' }
  return { ok: true, temCodigo: new RegExp('[?&]entry\\.\\d+=' + CODIGO_MARCA + '(&|$)').test(u) }
}
const idDaPlanilha = s => { const t = String(s || '').trim(); const m = t.match(/\/d\/([\w-]{15,})/); return m ? m[1] : /^[\w-]{20,}$/.test(t) ? t : '' }
const novoCodigo = (cid, casoId) => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const r = Array.from(crypto.getRandomValues(new Uint8Array(4)), b => a[b % a.length]).join(''); return `LC-${cid}-${casoId || 0}-${r}` }
const CODIGO_RE = /^LC-(\d+)-(\d+)-([A-Z0-9]{3,8})$/

/* ---------- cadastrar / duplicar ---------- */
function novoFormulario() {
  let ctx = 'cliente'; const nome = h('input', { class: 'modal-input', placeholder: 'Ex.: Dados do inventário', 'data-testid': 'novo-nome' }); const grupo = h('div', { class: 'grid gap-2' })
  const des = () => grupo.replaceChildren(...Object.entries(CRM.CONTEXTOS).map(([k, c]) => h('label', { class: 'flex items-start gap-3 rounded-2xl border p-3 cursor-pointer ' + (ctx === k ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-zinc-700') }, h('input', { type: 'radio', name: 'ctx', class: 'mt-1 accent-[#6f5636]', checked: ctx === k, onclick: () => { ctx = k; des() }, 'data-testid': 'novo-ctx-' + k }), h('span', {}, h('b', { class: 'text-sm' }, c.nome), h('span', { class: 'block text-xs text-gray-500' }, c.dica)))))
  des()
  modal({ titulo: 'Cadastrar formulário do Google Forms', largura: 'max-w-lg', corpo: h('div', { class: 'space-y-4' }, h('p', { class: 'text-xs text-gray-500' }, 'O formulário em si você cria no Google Forms. Aqui você cadastra o link e a planilha de respostas na próxima tela.'), h('label', { class: 'block' }, rotuloCampo('Nome (para você)'), nome), h('div', {}, rotuloCampo('Onde este formulário vale?'), grupo)), rodape: f => [btn('Cancelar', { tipo: 'sec', onclick: f }), btn('Cadastrar e configurar', { icone: 'ph:arrow-right-bold', tid: 'novo-criar', onclick: () => { const id = proximoId('formularios'); DB.formularios.push({ id, nome: nome.value.trim() || 'Formulário sem nome', descricao: null, contexto: ctx, procedimentos: [], ativo: false, situacao: 'rascunho', origem: 'google', google_url: '', planilha_id: '', planilha_url: '', col_codigo: null, col_data: null, secoes: [{ id: 1, titulo: 'Colunas da planilha', itens: [] }], updated_at: agora() }); salvar('formularios'); f(); ir('formularios', { editar: id }) } })] })
}
function duplicarForm(f) { const id = proximoId('formularios'); const c = clonar(f); c.id = id; c.nome = f.nome + ' (cópia)'; c.updated_at = agora(); c.situacao = 'rascunho'; c.ativo = false; c.planilha_id = ''; c.planilha_url = ''; c.col_codigo = null; c.secoes.forEach(s => s.itens.forEach(i => { i.pergunta_id = novoIdPergunta() })); DB.formularios.push(c); salvar('formularios'); return id }

/* ---------- ativar / arquivar ---------- */
function ativarForm(f) {
  const a = analisarLinkForms(f.google_url)
  if (!a.ok) { aviso(a.vazio ? 'Cole o link do Google Forms antes de ativar.' : a.erro, 'erro'); return false }
  f.situacao = 'publicado'; f.ativo = true; f.updated_at = agora(); salvar('formularios'); return true
}
function arquivarForm(f, novo) { f.situacao = novo || 'arquivado'; f.ativo = false; f.updated_at = agora(); salvar('formularios') }

/* ================= CONFIGURAÇÃO DO FORMULÁRIO (link · planilha · colunas) ================= */
function Construtor(id) {
  const F = formularioDe(id); if (!F) return estadoVazio('ph:clipboard-text-bold', 'Formulário não encontrado')
  const raiz = h('div', { class: 'space-y-5', 'data-testid': 'construtor' })
  const toque = () => { F.updated_at = agora(); clearTimeout(F.__t); F.__t = setTimeout(() => salvar('formularios'), 300) }
  const passo = (n, titulo, ...kids) => painel(h('span', {}, h('span', { class: 'inline-flex w-6 h-6 rounded-full bg-primary text-white text-xs font-bold items-center justify-center mr-2' }, n), titulo), ...kids)
  const desenhar = () => {
    const sit = situacaoForm(F); const cols = itensDe(F)
    const statusLink = h('p', { class: 'text-xs', 'data-testid': 'status-link' }); const pintaLink = () => { const a = analisarLinkForms(F.google_url); statusLink.className = 'text-xs ' + (a.ok ? (a.temCodigo ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-300') : 'text-gray-500'); statusLink.textContent = a.vazio ? 'Cole o link do Google Forms.' : !a.ok ? a.erro : a.temCodigo ? '✓ Link com o código do atendimento (CODIGO) — cada envio será identificado.' : 'Link válido, mas sem o marcador CODIGO: as respostas virão sem identificação automática (será preciso vincular uma a uma).' }
    const link = h('input', { class: 'modal-input', placeholder: 'https://docs.google.com/forms/d/e/…/viewform?usp=pp_url&entry.123456=CODIGO', 'data-testid': 'form-google-url' }); link.value = F.google_url || ''; link.addEventListener('input', () => { F.google_url = link.value.trim(); toque(); pintaLink() }); pintaLink()
    const plan = h('input', { class: 'modal-input', placeholder: 'https://docs.google.com/spreadsheets/d/…/edit', 'data-testid': 'form-planilha-url' }); plan.value = F.planilha_url || ''; plan.addEventListener('input', () => { F.planilha_url = plan.value.trim(); F.planilha_id = idDaPlanilha(plan.value); toque(); st.textContent = F.planilha_id ? '✓ Planilha reconhecida.' : 'Cole o endereço da planilha de respostas.' }); const st = h('p', { class: 'text-xs text-gray-500', 'data-testid': 'status-planilha' }, F.planilha_id ? '✓ Planilha reconhecida.' : 'Cole o endereço da planilha de respostas.')
    const nome = h('input', { class: 'modal-input !text-lg', 'aria-label': 'Nome', 'data-testid': 'form-nome' }); nome.value = F.nome; nome.addEventListener('input', () => { F.nome = nome.value; toque() })
    const papeis = [['', 'Só guardar no histórico'], ['__codigo', 'CÓDIGO do atendimento (identifica Pessoa e Demanda)'], ...DESTINOS.filter(d => d[0]).map(d => [d[0], 'Levar ao cadastro: ' + d[1].replace(/ \(.*/, '')])]
    const papelDe = it => it.texto === F.col_codigo ? '__codigo' : (it.mapear || '')
    const linhasCols = cols.length ? h('div', { class: 'space-y-1.5', 'data-testid': 'colunas' }, cols.map(it => h('div', { class: 'grid gap-2 sm:grid-cols-2 items-center rounded-xl border border-gray-200/70 dark:border-zinc-800 px-3 py-2' }, h('p', { class: 'text-sm font-medium truncate', title: it.texto }, it.texto), h('select', { class: 'modal-input !text-sm', 'aria-label': 'Papel da coluna ' + it.texto, 'data-testid': 'papel-coluna', onchange: ev => { const v = ev.target.value; if (v === '__codigo') { F.col_codigo = it.texto; it.mapear = null } else { if (F.col_codigo === it.texto) F.col_codigo = null; it.mapear = v || null } toque(); desenhar() } }, papeis.map(([k, t]) => h('option', { value: k, selected: papelDe(it) === k }, t)))))) : estadoVazio('ph:table-bold', 'Nenhuma coluna lida ainda', 'Informe a planilha acima e clique em “Ler colunas da planilha”.')
    raiz.replaceChildren(
      h('div', { class: 'flex flex-wrap items-center justify-between gap-3' }, btn('Formulários', { tipo: 'fantasma', icone: 'ph:arrow-left-bold', tid: 'voltar-lista', onclick: () => ir('formularios') }), h('div', { class: 'flex items-center gap-2' }, badge(SITUACOES[sit][0], SITUACOES[sit][1]), btn('Duplicar', { mini: true, tipo: 'sec', tid: 'duplicar-form', onclick: () => { const nid = duplicarForm(F); ir('formularios', { editar: nid }) } }), btn('Excluir', { mini: true, tipo: 'fantasma', icone: 'ph:trash-bold', tid: 'excluir-form', onclick: () => confirmar('Excluir este cadastro de formulário?', DB.envios.some(e => e.formulario_id === F.id) ? 'Existem envios e respostas ligados a ele: as respostas já recebidas continuam nas fichas. O formulário no Google não é afetado.' : 'O formulário no Google não é afetado.', 'Excluir', () => { DB.formularios = DB.formularios.filter(x => x.id !== F.id); salvar('formularios'); ir('formularios') }) }))),
      h('label', { class: 'block' }, rotuloCampo('Nome (para você)'), nome),
      alerta('info', 'Como funciona', 'Você cria e publica o formulário no Google Forms. O Google guarda as respostas numa planilha. O CRM lê essa planilha, reconhece quem respondeu pelo CÓDIGO que vai no link e coloca as respostas na ficha da Pessoa e da Demanda.'),
      passo(1, 'Link do formulário (Google Forms)',
        h('ol', { class: 'list-decimal pl-5 text-xs text-gray-600 dark:text-zinc-400 space-y-0.5' }, h('li', {}, 'No Google Forms, crie uma pergunta de resposta curta chamada ', h('b', {}, 'Código do atendimento'), '. Dica: coloque-a no fim e escreva na descrição “Não altere este campo”.'), h('li', {}, 'Menu ⋮ (canto superior direito) › ', h('b', {}, 'Receber link pré-preenchido'), '. Preencha essa pergunta com a palavra ', h('b', {}, CODIGO_MARCA), ' (em maiúsculas) e clique em ', h('b', {}, 'Obter link'), '.'), h('li', {}, 'Copie o link e cole abaixo. A cada envio o CRM troca ', h('b', {}, CODIGO_MARCA), ' pelo código daquela Pessoa/Demanda.')), link, statusLink),
      passo(2, 'Planilha de respostas (Google Sheets)',
        h('p', { class: 'text-xs text-gray-600 dark:text-zinc-400' }, 'No Google Forms, aba ', h('b', {}, 'Respostas'), ' › ', h('b', {}, 'Vincular ao Planilhas'), ' › criar planilha. Abra a planilha e copie o endereço dela. A primeira aba precisa ser a das respostas do formulário (é a padrão).'), plan, st,
        h('div', { class: 'flex flex-wrap gap-2' }, btn('Ler colunas da planilha', { mini: true, icone: 'ph:table-bold', tid: 'ler-colunas', onclick: async () => { if (!F.planilha_id) { aviso('Cole o endereço da planilha primeiro.', 'erro'); return } await lerColunasDaPlanilha(F); desenhar() } }))),
      passo(3, 'O que cada coluna é', h('p', { class: 'text-xs text-gray-600 dark:text-zinc-400' }, 'Marque qual coluna é o CÓDIGO. As demais ficam no histórico da resposta; se uma coluna for dado cadastral (e-mail, telefone, CPF…), escolha “Levar ao cadastro” e você confere antes de gravar.'), linhasCols),
      passo(4, 'Ativar e usar',
        h('div', { class: 'flex flex-wrap items-center gap-2' }, sit !== 'publicado' ? btn('Ativar formulário', { mini: true, tid: 'ativar-form', onclick: () => { if (ativarForm(F)) { aviso('Formulário ativo: já aparece para envio.'); desenhar() } } }) : btn('Voltar para configuração', { mini: true, tipo: 'sec', tid: 'desativar-form', onclick: () => { arquivarForm(F, 'rascunho'); desenhar() } }), sit !== 'arquivado' ? btn('Arquivar', { mini: true, tipo: 'fantasma', tid: 'arquivar-form', onclick: () => { arquivarForm(F); desenhar() } }) : null, sit === 'publicado' ? btn('Enviar a uma pessoa…', { mini: true, tipo: 'sec', icone: 'ph:paper-plane-tilt-bold', tid: 'enviar-do-construtor', onclick: () => enviarFormulario(null, F) }) : null, F.planilha_id ? btn('Ler respostas agora', { mini: true, tipo: 'sec', icone: 'ph:cloud-arrow-down-bold', tid: 'ler-respostas-form', onclick: () => sincronizarRespostasGoogle() }) : null),
        sit === 'publicado' && !analisarLinkForms(F.google_url).temCodigo ? alerta('aviso', 'Sem código no link', 'Cada resposta chegará sem identificação automática. Gere o link pré-preenchido (passo 1) para o CRM saber de quem é.') : null))
  }
  desenhar(); return raiz
}
function fichaPerguntasDemanda(x) { return painelFormulariosDaDemanda(x) }
