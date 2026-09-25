<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { definePageMeta, useHead } from '#imports'
import Button from '~/components/Button.vue'
import { ESCRITORIO_CAMPOS, type Escritorio } from '~~/shared/types/crm'

definePageMeta({ middleware: ['auth', 'admin'] })
useHead({ title: 'Dados do escritório' })

const form = reactive<Record<string, string>>({})
const salvando = ref(false)
const mensagem = ref<string | null>(null)

onMounted(async () => {
  const dados = await $fetch<Escritorio>('/api/escritorio')
  for (const c of ESCRITORIO_CAMPOS) form[c.chave] = (dados as any)[c.chave] ?? ''
})

const grupos = computed(() => {
  const g: Record<string, typeof ESCRITORIO_CAMPOS[number][]> = {}
  for (const c of ESCRITORIO_CAMPOS) (g[c.grupo] ||= []).push(c)
  return g
})

async function salvar() {
  salvando.value = true
  mensagem.value = null
  try {
    await $fetch('/api/escritorio', { method: 'PUT', body: form })
    mensagem.value = 'Salvo. A Ana e os documentos já usam os dados novos.'
  } catch (e: any) {
    mensagem.value = e?.data?.message || 'Não foi possível salvar.'
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <div class="space-y-6 max-w-4xl">
    <div>
      <p class="eyebrow">Configuração</p>
      <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Dados do escritório</h1>
      <p class="text-sm text-gray-500 mt-2">Usados pela Ana (valor e formato da consulta, horário) e na procuração e no contrato de honorários.</p>
    </div>
    <form class="space-y-6" @submit.prevent="salvar">
      <section v-for="(campos, grupo) in grupos" :key="grupo" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-6">
        <h2 class="text-2xl text-primary dark:text-zinc-100 mb-4">{{ grupo }}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label v-for="c in campos" :key="c.chave" class="flex flex-col gap-1.5" :class="c.chave === 'endereco' ? 'sm:col-span-2' : ''">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">{{ c.rotulo }}</span>
            <input v-model="form[c.chave]" class="modal-input" :placeholder="c.exemplo" />
          </label>
        </div>
      </section>
      <div class="flex items-center gap-4">
        <Button type="submit" :loading="salvando" icon="ph:check-bold">Salvar</Button>
        <p v-if="mensagem" class="text-sm text-gray-600 dark:text-zinc-300">{{ mensagem }}</p>
      </div>
    </form>
  </div>
</template>
