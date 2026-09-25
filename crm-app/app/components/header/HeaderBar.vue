<template>
  <header class="sticky top-0 z-[100] w-full px-2 sm:px-4 pt-3 pb-2 bg-gradient-to-b from-slate-100 via-slate-100/90 to-transparent dark:from-slate-950 dark:via-slate-950/90">
    <!-- Cápsula café, como o cabeçalho do site. A classe "dark" faz os componentes internos usarem as variantes claras. -->
    <div class="dark container mx-auto rounded-full bg-cafe text-cafe-creme shadow-lg shadow-black/10 px-4 sm:px-6">
      <div class="flex items-center justify-between h-14 lg:h-16 gap-3 lg:gap-6">
        <NuxtLink to="/" class="flex items-center gap-3 shrink-0 min-w-0" aria-label="Início">
          <img src="/wordmark-light.png" alt="Lara Café Advocacia & Consultoria" class="h-6 sm:h-7 w-auto select-none" />
        </NuxtLink>

        <VitePwaManifest />

        <nav v-if="user" class="hidden xl:flex items-center justify-center flex-1 gap-0.5 min-w-0">
          <NuxtLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="px-3 2xl:px-4 h-9 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] rounded-full transition-colors whitespace-nowrap"
            :class="isActive(item.path) ? 'bg-cafe-creme text-cafe' : 'text-cafe-creme/75 hover:text-cafe-creme'"
          >
            {{ item.label }}
            <span v-if="item.badge" class="min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] inline-flex items-center justify-center">{{ item.badge }}</span>
          </NuxtLink>
        </nav>

        <div class="flex items-center gap-1 sm:gap-2 shrink-0">
          <template v-if="user">
            <HeaderNotifications />
            <HeaderProfile />
          </template>
          <template v-else>
            <HeaderLoginButton />
          </template>
          <DarkModeToggle />
          <button
            v-if="user"
            class="h-10 w-10 inline-flex items-center justify-center rounded-full text-cafe-creme/80 hover:text-cafe-creme xl:hidden"
            aria-label="Abrir menu"
            @click="isMobileMenuOpen = !isMobileMenuOpen"
          >
            <Icon :name="isMobileMenuOpen ? 'ph:x-bold' : 'ph:list-bold'" class="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <nav v-show="isMobileMenuOpen" class="xl:hidden container mx-auto mt-2 rounded-3xl bg-cafe p-3 space-y-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] rounded-full"
          :class="isActive(item.path) ? 'bg-cafe-creme text-cafe' : 'text-cafe-creme/80'"
          @click="isMobileMenuOpen = false"
        >
          {{ item.label }}
          <span v-if="item.badge" class="min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] inline-flex items-center justify-center">{{ item.badge }}</span>
        </NuxtLink>
      </nav>
    </Transition>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useSupabaseUser, navigateTo } from '#imports'
import { useProfileStore } from '../../stores/profile'
import { useCrmStore } from '../../stores/crm'
import DarkModeToggle from '../DarkModeToggle.vue'
import HeaderNotifications from './HeaderNotifications.vue'
import HeaderProfile from './HeaderProfile.vue'
import HeaderLoginButton from './HeaderLoginButton.vue'

const isMobileMenuOpen = ref(false)
const route = useRoute()
const user = useSupabaseUser()
const profileStore = useProfileStore()
const { profile } = storeToRefs(profileStore)

const isPublicPage = computed(() => {
  const publicPaths = ['/', '/login', '/confirm', '/recovery', '/privacidade']
  // If user is logged in, we treat pages as "app pages" for header purposes
  if (user.value) return false
  return publicPaths.includes(route.path)
})

const crm = useCrmStore()

const navItems = computed(() => {
  const role = profile.value?.role
  if (role !== 'admin' && role !== 'equipe') return []

  const items: { label: string; path: string; badge?: number }[] = [
    { label: 'CRM', path: '/crm', badge: crm.pendencias || undefined },
    { label: 'Agenda', path: '/agenda' },
    { label: 'Casos', path: '/casos' },
    { label: 'Mensagens', path: '/mensagens' },
    { label: role === 'admin' ? 'Financeiro' : 'Honorários', path: '/honorarios' },
    { label: 'Relatórios', path: '/relatorios' },
  ]
  if (role === 'admin') {
    items.push({ label: 'Ana (IA)', path: '/eva' })
    items.push({ label: 'Configurações', path: '/admin/users' })
  }
  return items
})

// Check if a path is the currently active route
const isActive = (path: string) => {
  if (path === '/' && route.path === '/') return true
  if (path !== '/' && route.path.startsWith(path)) return true
  return false
}
</script>
