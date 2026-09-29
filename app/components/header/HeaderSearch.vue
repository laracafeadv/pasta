<template>
  <div class="relative" v-if="canShowSearch">
    <button
      v-if="!aberta"
      type="button"
      class="h-10 w-10 sm:h-11 sm:w-11 inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
      aria-label="Buscar"
      @click="abrir"
    >
      <Icon name="ph:magnifying-glass-bold" class="w-5 h-5" />
    </button>

    <div v-else class="fixed inset-0 z-[200] bg-black/20 flex items-start justify-center pt-20 px-4" @click.self="fechar">
      <div class="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-gray-200/70 dark:border-zinc-800 shadow-xl overflow-hidden">
        <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
          <Icon name="ph:magnifying-glass-bold" class="text-gray-400" />
          <input
            ref="inputEl" v-model="q" type="search"
            class="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400"
            placeholder="Buscar cliente, demanda, processo, parte, documento, tarefa…"
            @keydown.esc="fechar"
          />
          <button type="button" class="text-gray-400 hover:text-primary" @click="fechar"><Icon name="ph:x-bold" /></button>
        </div>

        <div class="max-h-96 overflow-y-auto">
          <p v-if="q.trim().length < 2" class="px-4 py-6 text-xs text-gray-400 text-center">Digite pelo menos 2 letras.</p>
          <p v-else-if="carregando" class="px-4 py-6 text-xs text-gray-400 text-center">Buscando…</p>
          <p v-else-if="!resultados.length" class="px-4 py-6 text-xs text-gray-400 text-center">Nada encontrado.</p>
          <button
            v-for="(r, i) in resultados" :key="`${r.tipo}-${i}`" type="button"
            class="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-secondary/10 dark:hover:bg-white/5 border-b border-gray-50 dark:border-zinc-800/60 last:border-b-0"
            @click="ir(r.link)"
          >
            <span class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-secondary/15 text-secondary-dark">
              <Icon :name="ICONE[r.tipo]" class="text-sm" />
            </span>
            <span class="min-w-0">
              <span class="block text-sm font-semibold text-primary dark:text-zinc-100 truncate">{{ r.titulo }}</span>
              <span class="block text-xs text-gray-400 truncate">{{ r.subtitulo }}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { navigateTo } from '#imports'
import { storeToRefs } from 'pinia'
import { useSupabaseUser } from '#imports'
import { useProfileStore } from '../../stores/profile'

interface Resultado { tipo: 'contato' | 'caso' | 'processo' | 'parte' | 'documento' | 'tarefa'; titulo: string; subtitulo: string; link: string }
const ICONE: Record<string, string> = { contato: 'ph:user-bold', caso: 'ph:briefcase-bold', processo: 'ph:gavel-bold', parte: 'ph:users-three-bold', documento: 'ph:file-text-bold', tarefa: 'ph:check-square-bold' }

const user = useSupabaseUser()
const profileStore = useProfileStore()
const { profile } = storeToRefs(profileStore)
const canShowSearch = computed(() => !!user.value && (profile.value?.role === 'admin' || profile.value?.role === 'equipe'))

const aberta = ref(false)
const q = ref('')
const resultados = ref<Resultado[]>([])
const carregando = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)
let debounce: ReturnType<typeof setTimeout> | undefined

function abrir() {
  aberta.value = true
  q.value = ''
  resultados.value = []
  nextTick(() => inputEl.value?.focus())
}
function fechar() {
  aberta.value = false
}
function ir(link: string) {
  fechar()
  navigateTo(link)
}

watch(q, (v) => {
  clearTimeout(debounce)
  if (v.trim().length < 2) { resultados.value = []; return }
  debounce = setTimeout(async () => {
    carregando.value = true
    try {
      resultados.value = await $fetch<Resultado[]>('/api/busca', { params: { q: v.trim() } })
    } finally {
      carregando.value = false
    }
  }, 300)
})
</script>
