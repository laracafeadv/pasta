<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { definePageMeta, useHead } from '#imports'
import Button from '~/components/Button.vue'
import Modal from '~/components/Modal.vue'
import type { FormularioTemplate } from '~~/shared/types/crm'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Modelos de formulário' })

const lista = ref<FormularioTemplate[]>([])
const carregando = ref(false)

async function carregar() {
  carregando.value = true
  try {
    lista.value = await $fetch<FormularioTemplate[]>('/api/formularios')
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)

const aberto = ref(false)
const salvando = ref(false)
const erro = ref<string | null>(null)
const editando = ref<FormularioTemplate | null>(null)
const form = reactive<{ nome: string; perguntas: string[] }>({ nome: '', perguntas: [''] })

function abrir(m?: FormularioTemplate) {
  editando.value = m ?? null
  erro.value = null
  form.nome = m?.nome ?? ''
  form.perguntas = m?.perguntas?.length ? [...m.perguntas] : ['']
  aberto.value = true
}

async function salvar() {
  salvando.value = true
  erro.value = null
  try {
    const body = { nome: form.nome, perguntas: form.perguntas.map(p => p.trim()).filter(Boolean) }
    if (editando.value) await $fetch(`/api/formularios/${editando.value.id}`, { method: 'PUT', body })
    else await $fetch('/api/formularios', { method: 'POST', body })
    aberto.value = false
    await carregar()
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível salvar.'
  } finally {
    salvando.value = false
  }
}

async function excluir() {
  if (!editando.value || !confirm(`Excluir o modelo "${editando.value.nome}"?`)) return
  await $fetch(`/api/formularios/${editando.value.id}`, { method: 'DELETE' })
  aberto.value = false
  await carregar()
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Pré-consulta</p>
        <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Modelos de formulário</h1>
        <p class="text-sm text-gray-500 mt-2 max-w-2xl">
          Monte aqui conjuntos de perguntas prontos (ex.: "Divórcio com filhos", "Inventário") para reaproveitar
          quando for gerar o formulário pré-consulta de um caso, em vez de digitar tudo de novo toda vez.
          O resumo livre da cliente vai sempre — isso aqui é só o extra, específico do tipo de caso.
        </p>
      </div>
      <Button icon="ph:plus-bold" @click="abrir()">Novo modelo</Button>
    </div>

    <p v-if="carregando" class="text-sm text-gray-400">Carregando…</p>
    <p v-else-if="!lista.length" class="text-sm text-gray-400">Nenhum modelo ainda. Crie o primeiro com "Novo modelo".</p>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <article v-for="m in lista" :key="m.id" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border-l-[3px] border-secondary border-y border-r border-gray-200/70 dark:border-zinc-800 p-5 flex flex-col gap-3">
        <header class="flex items-baseline justify-between gap-3">
          <p class="font-semibold">{{ m.nome }}</p>
          <span class="text-xs text-gray-400">{{ m.perguntas.length }} pergunta(s)</span>
        </header>
        <ul class="text-sm text-gray-600 dark:text-zinc-300 space-y-1 flex-1">
          <li v-for="(p, i) in m.perguntas" :key="i" class="flex gap-2"><Icon name="ph:question-bold" class="text-secondary mt-0.5 shrink-0" />{{ p }}</li>
        </ul>
        <div class="flex gap-2">
          <button class="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="abrir(m)">Editar</button>
        </div>
      </article>
    </div>

    <Modal :is-open="aberto" :title="editando ? 'Editar modelo' : 'Novo modelo'" description="As perguntas viram opções ao enviar o formulário pré-consulta de um caso." max-width="lg" :loading="salvando" @close="aberto = false">
      <form id="formulario-form" class="space-y-4" @submit.prevent="salvar">
        <label class="field">
          <span>Nome do modelo</span>
          <input v-model="form.nome" class="modal-input" placeholder="Ex.: Divórcio com filhos" required />
        </label>
        <div>
          <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Perguntas</span>
          <div v-for="(_, i) in form.perguntas" :key="i" class="flex items-center gap-2 mt-2">
            <input v-model="form.perguntas[i]" type="text" class="modal-input flex-1" placeholder="Ex.: Há medida protetiva em vigor?" />
            <button type="button" class="text-gray-400 hover:text-danger" @click="form.perguntas.splice(i, 1)"><Icon name="ph:x-bold" /></button>
          </div>
          <button type="button" class="text-xs font-semibold text-secondary-dark hover:underline mt-2" @click="form.perguntas.push('')">+ adicionar pergunta</button>
        </div>
        <p v-if="erro" class="text-sm text-danger">{{ erro }}</p>
      </form>
      <template #footer>
        <div class="flex flex-col-reverse sm:flex-row gap-3 justify-between">
          <Button v-if="editando" variant="outline" icon="ph:trash-bold" @click="excluir">Excluir</Button>
          <div class="flex gap-3 sm:ml-auto">
            <Button variant="outline" @click="aberto = false">Cancelar</Button>
            <Button form="formulario-form" type="submit" :loading="salvando" icon="ph:check-bold">Salvar</Button>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
