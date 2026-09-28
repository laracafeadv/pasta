<template>
  <Modal :is-open="isOpen" title="Gerar recibo" description="Os dados vêm do cliente e do honorário — revise antes de gerar." max-width="lg" :loading="gerando" @close="fechar">
    <div class="p-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <label class="field sm:col-span-2"><span>Nome do cliente</span><input v-model="form.nome_cliente" class="modal-input" required /></label>
      <label class="field"><span>CPF/CNPJ</span><input v-model="form.documento_cliente" class="modal-input" placeholder="000.000.000-00" /></label>
      <label class="field"><span>Valor (R$)</span><input v-model="form.valor" type="number" min="0" step="0.01" class="modal-input" required /></label>
      <label class="field sm:col-span-2"><span>Referente a</span><input v-model="form.referente_a" class="modal-input" placeholder="Ex.: Honorários — divórcio consensual" required /></label>
      <label class="field"><span>Forma de pagamento</span><input v-model="form.forma_pagamento" class="modal-input" placeholder="Pix, boleto, cartão…" /></label>
      <label class="field"><span>Parcela</span><input v-model="form.numero_parcela" class="modal-input" placeholder="Ex.: 1/3" /></label>
      <label class="field sm:col-span-2"><span>Data</span><input v-model="form.data" type="date" class="modal-input" /></label>

      <div class="sm:col-span-2 rounded-2xl bg-secondary/10 border border-secondary/30 p-4 text-sm">
        <p class="text-xs font-semibold uppercase tracking-wider text-secondary-dark mb-1">Prévia</p>
        <p>Recebi de <b>{{ form.nome_cliente || '[cliente]' }}</b>, CPF/CNPJ {{ form.documento_cliente || '[documento]' }}, a importância de
          R$ {{ Number(form.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}, referente a {{ form.referente_a || '[descrição]' }}. O valor por extenso é calculado no PDF final.</p>
      </div>
      <p v-if="erro" class="sm:col-span-2 text-sm text-danger">{{ erro }}</p>
    </div>
    <template #footer>
      <div class="flex justify-end gap-3">
        <Button variant="outline" @click="fechar">Cancelar</Button>
        <Button :loading="gerando" icon="ph:file-pdf-bold" @click="gerar">Gerar PDF</Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import Modal from '../Modal.vue'
import Button from '../Button.vue'

const props = defineProps<{ isOpen: boolean; contatoId: number; honorarioId?: number | null }>()
const emit = defineEmits<{ close: [] }>()

const gerando = ref(false)
const erro = ref<string | null>(null)
const form = reactive({
  nome_cliente: '', documento_cliente: '', valor: '', referente_a: '',
  forma_pagamento: '', numero_parcela: '', data: new Date().toISOString().slice(0, 10),
})

watch(() => props.isOpen, async (v) => {
  if (!v) return
  erro.value = null
  const d = await $fetch<Record<string, any>>('/api/recibos/dados', { params: { contato_id: props.contatoId, honorario_id: props.honorarioId || undefined } })
  form.nome_cliente = d.nome_cliente ?? ''
  form.documento_cliente = d.documento_cliente ?? ''
  form.valor = d.valor ?? ''
  form.referente_a = d.referente_a ?? ''
  form.forma_pagamento = d.forma_pagamento ?? ''
  form.numero_parcela = d.numero_parcela ?? ''
  form.data = new Date().toISOString().slice(0, 10)
})

function fechar() {
  emit('close')
}

async function gerar() {
  if (!form.nome_cliente.trim() || !form.valor || !form.referente_a.trim()) { erro.value = 'Preencha nome, valor e referente a.'; return }
  gerando.value = true
  erro.value = null
  try {
    const { id } = await $fetch<{ id: number }>('/api/recibos', {
      method: 'POST',
      body: { ...form, contato_id: props.contatoId, honorario_id: props.honorarioId || null, valor: Number(form.valor) },
    })
    window.location.href = `/api/recibos/${id}/pdf`
    emit('close')
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível gerar o recibo.'
  } finally {
    gerando.value = false
  }
}
</script>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
