<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { definePageMeta, useHead } from '#imports'
import type { Recibo } from '~~/shared/types/crm'
import { brl, dataCurta } from '~/utils/formatadores'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Recibos' })

const recibos = ref<Recibo[]>([])
const carregando = ref(false)
async function carregar() {
  carregando.value = true
  try {
    recibos.value = await $fetch<Recibo[]>('/api/recibos')
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)

function baixar(id: number) {
  window.location.href = `/api/recibos/${id}/pdf`
}
async function excluir(r: Recibo) {
  if (!confirm(`Excluir o recibo de ${r.nome_cliente}?`)) return
  await $fetch(`/api/recibos/${r.id}`, { method: 'DELETE' })
  await carregar()
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="eyebrow">Financeiro</p>
      <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Recibos</h1>
      <p class="text-sm text-gray-500 mt-2 max-w-2xl">Todo recibo emitido fica aqui. Gere um novo direto de um honorário, em Financeiro → Honorários.</p>
    </div>

    <p v-if="carregando" class="text-sm text-gray-400">Carregando…</p>
    <p v-else-if="!recibos.length" class="text-sm text-gray-400">Nenhum recibo emitido ainda.</p>

    <div v-else class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-secondary/10 text-left text-xs uppercase tracking-wider text-gray-500">
          <tr><th class="px-4 py-3">Cliente</th><th class="px-4 py-3">Referente a</th><th class="px-4 py-3">Valor</th><th class="px-4 py-3">Data</th><th class="px-4 py-3" /></tr>
        </thead>
        <tbody>
          <tr v-for="r in recibos" :key="r.id" class="border-t border-gray-100 dark:border-zinc-800">
            <td class="px-4 py-3 font-medium text-primary dark:text-zinc-100">{{ r.nome_cliente }}</td>
            <td class="px-4 py-3 text-gray-500">{{ r.referente_a }}</td>
            <td class="px-4 py-3 font-semibold">{{ brl(r.valor) }}</td>
            <td class="px-4 py-3 text-gray-500">{{ dataCurta(r.data) }}</td>
            <td class="px-4 py-3 text-right space-x-2 whitespace-nowrap">
              <button class="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="baixar(r.id)">Baixar PDF</button>
              <button class="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-danger hover:text-danger" @click="excluir(r)">Excluir</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
