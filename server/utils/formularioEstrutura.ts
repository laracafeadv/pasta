import {
  CONTEXTOS, escopoDoContexto, calcularVisibilidade, normalizarCondicao, tipoComOpcoes, tipoInterno, validarCondicoes,
  TIPOS_PERGUNTA, type Condicao, type PerguntaForm, type SecaoForm, type TipoPergunta, type Valor,
} from '../../shared/data/formulario'
import { PROCEDIMENTOS, SERVICOS_IDS, procedimentoCasa } from '../../shared/data/checklist'
import { normalizarRespostaCliente } from './formularioPerguntas'

/**
 * Persistência do construtor de formulários. Evolui a arquitetura existente:
 * formulario_perguntas (banco de perguntas) + formulario_itens (posição, obrigatoriedade, condição)
 * + formulario_secoes. O formulário inteiro é salvo de uma vez (estrutura), sem apagar respostas:
 * pergunta removida do formulário só é excluída de fato se nunca foi respondida nem é usada noutro formulário;
 * senão fica arquivada e as respostas continuam visíveis na ficha ("Fora do formulário").
 */
const erro = (statusCode: number, message: string) => createError({ statusCode, message })
const TIPOS_VALIDOS = new Set<string>(TIPOS_PERGUNTA.map(t => t.valor))

export interface EstruturaEntrada {
  nome: string
  descricao: string | null
  contexto: keyof typeof CONTEXTOS
  procedimentos: string[]
  ativo: boolean
  situacao: 'rascunho' | 'publicado' | 'arquivado'
  instrucoes: string | null
  finalidade: string | null
  mensagem_final: string | null
  secoes: SecaoForm[]
}

/** Valida e normaliza o corpo do construtor. Lança 400 com mensagem clara em português. */
export function limparEstrutura(body: any): EstruturaEntrada {
  const nome = String(body?.nome ?? '').trim().slice(0, 120)
  if (!nome) throw erro(400, 'Dê um título ao formulário.')
  const contexto = (body?.contexto in CONTEXTOS ? body.contexto : 'cliente') as keyof typeof CONTEXTOS
  const validos = new Set([...PROCEDIMENTOS.map(p => p.valor), ...SERVICOS_IDS.map(id => `${id}/*`)])
  const procedimentos = contexto === 'demanda' && Array.isArray(body?.procedimentos) ? [...new Set<string>(body.procedimentos.map(String).filter((v: string) => validos.has(v)))] : []
  const situacao = (['rascunho', 'publicado', 'arquivado'].includes(body?.situacao) ? body.situacao : body?.ativo === false ? 'arquivado' : 'publicado') as 'rascunho' | 'publicado' | 'arquivado'
  const brutas: any[] = Array.isArray(body?.secoes) ? body.secoes.slice(0, 40) : []
  if (!brutas.length) throw erro(400, 'O formulário precisa de ao menos uma seção.')
  const vistos = new Set<number>()
  let total = 0
  const secoes: SecaoForm[] = brutas.map((s, si) => {
    const itens: PerguntaForm[] = (Array.isArray(s?.itens) ? s.itens : []).map((p: any) => {
      total++
      const texto = String(p?.texto ?? '').trim().slice(0, 300)
      if (!texto) throw erro(400, `Há uma pergunta sem texto na seção ${si + 1}.`)
      const tipo = (TIPOS_VALIDOS.has(p?.tipo) ? p.tipo : 'texto_curto') as TipoPergunta
      let opcoes: string[] = []
      if (tipoComOpcoes(tipo)) {
        opcoes = (Array.isArray(p?.opcoes) ? p.opcoes : []).map((o: unknown) => String(o).trim().slice(0, 120)).filter(Boolean)
        if (new Set(opcoes.map(o => o.toLowerCase())).size !== opcoes.length) throw erro(400, `A pergunta "${texto}" tem opções repetidas.`)
        if (opcoes.length < 2) throw erro(400, `A pergunta "${texto}" precisa de pelo menos 2 opções.`)
        if (opcoes.length > 40) throw erro(400, `A pergunta "${texto}" tem opções demais (máx. 40).`)
      }
      const pid = Number(p?.pergunta_id)
      if (!Number.isInteger(pid) || pid === 0) throw erro(400, 'Pergunta inválida.')
      if (vistos.has(pid)) throw erro(400, 'A mesma pergunta aparece duas vezes no formulário.')
      vistos.add(pid)
      return { pergunta_id: pid, texto, tipo, opcoes, ajuda: String(p?.ajuda ?? '').trim().slice(0, 300) || null, obrigatoria: !tipoInterno(tipo) && !!p?.obrigatoria, mostrar_se: normalizarCondicao(p?.mostrar_se) }
    })
    const id = Number(s?.id)
    return { id: Number.isInteger(id) && id > 0 ? id : null, titulo: String(s?.titulo ?? '').trim().slice(0, 100) || `Seção ${si + 1}`, descricao: String(s?.descricao ?? '').trim().slice(0, 300) || null, mostrar_se: normalizarCondicao(s?.mostrar_se), itens }
  })
  if (total > 300) throw erro(400, 'Formulário grande demais (máx. 300 perguntas).')
  const problema = validarCondicoes(secoes)
  if (problema) throw erro(400, problema)
  return { nome, descricao: String(body?.descricao ?? '').trim().slice(0, 1000) || null, contexto, procedimentos, ativo: body?.ativo !== false, situacao, instrucoes: String(body?.instrucoes ?? '').trim().slice(0, 2000) || null, finalidade: String(body?.finalidade ?? '').trim().slice(0, 500) || null, mensagem_final: String(body?.mensagem_final ?? '').trim().slice(0, 500) || null, secoes }
}

