import type { ModuleOptions as NuxtLlmsOptions } from 'nuxt-llms'

declare module 'nuxt/schema' {
  interface NuxtConfig {
    llms?: NuxtLlmsOptions
  }

  interface NuxtOptions {
    llms?: NuxtLlmsOptions
  }
}

export {}
