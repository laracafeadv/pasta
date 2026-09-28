<template>
  <Modal :is-open="isOpen" title="Perguntas específicas deste caso" description="O resumo livre já vai sempre. Adicione aqui só o que for particular deste caso." max-width="lg" @close="emit('close')">
    <div class="p-5 space-y-5">
      <section>
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

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: []; gerar: [extras: string[]] }>()

const extras = ref<string[]>([])
const gerando = ref(false)

watch(() => props.isOpen, (v) => { if (v) extras.value = [] })

async function gerar() {
  gerando.value = true
  try {
    emit('gerar', extras.value.map(e => e.trim()).filter(Boolean))
  } finally {
    gerando.value = false
  }
}
</script>
