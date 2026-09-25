<template>
  <div class="bg-white dark:bg-[#0d1117] rounded-lg border border-slate-200 dark:border-[#30363d] shadow-xl overflow-hidden flex flex-col h-[700px] lg:h-[800px] transition-all duration-300">
    
    <!-- IDE Header / Toolbar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-[#30363d] bg-slate-50/50 dark:bg-[#161b22] gap-3">
      <div class="flex flex-wrap items-center gap-2 sm:gap-4">
        <h2 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 truncate">
          {{ store.currentAgent }}.md
          <span v-if="hasUnsavedChanges" class="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0"></span>
        </h2>

        <div class="h-4 w-[1px] bg-slate-200 dark:bg-[#30363d] mx-1 hidden sm:block"></div>
        
        <div class="flex items-center gap-2">
          <!-- Normal Mode -->
          <div v-if="!isCreatingAgent" class="flex items-center gap-1.5 h-[26px]">
            <select 
              v-model="agentNameInput" 
              @change="handleAgentChange"
              class="text-[10px] sm:text-[11px] font-mono h-[26px] bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] rounded px-2 py-0 w-24 sm:w-32 outline-none text-slate-700 dark:text-slate-300 focus:border-[#2f81f7] dark:focus:border-[#2f81f7] transition-colors cursor-pointer"
            >
              <option v-for="agent in store.agents" :key="agent" :value="agent">{{ agent }}</option>
            </select>
            <button 
              @click="isCreatingAgent = true"
              class="h-[26px] bg-slate-100 dark:bg-[#21262d] hover:bg-slate-200 dark:hover:bg-[#30363d] text-slate-500 dark:text-[#8b949e] border border-slate-200 dark:border-[#30363d] rounded px-2 flex items-center justify-center transition-colors focus:outline-none gap-1"
              title="Criar novo agente"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3 h-3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span class="text-[10px] font-medium hidden xs:inline">Novo</span>
            </button>
          </div>

          <!-- Create Mode -->
          <div v-else class="flex items-center gap-1.5 h-[26px]">
            <input 
              ref="newAgentInputRef"
              v-model="newAgentName" 
              @keydown.enter="confirmNewAgent"
              @keydown.esc="cancelNewAgent"
              class="text-[10px] sm:text-[11px] font-mono h-[26px] bg-white dark:bg-[#0d1117] border border-[#2f81f7] rounded px-2 py-0 w-24 sm:w-32 outline-none text-[#2f81f7] placeholder-slate-400 transition-colors shadow-[0_0_0_1px_rgba(47,129,247,0.2)]"
              placeholder="Nome..."
            />
            <button 
              @click="confirmNewAgent"
              class="h-[26px] bg-[#2f81f7] hover:bg-[#2f81f7]/90 text-white rounded px-2 flex items-center justify-center transition-colors focus:outline-none text-[10px] font-medium"
            >
              Ok
            </button>
          </div>
        </div>
      </div>
      
      <div class="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
        <button 
          @click="showHistory = true"
          class="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-[#8b949e] hover:text-slate-700 dark:hover:text-[#c9d1d9] transition-colors flex items-center gap-1.5 py-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Histórico
        </button>

        <Button 
          variant="primary" 
          size="sm" 
          :loading="store.saving" 
          @click="handleSave"
          :disabled="!hasUnsavedChanges && !store.loading"
          class="!rounded-lg transition-all !px-4"
        >
          {{ store.saving ? '...' : 'Salvar' }}
        </Button>
      </div>
    </div>

      <!-- IDE Body -->
      <div v-if="!isModularView" class="flex-1 flex overflow-hidden relative min-h-[400px]">
        
        <!-- Gutter / Line Numbers -->
        <div 
          ref="gutterRef"
          class="w-8 sm:w-12 bg-slate-50 dark:bg-[#0d1117] border-r border-slate-100 dark:border-[#30363d] flex flex-col items-end sm:pr-3 py-4 sm:py-6 select-none transition-colors duration-500 overflow-hidden shrink-0"
        >
          <div 
            v-for="n in lineCount" 
            :key="n" 
            class="text-[10px] sm:text-[11px] font-mono leading-relaxed h-[21px] flex items-center justify-end px-1.5 sm:px-0"
            :class="getItemColorClass(n)"
          >
            {{ n }}
          </div>
        </div>

        <!-- Editor Canvas -->
        <div class="flex-1 relative bg-white dark:bg-[#0d1117] overflow-hidden">
          <div 
            v-if="hasUnsavedChanges"
            class="absolute left-0 top-0 bottom-0 w-[2px] sm:w-[3px] bg-orange-500/40 z-30 transition-all duration-500"
          ></div>

          <div class="w-full h-full relative" @click="focusTextArea">
            <div 
              ref="highlightRef"
              class="absolute inset-0 w-full h-full pointer-events-none z-10 editor-layer transition-opacity duration-300"
              v-html="highlightedContent || localContent"
            ></div>

            <textarea
              ref="textareaRef"
              v-model="localContent"
              class="absolute inset-0 w-full h-full resize-none bg-transparent focus:outline-none placeholder-slate-300 dark:placeholder-slate-700 caret-primary z-20 selection:bg-primary/20 editor-layer"
              :class="{ 
                'text-transparent': highlighterReady && highlightedContent,
                'text-slate-800 dark:text-[#e6edf3]': !highlighterReady || !highlightedContent 
              }"
              placeholder="Instruções da assistente..."
              spellcheck="false"
              @scroll="syncScroll"
              @keydown.tab.prevent="insertTab"
              @input="handleInput"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Modular View Body -->
      <div v-else class="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-black/30">
        <div class="max-w-4xl mx-auto space-y-8">
          
          <!-- Summary/Intro -->
          <div class="bg-white dark:bg-[#0d1117] rounded-lg p-6 border border-slate-200 dark:border-white/10 shadow-sm flex items-start gap-4">
            <div class="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Icon name="ph:brain-bold" class="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 class="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter">Editor do prompt da assistente</h4>
              <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
                Abaixo estão as seções estruturais do prompt da assistente. As seções destacadas são estratégicas e definem a personalidade e as regras básicas da assistente.
              </p>
            </div>
          </div>

          <!-- Sections Grid -->
          <div class="grid grid-cols-1 gap-6 pb-20">
            <EvaPromptSection
              v-for="section in sections"
              :key="section.id"
              v-bind="section"
              @update:content="(newContent) => handleSectionUpdate(section.id, newContent)"
            />
          </div>
        </div>
      </div>

    <!-- IDE Footer / Status Bar -->
    <div 
      class="px-4 sm:px-6 py-2 border-t text-[10px] sm:text-[11px] font-mono flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-colors duration-300"
      :class="hasUnsavedChanges 
        ? 'bg-orange-500/5 border-orange-500/20 text-orange-600 dark:text-orange-400' 
        : 'bg-slate-50 dark:bg-[#161b22] border-slate-100 dark:border-[#30363d] text-slate-500 dark:text-[#8b949e]'"
    >
      <div class="flex flex-wrap items-center gap-3 sm:gap-4">
        <span class="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3 h-3 text-[#2f81f7]">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
          </svg>
          Markdown
        </span>
        <span class="flex items-center gap-1.5">
          {{ store.lastUpdated ? formatDate(store.lastUpdated) : 'Não salvo' }}
        </span>
        <div class="h-3 w-[1px] bg-slate-200 dark:bg-[#30363d] mx-1"></div>
        <button 
          @click="isModularView = !isModularView"
          class="flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors"
          :class="isModularView ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-slate-200 dark:hover:bg-[#30363d]'"
        >
          <Icon :name="isModularView ? 'ph:grid-four-fill' : 'ph:hash-bold'" class="w-3.5 h-3.5" />
          {{ isModularView ? 'Modo Modular ON' : 'Modo IDE' }}
        </button>
      </div>

      <div class="flex items-center justify-between w-full sm:w-auto gap-4">
        <span v-if="hasUnsavedChanges" class="flex items-center gap-1 text-orange-500 font-bold uppercase tracking-tighter shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
          MOD
        </span>
        <span class="text-slate-400 dark:text-[#484f58] whitespace-nowrap">
          L: {{ lineCount }} | Ch: {{ localContent.length }}
        </span>
      </div>
    </div>

    <!-- Alert Overlay -->
    <div v-if="feedback" class="fixed bottom-10 right-10 z-[100] animate-in slide-in-from-right-10">
      <Alert :type="feedback.type" :title="feedback.title" @close="feedback = null">
        {{ feedback.message }}
      </Alert>
    </div>

    <!-- History Modal -->
    <PromptHistoryModal 
      v-if="showHistory" 
      :agent-name="store.currentAgent"
      :current-content="localContent"
      @close="showHistory = false"
      @restore="(content) => { localContent = content; showHistory = false; handleInput() }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount, nextTick } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import Button from '../Button.vue'
