<template>
  <div class="space-y-4">
    <form class="flex gap-2" @submit.prevent="adicionar">
      <input v-model="novoTitulo" type="text" class="flex-1 rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm" placeholder="Nova tarefa… (entra em Hoje)" />
      <button type="submit" class="px-5 py-2 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider">Adicionar</button>
    </form>

    <p v-if="carregando" class="text-sm text-gray-400">Carregando…</p>
    <div v-else class="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      <section
        v-for="col in colunas" :key="col.id"
        class="w-72 shrink-0 rounded-3xl bg-gray-200/50 dark:bg-zinc-900/60 p-3 min-h-[200px] transition-shadow"
        :class="{ 'ring-2 ring-secondary ring-inset': arrastandoSobre === col.id }"
        @dragover.prevent="arrastandoSobre = col.id"
        @dragleave="arrastandoSobre = null"
        @drop.prevent="soltar(col.id, $event)"
      >
        <header class="flex items-baseline justify-between px-2 pt-1 pb-2.5">
          <h2 class="text-sm font-bold text-primary dark:text-zinc-100">{{ col.nome }}</h2>
          <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800">{{ col.itens.length }}</span>
        </header>
        <p v-if="!col.itens.length" class="text-xs italic text-gray-400 px-2 py-3">Nada por aqui.</p>
        <article
          v-for="t in col.itens" :key="t.id"
          draggable="true"
          class="rounded-2xl bg-white dark:bg-zinc-800 p-3 mb-2 cursor-grab shadow-sm hover:shadow-md transition-shadow"
          @dragstart="$event.dataTransfer?.setData('text/plain', String(t.id))"
        >
          <p class="font-semibold text-sm text-primary dark:text-zinc-100">{{ t.titulo }}</p>
          <p v-if="t.descricao" class="text-xs text-gray-500 mt-0.5">{{ t.descricao }}</p>
          <div class="flex gap-2 mt-2">
            <button type="button" class="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary text-white" @click="concluir(t)">Feita</button>
            <button type="button" class="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-danger hover:text-danger" @click="excluir(t)">Excluir</button>
          </div>
        </article>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { COLUNAS_TAREFA, type TarefaInterna } from '~~/shared/types/crm'

const tarefas = ref<TarefaInterna[]>([])
const carregando = ref(false)
const novoTitulo = ref('')
const arrastandoSobre = ref<string | null>(null)

async function carregar() {
  carregando.value = true
  try {
    tarefas.value = await $fetch<TarefaInterna[]>('/api/tarefas')
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)

const colunas = computed(() =>
  (Object.keys(COLUNAS_TAREFA) as (keyof typeof COLUNAS_TAREFA)[]).map(id => ({
    id, nome: COLUNAS_TAREFA[id],
    itens: tarefas.value.filter(t => t.coluna === id),
  })),
)

async function adicionar() {
  const titulo = novoTitulo.value.trim()
  if (!titulo) return
  const t = await $fetch<TarefaInterna>('/api/tarefas', { method: 'POST', body: { titulo, coluna: 'hoje' } })
  tarefas.value.push(t)
  novoTitulo.value = ''
}

async function concluir(t: TarefaInterna) {
  tarefas.value = tarefas.value.filter(x => x.id !== t.id)
  await $fetch(`/api/tarefas/${t.id}`, { method: 'PATCH', body: { concluida: true } })
}

async function excluir(t: TarefaInterna) {
  if (!confirm(`Excluir "${t.titulo}"?`)) return
  tarefas.value = tarefas.value.filter(x => x.id !== t.id)
  await $fetch(`/api/tarefas/${t.id}`, { method: 'DELETE' })
}

async function soltar(coluna: string, e: DragEvent) {
  arrastandoSobre.value = null
  const id = Number(e.dataTransfer?.getData('text/plain'))
  const t = tarefas.value.find(x => x.id === id)
  if (!t || t.coluna === coluna) return
  t.coluna = coluna as TarefaInterna['coluna']
  await $fetch(`/api/tarefas/${id}`, { method: 'PATCH', body: { coluna } })
}
</script>
