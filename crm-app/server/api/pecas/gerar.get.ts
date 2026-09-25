import { serverSupabaseServiceRole } from '#supabase/server'
import type { Qualificacao } from '../../../shared/types/crm'
import { requireAdmin } from '../../utils/security'
import { carregarEscritorio } from '../../utils/escritorio'
import { advogadaTexto, dataExtenso, gerarDocx, nomeArquivo, qualificacaoTexto, v } from '../../utils/pecas'
import { auditar } from '../../utils/auditoria'

/** Gera uma peça a partir de um modelo, trocando {{campos}} pelos dados da cliente, do caso e do escritório. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'pecas/gerar')
  const q = getQuery(event)
  const modeloId = Number(q.modelo)
  const contatoId = Number(q.contato)
  if (!Number.isInteger(modeloId) || !Number.isInteger(contatoId)) throw createError({ statusCode: 400, message: 'Informe o modelo e a cliente.' })
  const admin = serverSupabaseServiceRole(event)
  const [{ data: modelo }, { data: contato }, { data: qual }, escritorio, { data: caso }] = await Promise.all([
    admin.from('pecas_modelos').select('*').eq('id', modeloId).single(),
    admin.from('contatos').select('nome, parte_contraria').eq('id', contatoId).single(),
    admin.from('qualificacao').select('*').eq('contato_id', contatoId).maybeSingle(),
    carregarEscritorio(admin),
    q.caso ? admin.from('casos').select('titulo, numero_processo, orgao, parte_contraria').eq('id', Number(q.caso)).eq('contato_id', contatoId).maybeSingle() : Promise.resolve({ data: null }),
  ])
  if (!modelo || !contato) throw createError({ statusCode: 404, message: 'Modelo ou cliente não encontrado.' })
  const qq = (qual ?? {}) as Partial<Qualificacao>

  const campos: Record<string, string> = {
    'cliente.nome': v(qq.nome_completo || contato.nome, 'NOME COMPLETO'),
    'cliente.qualificacao': qualificacaoTexto(qq, contato.nome),
    'cliente.cpf': v(qq.cpf, 'CPF'),
    'parte_contraria': v(caso?.parte_contraria || contato.parte_contraria, 'PARTE CONTRÁRIA'),
    'caso.numero': v(caso?.numero_processo, 'NÚMERO DO PROCESSO'),
    'caso.orgao': v(caso?.orgao, 'VARA / CARTÓRIO'),
    'caso.titulo': v(caso?.titulo, 'CASO'),
    'advogada': advogadaTexto(escritorio),
    'advogada.nome': v(escritorio.advogada_nome, 'NOME DA ADVOGADA'),
    'cidade': v(escritorio.cidade_foro || qq.cidade, 'Cidade/UF'),
    'data': dataExtenso(),
  }
  const texto = String(modelo.corpo).replace(/\{\{\s*([a-z_.]+)\s*\}\}/g, (m, k) => campos[k] ?? m)
  const [primeira, ...resto] = texto.split('\n')
  // Parágrafos separados por linha em branco; o bloco de assinatura (começa com ____) mantém as quebras.
  const blocos = resto.join('\n').split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    .flatMap(p => /^_{5,}/.test(p)
      ? p.split('\n').map(l => ({ texto: l.trim(), centro: true, espaco: 0 }))
      : [{ texto: p.replace(/\n/g, ' '), centro: p === p.toUpperCase() && p.length < 120 }])

  const buffer = await gerarDocx(primeira!.trim() || modelo.titulo, blocos)
  await auditar(event, 'gerou peça', 'contato', contatoId, { modelo: modelo.titulo })
  setHeaders(event, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': `attachment; filename="${nomeArquivo(modelo.titulo.toLowerCase(), qq.nome_completo || contato.nome)}"`,
    'Cache-Control': 'private, no-store',
  })
  return buffer
})
