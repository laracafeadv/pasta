<template>
  <div class="space-y-3">
    <label class="field"><span>Análise e estratégia</span><textarea v-model="f.analise" rows="4" class="modal-input" placeholder="Fatos relevantes, fundamentos, caminho recomendado…" /></label>
    <label class="field"><span>Riscos e ressalvas (vão por escrito na proposta)</span><textarea v-model="f.riscos" rows="2" class="modal-input" /></label>
    <div class="field">
      <span>Decisão</span>
      <div class="flex flex-wrap gap-2">
        <button v-for="(x, k) in DECISOES_DEMANDA" :key="k" type="button" class="px-4 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider" :class="f.decisao === k ? 'bg-primary text-white border-primary' : 'border-gray-300 dark:border-zinc-700'" @click="f.decisao = f.decisao === k ? null : k">{{ x.nome }}</button>
      </div>
      <small v-if="f.decisao" class="text-gray-400">{{ DECISOES_DEMANDA[f.decisao].dica }}</small>
    </div>
    <div class="flex items-center gap-3">
      <Button size="sm" :loading="salvando" :disabled="!alterado" icon="ph:check-bold" @click="salvar">Salvar análise</Button>
      <span v-if="msg" class="text-xs" :class="erro ? 'text-danger' : 'text-success-dark'">{{ msg }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Button from '../Button.vue'
import { DECISOES_DEMANDA, type Caso } from '../../../shared/types/crm'

// Análise jurídica produzida pelo escritório, dentro da demanda. Não é resposta de formulário:
// o formulário coleta dados; aqui fica o que o escritório conclui a partir deles.
const props = defineProps<{ caso: Caso }>()
const emit = defineEmits<{ mudou: [] }>()
const f = reactive<{ analise: string; riscos: string; decisao: keyof typeof DECISOES_DEMANDA | null }>({ analise: '', riscos: '', decisao: null })
const original = ref('')
watch(() => props.caso, (c) => { f.analise = c.analise ?? ''; f.riscos = c.riscos ?? ''; f.decisao = c.decisao ?? null; original.value = JSON.stringify(f) }, { immediate: true })
const alterado = computed(() => JSON.stringify(f) !== original.value)
const salvando = ref(false)
const msg = ref('')
const erro = ref(false)
async function salvar() {
  salvando.value = true
  msg.value = ''
  try {
    const url: string = `/api/casos/${props.caso.id}`
    await $fetch(url, { method: 'PUT', body: { analise: f.analise, riscos: f.riscos, decisao: f.decisao } })
    original.value = JSON.stringify(f)
    erro.value = false
    msg.value = 'Salvo.'
    emit('mudou')
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
