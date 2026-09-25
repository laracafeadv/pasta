import { serverSupabaseServiceRole } from '#supabase/server'
import { FORM_MAX_ARQUIVOS, FORM_MAX_BYTES, FORM_TIPOS, contatoDoFormulario } from '../../../utils/formulario'
import { driveConfigurado, enviarArquivo, garantirPastaCliente } from '../../../utils/drive'
import { registrarAtividade } from '../../../utils/crm'
import { NIVEIS_SIGILO, codigoCliente, nomeArquivoPadrao } from '../../../../shared/types/crm'

/**
 * Anexo enviado pela cliente no formulário: vai para "01 Documentos pessoais" no Drive
 * (ou para o armazenamento privado do CRM, se o Drive ainda não estiver ligado).
 */
export default defineEventHandler(async (event) => {
  const admin = serverSupabaseServiceRole(event)
  const c = await contatoDoFormulario(admin, getRouterParam(event, 'token'))
  if (c.form_arquivos >= FORM_MAX_ARQUIVOS) throw createError({ statusCode: 429, message: `Limite de ${FORM_MAX_ARQUIVOS} arquivos por link. Envie o restante pelo WhatsApp.` })

  const partes = await readMultipartFormData(event)
  const f = partes?.find(p => p.name === 'arquivo' && p.filename)
  if (!f) throw createError({ statusCode: 400, message: 'Nenhum arquivo recebido.' })
  const mime = (f.type || '').split(';')[0]!.trim()
  const ext = FORM_TIPOS[mime]
  if (!ext) throw createError({ statusCode: 415, message: 'Envie PDF ou foto (JPG, PNG, HEIC).' })
  if (f.data.length > FORM_MAX_BYTES) throw createError({ statusCode: 413, message: 'Arquivo maior que 10 MB.' })

  const descricao = String(f.filename).replace(/\.[a-z0-9]{2,5}$/i, '').slice(0, 60)
  const nome = nomeArquivoPadrao({ data: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }), contatoId: c.id, tipo: 'Doc-pessoal', descricao, extensao: ext })
  let onde = 'CRM'
  if (driveConfigurado()) {
    const pasta = await garantirPastaCliente(admin, c.id)
    await enviarArquivo({ nome, mime, conteudo: f.data, pastaId: pasta.subpastas.pessoais, propriedades: { cliente: codigoCliente(c.id), tipo: 'Documento pessoal', sigilo: NIVEIS_SIGILO.confidencial, origem: 'Formulário da cliente' } })
    onde = 'Drive'
  } else {
    const { error } = await admin.storage.from('whatsapp').upload(`${c.id}/formulario/${nome}`, f.data, { contentType: mime, upsert: false })
    if (error) throw createError({ statusCode: 500, message: 'Não foi possível guardar o arquivo agora.' })
  }
  await admin.from('contatos').update({ form_arquivos: c.form_arquivos + 1 }).eq('id', c.id)
  await registrarAtividade(event, c.id, 'Documento recebido', `Documento enviado pelo formulário: ${f.filename} (guardado no ${onde}).`)
  return { ok: true, nome: f.filename }
})
