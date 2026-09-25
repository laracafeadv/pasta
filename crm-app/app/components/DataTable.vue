<template>
  <div class="space-y-4">
    <!-- Main Table Card -->
    <div class="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg shadow-sm overflow-hidden">
      
      <!-- Slot for custom header (like title, search, filters) -->
      <slot name="header"></slot>

      <!-- Loading State -->
      <div v-if="loading" class="p-12 space-y-6">
        <div v-for="n in 5" :key="n" class="flex gap-4 items-center">
          <div class="w-10 h-10 rounded-lg bg-gray-50 dark:bg-zinc-800 animate-pulse" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-50 dark:bg-zinc-800 rounded-full animate-pulse w-1/3" />
            <div class="h-3 bg-gray-50/50 dark:bg-zinc-800/50 rounded-full animate-pulse w-1/4" />
          </div>
          <div class="w-24 h-8 rounded-lg bg-gray-50 dark:bg-zinc-800 animate-pulse" />
        </div>
      </div>

      <!-- Table Content -->
      <div v-else class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-gray-50/50 dark:bg-zinc-800/20 border-b border-gray-100 dark:border-zinc-800/50">
              <!-- Dynamically render columns -->
              <th 
                v-for="(col, index) in columns" 
                :key="col.key"
                class="px-6 py-4 select-none"
                :class="[
                  index === 0 ? 'pl-8' : '',
                  index === columns.length - 1 ? 'pr-8' : ''
                ]"
                @click="col.sortable ? emit('sort', col.key) : null"
              >
                <div 
                  class="flex flex-col gap-2"
                  :class="{
                    'items-start': !col.align || col.align === 'left',
                    'items-center': col.align === 'center',
                    'items-end': col.align === 'right'
                  }"
                >
                  <div 
                    class="flex items-center gap-2.5 group/h"
                    :class="col.sortable ? 'cursor-pointer' : ''"
                  >
                    <span class="text-[11px] font-bold text-gray-400 dark:text-zinc-500 group-hover/h:text-primary transition-colors">
                      {{ col.label }}
                    </span>
                    
                    <!-- Sorting Icon -->
                    <div v-if="col.sortable && currentSort === col.key" class="text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5 transition-transform" :class="sortOrder === 'asc' ? '' : 'rotate-180'">
                        <path fill-rule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clip-rule="evenodd" />
                      </svg>
                    </div>

                    <!-- Filter Button -->
                    <button
                      v-if="col.filterable"
                      class="p-1 rounded-md transition-colors"
                      :class="openFilter === col.key || columnFilters[col.key] ? 'text-primary bg-primary/5 border border-primary/20' : 'text-gray-300 hover:text-gray-400 dark:text-zinc-600 dark:hover:text-zinc-500'"
                      @click.stop="toggleFilter(col.key)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3 h-3">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                      </svg>
                    </button>
                  </div>

                  <!-- Filter Input Dropdown -->
                  <div 
                    v-if="col.filterable && openFilter === col.key"
                    class="w-full max-w-[150px] animate-in fade-in slide-in-from-top-1 duration-200 z-10"
                    @click.stop
                  >
                    <input
                      type="text"
                      :value="columnFilters[col.key] || ''"
                      placeholder="Buscar..."
                      class="w-full bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:border-primary focus:outline-none shadow-lg"
                      autofocus
                      @input="handleFilterInput(col.key, $event)"
                      @keydown.enter="submitFilter(col.key)"
                      @blur="submitFilter(col.key)"
                    />
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          
          <tbody class="divide-y divide-gray-100 dark:divide-zinc-800/50 relative">
            <tr
              v-for="(item, itemIndex) in data"
              :key="item[keyField] as string | number"
              class="group hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 cursor-pointer transition-colors relative z-10"
              @click="emit('row-click', item)"
            >
              <td 
                v-for="(col, colIndex) in columns" 
                :key="col.key"
                class="px-6 py-4"
                :class="[
                  colIndex === 0 ? 'px-8' : '',
                  colIndex === columns.length - 1 ? 'pr-8' : '',
                  col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                ]"
              >
                <!-- Cell Data Slot -->
                <slot :name="`cell-${col.key}`" :item="item" :column="col" :index="itemIndex">
                  <span class="text-sm font-medium text-gray-700 dark:text-zinc-300">{{ item[col.key] }}</span>
                </slot>
              </td>
            </tr>
            
            <tr v-if="data.length === 0" key="empty" class="w-full">
              <td :colspan="columns.length" class="px-8 py-24 text-center">
                <div class="flex flex-col items-center justify-center space-y-3">
                  <div class="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-3xl border border-gray-100 dark:border-zinc-700">🗄️</div>
                  <div>
                    <p class="text-base font-bold text-gray-900 dark:text-white">Nenhum registro encontrado</p>
                    <p class="text-xs text-gray-400 dark:text-zinc-500 mt-1">Ajuste seus filtros para buscar novamente</p>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div v-if="totalPages > 1" class="px-8 py-5 border-t border-gray-100 dark:border-zinc-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p class="text-xs text-gray-400 dark:text-zinc-500">
          Mostrando <span class="font-bold text-gray-900 dark:text-white">{{ rangeStart }}—{{ rangeEnd }}</span> de {{ total }} resultados
        </p>

        <div class="flex items-center gap-1.5">
          <button
            @click="emit('page-change', 1)"
            :disabled="currentPage === 1 || loading"
            class="w-9 h-9 flex items-center justify-center rounded-md bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5" />
            </svg>
          </button>
          
          <div class="flex items-center gap-1.5 mx-1">
            <template v-for="p in visiblePages" :key="p">
              <span v-if="p === '...'" class="w-6 text-center text-gray-300 dark:text-zinc-600">···</span>
              <button
                v-else
                @click="emit('page-change', p as number)"
                :class="p === currentPage ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-700'"
                class="w-9 h-9 flex items-center justify-center rounded-md border text-xs font-bold transition-colors"
              >
                {{ p }}
              </button>
            </template>
          </div>

          <button
            @click="emit('page-change', totalPages)"
            :disabled="currentPage === totalPages || loading"
            class="w-9 h-9 flex items-center justify-center rounded-md bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