export interface FormularioCarregado extends Omit<EstruturaEntrada, 'secoes'> {
  id: number
  versao: number
  secoes: (SecaoForm & { itens: (PerguntaForm & { respostas: number; usada_em: { id: number; nome: string }[] })[] })[]
}

/** Carrega o formulário completo (seções, perguntas, condições) + quantas respostas cada pergunta já tem. */
export async function carregarFormulario(client: any, id: number): Promise<FormularioCarregado> {
  const { data: f } = await client.from('formularios').select('id, nome, descricao, contexto, procedimentos, ativo, situacao, versao, instrucoes, finalidade, mensagem_final').eq('id', id).maybeSingle()
  if (!f) throw erro(404, 'Formulário não encontrado.')
  const [{ data: secoes }, { data: itens }] = await Promise.all([
    client.from('formulario_secoes').select('id, titulo, descricao, ordem, mostrar_se').eq('formulario_id', id).order('ordem').order('id'),
    client.from('formulario_itens').select('pergunta_id, ordem, obrigatoria, secao_id, mostrar_se, pergunta:formulario_perguntas(id, texto, tipo, opcoes, ajuda, arquivada)').eq('formulario_id', id).order('ordem').order('id'),
  ])
  const ids: number[] = (itens ?? []).map((i: any) => i.pergunta_id)
  const respostas = new Map<number, number>()
  const usos = new Map<number, { id: number; nome: string }[]>()
  if (ids.length) {
    const [a, b, u] = await Promise.all([
      client.from('contato_respostas').select('pergunta_id').in('pergunta_id', ids),
      client.from('caso_respostas').select('pergunta_id').in('pergunta_id', ids),
      client.from('formulario_itens').select('pergunta_id, formulario:formularios(id, nome)').in('pergunta_id', ids).neq('formulario_id', id),
    ])
    for (const r of [...(a.data ?? []), ...(b.data ?? [])]) respostas.set(r.pergunta_id, (respostas.get(r.pergunta_id) ?? 0) + 1)
    for (const r of u.data ?? []) if (r.formulario) usos.set(r.pergunta_id, [...(usos.get(r.pergunta_id) ?? []), r.formulario])
  }
  const lista = (secoes ?? []).length ? secoes : [{ id: null, titulo: 'Seção 1', descricao: null, mostrar_se: null }]
  const porSecao = new Map<number | null, any[]>()
  for (const i of itens ?? []) {
    const chave = lista.some((s: any) => s.id === i.secao_id) ? i.secao_id : (lista[0] as any).id
    porSecao.set(chave, [...(porSecao.get(chave) ?? []), i])
  }
  return {
    id: f.id, nome: f.nome, descricao: f.descricao ?? null, contexto: f.contexto, procedimentos: f.procedimentos ?? [], ativo: f.ativo, situacao: f.situacao ?? (f.ativo ? 'publicado' : 'arquivado'), versao: f.versao ?? 1, instrucoes: f.instrucoes ?? null, finalidade: f.finalidade ?? null, mensagem_final: f.mensagem_final ?? null,
    secoes: lista.map((s: any) => ({
      id: s.id, titulo: s.titulo, descricao: s.descricao ?? null, mostrar_se: normalizarCondicao(s.mostrar_se),
      itens: (porSecao.get(s.id) ?? []).map((i: any) => ({
        pergunta_id: i.pergunta_id, texto: i.pergunta.texto, tipo: i.pergunta.tipo, opcoes: i.pergunta.opcoes ?? [], ajuda: i.pergunta.ajuda ?? null,
        obrigatoria: !!i.obrigatoria, mostrar_se: normalizarCondicao(i.mostrar_se), respostas: respostas.get(i.pergunta_id) ?? 0, usada_em: usos.get(i.pergunta_id) ?? [],
      })),
    })),
  }
}

