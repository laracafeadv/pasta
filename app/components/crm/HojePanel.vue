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

    <form class="flex gap-2" @submit.prevent="adicionarTarefa">
      <input v-model="novaTarefa" type="text" class="flex-1 rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm" placeholder="Nova tarefa para hoje…" />
      <button type="submit" class="px-5 py-2 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider">Adicionar</button>
    </form>

    <!-- Hoje só mostra o que exige ação agora: o que já venceu e o que vence hoje. O resto vive em Tarefas e Prazos. -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <section v-for="grupo in grupos" :key="grupo.id" class="rounded-3xl bg-gray-200/50 dark:bg-zinc-900/60 p-3 flex flex-col gap-2.5 min-h-[200px]">
        <header class="px-1.5 pt-1 flex items-baseline justify-between">
          <h3 class="font-serif text-xl" :class="grupo.cor">{{ grupo.titulo }}</h3>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 dark:bg-zinc-800">{{ grupo.itens.length }}</span>
        </header>
        <p v-if="!grupo.itens.length" class="text-sm italic text-gray-400 px-1.5 py-2">{{ grupo.vazio }}</p>
        <article
          v-for="it in grupo.itens" :key="it.id"
          class="rounded-2xl bg-white dark:bg-zinc-800 p-3 border-l-4 shadow-sm hover:shadow-md transition-shadow space-y-1.5"
          :class="grupo.id === 'atrasado' ? 'border-danger' : 'border-secondary'"
        >
          <div class="flex items-center gap-2" :class="it.onClick ? 'cursor-pointer' : ''" @click="it.onClick?.()">
            <span class="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  :class="grupo.id === 'atrasado' ? 'bg-danger/15 text-danger-dark' : 'bg-secondary/15 text-secondary-dark'">
              <Icon :name="it.icone" class="text-xs" />
            </span>
            <p class="font-bold text-sm truncate flex-1">{{ it.titulo }}</p>
            <span class="text-[10px] uppercase tracking-wider text-gray-400 shrink-0">{{ it.tipo }}</span>
          </div>
          <p v-if="it.detalhe" class="text-xs text-gray-500 dark:text-zinc-400" :class="it.onClick ? 'cursor-pointer' : ''" @click="it.onClick?.()">{{ it.detalhe }}</p>
          <div class="flex items-center justify-between pt-0.5">
            <span class="text-[10px]" :class="grupo.id === 'atrasado' ? 'text-danger font-bold' : 'text-gray-400'">{{ it.quando }}</span>
            <div v-if="it.contato" class="flex gap-1.5">
              <button class="btn-mini bg-primary text-white hover:bg-primary-light" @click.stop="emit('andamento', it.contato)">Feito</button>
              <button class="btn-mini border border-gray-300 dark:border-zinc-700 hover:border-primary" @click.stop="emit('adiar', it.contato)">Adiar</button>
            </div>
            <div v-else-if="it.tarefa" class="flex gap-1.5">
              <button class="btn-mini bg-primary text-white hover:bg-primary-light" @click.stop="concluirTarefa(it.tarefa)">Feita</button>
              <button class="btn-mini border border-gray-300 dark:border-zinc-700 hover:border-primary" @click.stop="adiarTarefa(it.tarefa)">Amanhã</button>
            </div>
            <NuxtLink v-else-if="it.compromisso" to="/clientes?aba=prazos" class="btn-mini border border-gray-300 dark:border-zinc-700 hover:border-primary" @click.stop>Ver prazos</NuxtLink>
          </div>
        </article>
      </section>
    </div>

    <!-- Só uma contagem: a lista completa do que vem depois fica nas abas Tarefas e Prazos. -->
    <p v-if="proximos.total" class="text-xs text-gray-500 px-1">
      Próximos 7 dias:
      <NuxtLink v-if="proximos.tarefas" to="/clientes?aba=tarefas" class="underline underline-offset-2 hover:text-primary">{{ proximos.tarefas }} tarefa(s)</NuxtLink><template v-if="proximos.tarefas && (proximos.prazos || proximos.contatos)"> · </template>
      <NuxtLink v-if="proximos.prazos" to="/clientes?aba=prazos" class="underline underline-offset-2 hover:text-primary">{{ proximos.prazos }} prazo(s)</NuxtLink><template v-if="proximos.prazos && proximos.contatos"> · </template>
      <span v-if="proximos.contatos">{{ proximos.contatos }} retorno(s) de contato</span>
    </p>

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
import { computed, ref, watch } from 'vue'
import TarefaItem from './TarefaItem.vue'
import { TIPOS_COMPROMISSO, dataCompromisso, situacaoData, type Compromisso, type Contato, type TarefaInterna } from '../../../shared/types/crm'
import type { Agenda } from '../../stores/crm'
import { diaRelativo, telefoneFormatado } from '../../utils/formatadores'
import { hojeISO } from '../../stores/crm'

const hoje = hojeISO()
const mostrarSemAcao = ref(false)

const props = defineProps<{ agenda: Agenda }>()
const emit = defineEmits<{ abrir: [c: Contato, aba?: string, modelo?: string]; andamento: [c: Contato]; adiar: [c: Contato] }>()

