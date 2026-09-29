<template>
  <div class="space-y-2" data-testid="etapas">
    <p class="text-xs text-gray-500">Etapas formais do procedimento. A etapa em andamento é a primeira pendente; conclua ou dispense conforme o cartório avança.</p>
    <ol class="space-y-1">
      <li v-for="e in etapas" :key="e.id" class="flex flex-wrap items-center gap-2 rounded-xl px-2 py-1.5" :class="e.status === 'pendente' && e.id === atualId ? 'bg-secondary/10 border border-secondary/30' : ''" :data-testid="`etapa-${e.ordem}`">
        <button type="button" class="size-5 shrink-0 rounded-full border flex items-center justify-center text-white text-xs"
                :class="e.status === 'concluida' ? 'bg-success border-success' : e.status === 'dispensada' ? 'bg-gray-300 border-gray-300' : 'border-gray-300 bg-white dark:bg-zinc-900'"
                :title="e.status === 'pendente' ? 'Marcar como concluída' : 'Reabrir'" :data-testid="`etapa-check-${e.ordem}`" @click="mudar(e, e.status === 'pendente' ? 'concluida' : 'pendente')">
          <Icon v-if="e.status === 'concluida'" name="ph:check-bold" /><Icon v-else-if="e.status === 'dispensada'" name="ph:minus-bold" />
        </button>
        <span class="flex-1 min-w-[12rem] text-sm" :class="e.status !== 'pendente' ? 'text-gray-400 line-through decoration-gray-300' : ''">{{ e.titulo }}<span v-if="e.status === 'dispensada'" class="ml-1 text-[10px] uppercase tracking-wider">dispensada</span></span>
        <span v-if="e.status === 'pendente' && e.data_prevista" class="text-xs" :class="e.data_prevista < hoje ? 'text-danger font-semibold' : 'text-gray-400'">previsto {{ dataCurta(e.data_prevista) }}</span>
        <span v-else-if="e.concluida_em" class="text-xs text-gray-400">{{ dataCurta(e.concluida_em) }}</span>
        <input v-if="e.status === 'pendente'" type="date" class="text-xs rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-1.5 py-0.5" title="Data prevista" :value="e.data_prevista ?? ''" @change="ajustar(e, { data_prevista: ($event.target as HTMLInputElement).value || null })" />
        <button v-if="e.status === 'pendente'" type="button" class="text-[11px] text-gray-400 hover:text-primary underline" :data-testid="`etapa-dispensar-${e.ordem}`" @click="mudar(e, 'dispensada')">dispensar</button>
        <button type="button" class="text-gray-300 hover:text-danger" title="Remover etapa" @click="remover(e)"><Icon name="ph:x-bold" /></button>
      </li>
    </ol>
    <form class="flex gap-2" @submit.prevent="adicionar">
      <input v-model="nova" class="modal-input flex-1" placeholder="Nova etapa (ex.: cumprir exigência do cartório)" maxlength="200" data-testid="etapa-nova" />
      <Button size="sm" type="submit" :disabled="!nova.trim()" data-testid="etapa-adicionar">Adicionar etapa</Button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from '../Button.vue'
import type { ProcessoEtapa } from '~~/shared/data/procedimentos'
import { dataCurta } from '../../utils/formatadores'
import { hojeISO } from '../../stores/crm'

const props = defineProps<{ processoId: number; etapas: ProcessoEtapa[] }>()
const emit = defineEmits<{ mudou: [] }>()
const hoje = hojeISO()
const nova = ref('')
const atualId = computed(() => props.etapas.find(e => e.status === 'pendente')?.id ?? null)
async function put(id: number, body: Record<string, unknown>) {
  const url: string = `/api/processo-etapas/${id}`
  await $fetch(url, { method: 'PUT', body })
  emit('mudou')
}
const mudar = (e: ProcessoEtapa, status: string) => put(e.id, { status })
const ajustar = (e: ProcessoEtapa, campos: Record<string, unknown>) => put(e.id, campos)
async function remover(e: ProcessoEtapa) {
  if (!confirm(`Remover a etapa "${e.titulo}"?`)) return
  const url: string = `/api/processo-etapas/${e.id}`
  await $fetch(url, { method: 'DELETE' })
  emit('mudou')
}
async function adicionar() {
  if (!nova.value.trim()) return
  const url: string = `/api/processos/${props.processoId}/etapas`
  await $fetch(url, { method: 'POST', body: { titulo: nova.value } })
  nova.value = ''
  emit('mudou')
}
</script>