/** Quantas respostas (ficha do cliente/demanda) uma pergunta tem. */
async function contarRespostas(client: any, perguntaId: number): Promise<number> {
  const [a, b] = await Promise.all([
    client.from('contato_respostas').select('pergunta_id').eq('pergunta_id', perguntaId),
    client.from('caso_respostas').select('pergunta_id').eq('pergunta_id', perguntaId),
  ])
  return (a.data?.length ?? 0) + (b.data?.length ?? 0)
}

export interface RelatorioSalvar { criadas: number; atualizadas: number; novasVersoes: number; removidas: number; arquivadas: number; excluidas: number; remapeamento: Record<number, number> }

/**
 * Salva a estrutura inteira. Ordem pensada para nunca perder resposta:
 *  1) perguntas (cria/atualiza; mudar o TIPO de pergunta já respondida cria uma nova e preserva a antiga);
 *  2) seções; 3) itens (posição/obrigatória/condição); 4) destino das perguntas tiradas do formulário.
 * Se a gravação dos itens falhar, o estado anterior dos itens é restaurado.
 */
export async function salvarEstrutura(client: any, id: number | null, e: EstruturaEntrada): Promise<{ id: number; relatorio: RelatorioSalvar }> {
  const escopo = escopoDoContexto(e.contexto)
  const rel: RelatorioSalvar = { criadas: 0, atualizadas: 0, novasVersoes: 0, removidas: 0, arquivadas: 0, excluidas: 0, remapeamento: {} }

  let formId = id
  let anteriores: any[] = []
  let secoesAnteriores: any[] = []
  if (formId) {
    const { data: existe } = await client.from('formularios').select('id, contexto').eq('id', formId).maybeSingle()
    if (!existe) throw erro(404, 'Formulário não encontrado.')
    if (escopoDoContexto(existe.contexto) !== escopo) {
      // Mudar de "cliente/consulta" para "demanda" (ou o inverso) moveria o lugar das respostas: só com formulário ainda sem respostas.
      const { data: ja } = await client.from('formulario_itens').select('pergunta_id').eq('formulario_id', formId)
      for (const i of ja ?? []) if ((await contarRespostas(client, i.pergunta_id)) > 0) throw erro(409, 'Este formulário já tem respostas guardadas: não dá para mudar o contexto entre cliente/consulta e demanda. Duplique o formulário e ajuste a cópia.')
    }
    const [it, se] = await Promise.all([
      client.from('formulario_itens').select('formulario_id, pergunta_id, ordem, obrigatoria, secao_id, mostrar_se').eq('formulario_id', formId),
      client.from('formulario_secoes').select('id, titulo, descricao, ordem, mostrar_se').eq('formulario_id', formId),
    ])
    anteriores = it.data ?? []
    secoesAnteriores = se.data ?? []
    const { error } = await client.from('formularios').update({ nome: e.nome, descricao: e.descricao, contexto: e.contexto, procedimentos: e.procedimentos, ativo: e.situacao === 'publicado', situacao: e.situacao, instrucoes: e.instrucoes, finalidade: e.finalidade, mensagem_final: e.mensagem_final }).eq('id', formId)
    if (error) throw erro(500, 'Erro ao salvar o formulário.')
  } else {
    const { data, error } = await client.from('formularios').insert({ nome: e.nome, descricao: e.descricao, contexto: e.contexto, procedimentos: e.procedimentos, ativo: e.situacao === 'publicado', situacao: e.situacao, instrucoes: e.instrucoes, finalidade: e.finalidade, mensagem_final: e.mensagem_final }).select('id').single()
    if (error || !data) throw erro(500, 'Erro ao criar o formulário.')
    formId = data.id as number
  }
  const antesIds = new Set<number>(anteriores.map(a => a.pergunta_id))

  // 1) Perguntas
  const reais: Record<number, any> = {}
  const idsExistentes = e.secoes.flatMap(s => s.itens.map(i => i.pergunta_id)).filter(p => p > 0)
  if (idsExistentes.length) {
    const { data } = await client.from('formulario_perguntas').select('id, texto, tipo, opcoes, ajuda, escopo, arquivada').in('id', idsExistentes)
    for (const p of data ?? []) reais[p.id] = p
  }
  const mapa = new Map<number, number>() // id do rascunho/original -> id real
  let ordem = 0
  const linhasPergunta: { secao: string; item: PerguntaForm }[] = []
  for (const s of e.secoes) for (const item of s.itens) linhasPergunta.push({ secao: s.titulo, item })
  for (const { secao, item } of linhasPergunta) {
    ordem++
    const base = { texto: item.texto, tipo: item.tipo, opcoes: item.opcoes, ajuda: item.ajuda, secao, ordem, escopo, procedimentos: e.procedimentos, mostrar_se: null, arquivada: false }
    if (item.pergunta_id > 0) {
      const atual = reais[item.pergunta_id]
      if (!atual) throw erro(400, `A pergunta "${item.texto}" não existe mais. Recarregue o formulário.`)
      if (atual.escopo !== escopo) {
        const { data: usos } = await client.from('formulario_itens').select('formulario_id').eq('pergunta_id', item.pergunta_id).neq('formulario_id', formId)
        if (usos?.length) throw erro(409, `A pergunta "${item.texto}" é usada em outro formulário de contexto diferente e não pode ser reaproveitada aqui.`)
      }
      if (atual.tipo !== item.tipo && (await contarRespostas(client, item.pergunta_id)) > 0) {
        // Trocar o tipo de pergunta respondida deixaria respostas antigas sem sentido: nasce uma nova pergunta.
        const { data: nova, error } = await client.from('formulario_perguntas').insert(base).select('id').single()
        if (error || !nova) throw erro(500, 'Erro ao salvar a pergunta.')
        mapa.set(item.pergunta_id, nova.id); rel.criadas++; rel.novasVersoes++
        continue
      }
      const mudou = atual.texto !== item.texto || atual.tipo !== item.tipo || JSON.stringify(atual.opcoes ?? []) !== JSON.stringify(item.opcoes) || (atual.ajuda ?? null) !== item.ajuda
      const { error } = await client.from('formulario_perguntas').update(base).eq('id', item.pergunta_id)
      if (error) throw erro(500, 'Erro ao salvar a pergunta.')
      mapa.set(item.pergunta_id, item.pergunta_id); rel.atualizadas++
      if (mudou) rel.novasVersoes++
    } else {
      const { data: nova, error } = await client.from('formulario_perguntas').insert(base).select('id').single()
      if (error || !nova) throw erro(500, 'Erro ao salvar a pergunta.')
      mapa.set(item.pergunta_id, nova.id); rel.criadas++
    }
  }
  for (const [de, para] of mapa) if (de !== para || de < 0) rel.remapeamento[de] = para
  const traduzir = (c: Condicao | null): Condicao | null => c && { ...c, regras: c.regras.map(r => ({ ...r, pergunta_id: mapa.get(r.pergunta_id) ?? r.pergunta_id })) }

  // 2) Seções: mantém as existentes (mesmo id), cria as novas, remove as que saíram
  const idsMantidos = new Set(e.secoes.map(s => s.id).filter((x): x is number => !!x && secoesAnteriores.some(a => a.id === x)))
  await client.from('formulario_itens').delete().eq('formulario_id', formId)
  const remover = secoesAnteriores.filter(s => !idsMantidos.has(s.id)).map(s => s.id)
  for (const sid of remover) await client.from('formulario_secoes').delete().eq('id', sid)
  const secaoIds: number[] = []
  for (let i = 0; i < e.secoes.length; i++) {
    const s = e.secoes[i]!
    const campos = { titulo: s.titulo, descricao: s.descricao, ordem: i + 1, mostrar_se: traduzir(s.mostrar_se) }
    if (s.id && idsMantidos.has(s.id)) {
      await client.from('formulario_secoes').update(campos).eq('id', s.id)
      secaoIds.push(s.id)
    } else {
      const { data, error } = await client.from('formulario_secoes').insert({ formulario_id: formId, ...campos }).select('id').single()
      if (error || !data) throw erro(500, 'Erro ao salvar as seções.')
      secaoIds.push(data.id)
    }
  }

  // 3) Itens
  const linhas: any[] = []
  let o = 0
  e.secoes.forEach((s, si) => s.itens.forEach((item) => {
    linhas.push({ formulario_id: formId, pergunta_id: mapa.get(item.pergunta_id)!, ordem: o++, obrigatoria: item.obrigatoria, secao_id: secaoIds[si], mostrar_se: traduzir(item.mostrar_se) })
  }))
  if (linhas.length) {
    const { error } = await client.from('formulario_itens').insert(linhas)
    if (error) {
      console.error('[formularios] Erro ao gravar itens:', error)
      if (anteriores.length) await client.from('formulario_itens').insert(anteriores.map(a => ({ ...a, secao_id: idsMantidos.has(a.secao_id) ? a.secao_id : null })))
      throw erro(500, 'Não foi possível salvar as perguntas. O formulário foi mantido como estava.')
    }
  }

  // 4) Perguntas que saíram do formulário: nunca perdem resposta
  const agora = new Set(linhas.map(l => l.pergunta_id as number))
  for (const pid of antesIds) {
    if (agora.has(pid)) continue
    rel.removidas++
    const { data: outros } = await client.from('formulario_itens').select('formulario_id').eq('pergunta_id', pid).neq('formulario_id', formId)
    if (outros?.length) continue // ainda usada noutro formulário
    if ((await contarRespostas(client, pid)) > 0) {
      await client.from('formulario_perguntas').update({ arquivada: true }).eq('id', pid)
      rel.arquivadas++
    } else {
      await client.from('formulario_perguntas').delete().eq('id', pid)
      rel.excluidas++
    }
  }
  return { id: formId!, relatorio: rel }
}

