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
      <label v-if="form.etapa === 'perdido'" class="field">
        <span>Motivo da perda *</span>
        <select v-model="form.motivo_perda" class="modal-input" required>
          <option value="">—</option>
          <option v-for="m in MOTIVOS_PERDA" :key="m">{{ m }}</option>
        </select>
      </label>
      <div v-if="etapa(form.etapa).aberta" class="grid grid-cols-1 sm:grid-cols-[1fr_170px] gap-3 rounded-lg bg-primary/5 border border-primary/10 p-3">
        <label class="field">
          <span>Próxima ação *</span>
          <input ref="acaoInput" v-model="form.proxima_acao" class="modal-input" required maxlength="300" />
        </label>
        <label class="field">
          <span>Quando *</span>
          <input v-model="form.proxima_data" type="date" class="modal-input" required />
        </label>
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
import { nextTick, reactive, ref, watch } from 'vue'
import Modal from '../Modal.vue'
import Button from '../Button.vue'
import { ETAPAS, MOTIVOS_PERDA, etapa, type Contato } from '../../../shared/types/crm'
import { hojeISO, somarDias, type AndamentoPayload } from '../../stores/crm'

const props = defineProps<{ isOpen: boolean; contato: Contato | null; etapaDestino?: string | null; loading?: boolean; erro?: string | null }>()
const emit = defineEmits<{ close: []; submit: [data: AndamentoPayload] }>()

const acaoInput = ref<HTMLInputElement | null>(null)
const form = reactive({ resultado: '', etapa: 'novo', motivo_perda: '', proxima_acao: '', proxima_data: '' })

watch(() => props.isOpen, async (open) => {
  if (!open || !props.contato) return
  Object.assign(form, {
    resultado: '',
    etapa: props.etapaDestino || props.contato.etapa,
    motivo_perda: '',
    proxima_acao: '',
    proxima_data: somarDias(hojeISO(), 2),
  })
  await nextTick()
  acaoInput.value?.focus()
})

function handleSubmit() {
  emit('submit', { ...form })
}
</script>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
