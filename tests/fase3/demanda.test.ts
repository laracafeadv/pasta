import { banco, db, zerar } from '../formularios/fake-db'
import { limparEstrutura, salvarEstrutura, montarFicha } from '../../server/utils/formularioEstrutura'
import { limparDemanda, sincronizarAtuacao } from '../../server/utils/demandas'
import { procedimentoCasa } from '../../shared/data/checklist'

;(globalThis as any).createError = (o: any) => Object.assign(new Error(o.message), o)
let falhas = 0
const ok = (c: boolean, nome: string) => { console.log(`${c ? 'PASS' : 'FAIL'} ${nome}`); if (!c) falhas++ }
const lanca = (fn: () => any, trecho?: string) => { try { fn(); return false } catch (e: any) { return trecho ? String(e.message).includes(trecho) : true } }
const ev = {} as any

zerar()
db.contatos = [{ id: 1, nome: 'Maria' }]
db.contato_respostas = []; db.caso_respostas = []; db.processos = []; db.atividades = []
const P = (pid: number, texto: string, tipo = 'texto_curto', extra: any = {}) => ({ pergunta_id: pid, texto, tipo, opcoes: [], ...extra })
const form = (nome: string, procedimentos: string[], itens: any[], contexto = 'demanda') => salvarEstrutura(banco, null, limparEstrutura({ nome, contexto, procedimentos, secoes: [{ titulo: nome, itens }] }))

// Formulários: um geral (todas as demandas) e um por serviço
await form('Dados da consulta', [], [P(-1, 'O que o cliente trouxe', 'texto_longo')])
await form('Pacto antenupcial', ['pacto-antenupcial/*'], [P(-1, 'Regime de bens desejado', 'lista_suspensa', { opcoes: ['Comunhão parcial', 'Separação total'] }), P(-2, 'Haverá bens de família a preservar?', 'sim_nao')])
await form('Inventário', ['inventario/*'], [P(-1, 'Data do falecimento', 'data'), P(-2, 'Há testamento?', 'sim_nao')])
await form('Divórcio judicial', ['divorcio/judicial'], [P(-1, 'Há filhos menores?', 'sim_nao')])
await form('Divórcio', ['divorcio/*'], [P(-1, 'Data da separação de fato', 'data')])
await form('Cliente', [], [P(-1, 'Profissão')], 'cliente')

const dem = (id: number, titulo: string, tipo: string, procedimento: string | null) => db.casos.push({ id, contato_id: 1, titulo, tipo, procedimento, status: 'ativo' })
db.casos = []
dem(10, 'Pacto antenupcial — Maria e João', 'documental', 'pacto-antenupcial/padrao')
dem(11, 'Inventário — Roberto', 'judicial', 'inventario/judicial')
dem(12, 'Divórcio consensual — Maria', 'extrajudicial', 'divorcio/extrajudicial')
dem(13, 'Divórcio litigioso — Ana', 'judicial', 'divorcio/judicial')
dem(14, 'Consulta — sem serviço definido', 'consultivo', null)

const perguntasDe = async (casoId: number) => (await montarFicha(banco, 1, casoId)).flatMap(s => s.perguntas.map(p => p.texto))
const pacto = await perguntasDe(10), inv = await perguntasDe(11), divExtra = await perguntasDe(12), divJud = await perguntasDe(13), semServico = await perguntasDe(14)
ok(pacto.includes('Regime de bens desejado') && pacto.includes('O que o cliente trouxe') && !pacto.some(t => /falecimento|testamento|filhos menores|separação de fato/.test(t)), 'pacto antenupcial: vê as próprias perguntas + as gerais, nada de inventário/divórcio')
ok(inv.includes('Data do falecimento') && !inv.includes('Regime de bens desejado') && !inv.includes('Há filhos menores?'), 'inventário: perguntas próprias, sem as de pacto/divórcio')
ok(divExtra.includes('Data da separação de fato') && !divExtra.includes('Há filhos menores?'), 'divórcio extrajudicial: recebe o formulário do serviço, mas não o "só judicial"')
ok(divJud.includes('Data da separação de fato') && divJud.includes('Há filhos menores?'), 'divórcio judicial: recebe as duas (serviço inteiro + só judicial)')
ok(semServico.join() === 'O que o cliente trouxe', 'demanda sem serviço definido: só as perguntas gerais')
ok(!(await montarFicha(banco, 1, null)).flatMap(s => s.perguntas).some(p => ['Regime de bens desejado', 'Data do falecimento', 'O que o cliente trouxe'].includes(p.texto)), 'ficha do cliente não mostra perguntas de demanda')

