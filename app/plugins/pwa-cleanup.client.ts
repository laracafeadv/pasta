import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin(() => {
  // Only run in development and on the client side
  if (import.meta.dev && import.meta.client) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          // Unregister any active service worker during development 
          // to prevent "zombie" requests to /sw.js or /dev-sw.js
          registration.unregister().then((success) => {
            if (success) {
              console.log(' [PWA Debug] Service Worker removido com sucesso para evitar conflitos em desenvolvimento.')
            }
          })
        }
      })

      // Also clear any related caches to ensure a clean state
      window.caches?.keys().then((keys) => {
        keys.forEach((key) => {
          if (key.includes('workbox') || key.includes('pwa')) {
            window.caches.delete(key)
          }
        })
      })
    }
  }
})
