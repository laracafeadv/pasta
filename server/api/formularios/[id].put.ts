import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { assinaturaEstrutura, carregarFormulario, limparEstrutura, salvarEstrutura } from '../../utils/formularioEstrutura'
import { auditar } from '../../utils/auditoria'

/** Salva o formulário inteiro (título, contexto, seções, perguntas, opções, obrigatoriedade e lógica). */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const estrutura = limparEstrutura(await readBody(event))
  const client = await serverSupabaseClient(event)
  const antes = await carregarFormulario(client, id)
  const r = await salvarEstrutura(client, id, estrutura)
  // Versão do formulário: sobe só quando o que a cliente vê muda. Links já enviados continuam com a versão congelada neles.
  const depois = await carregarFormulario(client, id)
  let versao = antes.versao
  if (assinaturaEstrutura(antes.secoes) !== assinaturaEstrutura(depois.secoes) || antes.nome !== depois.nome) {
    versao = antes.versao + 1
    await client.from('formularios').update({ versao }).eq('id', id)
  }
  await auditar(event, 'editou formulário', 'formulario', id, { ...r.relatorio, remapeamento: undefined })
  return { success: true, versao, ...r.relatorio }
})
