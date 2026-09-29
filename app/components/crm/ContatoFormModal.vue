<template>
  <Modal
    :is-open="isOpen"
    :title="contato ? 'Editar contato' : 'Novo contato'"
    :description="contato ? 'Atualize a ficha do contato.' : 'Cadastre quem chegou por fora do WhatsApp (indicação, formulário, Instagram…).'"
    :loading="loading"
    max-width="3xl"
    @close="emit('close')"
  >
    <form id="contato-form" class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="handleSubmit">
      <div v-if="conflitos.length" class="md:col-span-2 rounded-lg bg-danger/10 border border-danger/20 p-3 text-sm text-danger-dark dark:text-danger-200">
        <p class="font-semibold flex items-center gap-2"><Icon name="ph:warning-bold" /> Possível conflito de interesses (Código de Ética da OAB)</p>
        <p v-for="c in conflitos" :key="`${c.id}-${c.motivo}`" class="mt-1"><strong>{{ c.nome }}</strong>: {{ c.motivo }}</p>
      </div>
      <div v-if="duplicados.length" class="md:col-span-2 rounded-lg bg-warning/10 border border-warning/20 p-3 text-sm text-warning-dark dark:text-warning-200">
        Possível duplicidade com: <strong>{{ duplicados.map(d => d.nome).join(', ') }}</strong>
      </div>

      <p class="section-label">Contato</p>
      <label class="field md:col-span-2">
        <span>Nome *</span>
        <input v-model="form.nome" class="modal-input" required maxlength="120" @input="checarDepois" />
      </label>
      <label class="field">
        <span>WhatsApp *</span>
        <input v-model="form.telefone" class="modal-input" required inputmode="tel" placeholder="(11) 99999-8888" @input="checarDepois" />
      </label>
      <label class="field">
        <span>E-mail</span>
        <input v-model="form.email" type="email" class="modal-input" @input="checarDepois" />
      </label>
      <label class="field">
        <span>Cidade / UF</span>
        <input v-model="form.cidade" class="modal-input" />
      </label>
      <label class="field">
        <span>Origem</span>
        <select v-model="form.origem" class="modal-input">
          <option value="">—</option>
          <option v-for="o in ORIGENS" :key="o">{{ o }}</option>
        </select>
      </label>

      <p class="section-label">Caso</p>
      <label class="field">
        <span>Área</span>
        <select v-model="form.area" class="modal-input" @change="form.demanda = ''">
          <option value="">—</option>
          <option v-for="a in Object.keys(AREAS)" :key="a">{{ a }}</option>
        </select>
      </label>
      <label class="field">
        <span>Demanda</span>
        <select v-model="form.demanda" class="modal-input" :disabled="!form.area">
          <option value="">—</option>
          <option v-for="d in AREAS[form.area] ?? []" :key="d">{{ d }}</option>
        </select>
      </label>
      <label class="field md:col-span-2">
        <span>Parte contrária</span>
        <input v-model="form.parte_contraria" class="modal-input" placeholder="Usado para checar conflito de interesses" @input="checarDepois" />
      </label>
      <label class="field md:col-span-2">
        <span>Resumo do caso</span>
        <textarea v-model="form.resumo" rows="3" class="modal-input resize-y" placeholder="O que a pessoa precisa, em 2–3 linhas." />
      </label>
      <label class="field">
        <span>Urgência</span>
        <select v-model="form.urgencia" class="modal-input">
          <option value="">—</option>
          <option v-for="u in URGENCIAS" :key="u">{{ u }}</option>
        </select>
      </label>
      <label class="field">
        <span>Etapa</span>
        <select v-model="form.etapa" class="modal-input">
          <option v-for="e in ETAPAS.filter(x => x.id !== 'relacionado')" :key="e.id" :value="e.id">{{ e.nome }}</option>
        </select>
      </label>
      <label v-if="form.etapa === 'perdido'" class="field md:col-span-2">
        <span>Motivo da perda *</span>
        <select v-model="form.motivo_perda" class="modal-input" required>
          <option value="">—</option>
          <option v-for="m in MOTIVOS_PERDA" :key="m">{{ m }}</option>
        </select>
      </label>

      <p class="section-label">Relacionamento</p>
      <label class="field">
        <span>Data de nascimento</span>
        <input v-model="form.data_nascimento" type="date" class="modal-input" />
      </label>
      <label class="field">
        <span>Classificação (clientes)</span>
        <select v-model="form.classificacao" class="modal-input">
          <option value="">—</option>
          <option v-for="(c, k) in CLASSIFICACOES" :key="k" :value="k">{{ c.nome }}</option>
        </select>
      </label>
      <label class="field">
        <span>NPS (0 a 10)</span>
        <input v-model="form.nps" type="number" min="0" max="10" class="modal-input" placeholder="Resposta da pesquisa /nps" />
      </label>

      <div v-if="etapaAberta" class="md:col-span-2 grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-3 rounded-lg bg-primary/5 border border-primary/10 p-3">
        <label class="field">
          <span>Próxima ação</span>
          <input v-model="form.proxima_acao" class="modal-input" placeholder="Ex.: enviar proposta de honorários" maxlength="300" />
        </label>
        <label class="field">
          <span>Quando</span>
          <input v-model="form.proxima_data" type="date" class="modal-input" />
        </label>
      </div>
    </form>

    <template #footer>
      <div class="flex flex-col-reverse sm:flex-row justify-end gap-3">
        <Button variant="outline" @click="emit('close')">Cancelar</Button>
        <Button form="contato-form" type="submit" :loading="loading" icon="ph:check-bold">Salvar</Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Modal from '../Modal.vue'
