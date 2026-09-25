<template>
  <div 
    class="rounded-lg border transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md"
    :class="[
      isStrategic ? 'border-primary/30 bg-primary/[0.02]' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d1117]',
      isCritical ? 'border-red-500/30 bg-red-500/[0.02]' : ''
    ]"
  >
    <!-- Card Header -->
    <div 
      class="px-5 py-4 flex items-center justify-between border-b transition-colors"
      :class="[
        isStrategic ? 'bg-primary/5 border-primary/10' : 'bg-slate-50/50 dark:bg-white/[0.02] border-slate-100 dark:border-white/5',
        isCritical ? 'bg-red-500/5 border-red-500/10' : ''
      ]"
    >
      <div class="flex items-center gap-3">
        <div 
          class="w-2.5 h-2.5 rounded-full"
          :class="[
            isStrategic && !isCritical ? 'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-300 dark:bg-slate-600',
            isCritical ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse' : ''
          ]"
        ></div>
        <h3 class="text-sm font-black uppercase tracking-widest" :class="isStrategic ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'">
          {{ title }}
        </h3>
        <span 
          v-if="isStrategic" 
          class="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-tighter"
          :class="isCritical ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'"
        >
          {{ isCritical ? 'Crítico' : 'Estratégico' }}
        </span>
      </div>
      
      <div class="flex items-center gap-2">
        <button 
          @click="isEditing = !isEditing"
          class="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 transition-colors"
        >
          <Icon :name="isEditing ? 'ph:check-bold' : 'ph:pencil-simple-bold'" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Card Content -->
    <div class="p-5">
      <div v-if="!isEditing" class="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 font-medium line-clamp-6 whitespace-pre-wrap">
        {{ content }}
      </div>
      <textarea
        v-else
        v-model="editContent"
        @input="$emit('update:content', editContent)"
        class="w-full h-48 p-4 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary/50 transition-all font-mono text-sm leading-relaxed"
      ></textarea>
    </div>

    <!-- Alert for Critical Sections -->
    <div v-if="isCritical" class="px-5 pb-4">
      <div class="flex items-center gap-2 text-[10px] font-bold text-red-500/80 uppercase">
        <Icon name="ph:warning-circle-bold" class="w-3.5 h-3.5" />
        Atenção: Mudanças aqui alteram o núcleo da EVA.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps<{
  id: string
  title: string
  content: string
  isStrategic: boolean
}>()

const emit = defineEmits(['update:content'])

const isEditing = ref(false)
const editContent = ref(props.content)

const isCritical = computed(() => {
  return ['identidade', 'ferramentas', 'proibicoes'].includes(props.id)
})

watch(() => props.content, (newVal) => {
  editContent.value = newVal
})
</script>
