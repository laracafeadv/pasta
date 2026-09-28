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
            v-for="item in fixos"
            :key="item.path"
            :to="item.path"
            class="px-3 2xl:px-4 h-9 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] rounded-full transition-colors whitespace-nowrap"
            :class="isActive(item.path) ? 'bg-cafe-creme text-cafe' : 'text-cafe-creme/75 hover:text-cafe-creme'"
          >
            {{ item.label }}
            <span v-if="item.badge" class="min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] inline-flex items-center justify-center">{{ item.badge }}</span>
          </NuxtLink>

          <Menu v-if="grupos.length" as="div" class="relative">
            <MenuButton class="px-3 2xl:px-4 h-9 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] rounded-full transition-colors whitespace-nowrap text-cafe-creme/75 hover:text-cafe-creme">
              Mais <Icon name="ph:caret-down-bold" class="text-[10px]" />
            </MenuButton>
            <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 -translate-y-1" leave-active-class="transition duration-100 ease-in" leave-to-class="opacity-0 -translate-y-1">
              <MenuItems class="absolute left-1/2 -translate-x-1/2 mt-3 w-[560px] max-w-[90vw] rounded-3xl bg-cafe text-cafe-creme shadow-2xl shadow-black/40 p-5 grid grid-cols-3 gap-1 focus:outline-none">
                <div v-for="grupo in grupos" :key="grupo.titulo">
                  <p class="text-[9px] font-bold uppercase tracking-widest text-cafe-creme/40 px-2.5 pb-1.5">{{ grupo.titulo }}</p>
                  <MenuItem v-for="item in grupo.itens" :key="item.path" v-slot="{ active }">
                    <NuxtLink :to="item.path" class="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold" :class="active ? 'bg-white/10' : ''">
                      {{ item.label }}
                      <span v-if="item.badge" class="min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] inline-flex items-center justify-center">{{ item.badge }}</span>
                    </NuxtLink>
                  </MenuItem>
                </div>
              </MenuItems>
            </Transition>
          </Menu>
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
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
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

// Só o essencial fica fixo no topo; o resto vive em "Mais", agrupado como no Painel inicial.
const fixos = computed(() => {
  const role = profile.value?.role
  if (role !== 'admin' && role !== 'equipe') return []
  return [
    { label: 'Hoje', path: '/crm', badge: crm.pendencias || undefined },
    { label: 'Agenda', path: '/agenda' },
  ]
})

const grupos = computed(() => {
  const role = profile.value?.role
  if (role !== 'admin' && role !== 'equipe') return []

  const lista = [
    {
      titulo: 'Meus clientes',
      itens: [
        { label: 'Funil e contatos', path: '/crm?aba=funil' },
        { label: 'Mensagens', path: '/mensagens' },
        { label: 'Remarketing', path: '/crm?aba=remarketing' },
      ],
    },
    {
      titulo: 'Dinheiro',
      itens: [
        { label: role === 'admin' ? 'Financeiro' : 'Honorários', path: '/honorarios' },
        { label: 'Relatórios', path: '/relatorios' },
      ],
    },
    {
      titulo: 'Escritório',
      itens: [{ label: 'Casos', path: '/casos' }] as { label: string; path: string }[],
    },
  ]
  if (role === 'admin') {
    lista[2]!.itens.push({ label: 'Ana (IA)', path: '/eva' }, { label: 'Manual', path: '/manual' }, { label: 'Configurações', path: '/admin/escritorio' })
  }
  return lista
})

const navItems = computed(() => [
  ...fixos.value,
  ...grupos.value.flatMap(g => g.itens),
])

// Check if a path is the currently active route
const isActive = (path: string) => {
  if (path === '/' && route.path === '/') return true
  if (path !== '/' && route.path.startsWith(path)) return true
  return false
}
</script>
