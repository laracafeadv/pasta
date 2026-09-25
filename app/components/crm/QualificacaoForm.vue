<template>
  <form class="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm" @submit.prevent="salvar">
    <p class="sm:col-span-2 text-xs text-gray-500">
      Dados para a procuração e o contrato. <template v-if="form.mascarado">CPF e RG aparecem mascarados para a equipe; para corrigir, apague e digite o número completo.</template>
    </p>
    <label class="field sm:col-span-2"><span>Nome completo</span><input v-model="form.nome_completo" class="modal-input" /></label>
    <label class="field"><span>CPF</span><input v-model="form.cpf" class="modal-input" inputmode="numeric" placeholder="000.000.000-00" /></label>
    <div class="grid grid-cols-[1fr_110px] gap-2">
      <label class="field"><span>RG</span><input v-model="form.rg" class="modal-input" /></label>
      <label class="field"><span>Órgão</span><input v-model="form.orgao_emissor" class="modal-input" placeholder="SSP/BA" /></label>
    </div>
    <label class="field"><span>Nacionalidade</span><input v-model="form.nacionalidade" class="modal-input" /></label>
    <label class="field">
      <span>Estado civil</span>
      <select v-model="form.estado_civil" class="modal-input"><option value="">—</option><option v-for="e in ESTADOS_CIVIS" :key="e">{{ e }}</option></select>
    </label>
    <label class="field sm:col-span-2"><span>Profissão</span><input v-model="form.profissao" class="modal-input" /></label>
    <label class="field sm:col-span-2"><span>Endereço (rua, número, complemento)</span><input v-model="form.endereco" class="modal-input" /></label>
    <label class="field"><span>Bairro</span><input v-model="form.bairro" class="modal-input" /></label>
    <label class="field"><span>CEP</span><input v-model="form.cep" class="modal-input" inputmode="numeric" /></label>
    <label class="field"><span>Cidade</span><input v-model="form.cidade" class="modal-input" /></label>
    <label class="field">
      <span>UF</span>
      <select v-model="form.uf" class="modal-input"><option value="">—</option><option v-for="u in UFS" :key="u">{{ u }}</option></select>
    </label>
    <div class="sm:col-span-2 flex items-center gap-3">
      <Button type="submit" size="sm" :loading="salvando" icon="ph:check-bold">Salvar qualificação</Button>
      <span v-if="msg" class="text-xs" :class="erro ? 'text-danger' : 'text-success-dark'">{{ msg }}</span>
    </div>
  </form>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import Button from '../Button.vue'
import { ESTADOS_CIVIS, UFS, type Qualificacao } from '../../../shared/types/crm'

const props = defineProps<{ contatoId: number; nomeSugerido?: string | null }>()
const form = reactive<Record<string, any>>({})
const salvando = ref(false)
const msg = ref<string | null>(null)
const erro = ref(false)

onMounted(async () => {
  const q = await $fetch<Qualificacao>(`/api/crm/contatos/${props.contatoId}/qualificacao`)
  Object.assign(form, { nacionalidade: 'brasileira', ...q })
  if (!form.nome_completo && props.nomeSugerido) form.nome_completo = props.nomeSugerido
})

async function salvar() {
  salvando.value = true
  msg.value = null
  try {
    const q = await $fetch<Qualificacao>(`/api/crm/contatos/${props.contatoId}/qualificacao`, { method: 'PUT', body: form })
    Object.assign(form, q)
    erro.value = false
    msg.value = 'Salvo.'
  } catch (e: any) {
    erro.value = true
    msg.value = e?.data?.message || 'Não foi possível salvar.'
  } finally {
    salvando.value = false
  }
}
</script>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
