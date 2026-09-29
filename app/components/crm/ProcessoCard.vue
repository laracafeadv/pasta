<template>
  <div class="rounded-2xl border border-gray-100 dark:border-zinc-800 p-3 text-sm" :class="processo.status === 'encerrado' ? 'opacity-70' : ''">
    <div class="flex flex-wrap items-baseline gap-2">
      <span class="text-[10px] font-bold uppercase tracking-widest" :class="processo.natureza === 'judicial' ? 'text-primary' : 'text-secondary-dark'">{{ NATUREZAS_PROCESSO[processo.natureza] }}</span>
      <span v-if="processo.numero" class="font-mono text-xs">{{ processo.numero }}</span>
      <span class="tag ml-auto">{{ STATUS_CASO[processo.status] }}</span>
    </div>
    <p class="text-xs text-gray-500 mt-0.5">
      {{ [processo.orgao, processo.comarca && `${processo.comarca}${processo.uf ? '/' + processo.uf : ''}`].filter(Boolean).join(' · ') || 'Órgão não informado' }}
      <span v-if="processo.fase"> · {{ processo.fase }}</span>
      <span v-if="processo.valor"> · {{ brl(processo.valor) }}</span>
    </p>
    <div class="flex flex-wrap gap-3 pt-1 text-xs">
      <button type="button" class="underline underline-offset-2" @click="emit('editar', processo)">Editar</button>
      <a v-if="processo.link" :href="processo.link" target="_blank" rel="noopener" class="underline underline-offset-2">Abrir no tribunal</a>
      <button type="button" class="underline underline-offset-2" @click="aberto = !aberto">{{ aberto ? 'Ocultar' : 'Movimentações' }} ({{ movimentacoes.length }})</button>
      <button type="button" class="text-gray-400 hover:text-danger ml-auto" @click="excluir">Excluir</button>
    </div>
    <div v-if="aberto" class="mt-2 border-t border-gray-100 dark:border-zinc-800 pt-2 space-y-2">
      <form class="grid grid-cols-1 sm:grid-cols-[110px_170px_1fr_auto] gap-2" @submit.prevent="registrar">
        <input v-model="nova.data" type="date" class="modal-input" />
        <select v-model="nova.tipo" class="modal-input"><option v-for="t in TIPOS_MOVIMENTACAO" :key="t">{{ t }}</option></select>
        <input v-model="nova.texto" class="modal-input" placeholder="O que aconteceu?" />
        <Button type="submit" size="sm" :disabled="!nova.texto.trim()" :loading="salvando">Registrar</Button>
      </form>
      <p v-if="!movimentacoes.length" class="text-xs text-gray-400">Sem movimentações registradas.</p>
      <ol class="border-l-2 border-gray-100 dark:border-zinc-800 ml-1">
        <li v-for="m in movimentacoes" :key="m.id" class="pl-3 pb-2 relative">
          <span class="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-primary" />
          <p class="text-xs text-gray-400">{{ dataCurta(m.data) }} · {{ m.tipo }}<button type="button" class="ml-2 text-gray-300 hover:text-danger" title="Excluir" @click="apagar(m.id)"><Icon name="ph:x-bold" /></button></p>
          <p class="whitespace-pre-wrap">{{ m.texto }}</p>
        </li>
      </ol>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import Button from '../Button.vue'
import { NATUREZAS_PROCESSO, STATUS_CASO, TIPOS_MOVIMENTACAO, type Movimentacao, type Processo } from '../../../shared/types/crm'
import { brl, dataCurta } from '../../utils/formatadores'
import { hojeISO } from '../../stores/crm'

// Um processo judicial ou procedimento extrajudicial de uma demanda, com as suas movimentações.
const props = defineProps<{ processo: Processo; movimentacoes: Movimentacao[] }>()
const emit = defineEmits<{ editar: [p: Processo]; mudou: [] }>()

const aberto = ref(false)
const salvando = ref(false)
const nova = reactive({ data: hojeISO(), tipo: 'Andamento', texto: '' })

async function registrar() {
  salvando.value = true
  try {
    const url: string = `/api/processos/${props.processo.id}/movimentacoes`
    await $fetch(url, { method: 'POST', body: { ...nova } })
    nova.texto = ''
    emit('mudou')
  } finally {
    salvando.value = false
  }
}
async function apagar(id: number) {
  const url: string = `/api/movimentacoes/${id}`
  await $fetch(url, { method: 'DELETE' })
  emit('mudou')
}
async function excluir() {
  if (!confirm('Excluir este registro e as suas movimentações? Os prazos ligados a ele continuam na demanda.')) return
  const url: string = `/api/processos/${props.processo.id}`
  await $fetch(url, { method: 'DELETE' })
  emit('mudou')
}
</script>
