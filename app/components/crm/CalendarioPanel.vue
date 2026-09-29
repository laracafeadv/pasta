<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from '#imports'
import Button from '~/components/Button.vue'
import Modal from '~/components/Modal.vue'
import { TIPOS_COMPROMISSO, dataCompromisso, type Demanda, type Compromisso, type Contato } from '~~/shared/types/crm'
import { dataCurta } from '~/utils/formatadores'
import { hojeISO, somarDias } from '~/stores/crm'

const emit = defineEmits<{ mudou: [] }>()

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
  if (route.query.contato) novo(Number(route.query.contato), route.query.demanda ? Number(route.query.demanda) : null).then(() => { if (route.query.processo) form.processo_id = Number(route.query.processo) })
})
watch(filtroTipo, carregar)

const hoje = hojeISO()

const mesAtual = ref(new Date(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)) - 1, 1))
const nomeMes = computed(() => mesAtual.value.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))
function mudarMes(delta: number) { mesAtual.value = new Date(mesAtual.value.getFullYear(), mesAtual.value.getMonth() + delta, 1) }
function irParaHoje() { mesAtual.value = new Date(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)) - 1, 1) }

const porDia = computed(() => {
  const mapa = new Map<string, Compromisso[]>()
  for (const c of itens.value) {
    const d = dataCompromisso(c)
    if (!mapa.has(d)) mapa.set(d, [])
    mapa.get(d)!.push(c)
  }
  return mapa
})

const semanas = computed(() => {
  const ano = mesAtual.value.getFullYear()
  const mes = mesAtual.value.getMonth()
  const primeiroDia = new Date(ano, mes, 1)
  const inicio = new Date(primeiroDia)
  inicio.setDate(inicio.getDate() - inicio.getDay())
  const dias: { data: string; numero: number; foraDoMes: boolean; hoje: boolean; itens: Compromisso[] }[] = []
  const cursor = new Date(inicio)
  for (let i = 0; i < 42; i++) {
    const iso = cursor.toLocaleDateString('sv-SE')
    dias.push({ data: iso, numero: cursor.getDate(), foraDoMes: cursor.getMonth() !== mes, hoje: iso === hoje, itens: (porDia.value.get(iso) ?? []).sort((a, b) => (a.inicio ?? '').localeCompare(b.inicio ?? '')) })
    cursor.setDate(cursor.getDate() + 1)
  }
  const grupos: typeof dias[] = []
  for (let i = 0; i < dias.length; i += 7) grupos.push(dias.slice(i, i + 7))
  return grupos
})
const CORES_TIPO: Record<string, string> = {
  prazo: 'bg-warning/15 text-warning-dark dark:text-warning-200',
  audiencia: 'bg-danger/15 text-danger-dark dark:text-danger-200',
  consulta: 'bg-secondary/15 text-secondary-dark dark:text-secondary-200',
  reuniao: 'bg-info/15 text-info-dark dark:text-info-200',
  tarefa: 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300',
}

async function concluir(c: Compromisso) {
  await $fetch(`/api/compromissos/${c.id}`, { method: 'PATCH', body: { status: 'concluido' } })
  aberto.value = false
  carregar()
  emit('mudou')
}

// ─── Novo / editar ──────────────────────────────────────────────────────────
const aberto = ref(false)
const salvando = ref(false)
const erro = ref<string | null>(null)
const editando = ref<Compromisso | null>(null)
const form = reactive<Record<string, any>>({})
const contatos = ref<Pick<Contato, 'id' | 'nome'>[]>([])
// A agenda tem prazos, audiências, consultas e reuniões; tarefas vivem em Tarefas.
const TIPOS_AGENDA = Object.fromEntries(Object.entries(TIPOS_COMPROMISSO).filter(([k]) => k !== 'tarefa')) as Omit<typeof TIPOS_COMPROMISSO, 'tarefa'>
const casos = ref<Demanda[]>([])
const processosDaDemanda = computed(() => casos.value.find(k => k.id === form.caso_id)?.processos ?? [])

async function carregarOpcoes() {
  if (!contatos.value.length) {
    const r = await $fetch<{ records: Contato[] }>('/api/crm/contatos', { params: { pageSize: '200' } })
    contatos.value = r.records.map(c => ({ id: c.id, nome: c.nome })).sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? ''))
  }
}
watch(() => form.contato_id, async (id) => {
  casos.value = id ? await $fetch<Demanda[]>('/api/demandas', { params: { contato: id } }) : []
})

