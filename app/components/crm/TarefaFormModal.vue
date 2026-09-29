<template>
  <Modal :is-open="isOpen" :title="editando ? 'Editar tarefa' : 'Nova tarefa'" max-width="lg" :loading="salvando" @close="emit('close')">
    <form id="tarefa-form" class="space-y-4 p-1" @submit.prevent="salvar">
      <label class="field"><span>Título</span><input v-model="form.titulo" class="modal-input" required /></label>
      <label class="field"><span>Descrição</span><textarea v-model="form.descricao" rows="2" class="modal-input" /></label>
      <div class="grid grid-cols-2 gap-4">
        <label class="field"><span>Data</span><input v-model="form.prazo" type="date" class="modal-input" required /></label>
        <label class="field">
          <span>Prioridade</span>
          <select v-model="form.prioridade" class="modal-input">
            <option v-for="(nome, id) in PRIORIDADES_TAREFA" :key="id" :value="id">{{ nome }}</option>
          </select>
        </label>
      </div>
      <div class="field relative">
        <span>Cliente vinculado (opcional)</span>
        <div v-if="contatoSelecionado" class="modal-input flex items-center justify-between">
          <span class="truncate">{{ contatoSelecionado.nome }}</span>
          <button type="button" class="text-gray-400 hover:text-danger shrink-0 ml-2" @click="limparContato"><Icon name="ph:x-bold" /></button>
        </div>
        <input v-else v-model="contatoQuery" type="text" class="modal-input" placeholder="Buscar por nome…" />
        <div v-if="contatoResultados.length" class="absolute z-20 top-full left-0 right-0 mt-1 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-lg max-h-48 overflow-y-auto">
          <button v-for="c in contatoResultados" :key="c.id" type="button" class="w-full text-left px-3 py-2 text-sm hover:bg-secondary/10" @click="escolherContato(c)">{{ c.nome }}</button>
        </div>
      </div>
      <label v-if="casos.length" class="field">
        <span>Caso vinculado (opcional)</span>
        <select v-model="casoId" class="modal-input">
          <option :value="null">Nenhum</option>
          <option v-for="c in casos" :key="c.id" :value="c.id">{{ c.titulo }}</option>
        </select>
      </label>
    </form>
    <template #footer>
      <div class="flex justify-end gap-3">
        <Button variant="outline" @click="emit('close')">Cancelar</Button>
        <Button form="tarefa-form" type="submit" :loading="salvando" icon="ph:check-bold">Salvar</Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import Button from '../Button.vue'
import Modal from '../Modal.vue'
import { PRIORIDADES_TAREFA, type Caso, type Contato, type TarefaInterna } from '../../../shared/types/crm'
import { hojeISO } from '../../stores/crm'

// Criar ou editar uma tarefa. Único formulário de tarefa do CRM: a tela Tarefas e o Dashboard usam este.
const props = defineProps<{ isOpen: boolean; tarefa?: TarefaInterna | null; contato?: { id: number; nome: string | null } | null }>()
const emit = defineEmits<{ close: []; salvo: [] }>()

const hoje = hojeISO()
const salvando = ref(false)
const editando = ref<TarefaInterna | null>(null)
const form = reactive({ titulo: '', descricao: '', prazo: hoje, prioridade: 'media' as keyof typeof PRIORIDADES_TAREFA, contato_id: null as number | null })

const contatoQuery = ref('')
const contatoResultados = ref<Contato[]>([])
const contatoSelecionado = ref<Contato | null>(null)
let debounceContato: ReturnType<typeof setTimeout> | undefined
watch(contatoQuery, (v) => {
  clearTimeout(debounceContato)
  if (v.trim().length < 2 || contatoSelecionado.value) { contatoResultados.value = []; return }
  debounceContato = setTimeout(async () => {
    const r = await $fetch<{ records: Contato[] }>('/api/crm/contatos', { params: { search: v.trim(), pageSize: 8 } })
    contatoResultados.value = r.records
  }, 300)
})
function escolherContato(c: Contato) {
  contatoSelecionado.value = c
  contatoQuery.value = c.nome ?? ''
  contatoResultados.value = []
  form.contato_id = c.id
  casoId.value = null
  carregarCasos()
}
function limparContato() {
  contatoSelecionado.value = null
  contatoQuery.value = ''
  form.contato_id = null
  casos.value = []
  casoId.value = null
}
const casos = ref<Caso[]>([])
const casoId = ref<number | null>(null)
async function carregarCasos() {
  if (!contatoSelecionado.value) return
  casos.value = await $fetch<Caso[]>('/api/casos', { params: { contato: contatoSelecionado.value.id } })
}

function abrir(t?: TarefaInterna) {
  editando.value = t ?? null
  form.titulo = t?.titulo ?? ''
  form.descricao = t?.descricao ?? ''
  form.prazo = t?.prazo ?? hoje
  form.prioridade = t?.prioridade ?? 'media'
  form.contato_id = t?.contato_id ?? null
  contatoSelecionado.value = t?.contato ? { id: t.contato.id, nome: t.contato.nome } as Contato : null
  contatoQuery.value = t?.contato?.nome ?? ''
  casoId.value = t?.caso_id ?? null
  casos.value = []
  if (contatoSelecionado.value) carregarCasos()
}
async function salvar() {
  if (!form.titulo.trim()) return
  salvando.value = true
  try {
    const body = { ...form, caso_id: casoId.value }
    if (editando.value) await $fetch(`/api/tarefas/${editando.value.id}`, { method: 'PATCH', body })
    else await $fetch('/api/tarefas', { method: 'POST', body })
    emit('salvo')
  } finally {
    salvando.value = false
  }
}

// Abre o formulário sempre limpo (ou com a tarefa / o cliente recebidos).
watch(() => props.isOpen, (aberto) => {
  if (!aberto) return
  const c = props.contato
  abrir(props.tarefa ?? undefined)
  if (!props.tarefa && c) { contatoSelecionado.value = { id: c.id, nome: c.nome } as Contato; contatoQuery.value = c.nome ?? ''; form.contato_id = c.id; carregarCasos() }
})
</script>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