import Button from '../Button.vue'
import { AREAS, CLASSIFICACOES, ETAPAS, MOTIVOS_PERDA, ORIGENS, URGENCIAS, etapa, type Contato, type ContatoInput } from '../../../shared/types/crm'
import { hojeISO } from '../../stores/crm'

const props = defineProps<{ isOpen: boolean; contato?: Contato | null; loading?: boolean }>()
const emit = defineEmits<{ close: []; submit: [data: ContatoInput] }>()

const vazio = () => ({
  nome: '', telefone: '', email: '', cidade: '', origem: '', area: '', demanda: '', parte_contraria: '',
  resumo: '', urgencia: '', etapa: 'novo', motivo_perda: '', proxima_acao: 'Responder pessoalmente — /boasvindas', proxima_data: hojeISO(),
  data_nascimento: '', classificacao: '', nps: '',
})
const form = reactive<Record<string, any>>(vazio())
const etapaAberta = computed(() => etapa(form.etapa).aberta)

const conflitos = ref<{ id: number; nome: string | null; motivo: string }[]>([])
const duplicados = ref<{ id: number; nome: string | null }[]>([])
let timer: ReturnType<typeof setTimeout> | undefined

function checarDepois() {
  clearTimeout(timer)
  timer = setTimeout(checar, 450)
}

async function checar() {
  if (!form.nome && !form.parte_contraria && !form.telefone && !form.email) return
  try {
    const r = await $fetch<{ conflitos: typeof conflitos.value; duplicados: typeof duplicados.value }>('/api/crm/contatos/conflitos', {
      params: { nome: form.nome, parte: form.parte_contraria, telefone: form.telefone, email: form.email, excluir: props.contato?.id ?? 0 },
    })
    conflitos.value = r.conflitos
    duplicados.value = r.duplicados
  } catch {
    // checagem é auxiliar; falha não bloqueia o cadastro
  }
}

watch(() => props.isOpen, (open) => {
  if (!open) return
  conflitos.value = []
  duplicados.value = []
  Object.assign(form, vazio())
  if (props.contato) {
    for (const k of Object.keys(form)) form[k] = (props.contato as any)[k] ?? ''
    checar()
  }
})

function handleSubmit() {
  const data: Record<string, any> = { ...form }
  if (!etapaAberta.value) { data.proxima_acao = null; data.proxima_data = null }
  if (data.nps === '' || data.nps == null) data.nps = null
  else data.nps = Number(data.nps)
  emit('submit', data as ContatoInput)
}
</script>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
.section-label { @apply md:col-span-2 mt-2 text-[10px] font-bold uppercase tracking-widest text-primary border-b border-gray-100 dark:border-zinc-800 pb-1; }
</style>
