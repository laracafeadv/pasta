
<template>
  <div class="min-h-screen flex bg-slate-100 dark:bg-slate-950 text-[#2c2c2c] dark:text-slate-100 font-sans selection:bg-primary/30">
    <NuxtRouteAnnouncer />
    <Sidebar v-if="!semMoldura" />
    <div class="flex-1 min-w-0 flex flex-col">
      <HeaderBar v-if="!semMoldura" />
      <main class="flex-1" :class="[route.path !== '/' && showHeader ? 'max-w-7xl mx-auto w-full px-4 py-8 md:px-8 md:py-12' : '']">
        <NuxtPage />
      </main>
      <FooterBar v-if="!semMoldura" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useHead } from '#imports'
import HeaderBar from './components/header/HeaderBar.vue'
import FooterBar from './components/footer/FooterBar.vue'
import Sidebar from './components/nav/Sidebar.vue'

const route = useRoute()

const showHeader = computed(() => {
  const publicPages = ['/', '/login', '/confirm', '/recovery', '/privacidade']
  return !publicPages.includes(route.path) && !route.path.startsWith('/f/') && !route.path.startsWith('/pc/')
})
// Login e formulários públicos (/f/…, /pc/…) aparecem sem o menu do CRM.
const semMoldura = computed(() => route.path === '/login' || route.path.startsWith('/f/') || route.path.startsWith('/pc/'))

const defaultTitle = 'Lara Café'
useHead({
  title: defaultTitle,
  titleTemplate: (titleChunk) => {
    return titleChunk && titleChunk !== defaultTitle ? `${titleChunk} | Lara Café` : 'CRM · Lara Café Advocacia'
  },
  meta: [
    { name: 'description', content: 'CRM do escritório Lara Café Advocacia & Consultoria' }
  ],
  link: [
    { rel: 'icon', type: 'image/png', href: '/icon-192.png' },
  ]
})
</script>

<style>
/* Estilos globais movidos para app/assets/css/main.css */
</style>

