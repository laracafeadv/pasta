<template>
  <div>
    <ul v-if="partes.length" class="text-sm divide-y divide-gray-50 dark:divide-zinc-800/60">
      <li v-for="p in partes" :key="p.id" class="py-1.5 flex flex-wrap items-baseline gap-x-2">
        <NuxtLink v-if="p.contato" :to="`/crm?abrir=${p.contato.id}`" class="font-medium underline underline-offset-2 hover:text-primary" title="Abrir a ficha desta pessoa">{{ p.nome }}</NuxtLink>
        <span v-else class="font-medium">{{ p.nome }}</span>
        <span class="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500">{{ p.papel }}</span>
        <span v-if="p.contato && ['ativo', 'concluido'].includes(p.contato.etapa)" class="text-[11px] px-2 py-0.5 rounded-full bg-success/15 text-success-dark">também é cliente</span>
        <span v-if="p.telefone || p.email" class="text-xs text-gray-400">{{ [p.telefone, p.email].filter(Boolean).join(' · ') }}</span>
        <button type="button" class="ml-auto text-gray-300 hover:text-danger" title="Remover da demanda" @click="remover(p.id)"><Icon name="ph:x-bold" /></button>
      </li>
    </ul>
    <p v-else-if="!adicionando" class="text-xs text-gray-400">Nenhuma parte ou interessado registrado.</p>

    <form v-if="adicionando" class="mt-2 space-y-2" @submit.prevent="adicionar">
      <div class="relative">
        <input v-model="busca" class="modal-input" placeholder="Buscar pessoa já cadastrada (nome ou telefone)…" :disabled="!!escolhida" @input="buscar" />
        <div v-if="escolhida" class="absolute inset-0 flex items-center justify-between px-4 rounded-lg bg-secondary/10 border border-secondary/30 text-sm">
          <span><b>{{ escolhida.nome }}</b> <span class="text-xs text-gray-500">já cadastrada</span></span>
          <button type="button" class="text-xs underline" @click="limparEscolha">trocar</button>
        </div>
        <ul v-if="resultados.length && !escolhida" class="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg max-h-48 overflow-y-auto">
          <li v-for="c in resultados" :key="c.id"><button type="button" class="w-full text-left px-3 py-2 text-sm hover:bg-secondary/10" @click="escolher(c)">{{ c.nome || 'Sem nome' }} <span class="text-xs text-gray-400">{{ c.telefone }}</span></button></li>
        </ul>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-[1fr_190px] gap-2">
        <input v-if="!escolhida" v-model="form.nome" class="modal-input" placeholder="…ou o nome de uma nova pessoa" required />
        <div v-else />
        <select v-model="form.papel" class="modal-input"><option v-for="p in PAPEIS_PARTE" :key="p">{{ p }}</option></select>
      </div>
      <div v-if="!escolhida" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input v-model="form.telefone" class="modal-input" placeholder="Telefone / WhatsApp" />
        <input v-model="form.email" class="modal-input" placeholder="E-mail (opcional)" />
      </div>
      <label v-if="!escolhida" class="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400" :class="!form.telefone.trim() ? 'opacity-50' : ''">
        <input v-model="cadastrar" type="checkbox" class="accent-[#3c2923]" :disabled="!form.telefone.trim()" /> Cadastrar também como pessoa no escritório (precisa do telefone) — assim ela pode virar cliente depois sem novo cadastro
      </label>
      <div class="flex gap-2"><Button type="submit" size="sm" :loading="salvando">Adicionar</Button><Button type="button" size="sm" variant="outline" @click="fechar">Cancelar</Button></div>
    </form>
    <button v-else type="button" class="mt-1 text-xs font-semibold text-secondary-dark hover:underline" @click="adicionando = true">+ Parte ou interessado</button>
    <p v-if="erro" class="text-xs text-danger mt-1">{{ erro }}</p>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import Button from '../Button.vue'
import { PAPEIS_PARTE, type Contato, type Parte } from '../../../shared/types/crm'

// Partes e interessados de uma demanda. A pessoa é escolhida entre as já cadastradas ou cadastrada na hora
// (como "pessoa cadastrada", sem entrar no funil de leads): nunca há duas fichas para a mesma pessoa.
const props = defineProps<{ partes: Parte[]; casoId: number }>()
const emit = defineEmits<{ mudou: [] }>()

const adicionando = ref(false)
const salvando = ref(false)
const erro = ref<string | null>(null)
const form = reactive({ nome: '', papel: 'Interessado', telefone: '', email: '' })
const cadastrar = ref(true)
const busca = ref('')
const resultados = ref<Contato[]>([])
const escolhida = ref<Contato | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

function buscar() {
  clearTimeout(timer)
  if (busca.value.trim().length < 2) { resultados.value = []; return }
  timer = setTimeout(async () => {
    const r = await $fetch<{ records: Contato[] }>('/api/crm/contatos', { params: { search: busca.value.trim(), pageSize: 6 } }).catch(() => ({ records: [] as Contato[] }))
    resultados.value = r.records
  }, 250)
}
function escolher(c: Contato) { escolhida.value = c; resultados.value = []; busca.value = c.nome ?? '' }
function limparEscolha() { escolhida.value = null; busca.value = '' }
function fechar() { adicionando.value = false; limparEscolha(); Object.assign(form, { nome: '', telefone: '', email: '' }); erro.value = null }

async function adicionar() {
  salvando.value = true
  erro.value = null
  try {
    let contatoId: number | null = escolhida.value?.id ?? null
    let nome = escolhida.value?.nome ?? form.nome
    if (!escolhida.value && cadastrar.value && form.telefone.trim()) {
      const criado = await $fetch<Contato>('/api/crm/contatos', { method: 'POST', body: { nome: form.nome, telefone: form.telefone, email: form.email || null, etapa: 'relacionado', origem: 'Outros' } })
      contatoId = criado.id
      nome = criado.nome ?? form.nome
    }
    await $fetch('/api/partes', { method: 'POST', body: { caso_id: props.casoId, contato_id: contatoId, nome, papel: form.papel, telefone: escolhida.value ? null : form.telefone, email: escolhida.value ? null : form.email } })
    fechar()
    emit('mudou')
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível adicionar.'
  } finally {
    salvando.value = false
  }
}
async function remover(id: number) {
  const url: string = `/api/partes/${id}`
  await $fetch(url, { method: 'DELETE' })
  emit('mudou')
}
</script>
