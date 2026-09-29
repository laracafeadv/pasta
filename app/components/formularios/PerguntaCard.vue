<template>
  <article
    class="rounded-2xl border bg-white dark:bg-zinc-900/70 transition-shadow" :class="[ativa ? 'border-primary shadow-md ring-1 ring-primary/20' : 'border-gray-200 dark:border-zinc-800 hover:border-primary/50', arrastando ? 'opacity-40' : '']"
    :data-testid="`card-${item.texto || 'nova'}`" @click="$emit('selecionar')"
  >
    <!-- Alça de arrastar + ações rápidas -->
    <div class="flex items-center justify-between px-3 pt-1.5 text-gray-300">
      <span class="cursor-grab active:cursor-grabbing px-2" draggable="true" title="Arraste para reordenar ou mover para outra seção" data-testid="alca-pergunta" @dragstart.stop="$emit('dragstart', $event)" @dragend="$emit('dragend')"><Icon name="ph:dots-six-bold" /></span>
      <span v-if="!ativa" class="text-[10px] uppercase tracking-widest text-gray-400">{{ tipoDef?.nome }}<span v-if="item.obrigatoria" class="text-danger"> · obrigatória</span></span>
    </div>

    <!-- MODO VISUAL (não selecionada) -->
    <div v-if="!ativa" class="px-5 pb-4 space-y-1.5">
      <p class="text-base font-medium text-primary dark:text-zinc-100">{{ item.texto || 'Pergunta sem texto' }}<b v-if="item.obrigatoria" class="text-danger"> *</b></p>
      <p v-if="item.ajuda" class="text-xs text-gray-400">{{ item.ajuda }}</p>
      <ul v-if="tipoDef?.comOpcoes" class="text-sm text-gray-500 space-y-0.5">
        <li v-for="o in item.opcoes.slice(0, 6)" :key="o" class="flex items-center gap-2"><span class="inline-block size-3 border border-gray-400" :class="tipoDef.multipla ? 'rounded-sm' : 'rounded-full'" />{{ o }}</li>
        <li v-if="item.opcoes.length > 6" class="text-xs text-gray-400">+ {{ item.opcoes.length - 6 }} opção(ões)</li>
      </ul>
      <p v-else-if="item.tipo === 'sim_nao'" class="text-sm text-gray-500 flex gap-4"><span>○ Sim</span><span>○ Não</span></p>
      <p v-else class="text-xs text-gray-400 border-b border-dashed border-gray-300 dark:border-zinc-700 pb-1 w-2/3">{{ tipoDef?.dica }}</p>
      <p v-if="item.mostrar_se" class="text-[11px] text-secondary-dark flex items-start gap-1" data-testid="resumo-logica"><Icon name="ph:git-branch-bold" class="mt-0.5 shrink-0" /><span>Aparece se {{ descricaoLogica }}</span></p>
      <p v-if="invalida" class="text-[11px] text-danger flex items-start gap-1"><Icon name="ph:warning-bold" class="mt-0.5 shrink-0" />{{ invalida }}</p>
    </div>

    <!-- MODO EDIÇÃO -->
    <div v-else class="px-5 pb-4 space-y-4" @click.stop>
      <div class="grid grid-cols-1 sm:grid-cols-[1fr_15rem] gap-3">
        <input v-model="item.texto" class="modal-input !text-base font-medium" placeholder="Pergunta" data-testid="edit-texto" />
        <select :value="item.tipo" class="modal-input" data-testid="edit-tipo" @change="mudarTipo(($event.target as HTMLSelectElement).value as TipoPergunta)">
          <optgroup v-for="g in grupos" :key="g.nome" :label="g.nome"><option v-for="t in g.tipos" :key="t.valor" :value="t.valor">{{ t.nome }}</option></optgroup>
        </select>
      </div>
      <input v-model="ajudaLocal" class="modal-input !text-xs" placeholder="Descrição ou ajuda (opcional)" data-testid="edit-ajuda" />

      <p v-if="item.respostas" class="text-xs rounded-lg bg-secondary/10 border border-secondary/30 p-2 text-secondary-dark">
        Esta pergunta já tem {{ item.respostas }} resposta(s) guardada(s). Ajustar o texto ou as opções mantém as respostas (a versão anterior fica no histórico){{ tipoDef?.comOpcoes ? '' : '; trocar o tipo cria uma nova pergunta e preserva a antiga' }}.
      </p>
      <p v-if="item.usada_em?.length" class="text-xs text-gray-500">Esta pergunta também é usada em: {{ item.usada_em.map(f => f.nome).join(', ') }} — a edição vale para todos.</p>

      <!-- Opções -->
      <div v-if="tipoDef?.comOpcoes" class="space-y-1.5" data-testid="opcoes">
        <div
          v-for="(_, i) in item.opcoes" :key="i" class="flex items-center gap-2 rounded-lg" :class="opcaoSobre === i ? 'bg-secondary/10' : ''" :data-testid="`opcao-${i}`"
          @dragover.prevent="opcaoSobre = i" @dragleave="opcaoSobre = null" @drop.prevent="soltarOpcao(i)"
        >
          <span class="cursor-grab text-gray-300 px-1" draggable="true" title="Arraste para reordenar" @dragstart.stop="opcaoArrastada = i; $event.dataTransfer?.setData('text/plain', 'opcao')" @dragend="opcaoArrastada = null; opcaoSobre = null"><Icon name="ph:dots-six-vertical-bold" /></span>
          <span class="inline-block size-3.5 border border-gray-400 shrink-0" :class="tipoDef.multipla ? 'rounded-sm' : 'rounded-full'" />
          <input v-model="item.opcoes[i]" class="flex-1 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary outline-none py-1 text-sm" :placeholder="`Opção ${i + 1}`" data-testid="opcao-texto" @keydown.enter.prevent="adicionarOpcao(i + 1)" />
          <button type="button" class="text-gray-300 hover:text-primary disabled:opacity-30" :disabled="i === 0" title="Subir" @click="moverOpcao(i, i - 1)"><Icon name="ph:arrow-up-bold" /></button>
          <button type="button" class="text-gray-300 hover:text-primary disabled:opacity-30" :disabled="i === item.opcoes.length - 1" title="Descer" @click="moverOpcao(i, i + 1)"><Icon name="ph:arrow-down-bold" /></button>
          <button type="button" class="text-gray-300 hover:text-danger" title="Excluir opção" data-testid="opcao-excluir" @click="item.opcoes.splice(i, 1)"><Icon name="ph:x-bold" /></button>
        </div>
        <button type="button" class="text-xs font-semibold text-secondary-dark hover:underline pl-1" data-testid="opcao-adicionar" @click="adicionarOpcao()">+ Adicionar opção</button>
      </div>
      <p v-else-if="item.tipo === 'sim_nao'" class="text-sm text-gray-500 flex gap-4"><span>○ Sim</span><span>○ Não</span></p>
      <p v-if="tipoDef?.interno" class="text-xs text-gray-500">Checklist interno: acompanha o que o escritório já fez. Não é perguntado a quem preenche.</p>

      <!-- Lógica -->
      <details :open="!!item.mostrar_se || logicaAberta" class="rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 p-3" @toggle="logicaAberta = ($event.target as HTMLDetailsElement).open">
        <summary class="cursor-pointer text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5" data-testid="logica-toggle"><Icon name="ph:git-branch-bold" /> Lógica condicional <span v-if="item.mostrar_se" class="normal-case tracking-normal font-normal text-secondary-dark">· ativa</span></summary>
        <div class="mt-3 space-y-2">
          <p class="text-xs text-gray-500">Mostrar esta pergunta só se…  <span class="text-gray-400">(sem condição, ela sempre aparece)</span></p>
          <CondicaoEditor :model-value="item.mostrar_se" :anteriores="anteriores" @update:model-value="v => (item.mostrar_se = v)" />
        </div>
      </details>

      <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-zinc-800">
        <label v-if="!tipoDef?.interno" class="flex items-center gap-2 text-sm cursor-pointer"><input v-model="item.obrigatoria" type="checkbox" class="accent-[#3c2923]" data-testid="edit-obrigatoria" /> Obrigatória</label>
        <span v-else />
        <div class="flex items-center gap-1 text-gray-400">
          <button type="button" class="acao" title="Subir" :disabled="!podeSubir" @click="$emit('mover', -1)"><Icon name="ph:arrow-up-bold" /></button>
          <button type="button" class="acao" title="Descer" :disabled="!podeDescer" @click="$emit('mover', 1)"><Icon name="ph:arrow-down-bold" /></button>
          <button type="button" class="acao" title="Duplicar pergunta" data-testid="duplicar-pergunta" @click="$emit('duplicar')"><Icon name="ph:copy-bold" /></button>
          <button type="button" class="acao hover:!text-danger" title="Excluir pergunta" data-testid="excluir-pergunta" @click="$emit('excluir')"><Icon name="ph:trash-bold" /></button>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CondicaoEditor, { type PerguntaAnterior } from './CondicaoEditor.vue'
