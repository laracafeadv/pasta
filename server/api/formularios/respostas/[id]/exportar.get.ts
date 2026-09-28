import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../../utils/security'
import { gerarDocx } from '../../../../utils/pecas'
import { auditar } from '../../../../utils/auditoria'

const TIPO_LABEL: Record<string, string> = { sim_nao: 'Sim/não', selecao_unica: 'Seleção única', selecao_multipla: 'Seleção múltipla', numero: 'Número', data: 'Data', email: 'E-mail', telefone: 'Telefone', texto_curto: 'Texto', texto_longo: 'Texto' }
const formatarResposta = (r: unknown) => Array.isArray(r) ? (r.length ? r.join(', ') : '(sem resposta)') : (r ? String(r) : '(sem resposta)')

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/respostas/exportar')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const client = await serverSupabaseClient(event)

  const { data: envio } = await client.from('formulario_envios')
    .select('created_at, respondido_em, contato:contatos(nome, resumo), formulario:formularios(nome)')
    .eq('id', id).maybeSingle()
  if (!envio) throw createError({ statusCode: 404, message: 'Envio não encontrado.' })
  const { data: respostas } = await client.from('formulario_envio_respostas').select('pergunta_texto, pergunta_tipo, resposta').eq('envio_id', id).order('ordem')

  const c = envio.contato as any
  const f = envio.formulario as any
  const dataResposta = envio.respondido_em ? new Date(envio.respondido_em).toLocaleDateString('pt-BR') : '—'

  const blocos = [
    { titulo: 'Cliente:', texto: c?.nome ?? '—' },
    { titulo: 'Formulário:', texto: f?.nome ?? 'Sem formulário específico (só resumo livre)' },
    { titulo: 'Data da resposta:', texto: dataResposta, espaco: 400 },
    { negrito: 'Conte um pouco da sua situação', espaco: 100 },
    { texto: c?.resumo ?? '—', espaco: 400 },
    ...(respostas ?? []).flatMap(r => [
      { negrito: `${r.pergunta_texto} (${TIPO_LABEL[r.pergunta_tipo] ?? r.pergunta_tipo})`, espaco: 100 },
      { texto: formatarResposta(r.resposta), espaco: 300 },
    ]),
  ]

  const buffer = await gerarDocx('RESPOSTAS DO FORMULÁRIO PRÉ-CONSULTA', blocos)
  await auditar(event, 'exportou respostas de formulário', 'formulario_envio', id)
  const nome = `pre-consulta-${(c?.nome ?? 'cliente').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.docx`
  setHeaders(event, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': `attachment; filename="${nome}"`,
    'Cache-Control': 'private, no-store',
  })
  return buffer
})
