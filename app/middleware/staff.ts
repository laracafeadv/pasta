import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { useProfileStore } from '../stores/profile'

// Páginas com dados de clientes: somente admin e equipe do escritório.
export default defineNuxtRouteMiddleware(async () => {
  const profileStore = useProfileStore()

  if (!profileStore.profile) {
    await profileStore.fetchMe()
  }

  const role = profileStore.profile?.role
  if (role !== 'admin' && role !== 'equipe') {
    return navigateTo('/')
  }
})
