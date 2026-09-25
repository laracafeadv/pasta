<template>
  <div class="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" @click.self="$emit('close')">
    <div class="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] rounded-2xl shadow-2xl w-full max-w-7xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-100 dark:border-[#30363d] bg-slate-50/50 dark:bg-[#161b22] flex items-center justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-slate-400">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Histórico de Versões
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visualizando as alterações do agente <strong class="font-mono text-primary">{{ agentName }}</strong>
          </p>
        </div>
        
        <button @click="$emit('close')" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar (List) -->
        <div class="w-1/3 border-r border-slate-100 dark:border-[#30363d] bg-slate-50/30 dark:bg-transparent overflow-y-auto">
          <div v-if="store.loadingHistory" class="p-8 flex flex-col items-center justify-center text-slate-400">
            <span class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></span>
            <span class="text-xs">Carregando histórico...</span>
          </div>
          
          <div v-else-if="store.history.length === 0" class="p-8 text-center text-slate-500 text-sm">
            Nenhuma versão de histórico encontrada.
          </div>

          <div v-else class="flex flex-col">
            <button
              v-for="item in store.history"
              :key="item.history_id"
              type="button"
              @click="selectVersion(item)"
              class="text-left px-5 py-4 border-b border-slate-100 dark:border-[#30363d] hover:bg-slate-50 dark:hover:bg-[#161b22] transition-colors relative"
              :class="{ 'bg-primary/5 dark:bg-primary/10 border-l-2 border-l-primary': selectedVersionId === item.history_id }"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-medium" :class="selectedVersionId === item.history_id ? 'text-primary' : 'text-slate-700 dark:text-slate-300'">
                  Versão {{ item.version }}
                </span>
                <span class="text-[10px] text-slate-400 font-mono">{{ formatDate(item.updated_at) }}</span>
              </div>
              <div class="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                {{ item.user_email }}
              </div>
            </button>
          </div>
        </div>

        <!-- Detail View -->
        <div class="flex-1 bg-white dark:bg-[#0d1117] flex flex-col overflow-hidden relative">
          <div v-if="!selectedVersion" class="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <div class="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-slate-300 dark:text-slate-600">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <p class="text-sm">Selecione uma versão ao lado para visualizar o código.</p>
          </div>

          <template v-else>
            <div class="px-6 py-4 border-b border-slate-100 dark:border-[#30363d] bg-slate-50/50 dark:bg-[#161b22] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Diff entre o editor atual e a versão {{ selectedVersion.version }}
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Comparando o conteúdo atual do editor com o histórico selecionado.
                </p>
              </div>

              <div class="flex items-center gap-2 text-[11px] font-medium">
                <span class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  {{ diffStats.changed }} alterações
                </span>
                <span class="px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-300">
                  {{ diffStats.added }} só no atual
                </span>
                <span class="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-300">
                  {{ diffStats.removed }} só no histórico
                </span>
              </div>
            </div>

            <div class="px-6 py-3 border-b border-slate-100 dark:border-[#30363d] bg-white/80 dark:bg-[#0d1117]/80 flex flex-wrap items-center gap-2">
              <span class="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                Versão {{ selectedVersion.version }} selecionada
              </span>
              <span class="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#161b22] text-slate-500 dark:text-slate-300 text-[11px]">
                {{ selectedVersion.user_email || 'Usuário não identificado' }}
              </span>
              <span class="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#161b22] text-slate-500 dark:text-slate-300 text-[11px]">
                {{ formatDate(selectedVersion.updated_at) }}
              </span>
            </div>

            <!-- Diff Viewer -->
            <div class="flex-1 overflow-auto bg-slate-50 dark:bg-[#0d1117] custom-scrollbar">
              <div v-if="diffRows.length > 0" class="grid grid-cols-1 xl:grid-cols-2 min-w-[960px] xl:min-w-0">
                <section class="border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-[#30363d]">
                  <div class="sticky top-0 z-10 px-4 py-3 bg-slate-100/95 dark:bg-[#161b22]/95 backdrop-blur border-b border-slate-200 dark:border-[#30363d]">
                    <div class="flex items-center justify-between gap-3">
                      <div>
                        <h4 class="text-xs font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Atual</h4>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400">Conteúdo em edição</p>
                      </div>
                      <span class="text-[11px] text-slate-400">{{ currentLineCount }} linhas</span>
                    </div>
                  </div>

                  <div class="font-mono text-[12px] leading-6">
                    <div
                      v-for="(row, index) in diffRows"
                      :key="`left-${index}`"
                      class="grid grid-cols-[64px_1fr]"
                      :class="leftRowClass(row)"
                    >
                      <div class="px-3 py-1 text-right select-none border-r border-slate-200/80 dark:border-[#30363d] text-slate-400">
                        {{ row.left?.lineNumber ?? '' }}
                      </div>
                      <pre class="px-4 py-1 whitespace-pre-wrap break-words">{{ row.left?.text ?? '' }}</pre>
                    </div>
                  </div>
                </section>

                <section>
                  <div class="sticky top-0 z-10 px-4 py-3 bg-slate-100/95 dark:bg-[#161b22]/95 backdrop-blur border-b border-slate-200 dark:border-[#30363d]">
                    <div class="flex items-center justify-between gap-3">
                      <div>
                        <h4 class="text-xs font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Versão {{ selectedVersion.version }}</h4>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400">{{ formatDate(selectedVersion.updated_at) }}</p>
                      </div>
                      <span class="text-[11px] text-slate-400">{{ selectedLineCount }} linhas</span>
                    </div>
                  </div>

                  <div class="font-mono text-[12px] leading-6">
                    <div
                      v-for="(row, index) in diffRows"
                      :key="`right-${index}`"
                      class="grid grid-cols-[64px_1fr]"
                      :class="rightRowClass(row)"
                    >
                      <div class="px-3 py-1 text-right select-none border-r border-slate-200/80 dark:border-[#30363d] text-slate-400">
                        {{ row.right?.lineNumber ?? '' }}
                      </div>
                      <pre class="px-4 py-1 whitespace-pre-wrap break-words">{{ row.right?.text ?? '' }}</pre>
                    </div>
                  </div>
                </section>
              </div>

              <div v-else class="h-full flex flex-col items-center justify-center text-center px-8 py-16 text-slate-500 dark:text-slate-400">
                <div class="w-14 h-14 rounded-full bg-slate-100 dark:bg-[#161b22] flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-7 h-7">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.75v16.5m-9-16.5v16.5m-4.5-9h18" />
                  </svg>
                </div>
                <p class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ canRenderDiff ? 'Nenhuma diferença encontrada' : 'Diff desativado por tamanho' }}</p>
                <p class="text-xs mt-2 max-w-md">{{ canRenderDiff ? 'A versão selecionada é idêntica ao conteúdo atual do editor. A seleção foi aplicada e você ainda pode restaurar essa versão se quiser.' : 'O conteúdo atual ou histórico está grande demais para calcular o diff sem travar a interface. A versão selecionada continua disponível para restauração.' }}</p>
              </div>
            </div>

            <!-- Detail Footer Actions -->
            <div class="p-4 border-t border-slate-100 dark:border-[#30363d] bg-slate-50/50 dark:bg-[#161b22] flex items-center justify-between">
              <div class="text-xs text-slate-500">
                Se restaurar, o editor será substituído pelo conteúdo da versão {{ selectedVersion.version }}.
              </div>
              <Button variant="primary" size="sm" @click="handleRestore">
                Restaurar para o Editor
              </Button>
            </div>
          </template>
        </div>
      </div>
      
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useEvaPromptStore } from '../../stores/evaPrompt'
import type { PromptHistoryDTO } from '../../../shared/types/EvaSystemPromptDTO'
import Button from '../Button.vue'

