export function limparPecaModelo(body: Record<string, any>) {
  const titulo = String(body?.titulo ?? '').trim().slice(0, 120)
  const corpo = String(body?.corpo ?? '').replace(/\r\n/g, '\n').trim().slice(0, 30000)
  if (!titulo || !corpo) throw createError({ statusCode: 400, message: 'Informe título e texto.' })
  return { titulo, corpo, categoria: String(body?.categoria ?? '').trim().slice(0, 60) || 'Geral', ativo: body?.ativo !== false }
}
