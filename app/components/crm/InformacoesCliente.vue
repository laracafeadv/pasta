<template>
  <section class="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
    <button type="button" class="w-full flex items-center gap-3 p-4 text-left" :aria-expanded="aberto" @click="alternar">
      <span class="min-w-0 flex-1">
        <span class="block text-[10px] font-bold uppercase tracking-widest text-primary dark:text-zinc-200">Informações do cliente</span>
        <span v-if="secoes" class="block text-xs text-gray-500 mt-1">{{ respondidas }} de {{ total }} respondidas</span>
        <span v-else class="block text-xs text-gray-400 mt-1">Perguntas que você configura em Formulários</span>
      </span>
      <Icon :name="aberto ? 'ph:caret-up-bold' : 'ph:caret-down-bold'" class="text-gray-400 shrink-0" />
    </button>

    <div v-if="aberto" class="border-t border-gray-100 dark:border-zinc-800 px-4 pb-4 pt-3 space-y-5">
      <p v-if="carregando" class="text-sm text-gray-400">Carregando…</p>
      <p v-else-if="erro" class="text-sm text-danger">{{ erro }}</p>
      <p v-else-if="!secoes?.length" class="text-sm text-gray-400">
        Nenhuma pergunta criada ainda. Crie em <NuxtLink to="/formularios?aba=perguntas" class="underline hover:text-primary">Formulários › Banco de perguntas</NuxtLink> e ela aparece aqui sozinha.
      </p>
      <div v-for="s in secoes" :key="s.nome">
        <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{{ s.nome }}</p>
        <ul class="divide-y divide-gray-50 dark:divide-zinc-800/60">
          <li v-for="p in s.perguntas" :key="p.id" class="py-2">
            <p class="text-xs text-gray-500">{{ p.texto }}<span v-if="p.ajuda" class="text-gray-400"> — {{ p.ajuda }}</span></p>

            <!-- Checklist e múltipla escolha: caixas marcáveis na hora -->
            <div v-if="p.tipo === 'checklist' || p.tipo === 'selecao_multipla'" class="mt-1 flex flex-col gap-1">
              <label v-for="o in p.opcoes" :key="o" class="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" class="accent-[#3c2923]" :checked="lista(p).includes(o)" :disabled="salvando.has(p.id)" @change="marcar(p, o, ($event.target as HTMLInputElement).checked)" />
                <span :class="p.tipo === 'checklist' && lista(p).includes(o) ? 'text-gray-500 line-through decoration-gray-300' : ''">{{ o }}</span>
              </label>
              <p v-if="p.tipo === 'checklist'" class="text-[11px] text-gray-400">{{ lista(p).length }} de {{ p.opcoes.length }} feitos</p>
            </div>

            <!-- Escolha única e sim/não: botões -->
            <div v-else-if="p.tipo === 'selecao_unica' || p.tipo === 'sim_nao'" class="mt-1 flex flex-wrap gap-1.5">
              <button v-for="o in (p.tipo === 'sim_nao' ? ['Sim', 'Não'] : p.opcoes)" :key="o" type="button" :disabled="salvando.has(p.id)"
                      class="px-3 py-1 rounded-full border text-xs font-semibold" :class="p.resposta === o ? 'bg-primary text-white border-primary' : 'border-gray-300 dark:border-zinc-700 hover:border-primary'"
                      @click="salvar(p, p.resposta === o ? null : o)">{{ o }}</button>
            </div>

            <!-- Texto, número, data…: mostra o valor; clicar edita -->
            <div v-else class="mt-0.5">
              <template v-if="editando === p.id">
                <textarea v-if="p.tipo === 'texto_longo'" v-model="rascunho" rows="3" class="modal-input" @keydown.esc="editando = null" />
                <input v-else v-model="rascunho" :type="TIPO_INPUT[p.tipo] ?? 'text'" class="modal-input" @keydown.enter.prevent="confirmar(p)" @keydown.esc="editando = null" />
                <div class="flex gap-2 mt-1.5">
                  <button type="button" class="text-xs font-semibold text-primary hover:underline" :disabled="salvando.has(p.id)" @click="confirmar(p)">Salvar</button>
                  <button type="button" class="text-xs text-gray-400 hover:underline" @click="editando = null">Cancelar</button>
                </div>
              </template>
              <button v-else type="button" class="text-left text-sm w-full hover:bg-gray-50 dark:hover:bg-zinc-800/60 rounded-lg px-1 -mx-1 whitespace-pre-line" :class="vazia(p) ? 'text-gray-400 italic' : 'font-medium'" @click="editar(p)">
                {{ vazia(p) ? 'Não respondido — clique para preencher' : texto(p) }}
              </button>
            </div>
            <p v-if="msgErro[p.id]" class="text-xs text-danger mt-1">{{ msgErro[p.id] }}</p>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { PerguntaDaFicha, SecaoDaFicha, ValorResposta } from '../../../shared/types/crm'

