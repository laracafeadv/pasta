/// <reference path="./nuxt.schema.d.ts" />
// https://nuxt.com/docs/api/configuration/nuxt-config
import type { } from './nuxt.schema'
import image from './config/nuxt-image'
import llms from './config/nuxt-llms'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  app: {
    head: {
      title: 'CRM · Lara Café Advocacia',
      htmlAttrs: { lang: 'pt-BR' },
      meta: [
        { name: 'description', content: 'CRM do escritório Lara Café Advocacia & Consultoria' },
        { name: 'theme-color', content: '#3c2923' },
        // Área restrita: não indexar
        { name: 'robots', content: 'noindex, nofollow' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Lara Café Advocacia' },
        { property: 'og:title', content: 'CRM · Lara Café Advocacia & Consultoria' },
        { property: 'og:image', content: `${process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/og-image.jpg` },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/icon-192.png' },
      ],
    },
  },
  modules: [
    '@nuxtjs/tailwindcss',
    // '@nuxt/image',
    '@nuxtjs/supabase',
    'nuxt-llms',
    '@nuxt/icon',
    '@vite-pwa/nuxt',
    '@vercel/speed-insights/nuxt',
  ],
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'CRM Lara Café',
      short_name: 'Lara Café',
      description: 'CRM do escritório Lara Café Advocacia & Consultoria',
      theme_color: '#3c2923',
      background_color: '#edeae2',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
      start_url: '/crm',
      display: 'standalone',
    },
    workbox: {
      // Pré-cache só o que toda tela usa (CSS, fontes, ícones do app). Antes entravam TODOS os
      // .js (~390 arquivos, ~10 MB), baixados de novo a cada deploy. Os chunks JS agora entram
      // no cache só quando uma tela realmente os usa (nome com hash = conteúdo imutável).
      globPatterns: ['**/*.{css,png,svg,ico,woff2,webmanifest}'],
      // App com SSR e login: não existe um "/" pré-cacheado para servir como fallback offline.
      navigateFallback: null,
      runtimeCaching: [
        {
          urlPattern: ({ url }) => url.pathname.startsWith('/_nuxt/') && url.pathname.endsWith('.js'),
          handler: 'CacheFirst',
          options: { cacheName: 'nuxt-js', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } },
        },
      ],
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 3600
    },
    devOptions: {
      enabled: false,
      type: 'module',
      suppressWarnings: true,
      navigateFallbackAllowlist: [/^\/$/]
    }
  },
  // Ícones usados no código entram no bundle do cliente: trocar de tela não dispara mais
  // requisições a /api/_nuxt_icon (uma função serverless, sujeita a cold start).
  icon: {
    clientBundle: {
      scan: true,
      // A varredura só olha app/; estes vêm de shared/types/crm.ts (TIPOS_COMPROMISSO).
      icons: ['ph:gavel-bold', 'ph:video-camera-bold', 'ph:check-square-bold', 'ph:hourglass-high-bold', 'ph:users-bold'],
      sizeLimitKb: 256,
    },
  },
  css: ['~/assets/css/main.css'],
  vite: {
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 1000,
    },
  },
  tailwindcss: {
    exposeConfig: true,
  },
  // image,
  llms,
  supabase: {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // A integração Supabase ↔ Vercel cria SUPABASE_SERVICE_ROLE_KEY; aceitamos os dois nomes.
    secretKey: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
    types: '@@/shared/types/database.types.ts',
    useSsrCookies: true,
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      include: undefined,
      exclude: ['/', '/recovery', '/privacidade', '/f/*', '/pc/*'],
      saveRedirectToCookie: false
    },
    cookieOptions: {
      maxAge: 60 * 60 * 8,
      sameSite: 'lax',
      secure: true
    }
  },
  runtimeConfig: {
    // Private — server-side only
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    mailerSenderEmail: process.env.MAILER_SENDER_EMAIL ?? '',
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    // WhatsApp Cloud API (Meta)
    whatsappToken: process.env.WHATSAPP_TOKEN ?? '',
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? '',
    whatsappAppSecret: process.env.WHATSAPP_APP_SECRET ?? '',
    // Modelo usado pela assistente no WhatsApp
    openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
      originalSiteUrl: process.env.NUXT_PUBLIC_ORIGINAL_SITE_URL ?? '',
      supabaseUrl: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
  },
  nitro: {
    // Na Vercel: tempo para a Ana responder depois do webhook (event.waitUntil) e para gerar peças.
    vercel: { functions: { maxDuration: 60 } },
    // Prevent Nitro from bundling CJS-only packages — they generate
    // invalid Windows absolute paths ('d:/...') in the ESM bundle
    externals: {
      external: ['pdf-parse', 'xlsx'],
    },
  },
})
