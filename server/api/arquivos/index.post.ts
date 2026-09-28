import { serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { registrarAtividade } from '../../utils/crm'
import { auditar } from '../../utils/auditoria'
import { CATEGORIAS_ARQUIVO } from '../../../shared/types/crm'
import { ARQUIVO_MAX_BYTES, ARQUIVO_MIME_OK } from '../../utils/arquivos'

/** Registra um documento já enviado ao armazenamento pelo link assinado de /upload-url. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'arquivos/create')
  const b = (await readBody<{ contato_id?: number; caso_id?: number | null; categoria?: string; descricao?: string; path?: string; nome?: string; mime?: string }>(event)) ?? {}

  const contatoId = Number(b.contato_id)
  if (!Number.isInteger(contatoId) || contatoId <= 0) throw createError({ statusCode: 400, message: 'Escolha o cliente.' })
  const path = String(b.path ?? '')
  // O caminho foi gerado pelo servidor com o id do cliente na frente — não aceita caminho de outro cliente.
  if (!path.startsWith(`${contatoId}/`) || path.includes('..')) throw createError({ statusCode: 400, message: 'Envio inválido.' })
  const categoria = b.categoria && b.categoria in CATEGORIAS_ARQUIVO ? b.categoria : 'provas'
  const casoId = Number.isInteger(b.caso_id) && Number(b.caso_id) > 0 ? b.caso_id : null
  const mime = String(b.mime ?? '').split(';')[0]!.trim()
  if (!ARQUIVO_MIME_OK.test(mime)) throw createError({ statusCode: 415, message: 'Tipo de arquivo não aceito.' })

  const admin = serverSupabaseServiceRole(event)
  const pasta = path.slice(0, path.lastIndexOf('/'))
  const arquivo = path.slice(path.lastIndexOf('/') + 1)
  const { data: lista } = await admin.storage.from('documentos').list(pasta, { search: arquivo, limit: 1 })
  const obj = lista?.find(o => o.name === arquivo)
  if (!obj) throw createError({ statusCode: 400, message: 'O arquivo não chegou ao armazenamento. Tente enviar de novo.' })
  const tamanho = Number((obj.metadata as any)?.size ?? 0)
  if (tamanho > ARQUIVO_MAX_BYTES) {
    await admin.storage.from('documentos').remove([path])
    throw createError({ statusCode: 413, message: 'Arquivo maior que 25 MB.' })
  }

  const nome = String(b.nome ?? arquivo).slice(0, 200)
  const { data, error } = await admin.from('arquivos').insert({
    contato_id: contatoId, caso_id: casoId, categoria, nome,
    descricao: String(b.descricao ?? '').trim().slice(0, 300) || null,
    path, mime, tamanho, enviado_por: userId,
  }).select('id').single()
  if (error) {
    console.error('[arquivos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Não foi possível registrar o arquivo.' })
  }
  await registrarAtividade(event, contatoId, 'Documento', `Documento anexado: ${nome}.`, userId)
  await auditar(event, 'anexou documento', 'arquivo', data.id)
  return { id: data.id }
})
