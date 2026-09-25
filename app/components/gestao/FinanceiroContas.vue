<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <button v-for="t in [{ id: '', n: 'Tudo' }, { id: 'receber', n: 'A receber' }, { id: 'pagar', n: 'A pagar' }]" :key="t.id"
              class="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border"
              :class="filtro === t.id ? 'bg-primary text-white border-primary' : 'border-gray-300 dark:border-zinc-700'" @click="filtro = t.id">{{ t.n }}</button>
      <label class="ml-2 text-sm flex items-center gap-2"><input v-model="soAbertos" type="checkbox" class="accent-[#3c2923]" /> Só em aberto</label>
      <Button class="ml-auto" size="sm" icon="ph:plus-bold" @click="novo()">Novo lançamento</Button>
    </div>
    <p class="text-xs text-gray-500">Marque como <b>despesa fixa mensal</b> o que se repete todo mês (aluguel, sistemas, pró-labore): cadastre uma vez e ela entra no custo operacional e na projeção do caixa. Contas do escritório aqui; contas pessoais, fora.</p>

    <div class="overflow-x-auto rounded-2xl border border-gray-200/70 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60">
      <table class="w-full text-sm min-w-[640px]">
        <thead>
          <tr class="text-left text-[10px] uppercase tracking-widest text-gray-400">
            <th class="p-3">Vencimento</th><th>Descrição</th><th>Categoria</th><th class="text-right">Valor</th><th class="text-center">Situação</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!visiveis.length"><td colspan="5" class="p-6 text-center text-gray-400">Nenhum lançamento.</td></tr>
          <tr v-for="l in visiveis" :key="l.id" class="border-t border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/40 cursor-pointer" @click="editar(l)">
            <td class="p-3 whitespace-nowrap" :class="!l.pago_em && l.vencimento < hoje ? 'text-danger font-semibold' : ''">{{ dataCurta(l.vencimento) }}</td>
            <td>{{ l.descricao }}<span v-if="l.recorrente" class="ml-1 text-[10px] uppercase tracking-wider text-secondary-dark">mensal</span><span v-if="l.contato" class="text-xs text-gray-500"> · {{ l.contato.nome }}</span></td>
            <td class="text-gray-500">{{ l.categoria }}</td>
            <td class="text-right font-semibold tabular-nums" :class="l.tipo === 'pagar' ? 'text-danger-dark dark:text-danger-200' : 'text-success-dark dark:text-success-200'">{{ l.tipo === 'pagar' ? '−' : '+' }} {{ brl(l.valor) }}</td>
            <td class="text-center" @click.stop>
              <button v-if="!l.pago_em" class="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="baixar(l)">
                {{ l.tipo === 'pagar' ? 'Pagar' : 'Receber' }}
              </button>
              <NuxtLink v-if="!l.pago_em && l.tipo === 'receber' && l.contato_id && l.vencimento < hoje" :to="`/crm?abrir=${l.contato_id}&ficha=honorarios`" class="ml-1 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary text-white">Cobrar</NuxtLink>
              <span v-else-if="l.pago_em" class="text-xs text-success-dark">{{ l.tipo === 'pagar' ? 'pago' : 'recebido' }} {{ dataCurta(l.pago_em) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :is-open="aberto" :title="form.id ? 'Editar lançamento' : 'Novo lançamento'" max-width="xl" @close="aberto = false">
      <form id="lanc-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="salvar">
        <label class="field">
          <span>Tipo</span>
          <select v-model="form.tipo" class="modal-input"><option value="receber">A receber</option><option value="pagar">A pagar</option></select>
        </label>
        <label class="field">
          <span>Categoria</span>
          <select v-model="form.categoria" class="modal-input"><option v-for="c in CATEGORIAS_LANCAMENTO[form.tipo as 'receber' | 'pagar']" :key="c">{{ c }}</option></select>
        </label>
        <label class="field sm:col-span-2"><span>Descrição *</span><input v-model="form.descricao" class="modal-input" required /></label>
        <label class="field"><span>Valor (R$) *</span><input v-model="form.valor" type="number" min="0.01" step="0.01" class="modal-input" required /></label>
        <label class="field"><span>Vencimento *</span><input v-model="form.vencimento" type="date" class="modal-input" required /></label>
        <label class="field"><span>Pago / recebido em</span><input v-model="form.pago_em" type="date" class="modal-input" /></label>
        <label v-if="form.tipo === 'pagar'" class="flex items-center gap-2 text-sm self-end pb-2"><input v-model="form.recorrente" type="checkbox" class="accent-[#3c2923]" /> Despesa fixa mensal</label>
        <label class="field sm:col-span-2"><span>Observação</span><input v-model="form.observacao" class="modal-input" /></label>
        <p v-if="erro" class="sm:col-span-2 text-sm text-danger">{{ erro }}</p>
      </form>
      <template #footer>
        <div class="flex justify-between gap-3">
          <Button v-if="form.id" variant="outline" icon="ph:trash-bold" @click="excluir">Excluir</Button>
          <div class="flex gap-3 ml-auto">
            <Button variant="outline" @click="aberto = false">Cancelar</Button>
            <Button form="lanc-form" type="submit" icon="ph:check-bold">Salvar</Button>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import Button from '../Button.vue'
import Modal from '../Modal.vue'
import { CATEGORIAS_LANCAMENTO, type Lancamento } from '../../../shared/types/crm'
import { brl, dataCurta } from '../../utils/formatadores'
import { hojeISO } from '../../stores/crm'

const emit = defineEmits<{ mudou: [] }>()
const hoje = hojeISO()
const lista = ref<Lancamento[]>([])
const filtro = ref('')
const soAbertos = ref(false)
const aberto = ref(false)
const erro = ref('')
const form = reactive<Record<string, any>>({})

async function carregar() {
  lista.value = await $fetch<Lancamento[]>('/api/financeiro/lancamentos')
}
onMounted(carregar)
defineExpose({ recarregar: carregar })

const visiveis = computed(() => lista.value.filter(l => (!filtro.value || l.tipo === filtro.value) && (!soAbertos.value || !l.pago_em)))

function novo() {
  Object.keys(form).forEach(k => delete form[k])
  Object.assign(form, { tipo: 'pagar', categoria: 'Outros', descricao: '', valor: '', vencimento: hoje, pago_em: '', recorrente: false, observacao: '' })
  erro.value = ''
  aberto.value = true
}
function editar(l: Lancamento) {
  Object.keys(form).forEach(k => delete form[k])
  Object.assign(form, { ...l, pago_em: l.pago_em ?? '' })
  erro.value = ''
  aberto.value = true
}
async function salvar() {
  erro.value = ''
  try {
    const { id, contato, created_at, updated_at, honorario_id, ...body } = form
    if (id) await $fetch(`/api/financeiro/lancamentos/${id}`, { method: 'PATCH', body })
    else await $fetch('/api/financeiro/lancamentos', { method: 'POST', body })
    aberto.value = false
    await carregar()
    emit('mudou')
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível salvar.'
  }
}
async function baixar(l: Lancamento) {
  await $fetch(`/api/financeiro/lancamentos/${l.id}`, { method: 'PATCH', body: { pago_em: hoje } })
  await carregar()
  emit('mudou')
}
async function excluir() {
  if (!confirm('Excluir este lançamento?')) return
  await $fetch(`/api/financeiro/lancamentos/${form.id}`, { method: 'DELETE' })
  aberto.value = false
  await carregar()
  emit('mudou')
}
</script>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
th { @apply font-semibold; }
</style>
