<template>
  <div class="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
    <div class="p-2 border-b border-gray-100 dark:border-zinc-800">
      <input
        ref="buscaInput"
        v-model="busca"
        class="w-full rounded-lg bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none"
        placeholder="Buscar mensagem pronta ou atalho (/followup-24h)…"
        @keydown.esc="emit('fechar')"
        @keydown.enter.prevent="filtrados[0] && usar(filtrados[0])"
      />
    </div>
    <div class="max-h-72 overflow-y-auto">
      <p v-if="carregando" class="p-4 text-sm text-gray-400">Carregando…</p>
      <p v-else-if="!filtrados.length" class="p-4 text-sm text-gray-400">Nenhuma mensagem encontrada. Cadastre em “Mensagens”.</p>
      <template v-for="(grupo, cat) in agrupados" :key="cat">
        <p class="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-secondary-dark dark:text-secondary-200">{{ cat }}</p>
        <button
          v-for="m in grupo"
          :key="m.id"
          type="button"
          class="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800"
          :class="m.atalho === sugerido ? 'bg-primary/5' : ''"
          @click="usar(m)"
        >
          <span class="text-sm font-semibold">{{ m.titulo }}</span>
          <span class="ml-2 text-xs font-mono text-gray-400">{{ m.atalho }}</span>
          <span v-if="m.atalho === sugerido" class="ml-2 text-[10px] font-semibold uppercase text-primary">sugerida</span>
          <span class="block text-xs text-gray-500 truncate">{{ preencher(m.texto, nomeContato, extras) }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { ModeloMensagem } from '../../../shared/types/crm'
import { useModelos } from '../../composables/useModelos'

const props = defineProps<{ filtro?: string; nomeContato?: string | null; sugerido?: string | null; extras?: Record<string, string | null | undefined> }>()
const emit = defineEmits<{ usar: [texto: string, modelo: ModeloMensagem]; fechar: [] }>()

const { modelos, carregando, carregar, preencher } = useModelos()
const busca = ref(props.filtro ?? '')
const buscaInput = ref<HTMLInputElement | null>(null)
watch(() => props.filtro, v => { if (v !== undefined) busca.value = v })

onMounted(async () => {
  await carregar()
  await nextTick()
  if (!props.filtro) buscaInput.value?.focus()
})

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const filtrados = computed(() => {
  const q = normalizar(busca.value.trim())
  const lista = !q ? modelos.value : modelos.value.filter(m =>
    normalizar(m.atalho).includes(q) || normalizar(m.titulo).includes(q) || normalizar(m.texto).includes(q) || normalizar(m.categoria).includes(q))
  // Sugestão da cadência aparece primeiro
  return [...lista].sort((a, b) => Number(b.atalho === props.sugerido) - Number(a.atalho === props.sugerido))
})
const agrupados = computed(() => {
  const g: Record<string, ModeloMensagem[]> = {}
  for (const m of filtrados.value) (g[m.atalho === props.sugerido ? 'Sugerida para a etapa' : m.categoria] ||= []).push(m)
  return g
})

function usar(m: ModeloMensagem) {
  emit('usar', preencher(m.texto, props.nomeContato, props.extras), m)
}
</script>