import { TIPO, TIPOS_PERGUNTA, descreverCondicao, type PerguntaForm, type TipoPergunta } from '../../../shared/data/formulario'

export interface ItemEditavel extends PerguntaForm { respostas?: number; usada_em?: { id: number; nome: string }[] }
const props = defineProps<{ item: ItemEditavel; ativa: boolean; anteriores: PerguntaAnterior[]; invalida?: string | null; arrastando?: boolean; podeSubir?: boolean; podeDescer?: boolean }>()
defineEmits<{ selecionar: []; duplicar: []; excluir: []; mover: [dir: -1 | 1]; dragstart: [e: DragEvent]; dragend: [] }>()

const tipoDef = computed(() => TIPO(props.item.tipo))
const grupos = ['Texto', 'Dados', 'Escolha'].map(nome => ({ nome, tipos: TIPOS_PERGUNTA.filter(t => t.grupo === nome) }))
const logicaAberta = ref(false)
const ajudaLocal = computed({ get: () => props.item.ajuda ?? '', set: (v: string) => { props.item.ajuda = v || null } })
const descricaoLogica = computed(() => descreverCondicao(props.item.mostrar_se, id => props.anteriores.find(a => a.pergunta_id === id)?.texto ?? '?', id => props.anteriores.find(a => a.pergunta_id === id)?.tipo ?? 'texto_curto'))

