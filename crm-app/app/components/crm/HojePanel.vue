<template>
  <div class="space-y-5">
    <div v-if="agenda.transferidas.length" class="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm flex flex-wrap items-center gap-2">
      <Icon name="ph:user-switch-bold" class="text-warning-dark" />
      <b>{{ agenda.transferidas.length }} conversa(s) aguardam a equipe no WhatsApp</b>
      <span class="text-gray-600 dark:text-zinc-400">(a IA foi pausada):</span>
      <button v-for="c in agenda.transferidas" :key="c.id" class="underline underline-offset-2" @click="emit('abrir', c, 'conversa')">{{ c.nome || telefoneFormatado(c.telefone) }}</button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <section v-for="bloco in blocos" :key="bloco.id" class="painel">
        <header class="flex items-baseline gap-2 mb-1">
          <h2 class="text-2xl text-primary dark:text-zinc-100">{{ bloco.titulo }}</h2>
          <span class="pill" :class="bloco.pill">{{ bloco.itens.length }}</span>
        </header>
        <p class="text-xs text-gray-500 mb-3">{{ bloco.sub }}</p>
        <p v-if="!bloco.itens.length" class="text-sm italic text-gray-400 py-2">{{ bloco.vazio }}</p>
        <TarefaItem v-for="c in bloco.itens" :key="c.id" :contato="c" :sem-acao="bloco.id === 'semAcao'" @abrir="emit('abrir', c)" @feito="emit('andamento', c)" @adiar="emit('adiar', c)" />
      </section>
    </div>

    <section class="painel">
      <header class="flex items-baseline gap-2 mb-1">
        <h2 class="text-2xl text-primary dark:text-zinc-100">Próximos 7 dias</h2>
        <span class="pill">{{ agenda.semana.length }}</span>
      </header>
      <p class="text-xs text-gray-500 mb-3">Para planejar a semana, não para agir agora.</p>
      <p v-if="!agenda.semana.length" class="text-sm italic text-gray-400 py-2">Semana livre por enquanto.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        <TarefaItem v-for="c in agenda.semana" :key="c.id" :contato="c" @abrir="emit('abrir', c)" @feito="emit('andamento', c)" @adiar="emit('adiar', c)" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TarefaItem from './TarefaItem.vue'
import type { Contato } from '../../../shared/types/crm'
import type { Agenda } from '../../stores/crm'
import { telefoneFormatado } from '../../utils/formatadores'

const props = defineProps<{ agenda: Agenda }>()
const emit = defineEmits<{ abrir: [c: Contato, aba?: string]; andamento: [c: Contato]; adiar: [c: Contato] }>()

const blocos = computed(() => [
  { id: 'atrasadas', titulo: 'Atrasadas', sub: 'Próxima ação com data vencida.', vazio: 'Nada atrasado.', pill: 'bg-danger/15 text-danger-dark dark:text-danger-200', itens: props.agenda.atrasadas },
  { id: 'hoje', titulo: 'Para hoje', sub: 'Compromissos com data de hoje.', vazio: 'Nenhum compromisso para hoje.', pill: '', itens: props.agenda.hoje },
  { id: 'semAcao', titulo: 'Sem próxima ação', sub: 'Casos parados: decida o próximo passo ou encerre.', vazio: 'Todos os casos têm um próximo passo.', pill: 'bg-warning/15 text-warning-dark dark:text-warning-200', itens: props.agenda.semAcao },
])
</script>

<style scoped>
.painel { @apply rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-5 sm:p-6; }
.pill { @apply text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-primary dark:text-zinc-300; }
</style>
