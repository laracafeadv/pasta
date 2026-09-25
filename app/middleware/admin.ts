import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { useProfileStore } from '../stores/profile'

export default defineNuxtRouteMiddleware(async (to, from) => {
  const profileStore = useProfileStore()
  
  // Ensure profile is loaded
  if (!profileStore.profile) {
    await profileStore.fetchMe()
  }

  if (profileStore.profile?.role !== 'admin') {
    // Redirect non-admins back to their dashboard / index
    return navigateTo('/')
  }
})
