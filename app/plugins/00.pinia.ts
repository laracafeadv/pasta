import { createPinia, setActivePinia } from 'pinia'
import { defineNuxtPlugin, useNuxtApp } from '#imports'
import { toRaw } from 'vue'

export default defineNuxtPlugin({
  name: 'pinia',
  setup(nuxtApp) {
    const pinia = createPinia()
    nuxtApp.vueApp.use(pinia)
    setActivePinia(pinia)

    if (nuxtApp.payload.pinia) {
      pinia.state.value = nuxtApp.payload.pinia
    }

    return {
      provide: { pinia },
    }
  },
  hooks: {
    'app:rendered'() {
      const nuxtApp = useNuxtApp()
      nuxtApp.payload.pinia = toRaw(nuxtApp.$pinia).state.value
      setActivePinia(undefined)
    },
  },
})