const MAX_DIFF_LINES = 1200
const MAX_DIFF_OPERATIONS = 600000

interface DiffCell {
  lineNumber: number
  text: string
}

interface DiffRow {
  type: 'same' | 'changed' | 'added' | 'removed'
  left: DiffCell | null
  right: DiffCell | null
}

const props = defineProps<{
  agentName: string
  currentContent: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'restore', content: string): void
}>()

const store = useEvaPromptStore()
const selectedVersionId = ref<number | null>(null)

const selectedVersion = computed<PromptHistoryDTO | null>(() => {
  if (selectedVersionId.value === null) {
    return null
  }

  return store.history.find((item) => item.history_id === selectedVersionId.value) ?? null
})

onMounted(async () => {
  await store.fetchHistory(props.agentName)
  const firstHistoryItem = store.history[0]
  if (firstHistoryItem) {
    selectVersion(firstHistoryItem)
  }
})

function selectVersion(item: PromptHistoryDTO) {
  selectedVersionId.value = item.history_id
}

watch(
  () => store.history,
  (history) => {
    if (history.length === 0) {
      selectedVersionId.value = null
      return
    }

    if (selectedVersionId.value === null || !history.some((item) => item.history_id === selectedVersionId.value)) {
      selectedVersionId.value = history[0]?.history_id ?? null
    }
  },
  { immediate: true },
)

const diffRows = computed<DiffRow[]>(() => {
  if (!selectedVersion.value || !canRenderDiff.value) {
    return []
  }

  return buildSideBySideDiff(props.currentContent, selectedVersion.value.content)
})

const diffStats = computed(() => {
  return diffRows.value.reduce(
    (acc, row) => {
      if (row.type === 'changed') acc.changed += 1
      if (row.type === 'added') acc.added += 1
      if (row.type === 'removed') acc.removed += 1
      return acc
    },
    { changed: 0, added: 0, removed: 0 },
  )
})

const currentLineCount = computed(() => splitLines(props.currentContent).length)
const selectedLineCount = computed(() => splitLines(selectedVersion.value?.content ?? '').length)
const canRenderDiff = computed(() => {
  return currentLineCount.value <= MAX_DIFF_LINES
    && selectedLineCount.value <= MAX_DIFF_LINES
    && currentLineCount.value * selectedLineCount.value <= MAX_DIFF_OPERATIONS
})

