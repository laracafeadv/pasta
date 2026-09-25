<template>
  <Modal :is-open="isOpen" :title="caso ? 'Editar caso' : 'Abrir caso'" max-width="2xl" :loading="salvando" @close="emit('close')">
    <form id="caso-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="salvar">
      <label class="field sm:col-span-2"><span>Título *</span><input v-model="form.titulo" class="modal-input" required placeholder="Ex.: Divórcio consensual — Juliana x Marcos" /></label>
      <label class="field">
        <span>Tipo</span>
        <select v-model="form.tipo" class="modal-input"><option v-for="(n, k) in TIPOS_CASO" :key="k" :value="k">{{ n }}</option></select>
      </label>
      <label class="field">
        <span>Área</span>
        <select v-model="form.area" class="modal-input"><option value="">—</option><option v-for="a in Object.keys(AREAS)" :key="a">{{ a }}</option></select>
      </label>
      <label v-if="form.tipo === 'judicial'" class="field sm:col-span-2">
        <span>Número do processo (CNJ)</span>
        <input v-model="form.numero_processo" class="modal-input font-mono" placeholder="0000000-00.0000.0.00.0000" />
        <small v-if="form.numero_processo" :class="cnjOk ? 'text-success-dark' : 'text-danger'">{{ cnjOk ? 'Número válido' : 'Dígito verificador não confere' }}</small>
      </label>
      <label class="field"><span>{{ form.tipo === 'extrajudicial' ? 'Cartório' : 'Vara / órgão' }}</span><input v-model="form.orgao" class="modal-input" /></label>
      <div class="grid grid-cols-[1fr_90px] gap-2">
        <label class="field"><span>Comarca</span><input v-model="form.comarca" class="modal-input" /></label>
        <label class="field"><span>UF</span><select v-model="form.uf" class="modal-input"><option value="">—</option><option v-for="u in UFS" :key="u">{{ u }}</option></select></label>
      </div>
      <label class="field sm:col-span-2"><span>Parte contrária</span><input v-model="form.parte_contraria" class="modal-input" /></label>
      <label class="field">
        <span>Status</span>
        <select v-model="form.status" class="modal-input"><option v-for="(n, k) in STATUS_CASO" :key="k" :value="k">{{ n }}</option></select>
      </label>
      <label class="field"><span>Abertura</span><input v-model="form.data_abertura" type="date" class="modal-input" /></label>
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
import { AREAS, STATUS_CASO, TIPOS_CASO, UFS, type Caso, type Contato } from '../../../shared/types/crm'
import { numeroCnjValido } from '../../../shared/utils/juridico'
import { hojeISO } from '../../stores/crm'

const props = defineProps<{ isOpen: boolean; contato: Pick<Contato, 'id' | 'nome' | 'area' | 'demanda' | 'parte_contraria'> | null; caso?: Caso | null }>()
const emit = defineEmits<{ close: []; salvo: [c: Caso] }>()

const form = reactive<Record<string, any>>({})
const salvando = ref(false)
const erro = ref<string | null>(null)
const cnjOk = computed(() => !form.numero_processo || numeroCnjValido(form.numero_processo))

watch(() => props.isOpen, (open) => {
  if (!open) return
  erro.value = null
  const c = props.contato
  Object.assign(form, props.caso ?? {
    titulo: c ? `${c.demanda || c.area || 'Caso'} — ${c.nome ?? ''}`.trim() : '',
    tipo: 'judicial', area: c?.area ?? '', numero_processo: '', orgao: '', comarca: '', uf: '',
    parte_contraria: c?.parte_contraria ?? '', status: 'ativo', data_abertura: hojeISO(), observacoes: '',
  })
})

async function salvar() {
  salvando.value = true
  erro.value = null
  try {
    const body = { ...form, contato_id: props.contato?.id }
    const r = props.caso
      ? await $fetch<Caso>(`/api/casos/${props.caso.id}`, { method: 'PUT', body })
      : await $fetch<Caso>('/api/casos', { method: 'POST', body })
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