import Alert from '../Alert.vue'
import { useEvaPromptStore } from '../../stores/evaPrompt'
import PromptHistoryModal from './PromptHistoryModal.vue'
import EvaPromptSection from './EvaPromptSection.vue'
import { parsePrompt, generatePrompt, type PromptSection } from '../../utils/promptParser'

const store = useEvaPromptStore()
const localContent = ref('')
const sections = ref<PromptSection[]>([])
const isModularView = ref(true)
const agentNameInput = ref(store.currentAgent)
const showHistory = ref(false)

const isCreatingAgent = ref(false)
const newAgentName = ref('')
const newAgentInputRef = ref<HTMLInputElement | null>(null)

const highlightedContent = ref('')
const highlighterReady = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const gutterRef = ref<HTMLDivElement | null>(null)
const highlightRef = ref<HTMLDivElement | null>(null)
const feedback = ref<{ type: 'success' | 'danger', title: string, message: string } | null>(null)

let highlighter: any = null

// Stats
const lineCount = computed(() => {
  if (!localContent.value) return 1
  return localContent.value.split('\n').length
})
const hasUnsavedChanges = computed(() => !store.loading && localContent.value !== store.content)

let observer: MutationObserver | null = null

// Initialization
onMounted(async () => {
  await store.fetchAgents()
  agentNameInput.value = store.currentAgent
  await loadData()
  
  // Refresh protection
  window.onbeforeunload = (e) => {
    if (hasUnsavedChanges.value) {
      e.preventDefault()
      e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?'
      return e.returnValue
    }
  }

  // Load Shiki
  try {
    const { createHighlighter } = await import('shiki')
    highlighter = await createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: ['markdown']
    })
    highlighterReady.value = true
    updateHighlight()
    
    // Watch for theme changes on documentElement
    observer = new MutationObserver(() => {
      updateHighlight()
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  } catch (err) {
    console.error('Failed to load shiki:', err)
  }
})

