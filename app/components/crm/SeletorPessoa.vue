<template>
  <div class="space-y-2">
    <div class="relative">
      <input v-model="busca" class="modal-input" placeholder="Pessoa: buscar cadastrada (nome, telefone, e-mail) ou digitar o nome de uma nova…" :disabled="!!modelValue" data-testid="pessoa-busca" @input="buscar" />
      <div v-if="modelValue" class="absolute inset-0 flex items-center justify-between px-4 rounded-lg bg-secondary/10 border border-secondary/30 text-sm">
        <span><b>{{ modelValue.nome }}</b> <span class="text-xs text-gray-500">pessoa já cadastrada</span></span>
        <button type="button" class="text-xs underline" data-testid="pessoa-trocar" @click="trocar">trocar</button>
      </div>
      <ul v-if="!modelValue && busca.trim().length >= 2" class="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg max-h-56 overflow-y-auto" data-testid="pessoa-resultados">
        <li v-for="c in resultados" :key="c.id">
          <button type="button" class="w-full text-left px-3 py-2 text-sm hover:bg-secondary/10 disabled:opacity-40" :disabled="excluir.includes(c.id)" @click="escolher(c)">
            {{ c.nome || 'Sem nome' }} <span class="text-xs text-gray-400">{{ c.telefone }}</span>
            <span class="text-[10px] ml-1 px-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500">{{ rotuloEtapa(c.etapa) }}</span>
            <span v-if="excluir.includes(c.id)" class="text-[10px] ml-1 text-gray-400">já está nesta demanda</span>
          </button>
        </li>
        <li><button type="button" class="w-full text-left px-3 py-2 text-sm font-semibold text-secondary-dark hover:bg-secondary/10" data-testid="pessoa-cadastrar" @click="cadastrarNova">+ Cadastrar nova pessoa: "{{ busca.trim() }}"</button></li>
      </ul>
    </div>
    <div v-if="criando && !modelValue" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <input v-model="nova.telefone" class="modal-input" placeholder="Telefone / WhatsApp (para cadastrar a pessoa)" data-testid="nova-telefone" @input="emitir" />
      <input v-model="nova.email" class="modal-input" placeholder="E-mail (opcional)" @input="emitir" />
      <p class="sm:col-span-2 text-[11px] text-gray-400">Sem telefone, a parte fica só digitada (sem cadastro) e pode ser vinculada depois. Com telefone já cadastrado, o sistema usa a pessoa que já existe.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'

interface Pessoa { id: number; nome: string | null; telefone?: string | null; etapa?: string }
const props = withDefaults(defineProps<{ modelValue: Pessoa | null; excluir?: number[] }>(), { excluir: () => [] })
const emit = defineEmits<{ 'update:modelValue': [Pessoa | null]; nova: [{ nome: string; telefone: string; email: string }] }>()

const busca = ref('')
const resultados = ref<Pessoa[]>([])
const criando = ref(false)
const nova = reactive({ nome: '', telefone: '', email: '' })
let timer: ReturnType<typeof setTimeout> | undefined

const ROTULOS: Record<string, string> = { novo: 'lead', contatado: 'lead', qualificado: 'lead', agendado: 'lead', proposta: 'lead', ativo: 'cliente', concluido: 'cliente', perdido: 'lead perdido', relacionado: 'pessoa cadastrada' }
const rotuloEtapa = (e?: string) => (e && ROTULOS[e]) || 'pessoa'
const emitir = () => emit('nova', { ...nova })

function buscar() {
  clearTimeout(timer)
  criando.value = false
  nova.nome = busca.value.trim(); emitir()
  if (busca.value.trim().length < 2) { resultados.value = []; return }
  timer = setTimeout(async () => {
    resultados.value = await $fetch<Pessoa[]>('/api/pessoas/buscar', { params: { q: busca.value.trim() } }).catch(() => [])
  }, 250)
}
function escolher(c: Pessoa) { emit('update:modelValue', c); resultados.value = []; criando.value = false }
function cadastrarNova() { criando.value = true; nova.nome = busca.value.trim(); resultados.value = []; emitir() }
function trocar() { emit('update:modelValue', null); busca.value = ''; criando.value = false; Object.assign(nova, { nome: '', telefone: '', email: '' }); emitir() }
</script>
