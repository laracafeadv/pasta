'use strict'
/* ============ Início ============ */
window.addEventListener('hashchange', () => { const r = lerHash(); if (r && r !== R.rota) { R.rota = r; R.p = {}; render() } })
window.addEventListener('error', e => { try { aviso('Erro inesperado: ' + (e.message || 'veja o console'), 'erro') } catch (x) { /* sem toast */ } })
Object.assign(VIEWS, { login: () => telaLogin() })
const inicial = lerHash(); if (inicial) R.rota = inicial
carregarSemente(); render()
iniciarArmazenamento(() => { render(); if ((CONFIG.integr || {}).gforms_ok) setTimeout(() => sincronizarRespostasGoogle({ silencioso: true }), 1500) })
// papel real: quem pode editar o artefato é administradora; quem só vê/edita o dia a dia é equipe
;(async () => { try { const u = window.claude && window.claude.use ? await window.claude.use('user') : null; if (u && u.isOwner) { CONFIG.perfil.papel = (await u.isOwner()) ? 'admin' : 'equipe'; render() } } catch (e) { /* sem capability: administradora */ } })()
// grava o que estiver pendente ao sair ou esconder a aba (a gravação normal espera 0,5 s)
const descarregarJa = () => { if (ARM.pendente.size) { clearTimeout(ARM.timer); descarregar() } }
window.addEventListener('pagehide', descarregarJa); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') descarregarJa() })