// Navigation protection
onBeforeRouteLeave((to, from, next) => {
  if (hasUnsavedChanges.value) {
    const answer = window.confirm('Você tem alterações não salvas no System Prompt. Deseja realmente sair e descartar as mudanças?')
    if (answer) {
      next()
    } else {
      next(false)
    }
  } else {
    next()
  }
})

onBeforeUnmount(() => {
  window.onbeforeunload = null
  if (observer) {
    observer.disconnect()
  }
})

// Sync state when store updates
watch(() => store.content, (newVal) => {
  if (!store.saving) {
    localContent.value = newVal
    updateHighlight()
  }
})

function handleInput() {
  updateHighlight()
  if (!isModularView.value) {
    sections.value = parsePrompt(localContent.value)
  }
}

function handleSectionUpdate(sectionId: string, newContent: string) {
  const section = sections.value.find(s => s.id === sectionId)
  if (section) {
    section.content = newContent
    localContent.value = generatePrompt(sections.value)
    updateHighlight()
  }
}

watch(localContent, (newVal) => {
  // Update sections whenever localContent changes (e.g. from IDE edit or load)
  // but avoid deep nested updates if already in modular sync
  const parsed = parsePrompt(newVal)
  if (JSON.stringify(parsed) !== JSON.stringify(sections.value)) {
    sections.value = parsed
  }
}, { immediate: true })

function updateHighlight() {
  if (!highlighterReady.value || !highlighter) return
  
  try {
    const isDark = document.documentElement.classList.contains('dark')
    const theme = isDark ? 'github-dark' : 'github-light'
    
    // Force a trailing space if empty line to keep height consistent between layers
    const code = localContent.value || ' '
    const html = highlighter.codeToHtml(code, {
      lang: 'markdown',
      theme: theme
    })
    
    // Extract only the inner content of the generated pre/code block
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const inner = doc.querySelector('code')?.innerHTML
    
    if (inner) {
      // Ensure we preserve trailing newline if exists
      const suffix = localContent.value.endsWith('\n') ? '\n' : ''
      highlightedContent.value = inner + suffix
    }
  } catch (err) {
    console.error('Highlighting error:', err)
  }
}

// IDE Helpers
function insertTab() {
  const el = textareaRef.value
  if (!el) return
  
  const start = el.selectionStart
  const end = el.selectionEnd
  
  localContent.value = localContent.value.substring(0, start) + '  ' + localContent.value.substring(end)
  
  nextTick(() => {
    el.selectionStart = el.selectionEnd = start + 2
    updateHighlight()
  })
}

function getItemColorClass(line: number) {
  if (!hasUnsavedChanges.value) return 'text-slate-300 dark:text-[#484f58]'
  return 'text-orange-500/60 dark:text-orange-400/50'
}

async function loadData() {
  await store.fetchPrompt(agentNameInput.value)
  localContent.value = store.content
  sections.value = parsePrompt(localContent.value)
}

