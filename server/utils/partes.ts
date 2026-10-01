import { PARTE_CAMPOS, normalizarTelefone, pick } from '../../shared/types/crm'
import { registrarAtividade, sanitizarBusca } from './crm'

const erro = (statusCode: number, message: string, data?: unknown) => createError({ statusCode, message, data })
const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

export function limparParte(body: Record<string, any>) {
  const d = pick(body ?? {}, PARTE_CAMPOS) as Record<string, any>
  for (const [k, v] of Object.entries(d)) if (typeof v === 'string') d[k] = v.trim() || null
  if ('nome' in d && !d.nome) throw erro(400, 'Informe o nome.')
  if ('caso_id' in d) d.caso_id = Number(d.caso_id)
  if ('contato_id' in d) d.contato_id = Number(d.contato_id) || null
  if ('processo_id' in d) d.processo_id = Number(d.processo_id) || null
  if ('papel' in d) { d.papel = String(d.papel ?? '').trim().slice(0, 60); if (!d.papel) d.papel = 'Interessado' }
  if ('polo' in d && d.polo && !['ativo', 'passivo'].includes(d.polo)) throw erro(400, 'Polo inválido.')
  if ('polo' in d && !d.polo) d.polo = null
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) throw erro(400, 'E-mail inválido.')
  return d
}

export interface PessoaNova { nome?: string | null; telefone?: string | null; email?: string | null }
export interface ParteEntrada { caso_id: number; pessoa_id?: number | null; nova_pessoa?: PessoaNova | null; confirmar_nova?: boolean; papel?: string | null; polo?: string | null; processo_id?: number | null; observacao?: string | null; documento?: string | null }
export interface PessoaResolvida { id: number | null; nome: string; reaproveitada: boolean; criada: boolean; sem_cadastro: boolean; telefone?: string | null; email?: string | null }

/** Pessoas cadastradas com o MESMO nome (sem acento/caixa): candidatas a duplicata. */
export async function pessoasComMesmoNome(client: any, nome: string) {
  const alvo = semAcento(nome)
  const primeira = sanitizarBusca(nome.split(/\s+/)[0] ?? nome)
  if (!primeira) return []
  const { data } = await client.from('contatos').select('id, nome, telefone, etapa').ilike('nome', `%${primeira}%`).limit(60)
  return (data ?? []).filter((c: any) => semAcento(c.nome ?? '') === alvo) as { id: number; nome: string; telefone: string; etapa: string }[]
}

/**
 * Descobre QUEM é a pessoa sem nunca criar uma segunda: (1) pessoa escolhida; (2) telefone já cadastrado → a mesma pessoa;
 * (3) nome idêntico a alguém cadastrado → pergunta antes (409 com as candidatas), a menos que se confirme que é outra;
 * (4) só então cadastra (etapa "relacionado": não entra no funil) — ou, sem telefone, fica como parte sem cadastro.
 */
export async function resolverPessoa(event: any, client: any, e: { pessoa_id?: number | null; nova_pessoa?: PessoaNova | null; confirmar_nova?: boolean }, userId: string | null): Promise<PessoaResolvida> {
  if (e.pessoa_id) {
    const { data: c } = await client.from('contatos').select('id, nome, telefone, email').eq('id', Number(e.pessoa_id)).maybeSingle()
    if (!c) throw erro(404, 'Pessoa não encontrada.')
    return { id: c.id, nome: c.nome ?? 'Sem nome', reaproveitada: true, criada: false, sem_cadastro: false }
  }
  const n = e.nova_pessoa
  const nome = String(n?.nome ?? '').trim()
  if (!nome) throw erro(400, 'Escolha uma pessoa cadastrada ou informe o nome.')
  const telefone = normalizarTelefone(n?.telefone)
  if (telefone) {
    const { data: igual } = await client.from('contatos').select('id, nome').eq('telefone', telefone).maybeSingle()
    if (igual) return { id: igual.id, nome: igual.nome ?? nome, reaproveitada: true, criada: false, sem_cadastro: false }
  }
  if (!e.confirmar_nova) {
    const candidatas = await pessoasComMesmoNome(client, nome)
    if (candidatas.length) throw erro(409, `Já existe ${candidatas.length === 1 ? 'uma pessoa cadastrada' : 'mais de uma pessoa cadastrada'} com o nome "${nome}". Escolha a pessoa existente ou confirme que é outra.`, { candidatas })
  }
  if (!telefone) return { id: null, nome, reaproveitada: false, criada: false, sem_cadastro: true, telefone: null, email: n?.email?.trim() || null }
  const { data: c, error } = await client.from('contatos').insert({ nome, telefone, email: n?.email?.trim() || null, etapa: 'relacionado', origem: 'Outros' }).select('id, nome').single()
  if (error || !c) {
    if (error?.code === '23505') { const { data: g } = await client.from('contatos').select('id, nome').eq('telefone', telefone).maybeSingle(); if (g) return { id: g.id, nome: g.nome ?? nome, reaproveitada: true, criada: false, sem_cadastro: false } }
    throw erro(500, 'Não foi possível cadastrar a pessoa.')
  }
  await registrarAtividade(event, c.id, 'Sistema', 'Pessoa cadastrada a partir de uma demanda (parte/interessado).', userId)
  return { id: c.id, nome: c.nome, reaproveitada: false, criada: true, sem_cadastro: false }
}

