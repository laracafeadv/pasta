import { serverSupabaseServiceRole } from '#supabase/server'
import { ESTADOS_CIVIS, ORIGENS, UFS } from '../../../../shared/types/crm'
import { cpfValido } from '../../../../shared/utils/juridico'
import { contatoDoFormulario } from '../../../utils/formulario'
import { notificarEquipe, registrarAtividade } from '../../../utils/crm'

const txt = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null

/**
 * Resposta do formulário: dados da procuração (vão direto para a Qualificação),
 * perguntas do Mapa da Empatia (alimentam "O que elas dizem de verdade") e consentimento.
 * Uma resposta por link; anexos continuam liberados até o link expirar.
 */
export default defineEventHandler(async (event) => {
  const admin = serverSupabaseServiceRole(event)
  const c = await contatoDoFormulario(admin, getRouterParam(event, 'token'))
  if (c.form_respondido_em) throw createError({ statusCode: 409, message: 'Este formulário já foi respondido. Se precisar corrigir algo, fale com o escritório.' })
  const b = (await readBody<Record<string, unknown>>(event)) ?? {}
  if (b.consentimento !== true) throw createError({ statusCode: 400, message: 'Para enviar, confirme que leu o aviso de privacidade.' })

  const cpf = txt(b.cpf, 20)
  if (!txt(b.nome_completo)) throw createError({ statusCode: 400, message: 'Informe o nome completo.' })
  if (cpf && !cpfValido(cpf)) throw createError({ statusCode: 400, message: 'CPF inválido: confira os números.' })
  const nascimento = txt(b.data_nascimento, 10)
  if (nascimento && !/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) throw createError({ statusCode: 400, message: 'Data de nascimento inválida.' })
  const email = txt(b.email, 120)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw createError({ statusCode: 400, message: 'E-mail inválido.' })
  const estadoCivil = ESTADOS_CIVIS.includes(String(b.estado_civil)) ? String(b.estado_civil) : null
  const uf = UFS.includes(String(b.uf)) ? String(b.uf) : null

  const { error: eq } = await admin.from('qualificacao').upsert({
    contato_id: c.id,
    nome_completo: txt(b.nome_completo), cpf, rg: txt(b.rg, 30), orgao_emissor: txt(b.orgao_emissor, 30),
    nacionalidade: txt(b.nacionalidade, 60) ?? 'brasileira', estado_civil: estadoCivil, profissao: txt(b.profissao, 80),
    endereco: txt(b.endereco), bairro: txt(b.bairro, 80), cep: txt(b.cep, 12), cidade: txt(b.cidade, 80), uf,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'contato_id' })
  if (eq) {
    console.error('[formulario] Erro na qualificação:', eq)
    throw createError({ statusCode: 500, message: 'Não foi possível salvar agora. Tente de novo em instantes.' })
  }

  const origem = ORIGENS.includes(String(b.origem)) ? String(b.origem) : null
  await admin.from('contatos').update({
    ...(email ? { email } : {}),
    ...(nascimento ? { data_nascimento: nascimento } : {}),
    ...(typeof b.tem_filhos === 'boolean' ? { tem_filhos: b.tem_filhos } : {}),
    ...(txt(b.preocupacao, 300) ? { dor: txt(b.preocupacao, 300) } : {}),
    ...(txt(b.expectativa, 300) ? { objetivo: txt(b.expectativa, 300) } : {}),
    ...(origem && (!c.origem || c.origem === 'WhatsApp') ? { origem } : {}),
    form_respondido_em: new Date().toISOString(),
    consentimento_em: new Date().toISOString(),
  }).eq('id', c.id)

  const sentimento = txt(b.sentimento, 500)
  await registrarAtividade(event, c.id, 'Sistema', `Formulário da cliente respondido.${sentimento ? `\nComo está se sentindo: "${sentimento}"` : ''}`)
  await notificarEquipe(event, 'Formulário respondido', `${c.nome ?? 'Uma cliente'} respondeu o formulário. Os dados já estão na Qualificação.`, { contato_id: c.id })
  return { ok: true }
})
