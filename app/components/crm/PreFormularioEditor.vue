<template>
  <Modal :is-open="isOpen" title="Escolher formulário" description="O resumo livre já vai sempre. Escolha um formulário do banco se quiser incluir perguntas específicas." max-width="lg" @close="emit('close')">
    <div class="p-5 space-y-5">
      <section v-if="formularios.length">
        <label class="field">
          <span>Formulário (opcional)</span>
          <select v-model="formularioId" class="modal-input">
            <option :value="null">Nenhum — só o resumo livre</option>
            <option v-for="f in formularios" :key="f.id" :value="f.id">{{ f.nome }} ({{ f.itens.length }} pergunta(s))</option>
          </select>
        </label>
        <ol v-if="formularioEscolhido" class="text-sm text-gray-600 dark:text-zinc-300 mt-3 space-y-1 list-decimal list-inside">
          <li v-for="i in formularioEscolhido.itens" :key="i.id">{{ i.pergunta.texto }}<span v-if="i.obrigatoria" class="text-danger"> *</span></li>
        </ol>
        <p class="text-xs text-gray-400 mt-2">
          Gerencie os formulários e o banco de perguntas em <NuxtLink to="/formularios" class="underline hover:text-primary" @click="emit('close')">Formulários</NuxtLink>.
        </p>
      </section>
      <p v-else class="text-sm text-gray-400">
        Nenhum formulário criado ainda. Crie um em <NuxtLink to="/formularios" class="underline hover:text-primary" @click="emit('close')">Formulários</NuxtLink> ou envie só com o resumo livre.
      </p>

      <div class="flex justify-end gap-2 pt-2">
        <Button variant="outline" @click="emit('close')">Cancelar</Button>
        <Button :loading="gerando" @click="gerar">Gerar e copiar link</Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Modal from '../Modal.vue'
import Button from '../Button.vue'
import type { Formulario } from '~~/shared/types/crm'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: []; gerar: [formularioId: number | null] }>()

const gerando = ref(false)
const formularios = ref<Formulario[]>([])
const formularioId = ref<number | null>(null)
const formularioEscolhido = computed(() => formularios.value.find(f => f.id === formularioId.value))

// A lista só é buscada na primeira vez que o editor abre (ele fica montado dentro da ficha, então
// buscar ao montar gerava uma chamada à API em toda tela que tem a ficha, mesmo sem abri-la).
let carregou = false
watch(() => props.isOpen, async (aberto) => {
  if (!aberto || carregou) return
  carregou = true
  try {
    formularios.value = await $fetch<Formulario[]>('/api/formularios', { params: { contexto: 'cliente,consulta' } })
  } catch { carregou = false /* formulários são opcionais; tenta de novo na próxima abertura */ }
})

async function gerar() {
  gerando.value = true
  try {
    emit('gerar', formularioId.value)
  } finally {
    gerando.value = false
  }
}
</script>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
