<template>
  <button
    @click="toggleDark"
    :class="[
      'h-10 w-10 sm:h-11 sm:w-11 inline-flex items-center justify-center rounded-full transition-all duration-500 relative overflow-hidden group',
      'bg-slate-100 dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/10',
      'hover:border-primary/30 dark:hover:border-white/20 hover:shadow-glow-primary active:scale-95'
    ]"
    :title="isDark ? 'Ativar modo claro' : 'Ativar modo escuro'"
  >
    <div class="relative w-5 h-5">
      <!-- Sun Icon -->
      <svg 
        class="absolute inset-0 transform transition-all duration-700 ease-out text-amber-500 dark:text-gray-400 font-bold"
        :class="[isDark ? 'rotate-90 opacity-0 scale-50' : 'rotate-0 opacity-100 scale-100']"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M16.95 16.95l1.414-1.414M7.05 7.05L5.636 5.636m12.728 12.728L12 12m0 0a4 4 0 100-8 4 4 0 000 8z" />
      </svg>
      <!-- Moon Icon -->
      <svg 
        class="absolute inset-0 transform transition-all duration-700 ease-out text-slate-400 dark:text-blue-300"
        :class="[isDark ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-50']"
        fill="currentColor" viewBox="0 0 24 24"
      >
        <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    </div>
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const isDark = ref(false)

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark')
})

function toggleDark() {
  document.documentElement.classList.toggle('dark')
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}
</script>
