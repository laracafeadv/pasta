import { alerta, resumoIniciais, prazosProximos, paraHoje, seloIniciais, filtrarIniciais, ordenarColuna, docsSugeridos, adicionarDoc, limparChecklist, cnjValido, formataCNJ, erroInicial, proximaEtapa, interpretarInicial, ETAPAS_INI, checklistPendente } from '../../shared/utils/iniciaisSecretaria'
let falhas = 0
const eq = (n: string, a: unknown, b: unknown) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${ok ? '' : ' → ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)}`); if (!ok) falhas++ }
const hoje = '2026-10-01'
const I = (o: any) => ({ id: 1, cliente: 'Fulana', acao: null, area: 'Família', parte_contraria: null, meta_protocolo: null, prazo_fatal: null, prazo_fatal_tipo: null, prioridade: 'normal', etapa: 'produzir', etapa_desde: '', checklist: [], obs: null, processo_numero: null, protocolo_data: null, ...o }) as any

eq('6 etapas na ordem pedida', ETAPAS_INI.map(e => e[0]), ['aguardando', 'produzir', 'redacao', 'revisao', 'pronta', 'protocolada'])
eq('avançar: pronta → protocolada; protocolada não avança', [proximaEtapa('aguardando'), proximaEtapa('pronta'), proximaEtapa('protocolada')], ['produzir', 'protocolada', null])
eq('sem datas: sem alerta de prazo', alerta(I({}), hoje)?.nivel, 'sem')
eq('protocolada nunca alerta', alerta(I({ etapa: 'protocolada', meta_protocolo: '2026-01-01' }), hoje), null)
eq('meta vencida = atrasada (-2)', [alerta(I({ meta_protocolo: '2026-09-29' }), hoje)?.nivel, alerta(I({ meta_protocolo: '2026-09-29' }), hoje)?.dias], ['atrasada', -2])
eq('vence hoje não é atrasada: vencendo (0)', [alerta(I({ meta_protocolo: hoje }), hoje)?.nivel, alerta(I({ meta_protocolo: hoje }), hoje)?.dias], ['vencendo', 0])
eq('7 dias ainda é vencendo; 8 é ok', [alerta(I({ meta_protocolo: '2026-10-08' }), hoje)?.nivel, alerta(I({ meta_protocolo: '2026-10-09' }), hoje)?.nivel], ['vencendo', 'ok'])
eq('vale a data mais próxima; empate = fatal', [alerta(I({ meta_protocolo: '2026-10-20', prazo_fatal: '2026-10-05' }), hoje)?.tipo, alerta(I({ meta_protocolo: '2026-10-05', prazo_fatal: '2026-10-05' }), hoje)?.tipo], ['fatal', 'fatal'])
const lista = [
  I({ id: 1, cliente: 'Ana', meta_protocolo: '2026-09-28' }),
  I({ id: 2, cliente: 'Bia', etapa: 'redacao', prazo_fatal: '2026-10-03', prazo_fatal_tipo: 'prescricao', meta_protocolo: '2026-10-02' }),
  I({ id: 3, cliente: 'Cris', etapa: 'aguardando', meta_protocolo: '2026-10-07' }),
  I({ id: 4, cliente: 'Dani', etapa: 'revisao', meta_protocolo: '2026-12-01', prioridade: 'alta' }),
  I({ id: 5, cliente: 'Eva', etapa: 'protocolada', meta_protocolo: '2026-09-01', protocolo_data: '2026-09-02', processo_numero: '0000123-45.2026.8.05.0001' }),
  I({ id: 6, cliente: 'Flávia', etapa: 'pronta' }),
]
eq('resumo: andamento, atrasadas, vencendo em 7 dias', resumoIniciais(lista, hoje), { andamento: 5, atrasadas: 1, vencendo: 2 })
const pz = prazosProximos(lista, hoje)
eq('faixa 7 dias: vencida primeiro, depois por data (meta e fatal separadas)', pz.map(p => `${p.cliente}:${p.tipo}:${p.data}:${p.atrasado ? 'A' : ''}`), ['Ana:meta:2026-09-28:A', 'Bia:meta:2026-10-02:', 'Bia:fatal:2026-10-03:', 'Cris:meta:2026-10-07:'])
eq('Hoje: atrasadas ou em até 2 dias (Ana e Bia), ordem por urgência', paraHoje(lista, hoje).map(x => x.i.cliente), ['Ana', 'Bia'])
eq('selo = nº de iniciais no Hoje', seloIniciais(lista, hoje), 2)
eq('protocolada não vai para o Hoje nem o selo', seloIniciais([I({ etapa: 'protocolada', meta_protocolo: '2020-01-01' })], hoje), 0)
eq('busca sem acento e por processo; filtro por área', [filtrarIniciais(lista, 'flavia', '').length, filtrarIniciais(lista, '0000123', '').map(i => i.id), filtrarIniciais(lista.map(i => ({ ...i, area: i.id === 1 ? 'Sucessões' : 'Família' })), '', 'Sucessões').map(i => i.id)], [1, [5], [1]])
eq('coluna: data mais próxima, depois prioridade', ordenarColuna([I({ id: 1, cliente: 'A', meta_protocolo: '2026-11-01' }), I({ id: 2, cliente: 'B', meta_protocolo: '2026-11-01', prioridade: 'alta' }), I({ id: 3, cliente: 'C', meta_protocolo: '2026-10-10' })], 'produzir', hoje).map(i => i.id), [3, 2, 1])
eq('coluna protocoladas: mais recente primeiro', ordenarColuna([I({ id: 1, etapa: 'protocolada', protocolo_data: '2026-09-01' }), I({ id: 2, etapa: 'protocolada', protocolo_data: '2026-09-20' })], 'protocolada', hoje).map(i => i.id), [2, 1])

// checklist
const prev = docsSugeridos('Previdenciário', [])
eq('previdenciário sugere CTPS, CNIS e PPP', ['CTPS', 'CNIS', 'PPP'].every(d => prev.includes(d)), true)
const cl = adicionarDoc(adicionarDoc([], 'CTPS'), 'ctps')
eq('não repete documento (sem acento/caixa)', cl.length, 1)
eq('sugestões já no checklist somem', docsSugeridos('Previdenciário', cl).includes('CTPS'), false)
eq('checklist: limpa, sem repetido, ok booleano, máx 40', [limparChecklist([{ texto: ' CNIS ', ok: 1 }, { texto: 'cnis' }, { texto: '' }, 5]).map(c => [c.texto, c.ok]), limparChecklist(Array.from({ length: 60 }, (_, i) => ({ texto: 'd' + i }))).length], [[['CNIS', true]], 40])
eq('pendentes', checklistPendente(I({ checklist: [{ id: 'a', texto: 'x', ok: true }, { id: 'b', texto: 'y', ok: false }] })).map(c => c.id), ['b'])

// CNJ
const cnj = '0000123-45.2026.8.05.0001'
const dv = (() => { for (let d = 0; d < 100; d++) { const n = `0000123-${String(d).padStart(2, '0')}.2026.8.05.0001`; if (cnjValido(n)) return n } return '' })()
eq('CNJ: só um dígito verificador fecha o módulo 97', [cnjValido(dv), cnjValido(dv.replace('0001', '0002')), cnjValido('123')], [true, false, false])
eq('CNJ: formata 20 dígitos', formataCNJ(dv.replace(/\D/g, '')), dv)
void cnj

// validações da ficha
eq('ficha sem cliente', erroInicial(I({ cliente: ' ' })), 'Informe o cliente.')
eq('meta depois do prazo fatal recusada', /depois do prazo fatal/.test(erroInicial(I({ meta_protocolo: '2026-11-01', prazo_fatal: '2026-10-01' }))), true)
eq('protocolada exige data; processo inválido recusado', [/data do protocolo/.test(erroInicial(I({ etapa: 'protocolada' }))), /padrão CNJ/.test(erroInicial(I({ etapa: 'protocolada', protocolo_data: hoje, processo_numero: '123' }))), erroInicial(I({ etapa: 'protocolada', protocolo_data: hoje, processo_numero: dv }))], [true, true, ''])

// campo "O que você precisa?"
const L2 = [I({ id: 1, cliente: 'João Pedro Santos', acao: 'Aposentadoria por idade', area: 'Previdenciário', meta_protocolo: '2026-09-30', checklist: [{ id: 'c1', texto: 'CTPS', ok: false }, { id: 'c2', texto: 'CNIS', ok: false }] }), I({ id: 2, cliente: 'Maria Souza', etapa: 'redacao', meta_protocolo: '2026-10-02' }), I({ id: 3, cliente: 'João Carlos', meta_protocolo: '2026-12-10' })]
eq('texto sem "inicial" não é com o campo das iniciais', interpretarInicial('me lembra de ligar para Maria Souza amanhã', hoje, L2), null)
let p = interpretarInicial('quais iniciais estão atrasadas?', hoje, L2)!
eq('consulta: iniciais atrasadas', [p.op, p.itens!.map(x => x.id)], ['consulta', [1]])
p = interpretarInicial('iniciais vencendo esta semana', hoje, L2)!
eq('consulta: vencendo em 7 dias inclui atrasada', p.itens!.map(x => x.id), [1, 2])
p = interpretarInicial('inicial do João Pedro: falta PPP', hoje, L2)!
eq('falta documento: inicial certa e documento', [p.op, p.inicial_id, p.doc], ['doc_pendente', 1, 'PPP'])
p = interpretarInicial('recebi o CNIS da inicial da Maria Souza', hoje, L2)!
eq('recebi documento sem item = pede para escolher', [p.op, p.inicial_id, p.doc ?? null], ['doc_recebido', 2, null])
p = interpretarInicial('chegou a CTPS na inicial do João Pedro Santos', hoje, L2)!
eq('recebi documento: marca o item do checklist', [p.op, p.inicial_id, p.doc], ['doc_recebido', 1, 'c1'])
p = interpretarInicial('avançar inicial da Maria Souza', hoje, L2)!
eq('avançar', [p.op, p.inicial_id], ['avancar', 2])
p = interpretarInicial('avançar inicial do João', hoje, L2)!
eq('nome ambíguo: dois candidatos, não adivinha', [p.op, p.candidatos!.length], ['avancar', 2])
p = interpretarInicial('nova inicial de divórcio para Ana Lima, meta dia 20/10', hoje, L2)!
eq('nova inicial: cliente, ação e meta', [p.op, p.cliente, p.acao, p.meta], ['nova', 'Ana Lima', 'Divórcio litigioso', '2026-10-20'])
p = interpretarInicial('avançar inicial do Zé', hoje, L2)!
eq('inicial inexistente: avisa, não inventa', [p.op, p.itens!.length, !!p.aviso], ['consulta', 0, true])
console.log(falhas ? `\n${falhas} FALHA(S)` : 'Todos os testes passaram'); process.exit(falhas ? 1 : 0)