export interface ColumnDef {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  filterable?: boolean
}

interface Props {
  columns: ColumnDef[]
  data: any[]
  keyField?: string
  loading?: boolean
  total?: number
  currentPage?: number
  totalPages?: number
  pageSize?: number
  currentSort?: string
  sortOrder?: 'asc' | 'desc'
  columnFilters?: Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  keyField: 'id',
  loading: false,
  total: 0,
  currentPage: 1,
  totalPages: 1,
  pageSize: 25,
  columnFilters: () => ({})
})

const emit = defineEmits<{
  'page-change': [page: number]
  'sort': [field: string]
  'column-filter': [column: string, value: string]
  'row-click': [item: any]
}>()

// Filter Dropdown state
const openFilter = ref<string | null>(null)
const tempFilterValues = ref<Record<string, string>>({})

const toggleFilter = (key: string) => {
  if (openFilter.value === key) {
    openFilter.value = null
  } else {
    openFilter.value = key
    tempFilterValues.value[key] = props.columnFilters[key] || ''
  }
}

const handleFilterInput = (key: string, e: Event) => {
  tempFilterValues.value[key] = (e.target as HTMLInputElement).value
}

const submitFilter = (key: string) => {
  emit('column-filter', key, tempFilterValues.value[key] || '')
  openFilter.value = null
}

const rangeStart = computed(() => (props.currentPage - 1) * props.pageSize + 1)
const rangeEnd = computed(() => Math.min(props.currentPage * props.pageSize, props.total))

const visiblePages = computed(() => {
  const total = props.totalPages
  const current = props.currentPage
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | string)[] = [1]
  if (current > 3) pages.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
})
</script>