// Carrega só quando a ficha abre este cartão (a ficha tem muito mais coisa que isso).
const props = defineProps<{ contatoId: number }>()

const TIPO_INPUT: Record<string, string> = { numero: 'text', data: 'date', email: 'email', telefone: 'tel' }
const aberto = ref(false)
const carregando = ref(false)
const erro = ref<string | null>(null)
const secoes = ref<SecaoDaFicha[] | null>(null)
const editando = ref<number | null>(null)
const rascunho = ref('')
const salvando = ref(new Set<number>())
const msgErro = reactive<Record<number, string>>({})

const perguntas = computed(() => (secoes.value ?? []).flatMap(s => s.perguntas).filter(p => !p.arquivada))
const total = computed(() => perguntas.value.length)
const respondidas = computed(() => perguntas.value.filter(p => !vazia(p)).length)

const lista = (p: PerguntaDaFicha) => (Array.isArray(p.resposta) ? p.resposta : [])
const vazia = (p: PerguntaDaFicha) => p.resposta == null || (Array.isArray(p.resposta) ? !p.resposta.length : p.resposta === '')
function texto(p: PerguntaDaFicha) {
  const r = p.resposta
  if (p.tipo === 'data' && typeof r === 'string') return r.split('-').reverse().join('/')
  return Array.isArray(r) ? r.join(', ') : String(r ?? '')
}

async function carregar() {
  carregando.value = true
  erro.value = null
  try {
    secoes.value = await $fetch<SecaoDaFicha[]>(`/api/crm/contatos/${props.contatoId}/respostas`)
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível carregar.'
  } finally {
    carregando.value = false
  }
}
function alternar() {
  aberto.value = !aberto.value
  if (aberto.value && !secoes.value) carregar()
}

// Atualiza só a pergunta alterada (sem recarregar a ficha): otimista, com volta se o servidor recusar.
async function salvar(p: PerguntaDaFicha, valor: ValorResposta) {
  const antes = p.resposta
  p.resposta = valor
  salvando.value = new Set(salvando.value).add(p.id)
  delete msgErro[p.id]
  try {
    const url: string = `/api/crm/contatos/${props.contatoId}/respostas`
    const r = await $fetch<{ resposta: ValorResposta }>(url, { method: 'PUT', body: { pergunta_id: p.id, resposta: valor } })
    p.resposta = r.resposta
    editando.value = null
  } catch (e: any) {
    p.resposta = antes
    msgErro[p.id] = e?.data?.message || 'Não foi possível salvar.'
  } finally {
    const s = new Set(salvando.value); s.delete(p.id); salvando.value = s
  }
}
function marcar(p: PerguntaDaFicha, opcao: string, ligado: boolean) {
  const atual = new Set(lista(p))
  if (ligado) atual.add(opcao); else atual.delete(opcao)
  salvar(p, p.opcoes.filter(o => atual.has(o)))
}
function editar(p: PerguntaDaFicha) { editando.value = p.id; rascunho.value = typeof p.resposta === 'string' ? p.resposta : '' }
function confirmar(p: PerguntaDaFicha) { salvar(p, rascunho.value) }
</script>
