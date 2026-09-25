<template>
  <div class="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
    <aside class="space-y-2">
      <Button v-if="ehAdmin" size="sm" icon="ph:plus-bold" @click="editar(null)">Novo modelo</Button>
      <p v-if="!lista.length" class="text-sm text-gray-400">Nenhum modelo.</p>
      <button v-for="p in lista" :key="p.id" class="w-full text-left rounded-2xl border px-4 py-3 text-sm"
              :class="sel?.id === p.id ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-zinc-700 hover:border-primary'" @click="editar(p)">
        <b>{{ p.titulo }}</b><span class="block text-xs text-gray-500">{{ p.categoria }}</span>
      </button>
    </aside>
    <section v-if="form" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-6 space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-3">
        <label class="field"><span>Título</span><input v-model="form.titulo" class="modal-input" :disabled="!ehAdmin" /></label>
        <label class="field"><span>Categoria</span><input v-model="form.categoria" class="modal-input" :disabled="!ehAdmin" /></label>
      </div>
      <label class="field">
        <span>Texto (a primeira linha é o título do documento; linha em branco separa parágrafos)</span>
        <textarea v-model="form.corpo" rows="18" class="modal-input font-mono text-xs leading-relaxed" :disabled="!ehAdmin" />
      </label>
      <details class="text-xs text-gray-500">
        <summary class="cursor-pointer font-semibold text-secondary-dark">Campos preenchidos automaticamente</summary>
        <ul class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-1">
          <li v-for="[c, d] in CAMPOS_PECA" :key="c"><code>{{ c }}</code> — {{ d }}</li>
        </ul>
        <p class="mt-2">Trechos como <code>[NOME DA(O) ADVOGADA(O)]</code> ficam para você completar no Word. Gere pela ficha da cliente → Caso → “Outra peça”.</p>
      </details>
      <div v-if="ehAdmin" class="flex flex-wrap items-center gap-3">
        <Button icon="ph:check-bold" :loading="salvando" @click="salvar">Salvar modelo</Button>
        <Button v-if="form.id" variant="outline" icon="ph:trash-bold" @click="excluir">Excluir</Button>
        <span v-if="msg" class="text-xs" :class="erro ? 'text-danger' : 'text-success-dark'">{{ msg }}</span>
      </div>
      <p v-else class="text-xs text-gray-400">Só a administração edita os modelos de peças.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from '../Button.vue'
import { CAMPOS_PECA, type PecaModelo } from '../../../shared/types/crm'
import { useProfileStore } from '../../stores/profile'

const ehAdmin = computed(() => useProfileStore().profile?.role === 'admin')
const lista = ref<PecaModelo[]>([])
const sel = ref<PecaModelo | null>(null)
const form = ref<Partial<PecaModelo> | null>(null)
const salvando = ref(false)
const msg = ref('')
const erro = ref(false)

async function carregar() {
  lista.value = await $fetch<PecaModelo[]>('/api/pecas/modelos')
  if (!form.value && lista.value[0]) editar(lista.value[0])
}
onMounted(carregar)

function editar(p: PecaModelo | null) {
  sel.value = p
  form.value = p ? { ...p } : { titulo: '', categoria: 'Geral', corpo: 'TÍTULO DA PEÇA\n\n{{cliente.qualificacao}}, …\n\n{{cidade}}, {{data}}.\n\n_______________________________________\n{{advogada.nome}}', ativo: true }
  msg.value = ''
}
async function salvar() {
  if (!form.value) return
  salvando.value = true
  msg.value = ''
  try {
    const body = { titulo: form.value.titulo, categoria: form.value.categoria, corpo: form.value.corpo, ativo: true }
    const r = form.value.id
      ? await $fetch<PecaModelo>(`/api/pecas/modelos/${form.value.id}`, { method: 'PUT', body })
      : await $fetch<PecaModelo>('/api/pecas/modelos', { method: 'POST', body })
    await carregar()
    editar(lista.value.find(p => p.id === r.id) ?? r)
    erro.value = false
    msg.value = 'Salvo.'
  } catch (e: any) {
    erro.value = true
    msg.value = e?.data?.message || 'Não foi possível salvar.'
  } finally {
    salvando.value = false
  }
}
async function excluir() {
  if (!form.value?.id || !confirm('Excluir este modelo de peça?')) return
  await $fetch(`/api/pecas/modelos/${form.value.id}`, { method: 'DELETE' })
  form.value = null
  sel.value = null
  await carregar()
}
</script>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
