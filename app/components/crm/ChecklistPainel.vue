<template>
  <section class="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
    <button type="button" class="w-full flex items-center gap-3 p-4 text-left" :aria-expanded="aberto" @click="aberto = !aberto">
      <span class="min-w-0 flex-1">
        <span class="block text-[10px] font-bold uppercase tracking-widest text-primary dark:text-zinc-200">{{ escopo.titulo }}</span>
        <span class="flex items-center gap-3 mt-1.5">
          <span class="flex-1 h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden" role="progressbar" :aria-valuenow="feitos" aria-valuemin="0" :aria-valuemax="total">
            <span class="block h-full rounded-full transition-[width] duration-500" :class="feitos === total ? 'bg-success' : 'bg-primary'" :style="{ width: `${total ? (feitos / total) * 100 : 0}%` }" />
          </span>
          <span class="text-xs font-semibold tabular-nums text-primary dark:text-zinc-100">{{ feitos }} de {{ total }}</span>
        </span>
        <span v-if="!aberto" class="block text-xs mt-1.5 truncate" :class="faltam.length ? 'text-gray-500' : 'text-success-dark'">
          <template v-if="faltam.length">Falta: {{ faltam.slice(0, 2).map(i => i.titulo).join(' · ') }}<template v-if="faltam.length > 2"> · +{{ faltam.length - 2 }}</template></template>
          <template v-else>Tudo em dia.</template>
        </span>
      </span>
      <Icon :name="aberto ? 'ph:caret-up-bold' : 'ph:caret-down-bold'" class="text-gray-400 shrink-0" />
    </button>

    <div v-if="aberto" class="border-t border-gray-100 dark:border-zinc-800 px-4 pb-4 pt-3 space-y-4">
      <label class="flex items-center gap-2 text-xs text-gray-500 cursor-pointer w-fit">
        <input v-model="soPendencias" type="checkbox" class="accent-[#3c2923]" /> Mostrar só o que falta
      </label>
      <p v-if="!grupos.length" class="text-sm text-success-dark flex items-center gap-2"><Icon name="ph:check-circle-bold" /> Nada pendente.</p>
      <div v-for="g in grupos" :key="g.nome">
        <p v-if="grupos.length > 1 || g.nome !== escopo.titulo" class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
          {{ g.nome }} <span class="font-semibold normal-case tracking-normal">· {{ g.feitos }}/{{ g.total }}</span>
        </p>
        <ul class="space-y-0.5">
          <li v-for="i in g.itens" :key="i.chave" class="rounded-xl px-1.5 py-1.5 hover:bg-gray-50 dark:hover:bg-zinc-800/60">
            <div class="flex items-start gap-2.5">
              <button v-if="i.tipo === 'manual'" type="button" role="checkbox" :aria-checked="i.concluido" :aria-label="`${i.concluido ? 'Desfazer' : 'Marcar'}: ${i.titulo}`"
                      class="caixa" :class="i.concluido ? 'bg-success border-success text-white' : 'border-gray-300 dark:border-zinc-600 hover:border-primary'" @click="emit('alternar', i)">
                <Icon v-if="i.concluido" name="ph:check-bold" class="text-[11px]" />
              </button>
              <span v-else class="caixa cursor-default" :class="i.concluido ? 'bg-success/15 border-success/40 text-success-dark' : 'border-dashed border-gray-300 dark:border-zinc-600'" :title="i.concluido ? 'Automático: já está registrado no CRM' : 'Automático: marca sozinho quando o CRM registrar'">
                <Icon v-if="i.concluido" name="ph:check-bold" class="text-[11px]" />
              </span>
              <div class="min-w-0 flex-1">
                <button type="button" class="text-left text-sm leading-snug" :class="i.concluido ? 'text-gray-500 dark:text-zinc-400' : 'font-semibold text-primary dark:text-zinc-100'" @click="alternarDetalhe(i.chave)">{{ i.titulo }}</button>
                <p class="text-[11px] text-gray-400 leading-snug">
                  <span v-if="i.tipo === 'auto'" class="inline-block mr-1 px-1.5 rounded bg-gray-100 dark:bg-zinc-800 text-[10px] uppercase tracking-wider">automático</span>
                  <template v-if="i.concluido && i.quando">{{ dataCurta(i.quando) }}<template v-if="i.quem"> · {{ i.quem }}</template></template>
                  <template v-if="i.evidencia"><template v-if="i.concluido && i.quando"> · </template>{{ i.evidencia }}</template>
                </p>
                <p v-if="detalhes.has(i.chave)" class="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">{{ i.detalhe || i.dica }}</p>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ChecklistEscopo, ItemChecklist } from '../../../shared/types/checklist'
import { dataCurta } from '../../utils/formatadores'

const props = defineProps<{ escopo: ChecklistEscopo }>()
const emit = defineEmits<{ alternar: [item: ItemChecklist] }>()

const aberto = ref(false)
const soPendencias = ref(false)
const detalhes = ref(new Set<string>())
function alternarDetalhe(chave: string) {
  const s = new Set(detalhes.value)
  if (s.has(chave)) s.delete(chave); else s.add(chave)
  detalhes.value = s
}

const feitos = computed(() => props.escopo.itens.filter(i => i.concluido).length)
const total = computed(() => props.escopo.itens.length)
const faltam = computed(() => props.escopo.itens.filter(i => !i.concluido))
// Grupos na ordem em que aparecem (fases do Padrão Operacional).
const grupos = computed(() => {
  const mapa = new Map<string, ItemChecklist[]>()
  for (const i of props.escopo.itens) mapa.set(i.fase, [...(mapa.get(i.fase) ?? []), i])
  return [...mapa.entries()]
    .map(([nome, todos]) => ({ nome, feitos: todos.filter(i => i.concluido).length, total: todos.length, itens: soPendencias.value ? todos.filter(i => !i.concluido) : todos }))
    .filter(g => g.itens.length)
})
</script>

<style scoped>
.caixa { @apply mt-0.5 w-[18px] h-[18px] rounded-md border-[1.5px] inline-flex items-center justify-center shrink-0 transition-colors; }
</style>
