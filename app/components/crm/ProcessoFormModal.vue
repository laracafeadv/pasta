<template>
  <Modal :is-open="isOpen" :title="titulo" max-width="2xl" :loading="salvando" @close="emit('close')">
    <form id="processo-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="salvar">
      <p class="sm:col-span-2 text-xs text-gray-500 -mt-1">{{ form.natureza === 'judicial' ? 'Processo em juízo: número CNJ, vara, fase, valor da causa.' : 'Procedimento fora do Judiciário (cartório, administrativo): protocolo, serventia e etapas.' }}</p>
      <label class="field sm:col-span-2">
        <span>{{ form.natureza === 'judicial' ? 'Número do processo (CNJ)' : 'Número / protocolo (opcional)' }}</span>
        <input v-model="form.numero" class="modal-input font-mono" :placeholder="form.natureza === 'judicial' ? '0000000-00.0000.0.00.0000' : 'Protocolo, livro/folha…'" />
        <small v-if="form.natureza === 'judicial' && form.numero" :class="cnjOk ? 'text-success-dark' : 'text-danger'">{{ cnjOk ? 'Número válido' : 'Dígito verificador não confere' }}</small>
      </label>
      <label v-if="form.natureza === 'judicial'" class="field sm:col-span-2"><span>Tribunal</span><input v-model="form.tribunal" class="modal-input" placeholder="Ex.: TJBA" /></label>
      <label class="field"><span>{{ form.natureza === 'judicial' ? 'Vara / juízo' : 'Cartório / serventia / órgão' }}</span><input v-model="form.orgao" class="modal-input" /></label>
      <div class="grid grid-cols-[1fr_90px] gap-2">
        <label class="field"><span>Comarca / cidade</span><input v-model="form.comarca" class="modal-input" /></label>
        <label class="field"><span>UF</span><select v-model="form.uf" class="modal-input"><option value="">—</option><option v-for="u in UFS" :key="u">{{ u }}</option></select></label>
      </div>
      <label class="field">
        <span>{{ form.natureza === 'judicial' ? 'Fase processual' : 'Etapa do procedimento' }}</span>
        <input v-model="form.fase" :list="`fases-${form.natureza}`" class="modal-input" />
        <datalist :id="`fases-${form.natureza}`"><option v-for="f in (form.natureza === 'judicial' ? FASES_PROCESSUAIS : FASES_EXTRAJUDICIAIS)" :key="f" :value="f" /></datalist>
      </label>
      <label class="field"><span>{{ form.natureza === 'judicial' ? 'Valor da causa' : 'Valor do ato (opcional)' }}</span><input v-model.number="form.valor" type="number" step="0.01" min="0" class="modal-input" /></label>
      <label v-if="form.natureza === 'extrajudicial'" class="field sm:col-span-2"><span>Tipo de procedimento</span><input v-model="form.tipo_procedimento" list="tipos-proc" class="modal-input" placeholder="Ex.: Escritura de inventário" /><datalist id="tipos-proc"><option v-for="t in TIPOS_PROCEDIMENTO" :key="t" :value="t" /></datalist></label>
      <label class="field sm:col-span-2"><span>Advogado / responsável</span><input v-model="form.responsavel_nome" class="modal-input" placeholder="Quem conduz" /></label>
      <label class="field"><span>Status</span><select v-model="form.status" class="modal-input"><option v-for="(n, k) in STATUS_CASO" :key="k" :value="k">{{ n }}</option></select></label>
      <label class="field"><span>Início</span><input v-model="form.data_inicio" type="date" class="modal-input" /></label>
      <label v-if="form.status === 'encerrado'" class="field"><span>Encerramento</span><input v-model="form.data_encerramento" type="date" class="modal-input" /></label>
      <label v-if="form.natureza === 'judicial'" class="field sm:col-span-2"><span>Link no tribunal</span><input v-model="form.link" type="url" class="modal-input" placeholder="https://…" /></label>
      <label class="field sm:col-span-2"><span>Observações</span><textarea v-model="form.observacoes" rows="2" class="modal-input" /></label>
      <p v-if="erro" class="sm:col-span-2 text-sm text-danger">{{ erro }}</p>
    </form>
    <template #footer>
      <div class="flex justify-end gap-3">
        <Button variant="outline" @click="emit('close')">Cancelar</Button>
        <Button form="processo-form" type="submit" :loading="salvando" icon="ph:check-bold">Salvar</Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Modal from '../Modal.vue'
import Button from '../Button.vue'
import { FASES_EXTRAJUDICIAIS, FASES_PROCESSUAIS, NATUREZAS_PROCESSO, STATUS_CASO, UFS, type Processo } from '../../../shared/types/crm'
const TIPOS_PROCEDIMENTO = ['Escritura pública (inventário, divórcio, partilha)', 'Escritura de pacto ou união estável', 'Averbação / registro', 'Habilitação de casamento', 'Retificação / regularização', 'Procedimento administrativo', 'Outro']
import { hojeISO } from '../../stores/crm'
import { numeroCnjValido } from '../../../shared/utils/juridico'

// Registra (ou edita) um processo judicial ou procedimento extrajudicial de uma demanda.
const props = defineProps<{ isOpen: boolean; casoId: number; natureza: keyof typeof NATUREZAS_PROCESSO; processo?: Processo | null }>()
const emit = defineEmits<{ close: []; salvo: [] }>()

const form = reactive<Record<string, any>>({})
const salvando = ref(false)
const erro = ref<string | null>(null)
const titulo = computed(() => `${props.processo ? 'Editar' : 'Registrar'} ${form.natureza === 'judicial' ? 'processo judicial' : 'procedimento extrajudicial'}`)
const cnjOk = computed(() => !form.numero || numeroCnjValido(form.numero))

watch(() => props.isOpen, (aberto) => {
  if (!aberto) return
  erro.value = null
  Object.assign(form, props.processo ?? {
    natureza: props.natureza, numero: '', responsavel_nome: '', tipo_procedimento: '', tribunal: '', orgao: '', comarca: '', uf: '', fase: '', status: 'ativo', valor: null, link: '',
    data_inicio: hojeISO(), data_encerramento: null, observacoes: '',
  })
})

async function salvar() {
  salvando.value = true
  erro.value = null
  try {
    const body = { ...form, caso_id: props.casoId }
    const url: string = props.processo ? `/api/processos/${props.processo.id}` : '/api/processos'
    await $fetch(url, { method: props.processo ? 'PUT' : 'POST', body })
    emit('salvo')
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
