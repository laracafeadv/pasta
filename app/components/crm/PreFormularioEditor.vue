<template>
  <Modal :is-open="isOpen" title="Perguntas específicas deste caso" description="O resumo livre já vai sempre. Adicione aqui só o que for particular deste caso." max-width="lg" @close="emit('close')">
    <div class="p-5 space-y-5">
      <section v-if="templates.length">
        <label class="field">
          <span>Usar um modelo salvo (opcional)</span>
          <select class="modal-input" @change="usarTemplate(($event.target as HTMLSelectElement).value)">
            <option value="">Escolher um modelo…</option>
            <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.nome }} ({{ t.perguntas.length }} pergunta(s))</option>
          </select>
        </label>
        <p class="text-xs text-gray-400 mt-1">
          Carrega as perguntas do modelo aqui embaixo — ainda dá pra editar ou remover antes de enviar.
          Gerencie os modelos em <NuxtLink to="/formularios" class="underline hover:text-primary" @click="emit('close')">Modelos de formulário</NuxtLink>.
        </p>
      </section>

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
import { onMounted, ref, watch } from 'vue'
import Modal from '../Modal.vue'
import Button from '../Button.vue'
import type { FormularioTemplate } from '~~/shared/types/crm'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: []; gerar: [extras: string[]] }>()

const extras = ref<string[]>([])
const gerando = ref(false)
const templates = ref<FormularioTemplate[]>([])

onMounted(async () => {
  try {
    templates.value = await $fetch<FormularioTemplate[]>('/api/formularios')
  } catch { /* modelos são opcionais; se falhar, segue sem eles */ }
})

function usarTemplate(idStr: string) {
  const t = templates.value.find(t => String(t.id) === idStr)
  if (!t) return
  extras.value = [...extras.value.filter(Boolean), ...t.perguntas]
}

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

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