async function conferirProcesso(client: any, casoId: number, processoId: number | null | undefined) {
  if (!processoId) return null
  const { data: p } = await client.from('processos').select('id').eq('id', processoId).eq('caso_id', casoId).maybeSingle()
  if (!p) throw erro(400, 'Esse processo/procedimento não pertence a esta demanda.')
  return p.id as number
}

/** Adiciona uma parte/interessado à demanda apontando para a pessoa (existente ou nova). */
export async function adicionarParte(event: any, client: any, e: ParteEntrada, userId: string | null) {
  const casoId = Number(e.caso_id)
  const { data: caso } = await client.from('casos').select('id, titulo, contato_id').eq('id', casoId).maybeSingle()
  if (!caso) throw erro(404, 'Demanda não encontrada.')
  const processoId = await conferirProcesso(client, casoId, e.processo_id)
  const d = limparParte({ papel: e.papel, polo: e.polo, observacao: e.observacao, documento: e.documento })
  const pessoa = await resolverPessoa(event, client, e, userId)
  if (pessoa.id) {
    const { data: ja } = await client.from('partes').select('id, papel').eq('caso_id', casoId).eq('contato_id', pessoa.id).maybeSingle()
    if (ja) throw erro(409, `${pessoa.nome} já está nesta demanda como "${ja.papel}". Edite a parte em vez de adicionar de novo.`)
  }
  const { data: parte, error } = await client.from('partes').insert({
    caso_id: casoId, contato_id: pessoa.id, nome: pessoa.nome, papel: d.papel ?? 'Interessado', polo: d.polo ?? null, processo_id: processoId,
    observacao: d.observacao ?? null, documento: d.documento ?? null,
    telefone: pessoa.id ? null : normalizarTelefone(e.nova_pessoa?.telefone) || null, email: pessoa.id ? null : (e.nova_pessoa?.email?.trim() || null),
  }).select().single()
  if (error || !parte) {
    if (error?.code === '23505') throw erro(409, `${pessoa.nome} já está nesta demanda.`)
    throw erro(500, 'Erro ao adicionar.')
  }
  await registrarAtividade(event, caso.contato_id, 'Sistema', `Parte adicionada em "${caso.titulo}": ${pessoa.nome} (${parte.papel})${pessoa.reaproveitada ? ' — pessoa já cadastrada' : pessoa.criada ? ' — pessoa cadastrada agora' : ''}.`, userId, null, casoId)
  // A própria pessoa também "sabe" onde aparece (sem caso_id: a demanda é de outro cliente).
  if (pessoa.id && pessoa.id !== caso.contato_id) await registrarAtividade(event, pessoa.id, 'Sistema', `Vinculada como ${parte.papel} na demanda "${caso.titulo}".`, userId)
  return { parte, pessoa }
}