// ─── Tarefas do dia ──────────────────────────────────────────────────────────
// Vêm junto com a agenda (uma única chamada). Aqui só entram as que vencem hoje ou já venceram.
const tarefas = ref<TarefaInterna[]>([])
watch(() => props.agenda.tarefas, (v) => { tarefas.value = [...(v ?? [])] }, { immediate: true })
const novaTarefa = ref('')

async function adicionarTarefa() {
  const titulo = novaTarefa.value.trim()
  if (!titulo) return
  const t = await $fetch<TarefaInterna>('/api/tarefas', { method: 'POST', body: { titulo, prazo: hoje } })
  tarefas.value.push(t)
  novaTarefa.value = ''
}
async function concluirTarefa(t: TarefaInterna) {
  tarefas.value = tarefas.value.filter(x => x.id !== t.id)
  await $fetch(`/api/tarefas/${t.id}`, { method: 'PATCH', body: { concluida: true } })
}
async function adiarTarefa(t: TarefaInterna) {
  t.prazo = hojeISO(1)
  await $fetch(`/api/tarefas/${t.id}`, { method: 'PATCH', body: { prazo: t.prazo } })
}

interface ItemLinha {
  id: string; icone: string; tipo: string; titulo: string; detalhe: string; quando: string
  contato: Contato | null; tarefa: TarefaInterna | null; compromisso: Compromisso | null; onClick?: () => void
}

function deCompromisso(c: Compromisso): ItemLinha {
  const data = dataCompromisso(c)
  return {
    id: `k-${c.id}`, icone: TIPOS_COMPROMISSO[c.tipo].icone, tipo: TIPOS_COMPROMISSO[c.tipo].nome, titulo: c.titulo,
    detalhe: [c.contato?.nome, c.caso?.numero_processo].filter(Boolean).join(' · '),
    quando: data < hoje ? `há ${Math.round((Date.now() - new Date(data).getTime()) / 864e5)} dia(s)` : diaRelativo(data),
    contato: null, tarefa: null, compromisso: c,
    onClick: c.contato ? () => emit('abrir', c.contato as Contato) : undefined,
  }
}
function deContato(c: Contato): ItemLinha {
  return {
    id: `c-${c.id}`, icone: 'ph:user-bold', tipo: 'Retorno', titulo: c.proxima_acao || '—',
    detalhe: [c.nome || telefoneFormatado(c.telefone), c.area].filter(Boolean).join(' · '),
    quando: c.proxima_data ? diaRelativo(c.proxima_data) : '—',
    contato: c, tarefa: null, compromisso: null, onClick: () => emit('abrir', c),
  }
}
function deTarefa(t: TarefaInterna): ItemLinha {
  return {
    id: `t-${t.id}`, icone: 'ph:check-square-bold', tipo: 'Tarefa', titulo: t.titulo,
    detalhe: [t.contato?.nome, t.caso?.titulo].filter(Boolean).join(' · ') || t.descricao || '',
    quando: t.prazo < hoje ? `há ${Math.round((Date.now() - new Date(t.prazo).getTime()) / 864e5)} dia(s)` : '',
    contato: null, tarefa: t, compromisso: null,
  }
}

// Prazo legal primeiro, depois retornos de contato, depois tarefas.
const grupos = computed(() => {
  const comp = props.agenda.compromissos
  return [
    { id: 'atrasado', titulo: '⚠ Atrasado', cor: 'text-danger', vazio: 'Nada atrasado.',
      itens: [
        ...comp.filter(c => situacaoData(dataCompromisso(c), hoje) === 'atrasado').map(deCompromisso),
        ...props.agenda.atrasadas.map(deContato),
        ...tarefas.value.filter(t => situacaoData(t.prazo, hoje) === 'atrasado').map(deTarefa),
      ] },
    { id: 'hoje', titulo: '● Hoje', cor: 'text-secondary-dark', vazio: 'Nada marcado para hoje.',
      itens: [
        ...comp.filter(c => situacaoData(dataCompromisso(c), hoje) === 'hoje').map(deCompromisso),
        ...props.agenda.hoje.map(deContato),
        ...tarefas.value.filter(t => situacaoData(t.prazo, hoje) === 'hoje').map(deTarefa),
      ] },
  ]
})

// O que vem depois de hoje: só contagem, com link para a aba certa.
const proximos = computed(() => {
  const tarefasFuturas = tarefas.value.filter(t => situacaoData(t.prazo, hoje) === 'futuro').length
  const prazos = props.agenda.compromissos.filter(c => situacaoData(dataCompromisso(c), hoje) === 'futuro').length
  const contatos = props.agenda.semana.length
  return { tarefas: tarefasFuturas, prazos, contatos, total: tarefasFuturas + prazos + contatos }
})

const avisos = computed(() => {
  const lista: { chave: string; texto: string; itens: Contato[]; aba: string; modelo?: string }[] = []
  if (props.agenda.sugestoes?.length) lista.push({ chave: 'sugestoes', texto: 'resposta sugerida, revise e envie:', itens: props.agenda.sugestoes, aba: 'conversa' })
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
