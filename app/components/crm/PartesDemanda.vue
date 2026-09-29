<template>
  <div>
    <ul v-if="partes.length" class="text-sm divide-y divide-gray-50 dark:divide-zinc-800/60">
      <li v-for="p in partes" :key="p.id" class="py-1.5 flex flex-wrap items-baseline gap-x-2">
        <span class="font-medium">{{ p.nome }}</span>
        <span class="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500">{{ p.papel }}</span>
        <span v-if="p.telefone || p.email" class="text-xs text-gray-400">{{ [p.telefone, p.email].filter(Boolean).join(' · ') }}</span>
        <button type="button" class="ml-auto text-gray-300 hover:text-danger" title="Remover" @click="remover(p.id)"><Icon name="ph:x-bold" /></button>
      </li>
    </ul>
    <p v-else-if="!adicionando" class="text-xs text-gray-400">Nenhuma parte ou interessado registrado.</p>
    <form v-if="adicionando" class="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2 mt-2" @submit.prevent="adicionar">
      <input v-model="form.nome" class="modal-input" placeholder="Nome" required />
      <select v-model="form.papel" class="modal-input"><option v-for="p in PAPEIS_PARTE" :key="p">{{ p }}</option></select>
      <div class="flex gap-2"><Button type="submit" size="sm" :loading="salvando">Adicionar</Button><Button type="button" size="sm" variant="outline" @click="adicionando = false">Cancelar</Button></div>
      <input v-model="form.telefone" class="modal-input" placeholder="Telefone (opcional)" />
      <input v-model="form.email" class="modal-input sm:col-span-2" placeholder="E-mail (opcional)" />
    </form>
    <button v-else type="button" class="mt-1 text-xs font-semibold text-secondary-dark hover:underline" @click="adicionando = true">+ Parte ou interessado</button>
    <p v-if="erro" class="text-xs text-danger mt-1">{{ erro }}</p>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import Button from '../Button.vue'
import { PAPEIS_PARTE, type Parte } from '../../../shared/types/crm'

// Partes e interessados de uma demanda: herdeiros, cônjuge, parte contrária, testemunhas…
const props = defineProps<{ partes: Parte[]; casoId: number }>()
const emit = defineEmits<{ mudou: [] }>()

const adicionando = ref(false)
const salvando = ref(false)
const erro = ref<string | null>(null)
const form = reactive({ nome: '', papel: 'Interessado', telefone: '', email: '' })

async function adicionar() {
  salvando.value = true
  erro.value = null
  try {
    await $fetch('/api/partes', { method: 'POST', body: { ...form, caso_id: props.casoId } })
    Object.assign(form, { nome: '', telefone: '', email: '' })
    adicionando.value = false
    emit('mudou')
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível adicionar.'
  } finally {
    salvando.value = false
  }
}
async function remover(id: number) {
  const url: string = `/api/partes/${id}`
  await $fetch(url, { method: 'DELETE' })
  emit('mudou')
}
</script>
