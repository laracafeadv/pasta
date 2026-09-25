<template>
  <button 
    v-if="isVisible"
    type="button"
    @click="navigateTo('/login')"
    class="group relative h-10 sm:h-11 inline-flex items-center gap-2 px-4 sm:px-5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-black uppercase tracking-widest border border-slate-900 dark:border-white hover:bg-transparent hover:text-slate-900 dark:hover:bg-transparent dark:hover:text-white transition-all duration-300"
  >
    <Icon name="ph:arrow-right-bold" class="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform duration-300" />
    <span>Entrar</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useSupabaseUser, navigateTo } from '#imports'

const route = useRoute()
const user = useSupabaseUser()

const isVisible = computed(() => {
  if (user.value) return false
  const hiddenPaths = ['/login', '/confirm', '/auth/confirm-password']
  return !hiddenPaths.includes(route.path)
})
</script>
