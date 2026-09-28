import { requireStaff } from '../../utils/security'
import { renderConteudo } from '../../utils/documentoGerador'

/** Pré-visualização em texto: substitui {{token}} pelos dados informados, sem gravar nada. */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'documentos-gerados/preview')
  const body = (await readBody<{ conteudo?: string; dados?: Record<string, string> }>(event)) ?? {}
  const conteudo = String(body.conteudo ?? '').slice(0, 20000)
  const dados = typeof body.dados === 'object' && body.dados ? body.dados : {}
  return { texto: renderConteudo(conteudo, dados) }
})
