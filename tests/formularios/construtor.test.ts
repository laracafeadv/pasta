import { banco, db, zerar } from './fake-db'
import { limparEstrutura, salvarEstrutura, carregarFormulario, duplicarFormulario, montarFicha, estruturaPublica, validarRespostasPublicas, excluirFormulario } from '../../server/utils/formularioEstrutura'
import { calcularVisibilidade, operadoresDoTipo, normalizarCondicao } from '../../shared/data/formulario'

;(globalThis as any).createError = (o: any) => Object.assign(new Error(o.message), o)
let falhas = 0
const ok = (c: boolean, nome: string) => { console.log(`${c ? 'PASS' : 'FAIL'} ${nome}`); if (!c) falhas++ }
const lanca = async (fn: () => any, trecho?: string) => { try { await fn(); return false } catch (e: any) { return trecho ? String(e.message).includes(trecho) : true } }
const cond = (pid: number, operador: string, valor?: string) => ({ juntar: 'e', regras: [{ pergunta_id: pid, operador, ...(valor ? { valor } : {}) }] })
const P = (pid: number, texto: string, tipo: string, extra: any = {}) => ({ pergunta_id: pid, texto, tipo, opcoes: [], ...extra })

zerar()
db.contatos = [{ id: 1, nome: 'Maria' }]
db.casos = [{ id: 10, contato_id: 1, procedimento: null }]
db.contato_respostas = []; db.caso_respostas = []

