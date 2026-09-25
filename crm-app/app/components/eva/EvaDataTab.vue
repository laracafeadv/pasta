<template>
  <div class="space-y-6">

    <!-- Upload Zone -->
    <div
      id="eva-data-drop-zone"
      class="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed transition-colors cursor-pointer group relative"
      :class="isDragging
        ? 'border-primary bg-primary/5'
        : 'border-slate-300 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800/30'"
      @click="triggerFileInput"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <div class="p-10 flex flex-col items-center justify-center text-center">
        <!-- Icon -->
        <div class="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <svg v-if="!ragStore.loading" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
          </svg>
          <span v-else class="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full block"></span>
        </div>

        <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-2">
          {{ ragStore.loading ? 'Processando documento...' : 'Enviar Base de Conhecimento' }}
        </h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-md">
          {{ ragStore.loading
            ? 'A IA está analisando o documento completo — texto, imagens, tabelas e layout. Aguarde...'
            : 'Arraste ou clique para enviar PDF, DOCX, XLSX, CSV, TXT ou imagens (JPG, PNG). A IA analisa o documento completo e indexa automaticamente.'
          }}
        </p>

        <!-- Progress steps displayed while loading -->
        <div v-if="ragStore.loading" class="flex gap-6 text-xs text-slate-400 mt-2">
          <span class="flex items-center gap-1 text-primary font-medium">
            <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            Enviando para IA
          </span>
          <span>→ Analisando documento</span>
          <span>→ Gerando Markdown</span>
          <span>→ Salvando embeddings</span>
        </div>

        <!-- Feedback Alerts -->
        <div v-if="feedback" class="mt-4 w-full max-w-lg" @click.stop>
          <Alert :type="feedback.type" :title="feedback.title" @close="feedback = null">
            {{ feedback.message }}
          </Alert>
        </div>

        <!-- Input de arquivo oculto -->
        <input
          id="eva-rag-file-input"
          ref="fileInputRef"
          type="file"
          accept=".pdf,.xlsx,.xls,.csv,.txt,.docx,.doc,.jpg,.jpeg,.png,.webp,.gif"
          class="hidden"
          @change="handleFileChange"
          @click.stop
        />


        <!-- Manual Text Input -->
        <div v-if="!ragStore.loading" class="w-full max-w-2xl mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 relative z-20" @click.stop>
          <div class="flex items-center gap-2 mb-3 text-slate-600 dark:text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            <span class="text-xs font-bold uppercase tracking-wider">Ou cole o texto manualmente:</span>
          </div>
          <textarea
            v-model="manualText"
            rows="4"
            placeholder="Cole aqui informações, regras ou qualquer conteúdo que deseja que a assistente saiba (valores de consulta, documentos pedidos, horários…)..."
            class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none shadow-inner"
            @click.stop
          ></textarea>
          <div class="flex justify-end mt-3">
            <Button 
              variant="primary" 
              size="sm" 
              :disabled="!manualText.trim()" 
              @click.stop="handleSendText"
            >
              Indexar Texto
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Documents Table -->
    <div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
      <DataTable
        :columns="columns"
        :data="filteredDocuments"
        :total="filteredDocuments.length"
        :loading="loadingDocs"
        @row-click="openModal"
      >
        <template #header>
          <div class="px-6 py-5 border-b border-slate-100 dark:border-white/10 space-y-4">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h3 class="text-base font-black text-slate-800 dark:text-white">Documentos Indexados (Vector Store)</h3>
              <div class="flex items-center gap-3">
                <button @click="loadDocuments" class="text-xs text-primary hover:underline">↻ Atualizar</button>
                <span class="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                  {{ filteredDocuments.length }} de {{ documents.length }} chunks
                </span>
              </div>
            </div>

            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div class="w-full lg:max-w-md">
                <Input
                  v-model="searchQuery"
                  placeholder="Buscar por fonte, tipo, trecho, original ou Markdown..."
                />
              </div>

              <button
                v-if="searchQuery"
                @click="searchQuery = ''"
                class="text-xs text-slate-500 hover:text-primary transition-colors self-start lg:self-auto"
              >
                Limpar busca
              </button>
            </div>
          </div>
        </template>

        <template #cell-tipo="{ item }">
          <Badge variant="info">{{ item.metadata?.tipo ?? '—' }}</Badge>
        </template>

        <template #cell-content="{ item }">
          <div class="max-w-[300px] lg:max-w-md">
            <p class="text-xs text-slate-500 dark:text-slate-400 truncate bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-white/5 font-mono">
              {{ item.content }}
            </p>
          </div>
        </template>

        <template #cell-source="{ item }">
          <span class="text-xs text-slate-500 max-w-[200px] truncate block">{{ item.metadata?.source ?? '—' }}</span>
        </template>

        <template #cell-actions="{ item }">
          <button 
            @click.stop="handleDelete(item.id)" 
            class="p-1.5 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-900/20 rounded-md ring-1 ring-slate-200 dark:ring-white/5"
            title="Excluir documento"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </template>
      </DataTable>
    </div>

    <!-- Document Detail Modal -->
    <Modal
      :is-open="isModalOpen"
      :title="`Detalhes do Chunk #${selectedDoc?.id}`"
      max-width="3xl"
      @close="isModalOpen = false"
    >
      <div v-if="selectedDoc && loadingSelectedDoc" class="py-14 flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
        <span class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></span>
        <p class="text-sm font-medium text-slate-700 dark:text-slate-200">Carregando detalhes do documento</p>
        <p class="text-xs mt-2">Buscando o conteúdo completo e os metadados técnicos para este chunk.</p>
      </div>

      <div v-else-if="selectedDoc" class="space-y-6">
        <!-- Metadata Badges -->
        <div class="flex flex-wrap gap-2">
          <Badge v-if="selectedDoc.metadata?.tipo" variant="info">
            Tipo: {{ selectedDoc.metadata.tipo }}
          </Badge>
          <Badge v-if="selectedDoc.metadata?.source" variant="secondary">
            Fonte: {{ selectedDoc.metadata.source }}
          </Badge>
          <Badge v-if="selectedDoc.metadata?.chunk_index" variant="secondary">
            Chunk: {{ selectedDoc.metadata.chunk_index }}/{{ selectedDoc.metadata?.total_chunks ?? '?' }}
          </Badge>
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
          <div class="space-y-2">
            <div class="flex items-center justify-between gap-3">
              <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300">Conteúdo Original Extraído</h4>
              <Button size="sm" variant="outline" @click="copyContent(displayOriginalContent)">Copiar</Button>
            </div>
            <div class="bg-slate-50 dark:bg-slate-900/50 rounded-md p-5 border border-slate-100 dark:border-white/5 min-h-[240px] max-h-[420px] overflow-auto">
              <pre class="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{{ displayOriginalContent }}</pre>
            </div>
            <p v-if="!selectedDoc.metadata?.originalContent" class="text-xs text-amber-600 dark:text-amber-400">
              Conteúdo original indisponível para documentos indexados antes desta atualização.
            </p>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between gap-3">
              <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300">Markdown Gerado pela IA</h4>
              <Button size="sm" variant="outline" @click="copyContent(displayMarkdownContent)">Copiar</Button>
            </div>
            <div class="bg-slate-50 dark:bg-slate-900/50 rounded-md p-5 border border-slate-100 dark:border-white/5 min-h-[240px] max-h-[420px] overflow-auto">
              <pre class="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{{ displayMarkdownContent }}</pre>
            </div>
            <p v-if="!selectedDoc.metadata?.markdownContent" class="text-xs text-slate-500 dark:text-slate-400">
              Para documentos antigos, o Markdown exibido abaixo corresponde ao chunk indexado selecionado.
            </p>
          </div>
        </div>

        <!-- Full Content -->
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-3">
            <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300">Chunk Indexado no Vector Store</h4>
            <Button size="sm" variant="outline" @click="copyContent(selectedDoc.content)">Copiar chunk</Button>
          </div>
          <div class="bg-slate-50 dark:bg-slate-900/50 rounded-md p-6 border border-slate-100 dark:border-white/5">
            <pre class="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{{ selectedDoc.content }}</pre>
          </div>
        </div>

        <!-- Raw Metadata -->
        <div v-if="selectedDoc.metadata" class="space-y-2 pt-4 border-t border-slate-100 dark:border-white/5">
          <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Metadados Técnicos:</h4>
          <pre class="text-[10px] bg-slate-900 text-slate-300 p-4 rounded-lg overflow-x-auto">{{ JSON.stringify(selectedDoc.metadata, null, 2) }}</pre>
        </div>
      </div>
      
      <template #footer>
        <div class="flex justify-end">
          <Button @click="isModalOpen = false">Fechar</Button>
        </div>
      </template>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal
      :is-open="isDeleteModalOpen"
      title="Confirmar Exclusão"
      max-width="md"
      @close="isDeleteModalOpen = false"
    >
      <div class="p-4 text-slate-600 dark:text-slate-300">
        <p>Tem certeza que deseja excluir o documento <strong>ID {{ docToDelete }}</strong>?</p>
        <p class="text-sm mt-2 text-slate-500">A assistente perderá essa informação da base de conhecimento.</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="isDeleteModalOpen = false">Cancelar</Button>
          <Button variant="danger" @click="confirmDeleteAction">Excluir</Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from '../Button.vue'
