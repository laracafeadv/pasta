<template>
  <NuxtLayout>
    <div id="eva-page" class="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        
        <!-- Header & Tabs -->
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h1 class="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              Assistente <span class="text-secondary">de IA</span>
            </h1>
            <p class="text-slate-500 dark:text-slate-400 mt-1">
              Personalize o comportamento e a base de conhecimento da sua assistente virtual.
            </p>
          </div>

          <!-- Tab Navigation -->
          <Tabs 
            v-model="activeTab"
            :tabs="[
              { label: 'System Prompt', value: 'prompt', icon: 'ph:terminal-window-bold' },
              { label: 'Dados', value: 'dados', icon: 'ph:database-bold' }
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

useHead({ title: 'Assistente de IA' })
definePageMeta({ middleware: ['auth', 'eva-editor'] })

const activeTab = ref<'prompt' | 'dados'>('prompt')

const currentTabComponent = computed(() => {
  return activeTab.value === 'prompt' ? EvaSystemPrompt : EvaDataTab
})
</script>
