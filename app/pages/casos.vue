<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { definePageMeta, useHead, navigateTo } from '#imports'
import DataTable, { type ColumnDef } from '~/components/DataTable.vue'
import { STATUS_CASO, TIPOS_CASO, type Caso } from '~~/shared/types/crm'
import { brl, dataCurta } from '~/utils/formatadores'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Casos' })

const casos = ref<Caso[]>([])
const carregando = ref(false)
const busca = ref('')
const status = ref('ativo')

async function carregar() {
  carregando.value = true
  try {
    casos.value = await $fetch<Caso[]>('/api/casos', { params: { search: busca.value || undefined, status: status.value || undefined } })
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)
let t: ReturnType<typeof setTimeout> | undefined
watch([busca, status], () => { clearTimeout(t); t = setTimeout(carregar, 300) })

const columns: ColumnDef[] = [
  { key: 'titulo', label: 'Caso' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'processo', label: 'Processo / órgão' },
  { key: 'fase', label: 'Fase / valor da causa' },
  { key: 'status', label: 'Status' },
]
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="eyebrow">Dossiês</p>
      <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Casos</h1>
      <p class="text-sm text-gray-500 mt-2">Todos os casos abertos. Para abrir um novo, vá à ficha do cliente → “Casos e prazos”.</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <input v-model="busca" type="search" class="flex-1 min-w-[240px] rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm" placeholder="Buscar por título, processo ou parte contrária…" />
      <select v-model="status" class="rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm">
        <option value="">Todos</option>
        <option v-for="(n, k) in STATUS_CASO" :key="k" :value="k">{{ n }}</option>
      </select>
    </div>
    <DataTable :columns="columns" :data="casos" :loading="carregando" :total="casos.length" :page-size="300" @row-click="(k: Caso) => navigateTo({ path: '/crm', query: { aba: 'contatos', abrir: k.contato_id } })">
      <template #cell-titulo="{ item }"><p class="font-semibold">{{ item.titulo }}</p><p class="text-xs text-gray-500">{{ TIPOS_CASO[item.tipo] }} · desde {{ dataCurta(item.data_abertura) }}</p></template>
      <template #cell-cliente="{ item }">{{ item.contato?.nome }}</template>
      <template #cell-processo="{ item }"><p class="font-mono text-xs">{{ item.numero_processo || '—' }}</p><p class="text-xs text-gray-500">{{ [item.orgao, item.comarca && `${item.comarca}/${item.uf}`].filter(Boolean).join(' · ') }}</p></template>
      <template #cell-fase="{ item }"><p class="text-xs">{{ item.fase_processual || '—' }}</p><p class="text-xs text-gray-500">{{ item.valor_causa ? brl(item.valor_causa) : '' }}</p></template>
      <template #cell-status="{ item }"><span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800">{{ STATUS_CASO[item.status] }}</span></template>
    </DataTable>
  </div>
</template>
