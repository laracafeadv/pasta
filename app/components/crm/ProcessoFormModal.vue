<template>
  <Modal :is-open="isOpen" :title="titulo" max-width="2xl" :loading="salvando" @close="emit('close')">
    <form id="processo-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="salvar">
      <!-- JUDICIAL: o que é de um processo em juízo -->
      <template v-if="judicial">
        <p class="sm:col-span-2 text-xs text-gray-500 -mt-1">Processo em juízo: número CNJ, tribunal, vara, comarca, fase e valor da causa.</p>
        <label class="field sm:col-span-2">
          <span>Número do processo (CNJ)</span>
          <input v-model="form.numero" class="modal-input font-mono" placeholder="0000000-00.0000.0.00.0000" data-testid="pf-cnj" />
          <small v-if="form.numero" :class="cnjOk ? 'text-success-dark' : 'text-danger'">{{ cnjOk ? 'Número válido' : 'Dígito verificador não confere' }}</small>
          <small v-else class="text-gray-400">Pode ficar em branco até a distribuição.</small>
        </label>
        <label class="field"><span>Tribunal</span><input v-model="form.tribunal" class="modal-input" placeholder="Ex.: TJBA" data-testid="pf-tribunal" /></label>
        <label class="field"><span>Vara / juízo</span><input v-model="form.orgao" class="modal-input" placeholder="Ex.: 2ª Vara de Família" data-testid="pf-vara" /></label>
        <div class="grid grid-cols-[1fr_90px] gap-2">
          <label class="field"><span>Comarca</span><input v-model="form.comarca" class="modal-input" /></label>
          <label class="field"><span>UF</span><select v-model="form.uf" class="modal-input"><option value="">—</option><option v-for="u in UFS" :key="u">{{ u }}</option></select></label>
        </div>
        <label class="field">
          <span>Fase processual</span>
          <select v-model="form.fase" class="modal-input" data-testid="pf-fase"><option value="">—</option><option v-for="f in FASES_PROCESSUAIS" :key="f">{{ f }}</option></select>
        </label>
        <label class="field"><span>Valor da causa</span><input v-model.number="form.valor" type="number" step="0.01" min="0" class="modal-input" /></label>
        <label class="field"><span>Link no tribunal</span><input v-model="form.link" type="url" class="modal-input" placeholder="https://…" /></label>
      </template>

      <!-- EXTRAJUDICIAL: o que é de um procedimento fora do Judiciário -->
      <template v-else>
        <p class="sm:col-span-2 text-xs text-gray-500 -mt-1">Procedimento fora do Judiciário: o tipo define as etapas formais (protocolo, exigências, lavratura, registro…).</p>
        <label class="field sm:col-span-2">
          <span>Tipo de procedimento *</span>
          <select v-model="form.tipo_procedimento" class="modal-input" required data-testid="pf-tipo"><option value="">Escolha…</option><option v-for="t in TIPOS_PROCEDIMENTO_EXTRAJUDICIAL" :key="t.id" :value="t.nome">{{ t.nome }}</option></select>
          <small v-if="!processo" class="text-gray-400">As etapas do modelo são criadas automaticamente; você pode acrescentar, dispensar ou remover.</small>
        </label>
        <label class="field"><span>Cartório / serventia / órgão</span><input v-model="form.orgao" class="modal-input" placeholder="Ex.: 2º Tabelionato de Notas" data-testid="pf-cartorio" /></label>
        <label class="field"><span>Protocolo / livro-folha (opcional)</span><input v-model="form.numero" class="modal-input font-mono" /></label>
        <div class="grid grid-cols-[1fr_90px] gap-2">
          <label class="field"><span>Cidade</span><input v-model="form.comarca" class="modal-input" /></label>
          <label class="field"><span>UF</span><select v-model="form.uf" class="modal-input"><option value="">—</option><option v-for="u in UFS" :key="u">{{ u }}</option></select></label>
        </div>
        <label class="field"><span>Contato no cartório (escrevente)</span><input v-model="form.responsavel_nome" class="modal-input" /></label>
        <label class="field"><span>Valor do ato (opcional)</span><input v-model.number="form.valor" type="number" step="0.01" min="0" class="modal-input" /></label>
        <label class="field"><span>Link de acompanhamento (e-notariado, portal)</span><input v-model="form.link" type="url" class="modal-input" placeholder="https://…" /></label>
      </template>

      <label class="field"><span>Responsável no escritório</span><select v-model="form.responsavel_id" class="modal-input"><option v-for="m in equipe" :key="m.id" :value="m.id">{{ m.name || m.id }}</option></select></label>
      <label class="field"><span>Status</span><select v-model="form.status" class="modal-input"><option v-for="k in ['ativo', 'suspenso']" :key="k" :value="k">{{ STATUS_DEMANDA[k as 'ativo' | 'suspenso'] }}</option></select><small class="text-gray-400">Para encerrar, use “{{ judicial ? 'Encerrar processo' : 'Concluir procedimento' }}” no cartão.</small></label>
      <label class="field"><span>Início</span><input v-model="form.data_inicio" type="date" class="modal-input" /></label>
      <label class="field sm:col-span-2"><span>Observações</span><textarea v-model="form.observacoes" rows="2" class="modal-input" /></label>
      <p v-if="erro" class="sm:col-span-2 text-sm text-danger">{{ erro }}</p>
    </form>
    <template #footer>
      <div class="flex justify-end gap-3">
        <Button variant="outline" @click="emit('close')">Cancelar</Button>
        <Button form="processo-form" type="submit" :loading="salvando" icon="ph:check-bold" data-testid="pf-salvar">Salvar</Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { watch } from 'vue'