function mudarTipo(t: TipoPergunta) {
  const defNovo = TIPO(t)!
  props.item.tipo = t
  if (defNovo.comOpcoes && props.item.opcoes.length < 2) props.item.opcoes = props.item.opcoes.length ? [...props.item.opcoes, ''] : ['Opção 1', 'Opção 2']
  if (!defNovo.comOpcoes) props.item.opcoes = []
  if (defNovo.interno) props.item.obrigatoria = false
  props.item.mostrar_se = props.item.mostrar_se // (condições sobre este tipo, se houver, são revalidadas ao salvar)
}

const opcaoArrastada = ref<number | null>(null)
const opcaoSobre = ref<number | null>(null)
function moverOpcao(de: number, para: number) {
  if (para < 0 || para >= props.item.opcoes.length || de === para) return
  const [o] = props.item.opcoes.splice(de, 1)
  props.item.opcoes.splice(para, 0, o!)
}
function soltarOpcao(para: number) {
  if (opcaoArrastada.value != null) moverOpcao(opcaoArrastada.value, para)
  opcaoArrastada.value = null; opcaoSobre.value = null
}
function adicionarOpcao(em?: number) {
  const pos = em ?? props.item.opcoes.length
  props.item.opcoes.splice(pos, 0, '')
}
</script>

<style scoped>
.acao { @apply p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-primary disabled:opacity-30 disabled:hover:bg-transparent; }
</style>
