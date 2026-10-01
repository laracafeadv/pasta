'use strict'
/* ============ SUPABASE DO CRM (real) ============
   Pessoas/Demandas espelhadas no banco real, formulários publicados, links públicos individuais e WhatsApp pela Cloud API.
   O artifact é a interface; o banco e a API pública (Edge Function crm-api) ficam no Supabase do escritório — sem Vercel.
   Escritas só pelos construtores abaixo (valores escapados, tabelas permitidas); nada de SQL livre. */
const PROJETO_PADRAO = 'cuaeuazmgwdhfozrqkin'
const PAGINA_PADRAO = 'https://laracafeadv.github.io/pasta/formulario/'
const projetoSupabase = () => { const p = String((CONFIG.integr || {}).supabase || PROJETO_PADRAO).trim(); if (!/^[a-z0-9]{20}$/.test(p)) throw { code: 'sem_projeto' }; return p }
const urlPagina = () => String((CONFIG.integr || {}).pagina_url || PAGINA_PADRAO).replace(/\?.*$/, '')
const linkRealDoEnvio = e => e.token && e.site_id ? `${urlPagina()}?t=${e.token}` : ''
const lit = v => v == null || v === '' ? 'null' : "'" + String(v).replace(/\u0000/g, '').replace(/'/g, "''") + "'"
const int = v => { const n = Number(v); if (!Number.isInteger(n)) throw { code: 'invalido', message: 'valor numérico inválido' }; return String(n) }
const PERMITIDAS = [/^insert into public\.(contatos|casos|formularios|formulario_envios|whatsapp_saida) /, /^update public\.(formularios|formulario_envios|mensagens_whatsapp|contatos|casos) set /]
async function sqlEscrita(q) { if (!PERMITIDAS.some(r => r.test(q))) throw { code: 'recusado' }; return linhasSql(await conector('Supabase', 'execute_sql', { project_id: projetoSupabase(), query: q })) }
const sqlLer = async q => { if (!somenteSelect(q)) throw { code: 'recusado' }; return linhasSql(await conector('Supabase', 'execute_sql', { project_id: projetoSupabase(), query: q })) }
const fone55 = t => { let d = String(t || '').replace(/\D/g, ''); if (d.length === 10 || d.length === 11) d = '55' + d; return /^\d{12,13}$/.test(d) ? d : '' }
/* Dados de demonstração nunca se misturam com os reais: ficam marcados (exemplo=true) no banco e podem ser removidos de uma vez. */
const ehExemplo = x => x.exemplo === true || (x.exemplo === undefined && x.id <= 9 && !x.real)

/* ---------- Pessoa e Demanda no banco real ---------- */
async function garantirPessoaNoSite(c) {
  const fone = fone55(c.telefone); if (!fone) throw { code: 'invalido', message: `“${c.nome || 'a pessoa'}” precisa de telefone com DDD (WhatsApp) para existir no banco real` }
  const ex = await sqlLer(`select id from public.contatos where telefone = ${lit(fone)} limit 1`)
  if (ex.length) { c.site_id = Number(ex[0].id); salvar('contatos'); return c.site_id }
  const r = await sqlEscrita(`insert into public.contatos (telefone, nome, email, origem, etapa, exemplo) values (${lit(fone)}, ${lit(c.nome)}, ${lit(c.email)}, 'CRM', 'ativo', ${ehExemplo(c) ? 'true' : 'false'}) returning id`)
  c.site_id = Number(r[0].id); salvar('contatos'); return c.site_id
}
async function garantirDemandaNoSite(d, pessoaSiteId) {
  const ex = await sqlLer(`select id from public.casos where contato_id = ${int(pessoaSiteId)} and lower(titulo) = lower(${lit(d.titulo)}) limit 1`)
  if (ex.length) { d.site_id = Number(ex[0].id); salvar('demandas'); return d.site_id }
  const tipo = ['consultivo', 'documental', 'extrajudicial', 'judicial'].includes(d.tipo) ? lit(d.tipo) : 'null'
  const r = await sqlEscrita(`insert into public.casos (contato_id, titulo, area, tipo, status, exemplo) values (${int(pessoaSiteId)}, ${lit(d.titulo)}, ${lit(d.area)}, ${tipo}, 'ativo', ${ehExemplo(d) ? 'true' : 'false'}) returning id`)
  d.site_id = Number(r[0].id); salvar('demandas'); return d.site_id
}

/* ---------- Formulários: publicar / despublicar (a versão publicada é imutável e fica no banco) ---------- */
const novoRef = () => 'f' + Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('')
function estruturaParaPublicar(F) {
  return { nome: F.nome, descricao: F.descricao || null, instrucoes: F.instrucoes || null, finalidade: F.finalidade || null, mensagem_final: F.mensagem_final || null, contexto: F.contexto,
    secoes: F.secoes.map(s => ({ titulo: s.titulo || '', descricao: s.descricao || null, mostrar_se: s.mostrar_se || null, itens: s.itens.filter(i => !CRM.tipoInterno(i.tipo)).map(i => ({ pergunta_id: i.pergunta_id, texto: i.texto, tipo: i.tipo, opcoes: i.opcoes || [], ajuda: i.ajuda || null, obrigatoria: !!i.obrigatoria, mostrar_se: i.mostrar_se || null, mapear: i.mapear || null, doc_desc: i.doc_desc || null })) })).filter(s => s.itens.length) }
}
const assinaturaForm = F => JSON.stringify(estruturaParaPublicar(F))
const TIPOS_PUBLICAVEIS = ['texto_curto', 'texto_longo', 'numero', 'data', 'horario', 'email', 'telefone', 'cpf_cnpj', 'endereco', 'sim_nao', 'selecao_unica', 'lista_suspensa', 'selecao_multipla', 'assinatura']
const alteracoesNaoPublicadas = F => situacaoForm(F) === 'publicado' && F.pub_sig && F.pub_sig !== assinaturaForm(F)
async function publicarFormularioNoSite(F) {
  const est = estruturaParaPublicar(F); const itens = est.secoes.flatMap(s => s.itens)
  if (!itens.length) throw { code: 'invalido', message: 'O formulário ainda não tem perguntas. Adicione pelo menos uma antes de publicar.' }
  const ruim = itens.find(i => !TIPOS_PUBLICAVEIS.includes(i.tipo)); if (ruim) throw { code: 'invalido', message: `A pergunta “${ruim.texto}” é do tipo “${(CRM.TIPO(ruim.tipo) || {}).nome || ruim.tipo}”, que o link público ainda não suporta (envio de arquivo). Troque o tipo ou remova a pergunta.` }
  F.ref = F.ref || novoRef(); const sig = JSON.stringify(est)
  if (F.site_id && F.pub_sig === sig) { await sqlEscrita(`update public.formularios set situacao = 'publicado', ativo = true where ref = ${lit(F.ref)}`); return { versao: F.pub_versao } }
  const r = await sqlEscrita(`insert into public.formularios (ref, nome, descricao, contexto, situacao, ativo, versao, estrutura, publicado_em) values (${lit(F.ref)}, ${lit(F.nome)}, ${lit(F.descricao)}, ${lit(F.contexto)}, 'publicado', true, 1, ${lit(sig)}::jsonb, now()) on conflict (ref) where ref is not null do update set nome = excluded.nome, descricao = excluded.descricao, contexto = excluded.contexto, situacao = 'publicado', ativo = true, versao = public.formularios.versao + 1, estrutura = excluded.estrutura, publicado_em = now() returning id, versao`)
  F.site_id = Number(r[0].id); F.pub_versao = Number(r[0].versao); F.pub_sig = sig; F.pub_estrutura = est; F.publicado_em = agora(); return { versao: F.pub_versao }
}
async function despublicarFormularioNoSite(F) { if (F.ref && F.site_id) await sqlEscrita(`update public.formularios set situacao = 'arquivado', ativo = false where ref = ${lit(F.ref)}`) }

/* ---------- Envios (link público individual) ---------- */
async function criarEnvioReal(e) {
  const f = formularioDe(e.formulario_id); if (!f || !f.site_id || situacaoForm(f) !== 'publicado') throw { code: 'invalido', message: 'Publique o formulário antes de enviar.' }
  const pc = await garantirPessoaNoSite(contato(e.contato_id)); let caso = null; if (e.caso_id) caso = await garantirDemandaNoSite(demanda(e.caso_id), pc)
  const prazo = e.prazo_resposta ? `${lit(e.prazo_resposta)}::date` : 'null'
  const r = await sqlEscrita(`insert into public.formulario_envios (formulario_id, contato_id, caso_id, token, expira_em, prazo_resposta, versao_formulario, estrutura, status) select f.id, ${int(pc)}, ${caso == null ? 'null' : int(caso)}, ${lit(e.token)}, ${lit(e.expira_em)}, ${prazo}, f.versao, f.estrutura, 'gerado' from public.formularios f where f.ref = ${lit(f.ref)} and f.situacao = 'publicado' returning id, versao_formulario`)
  if (!r.length) throw { code: 'invalido', message: 'O formulário não está publicado no banco. Publique-o de novo.' }
  e.site_id = Number(r[0].id); e.versao_formulario = Number(r[0].versao_formulario); e.estrutura_local = f.pub_estrutura || null; return e.site_id
}
const cancelarEnvioNoSite = async e => { if (e.site_id) await sqlEscrita(`update public.formulario_envios set status = 'cancelado', cancelado_em = now() where id = ${int(e.site_id)} and respondido_em is null`) }
const revogarEnvioNoSite = cancelarEnvioNoSite
const prorrogarEnvioNoSite = async e => { if (e.site_id) await sqlEscrita(`update public.formulario_envios set expira_em = ${lit(e.expira_em)} where id = ${int(e.site_id)} and respondido_em is null`) }
async function marcarEnviadoNoSite(e, canal) { if (e.site_id && ['whatsapp', 'email', 'manual'].includes(canal)) await sqlEscrita(`update public.formulario_envios set enviado_em = coalesce(enviado_em, now()), canal_envio = ${lit(canal)}, status = case when status = 'gerado' then 'enviado' else status end where id = ${int(e.site_id)} and respondido_em is null`) }

/* Traz o status e as respostas dadas pelos clientes (somente leitura). */
async function sincronizarEnviosDoSite(silencioso) {
  const locais = DB.envios.filter(e => e.site_id && e.token); if (!locais.length) { if (!silencioso) aviso('Nenhum link enviado ainda.'); return 0 }
  try {
    const rows = await sqlLer(`select id, token, status, enviado_em, visualizado_em, iniciado_em, respondido_em, expira_em, respondente, consentimento_em from public.formulario_envios where token in (${locais.map(e => lit(e.token)).join(',')})`)
    let novas = 0, mudou = 0; const ordem = { gerado: 0, enviado: 1, visualizado: 2, iniciado: 3, parcial: 3, cancelado: 9 }
    for (const r of rows) {
      const e = locais.find(x => x.token === r.token); if (!e) continue; const antes = e.status
      if (r.enviado_em && !e.enviado_em) e.enviado_em = r.enviado_em; if (r.visualizado_em && !e.visualizado_em) e.visualizado_em = r.visualizado_em; if (r.iniciado_em && !e.iniciado_em) e.iniciado_em = r.iniciado_em
      if (r.status === 'respondido' && e.status !== 'respondido') {
        const rs = await sqlLer(`select pergunta_ref, ordem, pergunta_texto, pergunta_tipo, secao_titulo, resposta from public.formulario_envio_respostas where envio_id = ${int(r.id)} order by ordem asc limit 400`)
        const itensEst = new Map(((e.estrutura_local || {}).secoes || []).flatMap(s => s.itens).map(i => [String(i.pergunta_id), i]))
        e.respostas = {}; for (const x of rs) e.respostas[x.pergunta_ref] = x.resposta
        e.snap = rs.map(x => { const i = itensEst.get(String(x.pergunta_ref)) || {}; return { pergunta_id: x.pergunta_ref, texto: x.pergunta_texto, tipo: x.pergunta_tipo, mapear: i.mapear || null, doc: i.doc_desc || null } })
        e.status = 'respondido'; e.respondido_em = r.respondido_em; e.respondente = r.respondente; e.consentimento_em = r.consentimento_em; e.nova = true; novas++
        const c = contato(e.contato_id); if (c) registrar(c.id, 'Documento recebido', `Formulário respondido: ${nomeFormEnvio(e)}` + (r.respondente ? ` (por ${r.respondente})` : ''), e.caso_id)
      } else if (e.status !== 'respondido' && ['gerado', 'enviado', 'visualizado', 'iniciado', 'cancelado'].includes(r.status) && (ordem[r.status] ?? 0) > (ordem[e.status] ?? 0)) e.status = r.status
      if (e.status !== antes) mudou++
    }
    CONFIG.integr.form_sync = agora(); salvar('envios'); salvar('config')
    if (!silencioso) aviso(novas ? `${plural(novas, 'resposta nova', 'respostas novas')} recebida(s).` : mudou ? 'Status atualizados.' : 'Nada novo.')
    else if (novas) aviso(`${plural(novas, 'resposta nova', 'respostas novas')} de formulário!`)
    return novas
  } catch (err) { if (!silencioso) aviso(erroConector(err, 'Supabase'), 'erro'); return 0 }
}

/* ---------- Tela “Enviar formulário”: formulário publicado → demanda → validade → data limite → gerar link ---------- */
function enviarFormulario(c, f, opc = {}) {
  const pubs = DB.formularios.filter(x => situacaoForm(x) === 'publicado' && x.site_id)
  if (!pubs.length) { aviso('Publique um formulário antes de enviar (Formulários › Editar › Publicar).', 'erro'); return }
  const S = { cid: c ? c.id : '', fid: f && pubs.some(x => x.id === f.id) ? f.id : (opc.caso ? pubs.find(x => x.contexto === 'demanda') || pubs[0] : pubs.find(x => x.contexto !== 'demanda') || pubs[0]).id, caso: opc.caso || '', validade: FORM_CFG().validade, prazo: '' }
  const corpo = h('div', { class: 'space-y-4', 'data-testid': 'envio-config' }); let ocupado = false
  const des = () => {
    const form = pubs.find(x => x.id === Number(S.fid)); const casos = S.cid ? demandasDe(Number(S.cid)) : []
    const sel = (rot, valor, ops, onchange, tid) => h('label', { class: 'block' }, rotuloCampo(rot), h('select', { class: 'modal-input', 'data-testid': tid, onchange: ev => { onchange(ev.target.value); des() } }, ops.map(([v, t]) => h('option', { value: v, selected: String(v) === String(valor) }, t))))
    corpo.replaceChildren(
      c ? h('p', { class: 'text-sm' }, h('b', {}, 'Pessoa: '), c.nome) : sel('Pessoa', S.cid, [['', 'Escolha…'], ...DB.contatos.map(x => [x.id, (x.nome || x.telefone) + (ehExemplo(x) ? ' (exemplo)' : '')])], v => { S.cid = v ? Number(v) : ''; S.caso = '' }, 'env-cliente'),
      sel('Formulário publicado', S.fid, pubs.map(x => [x.id, `${x.nome} — v${x.pub_versao || 1}`]), v => { S.fid = Number(v); S.validade = pubs.find(x => x.id === Number(v)).validade_dias || FORM_CFG().validade }, 'env-form'),
      alteracoesNaoPublicadas(form) ? alerta('aviso', null, 'Este formulário tem alterações ainda NÃO publicadas: o link usará a versão ' + (form.pub_versao || 1) + ', já publicada.') : null,
      S.cid ? sel(form.contexto === 'demanda' ? 'Demanda (obrigatória para este formulário)' : 'Demanda (opcional)', S.caso, [['', form.contexto === 'demanda' ? 'Escolha…' : '— sem demanda —'], ...casos.map(x => [x.id, x.titulo])], v => { S.caso = v ? Number(v) : '' }, 'env-caso') : null,
      h('div', { class: 'grid grid-cols-2 gap-3' }, h('label', {}, rotuloCampo('Link vale por (dias)'), h('input', { type: 'number', min: 1, max: 90, class: 'modal-input', value: S.validade, 'data-testid': 'env-validade', oninput: ev => { S.validade = Number(ev.target.value) } })), h('label', {}, rotuloCampo('Data limite p/ resposta (opcional)'), h('input', { type: 'date', class: 'modal-input', value: S.prazo, 'data-testid': 'env-prazo', onchange: ev => { S.prazo = ev.target.value } }))),
      h('p', { class: 'text-xs text-gray-500' }, 'Link público e individual: a cliente abre no celular ou computador, sem login e sem ver nada do CRM. As respostas ficam no banco do CRM, ligadas à pessoa' + (S.caso ? ' e à demanda' : '') + '.'))
  }
  des()
  modal({ titulo: 'Enviar formulário', largura: 'max-w-xl', corpo, rodape: fechar => [btn('Cancelar', { tipo: 'sec', onclick: fechar }), btn('Gerar link', { tid: 'gerar-link', onclick: async () => {
    if (ocupado) return; const form = pubs.find(x => x.id === Number(S.fid)); if (!S.cid) { aviso('Escolha a pessoa.', 'erro'); return } if (form.contexto === 'demanda' && !S.caso) { aviso('Este formulário é de uma demanda: escolha a demanda.', 'erro'); return } if (!(S.validade >= 1 && S.validade <= 90)) { aviso('Validade entre 1 e 90 dias.', 'erro'); return }
    const e = { id: proximoId('envios'), created_at: agora(), formulario_id: form.id, formulario_nome: form.nome, contato_id: Number(S.cid), caso_id: S.caso ? Number(S.caso) : null, token: novoToken(), modo: 'site', origem: 'artefato', expira_em: agora(S.validade * 1440), prazo_resposta: S.prazo || null, status: 'gerado', enviado_em: null, canal_envio: null, lembretes: [], visualizado_em: null, iniciado_em: null, respondido_em: null, respostas: {}, resumo: null }
    ocupado = true
    try { await criarEnvioReal(e); DB.envios.push(e); registrar(e.contato_id, 'Anotação', `Link do formulário “${form.nome}” (v${e.versao_formulario}) gerado.`, e.caso_id); auditar('form_gerar_link', nomeContato(e.contato_id) + ' · ' + form.nome); salvar('envios'); fechar(); render(); painelEnvio(e, false, true) }
    catch (err) { ocupado = false; aviso(err && err.code === 'invalido' ? 'Não foi possível gerar o link: ' + err.message + '.' : erroConector(err, 'Supabase'), 'erro') }
  } })] })
}

/* ---------- publicar/despublicar com reversão se o banco recusar ---------- */
async function publicarForm(f) {
  const antes = { situacao: f.situacao, ativo: f.ativo }
  try { f.situacao = 'publicado'; f.ativo = true; const r = await publicarFormularioNoSite(f); auditar('publicar_formulario', f.nome + ' v' + r.versao); salvar('formularios'); aviso(`Formulário publicado (versão ${r.versao}): já pode gerar links para clientes.`); return true }
  catch (err) { Object.assign(f, antes); salvar('formularios'); aviso(err && err.code === 'invalido' ? err.message : erroConector(err, 'Supabase'), 'erro'); return false }
}
async function despublicarForm(f, novo) {
  try { await despublicarFormularioNoSite(f) } catch (err) { aviso('Atenção: não consegui avisar o banco (' + erroConector(err, 'Supabase') + '). O link público de novos envios pode continuar ativo.', 'erro') }
  f.situacao = novo; f.ativo = false; auditar(novo === 'arquivado' ? 'arquivar_formulario' : 'despublicar_formulario', f.nome); salvar('formularios'); aviso(novo === 'arquivado' ? 'Formulário arquivado. Links já enviados continuam valendo até expirar ou serem cancelados.' : 'Formulário despublicado: volta a ser rascunho e não pode gerar novos links.')
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

/* ============ WhatsApp (Cloud API oficial da Meta) ============
   Receber: Meta → Edge Function crm-api/whatsapp → banco → aqui (automático, com o CRM fechado).
   Responder: aqui → fila whatsapp_saida → Edge Function crm-api/enviar → Meta → cliente.  Nada é simulado:
   enquanto a Meta/segredos não estiverem configurados, o envio falha com o motivo exato e a mensagem NÃO é marcada como enviada. */
const WA_ROTULO = { enfileirada: 'Na fila…', enviada: 'Enviada', entregue: 'Entregue', lida: 'Lida', falhou: 'Falhou', recebida: '' }
const janela24h = c => DB.comunicacoes.some(m => m.contato_id === c.id && m.canal === 'whatsapp' && m.direcao === 'entrada' && Date.now() - new Date(m.created_at).getTime() < 864e5)
async function enviarWhatsAppPelaApi(c, texto, casoLocal) {
  const t = String(texto || '').trim(); if (!t) throw { code: 'invalido', message: 'Escreva a mensagem' }; if (t.length > 4000) throw { code: 'invalido', message: 'Mensagem longa demais (máx. 4000)' }
  const pc = await garantirPessoaNoSite(c); const caso = casoLocal ? await garantirDemandaNoSite(demanda(casoLocal), pc) : null
  const r = await sqlEscrita(`insert into public.whatsapp_saida (contato_id, caso_id, telefone, tipo, texto, criado_por) values (${int(pc)}, ${caso == null ? 'null' : int(caso)}, ${lit(fone55(c.telefone))}, 'texto', ${lit(t)}, 'artifact') returning id`)
  const m = novaComunicacao({ contato_id: c.id, caso_id: casoLocal || null, canal: 'whatsapp', direcao: 'saida', texto: t, origem: 'whatsapp-api', ext_id: 'saida:' + r[0].id, wa_status: 'enfileirada', saida_id: Number(r[0].id) })
  setTimeout(() => atualizarSaidasWa(true), 2500); setTimeout(() => atualizarSaidasWa(true), 8000); return m
}
async function enviarTemplateWa(c, tpl, params, casoLocal) {
  const pc = await garantirPessoaNoSite(c); const caso = casoLocal ? await garantirDemandaNoSite(demanda(casoLocal), pc) : null
  const r = await sqlEscrita(`insert into public.whatsapp_saida (contato_id, caso_id, telefone, tipo, template_nome, template_idioma, template_params, criado_por) values (${int(pc)}, ${caso == null ? 'null' : int(caso)}, ${lit(fone55(c.telefone))}, 'template', ${lit(tpl.nome)}, ${lit(tpl.idioma)}, ${lit(JSON.stringify(params || []))}::jsonb, 'artifact') returning id`)
  const m = novaComunicacao({ contato_id: c.id, caso_id: casoLocal || null, canal: 'whatsapp', direcao: 'saida', texto: `[modelo: ${tpl.nome}] ${(params || []).join(' · ')}`, origem: 'whatsapp-api', ext_id: 'saida:' + r[0].id, wa_status: 'enfileirada', saida_id: Number(r[0].id) })
  setTimeout(() => atualizarSaidasWa(true), 2500); return m
}
async function sincronizarModelosWa() { await sqlEscrita(`insert into public.whatsapp_saida (tipo, criado_por) values ('sincronizar_templates', 'artifact') returning id`); aviso('Pedido enviado. Os modelos aprovados na Meta chegam em instantes.'); setTimeout(() => lerModelosWa(), 6000) }
async function lerModelosWa() { try { CONFIG.wa_templates = (await sqlLer(`select nome, idioma, categoria, status, componentes from public.whatsapp_templates where status = 'APPROVED' order by nome`)).map(t => ({ nome: t.nome, idioma: t.idioma, categoria: t.categoria, corpo: ((typeof t.componentes === 'string' ? JSON.parse(t.componentes) : t.componentes) || []).find(x => x.type === 'BODY')?.text || '' })); salvar('config') } catch (e) { /* sem modelos ainda */ } }
/* acompanha o que está na fila de saída (enviada pela Meta? falhou? por quê?) */
async function atualizarSaidasWa(silencioso) {
  const pend = DB.comunicacoes.filter(m => m.saida_id && ['enfileirada'].includes(m.wa_status)); if (!pend.length) return 0
  try {
    const rows = await sqlLer(`select id, status, erro, wa_message_id from public.whatsapp_saida where id in (${pend.map(m => int(m.saida_id)).join(',')})`); let mudou = 0
    for (const r of rows) { const m = pend.find(x => x.saida_id === Number(r.id)); if (!m) continue
      if (r.status === 'enviada') { m.wa_status = 'enviada'; if (r.wa_message_id) m.ext_id = 'wa:' + r.wa_message_id; mudou++ } else if (r.status === 'falhou') { m.wa_status = 'falhou'; m.wa_erro = r.erro || 'Falha ao enviar.'; mudou++ } }
    if (mudou) { salvar('comunicacoes'); if (!silencioso) aviso('Status de envio atualizado.'); if (typeof render === 'function') render() } return mudou
  } catch (e) { return 0 }
}
async function sincronizarWhatsApp(silencioso) {
  try {
    await atualizarSaidasWa(true)
    const rows = await sqlLer(`select m.id, m.created_at, m.direcao, m.conteudo, m.tipo, m.wa_message_id, m.status, m.erro, m.caso_id, m.template_nome, c.id as cid, c.telefone, c.nome from public.mensagens_whatsapp m join public.contatos c on c.id = m.contato_id where m.created_at > now() - interval '90 days' and c.exemplo = false order by m.created_at asc limit 500`)
    let n = 0, mud = 0; const novos = new Map()
    for (const r of rows) {
      const c = DB.contatos.find(x => x.site_id === Number(r.cid) || fone55(x.telefone) === String(r.telefone))
      if (!c) { const k = String(r.telefone); const a = novos.get(k) || { telefone: k, nome: r.nome, site_id: Number(r.cid), n: 0, ultima: r.created_at, previa: '' }; a.n++; a.ultima = r.created_at; a.previa = String(r.conteudo || '').slice(0, 80); novos.set(k, a); continue }
      if (!c.site_id) c.site_id = Number(r.cid)
      const ext = 'wa:' + (r.wa_message_id || r.id); const ex = DB.comunicacoes.find(x => x.ext_id === ext)
      const st = r.status || (r.direcao === 'entrada' ? 'recebida' : 'enviada'); const caso = r.caso_id ? (DB.demandas.find(d => d.site_id === Number(r.caso_id)) || {}).id || null : null
      if (ex) { if (ex.wa_status !== st || (r.erro || null) !== (ex.wa_erro || null)) { ex.wa_status = st; ex.wa_erro = r.erro || null; mud++ } if (caso && !ex.caso_id) ex.caso_id = caso; continue }
      novaComunicacao({ contato_id: c.id, caso_id: caso, canal: 'whatsapp', direcao: r.direcao === 'entrada' ? 'entrada' : 'saida', texto: String(r.conteudo || `[${r.tipo || 'mensagem'}]`).slice(0, 4000), origem: 'whatsapp-api', ext_id: ext, created_at: new Date(r.created_at).toISOString(), lida: r.direcao !== 'entrada', wa_status: st, wa_erro: r.erro || null, wa_id: r.wa_message_id || null }); n++
    }
    CONFIG.wa_novos = [...novos.values()].sort((a, b) => b.ultima.localeCompare(a.ultima))
    try { const d = await sqlLer(`select valor, updated_at from public.escritorio where chave = 'wa_ultimo_webhook'`); CONFIG.wa_diag = d[0] ? { ...JSON.parse(d[0].valor), em: JSON.parse(d[0].valor).em } : null } catch (e) { /* sem diagnóstico */ }
    CONFIG.integr.wa_sync = agora(); salvar('config'); if (n || mud) salvar('comunicacoes')
    if (!silencioso) aviso(n ? `${plural(n, 'mensagem nova', 'mensagens novas')} do WhatsApp.` : 'Nenhuma mensagem nova no WhatsApp.'); else if (n) aviso(`${plural(n, 'mensagem nova', 'mensagens novas')} no WhatsApp!`)
    if ((n || mud) && typeof render === 'function') render(); return n
  } catch (e) { if (!silencioso) aviso(erroConector(e, 'Supabase'), 'erro'); return 0 }
}
const sincronizarWhatsAppDoSite = () => sincronizarWhatsApp(false)
/* Associar um número novo (chegou mensagem de quem não está cadastrado): a uma Pessoa existente ou criando uma nova. */
function associarNumeroWa(n) {
  const opcoes = [['', 'Criar uma pessoa nova'], ...DB.contatos.filter(c => !c.site_id && !fone55(c.telefone)).map(c => [c.id, c.nome])]
  modalForm('Número ' + telefoneFormatado(n.telefone) + (n.nome ? ' — ' + n.nome : ''), [{ chave: 'alvo', rotulo: 'Associar a', tipo: 'select', opcoes }], { alvo: '' }, async v => {
    let c = v.alvo ? contato(Number(v.alvo)) : null
    if (c) { c.telefone = n.telefone; c.site_id = n.site_id } else { c = { id: proximoId('contatos'), created_at: agora(), updated_at: agora(), nome: n.nome || telefoneFormatado(n.telefone), telefone: n.telefone, email: null, cidade: null, origem: 'WhatsApp', area: null, demanda: null, etapa: 'novo', exemplo: false, real: true, site_id: n.site_id }; DB.contatos.push(c); registrar(c.id, 'Sistema', 'Pessoa criada a partir de mensagem recebida no WhatsApp.') }
    salvar('contatos'); await sincronizarWhatsApp(true); aviso('Número associado a ' + c.nome + '.'); UI.com.sel = c.id; render()
  }, { rotulo: 'Associar' })
}
/* Vincular a conversa a uma demanda (local e no banco, para o webhook e o histórico enxergarem o mesmo). */
function vincularConversaADemanda(c) {
  const ds = demandasDe(c.id); if (!ds.length) { aviso('Esta pessoa não tem demandas. Crie uma demanda primeiro.', 'erro'); return }
  modalForm('Vincular conversa a uma demanda', [{ chave: 'caso', rotulo: 'Demanda', tipo: 'select', opcoes: ds.map(d => [d.id, d.titulo]), numerico: true, obrigatorio: true }], { caso: ds[0].id }, async v => {
    const ms = DB.comunicacoes.filter(m => m.contato_id === c.id && m.canal === 'whatsapp' && !m.caso_id); ms.forEach(m => { m.caso_id = v.caso }); salvar('comunicacoes')
    try { const pc = await garantirPessoaNoSite(c); const cs = await garantirDemandaNoSite(demanda(v.caso), pc); await sqlEscrita(`update public.mensagens_whatsapp set caso_id = ${int(cs)} where contato_id = ${int(pc)} and caso_id is null`) } catch (e) { aviso('Vinculado aqui; não consegui gravar no banco: ' + erroConector(e, 'Supabase'), 'erro') }
    registrar(c.id, 'Anotação', `Conversa de WhatsApp vinculada à demanda “${nomeDemanda(v.caso)}”.`, v.caso); render(); atualizarCamadas()
  }, { rotulo: 'Vincular' })
}
let WA_TIMER = null
function ligarSincronizacaoWa() { if (WA_TIMER) return; WA_TIMER = setInterval(() => { if (document.hidden) return; if (['comunicacao', 'caixa'].includes(R.rota) || document.querySelector('[data-testid=thread]')) sincronizarWhatsApp(true) }, 20000) }

/* Fora da janela de 24h só vale modelo aprovado pela Meta: escolher e preencher os campos {{1}}, {{2}}… */
function escolherModeloWa(c, casoLocal, textoOriginal) {
  const tpls = CONFIG.wa_templates || []; let sel = null; let params = []
  const corpoEl = h('div', { class: 'space-y-3' }); let m
  const nVars = t => Math.max(0, ...[...String(t.corpo || '').matchAll(/\{\{(\d+)\}\}/g)].map(x => Number(x[1])))
  const des = () => corpoEl.replaceChildren(
    alerta('aviso', 'Fora da janela de 24 horas', 'O WhatsApp só permite mensagem livre até 24h depois da última mensagem da cliente. Para falar agora, envie um modelo (template) aprovado pela Meta.'),
    tpls.length ? h('div', { class: 'space-y-2' }, tpls.map(t => h('label', { class: 'flex items-start gap-3 rounded-2xl border p-3 text-sm cursor-pointer ' + (sel === t ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-zinc-700') }, h('input', { type: 'radio', name: 'tpl', class: 'mt-1 accent-[#6f5636]', checked: sel === t, 'data-testid': 'tpl-' + t.nome, onclick: () => { sel = t; params = Array(nVars(t)).fill(''); des() } }), h('div', {}, h('p', { class: 'font-semibold' }, t.nome, h('span', { class: 'font-normal text-gray-400 text-xs' }, ' · ' + t.idioma + ' · ' + (t.categoria || ''))), h('p', { class: 'text-xs text-gray-500 whitespace-pre-line' }, t.corpo))))) : h('p', { class: 'text-sm text-gray-500', 'data-testid': 'sem-modelos' }, 'Nenhum modelo aprovado sincronizado ainda. Crie e aprove modelos no Meta (WhatsApp Manager › Modelos de mensagem) e clique em “Sincronizar modelos”.'),
    sel && params.length ? h('div', { class: 'grid gap-2' }, params.map((v, i) => h('label', { class: 'block' }, rotuloCampo(`Variável {{${i + 1}}}`), h('input', { class: 'modal-input', value: v, 'data-testid': 'tpl-param-' + (i + 1), oninput: ev => { params[i] = ev.target.value } })))) : null,
    btn('Sincronizar modelos da Meta', { mini: true, tipo: 'fantasma', icone: 'ph:arrows-clockwise-bold', tid: 'sync-modelos', onclick: async () => { try { await sincronizarModelosWa(); setTimeout(() => { fecharTodas(); escolherModeloWa(c, casoLocal, textoOriginal) }, 7000) } catch (e) { aviso(erroConector(e, 'Supabase'), 'erro') } } }))
  lerModelosWa().then(() => { const novos = CONFIG.wa_templates || []; if (novos.length !== tpls.length) { fecharTodas(); escolherModeloWa(c, casoLocal, textoOriginal) } }).catch(() => {})
  des(); m = modal({ titulo: 'Enviar modelo aprovado', largura: 'max-w-xl', corpo: corpoEl, rodape: fechar => [btn('Cancelar', { tipo: 'sec', onclick: fechar }), btn('Enviar modelo', { tid: 'enviar-modelo', onclick: async () => { if (!sel) { aviso('Escolha um modelo.', 'erro'); return } if (params.some(x => !String(x).trim())) { aviso('Preencha todas as variáveis.', 'erro'); return } try { await enviarTemplateWa(c, sel, params, casoLocal); fechar(); render(); atualizarCamadas() } catch (e) { aviso(e && e.code === 'invalido' ? e.message : erroConector(e, 'Supabase'), 'erro') } } })] })
}

/* Estado real da integração (nunca “conectado” de enfeite): vem do diagnóstico que a própria Edge Function grava a cada chamada da Meta. */
function estadoWa() {
  const d = CONFIG.wa_diag; const sync = (CONFIG.integr || {}).wa_sync
  if (!sync) return { nivel: 'aviso', titulo: 'WhatsApp ainda não consultado', texto: 'Clique em “Atualizar WhatsApp” para verificar o banco. Para receber e enviar de verdade, falta ligar a Meta (passo a passo em Configurações › Conexões).' }
  if (!d) return { nivel: 'aviso', titulo: 'Aguardando a Meta', texto: 'O CRM já está pronto (banco, webhook e fila de envio), mas a Meta ainda não chamou o webhook. Falta configurar o aplicativo na Meta e os segredos no Supabase — veja Configurações › Conexões.' }
  if (d.ok === false) return { nivel: 'erro', titulo: 'A Meta chamou, mas a assinatura não confere', texto: (d.motivo || 'Verifique o App Secret') + ' (' + dataHora(d.em) + '). Confira o segredo WHATSAPP_APP_SECRET no Supabase.' }
  return { nivel: 'ok', titulo: 'WhatsApp recebendo', texto: 'Último evento da Meta em ' + dataHora(d.em) + (d.gravadas ? ` · ${plural(d.gravadas, 'mensagem gravada', 'mensagens gravadas')}` : '') + '.' }
}
const painelEstadoWa = () => { const e = estadoWa(); return e.nivel === 'ok' ? null : alerta(e.nivel, e.titulo, e.texto) }

const URL_WEBHOOK_WA = () => `https://${projetoSupabase()}.supabase.co/functions/v1/crm-api/whatsapp`
function blocoWhatsApp() {
  const e = estadoWa(); const seg = ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET', 'WHATSAPP_WABA_ID']
  return h('div', { class: 'mt-3 space-y-3', 'data-testid': 'bloco-whatsapp' }, alerta(e.nivel, e.titulo, e.texto),
    h('div', { class: 'flex flex-wrap gap-2' }, btn('Atualizar WhatsApp', { mini: true, tipo: 'sec', icone: 'ph:arrows-clockwise-bold', tid: 'wa-atualizar', onclick: async () => { await sincronizarWhatsApp(false); render() } }), btn('Sincronizar modelos da Meta', { mini: true, tipo: 'sec', icone: 'ph:chat-circle-text-bold', tid: 'wa-modelos', onclick: () => sincronizarModelosWa().catch(err => aviso(erroConector(err, 'Supabase'), 'erro')) })),
    h('details', { class: 'rounded-2xl border border-gray-200 dark:border-zinc-700 p-3 text-sm', open: e.nivel !== 'ok' }, h('summary', { class: 'cursor-pointer font-semibold' }, 'Passo a passo para ligar o WhatsApp real (só depende de você, na Meta)'),
      h('ol', { class: 'list-decimal pl-5 mt-2 space-y-2 text-xs text-gray-600 dark:text-zinc-300' },
        h('li', {}, h('b', {}, 'Meta for Developers: '), 'crie o app tipo Business e adicione o produto WhatsApp. Comece pelo ', h('b', {}, 'número de teste'), ' que a Meta oferece (não mexe no seu número).'),
        h('li', {}, h('b', {}, 'Supabase → Edge Functions → Secrets: '), 'cadastre ' + seg.join(', ') + '. (O token permanente e o App Secret vêm da Meta; o VERIFY_TOKEN é uma frase longa que você inventa; WABA_ID e Phone Number ID aparecem em WhatsApp › Configuração da API.)'),
        h('li', {}, h('b', {}, 'Meta → WhatsApp → Configuração → Webhook: '), 'URL ', h('code', { class: 'break-all', 'data-testid': 'url-webhook' }, URL_WEBHOOK_WA()), ' · token de verificação = o mesmo VERIFY_TOKEN · assine o campo ', h('code', {}, 'messages'), '. ', btn('Copiar URL', { mini: true, tipo: 'fantasma', tid: 'copiar-webhook', onclick: () => copiar(URL_WEBHOOK_WA()) })),
        h('li', {}, 'Mande uma mensagem do seu celular para o número de teste e clique em “Atualizar WhatsApp”: ela aparece na Caixa. Responda pelo CRM e confira no celular.'),
        h('li', {}, h('b', {}, 'Só depois, e só com a sua confirmação: '), 'avaliar conectar o número real em coexistência (o app continua funcionando). Nada disso é feito automaticamente.'))))
}
