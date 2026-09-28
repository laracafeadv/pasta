import { randomBytes } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { CATEGORIAS_ARQUIVO } from '../../../shared/types/crm'
import { ARQUIVO_MAX_BYTES, ARQUIVO_MIME_OK } from '../../utils/arquivos'

/**
 * Autoriza um upload: devolve um link assinado para o navegador mandar o arquivo direto ao
 * armazenamento (a Vercel limita o corpo das requisições a ~4,5 MB, então o arquivo não passa pelo servidor).
 */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'arquivos/upload-url')
  const b = (await readBody<{ contato_id?: number; categoria?: string; nome?: string; mime?: string; tamanho?: number }>(event)) ?? {}
  const contatoId = Number(b.contato_id)
  if (!Number.isInteger(contatoId) || contatoId <= 0) throw createError({ statusCode: 400, message: 'Escolha o cliente.' })
  const categoria = b.categoria && b.categoria in CATEGORIAS_ARQUIVO ? b.categoria : 'provas'
  const mime = String(b.mime ?? '').split(';')[0]!.trim()
  if (!ARQUIVO_MIME_OK.test(mime)) throw createError({ statusCode: 415, message: 'Tipo de arquivo não aceito. Use PDF, imagem, Word, Excel, áudio ou vídeo.' })
  if (!Number(b.tamanho) || Number(b.tamanho) > ARQUIVO_MAX_BYTES) throw createError({ statusCode: 413, message: 'Arquivo maior que 25 MB.' })

  const seguro = String(b.nome ?? 'arquivo').slice(0, 150).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-')
  const path = `${contatoId}/${categoria}/${Date.now()}-${randomBytes(4).toString('hex')}-${seguro}`
  const { data, error } = await serverSupabaseServiceRole(event).storage.from('documentos').createSignedUploadUrl(path)
  if (error || !data) {
    console.error('[arquivos] Signed upload:', error)
    throw createError({ statusCode: 500, message: 'Não foi possível preparar o envio.' })
  }
  return { path: data.path, token: data.token }
})
