import { serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { CATEGORIAS_DOCUMENTO } from '../../../shared/types/crm'
import { auditar } from '../../utils/auditoria'

/** Grava o documento gerado (o texto já vem pronto do cliente, com as variáveis já resolvidas). O download é um GET separado em /baixar. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'documentos-gerados/create')
  const body = await readBody<{
    modelo_id?: number | null; nome?: string; categoria?: string; contato_id?: number
    caso_id?: number | null; honorario_id?: number | null; valor?: number | null
    dados?: Record<string, string>; conteudo_final?: string
  }>(event)

  const contatoId = Number(body?.contato_id)
  if (!Number.isInteger(contatoId) || contatoId <= 0) throw createError({ statusCode: 400, message: 'Informe o cliente.' })
  const nome = String(body?.nome ?? '').trim().slice(0, 150)
  if (!nome) throw createError({ statusCode: 400, message: 'Dê um nome para o documento.' })
  const categoria = Object.keys(CATEGORIAS_DOCUMENTO).includes(body?.categoria as string) ? body!.categoria! : 'personalizado'
  const conteudoFinal = String(body?.conteudo_final ?? '').trim()
  if (!conteudoFinal) throw createError({ statusCode: 400, message: 'O documento está vazio.' })

  const admin = serverSupabaseServiceRole(event)
  const { data, error } = await admin.from('documentos_gerados').insert({
    modelo_id: body?.modelo_id || null,
    nome, categoria,
    contato_id: contatoId,
    caso_id: body?.caso_id || null,
    honorario_id: body?.honorario_id || null,
    valor: body?.valor || null,
    dados: body?.dados ?? {},
    conteudo_final: conteudoFinal,
    criado_por: userId,
  }).select().single()
  if (error) {
    console.error('[documentos-gerados] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao salvar o documento.' })
  }
  await auditar(event, 'gerou documento', 'documento_gerado', data.id, { categoria })
  return { id: data.id }
})
