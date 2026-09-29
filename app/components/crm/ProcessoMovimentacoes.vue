<template>
  <div class="space-y-2" data-testid="movimentacoes">
    <form class="grid grid-cols-1 sm:grid-cols-[110px_170px_1fr_auto] gap-2" @submit.prevent="registrar">
      <input v-model="nova.data" type="date" class="modal-input" />
      <select v-model="nova.tipo" class="modal-input"><option v-for="t in TIPOS_MOVIMENTACAO.filter(x => x !== 'Conclusão')" :key="t">{{ t }}</option></select>
      <input v-model="nova.texto" class="modal-input" :placeholder="judicial ? 'O que aconteceu no processo?' : 'Contato ou andamento no cartório'" data-testid="mov-texto" />
      <Button type="submit" size="sm" :disabled="!nova.texto.trim()" :loading="salvando" data-testid="mov-registrar">Registrar</Button>
    </form>
    <p v-if="!movimentacoes.length" class="text-xs text-gray-400">Sem {{ judicial ? 'movimentações' : 'andamentos' }} registrados.</p>
    <ol class="border-l-2 border-gray-100 dark:border-zinc-800 ml-1">
      <li v-for="m in movimentacoes" :key="m.id" class="pl-3 pb-2 relative">
        <span class="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full" :class="m.tipo === 'Conclusão' ? 'bg-success' : 'bg-primary'" />
        <p class="text-xs text-gray-400">{{ dataCurta(m.data) }} · {{ m.tipo }}<button v-if="m.tipo !== 'Conclusão'" type="button" class="ml-2 text-gray-300 hover:text-danger" title="Excluir" @click="apagar(m.id)"><Icon name="ph:x-bold" /></button></p>
        <p class="whitespace-pre-wrap">{{ m.texto }}</p>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import Button from '../Button.vue'
import { TIPOS_MOVIMENTACAO, type Movimentacao } from '../../../shared/types/crm'
import { dataCurta } from '../../utils/formatadores'
import { hojeISO } from '../../stores/crm'

const props = defineProps<{ processoId: number; movimentacoes: Movimentacao[]; judicial: boolean }>()
const emit = defineEmits<{ mudou: [] }>()
const salvando = ref(false)
const nova = reactive({ data: hojeISO(), tipo: 'Andamento', texto: '' })
async function registrar() {
  salvando.value = true
  try {
    const url: string = `/api/processos/${props.processoId}/movimentacoes`
    await $fetch(url, { method: 'POST', body: { ...nova } })
    nova.texto = ''
    emit('mudou')
  } finally { salvando.value = false }
}
async function apagar(id: number) {
  const url: string = `/api/movimentacoes/${id}`
  await $fetch(url, { method: 'DELETE' })
  emit('mudou')
}
</script>
