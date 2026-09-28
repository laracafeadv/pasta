<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { definePageMeta, useHead, useRoute, useSupabaseClient } from '#imports'
import Button from '~/components/Button.vue'
import Modal from '~/components/Modal.vue'
import { CATEGORIAS_ARQUIVO, type Arquivo, type Caso, type Contato, type SubpastaCliente } from '~~/shared/types/crm'
import { dataCurta } from '~/utils/formatadores'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Documentos' })

const route = useRoute()
const arquivos = ref<Arquivo[]>([])
const carregando = ref(false)
const busca = ref('')
const filtroCategoria = ref<SubpastaCliente | ''>('')
const filtroContato = ref<Pick<Contato, 'id' | 'nome'> | null>(null)

async function carregar() {
  carregando.value = true
  try {
    arquivos.value = await $fetch<Arquivo[]>('/api/arquivos', {
      params: { busca: busca.value || undefined, categoria: filtroCategoria.value || undefined, contato_id: filtroContato.value?.id },
    })
  } finally {
    carregando.value = false
  }
}
let debounceBusca: ReturnType<typeof setTimeout> | undefined
watch(busca, () => { clearTimeout(debounceBusca); debounceBusca = setTimeout(carregar, 300) })
watch([filtroCategoria, filtroContato], carregar)
onMounted(async () => {
  if (route.query.contato) {
    const d = await $fetch<{ contato: Contato }>(`/api/crm/contatos/${route.query.contato}`).catch(() => null)
    if (d) filtroContato.value = { id: d.contato.id, nome: d.contato.nome }
  }
  await carregar()
})

