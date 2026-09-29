<template>
  <form class="space-y-5" novalidate data-testid="preenchimento" @submit.prevent="avancar">
    <slot v-if="passo === 0" name="inicio" />

    <template v-if="passos.length">
      <div v-if="passos.length > 1" class="flex items-center gap-2 text-xs text-gray-500">
        <div class="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-zinc-800 overflow-hidden"><div class="h-full bg-secondary transition-all" :style="{ width: `${((passo + 1) / passos.length) * 100}%` }" /></div>
        <span data-testid="passo-info">Etapa {{ passo + 1 }} de {{ passos.length }}</span>
      </div>

      <section v-if="secaoAtual" class="card space-y-5" :data-testid="`secao-${secaoAtual.titulo}`">
        <header v-if="secaoAtual.titulo || secaoAtual.descricao">
          <h2 class="text-xl text-primary dark:text-zinc-100">{{ secaoAtual.titulo }}</h2>
          <p v-if="secaoAtual.descricao" class="text-sm text-gray-500 mt-0.5">{{ secaoAtual.descricao }}</p>
        </header>

        <div v-for="p in perguntasDaSecao" :key="p.pergunta_id" class="campo" :data-testid="`pergunta-${p.texto}`">
          <span class="rotulo">{{ p.texto }}<b v-if="p.obrigatoria" class="text-danger"> *</b></span>
          <small v-if="p.ajuda" class="text-xs text-gray-400 -mt-1">{{ p.ajuda }}</small>

          <textarea v-if="p.tipo === 'texto_longo'" :value="texto(p)" rows="4" class="modal-input" @input="definir(p, ($event.target as HTMLTextAreaElement).value)" />
          <input v-else-if="p.tipo === 'numero'" :value="texto(p)" type="number" step="any" inputmode="decimal" class="modal-input" @input="definir(p, ($event.target as HTMLInputElement).value)" />
          <input v-else-if="p.tipo === 'data'" :value="texto(p)" type="date" class="modal-input" @input="definir(p, ($event.target as HTMLInputElement).value)" />
          <input v-else-if="p.tipo === 'email'" :value="texto(p)" type="email" class="modal-input" @input="definir(p, ($event.target as HTMLInputElement).value)" />
          <input v-else-if="p.tipo === 'telefone'" :value="texto(p)" type="tel" class="modal-input" @input="definir(p, ($event.target as HTMLInputElement).value)" />

          <div v-else-if="p.tipo === 'sim_nao' || p.tipo === 'selecao_unica'" class="flex flex-col gap-1.5 text-sm" :class="p.tipo === 'sim_nao' ? 'sm:flex-row sm:gap-5' : ''">
            <label v-for="op in (p.tipo === 'sim_nao' ? ['Sim', 'Não'] : p.opcoes)" :key="op" class="flex items-center gap-2 cursor-pointer">
              <input type="radio" :name="`p${p.pergunta_id}`" :checked="valorDe(p) === op" class="accent-[#3c2923]" @change="definir(p, op)" /> {{ op }}
            </label>
          </div>

          <select v-else-if="p.tipo === 'lista_suspensa'" :value="texto(p)" class="modal-input" @change="definir(p, ($event.target as HTMLSelectElement).value)">
            <option value="">Escolha…</option>
            <option v-for="op in p.opcoes" :key="op" :value="op">{{ op }}</option>
          </select>

          <div v-else-if="p.tipo === 'selecao_multipla'" class="flex flex-col gap-1.5 text-sm">
            <label v-for="op in p.opcoes" :key="op" class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" :checked="lista(p).includes(op)" class="accent-[#3c2923]" @change="alternar(p, op)" /> {{ op }}
            </label>
          </div>

          <input v-else :value="texto(p)" type="text" class="modal-input" @input="definir(p, ($event.target as HTMLInputElement).value)" />
          <p v-if="erros[p.pergunta_id]" class="text-xs text-danger">{{ erros[p.pergunta_id] }}</p>
        </div>
        <p v-if="!perguntasDaSecao.length" class="text-sm text-gray-400">Nenhuma pergunta visível nesta etapa.</p>
      </section>
    </template>
    <p v-else class="text-sm text-gray-400">Este formulário ainda não tem perguntas.</p>

    <slot v-if="ultimo" name="fim" />

    <div class="flex items-center gap-3">
      <button v-if="passo > 0" type="button" class="btn-sec" data-testid="voltar" @click="voltar">Voltar</button>
      <button type="submit" class="btn-pri" :disabled="enviando" data-testid="avancar">{{ ultimo ? (enviando ? 'Enviando…' : rotuloEnviar) : 'Continuar' }}</button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { calcularVisibilidade, tipoInterno, type PerguntaForm, type SecaoForm, type Valor } from '../../../shared/data/formulario'

/**
 * Preenchimento de um formulário do construtor. É o MESMO componente na "Visualizar" do construtor e na página
 * pública: seções viram etapas (só as visíveis), a lógica condicional é a de shared/data/formulario.ts.
 */
const props = withDefaults(defineProps<{ secoes: SecaoForm[]; modelValue: Record<number, Valor>; rotuloEnviar?: string; enviando?: boolean }>(), { rotuloEnviar: 'Enviar respostas', enviando: false })
const emit = defineEmits<{ 'update:modelValue': [v: Record<number, Valor>]; enviar: [] }>()

const passo = ref(0)
const erros = ref<Record<number, string>>({})

// Perguntas internas (checklist) não são perguntadas a quem preenche.
const secoesUteis = computed(() => props.secoes.map(s => ({ ...s, itens: s.itens.filter(i => !tipoInterno(i.tipo)) })))
const vis = computed(() => calcularVisibilidade(secoesUteis.value, props.modelValue))
const passos = computed(() => secoesUteis.value.map((s, i) => ({ s, i })).filter(x => vis.value.secoes.has(x.i) && x.s.itens.some(p => vis.value.perguntas.has(p.pergunta_id))))
const secaoAtual = computed(() => passos.value[passo.value]?.s ?? null)
const perguntasDaSecao = computed<PerguntaForm[]>(() => (secaoAtual.value?.itens ?? []).filter(p => vis.value.perguntas.has(p.pergunta_id)))
const ultimo = computed(() => passo.value >= passos.value.length - 1)
watch(passos, (p) => { if (passo.value > p.length - 1) passo.value = Math.max(0, p.length - 1) })

const valorDe = (p: PerguntaForm) => props.modelValue[p.pergunta_id] ?? null
const texto = (p: PerguntaForm) => { const v = valorDe(p); return typeof v === 'string' ? v : '' }
const lista = (p: PerguntaForm) => { const v = valorDe(p); return Array.isArray(v) ? v : [] }
function definir(p: PerguntaForm, v: Valor) {
  delete erros.value[p.pergunta_id]
  emit('update:modelValue', { ...props.modelValue, [p.pergunta_id]: v === '' ? null : v })
}
function alternar(p: PerguntaForm, op: string) {
  const atual = lista(p)
  const novo = atual.includes(op) ? atual.filter(o => o !== op) : [...atual, op]
  definir(p, p.opcoes.filter(o => novo.includes(o)))
}

const vazio = (v: Valor | undefined) => v == null || v === '' || (Array.isArray(v) && !v.length)
function validarPasso(): boolean {
  const novos: Record<number, string> = {}
  for (const p of perguntasDaSecao.value) if (p.obrigatoria && vazio(props.modelValue[p.pergunta_id])) novos[p.pergunta_id] = 'Resposta obrigatória.'
  erros.value = novos
  return !Object.keys(novos).length
}
function avancar(e?: Event) {
  const form = (e?.target as HTMLFormElement | undefined)
  if (form && !form.reportValidity()) return // campos do slot (ex.: consentimento) usam validação nativa
  if (!validarPasso()) return
  if (ultimo.value) emit('enviar')
  else { passo.value++; if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }
}
function voltar() { if (passo.value > 0) passo.value-- }
defineExpose({ reiniciar: () => { passo.value = 0; erros.value = {} } })
</script>

<style scoped>
.card { @apply rounded-3xl bg-white/80 dark:bg-zinc-900/70 border border-gray-200/70 dark:border-zinc-800 p-6; }
.campo { @apply flex flex-col gap-1.5; }
.rotulo { @apply text-sm font-semibold text-gray-700 dark:text-zinc-200; }
.btn-pri { @apply px-6 py-3 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-60; }
.btn-sec { @apply px-6 py-3 rounded-full border border-gray-300 dark:border-zinc-700 text-xs font-semibold uppercase tracking-[0.14em] text-gray-600 dark:text-zinc-300; }
</style>