/** Duplica um formulário inteiro: as perguntas são copiadas (o banco só cresce quando o usuário pede a cópia). */
export async function duplicarFormulario(client: any, id: number): Promise<number> {
  const f = await carregarFormulario(client, id)
  const idPara = new Map<number, number>()
  let n = 0
  const secoes = f.secoes.map(s => ({
    ...s, id: null,
    itens: s.itens.map((i) => { const novo = -(++n); idPara.set(i.pergunta_id, novo); return { ...i, pergunta_id: novo } }),
  }))
  const t = (c: Condicao | null) => c && { ...c, regras: c.regras.map(r => ({ ...r, pergunta_id: idPara.get(r.pergunta_id) ?? r.pergunta_id })) }
  for (const s of secoes) { s.mostrar_se = t(s.mostrar_se); for (const i of s.itens) i.mostrar_se = t(i.mostrar_se) }
  const { id: novoId } = await salvarEstrutura(client, null, limparEstrutura({ ...f, nome: `${f.nome} (cópia)`, secoes }))
  return novoId
}

// ─── Ficha (cliente/demanda): apresenta as respostas SEM duplicar dados ─────────────────────────
export interface PerguntaFicha extends PerguntaForm { resposta: Valor; respondido_em: string | null; fora_do_formulario?: boolean }
export interface SecaoFicha { nome: string; formulario_id: number | null; mostrar_se: Condicao | null; perguntas: PerguntaFicha[] }

