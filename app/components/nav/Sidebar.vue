<template>
  <aside class="hidden lg:flex flex-col w-60 shrink-0 bg-cafe text-cafe-creme min-h-screen px-3.5 py-6 sticky top-0">
    <NuxtLink to="/" class="px-2.5 pb-6 flex items-center gap-2.5" aria-label="Início">
      <img src="/wordmark-light.png" alt="Lara Café" class="h-6 w-auto" />
    </NuxtLink>

    <nav class="flex-1 space-y-0.5 overflow-y-auto">
      <template v-for="grupo in grupos" :key="grupo.titulo">
        <p class="text-[9px] font-bold uppercase tracking-widest text-cafe-creme/40 px-2.5 pt-4 pb-1.5">{{ grupo.titulo }}</p>
        <NuxtLink
          v-for="item in grupo.itens" :key="item.path" :to="item.path"
          class="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold transition-colors"
          :class="isActive(item.path) ? 'bg-white/10 text-white' : 'text-cafe-creme/80 hover:bg-white/5 hover:text-white'"
        >
          <Icon :name="item.icone" class="text-base shrink-0" />
          <span class="truncate">{{ item.label }}</span>
          <span v-if="item.badge" class="ml-auto min-w-[17px] h-[17px] px-1 rounded-full bg-danger text-white text-[10px] font-bold inline-flex items-center justify-center">{{ item.badge }}</span>
        </NuxtLink>
      </template>
    </nav>

    <div class="mt-4 pt-3 border-t border-white/10 flex items-center gap-2.5 px-2">
      <img v-if="profile?.avatar_url" :src="profile.avatar_url" alt="" class="w-8 h-8 rounded-full object-cover shrink-0" />
      <span v-else class="w-8 h-8 rounded-full bg-white/15 shrink-0" />
      <span class="min-w-0">
        <span class="block text-xs font-bold text-white truncate">{{ profile?.name || 'Você' }}</span>
        <NuxtLink to="/profile" class="block text-[10px] text-cafe-creme/50 hover:text-cafe-creme truncate">Meu perfil</NuxtLink>
      </span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from '#imports'
import { useProfileStore } from '../../stores/profile'
import { useCrmStore } from '../../stores/crm'

const route = useRoute()
const profileStore = useProfileStore()
const { profile } = storeToRefs(profileStore)
const crm = useCrmStore()

const grupos = computed(() => {
  const role = profile.value?.role
  if (role !== 'admin' && role !== 'equipe') return []

  const lista = [
    {
      titulo: 'O que fazer agora',
      itens: [
        { label: 'Dashboard', path: '/', icone: 'ph:squares-four-bold' },
        { label: 'Hoje', path: '/crm', icone: 'ph:sun-bold', badge: crm.pendencias || undefined },
      ] as { label: string; path: string; icone: string; badge?: number }[],
    },
    {
      titulo: 'Meus clientes',
      itens: [
        { label: 'Leads', path: '/leads', icone: 'ph:kanban-bold' },
        { label: 'Clientes', path: '/clientes', icone: 'ph:users-bold' },
        { label: 'Mensagens', path: '/mensagens', icone: 'ph:chat-circle-text-bold' },
        { label: 'Formulários', path: '/formularios', icone: 'ph:clipboard-text-bold' },
        { label: 'Remarketing', path: '/crm?aba=remarketing', icone: 'ph:arrow-counter-clockwise-bold' },
      ],
    },
    {
      titulo: 'Dinheiro',
      itens: [
        { label: role === 'admin' ? 'Financeiro' : 'Honorários', path: '/honorarios', icone: 'ph:wallet-bold' },
        { label: 'Relatórios', path: '/relatorios', icone: 'ph:chart-bar-bold' },
      ],
    },
    {
      titulo: 'Escritório',
      itens: [
        { label: 'Padrões operacionais', path: '/manual', icone: 'ph:list-checks-bold' },
      ] as { label: string; path: string; icone: string; badge?: number }[],
    },
  ]
  if (role === 'admin') {
    lista[3]!.itens.push({ label: 'Configurações', path: '/admin/escritorio', icone: 'ph:gear-bold' })
  }
  return lista
})

const isActive = (path: string) => {
  const base = path.split('?')[0]!
  if (base === '/' && route.path === '/') return true
  if (base !== '/' && route.path.startsWith(base)) {
    if (base === '/crm' && path.includes('?aba=')) return route.fullPath.includes(path.split('/crm')[1]!)
    if (base === '/crm' && !path.includes('?aba=')) return route.query.aba === undefined || route.query.aba === 'hoje'
    return true
  }
  return false
}
</script>