function tamanho(b: number) {
  return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`
}
function icone(mime: string) {
  if (mime === 'application/pdf') return 'ph:file-pdf'
  if (mime.startsWith('image/')) return 'ph:file-image'
  if (mime.startsWith('audio/')) return 'ph:file-audio'
  if (mime.startsWith('video/')) return 'ph:file-video'
  if (mime.includes('sheet') || mime.includes('excel')) return 'ph:file-xls'
  if (mime.includes('word')) return 'ph:file-doc'
  return 'ph:file-text'
}
async function excluir(a: Arquivo) {
  if (!confirm(`Excluir "${a.nome}"? O arquivo é apagado de vez.`)) return
  await $fetch(`/api/arquivos/${a.id}`, { method: 'DELETE' })
  await carregar()
}

// ─── Busca de cliente (compartilhada entre filtro e upload) ──────────────────
function useBuscaContato() {
  const q = ref('')
  const resultados = ref<Contato[]>([])
  let t: ReturnType<typeof setTimeout> | undefined
  watch(q, (v) => {
    clearTimeout(t)
    if (v.trim().length < 2) { resultados.value = []; return }
    t = setTimeout(async () => {
      resultados.value = (await $fetch<{ records: Contato[] }>('/api/crm/contatos', { params: { search: v.trim(), pageSize: 8 } })).records
    }, 300)
  })
  return { q, resultados }
}
const filtroBusca = useBuscaContato()
function escolherFiltro(c: Contato) {
  filtroContato.value = { id: c.id, nome: c.nome }
  filtroBusca.q.value = ''
  filtroBusca.resultados.value = []
}

// ─── Upload ───────────────────────────────────────────────────────────────────
const uploadAberto = ref(false)
const enviando = ref(false)
const erro = ref<string | null>(null)
const upContato = ref<Pick<Contato, 'id' | 'nome'> | null>(null)
const upBusca = useBuscaContato()
const upCasos = ref<Caso[]>([])
const upCaso = ref<number | null>(null)
const upCategoria = ref<SubpastaCliente>('provas')
const upDescricao = ref('')
const upArquivos = ref<File[]>([])

async function escolherUpContato(c: Pick<Contato, 'id' | 'nome'>) {
  upContato.value = c
  upBusca.q.value = ''
  upBusca.resultados.value = []
  upCaso.value = null
  upCasos.value = await $fetch<Caso[]>('/api/casos', { params: { contato: c.id } })
}
function abrirUpload() {
  erro.value = null
  upArquivos.value = []
  upDescricao.value = ''
  upCategoria.value = 'provas'
  upCaso.value = null
  upCasos.value = []
  upContato.value = null
  if (filtroContato.value) escolherUpContato(filtroContato.value)
  uploadAberto.value = true
}
function aoEscolherArquivos(e: Event) {
  upArquivos.value = Array.from((e.target as HTMLInputElement).files ?? [])
}
async function enviar() {
  if (!upContato.value) { erro.value = 'Escolha o cliente.'; return }
  if (!upArquivos.value.length) { erro.value = 'Escolha pelo menos um arquivo.'; return }
  enviando.value = true
  erro.value = null
  try {
    const storage = useSupabaseClient().storage.from('documentos')
    for (const f of upArquivos.value) {
      const mime = f.type || 'application/octet-stream'
      // 1) servidor autoriza e devolve link assinado; 2) navegador manda direto ao armazenamento; 3) servidor registra.
      const { path, token } = await $fetch<{ path: string; token: string }>('/api/arquivos/upload-url', {
        method: 'POST', body: { contato_id: upContato.value.id, categoria: upCategoria.value, nome: f.name, mime, tamanho: f.size },
      })
      const { error: upErro } = await storage.uploadToSignedUrl(path, token, f, { contentType: mime })
      if (upErro) throw new Error(`Falha ao enviar ${f.name}.`)
      await $fetch('/api/arquivos', {
        method: 'POST',
        body: { contato_id: upContato.value.id, caso_id: upCaso.value, categoria: upCategoria.value, descricao: upDescricao.value, path, nome: f.name, mime },
      })
    }
    uploadAberto.value = false
    await carregar()
  } catch (e: any) {
    erro.value = e?.data?.message || e?.message || 'Não foi possível enviar.'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Biblioteca</p>
        <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Documentos</h1>
        <p class="text-sm text-gray-500 mt-2 max-w-2xl">Todos os documentos dos clientes, por categoria e caso. Os arquivos ficam num armazenamento privado — só abrem por aqui.</p>
      </div>
      <Button icon="ph:upload-simple-bold" @click="abrirUpload">Enviar documento</Button>
    </div>

    <div class="flex flex-wrap gap-2 items-center">
      <input v-model="busca" type="search" class="filtro" placeholder="Buscar pelo nome do arquivo…" />
      <select v-model="filtroCategoria" class="filtro">
        <option value="">Todas as categorias</option>
        <option v-for="(nome, chave) in CATEGORIAS_ARQUIVO" :key="chave" :value="chave">{{ nome }}</option>
      </select>
      <div class="relative">
        <div v-if="filtroContato" class="filtro flex items-center gap-2">
          <span>{{ filtroContato.nome }}</span>
          <button type="button" class="text-gray-400 hover:text-danger" @click="filtroContato = null"><Icon name="ph:x-bold" /></button>
        </div>
        <input v-else v-model="filtroBusca.q.value" type="search" class="filtro" placeholder="Filtrar por cliente…" />
        <div v-if="filtroBusca.resultados.value.length" class="absolute z-20 top-full left-0 mt-1 w-64 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-lg max-h-56 overflow-y-auto">
          <button v-for="c in filtroBusca.resultados.value" :key="c.id" type="button" class="w-full text-left px-3 py-2 text-sm hover:bg-secondary/10" @click="escolherFiltro(c)">{{ c.nome }}</button>
        </div>
      </div>
    </div>

    <p v-if="carregando" class="text-sm text-gray-400">Carregando…</p>
    <p v-else-if="!arquivos.length" class="text-sm text-gray-400">Nenhum documento encontrado.</p>

    <div v-else class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800">
      <div v-for="a in arquivos" :key="a.id" class="flex items-center gap-3 px-4 py-3">
        <Icon :name="icone(a.mime)" class="text-2xl text-secondary-dark shrink-0" />
        <div class="min-w-0 flex-1">
          <a :href="`/api/arquivos/${a.id}/abrir`" target="_blank" rel="noopener" class="text-sm font-semibold text-primary dark:text-zinc-100 hover:underline truncate block">{{ a.nome }}</a>
          <p class="text-xs text-gray-500 truncate">
            <NuxtLink v-if="a.contato" :to="`/crm?abrir=${a.contato.id}&ficha=documentos`" class="hover:underline">{{ a.contato.nome }}</NuxtLink>
            <span v-if="a.caso"> · {{ a.caso.titulo }}</span>
            · {{ CATEGORIAS_ARQUIVO[a.categoria] }} · {{ tamanho(a.tamanho) }} · {{ dataCurta(a.created_at.slice(0, 10)) }}
          </p>
          <p v-if="a.descricao" class="text-xs text-gray-400 truncate">{{ a.descricao }}</p>
        </div>
        <a :href="`/api/arquivos/${a.id}/abrir?baixar=1`" class="btn-mini border border-gray-300 dark:border-zinc-700 hover:border-primary">Baixar</a>
        <button class="btn-mini border border-gray-300 dark:border-zinc-700 hover:border-danger hover:text-danger" @click="excluir(a)">Excluir</button>
      </div>
    </div>

    <Modal :is-open="uploadAberto" title="Enviar documento" max-width="lg" :loading="enviando" @close="uploadAberto = false">
      <div class="p-1 space-y-4">
        <div class="field relative">
          <span>Cliente</span>
          <div v-if="upContato" class="modal-input flex items-center justify-between">
            <span class="truncate">{{ upContato.nome }}</span>
            <button type="button" class="text-gray-400 hover:text-danger shrink-0 ml-2" @click="upContato = null; upCasos = []; upCaso = null"><Icon name="ph:x-bold" /></button>
          </div>
          <input v-else v-model="upBusca.q.value" type="text" class="modal-input" placeholder="Buscar por nome…" />
          <div v-if="upBusca.resultados.value.length" class="absolute z-20 top-full left-0 right-0 mt-1 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-lg max-h-48 overflow-y-auto">
            <button v-for="c in upBusca.resultados.value" :key="c.id" type="button" class="w-full text-left px-3 py-2 text-sm hover:bg-secondary/10" @click="escolherUpContato(c)">{{ c.nome }}</button>
          </div>
        </div>
        <label v-if="upCasos.length" class="field">
          <span>Caso (opcional)</span>
          <select v-model="upCaso" class="modal-input">
            <option :value="null">Nenhum</option>
            <option v-for="c in upCasos" :key="c.id" :value="c.id">{{ c.titulo }}{{ c.numero_processo ? ` — ${c.numero_processo}` : '' }}</option>
          </select>
        </label>
        <label class="field">
          <span>Categoria</span>
          <select v-model="upCategoria" class="modal-input">
            <option v-for="(nome, chave) in CATEGORIAS_ARQUIVO" :key="chave" :value="chave">{{ nome }}</option>
          </select>
        </label>
        <label class="field"><span>Descrição (opcional)</span><input v-model="upDescricao" class="modal-input" placeholder="Ex.: Certidão de casamento atualizada" /></label>
        <label class="field">
          <span>Arquivos (até 25 MB cada)</span>
          <input type="file" multiple class="modal-input" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.txt,.mp3,.ogg,.m4a,.mp4" @change="aoEscolherArquivos" />
        </label>
        <p v-if="upArquivos.length" class="text-xs text-gray-500">{{ upArquivos.length }} arquivo(s) selecionado(s).</p>
        <p v-if="erro" class="text-sm text-danger">{{ erro }}</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="uploadAberto = false">Cancelar</Button>
          <Button :loading="enviando" icon="ph:upload-simple-bold" @click="enviar">Enviar</Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.filtro { @apply rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm; }
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
.btn-mini { @apply text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0; }
</style>