async function novo(contatoId: number | null = null, casoId: number | null = null) {
  editando.value = null
  erro.value = null
  Object.assign(form, {
    tipo: casoId ? 'prazo' : 'reuniao', titulo: '', contato_id: contatoId, caso_id: casoId, processo_id: null,
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
defineExpose({ novo })

const usaHorario = computed(() => ['audiencia', 'consulta', 'reuniao'].includes(form.tipo))
// Prazo de PROCEDIMENTO extrajudicial (validade de certidão, exigência do cartório): data limite direta, sem intimação nem dias úteis.
const prazoExtrajudicial = computed(() => form.tipo === 'prazo' && processosDaDemanda.value.find(p => p.id === form.processo_id)?.natureza === 'extrajudicial')
const calculo = computed(() => form.tipo === 'prazo' && !prazoExtrajudicial.value && form.data_publicacao && form.dias_prazo > 0 ? calcularPrazo(form.data_publicacao, Number(form.dias_prazo)) : null)

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
  if (form.tipo !== 'prazo' || prazoExtrajudicial.value) { body.data_publicacao = null; body.dias_prazo = null }
  delete body.inicio_local
  try {
    if (editando.value) await $fetch(`/api/compromissos/${editando.value.id}`, { method: 'PATCH', body })
    else await $fetch('/api/compromissos', { method: 'POST', body })
    aberto.value = false
    carregar()
    emit('mudou')
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
  emit('mudou')
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <select v-model="filtroTipo" class="rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm">
        <option value="">Tudo</option>
        <option v-for="(t, k) in TIPOS_AGENDA" :key="k" :value="k">{{ t.nome }}</option>
      </select>
      <Button icon="ph:plus-bold" @click="novo()">Novo</Button>
    </div>

    <p v-if="carregando" class="text-sm text-gray-400">Carregando…</p>

    <section class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-4 sm:p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl text-primary dark:text-zinc-100 capitalize">{{ nomeMes }}</h2>
        <div class="flex items-center gap-1">
          <button type="button" class="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 inline-flex items-center justify-center" @click="mudarMes(-1)"><Icon name="ph:caret-left-bold" /></button>
          <button type="button" class="text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border border-gray-300 dark:border-zinc-700 hover:border-primary" @click="irParaHoje">Hoje</button>
          <button type="button" class="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 inline-flex items-center justify-center" @click="mudarMes(1)"><Icon name="ph:caret-right-bold" /></button>
        </div>
      </div>
      <div class="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
        <span v-for="d in ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']" :key="d">{{ d }}</span>
      </div>
      <div class="space-y-1">
        <div v-for="(semana, si) in semanas" :key="si" class="grid grid-cols-7 gap-1">
          <div v-for="dia in semana" :key="dia.data" class="min-h-[92px] rounded-xl p-1.5 border" :class="dia.hoje ? 'border-primary bg-primary/5' : 'border-gray-100 dark:border-zinc-800'">
            <p class="text-[11px] font-semibold" :class="dia.foraDoMes ? 'text-gray-300 dark:text-zinc-700' : dia.hoje ? 'text-primary' : 'text-gray-500'">{{ dia.numero }}</p>
            <button v-for="c in dia.itens.slice(0, 3)" :key="c.id" class="block w-full text-left text-[10px] font-semibold px-1.5 py-0.5 rounded-full truncate mt-0.5" :class="CORES_TIPO[c.tipo]" :title="c.titulo" @click="editar(c)">{{ c.titulo }}</button>
            <p v-if="dia.itens.length > 3" class="text-[9px] text-gray-400 px-1.5">+{{ dia.itens.length - 3 }}</p>
          </div>
        </div>
      </div>
    </section>

    <Modal :is-open="aberto" :title="editando ? 'Editar compromisso' : 'Novo compromisso'" max-width="2xl" :loading="salvando" @close="aberto = false">
      <form id="compromisso-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="salvar">
        <label class="field">
          <span>Tipo</span>
          <select v-model="form.tipo" class="modal-input"><option v-for="(t, k) in TIPOS_AGENDA" :key="k" :value="k">{{ t.nome }}</option></select>
        </label>
        <label class="field">
          <span>Cliente</span>
          <select v-model="form.contato_id" class="modal-input"><option :value="null">—</option><option v-for="c in contatos" :key="c.id" :value="c.id">{{ c.nome }}</option></select>
        </label>
        <label v-if="casos.length" class="field sm:col-span-2">
          <span>Demanda</span>
          <select v-model="form.caso_id" class="modal-input" @change="form.processo_id = null"><option :value="null">—</option><option v-for="k in casos" :key="k.id" :value="k.id">{{ k.titulo }}</option></select>
        </label>
        <label v-if="processosDaDemanda.length" class="field sm:col-span-2">
          <span>Processo / procedimento</span>
          <select v-model="form.processo_id" class="modal-input"><option :value="null">—</option><option v-for="pr in processosDaDemanda" :key="pr.id" :value="pr.id">{{ pr.natureza === 'judicial' ? 'Processo' : 'Procedimento' }} {{ pr.numero || pr.orgao || '' }}</option></select>
        </label>
        <label class="field sm:col-span-2"><span>Descrição *</span><input v-model="form.titulo" class="modal-input" required :placeholder="form.tipo === 'prazo' ? 'Ex.: Contestação' : 'Ex.: Audiência de conciliação'" /></label>

        <label v-if="prazoExtrajudicial" class="field sm:col-span-2" data-testid="prazo-extrajudicial"><span>Data limite (validade de certidão, exigência do cartório…)</span><input v-model="form.data_limite" type="date" class="modal-input" required /></label>
        <template v-else-if="form.tipo === 'prazo'">
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
          <div class="flex gap-3">
            <Button v-if="editando" variant="outline" icon="ph:trash-bold" @click="excluir">Excluir</Button>
            <Button v-if="editando" variant="outline" icon="ph:check-circle-bold" @click="concluir(editando)">Marcar concluído</Button>
          </div>
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
