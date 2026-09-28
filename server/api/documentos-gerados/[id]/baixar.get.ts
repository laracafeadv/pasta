import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { gerarDocxDeTexto } from '../../../utils/documentoGerador'
import { CATEGORIAS_DOCUMENTO, nomeArquivoPadrao } from '../../../../shared/types/crm'
import { auditar } from '../../../utils/auditoria'

/** Baixa de novo um documento já gerado, a partir do texto que ficou gravado (nunca muda, mesmo se o modelo original mudar). */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'documentos-gerados/baixar')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { data } = await (await serverSupabaseClient(event)).from('documentos_gerados').select('nome, categoria, contato_id, conteudo_final').eq('id', id).maybeSingle()
  if (!data) throw createError({ statusCode: 404, message: 'Documento não encontrado.' })

  const buffer = await gerarDocxDeTexto(CATEGORIAS_DOCUMENTO[data.categoria as keyof typeof CATEGORIAS_DOCUMENTO] ?? data.categoria, data.conteudo_final)
  const nomeArquivo = nomeArquivoPadrao({ data: new Date().toLocaleDateString('sv-SE'), contatoId: data.contato_id, tipo: data.categoria, descricao: data.nome, extensao: 'docx' })
  await auditar(event, 'baixou documento gerado', 'documento_gerado', id)
  setHeaders(event, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
    'Cache-Control': 'private, no-store',
  })
  return buffer
})