function createNewAgent() {
  // Not used directly on button anymore, handled inline by `isCreatingAgent=true`
}

watch(isCreatingAgent, (val) => {
  if (val) {
    newAgentName.value = ''
    nextTick(() => newAgentInputRef.value?.focus())
  }
})

function confirmNewAgent() {
  if (newAgentName.value && newAgentName.value.trim()) {
    const formatted = newAgentName.value.trim().toLowerCase().replace(/\s+/g, '_')
    agentNameInput.value = formatted
    isCreatingAgent.value = false
    handleAgentChange()
  } else {
    cancelNewAgent()
  }
}

function cancelNewAgent() {
  isCreatingAgent.value = false
  newAgentName.value = ''
}

async function handleAgentChange() {
  const newAgent = agentNameInput.value.trim() || 'master'
  agentNameInput.value = newAgent
  
  if (newAgent === store.currentAgent) return
  
  if (hasUnsavedChanges.value) {
    const confirm = window.confirm('Você tem alterações não salvas neste agente. Deseja descartar as mudanças e carregar o novo agente?')
    if (!confirm) {
      agentNameInput.value = store.currentAgent // revert input
      return
    }
  }
  
  await loadData()
}

async function handleSave() {
  try {
    await store.savePrompt(localContent.value)
    feedback.value = {
      type: 'success',
      title: 'Commit Realizado',
      message: 'Prompt sincronizado com a base de dados.'
    }
    setTimeout(() => { if (feedback.value?.type === 'success') feedback.value = null }, 4000)
  } catch (e: any) {
    feedback.value = {
      type: 'danger',
      title: 'Erro de Sincronização',
      message: e.data?.statusMessage || e.message || 'Falha ao salvar.'
    }
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function syncScroll() {
  const textarea = textareaRef.value
  const gutter = gutterRef.value
  const highlighterLayer = highlightRef.value
  
  if (textarea && gutter) {
    gutter.scrollTop = textarea.scrollTop
  }
  if (textarea && highlighterLayer) {
    highlighterLayer.scrollTop = textarea.scrollTop
    highlighterLayer.scrollLeft = textarea.scrollLeft
  }
}

function focusTextArea() {
  textareaRef.value?.focus()
}
</script>

<style scoped>
.font-mono {
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

/* Important: Both layers MUST be pixel-perfect identical */
.editor-layer {
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 21px; /* Robust line-height sync */
  padding: 1.5rem; /* Equivalent to Tailwinds p-6 */
  white-space: pre-wrap;
  word-break: normal;
  overflow-wrap: break-word;
  overflow-y: scroll; /* Force both to scroll so width math matches perfectly */
  overflow-x: hidden;
  margin: 0;
  border: none;
  box-sizing: border-box;
}

/* Base scrollbar rules for the editor layers */
.editor-layer {
  scrollbar-width: thin;
  scrollbar-color: #30363d transparent;
}

.editor-layer::-webkit-scrollbar {
  width: 8px;
}

.editor-layer::-webkit-scrollbar-track {
  background: transparent;
}

textarea.editor-layer::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 10px;
}

textarea.editor-layer::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}

/* Hide the scrollbar thumb for the highlight layer so only the textarea one is visible */
[ref="highlightRef"].editor-layer::-webkit-scrollbar-thumb {
  background: transparent;
}

/* Specific styling for the highlight layer */
[ref="highlightRef"] {
  color: #e6edf3; /* Default text color for github-dark */
}

:root:not(.dark) [ref="highlightRef"] {
  color: #24292e; /* Default text color for github-light */
}

/* Hide textarea text when highlighter is active to show the colors behind/under it */
.text-transparent {
  color: transparent !important;
}

/* Ensure caret is visible even if text is transparent */
textarea.text-transparent {
  caret-color: #2f81f7;
}

:root:not(.dark) textarea.text-transparent {
  caret-color: #0969da;
}

/* Shiki styles integration */
:deep(.shiki) {
  background: transparent !important;
}

:deep(pre) {
  margin: 0;
  padding: 0;
  background: transparent !important;
  font-family: inherit !important;
  font-size: inherit !important;
  line-height: inherit !important;
}

:deep(code) {
  background: transparent !important;
  font-family: inherit !important;
  font-size: inherit !important;
  line-height: inherit !important;
}

/* Git indicator animation */
@keyframes stripe-glow {
  0% { opacity: 0.3; }
  50% { opacity: 0.6; }
  100% { opacity: 0.3; }
}

.animate-stripe {
  animation: stripe-glow 2s infinite ease-in-out;
}
</style>
