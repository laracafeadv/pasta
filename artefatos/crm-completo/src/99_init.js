'use strict'
/* ============ Início ============ */
window.addEventListener('hashchange', () => { const r = lerHash(); if (r && r !== R.rota) { R.rota = r; R.p = {}; render() } })
window.addEventListener('error', e => { try { aviso('Erro inesperado: ' + (e.message || 'veja o console'), 'erro') } catch (x) { /* sem toast */ } })
Object.assign(VIEWS, { login: () => telaLogin() })
const inicial = lerHash(); if (inicial) R.rota = inicial
carregarSemente(); render()
iniciarArmazenamento(() => render())
// grava o que estiver pendente ao sair ou esconder a aba (a gravação normal espera 0,5 s)
const descarregarJa = () => { if (ARM.pendente.size) { clearTimeout(ARM.timer); descarregar() } }
window.addEventListener('pagehide', descarregarJa); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') descarregarJa() })
