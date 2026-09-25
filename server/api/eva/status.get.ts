import { requireAdmin } from '../../utils/security'
import { whatsappConfigurado } from '../../utils/whatsapp'

// O que está configurado para a assistente funcionar (sem expor as chaves).
export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'eva/status')
  const c = useRuntimeConfig()
  return {
    openai: Boolean(c.openaiApiKey),
    modelo: c.openaiModel || 'gpt-4.1-mini',
    whatsapp: whatsappConfigurado(),
    verificacao: Boolean(c.whatsappVerifyToken),
    assinatura: Boolean(c.whatsappAppSecret),
    webhookUrl: `${c.public.siteUrl}/api/whatsapp/webhook`,
  }
})
