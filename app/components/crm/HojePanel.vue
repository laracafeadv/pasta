<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center gap-3 text-sm">
      <NuxtLink v-if="agenda.relacionamento" :to="{ query: { aba: 'carteira' } }" class="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-secondary/15 text-secondary-dark dark:text-secondary-200 hover:bg-secondary/25">
        <Icon name="ph:heart-bold" /> {{ agenda.relacionamento }} cliente(s) da carteira pedem um gesto
      </NuxtLink>
    </div>
    <div v-if="agenda.transferidas.length" class="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm flex flex-wrap items-center gap-2">
      <Icon name="ph:user-switch-bold" class="text-warning-dark" />
      <b>{{ agenda.transferidas.length }} conversa(s) aguardam você no WhatsApp</b>
      <span class="text-gray-600 dark:text-zinc-400">(a IA foi pausada):</span>
      <button v-for="c in agenda.transferidas" :key="c.id" class="underline underline-offset-2" @click="emit('abrir', c, 'conversa')">{{ c.nome || telefoneFormatado(c.telefone) }}</button>
    </div>

    <div v-if="agenda.semRelatorio?.length" class="rounded-2xl border border-gray-200/70 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/50 p-4 text-sm flex flex-wrap items-center gap-2">
      <Icon name="ph:newspaper-bold" class="text-secondary-dark" />
      <b>Relatório semanal:</b>
      <span class="text-gray-600 dark:text-zinc-400">{{ agenda.semRelatorio.length }} cliente(s) sem notícia do caso há 7+ dias —</span>
      <button v-for="c in agenda.semRelatorio" :key="c.id" class="underline underline-offset-2" @click="emit('abrir', c, 'conversa', '/relatorio-semanal')">{{ c.nome || telefoneFormatado(c.telefone) }}</button>
    </div>

    <section v-if="agenda.compromissos?.length" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-5">
      <header class="flex items-baseline justify-between gap-2 mb-2">
        <h2 class="text-2xl text-primary dark:text-zinc-100">Prazos e compromissos</h2>
        <NuxtLink to="/agenda" class="text-xs underline underline-offset-2">Abrir agenda</NuxtLink>
      </header>
      <ul class="divide-y divide-gray-100 dark:divide-zinc-800 text-sm">
        <li v-for="c in agenda.compromissos" :key="c.id" class="py-2 flex flex-wrap items-center gap-3">
          <Icon :name="TIPOS_COMPROMISSO[c.tipo].icone" class="text-secondary" />
          <span class="w-28 font-semibold" :class="dataCompromisso(c) < hoje ? 'text-danger' : ''">{{ dataCurta(dataCompromisso(c)) }} · {{ diaRelativo(dataCompromisso(c)) }}</span>
          <span class="flex-1">{{ c.titulo }}<span v-if="c.contato && !c.titulo.includes(c.contato.nome ?? '—')" class="text-gray-500"> · {{ c.contato.nome }}</span><span v-if="c.caso?.numero_processo" class="text-gray-500 font-mono text-xs"> · {{ c.caso.numero_processo }}</span></span>
          <span class="text-[10px] uppercase tracking-wider text-gray-500">{{ TIPOS_COMPROMISSO[c.tipo].nome }}</span>
        </li>
      </ul>
    </section>

    <div v-if="agenda.aniversarios?.length" class="rounded-2xl border border-secondary/30 bg-secondary/10 p-4 text-sm flex flex-wrap items-center gap-2">
      <Icon name="ph:cake-bold" class="text-secondary-dark" />
      <b>Aniversário hoje:</b>
      <a v-for="c in agenda.aniversarios" :key="c.id" :href="whatsappLink(c.telefone)" target="_blank" rel="noopener" class="underline underline-offset-2">{{ c.nome || telefoneFormatado(c.telefone) }}</a>
      <span class="text-gray-600 dark:text-zinc-400">— use a mensagem pronta <code>/aniversario</code>.</span>
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
        <span class="pill">{{ filtrar(agenda.semana).length }}</span>
      </header>
      <p class="text-xs text-gray-500 mb-3">Para planejar a semana, não para agir agora.</p>
      <p v-if="!filtrar(agenda.semana).length" class="text-sm italic text-gray-400 py-2">Semana livre por enquanto.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        <TarefaItem v-for="c in filtrar(agenda.semana)" :key="c.id" :contato="c" @abrir="emit('abrir', c)" @feito="emit('andamento', c)" @adiar="emit('adiar', c)" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TarefaItem from './TarefaItem.vue'
import { TIPOS_COMPROMISSO, dataCompromisso, type Contato } from '../../../shared/types/crm'
import type { Agenda } from '../../stores/crm'
import { dataCurta, diaRelativo, telefoneFormatado, whatsappLink } from '../../utils/formatadores'
import { hojeISO } from '../../stores/crm'

const hoje = hojeISO()

const props = defineProps<{ agenda: Agenda }>()
const emit = defineEmits<{ abrir: [c: Contato, aba?: string, modelo?: string]; andamento: [c: Contato]; adiar: [c: Contato] }>()

const filtrar = (lista: Contato[]) => lista

const blocos = computed(() => [
  { id: 'atrasadas', titulo: 'Atrasadas', sub: 'Próxima ação com data vencida.', vazio: 'Nada atrasado.', pill: 'bg-danger/15 text-danger-dark dark:text-danger-200', itens: filtrar(props.agenda.atrasadas) },
  { id: 'hoje', titulo: 'Para hoje', sub: 'Compromissos com data de hoje.', vazio: 'Nenhum compromisso para hoje.', pill: '', itens: filtrar(props.agenda.hoje) },
  { id: 'semAcao', titulo: 'Sem próxima ação', sub: 'Casos parados: decida o próximo passo ou encerre.', vazio: 'Todos os casos têm um próximo passo.', pill: 'bg-warning/15 text-warning-dark dark:text-warning-200', itens: filtrar(props.agenda.semAcao) },
])
</script>

<style scoped>
.painel { @apply rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-5 sm:p-6; }
.pill { @apply text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-primary dark:text-zinc-300; }
</style>
