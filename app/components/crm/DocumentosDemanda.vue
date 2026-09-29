<template>
  <div class="space-y-3">
    <div class="flex flex-wrap gap-2 items-center">
      <Button size="sm" variant="outline" icon="ph:list-checks-bold" :loading="gerando" @click="gerar">
        {{ docs.length ? 'Completar a lista' : casoId ? 'Gerar lista deste procedimento' : 'Gerar lista da área' }}
      </Button>
      <Button v-if="pendentes.length" size="sm" icon="ph:whatsapp-logo-bold" @click="emit('cobrar', pendentes, recebidos)">Cobrar pendentes</Button>
      <span class="ml-auto text-xs text-gray-500">{{ recebidos.length }} recebido(s) · {{ pendentes.length }} pendente(s)<template v-if="aConferir"> · {{ aConferir }} a conferir</template></span>
    </div>
    <p v-if="!docs.length" class="text-sm text-gray-400">Nenhum documento listado.</p>
    <ul class="divide-y divide-gray-100 dark:divide-zinc-800">
      <li v-for="d in docs" :key="d.id" class="py-2 text-sm">
        <div class="flex items-center gap-3">
          <Icon :name="icone(d)" :class="cor(d)" class="text-lg shrink-0" />
          <span class="flex-1" :class="d.status === 'dispensado' ? 'line-through text-gray-400' : ''">
            {{ d.descricao }}
            <span v-if="d.origem === 'produzido'" class="text-[10px] uppercase tracking-wider px-1.5 rounded bg-secondary/20 text-secondary-dark">peça do escritório</span>
            <span v-else-if="!d.obrigatorio" class="text-xs text-gray-400">(se houver)</span>
          </span>
          <select :value="d.status" class="text-xs rounded-full border border-gray-200 dark:border-zinc-700 bg-transparent px-2 py-1" @change="mudar(d.id, ($event.target as HTMLSelectElement).value)">
            <option v-for="s in statusDe(d)" :key="s" :value="s">{{ STATUS_DOCUMENTO[s] }}</option>
          </select>
          <button type="button" class="text-gray-400 hover:text-primary" title="Anexar link do arquivo" @click="anexando = anexando === d.id ? null : d.id"><Icon name="ph:link-bold" /></button>
          <button type="button" class="text-gray-400 hover:text-danger" title="Remover" @click="remover(d.id)"><Icon name="ph:x-bold" /></button>
        </div>
        <p v-if="d.arquivo_url || d.processo_id || d.parte_id" class="pl-8 text-xs text-gray-500 flex flex-wrap gap-x-3">
          <a v-if="d.arquivo_url" :href="d.arquivo_url" target="_blank" rel="noopener" class="underline underline-offset-2"><Icon :name="d.arquivo_provedor === 'drive' ? 'ph:google-drive-logo-bold' : 'ph:link-bold'" class="align-middle" /> {{ d.arquivo_nome || 'Abrir arquivo' }}</a>
          <span v-if="d.processo_id">Processo/procedimento: {{ rotuloProcesso(d.processo_id) }}</span>
          <span v-if="d.parte_id">Parte: {{ partes.find(p => p.id === d.parte_id)?.nome }}</span>
        </p>
        <form v-if="anexando === d.id" class="pl-8 mt-1 grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2" @submit.prevent="anexar(d.id)">
          <input v-model="link.url" class="modal-input" placeholder="Link do arquivo (Drive ou outro)" />
          <input v-model="link.nome" class="modal-input" placeholder="Nome (opcional)" />
          <Button size="sm" type="submit">Anexar</Button>
        </form>
      </li>
    </ul>
    <form class="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2" @submit.prevent="adicionar">
      <input v-model="novo" class="modal-input" :placeholder="produzido ? 'Peça produzida (minuta, instrumento…)' : 'Acrescentar documento a pedir…'" />
      <select v-if="casoId && (processos.length || partes.length)" v-model="vinculo" class="modal-input sm:w-52">
        <option value="">Da demanda</option>
        <option v-for="p in processos" :key="`p${p.id}`" :value="`p:${p.id}`">{{ rotuloProcesso(p.id) }}</option>
        <option v-for="p in partes" :key="`x${p.id}`" :value="`x:${p.id}`">Parte: {{ p.nome }}</option>
      </select>
      <label class="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap"><input v-model="produzido" type="checkbox" class="accent-[#3c2923]" /> peça do escritório</label>
      <Button type="submit" size="sm" :disabled="!novo.trim()">Adicionar</Button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import Button from '../Button.vue'