import DataTable from '../DataTable.vue'
import Badge from '../Badge.vue'
import Alert from '../Alert.vue'
import Input from '../Input.vue'
import Modal from '../Modal.vue'
import { useEvaRagStore } from '../../stores/evaRag'

interface RagDocumentMetadata {
  source?: string
  tipo?: string
  chunk_index?: number
  total_chunks?: number
  document_group_id?: string
  originalPreview?: string
  markdownPreview?: string
  originalContent?: string
  markdownContent?: string
}

interface RagDocumentRecord {
  id: number
  content: string
  metadata?: RagDocumentMetadata | null
}

const ragStore = useEvaRagStore()
const isDragging = ref(false)
const manualText = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const feedback = ref<{ type: 'success' | 'danger', title: string, message: string } | null>(null)
const searchQuery = ref('')

// Documents from Supabase
const documents = ref<RagDocumentRecord[]>([])
const loadingDocs = ref(false)
const isModalOpen = ref(false)
const selectedDoc = ref<RagDocumentRecord | null>(null)
const loadingSelectedDoc = ref(false)
const isDeleteModalOpen = ref(false)
const docToDelete = ref<number | null>(null)

const columns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'source', label: 'Fonte' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'content', label: 'Conteúdo (Preview)' },
  { key: 'actions', label: 'Ações' },
] as any[]

