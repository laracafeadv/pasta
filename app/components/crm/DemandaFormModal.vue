<template>
  <Modal :is-open="isOpen" :title="demanda ? 'Editar demanda' : 'Nova demanda'" max-width="2xl" :loading="salvando" @close="emit('close')">
    <form id="caso-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="salvar">
      <label class="field sm:col-span-2"><span>Título *</span><input v-model="form.titulo" class="modal-input" required placeholder="Ex.: Pacto antenupcial — Juliana e Marcos" /></label>
      <label class="field">
        <span>Atuação</span>
        <select v-model="form.tipo" class="modal-input"><option v-for="(n, k) in TIPOS_DEMANDA" :key="k" :value="k">{{ n }}</option></select>
        <small class="text-gray-400">Processo ou procedimento, se houver, é registrado depois, dentro da demanda; a atuação acompanha.</small>
      </label>
      <label class="field">
        <span>Área</span>
        <select v-model="form.area" class="modal-input"><option value="">—</option><option v-for="a in Object.keys(AREAS)" :key="a">{{ a }}</option></select>
      </label>
      <label class="field sm:col-span-2">
        <span>Procedimento (define as etapas do checklist e as perguntas da demanda)</span>
        <select v-model="form.procedimento" class="modal-input" @change="procedimentoTocado = true">
          <option value="">Nenhum</option>
          <option v-for="p in PROCEDIMENTOS" :key="p.valor" :value="p.valor">{{ p.rotulo }}</option>
        </select>
      </label>
      <label class="field">
        <span>Status</span>
        <select v-model="form.status" class="modal-input"><option v-for="(n, k) in STATUS_DEMANDA" :key="k" :value="k">{{ n }}</option></select>
      </label>
      <label class="field"><span>Início</span><input v-model="form.data_abertura" type="date" class="modal-input" /></label>
      <template v-if="form.status === 'encerrado'">
        <label class="field">
          <span>Resultado</span>
          <select v-model="form.resultado" class="modal-input"><option :value="null">—</option><option v-for="(n, k) in RESULTADOS_DEMANDA" :key="k" :value="k">{{ n }}</option></select>
        </label>
        <label class="field"><span>Encerramento</span><input v-model="form.data_encerramento" type="date" class="modal-input" /></label>
      </template>
      <label class="field sm:col-span-2"><span>Observações</span><textarea v-model="form.observacoes" rows="3" class="modal-input" /></label>
      <p v-if="erro" class="sm:col-span-2 text-sm text-danger">{{ erro }}</p>
    </form>
    <template #footer>
      <div class="flex justify-end gap-3">
        <Button variant="outline" @click="emit('close')">Cancelar</Button>
        <Button form="caso-form" type="submit" :loading="salvando" icon="ph:check-bold">Salvar</Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Modal from '../Modal.vue'
import Button from '../Button.vue'
import { AREAS, RESULTADOS_DEMANDA, STATUS_DEMANDA, TIPOS_DEMANDA, type Demanda, type Contato } from '../../../shared/types/crm'
import { hojeISO } from '../../stores/crm'
import { PROCEDIMENTOS, sugerirProcedimento } from '~~/shared/data/checklist'

const props = defineProps<{ isOpen: boolean; contato: Pick<Contato, 'id' | 'nome' | 'area' | 'demanda' | 'parte_contraria'> | null; demanda?: Demanda | null }>()
const emit = defineEmits<{ close: []; salvo: [c: Demanda] }>()

const form = reactive<Record<string, any>>({})
const salvando = ref(false)
const erro = ref<string | null>(null)
const procedimentoTocado = ref(false)

// Serviços de aconselhamento e instrumentos não nascem como processo.
const DEMANDAS_CONSULTIVAS = ['Pacto antenupcial', 'Contrato de convivência', 'Regime de bens', 'Planejamento sucessório', 'Testamento', 'Parecer', 'Consultoria contínua']
function tipoInicial(c: { area?: string | null; demanda?: string | null } | null) {
  return DEMANDAS_CONSULTIVAS.includes(c?.demanda ?? '') || ['Planejamento Matrimonial', 'Consultoria Jurídica'].includes(c?.area ?? '') ? 'consultivo' : 'extrajudicial'
}

watch(() => props.isOpen, (open) => {
  if (!open) return
  erro.value = null
  const c = props.contato
  Object.assign(form, props.demanda ?? {
    titulo: c ? `${c.demanda || c.area || 'Demanda'} — ${c.nome ?? ''}`.trim() : '',
    tipo: tipoInicial(c), area: c?.area ?? '',
    status: 'ativo',
    data_abertura: hojeISO(), observacoes: '', resultado: null, data_encerramento: null,
    procedimento: sugerirProcedimento(c?.demanda, tipoInicial(c)) ?? '',
  })
  if (props.demanda) form.procedimento = props.demanda.procedimento ?? ''
  procedimentoTocado.value = !!props.demanda
})
// Nova demanda: a sugestão acompanha o tipo (judicial/extrajudicial) enquanto você não escolher outra.
watch(() => form.tipo, (tipo) => {
  if (props.demanda || procedimentoTocado.value) return
  form.procedimento = sugerirProcedimento(props.contato?.demanda, tipo) ?? ''
})

async function salvar() {
  salvando.value = true
  erro.value = null
  try {
    const body = { ...form, contato_id: props.contato?.id }
    const r = props.demanda
      ? await $fetch<Demanda>(`/api/demandas/${props.demanda.id}`, { method: 'PUT', body })
      : await $fetch<Demanda>('/api/demandas', { method: 'POST', body })
    emit('salvo', r)
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível salvar.'
  } finally {
    salvando.value = false
  }
}
</script>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
