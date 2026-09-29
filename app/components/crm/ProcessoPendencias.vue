<template>
  <div class="space-y-2" data-testid="pendencias">
    <ul v-if="pendencias.length" class="divide-y divide-gray-50 dark:divide-zinc-800/60 text-sm">
      <li v-for="p in pendencias" :key="p.id" class="py-1.5 flex flex-wrap items-center gap-2" :data-testid="`pendencia-${p.id}`">
        <button type="button" class="size-5 shrink-0 rounded-full border flex items-center justify-center text-white text-xs" :class="p.resolvida_em ? 'bg-success border-success' : 'border-gray-300 bg-white dark:bg-zinc-900'" :title="p.resolvida_em ? 'Reabrir' : 'Marcar como resolvida'" :data-testid="`pendencia-check-${p.id}`" @click="alternar(p)">
          <Icon v-if="p.resolvida_em" name="ph:check-bold" />
        </button>
        <span class="flex-1 min-w-[10rem]" :class="p.resolvida_em ? 'line-through text-gray-400' : ''">{{ p.descricao }}</span>
        <span class="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500">aguardando {{ AGUARDANDO_PENDENCIA[p.aguardando].toLowerCase() }}</span>
        <span v-if="p.prazo && !p.resolvida_em" class="text-xs" :class="p.prazo < hoje ? 'text-danger font-semibold' : 'text-gray-400'">até {{ dataCurta(p.prazo) }}</span>
        <button type="button" class="text-gray-300 hover:text-danger" title="Excluir" @click="excluir(p)"><Icon name="ph:x-bold" /></button>
      </li>
    </ul>
    <p v-else class="text-xs text-gray-400">Nenhuma {{ judicial ? 'diligência' : 'exigência' }} ou pendência registrada.</p>
    <form class="grid grid-cols-1 sm:grid-cols-[1fr_170px_140px_auto] gap-2" @submit.prevent="adicionar">
      <input v-model="f.descricao" class="modal-input" :placeholder="judicial ? 'Ex.: juntar certidão de nascimento dos herdeiros' : 'Ex.: cartório exigiu certidão de ônus atualizada'" maxlength="500" data-testid="pend-descricao" />
      <select v-model="f.aguardando" class="modal-input" data-testid="pend-aguardando"><option v-for="(n, k) in AGUARDANDO_PENDENCIA" :key="k" :value="k">Aguardando: {{ n }}</option></select>
      <input v-model="f.prazo" type="date" class="modal-input" title="Prazo (opcional)" />
      <Button size="sm" type="submit" :disabled="!f.descricao.trim()" data-testid="pend-adicionar">Registrar</Button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import Button from '../Button.vue'
import { AGUARDANDO_PENDENCIA, type ProcessoPendencia } from '~~/shared/data/procedimentos'
import { dataCurta } from '../../utils/formatadores'
import { hojeISO } from '../../stores/crm'

const props = defineProps<{ processoId: number; pendencias: ProcessoPendencia[]; judicial: boolean }>()
const emit = defineEmits<{ mudou: [] }>()
const hoje = hojeISO()
const f = reactive({ descricao: '', aguardando: 'cliente', prazo: '' })
async function adicionar() {
  const url: string = `/api/processos/${props.processoId}/pendencias`
  await $fetch(url, { method: 'POST', body: { ...f, prazo: f.prazo || null } })
  f.descricao = ''; f.prazo = ''
  emit('mudou')
}
async function alternar(p: ProcessoPendencia) {
  const url: string = `/api/processo-pendencias/${p.id}`
  await $fetch(url, { method: 'PUT', body: { resolvida: !p.resolvida_em } })
  emit('mudou')
}
async function excluir(p: ProcessoPendencia) {
  if (!confirm('Excluir esta pendência?')) return
  const url: string = `/api/processo-pendencias/${p.id}`
  await $fetch(url, { method: 'DELETE' })
  emit('mudou')
}
</script>
