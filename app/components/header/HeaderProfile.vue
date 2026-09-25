<template>
  <Dropdown align="right" width="w-64">
    <template #trigger="{ isOpen }">
      <div 
        class="h-10 sm:h-11 flex items-center gap-2 sm:gap-3 group cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 px-1.5 sm:px-3 rounded-full transition-all duration-300 border border-transparent hover:border-slate-200 dark:hover:border-white/10 select-none"
        :class="{ 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10': isOpen }"
      >
        <div class="relative shrink-0">
          <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-primary/20 text-primary dark:text-white flex items-center justify-center text-xs font-bold shadow-sm group-hover:shadow-glow-primary/20 transition-all duration-500 overflow-hidden">
            <template v-if="profile?.avatar_url">
              <img :src="profile.avatar_url" class="w-full h-full object-cover" alt="User Avatar" />
            </template>
            <template v-else>
              {{ initials }}
            </template>
          </div>
          <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-md bg-emerald-500 border-2 border-white dark:border-slate-950 shadow-sm"></span>
        </div>
        <div class="leading-tight hidden xl:block">
          <p class="text-[11px] font-bold uppercase tracking-tight transition-colors flex items-center gap-2 text-slate-900 dark:text-white group-hover:text-primary">
            {{ displayName }}
            <svg 
              class="w-3 h-3 transition-transform duration-300 shrink-0" 
              :class="{ 'rotate-180': isOpen }"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" />
            </svg>
          </p>
          <p class="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-tight truncate max-w-[140px]">
            {{ emailText }}
          </p>
        </div>
      </div>
    </template>

    <template #content="{ close }">
      <div class="px-4 py-3 border-b border-slate-100 dark:border-white/5 mb-1 sm:hidden">
        <p class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight truncate">{{ displayName }}</p>
        <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">{{ emailText }}</p>
      </div>

      <button 
        @click="() => { handleProfile(); close(); }"
        class="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-primary dark:hover:text-primary-400 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Meu Perfil
      </button>

      <button 
        v-if="profile?.role === 'admin'"
        @click="() => { handleAdmin(); close(); }"
        class="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-primary dark:hover:text-primary-400 transition-colors"
      >
        <Icon name="ph:shield-star-bold" class="w-4 h-4" />
        Painel Admin
      </button>

      <button 
        @click="() => { handleLogout(); close(); }"
        class="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-danger hover:bg-danger/5 transition-colors mt-1 border-t border-slate-100 dark:border-white/5 pt-3"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Sair da Conta
      </button>
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSupabaseUser, useSupabaseClient, navigateTo } from '#imports'
import { useProfileStore } from '../../stores/profile'
import Dropdown from '../Dropdown.vue'

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const profileStore = useProfileStore()
const { profile } = storeToRefs(profileStore)

const displayName = computed(() => {
  const metadata = user.value?.user_metadata as { name?: string } | undefined
  return profile.value?.name || metadata?.name || 'Perfil'
})

const emailText = computed(() => {
  return profile.value?.email || user.value?.email || ''
})

const initials = computed(() => {
  const name = displayName.value.trim()
  if (!name) return 'U'
  const parts = name.split(' ')
  const letters = parts.slice(0, 2).map((part) => part[0]).join('')
  return letters.toUpperCase()
})

async function handleLogout() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}

function handleProfile() {
  navigateTo('/profile')
}

function handleAdmin() {
  navigateTo('/admin/users')
}
</script>
