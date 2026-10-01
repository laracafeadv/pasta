<template>
  <div class="rounded-2xl border p-3 text-sm" :class="[processo.status === 'encerrado' ? 'opacity-80 border-gray-100 dark:border-zinc-800' : judicial ? 'border-primary/25' : 'border-secondary/40', judicial ? '' : 'bg-secondary/5']" :data-testid="`processo-${processo.id}`">
    <!-- Cabeçalho: cada natureza mostra o que é dela -->
    <div class="flex flex-wrap items-baseline gap-2">
      <span class="text-[10px] font-bold uppercase tracking-widest" :class="judicial ? 'text-primary' : 'text-secondary-dark'">{{ NATUREZAS_PROCESSO[processo.natureza] }}</span>
      <template v-if="judicial">
        <span v-if="processo.numero" class="font-mono text-xs" data-testid="numero-cnj">{{ processo.numero }}</span>
        <span v-else class="text-xs text-gray-400">sem número (distribuição pendente)</span>
      </template>
      <template v-else>
        <span v-if="processo.tipo_procedimento" class="text-xs font-medium">{{ processo.tipo_procedimento }}</span>
        <span v-if="processo.numero" class="text-xs text-gray-500">· protocolo {{ processo.numero }}</span>
      </template>
      <span class="tag ml-auto" :class="processo.status === 'encerrado' ? '' : ''">{{ processo.status === 'encerrado' && processo.desfecho ? processo.desfecho : STATUS_DEMANDA[processo.status] }}</span>
    </div>
    <p class="text-xs text-gray-500 mt-0.5" data-testid="processo-dados">
      <template v-if="judicial">{{ [processo.tribunal, processo.orgao, processo.comarca && `${processo.comarca}${processo.uf ? '/' + processo.uf : ''}`].filter(Boolean).join(' · ') || 'Tribunal e vara não informados' }}<span v-if="processo.fase"> · fase: {{ processo.fase }}</span><span v-if="processo.valor"> · causa {{ brl(processo.valor) }}</span></template>
      <template v-else>{{ [processo.orgao, processo.comarca && `${processo.comarca}${processo.uf ? '/' + processo.uf : ''}`].filter(Boolean).join(' · ') || 'Cartório / serventia não informado' }}<span v-if="processo.fase"> · etapa: {{ processo.fase }}</span><span v-if="processo.valor"> · ato {{ brl(processo.valor) }}</span></template>
      <span v-if="responsavel"> · resp.: {{ responsavel }}</span>
      <span v-if="!judicial && processo.responsavel_nome"> · contato no cartório: {{ processo.responsavel_nome }}</span>
    </p>

    <!-- Resumo do que está travando / em andamento -->
    <p v-if="!judicial && processo.status !== 'encerrado' && etapas.length" class="text-xs mt-1 text-gray-500">{{ concluidas }} de {{ etapas.length }} etapas · {{ abertas }} pendência(s) em aberto</p>
    <p v-else-if="judicial && processo.status !== 'encerrado' && abertas" class="text-xs mt-1 text-warning-dark">{{ abertas }} diligência(s)/pendência(s) em aberto</p>

    <div class="flex flex-wrap gap-3 pt-1 text-xs">
      <button type="button" class="underline underline-offset-2" @click="emit('editar', processo)">Editar</button>
      <a v-if="processo.link" :href="processo.link" target="_blank" rel="noopener" class="underline underline-offset-2">{{ judicial ? 'Abrir no tribunal' : 'Acompanhar online' }}</a>
      <button v-if="!judicial" type="button" class="underline underline-offset-2" data-testid="ver-etapas" @click="abrir('etapas')">Etapas ({{ concluidas }}/{{ etapas.length }})</button>
      <button type="button" class="underline underline-offset-2" data-testid="ver-pendencias" @click="abrir('pendencias')">{{ judicial ? 'Diligências / pendências' : 'Exigências / pendências' }} ({{ abertas }})</button>
      <button type="button" class="underline underline-offset-2" data-testid="ver-movimentacoes" @click="abrir('mov')">{{ judicial ? 'Movimentações' : 'Andamentos' }} ({{ movimentacoes.length }})</button>
      <NuxtLink v-if="judicial && processo.status !== 'encerrado'" :to="`/intimacoes?processo=${processo.id}`" class="underline underline-offset-2" data-testid="registrar-intimacao">Registrar intimação</NuxtLink>
      <NuxtLink v-if="processo.status !== 'encerrado'" :to="`/agenda?contato=${processo.contato_id}&demanda=${processo.caso_id}&processo=${processo.id}`" class="underline underline-offset-2">{{ judicial ? 'Novo prazo' : 'Novo prazo / compromisso' }}</NuxtLink>
      <button v-if="processo.status !== 'encerrado'" type="button" class="font-semibold text-primary dark:text-zinc-200 underline underline-offset-2" data-testid="concluir" @click="concluindo = !concluindo">{{ judicial ? 'Encerrar processo' : 'Concluir procedimento' }}</button>
      <button v-else type="button" class="underline underline-offset-2" data-testid="reabrir" @click="reabrir">Reabrir</button>
      <button type="button" class="text-gray-400 hover:text-danger ml-auto" @click="excluir">Excluir</button>
    </div>

    <!-- Conclusão (desfecho próprio da natureza) -->
    <form v-if="concluindo" class="mt-2 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 p-3 space-y-2" data-testid="form-concluir" @submit.prevent="concluir">
      <p class="text-xs text-gray-500">{{ judicial ? 'Como o processo terminou?' : 'Como o procedimento terminou?' }} <span v-if="!judicial" class="text-gray-400">(um desfecho de sucesso exige todas as etapas cumpridas ou dispensadas e nenhuma pendência aberta)</span></p>
      <div class="grid grid-cols-1 sm:grid-cols-[1fr_150px_auto] gap-2">
        <select v-model="desfecho" class="modal-input" required data-testid="desfecho"><option value="">Escolha o desfecho…</option><option v-for="d in desfechos" :key="d.valor" :value="d.valor">{{ d.valor }}</option></select>
        <input v-model="dataConclusao" type="date" class="modal-input" />
        <Button type="submit" size="sm" :loading="salvando" :disabled="!desfecho" data-testid="confirmar-conclusao">Concluir</Button>
      </div>
      <p v-if="erro" class="text-xs text-danger" data-testid="erro-conclusao">{{ erro }}</p>
    </form>
    <p v-if="aviso" class="mt-2 text-xs rounded-lg bg-secondary/10 border border-secondary/30 p-2" data-testid="aviso-demanda">{{ aviso }}</p>

    <div v-if="painel" class="mt-2 border-t border-gray-100 dark:border-zinc-800 pt-2">
      <ProcessoEtapas v-if="painel === 'etapas' && !judicial" :processo-id="processo.id" :etapas="etapas" @mudou="emit('mudou')" />
      <ProcessoPendencias v-else-if="painel === 'pendencias'" :processo-id="processo.id" :pendencias="pendencias" :judicial="judicial" @mudou="emit('mudou')" />
      <ProcessoMovimentacoes v-else-if="painel === 'mov'" :processo-id="processo.id" :movimentacoes="movimentacoes" :judicial="judicial" @mudou="emit('mudou')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from '../Button.vue'