const filteredDocuments = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    return documents.value
  }

  return documents.value.filter((doc) => {
    const haystack = [
      String(doc.id),
      doc.content,
      doc.metadata?.source,
      doc.metadata?.tipo,
      doc.metadata?.originalPreview,
      doc.metadata?.markdownPreview,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(query)
  })
})

const displayOriginalContent = computed(() => {
  if (!selectedDoc.value) {
    return ''
  }

  return selectedDoc.value.metadata?.originalContent || 'Conteúdo original não disponível para este documento.'
})

const displayMarkdownContent = computed(() => {
  if (!selectedDoc.value) {
    return ''
  }

  return selectedDoc.value.metadata?.markdownContent || selectedDoc.value.content
})

async function loadDocuments() {
  loadingDocs.value = true
  try {
    const data = await $fetch<RagDocumentRecord[]>('/api/eva/rag')
    documents.value = data
  } catch {
    // silently fail
  } finally {
    loadingDocs.value = false
  }
}

async function handleDelete(id: number) {
  docToDelete.value = id
  isDeleteModalOpen.value = true
}

async function confirmDeleteAction() {
  if (docToDelete.value === null) return
  const id = docToDelete.value
  docToDelete.value = null
  isDeleteModalOpen.value = false

  try {
    await $fetch(`/api/eva/rag/${id}`, { method: 'DELETE' })
    if (selectedDoc.value?.id === id) {
      selectedDoc.value = null
      isModalOpen.value = false
    }
    await loadDocuments()
    feedback.value = {
      type: 'success',
      title: 'Excluído',
      message: 'O documento foi excluído com sucesso.'
    }
    setTimeout(() => feedback.value = null, 3000)
  } catch (error: any) {
     console.error('Erro ao excluir:', error)
     feedback.value = {
      type: 'danger',
      title: 'Erro',
      message: error.data?.statusMessage || 'Erro ao excluir documento.'
    }
  }
}

async function openModal(doc: RagDocumentRecord) {
  selectedDoc.value = doc
  isModalOpen.value = true
  loadingSelectedDoc.value = true

  try {
    const detail = await $fetch<RagDocumentRecord>(`/api/eva/rag/${doc.id}`)
    selectedDoc.value = detail
  } catch (error) {
    console.error('Erro ao carregar detalhes do documento:', error)
  } finally {
    loadingSelectedDoc.value = false
  }
}

function copyContent(text: string) {
  navigator.clipboard.writeText(text)
  // Simple check for Toast availability, if not, alert or silent
  alert('Conteúdo copiado para a área de transferência')
}

function triggerFileInput() {
  if (!ragStore.loading) fileInputRef.value?.click()
}

async function processFile(file: File) {
  feedback.value = null
  const ext = file.name.split('.').pop()?.toUpperCase() ?? 'TXT'

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const base64 = (e.target?.result as string).split(',')[1]

      await ragStore.sendDocument({
        source: file.name,
        base64,
        tipo: ext,
      })

      feedback.value = {
        type: 'success',
        title: 'Documento processado!',
        message: `"${file.name}" foi extraído, convertido para Markdown e indexado com sucesso. ${ragStore.lastResult?.result?.chunks ?? 0} chunks salvos no vector store.`
      }
      await loadDocuments()
    } catch (err: any) {
      feedback.value = {
        type: 'danger',
        title: 'Erro ao processar',
        message: ragStore.error ?? 'Falha ao processar o documento.'
      }
    }
  }
  reader.readAsDataURL(file)
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) processFile(file)
  input.value = ''
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) processFile(file)
}

async function handleSendText() {
  if (!manualText.value.trim()) return
  feedback.value = null
  
  try {
    await ragStore.sendDocument({
      source: 'texto-manual',
      conteudo: manualText.value,
      tipo: 'TXT',
    })

    feedback.value = {
      type: 'success',
      title: 'Texto processado!',
      message: `O conteúdo foi convertido e indexado com sucesso. ${ragStore.lastResult?.result?.chunks ?? 0} novos chunks adicionados.`
    }
    manualText.value = ''
    await loadDocuments()
  } catch (err: any) {
    feedback.value = {
      type: 'danger',
      title: 'Erro ao processar texto',
      message: ragStore.error ?? 'Falha ao processar o conteúdo manual.'
    }
  }
}



onMounted(loadDocuments)
</script>