/** Edita papel, polo, processo, observação e documento. Nome/telefone/e-mail só se a parte não tem pessoa cadastrada (senão são da pessoa). */
export async function atualizarParte(event: any, client: any, id: number, body: Record<string, any>, userId: string | null) {
  const { data: atual } = await client.from('partes').select('id, caso_id, contato_id, nome, papel, polo, processo_id').eq('id', id).maybeSingle()
  if (!atual) throw erro(404, 'Parte não encontrada.')
  const d = limparParte(body)
  delete d.caso_id; delete d.contato_id
  if (atual.contato_id) { delete d.nome; delete d.telefone; delete d.email }
  if ('processo_id' in d) d.processo_id = await conferirProcesso(client, atual.caso_id, d.processo_id)
  if (!Object.keys(d).length) return atual
  const { data, error } = await client.from('partes').update(d).eq('id', id).select().single()
  if (error) throw erro(500, 'Erro ao salvar.')
  if (d.papel && d.papel !== atual.papel) {
    const { data: caso } = await client.from('casos').select('titulo, contato_id').eq('id', atual.caso_id).maybeSingle()
    if (caso) await registrarAtividade(event, caso.contato_id, 'Sistema', `Parte "${atual.nome}" em "${caso.titulo}": ${atual.papel} → ${d.papel}.`, userId, null, atual.caso_id)
  }
  return data
}

/** Liga uma parte digitada à mão (sem cadastro) a uma pessoa cadastrada — para corrigir duplicidade sem refazer nada. */
export async function vincularPartePessoa(event: any, client: any, id: number, e: { pessoa_id?: number | null; nova_pessoa?: PessoaNova | null; confirmar_nova?: boolean }, userId: string | null) {
  const { data: atual } = await client.from('partes').select('id, caso_id, contato_id, nome, papel, telefone, email').eq('id', id).maybeSingle()
  if (!atual) throw erro(404, 'Parte não encontrada.')
  if (atual.contato_id) throw erro(409, 'Esta parte já está vinculada a uma pessoa cadastrada.')
  const pessoa = await resolverPessoa(event, client, e.pessoa_id || e.nova_pessoa ? e : { nova_pessoa: { nome: atual.nome, telefone: atual.telefone, email: atual.email }, confirmar_nova: e.confirmar_nova }, userId)
  if (!pessoa.id) throw erro(400, 'Informe o telefone para cadastrar a pessoa, ou escolha uma já cadastrada.')
  const { data: ja } = await client.from('partes').select('id').eq('caso_id', atual.caso_id).eq('contato_id', pessoa.id).maybeSingle()
  if (ja) throw erro(409, `${pessoa.nome} já está nesta demanda em outra parte. Remova a duplicada.`)
  const { data, error } = await client.from('partes').update({ contato_id: pessoa.id, nome: pessoa.nome, telefone: null, email: null }).eq('id', id).select().single()
  if (error) throw erro(500, 'Erro ao vincular.')
  const { data: caso } = await client.from('casos').select('titulo, contato_id').eq('id', atual.caso_id).maybeSingle()
  if (caso) await registrarAtividade(event, caso.contato_id, 'Sistema', `Parte "${atual.nome}" vinculada à pessoa cadastrada ${pessoa.nome} em "${caso.titulo}".`, userId, null, atual.caso_id)
  return { parte: data, pessoa }
}

/** Remove a parte da demanda (desvincula). A pessoa continua cadastrada, com o histórico dela. */
export async function removerParte(event: any, client: any, id: number, userId: string | null) {
  const { data: p } = await client.from('partes').select('id, caso_id, contato_id, nome, papel').eq('id', id).maybeSingle()
  if (!p) return { success: true }
  await client.from('partes').delete().eq('id', id)
  const { data: caso } = await client.from('casos').select('titulo, contato_id').eq('id', p.caso_id).maybeSingle()
  if (caso) {
    await registrarAtividade(event, caso.contato_id, 'Sistema', `Parte removida de "${caso.titulo}": ${p.nome} (${p.papel})${p.contato_id ? ' — a pessoa continua cadastrada' : ''}.`, userId, null, p.caso_id)
    if (p.contato_id && p.contato_id !== caso.contato_id) await registrarAtividade(event, p.contato_id, 'Sistema', `Desvinculada da demanda "${caso.titulo}" (era ${p.papel}).`, userId)
  }
  return { success: true }
}
