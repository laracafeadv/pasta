<template>
  <NuxtLayout>
    <div id="eva-page">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        
        <!-- Header & Tabs -->
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p class="eyebrow">WhatsApp</p>
            <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Assistente de IA</h1>
            <p class="text-slate-500 dark:text-slate-400 mt-1">
              Ela faz a triagem no WhatsApp, preenche a ficha no CRM e passa para a equipe quando precisa. As regras de ética da OAB e da LGPD ficam fixas e não podem ser apagadas aqui.
            </p>
          </div>

          <!-- Tab Navigation -->
          <Tabs 
            v-model="activeTab"
            :tabs="[
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

useHead({ title: 'Assistente de IA' })
definePageMeta({ middleware: ['auth', 'eva-editor'] })

const activeTab = ref<'prompt' | 'dados' | 'mapa' | 'testar'>('prompt')

const currentTabComponent = computed(() => {
  return { prompt: EvaSystemPrompt, dados: EvaDataTab, mapa: MapaEmpatia, testar: EvaSimulador }[activeTab.value]
})
</script>