export async function montarFicha(client: any, contatoId: number, casoId: number | null): Promise<SecaoFicha[]> {
  let procedimento: string | null = null
  if (casoId) {
    const { data: caso } = await client.from('casos').select('procedimento').eq('id', casoId).eq('contato_id', contatoId).maybeSingle()
    if (!caso) throw erro(404, 'Demanda não encontrada.')
    procedimento = caso.procedimento
  }
  const contextos = casoId ? ['demanda'] : ['cliente', 'consulta']
  const respostasQ = casoId ? client.from('caso_respostas').select('pergunta_id, resposta, updated_at').eq('caso_id', casoId) : client.from('contato_respostas').select('pergunta_id, resposta, updated_at').eq('contato_id', contatoId)
  const [{ data: forms }, { data: respostas }] = await Promise.all([
    client.from('formularios').select('id, nome, contexto, procedimentos').eq('ativo', true).in('contexto', contextos).order('id'),
    respostasQ,
  ])
  const porPergunta = new Map<number, { resposta: Valor; updated_at: string }>((respostas ?? []).map((r: any) => [r.pergunta_id, r]))
  const elegiveis = (forms ?? []).filter((f: any) => !casoId || procedimentoCasa(f.procedimentos, procedimento))
  const cobertas = new Set<number>()
  const saida: SecaoFicha[] = []
  for (const f of elegiveis) {
    const c = await carregarFormulario(client, f.id)
    for (const s of c.secoes) {
      const perguntas: PerguntaFicha[] = s.itens.map((i) => {
        cobertas.add(i.pergunta_id)
        const r = porPergunta.get(i.pergunta_id)
        return { pergunta_id: i.pergunta_id, texto: i.texto, tipo: i.tipo, opcoes: i.opcoes, ajuda: i.ajuda, obrigatoria: i.obrigatoria, mostrar_se: i.mostrar_se, resposta: (r?.resposta ?? null) as Valor, respondido_em: r?.updated_at ?? null }
      })
      if (perguntas.length) saida.push({ nome: elegiveis.length > 1 ? `${c.nome} · ${s.titulo}` : s.titulo, formulario_id: c.id, mostrar_se: s.mostrar_se, perguntas })
    }
  }
  // Respostas de perguntas que saíram do formulário (ou de formulários inativos): o histórico continua visível.
  const orfas = [...porPergunta.keys()].filter(pid => !cobertas.has(pid))
  if (orfas.length) {
    const { data: ps } = await client.from('formulario_perguntas').select('id, texto, tipo, opcoes, ajuda').in('id', orfas)
    const perguntas: PerguntaFicha[] = (ps ?? []).map((p: any) => {
      const r = porPergunta.get(p.id)!
      return { pergunta_id: p.id, texto: p.texto, tipo: p.tipo, opcoes: p.opcoes ?? [], ajuda: p.ajuda ?? null, obrigatoria: false, mostrar_se: null, resposta: r.resposta, respondido_em: r.updated_at, fora_do_formulario: true }
    })
    if (perguntas.length) saida.push({ nome: 'Fora do formulário (histórico preservado)', formulario_id: null, mostrar_se: null, perguntas })
  }
  return saida
}