import { STATUS_DOCUMENTO, type Documento, type Parte, type Processo } from '../../../shared/types/crm'

// Documentos de UMA demanda (casoId) ou os gerais do cliente (casoId = null). Cada documento pode apontar para um
// processo/procedimento e para uma parte da própria demanda, e guardar a referência (link) do arquivo — sem cópias.
const props = withDefaults(defineProps<{ docs: Documento[]; contatoId: number; casoId: number | null; processos?: Processo[]; partes?: Parte[] }>(), { processos: () => [], partes: () => [] })
const emit = defineEmits<{ mudou: []; cobrar: [pendentes: Documento[], recebidos: Documento[]] }>()

const pedidos = computed(() => props.docs.filter(d => d.origem !== 'produzido'))
const pendentes = computed(() => pedidos.value.filter(d => d.status === 'pendente'))
const recebidos = computed(() => pedidos.value.filter(d => ['recebido', 'conferido'].includes(d.status)))
const aConferir = computed(() => pedidos.value.filter(d => d.status === 'recebido').length)
const gerando = ref(false)
const novo = ref('')
const produzido = ref(false)
const vinculo = ref('')
const anexando = ref<number | null>(null)
const link = reactive({ url: '', nome: '' })
const url: string = `/api/crm/contatos/${props.contatoId}/documentos`

const statusDe = (d: Documento) => (d.origem === 'produzido' ? (['rascunho', 'final'] as const) : (['pendente', 'recebido', 'conferido', 'dispensado'] as const))
const icone = (d: Documento) => (['conferido', 'final'].includes(d.status) ? 'ph:check-circle-fill' : d.status === 'recebido' ? 'ph:check-circle' : d.status === 'dispensado' ? 'ph:minus-circle' : d.status === 'rascunho' ? 'ph:pencil-simple-line' : 'ph:circle')
const cor = (d: Documento) => (['conferido', 'final'].includes(d.status) ? 'text-success' : d.status === 'recebido' ? 'text-warning-dark' : 'text-gray-400')
const rotuloProcesso = (id: number) => { const p = props.processos.find(x => x.id === id); return p ? `${p.natureza === 'judicial' ? 'Processo' : 'Procedimento'} ${p.numero || p.orgao || ''}`.trim() : '' }

async function gerar() {
  gerando.value = true
  try { await $fetch(url, { method: 'POST', body: { gerar: true, caso_id: props.casoId } }); emit('mudou') } finally { gerando.value = false }
}
async function adicionar() {
  if (!novo.value.trim()) return
  const [tipo, id] = vinculo.value.split(':')
  await $fetch(url, { method: 'POST', body: { descricao: novo.value, caso_id: props.casoId, origem: produzido.value ? 'produzido' : 'solicitado', processo_id: tipo === 'p' ? Number(id) : null, parte_id: tipo === 'x' ? Number(id) : null } })
  novo.value = ''
  emit('mudou')
}
async function mudar(id: number, status: string) {
  const u: string = `/api/documentos/${id}`
  await $fetch(u, { method: 'PATCH', body: { status } })
  emit('mudou')
}
async function anexar(id: number) {
  const u: string = `/api/documentos/${id}`
  await $fetch(u, { method: 'PATCH', body: { arquivo_url: link.url, arquivo_nome: link.nome } })
  link.url = ''; link.nome = ''; anexando.value = null
  emit('mudou')
}
async function remover(id: number) {
  const u: string = `/api/documentos/${id}`
  await $fetch(u, { method: 'DELETE' })
  emit('mudou')
}
</script>