import Modal from '../Modal.vue'
import Button from '../Button.vue'
import { FASES_PROCESSUAIS, NATUREZAS_PROCESSO, STATUS_DEMANDA, UFS, type Processo } from '../../../shared/types/crm'
import { TIPOS_PROCEDIMENTO_EXTRAJUDICIAL } from '~~/shared/data/procedimentos'
import { hojeISO } from '../../stores/crm'
import { numeroCnjValido } from '~~/shared/utils/juridico'

// Registra (ou edita) um processo judicial OU um procedimento extrajudicial: cada um com os seus campos.
const props = defineProps<{ isOpen: boolean; casoId: number; natureza: keyof typeof NATUREZAS_PROCESSO; processo?: Processo | null; tipoSugerido?: string | null }>()
const emit = defineEmits<{ close: []; salvo: [] }>()

const form = reactive<Record<string, any>>({})
const equipe = ref<{ id: string; name: string | null }[]>([])
const salvando = ref(false)
const erro = ref<string | null>(null)
const judicial = computed(() => (props.processo?.natureza ?? props.natureza) === 'judicial')
const titulo = computed(() => `${props.processo ? 'Editar' : 'Registrar'} ${judicial.value ? 'processo judicial' : 'procedimento extrajudicial'}`)
const cnjOk = computed(() => !form.numero || numeroCnjValido(form.numero))
const eu = useSupabaseUser()

watch(() => props.isOpen, (aberto) => {
  if (!aberto) return
  erro.value = null
  $fetch<{ id: string; name: string | null }[]>('/api/equipe').then((l) => { equipe.value = l }).catch(() => {})
  Object.assign(form, props.processo ?? {
    natureza: props.natureza, numero: '', responsavel_nome: '', responsavel_id: eu.value?.id ?? '', tipo_procedimento: props.natureza === 'extrajudicial' ? (props.tipoSugerido ?? '') : '', tribunal: '', orgao: '', comarca: '', uf: '', fase: '', status: 'ativo', valor: null, link: '',
    data_inicio: hojeISO(), observacoes: '',
  })
  form.responsavel_id = form.responsavel_id ?? ''
})

async function salvar() {
  salvando.value = true
  erro.value = null
  try {
    // Só segue o que é do fluxo da natureza (o servidor também recusa campos do outro).
    const base = { natureza: judicial.value ? 'judicial' : 'extrajudicial', caso_id: props.casoId, numero: form.numero, orgao: form.orgao, comarca: form.comarca, uf: form.uf, valor: form.valor, link: form.link, responsavel_id: form.responsavel_id, status: form.status, data_inicio: form.data_inicio, observacoes: form.observacoes }
    const body = judicial.value ? { ...base, tribunal: form.tribunal, fase: form.fase } : { ...base, tipo_procedimento: form.tipo_procedimento, responsavel_nome: form.responsavel_nome }
    const url: string = props.processo ? `/api/processos/${props.processo.id}` : '/api/processos'
    await $fetch(url, { method: props.processo ? 'PUT' : 'POST', body })
    emit('salvo')
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível salvar.'
  } finally { salvando.value = false }
}
</script>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