// ── Formulário de teste "Dados familiares" (do pedido) ──
const dados = () => ({
  nome: 'Dados familiares', descricao: 'Informações sobre a família', contexto: 'cliente',
  secoes: [
    { titulo: 'Dados pessoais', itens: [P(-1, 'Nome', 'texto_curto', { obrigatoria: true }), P(-2, 'Estado civil', 'selecao_unica', { opcoes: ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União estável'] })] },
    { titulo: 'Estrutura familiar', itens: [P(-3, 'Possui filhos?', 'sim_nao', { obrigatoria: true }), P(-4, 'Quantos filhos?', 'numero', { mostrar_se: cond(-3, 'igual', 'Sim') })] },
    { titulo: 'Patrimônio', itens: [P(-5, 'Possui patrimônio?', 'sim_nao'), P(-6, 'Possui imóveis?', 'sim_nao', { mostrar_se: cond(-5, 'igual', 'Sim') }), P(-7, 'Possui empresa?', 'sim_nao', { mostrar_se: cond(-5, 'igual', 'Sim') }), P(-8, 'Possui investimentos?', 'sim_nao', { mostrar_se: cond(-5, 'igual', 'Sim') })] },
  ],
})
const { id: fid, relatorio } = await salvarEstrutura(banco, null, limparEstrutura(dados()))
let f = await carregarFormulario(banco, fid)
ok(f.secoes.length === 3 && f.secoes.flatMap(s => s.itens).length === 8 && relatorio.criadas === 8, 'criação: 3 seções e 8 perguntas persistidas')
const pid = (t: string) => f.secoes.flatMap(s => s.itens).find(i => i.texto === t)!.pergunta_id
ok(f.secoes[1]!.itens[1]!.mostrar_se?.regras[0]?.pergunta_id === pid('Possui filhos?'), 'condição gravada apontando para a pergunta real (id traduzido do rascunho)')
ok(f.secoes[0]!.itens[0]!.obrigatoria && !f.secoes[0]!.itens[1]!.obrigatoria, 'obrigatoriedade persistida')
ok(f.secoes[0]!.itens[1]!.opcoes.length === 5 && f.secoes[0]!.itens[1]!.opcoes[4] === 'União estável', 'opções persistidas na ordem')
ok(db.formulario_perguntas.every(p => p.escopo === 'cliente'), 'contexto cliente => escopo cliente')

// ── Lógica condicional ──
const vis = (r: Record<number, any>) => calcularVisibilidade(f.secoes, r)
ok(!vis({}).perguntas.has(pid('Quantos filhos?')), 'sem resposta: "Quantos filhos?" escondida')
ok(vis({ [pid('Possui filhos?')]: 'Sim' }).perguntas.has(pid('Quantos filhos?')), 'Possui filhos = Sim: mostra "Quantos filhos?"')
ok(!vis({ [pid('Possui filhos?')]: 'Não' }).perguntas.has(pid('Quantos filhos?')), 'Possui filhos = Não: não mostra')
const v3 = vis({ [pid('Possui patrimônio?')]: 'Sim' })
ok(['Possui imóveis?', 'Possui empresa?', 'Possui investimentos?'].every(t => v3.perguntas.has(pid(t))), 'Possui patrimônio = Sim: mostra imóveis, empresa e investimentos')
ok(!['Possui imóveis?', 'Possui empresa?', 'Possui investimentos?'].some(t => vis({ [pid('Possui patrimônio?')]: 'Não' }).perguntas.has(pid(t))), 'Possui patrimônio = Não: nenhuma das três')
// cascata: resposta de pergunta escondida não vale
const cascata: any = { juntar: 'e', regras: [{ pergunta_id: pid('Quantos filhos?'), operador: 'maior', valor: '2' }] }
const sec2 = JSON.parse(JSON.stringify(f.secoes)); sec2[2].mostrar_se = cascata
ok(!calcularVisibilidade(sec2, { [pid('Possui filhos?')]: 'Não', [pid('Quantos filhos?')]: '5', [pid('Possui patrimônio?')]: 'Sim' }).secoes.has(2), 'cascata: resposta guardada de pergunta escondida não ativa condição de outra')
ok(calcularVisibilidade(sec2, { [pid('Possui filhos?')]: 'Sim', [pid('Quantos filhos?')]: '3' }).secoes.has(2), 'seção condicional: aparece quando a condição (número maior que) é atendida')
ok(operadoresDoTipo('texto_curto').some(o => o.valor === 'contem') && !operadoresDoTipo('sim_nao').some(o => o.valor === 'contem') && !operadoresDoTipo('selecao_multipla').some(o => o.valor === 'igual') && operadoresDoTipo('numero').some(o => o.valor === 'maior'), 'operadores diferem por tipo (texto contém; sim/não não; múltipla seleciona; número compara)')
ok(normalizarCondicao({ pergunta_id: 5, igual_a: 'Sim' })?.regras[0]?.operador === 'igual', 'formato antigo de condição {pergunta_id, igual_a} continua lendo')

// ── Validações do construtor ──
ok(await lanca(() => limparEstrutura({ ...dados(), secoes: [{ titulo: 'a', itens: [P(-1, 'A', 'sim_nao', { mostrar_se: cond(-2, 'igual', 'Sim') }), P(-2, 'B', 'sim_nao')] }] }), 'depende de uma pergunta'), 'condição para pergunta POSTERIOR é rejeitada')
ok(await lanca(() => limparEstrutura({ ...dados(), secoes: [{ titulo: 'a', itens: [P(-1, 'A', 'sim_nao'), P(-2, 'B', 'sim_nao', { mostrar_se: cond(-1, 'contem', 'x') })] }] }), 'não vale para'), 'operador incompatível com o tipo é rejeitado (sim/não "contém")')
ok(await lanca(() => limparEstrutura({ ...dados(), secoes: [{ titulo: 'a', itens: [P(-1, 'A', 'selecao_unica', { opcoes: ['só uma'] })] }] }), '2 opções'), 'seleção com menos de 2 opções rejeitada')
ok(await lanca(() => limparEstrutura({ ...dados(), secoes: [{ titulo: 'a', itens: [P(-1, 'A', 'selecao_unica', { opcoes: ['X', 'x'] })] }] }), 'repetidas'), 'opções repetidas rejeitadas')
ok(await lanca(() => limparEstrutura({ ...dados(), nome: ' ' }), 'título'), 'formulário sem título rejeitado')

// ── Edição, reordenação, mover entre seções, seção nova ──
f = await carregarFormulario(banco, fid)
const ed = JSON.parse(JSON.stringify(f))
ed.secoes[0].itens[1].opcoes.push('Separado(a)'); ed.secoes[0].itens[1].texto = 'Qual é o estado civil?'
const mover = ed.secoes[1].itens.shift(); ed.secoes[0].itens.push(mover) // "Possui filhos?" vai para a seção 1 (mas "Quantos filhos?" depende dela: ok, continua depois)
ed.secoes[1].itens = ed.secoes[1].itens.filter((i: any) => i)
ed.secoes.splice(1, 0, { id: null, titulo: 'Seção nova', descricao: 'teste', itens: [] })
const r2 = await salvarEstrutura(banco, fid, limparEstrutura(ed))
f = await carregarFormulario(banco, fid)
ok(f.secoes.length === 4 && f.secoes[1]!.titulo === 'Seção nova', 'seção criada e posicionada')
ok(f.secoes[0]!.itens.map(i => i.texto).join('|') === 'Nome|Qual é o estado civil?|Possui filhos?', 'pergunta movida entre seções e ordem persistida')
ok(f.secoes[0]!.itens[1]!.opcoes.includes('Separado(a)'), 'opção adicionada persistida')
ok(r2.relatorio.novasVersoes >= 1 && db.formulario_pergunta_versoes.some(v => v.texto === 'Estado civil'), 'edição de texto/opções gera versão anterior guardada')
ok(f.secoes.flatMap(s => s.itens).length === 8 && r2.relatorio.criadas === 0, 'nenhuma pergunta duplicada no banco ao editar')

// ── Duplicar ──
const copiaId = await duplicarFormulario(banco, fid)
const copia = await carregarFormulario(banco, copiaId)
const idsOrig = new Set(f.secoes.flatMap(s => s.itens.map(i => i.pergunta_id)))
ok(copia.nome === 'Dados familiares (cópia)' && copia.secoes.flatMap(s => s.itens).every(i => !idsOrig.has(i.pergunta_id)), 'duplicar formulário copia as perguntas (ids novos)')
const filhosCopia = copia.secoes.flatMap(s => s.itens).find(i => i.texto === 'Possui filhos?')!
const quantosCopia = copia.secoes.flatMap(s => s.itens).find(i => i.texto === 'Quantos filhos?')!
ok(quantosCopia.mostrar_se?.regras[0]?.pergunta_id === filhosCopia.pergunta_id, 'duplicar refaz a lógica condicional apontando para a cópia')
const estCivilCopia = copia.secoes.flatMap(s => s.itens).find(i => i.texto === 'Qual é o estado civil?')!
ok(estCivilCopia.opcoes.length === 6, 'duplicar mantém as opções')
f = await carregarFormulario(banco, fid)
ok(f.secoes.flatMap(s => s.itens).find(i => i.texto === 'Possui filhos?')!.pergunta_id === pid('Possui filhos?'), 'original intacto após duplicar')

// ── Preenchimento + persistência ──
const pub = await estruturaPublica(banco, fid)
const nomeId = pid('Nome'), filhosId = pid('Possui filhos?'), quantosId = pid('Quantos filhos?'), patrId = pid('Possui patrimônio?'), imoveisId = pid('Possui imóveis?')
ok(await lanca(() => validarRespostasPublicas(pub.secoes, { [filhosId]: 'Sim' }), '"Nome" é obrigatória') , 'obrigatória vazia bloqueia o envio')
ok(await lanca(() => validarRespostasPublicas(pub.secoes, { [nomeId]: 'Maria' }), 'Possui filhos?'), 'obrigatória de outra pergunta (Possui filhos?) também bloqueia')
const naoFilhos = validarRespostasPublicas(pub.secoes, { [nomeId]: 'Maria', [filhosId]: 'Não', [quantosId]: '4', [patrId]: 'Não', [imoveisId]: 'Sim' })
ok(!naoFilhos.validas.has(quantosId) && !naoFilhos.validas.has(imoveisId), 'respostas de perguntas escondidas são descartadas (Não => sem quantidade/imóveis)')
const simFilhos = validarRespostasPublicas(pub.secoes, { [nomeId]: 'Maria', [filhosId]: 'Sim', [quantosId]: '2', [patrId]: 'Sim', [imoveisId]: 'Sim' })
ok(simFilhos.validas.get(quantosId) === '2' && simFilhos.validas.get(imoveisId) === 'Sim' && simFilhos.linhas.every(l => l.secao_titulo && l.pergunta_texto), 'Sim => quantidade e patrimônio entram; snapshot leva texto e seção')
ok(await lanca(() => validarRespostasPublicas(pub.secoes, { [nomeId]: 'Maria', [filhosId]: 'Talvez' })), 'valor fora das opções (sim/não) rejeitado')
ok(await lanca(() => validarRespostasPublicas(pub.secoes, { [nomeId]: 'Maria', [filhosId]: 'Sim', [quantosId]: 'abc' })), 'número inválido rejeitado')
// gravar como o endpoint faz e ler na ficha
for (const [pergunta_id, resposta] of simFilhos.validas) db.contato_respostas.push({ contato_id: 1, pergunta_id, resposta, updated_at: new Date().toISOString() })
let ficha = await montarFicha(banco, 1, null)
const todas = ficha.flatMap(s => s.perguntas)
ok(todas.find(p => p.pergunta_id === nomeId)?.resposta === 'Maria' && todas.find(p => p.pergunta_id === quantosId)?.resposta === '2', 'ficha do cliente apresenta as respostas (lidas de contato_respostas, sem cópia)')
ok(ficha.some(s => s.nome.includes('Dados pessoais')) && ficha.some(s => s.nome.includes('Patrimônio')), 'ficha usa as seções do formulário')
ok(db.contato_respostas.length === simFilhos.validas.size, 'nenhuma duplicação de dados para exibir na ficha')
const fichaDemanda = await montarFicha(banco, 1, 10)
ok(!fichaDemanda.flatMap(s => s.perguntas).some(p => p.pergunta_id === nomeId), 'contexto: perguntas do formulário de cliente NÃO aparecem na ficha da demanda')

// ── Remover / desativar sem perder histórico ──
const rem = JSON.parse(JSON.stringify(await carregarFormulario(banco, fid)))
rem.secoes[0].itens = rem.secoes[0].itens.filter((i: any) => i.texto !== 'Qual é o estado civil?') // sem respostas => exclui de vez
rem.secoes[2].itens = rem.secoes[2].itens.filter((i: any) => i.texto !== 'Quantos filhos?') // com resposta => arquiva
const r3 = await salvarEstrutura(banco, fid, limparEstrutura(rem))
ok(r3.relatorio.excluidas === 1 && r3.relatorio.arquivadas === 1, 'remover: pergunta sem resposta é excluída; com resposta é arquivada')
ok(db.contato_respostas.some(r => r.pergunta_id === quantosId && r.resposta === '2'), 'resposta antiga preservada após remover a pergunta do formulário')
ficha = await montarFicha(banco, 1, null)
const orfa = ficha.find(s => s.nome.startsWith('Fora do formulário'))
ok(!!orfa && orfa.perguntas.some(p => p.pergunta_id === quantosId && p.resposta === '2' && p.texto === 'Quantos filhos?'), 'ficha mostra a resposta antiga em "Fora do formulário" (histórico)')
ok(db.formulario_perguntas.find(p => p.id === quantosId)?.arquivada === true, 'pergunta respondida fica arquivada, não apagada')

// ── Trocar o tipo de pergunta respondida: cria nova, preserva a antiga ──
const tip = JSON.parse(JSON.stringify(await carregarFormulario(banco, fid)))
const nomeItem = tip.secoes[0].itens.find((i: any) => i.texto === 'Nome'); nomeItem.tipo = 'texto_longo'
const r4 = await salvarEstrutura(banco, fid, limparEstrutura(tip))
const f4 = await carregarFormulario(banco, fid)
const novoNome = f4.secoes[0]!.itens.find(i => i.texto === 'Nome')!
ok(r4.relatorio.novasVersoes >= 1 && novoNome.pergunta_id !== nomeId && novoNome.tipo === 'texto_longo', 'trocar o tipo de pergunta respondida gera NOVA pergunta')
ok(db.contato_respostas.some(r => r.pergunta_id === nomeId && r.resposta === 'Maria') && db.formulario_perguntas.find(p => p.id === nomeId)!.tipo === 'texto_curto', 'pergunta antiga e sua resposta permanecem intactas')

// ── Contexto ──
const paraDemanda = JSON.parse(JSON.stringify(f4)); paraDemanda.contexto = 'demanda'
ok(await lanca(() => salvarEstrutura(banco, fid, limparEstrutura(paraDemanda)), 'já tem respostas'), 'não muda o contexto (cliente→demanda) de formulário que já tem respostas')
const { id: fd } = await salvarEstrutura(banco, null, limparEstrutura({ nome: 'Pacto antenupcial', contexto: 'demanda', procedimentos: [], secoes: [{ titulo: 'Bens', itens: [P(-1, 'Regime de bens desejado', 'lista_suspensa', { opcoes: ['Comunhão parcial', 'Separação total', 'Participação final nos aquestos']})] }] }))
ok(db.formulario_perguntas.find(p => p.texto === 'Regime de bens desejado')?.escopo === 'demanda', 'contexto demanda => escopo demanda')
const fichaD = await montarFicha(banco, 1, 10)
ok(fichaD.flatMap(s => s.perguntas).some(p => p.texto === 'Regime de bens desejado') && !fichaD.flatMap(s => s.perguntas).some(p => p.texto === 'Nome'), 'ficha da demanda mostra só o formulário de demanda')
const semResp = await estruturaPublica(banco, fd)
ok(semResp.secoes[0]!.itens[0]!.tipo === 'lista_suspensa' && validarRespostasPublicas(semResp.secoes, { [semResp.secoes[0]!.itens[0]!.pergunta_id]: 'Separação total' }).validas.size === 1, 'lista suspensa: preenche e valida como seleção única')
ok(await lanca(() => validarRespostasPublicas(semResp.secoes, { [semResp.secoes[0]!.itens[0]!.pergunta_id]: 'Outra' })), 'lista suspensa rejeita valor fora das opções')

// ── Checklist interno não vai ao cliente ──
const { id: fc } = await salvarEstrutura(banco, null, limparEstrutura({ nome: 'X', contexto: 'consulta', secoes: [{ titulo: 'S', itens: [P(-1, 'Docs recebidos', 'checklist', { opcoes: ['RG', 'CPF'], obrigatoria: true }), P(-2, 'Resumo', 'texto_curto')] }] }))
const pc = await estruturaPublica(banco, fc)
ok(pc.secoes[0]!.itens.length === 1 && pc.secoes[0]!.itens[0]!.texto === 'Resumo', 'checklist interno não aparece no preenchimento do cliente')

// ── Excluir formulário preserva respostas ──
const ex = await excluirFormulario(banco, fid)
ok(ex.arquivadas >= 1 && db.contato_respostas.some(r => r.pergunta_id === quantosId), 'excluir formulário: perguntas respondidas arquivadas e respostas preservadas')

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTODOS OS TESTES DO CONSTRUTOR PASSARAM')
process.exit(falhas ? 1 : 0)
