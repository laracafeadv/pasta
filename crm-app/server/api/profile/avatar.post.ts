import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { throwSanitizedInternalError } from '../../utils/security'

export default defineEventHandler(async (event) => {
  // 1. Authenticate user
  const user = await serverSupabaseUser(event)
  if (!user?.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // 2. Read multipart data
  const parts = await readMultipartFormData(event)
  if (!parts || parts.length === 0) {
    throw createError({ statusCode: 400, message: 'Nenhuma imagem enviada.' })
  }

  const filePart = parts.find(p => p.name === 'file' || p.name === 'avatar')
  if (!filePart || !filePart.data || !filePart.filename) {
    throw createError({ statusCode: 400, message: 'Arquivo de imagem inválido ou ausente.' })
  }

  // Validate file size (max 5MB)
  const MAX_FILE_SIZE = 5 * 1024 * 1024
  if (filePart.data.length > MAX_FILE_SIZE) {
    throw createError({ statusCode: 413, message: 'Arquivo muito grande. O tamanho máximo é 5MB.' })
  }

  // Generate safe filename and path
  const ext = filePart.filename.split('.').pop()?.toLowerCase() || 'jpg'
  const validExts = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  if (!validExts.includes(ext)) {
    throw createError({ statusCode: 400, message: 'Formato de imagem não suportado. Use JPG, PNG, GIF ou WEBP.' })
  }

  // Validate MIME type matches declared extension
  const ALLOWED_MIMES: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  }
  const declaredMime = filePart.type || ''
  if (declaredMime && declaredMime !== ALLOWED_MIMES[ext]) {
    throw createError({ statusCode: 415, message: 'Tipo de arquivo não corresponde à extensão informada.' })
  }

  // 3. Upload para o Supabase Storage (bucket público "avatars")
  const supabaseAdmin = serverSupabaseServiceRole(event)
  const storagePath = `${user.sub}/avatar-${Date.now()}.${ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('avatars')
    .upload(storagePath, filePart.data, { contentType: ALLOWED_MIMES[ext], upsert: false })

  if (uploadError) {
    throwSanitizedInternalError('profile/avatar-upload', uploadError, 'Erro ao enviar a foto de perfil.', 502)
  }

  const sharedUrl = supabaseAdmin.storage.from('avatars').getPublicUrl(storagePath).data.publicUrl

  // 5. Save to Supabase Profiles Table
  const { error: dbError } = await supabaseAdmin
    .from('profiles')
    .update({ avatar_url: sharedUrl })
    .eq('id', user.sub)

  if (dbError) {
    throwSanitizedInternalError('profile/avatar-db', dbError, 'Erro interno ao salvar avatar.')
  }

  return {
    success: true,
    avatar_url: sharedUrl
  }
})
