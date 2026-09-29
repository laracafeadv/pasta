<template>
  <div class="space-y-3">
    <div class="flex flex-wrap gap-2 items-center">
      <Button size="sm" variant="outline" icon="ph:list-checks-bold" :loading="gerando" @click="gerar">
        {{ docs.length ? 'Completar a lista' : casoId ? 'Gerar lista deste procedimento' : 'Gerar lista da área' }}
      </Button>
      <Button v-if="pendentes.length" size="sm" icon="ph:whatsapp-logo-bold" @click="emit('cobrar', pendentes, recebidos)">Cobrar pendentes</Button>
      <span class="ml-auto text-xs text-gray-500">{{ recebidos.length }} recebido(s) · {{ pendentes.length }} pendente(s)</span>
    </div>
    <p v-if="!docs.length" class="text-sm text-gray-400">Nenhum documento listado.</p>
    <ul class="divide-y divide-gray-100 dark:divide-zinc-800">
      <li v-for="d in docs" :key="d.id" class="flex items-center gap-3 py-2 text-sm">
        <Icon :name="d.status === 'recebido' ? 'ph:check-circle-fill' : d.status === 'dispensado' ? 'ph:minus-circle' : 'ph:circle'" :class="d.status === 'recebido' ? 'text-success' : 'text-gray-400'" class="text-lg shrink-0" />
        <span class="flex-1" :class="d.status === 'dispensado' ? 'line-through text-gray-400' : ''">{{ d.descricao }} <span v-if="!d.obrigatorio" class="text-xs text-gray-400">(se houver)</span></span>
        <select :value="d.status" class="text-xs rounded-full border border-gray-200 dark:border-zinc-700 bg-transparent px-2 py-1" @change="mudar(d.id, ($event.target as HTMLSelectElement).value)">
          <option value="pendente">Pendente</option><option value="recebido">Recebido</option><option value="dispensado">Dispensado</option>
        </select>
        <button type="button" class="text-gray-400 hover:text-danger" title="Remover" @click="remover(d.id)"><Icon name="ph:x-bold" /></button>
      </li>
    </ul>
    <form class="flex gap-2" @submit.prevent="adicionar">
      <input v-model="novo" class="modal-input flex-1" placeholder="Acrescentar documento…" />
      <Button type="submit" size="sm" :disabled="!novo.trim()">Adicionar</Button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from '../Button.vue'
import type { Documento } from '../../../shared/types/crm'

// Lista de documentos de UMA demanda (casoId) ou os gerais do cliente (casoId = null).
const props = defineProps<{ docs: Documento[]; contatoId: number; casoId: number | null }>()
const emit = defineEmits<{ mudou: []; cobrar: [pendentes: Documento[], recebidos: Documento[]] }>()

const pendentes = computed(() => props.docs.filter(d => d.status === 'pendente'))
const recebidos = computed(() => props.docs.filter(d => d.status === 'recebido'))
const gerando = ref(false)
const novo = ref('')
const url: string = `/api/crm/contatos/${props.contatoId}/documentos`

async function gerar() {
  gerando.value = true
  try { await $fetch(url, { method: 'POST', body: { gerar: true, caso_id: props.casoId } }); emit('mudou') } finally { gerando.value = false }
}
async function adicionar() {
  if (!novo.value.trim()) return
  await $fetch(url, { method: 'POST', body: { descricao: novo.value, caso_id: props.casoId } })
  novo.value = ''
  emit('mudou')
}
async function mudar(id: number, status: string) {
  const u: string = `/api/documentos/${id}`
  await $fetch(u, { method: 'PATCH', body: { status } })
  emit('mudou')
}
async function remover(id: number) {
  const u: string = `/api/documentos/${id}`
  await $fetch(u, { method: 'DELETE' })
  emit('mudou')
}
</script>