// ─── Preenchimento público ────────────────────────────────────────────────────────────────────
/** Estrutura enviada à página pública: sem perguntas internas (checklist) e sem seções vazias. */
export async function estruturaPublica(client: any, formularioId: number) {
  const f = await carregarFormulario(client, formularioId)
  const secoes: SecaoForm[] = f.secoes
    .map(s => ({ id: s.id, titulo: s.titulo, descricao: s.descricao, mostrar_se: s.mostrar_se, itens: s.itens.filter(i => !tipoInterno(i.tipo)).map(({ respostas: _r, usada_em: _u, ...i }: any) => i as PerguntaForm) }))
    .filter(s => s.itens.length)
  return { nome: f.nome, descricao: f.descricao, contexto: f.contexto, instrucoes: f.instrucoes, finalidade: f.finalidade, mensagem_final: f.mensagem_final, versao: f.versao, secoes }
}

/** Assinatura do que a cliente vê (texto, tipo, opções, obrigatoriedade, lógica): muda só quando a estrutura muda de verdade. */
export const assinaturaEstrutura = (secoes: SecaoForm[]) => JSON.stringify(secoes.map(s => [s.titulo, s.descricao, s.mostrar_se, s.itens.map(i => [i.pergunta_id, i.texto, i.tipo, i.opcoes, i.ajuda, i.obrigatoria, i.mostrar_se])]))

