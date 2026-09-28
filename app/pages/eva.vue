<template>
  <NuxtLayout>
    <div id="eva-page">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        
        <!-- Header & Tabs -->
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p class="eyebrow">Ana</p>
            <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Central da Ana</h1>
            <p class="text-slate-500 dark:text-slate-400 mt-1">
              {{ activeTab === 'comercial' ? 'Toda semana, uma leitura do seu funil e das suas propostas — sem IA rodando de verdade, sem custo extra.' : 'Configuração avançada da assistente automática do WhatsApp. Não é usada no dia a dia.' }}
            </p>
          </div>

          <!-- Tab Navigation -->
          <Tabs
            v-model="activeTab"
            :tabs="[
              { label: 'Comercial', value: 'comercial', icon: 'ph:trend-up-bold' },
              { label: 'Instruções', value: 'prompt', icon: 'ph:note-pencil-bold' },
              { label: 'Base de conhecimento', value: 'dados', icon: 'ph:books-bold' },
              { label: 'Cliente ideal', value: 'mapa', icon: 'ph:heart-bold' },
              { label: 'Testar', value: 'testar', icon: 'ph:chat-circle-dots-bold' }
            ]"
          />
        </div>

        <!-- Dynamic Content -->
        <div class="mt-8 transition-all duration-500">
          <KeepAlive>
            <component :is="currentTabComponent" />
          </KeepAlive>
        </div>

      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHead } from '#imports'
import Tabs from '../components/Tabs.vue'
import EvaSystemPrompt from '../components/eva/EvaSystemPrompt.vue'
import EvaDataTab from '../components/eva/EvaDataTab.vue'
import EvaSimulador from '../components/eva/EvaSimulador.vue'
import MapaEmpatia from '../components/eva/MapaEmpatia.vue'
import EvaComercial from '../components/eva/EvaComercial.vue'

useHead({ title: 'Ana' })
definePageMeta({ middleware: ['auth', 'eva-editor'] })

const activeTab = ref<'comercial' | 'prompt' | 'dados' | 'mapa' | 'testar'>('comercial')

const currentTabComponent = computed(() => {
  return { comercial: EvaComercial, prompt: EvaSystemPrompt, dados: EvaDataTab, mapa: MapaEmpatia, testar: EvaSimulador }[activeTab.value]
})
</script>
