<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { definePageMeta, useHead, useRoute } from '#imports'
import Button from '~/components/Button.vue'
import Modal from '~/components/Modal.vue'
import { TIPOS_COMPROMISSO, dataCompromisso, type Caso, type Compromisso, type Contato } from '~~/shared/types/crm'
import { calcularPrazo } from '~~/shared/utils/juridico'
import { dataCurta, diaRelativo } from '~/utils/formatadores'
import { hojeISO, somarDias } from '~/stores/crm'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Agenda e prazos' })

const route = useRoute()
const itens = ref<Compromisso[]>([])
const carregando = ref(false)
const filtroTipo = ref('')

async function carregar() {
  carregando.value = true
  try {
    itens.value = await $fetch<Compromisso[]>('/api/compromissos', { params: { tipo: filtroTipo.value || undefined } })
  } finally {
    carregando.value = false
  }
}
onMounted(() => {
  carregar()
  if (route.query.contato) novo(Number(route.query.contato), route.query.caso ? Number(route.query.caso) : null)
})
watch(filtroTipo, carregar)

const hoje = hojeISO()
const blocos = computed(() => {
  const em7 = somarDias(hoje, 7)
  const b = { atrasados: [] as Compromisso[], hoje: [] as Compromisso[], semana: [] as Compromisso[], depois: [] as Compromisso[] }
  for (const c of itens.value) {
    const d = dataCompromisso(c)
    if (d < hoje) b.atrasados.push(c)
    else if (d === hoje) b.hoje.push(c)
    else if (d <= em7) b.semana.push(c)
    else b.depois.push(c)
  }
  const ord = (a: Compromisso, z: Compromisso) => (dataCompromisso(a) + (a.inicio ?? '')).localeCompare(dataCompromisso(z) + (z.inicio ?? ''))
  return [
    { id: 'atrasados', titulo: 'Vencidos', cor: 'text-danger', itens: b.atrasados.sort(ord) },
    { id: 'hoje', titulo: 'Hoje', cor: '', itens: b.hoje.sort(ord) },
    { id: 'semana', titulo: 'Próximos 7 dias', cor: '', itens: b.semana.sort(ord) },
    { id: 'depois', titulo: 'Depois', cor: '', itens: b.depois.sort(ord) },
  ]
})
const hora = (c: Compromisso) => c.inicio ? new Date(c.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : ''

async function concluir(c: Compromisso) {
  await $fetch(`/api/compromissos/${c.id}`, { method: 'PATCH', body: { status: 'concluido' } })
  carregar()
}

// ─── Novo / editar ──────────────────────────────────────────────────────────
const aberto = ref(false)
const salvando = ref(false)
const erro = ref<string | null>(null)
const editando = ref<Compromisso | null>(null)
const form = reactive<Record<string, any>>({})
const contatos = ref<Pick<Contato, 'id' | 'nome'>[]>([])
const casos = ref<Caso[]>([])

async function carregarOpcoes() {
  if (!contatos.value.length) {
    const r = await $fetch<{ records: Contato[] }>('/api/crm/contatos', { params: { pageSize: '200' } })
    contatos.value = r.records.map(c => ({ id: c.id, nome: c.nome })).sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? ''))
  }
}
watch(() => form.contato_id, async (id) => {
  casos.value = id ? await $fetch<Caso[]>('/api/casos', { params: { contato: id } }) : []
})

async function novo(contatoId: number | null = null, casoId: number | null = null) {
  editando.value = null
  erro.value = null
  Object.assign(form, {
    tipo: casoId ? 'prazo' : 'tarefa', titulo: '', contato_id: contatoId, caso_id: casoId,
    data_publicacao: hoje, dias_prazo: 15, data_limite: somarDias(hoje, 1), inicio_local: '', local: '', observacao: '',
  })
  await carregarOpcoes()
  aberto.value = true
}
async function editar(c: Compromisso) {
  editando.value = c
  erro.value = null
  Object.assign(form, { ...c, inicio_local: c.inicio ? new Date(c.inicio).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 16).replace(' ', 'T') : '' })
  await carregarOpcoes()
  aberto.value = true
}

