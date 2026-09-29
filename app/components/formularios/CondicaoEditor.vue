<template>
  <div class="space-y-2" data-testid="condicao-editor">
    <p v-if="!anteriores.length" class="text-xs text-gray-400">Não há pergunta anterior para usar como condição. Coloque esta pergunta depois de uma pergunta de escolha, sim/não, número ou texto.</p>
    <template v-else>
      <div v-for="(r, i) in regras" :key="i" class="flex flex-wrap items-center gap-2 rounded-xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-700 p-2">
        <span class="text-xs font-semibold text-gray-500 w-6">{{ i === 0 ? 'Se' : (juntar === 'ou' ? 'ou' : 'e') }}</span>
        <select :value="r.pergunta_id" class="modal-input !w-auto flex-1 min-w-[10rem]" data-testid="cond-pergunta" @change="mudarPergunta(i, Number(($event.target as HTMLSelectElement).value))">
          <option v-for="a in anteriores" :key="a.pergunta_id" :value="a.pergunta_id">{{ a.texto || '(pergunta sem texto)' }}</option>
          <option v-if="!anteriores.some(a => a.pergunta_id === r.pergunta_id)" :value="r.pergunta_id" disabled>(pergunta indisponível)</option>
        </select>
        <select :value="r.operador" class="modal-input !w-auto" data-testid="cond-operador" @change="mudarOperador(i, ($event.target as HTMLSelectElement).value as Operador)">
          <option v-for="o in operadoresDe(r.pergunta_id)" :key="o.valor" :value="o.valor">{{ o.nome }}</option>
        </select>
        <template v-if="OPERADORES[r.operador]?.comValor">
          <select v-if="opcoesDe(r.pergunta_id).length" :value="r.valor ?? ''" class="modal-input !w-auto flex-1 min-w-[8rem]" data-testid="cond-valor" @change="mudarValor(i, ($event.target as HTMLSelectElement).value)">
            <option value="">Escolha…</option>
            <option v-for="o in opcoesDe(r.pergunta_id)" :key="o" :value="o">{{ o }}</option>
          </select>
          <input v-else :value="r.valor ?? ''" :type="tipoDe(r.pergunta_id) === 'numero' ? 'number' : 'text'" class="modal-input !w-auto flex-1 min-w-[8rem]" placeholder="valor" data-testid="cond-valor" @input="mudarValor(i, ($event.target as HTMLInputElement).value)" />
        </template>
        <button type="button" class="ml-auto text-gray-400 hover:text-danger" title="Remover condição" @click="remover(i)"><Icon name="ph:x-bold" /></button>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button type="button" class="text-xs font-semibold text-secondary-dark hover:underline" data-testid="cond-adicionar" @click="adicionar">+ {{ regras.length ? 'outra condição' : 'adicionar condição' }}</button>
        <label v-if="regras.length > 1" class="text-xs text-gray-500 flex items-center gap-1.5">
          mostrar quando
          <select :value="juntar" class="modal-input !w-auto !py-1" @change="mudarJuntar(($event.target as HTMLSelectElement).value as 'e' | 'ou')">
            <option value="e">todas forem verdadeiras</option>
            <option value="ou">qualquer uma for verdadeira</option>
          </select>
        </label>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { OPERADORES, operadoresDoTipo, podeCondicionar, tipoComOpcoes, type Condicao, type Operador, type Regra } from '../../../shared/data/formulario'

export interface PerguntaAnterior { pergunta_id: number; texto: string; tipo: string; opcoes: string[] }
const props = defineProps<{ modelValue: Condicao | null; anteriores: PerguntaAnterior[] }>()
const emit = defineEmits<{ 'update:modelValue': [v: Condicao | null] }>()

const anteriores = computed(() => props.anteriores.filter(a => podeCondicionar(a.tipo)))
const regras = computed<Regra[]>(() => props.modelValue?.regras ?? [])
const juntar = computed(() => props.modelValue?.juntar ?? 'e')
const perguntaDe = (id: number) => props.anteriores.find(a => a.pergunta_id === id)
const tipoDe = (id: number) => perguntaDe(id)?.tipo ?? 'texto_curto'
const operadoresDe = (id: number) => operadoresDoTipo(tipoDe(id))
const opcoesDe = (id: number) => { const p = perguntaDe(id); return !p ? [] : p.tipo === 'sim_nao' ? ['Sim', 'Não'] : tipoComOpcoes(p.tipo) ? p.opcoes : [] }

function emitir(novas: Regra[], j: 'e' | 'ou' = juntar.value) { emit('update:modelValue', novas.length ? { juntar: j, regras: novas } : null) }
function adicionar() {
  const primeira = anteriores.value[anteriores.value.length - 1]! // a pergunta imediatamente anterior é a escolha mais comum
  emitir([...regras.value, { pergunta_id: primeira.pergunta_id, operador: operadoresDoTipo(primeira.tipo)[0]!.valor, valor: '' }])
}
function remover(i: number) { emitir(regras.value.filter((_, k) => k !== i)) }
function mudarPergunta(i: number, id: number) {
  emitir(regras.value.map((r, k) => k === i ? { pergunta_id: id, operador: operadoresDoTipo(tipoDe(id))[0]!.valor, valor: '' } : r))
}
function mudarOperador(i: number, op: Operador) { emitir(regras.value.map((r, k) => k === i ? { ...r, operador: op, valor: OPERADORES[op].comValor ? (r.valor ?? '') : undefined } : r)) }
function mudarValor(i: number, v: string) { emitir(regras.value.map((r, k) => k === i ? { ...r, valor: v } : r)) }
function mudarJuntar(j: 'e' | 'ou') { emitir(regras.value, j) }
</script>