// Respostas por demanda: nada vaza entre demandas da mesma pessoa
const id = (t: string) => db.formulario_perguntas.find((p: any) => p.texto === t).id
db.caso_respostas.push({ caso_id: 10, pergunta_id: id('Regime de bens desejado'), resposta: 'Separação total', updated_at: 'x' }, { caso_id: 11, pergunta_id: id('Data do falecimento'), resposta: '2026-01-10', updated_at: 'x' }, { caso_id: 10, pergunta_id: id('O que o cliente trouxe'), resposta: 'Quer pacto', updated_at: 'x' }, { caso_id: 11, pergunta_id: id('O que o cliente trouxe'), resposta: 'Inventário do pai', updated_at: 'x' })
const respDe = async (c: number) => Object.fromEntries((await montarFicha(banco, 1, c)).flatMap(s => s.perguntas).filter(p => p.resposta != null).map(p => [p.texto, p.resposta]))
const rp = await respDe(10), ri = await respDe(11)
ok(rp['Regime de bens desejado'] === 'Separação total' && rp['O que o cliente trouxe'] === 'Quer pacto' && !('Data do falecimento' in rp), 'respostas do pacto ficam no pacto')
ok(ri['Data do falecimento'] === '2026-01-10' && ri['O que o cliente trouxe'] === 'Inventário do pai' && !('Regime de bens desejado' in ri), 'respostas do inventário ficam no inventário (mesma pergunta geral, resposta própria por demanda)')

// Se o serviço da demanda muda, a resposta já dada NÃO some (histórico)
db.casos.find((c: any) => c.id === 10).procedimento = 'testamento/padrao'
const aposTroca = await montarFicha(banco, 1, 10)
ok(aposTroca.flatMap(s => s.perguntas).some(p => p.texto === 'Regime de bens desejado' && p.resposta === 'Separação total' && p.fora_do_formulario), 'trocar o serviço da demanda mantém a resposta antiga visível em "Fora do formulário"')
db.casos.find((c: any) => c.id === 10).procedimento = 'pacto-antenupcial/padrao'

// Wildcard
ok(procedimentoCasa([], null) && !procedimentoCasa(['divorcio/*'], null) && procedimentoCasa(['divorcio/*'], 'divorcio/judicial') && !procedimentoCasa(['divorcio/*'], 'dissolucao-ue/judicial') && procedimentoCasa(['inventario/judicial'], 'inventario/judicial') && !procedimentoCasa(['divorcio/judicial'], 'divorcio/extrajudicial'), 'procedimentoCasa: vazio=todas; serviço/*; variante exata')
ok(lanca(() => limparEstrutura({ nome: 'x', contexto: 'demanda', procedimentos: ['nao-existe/*'], secoes: [{ titulo: 'S', itens: [] }] })) === false, 'serviço inexistente em procedimentos é ignorado (não quebra)')

// Análise profissional: campos próprios da demanda
const d = limparDemanda({ fatos: ' Casal com bens anteriores ', analise: 'Art. 1.639 CC…', estrategia: 'Pacto por escritura pública', riscos: 'Sem pacto, comunhão parcial', conclusao: 'Recomendado', decisao: 'ressalvas', titulo: 'x' })
ok(d.fatos === 'Casal com bens anteriores' && d.analise && d.estrategia && d.riscos && d.conclusao && d.decisao === 'ressalvas', 'análise profissional: fatos, fundamentos, estratégia, riscos, conclusão e decisão são campos da demanda (independem de formulário)')
ok(lanca(() => limparDemanda({ decisao: 'talvez' }), 'Decisão') && lanca(() => limparDemanda({ tipo: 'inexistente' }), 'Tipo') && !lanca(() => limparDemanda({ tipo: 'documental' })), 'validações: decisão e tipo (documental aceito)')
ok(lanca(() => limparDemanda({ responsavel_id: 'nao-uuid' }), 'Responsável') && limparDemanda({ responsavel_id: '' }).responsavel_id === null && limparDemanda({ responsavel_id: 'e015740f-6b21-4286-a41a-00ad09f0e334' }).responsavel_id, 'responsável: uuid válido, vazio vira nulo, lixo é rejeitado')
ok(limparDemanda({ fatos: 'x'.repeat(9000) }).fatos.length === 8000, 'análise: limite de tamanho')

// Evolução da atuação: documental/consultiva → extrajudicial → judicial (com histórico)
db.processos.push({ id: 1, caso_id: 10, natureza: 'extrajudicial' })
await sincronizarAtuacao(banco, 10, ev, null)
ok(db.casos.find((c: any) => c.id === 10).tipo === 'extrajudicial' && db.atividades.some((a: any) => a.caso_id === 10 && /Documental → Extrajudicial/.test(a.texto)), 'pacto documental + procedimento em cartório → extrajudicial, com registro no histórico')
db.processos.push({ id: 2, caso_id: 10, natureza: 'judicial' })
await sincronizarAtuacao(banco, 10, ev, null)
ok(db.casos.find((c: any) => c.id === 10).tipo === 'judicial' && db.atividades.some((a: any) => a.caso_id === 10 && /Extrajudicial → Judicial/.test(a.texto)), 'depois processo judicial → judicial (histórico registrado)')
const n = db.atividades.length
await sincronizarAtuacao(banco, 10, ev, null)
ok(db.atividades.length === n, 'sem mudança, não registra histórico de novo')
dem(15, 'Consulta', 'consultivo', null)
await sincronizarAtuacao(banco, 15, ev, null)
ok(db.casos.find((c: any) => c.id === 15).tipo === 'consultivo', 'demanda consultiva sem processo continua consultiva')

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTODOS OS TESTES DA DEMANDA PASSARAM')
process.exit(falhas ? 1 : 0)
