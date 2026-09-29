<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { definePageMeta, useHead, useRoute, navigateTo } from '#imports'

definePageMeta({ middleware: ['auth', 'staff'] })

// Clientes, Casos, Tarefas e Prazos numa tela só — cada aba é um painel. A aba fica na URL
// (?aba=casos) pra dar pra voltar direto nela e pros links antigos (/casos, /tarefas, /prazos).
const ABAS = [
  { id: 'clientes', label: 'Clientes', icone: 'ph:users-bold', painel: defineAsyncComponent(() => import('~/components/clientes/PainelClientes.vue')) },
  { id: 'casos', label: 'Demandas', icone: 'ph:briefcase-bold', painel: defineAsyncComponent(() => import('~/components/clientes/PainelCasos.vue')) },
  { id: 'tarefas', label: 'Tarefas', icone: 'ph:check-square-bold', painel: defineAsyncComponent(() => import('~/components/clientes/PainelTarefas.vue')) },
  { id: 'prazos', label: 'Prazos', icone: 'ph:hourglass-high-bold', painel: defineAsyncComponent(() => import('~/components/clientes/PainelPrazos.vue')) },
] as const

const route = useRoute()
const aba = computed(() => ABAS.find(a => a.id === route.query.aba) ?? ABAS[0])
useHead(() => ({ title: aba.value.label }))

function trocar(id: string) {
  navigateTo({ path: '/clientes', query: id === 'clientes' ? {} : { aba: id } }, { replace: true })
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="eyebrow">Carteira</p>
      <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Clientes</h1>
    </div>

    <nav class="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-zinc-800 -mx-1 px-1" aria-label="Seções">
      <button
        v-for="a in ABAS" :key="a.id" type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 -mb-px border-b-2 text-sm font-semibold whitespace-nowrap transition-colors"
        :class="aba.id === a.id ? 'border-primary text-primary dark:text-zinc-100 dark:border-zinc-100' : 'border-transparent text-gray-500 hover:text-primary'"
        :aria-current="aba.id === a.id ? 'page' : undefined"
        @click="trocar(a.id)"
      >
        <Icon :name="a.icone" class="text-base" />{{ a.label }}
      </button>
    </nav>

    <KeepAlive>
      <component :is="aba.painel" :key="aba.id" />
    </KeepAlive>
  </div>
</template>
