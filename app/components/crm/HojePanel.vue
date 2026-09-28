<template>
  <div class="space-y-5">
    <div v-if="avisos.length" class="rounded-full border border-secondary/30 bg-secondary/10 px-5 py-2.5 text-xs flex flex-wrap items-center gap-x-2 gap-y-1">
      <Icon name="ph:bell-bold" class="text-secondary-dark shrink-0" />
      <b class="text-secondary-dark">{{ totalAvisos }} aviso{{ totalAvisos > 1 ? 's' : '' }}</b>
      <template v-for="(a, i) in avisos" :key="a.chave">
        <span class="opacity-40">·</span>
        <span>{{ a.texto }}</span>
        <button v-for="c in a.itens" :key="c.id" class="underline underline-offset-2 font-semibold" @click="emit('abrir', c, a.aba, a.modelo)">{{ c.nome || telefoneFormatado(c.telefone) }}</button>
      </template>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <section v-for="col in colunas" :key="col.id" class="rounded-3xl bg-gray-100/60 dark:bg-zinc-900/50 p-3">
        <header class="flex items-baseline justify-between px-2 pt-1 pb-2.5">
          <h2 class="text-sm font-bold" :class="col.corTitulo">{{ col.titulo }}</h2>
          <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800">{{ col.itens.length }}</span>
        </header>
        <p v-if="!col.itens.length" class="text-xs italic text-gray-400 px-2 py-3">{{ col.vazio }}</p>
        <article
          v-for="it in col.itens" :key="it.id"
          class="rounded-2xl bg-white dark:bg-zinc-800 p-3 mb-2 border-l-[3px] shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          :class="col.corBorda"
          @click="it.onClick"
        >
          <span class="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5" :class="it.corBadge">{{ it.badge }}</span>
          <p class="font-bold text-sm text-primary dark:text-zinc-100 leading-tight">{{ it.titulo }}</p>
          <p class="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{{ it.detalhe }}</p>
          <div class="flex items-center justify-between mt-2">
            <span class="text-[10px] text-gray-400">{{ it.quando }}</span>
            <button v-if="it.contato" class="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-primary text-white" @click.stop="emit('andamento', it.contato)">Feito</button>
          </div>
        </article>
      </section>
    </div>

    <button type="button" class="text-xs text-gray-500 hover:text-primary flex items-center gap-1.5 px-1" @click="mostrarSemAcao = !mostrarSemAcao">
      <Icon :name="mostrarSemAcao ? 'ph:caret-down-bold' : 'ph:caret-right-bold'" />
      {{ agenda.semAcao.length }} caso(s) sem próxima ação definida
    </button>
    <section v-if="mostrarSemAcao" class="painel">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        <TarefaItem v-for="c in agenda.semAcao" :key="c.id" :contato="c" sem-acao @abrir="emit('abrir', c)" @feito="emit('andamento', c)" @adiar="emit('adiar', c)" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import TarefaItem from './TarefaItem.vue'
import { TIPOS_COMPROMISSO, dataCompromisso, type Compromisso, type Contato } from '../../../shared/types/crm'
import type { Agenda } from '../../stores/crm'
import { diaRelativo, telefoneFormatado } from '../../utils/formatadores'
import { hojeISO } from '../../stores/crm'

const hoje = hojeISO()
const mostrarSemAcao = ref(false)

const props = defineProps<{ agenda: Agenda }>()
const emit = defineEmits<{ abrir: [c: Contato, aba?: string, modelo?: string]; andamento: [c: Contato]; adiar: [c: Contato] }>()

interface ItemKanban {
  id: string; badge: string; corBadge: string; titulo: string; detalhe: string; quando: string
  contato: Contato | null; onClick: () => void
}

function deCompromisso(c: Compromisso): ItemKanban {
  const data = dataCompromisso(c)
  return {
    id: `k-${c.id}`,
    badge: TIPOS_COMPROMISSO[c.tipo].nome,
    corBadge: 'bg-warning/15 text-warning-dark dark:text-warning-200',
    titulo: c.titulo,
    detalhe: [c.contato?.nome, c.caso?.numero_processo].filter(Boolean).join(' · ') || '—',
    quando: data < hoje ? `atrasado · ${diaRelativo(data)}` : diaRelativo(data),
    contato: null,
    onClick: () => { if (c.contato) emit('abrir', c.contato as Contato) },
  }
}
function deContato(c: Contato): ItemKanban {
  return {
    id: `c-${c.id}`,
    badge: 'Contato',
    corBadge: 'bg-secondary/15 text-secondary-dark dark:text-secondary-200',
    titulo: c.proxima_acao || '—',
    detalhe: c.nome || telefoneFormatado(c.telefone),
    quando: c.proxima_data ? diaRelativo(c.proxima_data) : '—',
    contato: c,
    onClick: () => emit('abrir', c),
  }
}

const colunas = computed(() => {
  const compAtrasados = props.agenda.compromissos.filter(c => dataCompromisso(c) < hoje)
  const compHoje = props.agenda.compromissos.filter(c => dataCompromisso(c) === hoje)
  const compSemana = props.agenda.compromissos.filter(c => dataCompromisso(c) > hoje)
  return [
    {
      id: 'atrasado', titulo: '⚠ Atrasado', corTitulo: 'text-danger', corBorda: 'border-danger',
      vazio: 'Nada atrasado.',
      itens: [...compAtrasados.map(deCompromisso), ...props.agenda.atrasadas.map(deContato)],
    },
    {
      id: 'hoje', titulo: '● Hoje', corTitulo: 'text-secondary-dark', corBorda: 'border-secondary',
      vazio: 'Nada marcado para hoje.',
      itens: [...compHoje.map(deCompromisso), ...props.agenda.hoje.map(deContato)],
    },
    {
      id: 'semana', titulo: 'Próximos 7 dias', corTitulo: 'text-gray-500', corBorda: 'border-gray-300 dark:border-zinc-600',
      vazio: 'Semana livre por enquanto.',
      itens: [...compSemana.map(deCompromisso), ...props.agenda.semana.map(deContato)],
    },
  ]
})

const avisos = computed(() => {
  const lista: { chave: string; texto: string; itens: Contato[]; aba: string; modelo?: string }[] = []
  if (props.agenda.transferidas?.length) lista.push({ chave: 'transferidas', texto: 'aguardando você no WhatsApp:', itens: props.agenda.transferidas, aba: 'conversa' })
  if (props.agenda.sugestoes?.length) lista.push({ chave: 'sugestoes', texto: 'resposta sugerida pela Ana, revise e envie:', itens: props.agenda.sugestoes, aba: 'conversa' })
  if (props.agenda.semRelatorio?.length) lista.push({ chave: 'semRelatorio', texto: 'sem notícia do caso há 7+ dias:', itens: props.agenda.semRelatorio, aba: 'conversa', modelo: '/relatorio-semanal' })
  if (props.agenda.aniversarios?.length) lista.push({ chave: 'aniversarios', texto: 'aniversário hoje:', itens: props.agenda.aniversarios as Contato[], aba: 'conversa', modelo: '/aniversario' })
  return lista
})
const totalAvisos = computed(() => avisos.value.reduce((a, v) => a + v.itens.length, 0))
</script>

<style scoped>
.painel { @apply rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-5 sm:p-6; }
</style>
