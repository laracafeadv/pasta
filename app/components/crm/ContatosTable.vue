<template>
  <div class="space-y-4">
    <div class="flex flex-wrap gap-2">
      <div class="relative flex-1 min-w-[240px]">
        <Icon name="ph:magnifying-glass-bold" class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input v-model="busca" type="search" class="filtro pl-10 w-full" placeholder="Buscar por nome, telefone, e-mail, parte contrária ou resumo…" />
      </div>
      <select class="filtro" :value="crm.filtros.etapa" @change="crm.setFiltro('etapa', ($event.target as HTMLSelectElement).value)">
        <option value="">Todas as etapas</option>
        <option v-for="e in ETAPAS" :key="e.id" :value="e.id">{{ e.nome }}</option>
      </select>
      <select class="filtro" :value="crm.filtros.area" @change="crm.setFiltro('area', ($event.target as HTMLSelectElement).value)">
        <option value="">Todas as áreas</option>
        <option v-for="a in Object.keys(AREAS)" :key="a">{{ a }}</option>
      </select>
      <select class="filtro" :value="crm.filtros.origem" @change="crm.setFiltro('origem', ($event.target as HTMLSelectElement).value)">
        <option value="">Todas as origens</option>
        <option v-for="o in ORIGENS" :key="o">{{ o }}</option>
      </select>
    </div>

    <DataTable
      :columns="columns"
      :data="crm.records"
      :loading="crm.loading"
      :total="crm.total"
      :current-page="crm.currentPage"
      :total-pages="crm.totalPages"
      :page-size="crm.pageSize"
      @page-change="crm.goToPage"
      @row-click="emit('abrir', $event)"
    >
      <template #cell-nome="{ item }">
        <p class="font-semibold">{{ item.nome || 'Sem nome' }}</p>
        <p class="text-xs text-gray-500">{{ telefoneFormatado(item.telefone) }}<span v-if="item.cidade"> · {{ item.cidade }}</span></p>
      </template>
      <template #cell-etapa="{ item }">
        <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800">{{ etapa(item.etapa).nome }}</span>
        <p v-if="!item.ia_ativa" class="mt-1 text-[10px] font-semibold uppercase text-warning-dark dark:text-warning-300">Você atendendo</p>
      </template>
      <template #cell-caso="{ item }">
        <p>{{ item.area || '—' }}</p>
        <p class="text-xs text-gray-500">{{ item.demanda }}<span v-if="item.urgencia === 'Alta'" class="text-danger font-semibold"> · urgente</span></p>
      </template>
      <template #cell-origem="{ item }">{{ item.origem || '—' }}</template>
      <template #cell-proxima="{ item }">
        <template v-if="!etapa(item.etapa).aberta">—</template>
        <span v-else-if="!item.proxima_acao || !item.proxima_data" class="text-warning-dark dark:text-warning-300 font-semibold">Sem próxima ação</span>
        <template v-else>
          <span :class="item.proxima_data < hoje ? 'text-danger font-semibold' : ''">{{ dataCurta(item.proxima_data) }}</span>
          <span class="text-gray-500"> · {{ item.proxima_acao }}</span>
        </template>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import DataTable, { type ColumnDef } from '../DataTable.vue'
import { AREAS, ETAPAS, ORIGENS, etapa, type Contato } from '../../../shared/types/crm'
import { hojeISO, useCrmStore } from '../../stores/crm'
import { dataCurta, telefoneFormatado } from '../../utils/formatadores'

const emit = defineEmits<{ abrir: [c: Contato] }>()
const crm = useCrmStore()
const hoje = hojeISO()

const columns: ColumnDef[] = [
  { key: 'nome', label: 'Contato' },
  { key: 'etapa', label: 'Etapa' },
  { key: 'caso', label: 'Área · Demanda' },
  { key: 'origem', label: 'Origem' },
  { key: 'proxima', label: 'Próxima ação' },
]

const busca = ref(crm.filtros.search)
let timer: ReturnType<typeof setTimeout> | undefined
watch(busca, (v) => {
  clearTimeout(timer)
  timer = setTimeout(() => crm.setFiltro('search', v), 350)
})
</script>

<style scoped>
.filtro { @apply rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm focus:outline-none focus:border-secondary; }
</style>
