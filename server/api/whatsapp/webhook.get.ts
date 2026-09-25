// Verificação do webhook pela Meta (feita uma vez, ao configurar o app).
export default defineEventHandler((event) => {
  const q = getQuery(event)
  const token = useRuntimeConfig().whatsappVerifyToken as string
  if (q['hub.mode'] === 'subscribe' && token && q['hub.verify_token'] === token) {
    setHeader(event, 'Content-Type', 'text/plain')
    return String(q['hub.challenge'] ?? '')
  }
  throw createError({ statusCode: 403, message: 'Token de verificação inválido.' })
})