import ProcessoEtapas from './ProcessoEtapas.vue'
import ProcessoPendencias from './ProcessoPendencias.vue'
import ProcessoMovimentacoes from './ProcessoMovimentacoes.vue'
import { NATUREZAS_PROCESSO, STATUS_DEMANDA, type Movimentacao, type Processo } from '../../../shared/types/crm'
import { desfechosDa, type ProcessoEtapa, type ProcessoPendencia } from '~~/shared/data/procedimentos'
import { brl } from '../../utils/formatadores'
import { hojeISO } from '../../stores/crm'

// Processo JUDICIAL e procedimento EXTRAJUDICIAL: mesma base, fluxos próprios.
//  Judicial: CNJ, tribunal/vara, fase, movimentações, diligências e prazos.
//  Extrajudicial: tipo de procedimento, cartório, ETAPAS formais, exigências e conclusão do ato.
const props = withDefaults(defineProps<{ processo: Processo; movimentacoes: Movimentacao[]; etapas?: ProcessoEtapa[]; pendencias?: ProcessoPendencia[]; responsavel?: string | null }>(), { etapas: () => [], pendencias: () => [], responsavel: null })
const emit = defineEmits<{ editar: [p: Processo]; mudou: [] }>()

const judicial = computed(() => props.processo.natureza === 'judicial')
const painel = ref<'etapas' | 'pendencias' | 'mov' | null>(null)
const abrir = (p: 'etapas' | 'pendencias' | 'mov') => { painel.value = painel.value === p ? null : p }
const concluidas = computed(() => props.etapas.filter(e => e.status !== 'pendente').length)
const abertas = computed(() => props.pendencias.filter(p => !p.resolvida_em).length)
const desfechos = computed(() => desfechosDa(props.processo.natureza))

const concluindo = ref(false)
const desfecho = ref('')
const dataConclusao = ref(hojeISO())
const salvando = ref(false)
const erro = ref<string | null>(null)
const aviso = ref<string | null>(null)
async function concluir() {
  salvando.value = true
  erro.value = null
  try {
    const url: string = `/api/processos/${props.processo.id}/concluir`
    const r = await $fetch<{ demandaSemProcessoAberto: boolean }>(url, { method: 'POST', body: { desfecho: desfecho.value, data: dataConclusao.value } })
    concluindo.value = false
    aviso.value = r.demandaSemProcessoAberto ? 'Todos os processos/procedimentos desta demanda estão concluídos. Se o serviço acabou, encerre a demanda (Editar demanda → Status → Encerrado).' : null
    emit('mudou')
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível concluir.'
  } finally { salvando.value = false }
}
async function reabrir() {
  const url: string = `/api/processos/${props.processo.id}`
  await $fetch(url, { method: 'PUT', body: { status: 'ativo' } })
  emit('mudou')
}
async function excluir() {
  if (!confirm('Excluir este registro, as suas movimentações, etapas e pendências? Os prazos ligados a ele continuam na demanda.')) return
  const url: string = `/api/processos/${props.processo.id}`
  await $fetch(url, { method: 'DELETE' })
  emit('mudou')
}
</script>
