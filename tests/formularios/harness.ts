// Exporta o banco em memória + as regras REAIS do servidor para o teste de interface (Playwright) usá-las nas rotas simuladas.
export { banco, db, zerar } from './fake-db'
export { limparEstrutura, salvarEstrutura, carregarFormulario, duplicarFormulario, excluirFormulario, montarFicha, estruturaPublica, validarRespostasPublicas } from '../../server/utils/formularioEstrutura'
