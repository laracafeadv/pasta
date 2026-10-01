<template>
  <div class="space-y-4" data-testid="analise-profissional">
    <p class="text-xs text-gray-500 rounded-xl bg-secondary/10 border border-secondary/30 p-2.5">
      <b>Análise profissional</b> — o que o escritório conclui. Não é resposta de formulário: os <i>dados coletados</i> (perguntas) ficam no bloco acima; aqui ficam seus fatos, fundamentos, estratégia, riscos e conclusão.
    </p>

    <div class="grid grid-cols-1 gap-3">
      <label class="field"><span>Fatos relevantes</span><textarea v-model="f.fatos" rows="3" class="modal-input" data-testid="an-fatos" placeholder="Resumo profissional do que importa nos dados coletados…" /></label>
      <label class="field"><span>Fundamentos e raciocínio jurídico</span><textarea v-model="f.analise" rows="4" class="modal-input" data-testid="an-fundamentos" placeholder="Questão jurídica, normas, jurisprudência, hipóteses…" /></label>
      <label class="field"><span>Estratégia / caminho recomendado</span><textarea v-model="f.estrategia" rows="3" class="modal-input" data-testid="an-estrategia" placeholder="Judicial ou extrajudicial? Ordem dos passos, alternativas…" /></label>
      <label class="field"><span>Riscos e ressalvas (vão por escrito na proposta)</span><textarea v-model="f.riscos" rows="2" class="modal-input" data-testid="an-riscos" /></label>
      <label class="field"><span>Conclusão / parecer (o que será comunicado)</span><textarea v-model="f.conclusao" rows="3" class="modal-input" data-testid="an-conclusao" /></label>
    </div>
    <div class="field">
      <span>Decisão</span>
      <div class="flex flex-wrap gap-2">
        <button v-for="(x, k) in DECISOES_DEMANDA" :key="k" type="button" class="px-4 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider" :class="f.decisao === k ? 'bg-primary text-white border-primary' : 'border-gray-300 dark:border-zinc-700'" :data-testid="`an-decisao-${k}`" @click="f.decisao = f.decisao === k ? null : k">{{ x.nome }}</button>
      </div>
      <small v-if="f.decisao" class="text-gray-400">{{ DECISOES_DEMANDA[f.decisao].dica }}</small>
    </div>
    <div class="flex items-center gap-3">
      <Button size="sm" :loading="salvando" :disabled="!alterado" icon="ph:check-bold" data-testid="an-salvar" @click="salvar">Salvar análise</Button>
      <span v-if="msg" class="text-xs" :class="erro ? 'text-danger' : 'text-success-dark'" data-testid="an-msg">{{ msg }}</span>
    </div>

    <!-- Anotações datadas: o raciocínio evolui e nada se sobrescreve -->
    <div class="border-t border-gray-100 dark:border-zinc-800 pt-3 space-y-2">
      <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Anotações da análise <span class="normal-case tracking-normal font-normal">· {{ notas.length }}</span></p>
      <form class="flex flex-col sm:flex-row gap-2" @submit.prevent="anotar">
        <select v-model="tipoNota" class="modal-input sm:!w-36" data-testid="nota-tipo"><option v-for="(n, k) in TIPOS_NOTA_DEMANDA" :key="k" :value="k">{{ n }}</option></select>
        <input v-model="textoNota" class="modal-input flex-1" placeholder="Ex.: cliente confirmou regime de separação total; falta certidão…" maxlength="4000" data-testid="nota-texto" />
        <Button size="sm" type="submit" :loading="anotando" :disabled="!textoNota.trim()" icon="ph:plus-bold" data-testid="nota-adicionar">Anotar</Button>
      </form>
      <ul v-if="notas.length" class="divide-y divide-gray-50 dark:divide-zinc-800/60 text-sm">
        <li v-for="n in notas" :key="n.id" class="py-2 flex gap-3" :data-testid="`nota-${n.id}`">
          <span class="shrink-0 w-24 text-xs text-gray-400">{{ dataCurta(n.created_at) }}<br />{{ n.autor_nome ?? '' }}</span>
          <span class="flex-1 whitespace-pre-line"><b class="text-[10px] uppercase tracking-wider text-secondary-dark">{{ TIPOS_NOTA_DEMANDA[n.tipo] }}</b> {{ n.texto }}</span>
          <button type="button" class="text-gray-300 hover:text-danger self-start" title="Excluir anotação" @click="excluirNota(n)"><Icon name="ph:trash-bold" /></button>
        </li>
      </ul>
      <p v-else class="text-xs text-gray-400">Nenhuma anotação ainda.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Button from '../Button.vue'
import { DECISOES_DEMANDA, TIPOS_NOTA_DEMANDA, type Demanda, type DemandaNota } from '../../../shared/types/crm'
import { dataCurta } from '../../utils/formatadores'

// Análise profissional do escritório, dentro da demanda. NÃO depende do construtor de formulários:
// o formulário coleta dados; aqui fica o que o escritório conclui a partir deles.
const props = withDefaults(defineProps<{ demanda: Demanda; notas?: DemandaNota[] }>(), { notas: () => [] })
const emit = defineEmits<{ mudou: [] }>()
type Campos = { fatos: string; analise: string; estrategia: string; riscos: string; conclusao: string; decisao: keyof typeof DECISOES_DEMANDA | null }
const f = reactive<Campos>({ fatos: '', analise: '', estrategia: '', riscos: '', conclusao: '', decisao: null })
const original = ref('')
watch(() => props.demanda, (c) => {
  Object.assign(f, { fatos: c.fatos ?? '', analise: c.analise ?? '', estrategia: c.estrategia ?? '', riscos: c.riscos ?? '', conclusao: c.conclusao ?? '', decisao: c.decisao ?? null })
  original.value = JSON.stringify(f)
}, { immediate: true })
const alterado = computed(() => JSON.stringify(f) !== original.value)
const salvando = ref(false)
const msg = ref('')
const erro = ref(false)
async function salvar() {
  salvando.value = true
  msg.value = ''
  try {
    const url: string = `/api/demandas/${props.demanda.id}`
    await $fetch(url, { method: 'PUT', body: { ...f } })
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

const tipoNota = ref<keyof typeof TIPOS_NOTA_DEMANDA>('anotacao')
const textoNota = ref('')
const anotando = ref(false)
async function anotar() {
  if (!textoNota.value.trim()) return
  anotando.value = true
  try {
    const url: string = `/api/demandas/${props.demanda.id}/notas`
    await $fetch(url, { method: 'POST', body: { tipo: tipoNota.value, texto: textoNota.value } })
    textoNota.value = ''
    emit('mudou')
  } catch (e: any) {
    msg.value = e?.data?.message || 'Não foi possível anotar.'
    erro.value = true
  } finally {
    anotando.value = false
  }
}
async function excluirNota(n: DemandaNota) {
  if (!confirm('Excluir esta anotação?')) return
  const url: string = `/api/demanda-notas/${n.id}`
  await $fetch(url, { method: 'DELETE' })
  emit('mudou')
}
</script>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
