import { agruparNoticias, areasPresentes, consultaAssunto, idsParaApagar, limparIdeias, linkSeguro, noticiasValidas, revisarProvimento205, type Noticia } from '../../shared/utils/conteudoSecretaria'
let falhas = 0
const eq = (n: string, a: unknown, b: unknown) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${ok ? '' : ' → ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)}`); if (!ok) falhas++ }
const hoje = '2026-10-01'
const N = (id: string, dia: string, o: any = {}): Noticia => ({ id, titulo: 'T ' + id, resumo: 'r', fonte: 'STJ', link: 'https://exemplo.gov.br/' + id, area: 'Família', dia, ...o })
const l = [N('a', '2026-10-01'), N('b', '2026-09-30'), N('c', '2026-09-21'), N('d', '2026-09-20'), N('e', '2026-10-01', { link: 'javascript:alert(1)' }), N('f', '2026-10-01', { link: 'https://exemplo.gov.br/a' }), N('g', '2026-10-01', { titulo: ' ' }), N('h', '2026-10-05'), N('i', 'ontem', {}), N('j', '2026-10-01', { area: 'INSS' })]
eq('janela de 10 dias: a e b e c (21/09) ficam; d (20/09) sai; link inseguro, repetido, sem título, futuro e sem dia saem', noticiasValidas(l, hoje).map(n => n.id).sort(), ['a', 'b', 'c', 'j'])
eq('apagar: mais velhas que 10 dias e sem dia válido', idsParaApagar(l, hoje).sort(), ['d', 'i'])
eq('agrupa por dia, mais recente primeiro, com rótulo', agruparNoticias(l, hoje).map(g => [g.dia, g.rotulo, g.itens.length]), [['2026-10-01', 'Hoje', 2], ['2026-09-30', 'Ontem', 1], ['2026-09-21', '', 1]])
eq('filtro por área', agruparNoticias(l, hoje, 'INSS').map(g => g.itens.map(n => n.id)), [['j']])
eq('áreas presentes', areasPresentes(l, hoje), ['Família', 'INSS'])
eq('link seguro só http(s)', [linkSeguro('https://a.com/x'), linkSeguro('javascript:alert(1)'), linkSeguro('data:text/html,x'), linkSeguro('')], ['https://a.com/x', '', '', ''])
const rv = (t: string) => revisarProvimento205(t).map(a => a.regra.split(' ')[0])
eq('valores: R$ e "por apenas"', [rv('Consulta por R$ 200').length, rv('por apenas 99 reais').length], [1, 1])
eq('promessa de resultado', rv('Causa ganha, resultado garantido!').length, 1)
eq('captação: contrate/agende', rv('Agende sua consulta agora').length, 1)
eq('gratuidade/desconto', rv('Primeira consulta grátis com desconto').length, 1)
eq('texto informativo passa limpo', revisarProvimento205('A Terceira Turma do STJ decidiu que a pensão alimentícia pode ser revista quando houver mudança na capacidade financeira de quem paga.'), [])
eq('não confunde "garantia" de direitos com promessa? marca para revisar (alerta, não bloqueio)', revisarProvimento205('A Constituição garante o direito à herança').length, 1)
eq('trecho devolvido', revisarProvimento205('Hoje: R$ 500 de entrada')[0]!.trecho.toLowerCase().includes('r$'), true)
eq('ideias: limpa, limita e descarta vazias', [limparIdeias([{ titulo: ' A ', formato: 'Reels', gancho: 'g', roteiro: 'x'.repeat(5000) }, {}, 7]).length, limparIdeias([{ roteiro: 'x'.repeat(5000) }])[0]!.roteiro.length, limparIdeias('x')], [1, 3000, []])
eq('consulta de assunto neutraliza aspas e operadores', [consultaAssunto('Relatório "de" conteúdo'), consultaAssunto('  '), consultaAssunto('a) OR (b')], ['subject:(Relatório de conteúdo)', '', 'subject:(a OR b)'])
console.log(falhas ? `\n${falhas} FALHA(S)` : 'Todos os testes passaram'); process.exit(falhas ? 1 : 0)