const usaHorario = computed(() => ['audiencia', 'consulta', 'reuniao'].includes(form.tipo))
const calculo = computed(() => form.tipo === 'prazo' && form.data_publicacao && form.dias_prazo > 0 ? calcularPrazo(form.data_publicacao, Number(form.dias_prazo)) : null)

async function salvar() {
  salvando.value = true
  erro.value = null
  const body: Record<string, any> = { ...form }
  if (usaHorario.value) {
    body.inicio = form.inicio_local ? new Date(form.inicio_local).toISOString() : null
    body.data_limite = null
  } else {
    body.inicio = null
  }
  if (form.tipo !== 'prazo') { body.data_publicacao = null; body.dias_prazo = null }
  delete body.inicio_local
  try {
    if (editando.value) await $fetch(`/api/compromissos/${editando.value.id}`, { method: 'PATCH', body })
    else await $fetch('/api/compromissos', { method: 'POST', body })
    aberto.value = false
    carregar()
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível salvar.'
  } finally {
    salvando.value = false
  }
}
async function excluir() {
  if (!editando.value || !confirm('Excluir este compromisso?')) return
  await $fetch(`/api/compromissos/${editando.value.id}`, { method: 'DELETE' })
  aberto.value = false
  carregar()
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Escritório</p>
        <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Agenda e prazos</h1>
        <p class="text-sm text-gray-500 mt-2 max-w-2xl">Prazos processuais, audiências, consultas e tarefas. Prazos são contados em dias úteis (CPC), com feriados nacionais e recesso forense.</p>
      </div>
      <div class="flex gap-2">
        <select v-model="filtroTipo" class="rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm">
          <option value="">Tudo</option>
          <option v-for="(t, k) in TIPOS_COMPROMISSO" :key="k" :value="k">{{ t.nome }}</option>
        </select>
        <Button icon="ph:plus-bold" @click="novo()">Novo</Button>
      </div>
    </div>

    <p v-if="carregando" class="text-sm text-gray-400">Carregando…</p>
    <section v-for="b in blocos" v-show="b.itens.length || b.id === 'hoje'" :key="b.id" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-5 sm:p-6">
      <h2 class="text-2xl mb-3" :class="b.cor || 'text-primary dark:text-zinc-100'">{{ b.titulo }} <span class="text-sm text-gray-400">{{ b.itens.length }}</span></h2>
      <p v-if="!b.itens.length" class="text-sm italic text-gray-400">Nada para hoje.</p>
      <ul class="divide-y divide-gray-100 dark:divide-zinc-800">
        <li v-for="c in b.itens" :key="c.id" class="py-3 flex flex-wrap items-center gap-3">
          <Icon :name="TIPOS_COMPROMISSO[c.tipo].icone" class="text-xl text-secondary shrink-0" />
          <div class="w-28 shrink-0">
            <p class="font-semibold text-sm">{{ dataCurta(dataCompromisso(c)) }} <span v-if="hora(c)" class="font-normal text-gray-500">{{ hora(c) }}</span></p>
            <p class="text-xs text-gray-500">{{ diaRelativo(dataCompromisso(c)) }}</p>
          </div>
          <button class="flex-1 min-w-[200px] text-left" @click="editar(c)">
            <p class="text-sm font-medium">{{ c.titulo }}</p>
            <p class="text-xs text-gray-500">
              {{ TIPOS_COMPROMISSO[c.tipo].nome }}
              <template v-if="c.contato && !c.titulo.includes(c.contato.nome ?? '—')"> · {{ c.contato.nome }}</template>
              <template v-if="c.caso?.numero_processo"> · <span class="font-mono">{{ c.caso.numero_processo }}</span></template>
              <template v-if="c.local"> · {{ c.local }}</template>
            </p>
          </button>
          <button class="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-primary text-white" @click="concluir(c)">Concluído</button>
        </li>
      </ul>
    </section>

    <Modal :is-open="aberto" :title="editando ? 'Editar compromisso' : 'Novo compromisso'" max-width="2xl" :loading="salvando" @close="aberto = false">
      <form id="compromisso-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="salvar">
        <label class="field">
          <span>Tipo</span>
          <select v-model="form.tipo" class="modal-input"><option v-for="(t, k) in TIPOS_COMPROMISSO" :key="k" :value="k">{{ t.nome }}</option></select>
        </label>
        <label class="field">
          <span>Cliente</span>
          <select v-model="form.contato_id" class="modal-input"><option :value="null">—</option><option v-for="c in contatos" :key="c.id" :value="c.id">{{ c.nome }}</option></select>
        </label>
        <label v-if="casos.length" class="field sm:col-span-2">
          <span>Caso</span>
          <select v-model="form.caso_id" class="modal-input"><option :value="null">—</option><option v-for="k in casos" :key="k.id" :value="k.id">{{ k.titulo }}{{ k.numero_processo ? ` · ${k.numero_processo}` : '' }}</option></select>
        </label>
        <label class="field sm:col-span-2"><span>Descrição *</span><input v-model="form.titulo" class="modal-input" required :placeholder="form.tipo === 'prazo' ? 'Ex.: Contestação' : 'Ex.: Audiência de conciliação'" /></label>

        <template v-if="form.tipo === 'prazo'">
          <label class="field"><span>Publicação / intimação</span><input v-model="form.data_publicacao" type="date" class="modal-input" /></label>
          <label class="field"><span>Prazo (dias úteis)</span><input v-model="form.dias_prazo" type="number" min="1" max="365" class="modal-input" /></label>
          <div v-if="calculo" class="sm:col-span-2 rounded-xl bg-primary/5 border border-primary/10 p-3 text-sm space-y-1">
            <p>Vencimento: <b>{{ dataCurta(calculo.vencimento) }}</b> ({{ new Date(calculo.vencimento + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long' }) }})</p>
            <p v-if="calculo.ignorados.length" class="text-xs text-gray-500">Pulados: {{ calculo.ignorados.join(', ') }}.</p>
            <p v-if="calculo.conferir.length" class="text-xs text-warning-dark dark:text-warning-200">Confira no tribunal se houve expediente em: {{ calculo.conferir.join(', ') }} (contados como dias úteis, por segurança).</p>
            <p class="text-xs text-gray-500">Feriados estaduais, municipais e suspensões do tribunal não entram na conta: confira sempre no sistema do tribunal.</p>
          </div>
        </template>
        <label v-else-if="usaHorario" class="field"><span>Data e hora</span><input v-model="form.inicio_local" type="datetime-local" class="modal-input" required /></label>
        <label v-else class="field"><span>Data</span><input v-model="form.data_limite" type="date" class="modal-input" required /></label>
        <label v-if="usaHorario" class="field"><span>Local ou link</span><input v-model="form.local" class="modal-input" /></label>
        <label class="field sm:col-span-2"><span>Observação</span><textarea v-model="form.observacao" rows="2" class="modal-input" /></label>
        <p v-if="erro" class="sm:col-span-2 text-sm text-danger">{{ erro }}</p>
      </form>
      <template #footer>
        <div class="flex flex-col-reverse sm:flex-row gap-3 justify-between">
          <Button v-if="editando" variant="outline" icon="ph:trash-bold" @click="excluir">Excluir</Button>
          <div class="flex gap-3 sm:ml-auto">
            <Button variant="outline" @click="aberto = false">Cancelar</Button>
            <Button form="compromisso-form" type="submit" :loading="salvando" icon="ph:check-bold">Salvar</Button>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
