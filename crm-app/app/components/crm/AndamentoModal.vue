<template>
  <Modal
    :is-open="isOpen"
    :title="contato?.nome || 'Registrar andamento'"
    description="Registre o que aconteceu e decida o próximo passo — ou encerre o caso."
    :loading="loading"
    max-width="lg"
    @close="emit('close')"
  >
    <form id="andamento-form" class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <div class="rounded-lg bg-gray-50 dark:bg-zinc-800/50 p-3 text-sm">
        <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ação concluída</p>
        <p class="mt-1">{{ contato?.proxima_acao || (etapaDestino ? `Mover para “${etapa(etapaDestino).nome}”` : 'Nenhuma ação definida') }}</p>
      </div>
      <label class="field">
        <span>O que aconteceu?</span>
        <textarea v-model="form.resultado" rows="2" class="modal-input" placeholder="Resultado da conversa, decisão da pessoa…" />
      </label>
      <label class="field">
        <span>Etapa agora</span>
        <select v-model="form.etapa" class="modal-input">
          <option v-for="e in ETAPAS" :key="e.id" :value="e.id">{{ e.nome }}</option>
        </select>
      </label>
      <label v-if="form.etapa === 'agendado'" class="field">
        <span>Data e hora da consulta</span>
        <input v-model="form.consulta_em" type="datetime-local" class="modal-input" />
      </label>
      <label v-if="form.etapa === 'perdido'" class="field">
        <span>Motivo da perda *</span>
        <select v-model="form.motivo_perda" class="modal-input" required>
          <option value="">—</option>
          <option v-for="m in MOTIVOS_PERDA" :key="m">{{ m }}</option>
        </select>
      </label>
      <div v-if="etapa(form.etapa).aberta" class="rounded-lg bg-primary/5 border border-primary/10 p-3 space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-[1fr_170px] gap-3">
          <label class="field">
            <span>Próxima ação *</span>
            <input ref="acaoInput" v-model="form.proxima_acao" class="modal-input" required maxlength="300" />
          </label>
          <label class="field">
            <span>Quando *</span>
            <input v-model="form.proxima_data" type="date" class="modal-input" required />
          </label>
        </div>
        <p v-if="sugestao" class="text-xs text-gray-500">
          <Icon name="ph:lightbulb-bold" class="align-middle text-secondary" />
          Sugestão do método: <b>{{ sugestao.acao }}</b><span v-if="sugestao.modelo"> · mensagem pronta <code>{{ sugestao.modelo }}</code></span>
          <button v-if="form.proxima_acao !== sugestao.textoAcao" type="button" class="ml-1 underline" @click="aplicarSugestao">usar</button>
        </p>
      </div>
      <p v-if="erro" class="text-sm text-danger">{{ erro }}</p>
    </form>

    <template #footer>
      <div class="flex flex-col-reverse sm:flex-row justify-end gap-3">
        <Button variant="outline" @click="emit('close')">Cancelar</Button>
        <Button form="andamento-form" type="submit" :loading="loading" icon="ph:check-bold">Concluir</Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import Modal from '../Modal.vue'
import Button from '../Button.vue'
import { CADENCIA, ETAPAS, MOTIVOS_PERDA, SEQUENCIA_FOLLOWUP, etapa, type Contato } from '../../../shared/types/crm'
import { hojeISO, somarDias, type AndamentoPayload } from '../../stores/crm'

const props = defineProps<{ isOpen: boolean; contato: Contato | null; etapaDestino?: string | null; loading?: boolean; erro?: string | null }>()
const emit = defineEmits<{ close: []; submit: [data: AndamentoPayload & { consulta_em?: string | null }] }>()

const acaoInput = ref<HTMLInputElement | null>(null)
const form = reactive({ resultado: '', etapa: 'novo', motivo_perda: '', proxima_acao: '', proxima_data: '', consulta_em: '' })

/**
 * Próximo passo sugerido: continua a sequência de follow-up se a ação concluída
 * era um follow-up; senão, a cadência da etapa de destino.
 */
const sugestao = computed(() => {
  const concluida = props.contato?.proxima_acao ?? ''
  const mesmaEtapa = form.etapa === props.contato?.etapa
  const seq = mesmaEtapa ? SEQUENCIA_FOLLOWUP.find(s => s.se.test(concluida)) : undefined
  const base = seq ?? CADENCIA[form.etapa]
  if (!base) return null
  let data = somarDias(hojeISO(), Math.max(0, base.dias))
  // Lembrete da consulta: dia anterior à data marcada.
  if (form.etapa === 'agendado' && form.consulta_em) {
    const anterior = somarDias(form.consulta_em.slice(0, 10), -1)
    data = anterior < hojeISO() ? hojeISO() : anterior
  }
  return { acao: base.acao, modelo: base.modelo, data, textoAcao: base.modelo ? `${base.acao} — ${base.modelo}` : base.acao }
})

function aplicarSugestao() {
  if (!sugestao.value) return
  form.proxima_acao = sugestao.value.textoAcao
  form.proxima_data = sugestao.value.data
}

watch(() => props.isOpen, async (open) => {
  if (!open || !props.contato) return
  Object.assign(form, {
    resultado: '',
    etapa: props.etapaDestino || props.contato.etapa,
    motivo_perda: '',
    proxima_acao: '',
    proxima_data: somarDias(hojeISO(), 2),
    consulta_em: '',
  })
  aplicarSugestao()
  await nextTick()
  acaoInput.value?.select()
})

// Ao trocar a etapa ou a data da consulta, atualiza a sugestão se o campo ainda não foi editado à mão.
let ultimaSugestao = ''
watch(sugestao, (s, antiga) => {
  if (!s) return
  if (!form.proxima_acao || form.proxima_acao === (antiga?.textoAcao ?? ultimaSugestao)) {
    form.proxima_acao = s.textoAcao
    form.proxima_data = s.data
  }
  ultimaSugestao = s.textoAcao
})

function handleSubmit() {
  emit('submit', { ...form, consulta_em: form.consulta_em ? new Date(form.consulta_em).toISOString() : null })
}
</script>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
