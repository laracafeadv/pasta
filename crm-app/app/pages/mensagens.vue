<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { definePageMeta, useHead } from '#imports'
import Button from '~/components/Button.vue'
import Modal from '~/components/Modal.vue'
import type { ModeloMensagem } from '~~/shared/types/crm'
import { useModelos } from '~/composables/useModelos'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Mensagens prontas' })

const { invalidar } = useModelos()
const lista = ref<ModeloMensagem[]>([])
const carregando = ref(false)
const busca = ref('')
const copiadoId = ref<number | null>(null)

async function carregar() {
  carregando.value = true
  try {
    lista.value = await $fetch<ModeloMensagem[]>('/api/modelos', { params: { todos: '1' } })
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const grupos = computed(() => {
  const q = normalizar(busca.value)
  const g: Record<string, ModeloMensagem[]> = {}
  for (const m of lista.value) {
    if (q && ![m.titulo, m.atalho, m.texto, m.categoria].some(x => normalizar(x).includes(q))) continue
    ;(g[m.categoria] ||= []).push(m)
  }
  return g
})
const categorias = computed(() => [...new Set(lista.value.map(m => m.categoria))])

async function copiar(m: ModeloMensagem) {
  await navigator.clipboard?.writeText(m.texto)
  copiadoId.value = m.id
  setTimeout(() => { copiadoId.value = null }, 1500)
}

// ─── Edição ─────────────────────────────────────────────────────────────────
const aberto = ref(false)
const salvando = ref(false)
const erro = ref<string | null>(null)
const editando = ref<ModeloMensagem | null>(null)
const form = reactive({ categoria: '', titulo: '', atalho: '', texto: '', ordem: 0, ativo: true })

function abrir(m?: ModeloMensagem) {
  editando.value = m ?? null
  erro.value = null
  Object.assign(form, m ?? { categoria: categorias.value[0] ?? '1. Primeiras mensagens', titulo: '', atalho: '/', texto: '', ordem: 99, ativo: true })
  aberto.value = true
}

async function salvar() {
  salvando.value = true
  erro.value = null
  try {
    if (editando.value) await $fetch(`/api/modelos/${editando.value.id}`, { method: 'PUT', body: form })
    else await $fetch('/api/modelos', { method: 'POST', body: form })
    aberto.value = false
    invalidar()
    await carregar()
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível salvar.'
  } finally {
    salvando.value = false
  }
}

async function excluir() {
  if (!editando.value || !confirm(`Excluir a mensagem “${editando.value.titulo}”?`)) return
  await $fetch(`/api/modelos/${editando.value.id}`, { method: 'DELETE' })
  aberto.value = false
  invalidar()
  await carregar()
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Scripts que vendem</p>
        <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Mensagens prontas</h1>
        <p class="text-sm text-gray-500 mt-2 max-w-2xl">
          A mensagem certa para cada etapa da conversa. Na conversa com o cliente, digite <b>/</b> e o atalho para usar.
          <b>[NOME]</b> é preenchido sozinho; os outros campos entre colchetes você completa antes de enviar.
        </p>
      </div>
      <Button icon="ph:plus-bold" @click="abrir()">Nova mensagem</Button>
    </div>

    <input v-model="busca" type="search" class="w-full max-w-md rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm" placeholder="Buscar por título, atalho ou texto…" />

    <p v-if="carregando" class="text-sm text-gray-400">Carregando…</p>
    <section v-for="(itens, cat) in grupos" :key="cat" class="space-y-3">
      <h2 class="text-2xl text-primary dark:text-zinc-100">{{ cat }}</h2>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article v-for="m in itens" :key="m.id" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-5 flex flex-col gap-3" :class="m.ativo ? '' : 'opacity-50'">
          <header class="flex items-baseline justify-between gap-3">
            <p class="font-semibold">{{ m.titulo }} <span v-if="!m.ativo" class="text-xs text-gray-400">(desativada)</span></p>
            <code class="text-xs text-secondary-dark dark:text-secondary-200">{{ m.atalho }}</code>
          </header>
          <p class="text-sm text-gray-600 dark:text-zinc-300 whitespace-pre-wrap flex-1">{{ m.texto }}</p>
          <div class="flex gap-2">
            <button class="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="copiar(m)">{{ copiadoId === m.id ? 'Copiado!' : 'Copiar' }}</button>
            <button class="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="abrir(m)">Editar</button>
          </div>
        </article>
      </div>
    </section>

    <Modal :is-open="aberto" :title="editando ? 'Editar mensagem' : 'Nova mensagem'" max-width="2xl" :loading="salvando" @close="aberto = false">
      <form id="modelo-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="salvar">
        <label class="field">
          <span>Categoria</span>
          <input v-model="form.categoria" list="categorias" class="modal-input" required />
          <datalist id="categorias"><option v-for="c in categorias" :key="c" :value="c" /></datalist>
        </label>
        <label class="field"><span>Atalho</span><input v-model="form.atalho" class="modal-input font-mono" placeholder="/exemplo" required /></label>
        <label class="field sm:col-span-2"><span>Título</span><input v-model="form.titulo" class="modal-input" required /></label>
        <label class="field sm:col-span-2"><span>Texto</span><textarea v-model="form.texto" rows="8" class="modal-input" required /></label>
        <label class="field"><span>Ordem</span><input v-model="form.ordem" type="number" class="modal-input" /></label>
        <label class="flex items-center gap-2 text-sm mt-6"><input v-model="form.ativo" type="checkbox" class="accent-[#3c2923]" /> Ativa</label>
        <p v-if="erro" class="sm:col-span-2 text-sm text-danger">{{ erro }}</p>
      </form>
      <template #footer>
        <div class="flex flex-col-reverse sm:flex-row gap-3 justify-between">
          <Button v-if="editando" variant="outline" icon="ph:trash-bold" @click="excluir">Excluir</Button>
          <div class="flex gap-3 sm:ml-auto">
            <Button variant="outline" @click="aberto = false">Cancelar</Button>
            <Button form="modelo-form" type="submit" :loading="salvando" icon="ph:check-bold">Salvar</Button>
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
