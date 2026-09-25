import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { useProfileStore } from '../stores/profile'

// Configuração da assistente de IA: somente admin (o prompt define o que a IA diz aos clientes).
export default defineNuxtRouteMiddleware(async () => {
  const profileStore = useProfileStore()

  if (!profileStore.profile) {
    await profileStore.fetchMe()
  }

  if (profileStore.profile?.role !== 'admin') {
    return navigateTo('/')
  }
})