function handleRestore() {
  if (selectedVersion.value) {
    const confirm = window.confirm(`Deseja carregar a Versão ${selectedVersion.value.version} no editor? As mudanças não serão salvas até você clicar em Salvar.`)
    if (confirm) {
      emit('restore', selectedVersion.value.content)
    }
  }
}

function splitLines(content: string): string[] {
  return content.split('\n')
}

function buildSideBySideDiff(currentContent: string, selectedContent: string): DiffRow[] {
  const leftLines = splitLines(currentContent)
  const rightLines = splitLines(selectedContent)
  const leftCount = leftLines.length
  const rightCount = rightLines.length

  const lcs = Array.from({ length: leftCount + 1 }, () => Array<number>(rightCount + 1).fill(0))

  for (let leftIndex = leftCount - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = rightCount - 1; rightIndex >= 0; rightIndex -= 1) {
      if (leftLines[leftIndex] === rightLines[rightIndex]) {
        lcs[leftIndex]![rightIndex] = (lcs[leftIndex + 1]?.[rightIndex + 1] ?? 0) + 1
      } else {
        lcs[leftIndex]![rightIndex] = Math.max(
          lcs[leftIndex + 1]?.[rightIndex] ?? 0,
          lcs[leftIndex]?.[rightIndex + 1] ?? 0,
        )
      }
    }
  }

  const rawRows: DiffRow[] = []
  let leftIndex = 0
  let rightIndex = 0

  while (leftIndex < leftCount && rightIndex < rightCount) {
    if (leftLines[leftIndex] === rightLines[rightIndex]) {
      rawRows.push({
        type: 'same',
        left: { lineNumber: leftIndex + 1, text: leftLines[leftIndex] ?? '' },
        right: { lineNumber: rightIndex + 1, text: rightLines[rightIndex] ?? '' },
      })
      leftIndex += 1
      rightIndex += 1
      continue
    }

    if ((lcs[leftIndex + 1]?.[rightIndex] ?? 0) >= (lcs[leftIndex]?.[rightIndex + 1] ?? 0)) {
      rawRows.push({
        type: 'added',
        left: { lineNumber: leftIndex + 1, text: leftLines[leftIndex] ?? '' },
        right: null,
      })
      leftIndex += 1
    } else {
      rawRows.push({
        type: 'removed',
        left: null,
        right: { lineNumber: rightIndex + 1, text: rightLines[rightIndex] ?? '' },
      })
      rightIndex += 1
    }
  }

  while (leftIndex < leftCount) {
    rawRows.push({
      type: 'added',
      left: { lineNumber: leftIndex + 1, text: leftLines[leftIndex] ?? '' },
      right: null,
    })
    leftIndex += 1
  }

  while (rightIndex < rightCount) {
    rawRows.push({
      type: 'removed',
      left: null,
      right: { lineNumber: rightIndex + 1, text: rightLines[rightIndex] ?? '' },
    })
    rightIndex += 1
  }

  const mergedRows: DiffRow[] = []
  let rowIndex = 0

  while (rowIndex < rawRows.length) {
    const row = rawRows[rowIndex]
    const nextRow = rawRows[rowIndex + 1]

    if (row?.type === 'added' && nextRow?.type === 'removed') {
      mergedRows.push({
        type: 'changed',
        left: row.left,
        right: nextRow.right,
      })
      rowIndex += 2
      continue
    }

    if (row?.type === 'removed' && nextRow?.type === 'added') {
      mergedRows.push({
        type: 'changed',
        left: nextRow.left,
        right: row.right,
      })
      rowIndex += 2
      continue
    }

    if (row) {
      mergedRows.push(row)
    }
    rowIndex += 1
  }

  return mergedRows
}

function leftRowClass(row: DiffRow): string {
  if (row.type === 'added') {
    return 'bg-sky-500/10 text-sky-900 dark:text-sky-100'
  }

  if (row.type === 'changed') {
    return 'bg-amber-500/10 text-amber-900 dark:text-amber-100'
  }

  if (row.type === 'removed') {
    return 'bg-slate-100/70 dark:bg-[#11161d] text-slate-400'
  }

  return 'bg-white dark:bg-[#0d1117] text-slate-700 dark:text-[#e6edf3]'
}

function rightRowClass(row: DiffRow): string {
  if (row.type === 'removed') {
    return 'bg-rose-500/10 text-rose-900 dark:text-rose-100'
  }

  if (row.type === 'changed') {
    return 'bg-amber-500/10 text-amber-900 dark:text-amber-100'
  }

  if (row.type === 'added') {
    return 'bg-slate-100/70 dark:bg-[#11161d] text-slate-400'
  }

  return 'bg-white dark:bg-[#0d1117] text-slate-700 dark:text-[#e6edf3]'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #30363d transparent;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}
</style>
