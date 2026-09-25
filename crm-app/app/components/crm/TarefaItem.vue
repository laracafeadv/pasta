<template>
  <article class="py-3 border-t first:border-t-0 border-gray-200/70 dark:border-zinc-800 space-y-1.5">
    <div class="flex items-baseline justify-between gap-3">
      <button class="font-semibold text-left hover:text-secondary transition-colors" @click="emit('abrir')">
        {{ contato.nome || telefoneFormatado(contato.telefone) }}
      </button>
      <span class="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">{{ etapa(contato.etapa).nome }}</span>
    </div>
    <p v-if="semAcao" class="text-sm italic text-warning-dark dark:text-warning-300">Defina a próxima ação</p>
    <p v-else class="text-sm">{{ contato.proxima_acao }}</p>
    <p class="text-xs text-gray-500">
      {{ [contato.area, contato.demanda].filter(Boolean).join(' · ') || 'Área não definida' }}
      <template v-if="contato.proxima_data"> — {{ dataCurta(contato.proxima_data) }} · {{ diaRelativo(contato.proxima_data) }}</template>
      <span v-if="contato.urgencia === 'Alta'" class="ml-1 text-danger font-semibold">· urgente</span>
    </p>
    <div class="flex flex-wrap gap-2 pt-1">
      <button class="btn-mini bg-primary text-white hover:bg-primary-light" @click="emit('feito')">{{ semAcao ? 'Decidir próximo passo' : 'Feito' }}</button>
      <button v-if="!semAcao" class="btn-mini border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="emit('adiar')">Adiar 1 dia</button>
      <a class="btn-mini border border-gray-300 dark:border-zinc-700 hover:border-primary" :href="whatsappLink(contato.telefone)" target="_blank" rel="noopener">WhatsApp</a>
    </div>
  </article>
</template>

<script setup lang="ts">
import { etapa, type Contato } from '../../../shared/types/crm'
import { dataCurta, diaRelativo, telefoneFormatado, whatsappLink } from '../../utils/formatadores'

defineProps<{ contato: Contato; semAcao?: boolean }>()
const emit = defineEmits<{ abrir: []; feito: []; adiar: [] }>()
</script>

<style scoped>
.btn-mini { @apply text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full transition-colors; }
</style>
