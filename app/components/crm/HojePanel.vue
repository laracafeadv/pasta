<template>
  <div class="space-y-6">
    <div v-if="avisos.length" class="rounded-full border border-secondary/30 bg-secondary/10 px-5 py-2.5 text-xs flex flex-wrap items-center gap-x-2 gap-y-1">
      <Icon name="ph:bell-bold" class="text-secondary-dark shrink-0" />
      <b class="text-secondary-dark">{{ totalAvisos }} aviso{{ totalAvisos > 1 ? 's' : '' }}</b>
      <template v-for="a in avisos" :key="a.chave">
        <span class="opacity-40">·</span>
        <span>{{ a.texto }}</span>
        <button v-for="c in a.itens" :key="c.id" class="underline underline-offset-2 font-semibold" @click="emit('abrir', c, a.aba, a.modelo)">{{ c.nome || telefoneFormatado(c.telefone) }}</button>
      </template>
    </div>

    <div class="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      <section v-for="grupo in grupos" :key="grupo.id" class="w-80 shrink-0 rounded-3xl bg-gray-200/50 dark:bg-zinc-900/60 p-3 flex flex-col gap-2.5 min-h-[260px]">
        <header class="px-1.5 pt-1 flex items-baseline justify-between">
          <h3 class="font-serif text-xl" :class="grupo.cor">{{ grupo.titulo }}</h3>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 dark:bg-zinc-800">{{ grupo.itens.length }}</span>
        </header>
        <p v-if="!grupo.itens.length" class="text-sm italic text-gray-400 px-1.5 py-2">{{ grupo.vazio }}</p>
        <article
          v-for="it in grupo.itens" :key="it.id"
          class="rounded-2xl bg-white dark:bg-zinc-800 p-3 border-l-4 shadow-sm hover:shadow-md transition-shadow space-y-1.5"
          :class="grupo.id === 'atrasado' ? 'border-danger' : grupo.id === 'hoje' ? 'border-secondary' : 'border-gray-300 dark:border-zinc-700'"
        >
          <div class="flex items-center gap-2 cursor-pointer" @click="it.onClick">
            <span class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                  :class="grupo.id === 'atrasado' ? 'bg-danger/15 text-danger-dark' : 'bg-secondary/15 text-secondary-dark'">
              <Icon v-if="grupo.id === 'atrasado'" name="ph:warning-bold" class="text-xs" />
              <template v-else>{{ it.badge[0] }}</template>
            </span>
            <p class="font-bold text-sm truncate flex-1">{{ it.titulo }}</p>
          </div>
          <p class="text-xs text-gray-500 dark:text-zinc-400 cursor-pointer" @click="it.onClick">{{ it.detalhe }}</p>
          <div class="flex items-center justify-between pt-0.5">
            <span class="text-[10px]" :class="grupo.id === 'atrasado' ? 'text-danger font-bold' : 'text-gray-400'">{{ it.quando }}</span>
            <div v-if="it.contato" class="flex gap-1.5">
              <button class="btn-mini bg-primary text-white hover:bg-primary-light" @click.stop="emit('andamento', it.contato)">Feito</button>
              <button class="btn-mini border border-gray-300 dark:border-zinc-700 hover:border-primary" @click.stop="emit('adiar', it.contato)">Adiar</button>
            </div>
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

interface ItemLinha { id: string; badge: string; titulo: string; detalhe: string; quando: string; contato: Contato | null; onClick: () => void }

function deCompromisso(c: Compromisso): ItemLinha {
  const data = dataCompromisso(c)
  return {
    id: `k-${c.id}`,
    badge: TIPOS_COMPROMISSO[c.tipo].nome,
    titulo: c.titulo,
    detalhe: [TIPOS_COMPROMISSO[c.tipo].nome, c.contato?.nome, c.caso?.numero_processo].filter(Boolean).join(' · ') || '—',
    quando: data < hoje ? `há ${Math.round((Date.now() - new Date(data).getTime()) / 864e5)} dia(s)` : diaRelativo(data),
    contato: null,
    onClick: () => { if (c.contato) emit('abrir', c.contato as Contato) },
  }
}
function deContato(c: Contato): ItemLinha {
  return {
    id: `c-${c.id}`,
    badge: 'Contato',
    titulo: c.proxima_acao || '—',
    detalhe: [c.nome || telefoneFormatado(c.telefone), c.area].filter(Boolean).join(' · '),
    quando: c.proxima_data ? diaRelativo(c.proxima_data) : '—',
    contato: c,
    onClick: () => emit('abrir', c),
  }
}

const grupos = computed(() => {
  const compAtrasados = props.agenda.compromissos.filter(c => dataCompromisso(c) < hoje)
  const compHoje = props.agenda.compromissos.filter(c => dataCompromisso(c) === hoje)
  const compSemana = props.agenda.compromissos.filter(c => dataCompromisso(c) > hoje)
  return [
    { id: 'atrasado', titulo: '⚠ Atrasado', cor: 'text-danger', vazio: 'Nada atrasado.', itens: [...compAtrasados.map(deCompromisso), ...props.agenda.atrasadas.map(deContato)] },
    { id: 'hoje', titulo: '● Hoje', cor: 'text-secondary-dark', vazio: 'Nada marcado para hoje.', itens: [...compHoje.map(deCompromisso), ...props.agenda.hoje.map(deContato)] },
    { id: 'semana', titulo: 'Próximos 7 dias', cor: 'text-gray-400', vazio: 'Semana livre por enquanto.', itens: [...compSemana.map(deCompromisso), ...props.agenda.semana.map(deContato)] },
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
.btn-mini { @apply text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full transition-colors; }
</style>
