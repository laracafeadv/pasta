import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparEstrutura, salvarEstrutura } from '../../utils/formularioEstrutura'
import { auditar } from '../../utils/auditoria'

/** Cria um formulário (vazio, com uma seção) ou já com a estrutura enviada. */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/create')
  const body = (await readBody(event)) ?? {}
  const estrutura = limparEstrutura({ ...body, nome: body.nome || 'Formulário sem título', secoes: Array.isArray(body.secoes) && body.secoes.length ? body.secoes : [{ titulo: 'Seção 1', itens: [] }] })
  const { id } = await salvarEstrutura(await serverSupabaseClient(event), null, estrutura)
  await auditar(event, 'criou formulário', 'formulario', id)
  return { id }
})
