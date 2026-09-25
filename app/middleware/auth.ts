export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  const publicRoutes = ['/recovery', '/confirm', '/privacidade']
  if (!user.value && !publicRoutes.includes(to.path)) {
    return navigateTo('/login')
  }
})