export interface LinhaResposta { pergunta_id: number; ordem: number; pergunta_texto: string; pergunta_tipo: string; secao_titulo: string; resposta: Valor }

/**
 * Valida as respostas do preenchimento com a MESMA lógica condicional da tela: pergunta escondida não é
 * obrigatória e sua resposta é descartada. Devolve as linhas para o snapshot do envio.
 */
export function validarRespostasPublicas(secoes: SecaoForm[], brutas: Record<string, unknown>): { linhas: LinhaResposta[]; validas: Map<number, Valor> } {
  const normalizadas: Record<number, Valor> = {}
  for (const s of secoes) for (const p of s.itens) {
    const v = brutas?.[String(p.pergunta_id)]
    normalizadas[p.pergunta_id] = v === undefined ? null : normalizarRespostaCliente(p.tipo, p.opcoes, v) as Valor
  }
  const vis = calcularVisibilidade(secoes, normalizadas)
  const linhas: LinhaResposta[] = []
  const validas = new Map<number, Valor>()
  let ordem = 0
  secoes.forEach((s, si) => {
    for (const p of s.itens) {
      if (!vis.secoes.has(si) || !vis.perguntas.has(p.pergunta_id)) continue
      const r = normalizadas[p.pergunta_id] ?? null
      const vazia = r == null || (Array.isArray(r) ? r.length === 0 : r === '')
      if (p.obrigatoria && vazia) throw erro(400, `A pergunta "${p.texto}" é obrigatória.`)
      linhas.push({ pergunta_id: p.pergunta_id, ordem: ordem++, pergunta_texto: p.texto, pergunta_tipo: p.tipo, secao_titulo: s.titulo, resposta: r })
      if (!vazia) validas.set(p.pergunta_id, r)
    }
  })
  return { linhas, validas }
}

/** Exclui o formulário; as perguntas seguem a mesma regra de "nunca perder resposta" (arquivadas se já respondidas). */
export async function excluirFormulario(client: any, id: number) {
  const { data: itens } = await client.from('formulario_itens').select('pergunta_id').eq('formulario_id', id)
  const { error } = await client.from('formularios').delete().eq('id', id)
  if (error) throw erro(500, 'Erro ao excluir o formulário.')
  let arquivadas = 0
  for (const { pergunta_id: pid } of itens ?? []) {
    const { data: outros } = await client.from('formulario_itens').select('formulario_id').eq('pergunta_id', pid)
    if (outros?.length) continue
    if ((await contarRespostas(client, pid)) > 0) { await client.from('formulario_perguntas').update({ arquivada: true }).eq('id', pid); arquivadas++ }
    else await client.from('formulario_perguntas').delete().eq('id', pid)
  }
  return { arquivadas }
}
