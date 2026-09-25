<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { definePageMeta, useHead } from '#imports'
import DataTable, { type ColumnDef } from '~/components/DataTable.vue'
import { dataHora } from '~/utils/formatadores'

definePageMeta({ middleware: ['auth', 'admin'] })
useHead({ title: 'Auditoria' })

interface Registro { id: number; quando: string; usuario_nome: string | null; acao: string; entidade: string | null; entidade_id: string | null; detalhes: Record<string, any> | null }

const registros = ref<Registro[]>([])
const total = ref(0)
const page = ref(1)
const entidade = ref('')
const carregando = ref(false)

async function carregar() {
  carregando.value = true
  try {
    const r = await $fetch<{ registros: Registro[]; total: number }>('/api/admin/auditoria', { params: { page: page.value, entidade: entidade.value || undefined } })
    registros.value = r.registros
    total.value = r.total
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)
watch(entidade, () => { page.value = 1; carregar() })

const columns: ColumnDef[] = [
  { key: 'quando', label: 'Quando' },
  { key: 'usuario', label: 'Quem' },
  { key: 'acao', label: 'O quê' },
  { key: 'alvo', label: 'Registro' },
]
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / 50)))
const detalhe = (d: Record<string, any> | null) => {
  if (!d) return ''
  if (Array.isArray(d.campos)) return `campos: ${d.campos.join(', ')}`
  return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(' · ')
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Segurança · LGPD</p>
        <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Auditoria</h1>
        <p class="text-sm text-gray-500 mt-2 max-w-2xl">
          Quem fez o quê, e quando. Os registros não podem ser alterados nem apagados, nem pelo próprio sistema.
          Para proteger os dados, só aparecem os nomes dos campos alterados, nunca o conteúdo.
        </p>
      </div>
      <select v-model="entidade" class="rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm">
        <option value="">Tudo</option>
        <option value="contato">Contatos</option>
        <option value="honorario">Honorários</option>
        <option value="usuario">Usuários</option>
        <option value="assistente">Assistente IA</option>
        <option value="modelo">Mensagens prontas</option>
      </select>
    </div>

    <DataTable :columns="columns" :data="registros" :loading="carregando" :total="total" :current-page="page" :total-pages="totalPages" :page-size="50" @page-change="(p: number) => { page = p; carregar() }">
      <template #cell-quando="{ item }"><span class="whitespace-nowrap">{{ dataHora(item.quando) }}</span></template>
      <template #cell-usuario="{ item }">{{ item.usuario_nome || 'Sistema' }}</template>
      <template #cell-acao="{ item }">
        <p>{{ item.acao }}</p>
        <p v-if="item.detalhes" class="text-xs text-gray-500">{{ detalhe(item.detalhes) }}</p>
      </template>
      <template #cell-alvo="{ item }">
        <NuxtLink v-if="item.entidade === 'contato'" :to="`/crm?aba=contatos`" class="underline underline-offset-2">Contato #{{ item.entidade_id }}</NuxtLink>
        <span v-else>{{ item.entidade }} {{ item.entidade_id ? `#${item.entidade_id}` : '' }}</span>
      </template>
    </DataTable>
  </div>
</template>
