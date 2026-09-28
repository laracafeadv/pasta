<template>
  <header class="sticky top-0 z-[100] w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur border-b border-gray-200/70 dark:border-zinc-800">
    <div class="flex items-center justify-between h-14 lg:h-16 gap-3 px-4 sm:px-6">
      <NuxtLink to="/" class="flex items-center gap-3 shrink-0 min-w-0 lg:hidden" aria-label="Início">
        <img src="/mono-dark.png" alt="Lara Café Advocacia & Consultoria" class="h-6 w-auto dark:invert select-none" />
      </NuxtLink>
      <VitePwaManifest />
      <span class="hidden lg:block" />

      <div class="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
        <template v-if="user">
          <HeaderSearch />
          <HeaderNotifications />
          <HeaderProfile />
        </template>
        <template v-else>
          <HeaderLoginButton />
        </template>
        <DarkModeToggle />
        <button
          v-if="user"
          class="h-10 w-10 inline-flex items-center justify-center rounded-full text-gray-500 hover:text-primary dark:text-zinc-300 lg:hidden"
          aria-label="Abrir menu"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
        >
          <Icon :name="isMobileMenuOpen ? 'ph:x-bold' : 'ph:list-bold'" class="w-6 h-6" />
        </button>
      </div>
    </div>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <nav v-show="isMobileMenuOpen" class="lg:hidden mx-3 mb-3 rounded-3xl bg-cafe p-3 space-y-1">
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
import { useRoute, useSupabaseUser } from '#imports'
import { useProfileStore } from '../../stores/profile'
import { useCrmStore } from '../../stores/crm'
import DarkModeToggle from '../DarkModeToggle.vue'
import HeaderSearch from './HeaderSearch.vue'
import HeaderNotifications from './HeaderNotifications.vue'
import HeaderProfile from './HeaderProfile.vue'
import HeaderLoginButton from './HeaderLoginButton.vue'

const isMobileMenuOpen = ref(false)
const route = useRoute()
const user = useSupabaseUser()
const profileStore = useProfileStore()
const { profile } = storeToRefs(profileStore)
const crm = useCrmStore()

// Espelha o menu lateral (Sidebar.vue), só usado abaixo do breakpoint lg onde a barra lateral some.
const navItems = computed(() => {
  const role = profile.value?.role
  if (role !== 'admin' && role !== 'equipe') return []

  const items: { label: string; path: string; badge?: number }[] = [
    { label: 'Hoje', path: '/crm', badge: crm.pendencias || undefined },
    { label: 'Leads', path: '/leads' },
    { label: 'Clientes', path: '/clientes' },
    { label: 'Casos', path: '/casos' },
    { label: 'Tarefas', path: '/tarefas' },
    { label: 'Prazos', path: '/prazos' },
    { label: 'Mensagens', path: '/mensagens' },
    { label: 'Formulários', path: '/formularios' },
    { label: 'Remarketing', path: '/crm?aba=remarketing' },
    { label: role === 'admin' ? 'Financeiro' : 'Honorários', path: '/honorarios' },
    { label: 'Recibos', path: '/recibos' },
    { label: 'Relatórios', path: '/relatorios' },
    { label: 'Padrões operacionais', path: '/manual' },
  ]
  if (role === 'admin') {
    items.push({ label: 'Ana', path: '/eva' })
    items.push({ label: 'Configurações', path: '/admin/escritorio' })
  }
  return items
})

const isActive = (path: string) => {
  if (path === '/' && route.path === '/') return true
  if (path !== '/' && route.path.startsWith(path)) return true
  return false
}
</script>
