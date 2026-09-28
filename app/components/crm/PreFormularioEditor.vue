<template>
  <Modal :is-open="isOpen" title="Formulário pré-consulta" description="Escolha o que entra neste envio — pode mudar a cada caso." max-width="lg" @close="emit('close')">
    <div class="p-5 space-y-5">
      <section>
        <h3 class="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Perguntas fixas</h3>
        <p class="text-xs text-gray-400 mb-2">"Conte sua situação" sempre entra — é a base do formulário.</p>
        <label v-for="c in CAMPOS_PRE_FORM" :key="c.chave" class="flex items-center gap-2.5 py-1.5 text-sm cursor-pointer">
          <input v-model="ativos" type="checkbox" :value="c.chave" class="accent-[#3c2923]" />
          {{ c.rotulo }}
        </label>
      </section>

      <section>
        <h3 class="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Perguntas extras deste caso</h3>
        <div v-for="(p, i) in extras" :key="i" class="flex items-center gap-2 mb-2">
          <input v-model="extras[i]" type="text" class="modal-input flex-1" placeholder="Ex.: Você tem alguma medida protetiva em vigor?" />
          <button type="button" class="text-gray-400 hover:text-danger" @click="extras.splice(i, 1)"><Icon name="ph:x-bold" /></button>
        </div>
        <button type="button" class="text-xs font-semibold text-secondary-dark hover:underline" @click="extras.push('')">+ adicionar pergunta</button>
      </section>

      <div class="flex justify-end gap-2 pt-2">
        <Button variant="outline" @click="emit('close')">Cancelar</Button>
        <Button :loading="gerando" @click="gerar">Gerar link e enviar</Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from '../Modal.vue'
import Button from '../Button.vue'
import { CAMPOS_PRE_FORM } from '../../../shared/types/crm'

const props = defineProps<{ isOpen: boolean; camposAtuais?: string[] | null }>()
const emit = defineEmits<{ close: []; gerar: [campos: string[], extras: string[]] }>()

const ativos = ref<string[]>(CAMPOS_PRE_FORM.map(c => c.chave))
const extras = ref<string[]>([])
const gerando = ref(false)

watch(() => props.isOpen, (v) => {
  if (v) {
    ativos.value = props.camposAtuais?.length ? [...props.camposAtuais] : CAMPOS_PRE_FORM.map(c => c.chave)
    extras.value = []
  }
})

async function gerar() {
  gerando.value = true
  try {
    emit('gerar', ativos.value, extras.value.map(e => e.trim()).filter(Boolean))
  } finally {
    gerando.value = false
  }
}
</script>
