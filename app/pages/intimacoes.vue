<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { definePageMeta, navigateTo, useHead, useRoute } from '#imports'
import Button from '~/components/Button.vue'
import Modal from '~/components/Modal.vue'
import { TIPOS_INTIMACAO, type Intimacao, type Processo } from '~~/shared/types/crm'
import { calcularPrazo } from '~~/shared/utils/juridico'
import { dataCurta } from '~/utils/formatadores'
import { hojeISO, somarDias } from '~/stores/crm'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Intimações' })

// Intimações de processos judiciais, registradas pelo escritório: cada uma gera o prazo (dias úteis), a tarefa de trabalho e o andamento.
const rota = useRoute()
const itens = ref<Intimacao[]>([])
const carregando = ref(true)
const filtro = ref<'a_tratar' | 'tratada' | 'todas'>('a_tratar')
const hoje = hojeISO()
async function carregar() {
  carregando.value = true
  try { itens.value = await $fetch<Intimacao[]>('/api/intimacoes', { params: { status: filtro.value } }) } finally { carregando.value = false }
}
watch(filtro, carregar)

// Ordem da fila: sem prazo definido primeiro, depois pelo vencimento mais próximo.
const venc = (i: Intimacao) => i.compromisso?.data_limite ?? null
const fila = computed(() => [...itens.value].sort((a, b) => {
  if (filtro.value !== 'a_tratar') return b.data_publicacao.localeCompare(a.data_publicacao)
  const va = venc(a), vb = venc(b)
  if (!va && !vb) return b.data_publicacao.localeCompare(a.data_publicacao)
  if (!va) return -1
  if (!vb) return 1
  return va.localeCompare(vb)
}))
function situacao(i: Intimacao) {
  const v = venc(i)
  if (i.status === 'tratada') return { txt: 'Tratada', cor: 'bg-success/15 text-success-dark' }
  if (!v) return { txt: 'Sem prazo definido', cor: 'bg-warning/20 text-warning-dark' }
  const dias = Math.round((new Date(v + 'T12:00').getTime() - new Date(hoje + 'T12:00').getTime()) / 864e5)
  if (dias < 0) return { txt: `Vencido há ${-dias} dia(s)`, cor: 'bg-danger/15 text-danger' }
  if (dias === 0) return { txt: 'Vence hoje', cor: 'bg-danger/15 text-danger' }
  return { txt: `Vence em ${dias} dia(s)`, cor: dias <= 3 ? 'bg-warning/20 text-warning-dark' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600' }
}

async function tratar(i: Intimacao) {
  const obs = prompt('Como foi tratada? (opcional)') ?? undefined
  if (obs === undefined) return
  await $fetch(`/api/intimacoes/${i.id}/tratar`, { method: 'POST', body: { obs } })
  await carregar()
}
async function reabrir(i: Intimacao) { await $fetch(`/api/intimacoes/${i.id}/tratar`, { method: 'POST', body: { reabrir: true } }); await carregar() }
async function excluir(i: Intimacao) {
  if (!confirm('Excluir esta intimação? O prazo e a tarefa gerados, se ainda pendentes, também saem.')) return
  await $fetch(`/api/intimacoes/${i.id}`, { method: 'DELETE' }); await carregar()
}
async function definirPrazo(i: Intimacao) {
  const dias = Number(prompt('Prazo em dias úteis (contados da publicação):', '15'))
  if (!Number.isInteger(dias) || dias < 1) return
  try { await $fetch(`/api/intimacoes/${i.id}`, { method: 'PUT', body: { dias_prazo: dias } }); await carregar() } catch (e: any) { alert(e?.data?.message || 'Não foi possível definir o prazo.') }
}
const abrirFicha = (i: Intimacao) => navigateTo({ path: '/crm', query: { abrir: i.contato_id, ficha: 'demandas' } })

// ─── Nova intimação ─────────────────────────────────────────────────────────
const aberto = ref(false)
const salvando = ref(false)
const erro = ref<string | null>(null)
const resultado = ref<{ vencimento: string | null; conferir: string[]; dataTrabalho: string } | null>(null)
const form = reactive({ data_publicacao: hoje, tipo: 'Intimação para manifestação', conteudo: '', dias_prazo: '' as string | number, data_trabalho: '' })
const processo = ref<Processo | null>(null)
const busca = ref('')
const opcoes = ref<Processo[]>([])
let t: ReturnType<typeof setTimeout> | undefined
function buscar() {
  clearTimeout(t)
  if (busca.value.trim().length < 2) { opcoes.value = []; return }
  t = setTimeout(async () => { opcoes.value = await $fetch<Processo[]>('/api/processos', { params: { natureza: 'judicial', status: 'ativo', search: busca.value.trim() } }).catch(() => []) }, 250)
}
function escolher(p: Processo) { processo.value = p; opcoes.value = []; busca.value = '' }
const calculo = computed(() => form.data_publicacao && Number(form.dias_prazo) > 0 ? calcularPrazo(form.data_publicacao, Number(form.dias_prazo)) : null)
const trabalhoSugerido = computed(() => { if (!calculo.value) return hoje; const a = somarDias(calculo.value.vencimento, -2); return a < hoje ? hoje : a })
async function abrirNova(p?: Processo | null) {
  Object.assign(form, { data_publicacao: hoje, tipo: 'Intimação para manifestação', conteudo: '', dias_prazo: '', data_trabalho: '' })
  processo.value = p ?? null; busca.value = ''; opcoes.value = []; erro.value = null; resultado.value = null
  aberto.value = true
}
async function salvar() {
  if (!processo.value) { erro.value = 'Escolha o processo judicial.'; return }
  salvando.value = true; erro.value = null
  try {
    const r = await $fetch<{ vencimento: string | null; conferir: string[]; dataTrabalho: string }>('/api/intimacoes', { method: 'POST', body: { processo_id: processo.value.id, data_publicacao: form.data_publicacao, tipo: form.tipo, conteudo: form.conteudo, dias_prazo: form.dias_prazo || null, data_trabalho: form.data_trabalho || null } })
    resultado.value = r
    await carregar()
  } catch (e: any) { erro.value = e?.data?.message || 'Não foi possível registrar.' } finally { salvando.value = false }
}
onMounted(async () => {
  await carregar()
  if (rota.query.processo) {
    const [p] = await $fetch<Processo[]>('/api/processos', { params: { id: Number(rota.query.processo) } }).catch(() => [])
    if (p) abrirNova(p)
  } else if (rota.query.novo) abrirNova()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="eyebrow">Trabalho</p>
        <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Intimações</h1>
        <p class="text-sm text-gray-500 mt-2 max-w-2xl">Registre cada intimação ou publicação de um processo judicial. O sistema calcula o prazo em dias úteis, cria a tarefa de trabalho e lança o andamento no processo. <span class="text-gray-400">Registro manual: não há integração com tribunais.</span></p>
      </div>
      <Button icon="ph:plus-bold" data-testid="nova-intimacao" @click="abrirNova()">Nova intimação</Button>
    </div>

    <div class="flex gap-2">
      <button v-for="o in [{ v: 'a_tratar', n: 'A tratar' }, { v: 'tratada', n: 'Tratadas' }, { v: 'todas', n: 'Todas' }]" :key="o.v" type="button" class="text-sm font-semibold px-4 py-2 rounded-full border" :class="filtro === o.v ? 'bg-primary text-white border-primary' : 'border-gray-300 dark:border-zinc-700 text-gray-500'" :data-testid="`filtro-${o.v}`" @click="filtro = o.v as any">{{ o.n }}</button>
    </div>

    <p v-if="carregando" class="text-sm text-gray-400">Carregando…</p>
    <p v-else-if="!fila.length" class="text-sm text-gray-400">{{ filtro === 'a_tratar' ? 'Nenhuma intimação a tratar. 🎉' : 'Nada por aqui.' }}</p>
    <div class="space-y-3">
      <article v-for="i in fila" :key="i.id" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-4 space-y-1.5" :data-testid="`intimacao-${i.id}`">
        <div class="flex flex-wrap items-baseline gap-2">
          <span class="font-semibold">{{ i.tipo }}</span>
          <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" :class="situacao(i).cor" data-testid="situacao">{{ situacao(i).txt }}</span>
          <span class="ml-auto text-xs text-gray-400">publicada em {{ dataCurta(i.data_publicacao) }}</span>
        </div>
        <p class="text-xs text-gray-500"><span class="font-mono">{{ i.processo?.numero || 'sem número' }}</span> · {{ i.contato?.nome }} · {{ i.caso?.titulo }}</p>
        <p v-if="i.conteudo" class="text-sm whitespace-pre-line text-gray-700 dark:text-zinc-300">{{ i.conteudo }}</p>
        <p v-if="venc(i)" class="text-xs text-gray-500">Prazo de {{ i.dias_prazo }} dias úteis · vence em <b>{{ dataCurta(venc(i)!) }}</b><span v-if="i.tarefa"> · trabalhar em {{ dataCurta(i.tarefa.prazo) }}</span></p>
        <p v-if="i.tratada_obs" class="text-xs text-gray-500">Tratamento: {{ i.tratada_obs }}</p>
        <div class="flex flex-wrap gap-3 pt-1 text-xs">
          <button v-if="i.status === 'a_tratar'" type="button" class="font-semibold underline underline-offset-2 text-primary dark:text-zinc-200" data-testid="tratar" @click="tratar(i)">Marcar como tratada</button>
          <button v-else type="button" class="underline underline-offset-2" @click="reabrir(i)">Reabrir</button>
          <button v-if="i.status === 'a_tratar'" type="button" class="underline underline-offset-2" data-testid="definir-prazo" @click="definirPrazo(i)">{{ venc(i) ? 'Corrigir prazo' : 'Definir prazo' }}</button>
          <button type="button" class="underline underline-offset-2" @click="abrirFicha(i)">Abrir ficha</button>
          <button type="button" class="text-gray-400 hover:text-danger ml-auto" @click="excluir(i)">Excluir</button>
        </div>
      </article>
    </div>

    <Modal :is-open="aberto" title="Nova intimação" description="Processo judicial: o prazo é contado em dias úteis a partir da publicação." max-width="2xl" :loading="salvando" @close="aberto = false">
      <div v-if="resultado" class="space-y-3 p-1" data-testid="resultado">
        <p class="text-sm"><b>Intimação registrada.</b> {{ resultado.vencimento ? `Prazo na agenda: vence em ${dataCurta(resultado.vencimento)}.` : 'Sem prazo definido: criei uma tarefa para você analisar e definir.' }} Tarefa em {{ dataCurta(resultado.dataTrabalho) }} e andamento lançado no processo.</p>
        <p v-if="resultado.conferir?.length" class="text-xs text-warning-dark">Confira no tribunal se houve expediente em: {{ resultado.conferir.join(', ') }}.</p>
        <p class="text-xs text-gray-500">Feriados estaduais, municipais e suspensões do tribunal não entram na conta: confira o vencimento no sistema do tribunal.</p>
        <div class="flex justify-end gap-2"><Button variant="outline" @click="abrirNova(processo)">Registrar outra deste processo</Button><Button @click="aberto = false">Fechar</Button></div>
      </div>
      <form v-else id="intimacao-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="salvar">
        <div class="field sm:col-span-2 relative">
          <span>Processo judicial *</span>
          <div v-if="processo" class="flex items-center justify-between rounded-lg bg-secondary/10 border border-secondary/30 px-3 py-2 text-sm" data-testid="processo-escolhido">
            <span><b class="font-mono">{{ processo.numero || 'sem número' }}</b> · {{ processo.contato?.nome }} · {{ processo.caso?.titulo }}</span>
            <button type="button" class="text-xs underline" @click="processo = null">trocar</button>
          </div>
          <template v-else>
            <input v-model="busca" class="modal-input" placeholder="Buscar por número do processo, vara ou nome do cliente…" data-testid="busca-processo" @input="buscar" />
            <ul v-if="opcoes.length" class="absolute z-20 top-full mt-1 w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg max-h-48 overflow-y-auto">
              <li v-for="p in opcoes" :key="p.id"><button type="button" class="w-full text-left px-3 py-2 text-sm hover:bg-secondary/10" :data-testid="`opcao-processo-${p.id}`" @click="escolher(p)"><span class="font-mono text-xs">{{ p.numero || 'sem número' }}</span> · {{ p.contato?.nome }} <span class="text-xs text-gray-400">· {{ p.caso?.titulo }}</span></button></li>
            </ul>
          </template>
        </div>
        <label class="field"><span>Data da publicação / intimação *</span><input v-model="form.data_publicacao" type="date" class="modal-input" required data-testid="i-data" /></label>
        <label class="field"><span>Tipo *</span><select v-model="form.tipo" class="modal-input" data-testid="i-tipo"><option v-for="tp in TIPOS_INTIMACAO" :key="tp">{{ tp }}</option></select></label>
        <label class="field sm:col-span-2"><span>Teor / resumo</span><textarea v-model="form.conteudo" rows="3" class="modal-input" placeholder="O que foi determinado? (cole o trecho relevante)" data-testid="i-conteudo" /></label>
        <div class="field">
          <span>Prazo (dias úteis)</span>
          <div class="flex gap-2">
            <input v-model="form.dias_prazo" type="number" min="1" max="365" class="modal-input" placeholder="Ex.: 15" data-testid="i-dias" />
            <button v-for="n in [5, 10, 15, 30]" :key="n" type="button" class="px-3 rounded-lg border border-gray-300 dark:border-zinc-700 text-xs" @click="form.dias_prazo = n">{{ n }}</button>
          </div>
          <small class="text-gray-400">Sem prazo (ex.: só ciência)? Deixe em branco: cria uma tarefa para analisar.</small>
        </div>
        <label class="field"><span>Trabalhar o prazo em</span><input v-model="form.data_trabalho" type="date" class="modal-input" :placeholder="trabalhoSugerido" /><small class="text-gray-400">Padrão: {{ dataCurta(trabalhoSugerido) }} ({{ calculo ? '2 dias antes do vencimento' : 'hoje' }}).</small></label>
        <div v-if="calculo" class="sm:col-span-2 rounded-xl bg-primary/5 border border-primary/10 p-3 text-sm" data-testid="previa-vencimento">
          Vencimento: <b>{{ dataCurta(calculo.vencimento) }}</b> ({{ new Date(calculo.vencimento + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long' }) }})
          <p v-if="calculo.ignorados.length" class="text-xs text-gray-500 mt-1">Pulados: {{ calculo.ignorados.join(', ') }}.</p>
          <p v-if="calculo.conferir.length" class="text-xs text-warning-dark mt-1">Confira no tribunal se houve expediente em: {{ calculo.conferir.join(', ') }}.</p>
        </div>
        <p v-if="erro" class="sm:col-span-2 text-sm text-danger" data-testid="i-erro">{{ erro }}</p>
      </form>
      <template v-if="!resultado" #footer>
        <div class="flex justify-end gap-3"><Button variant="outline" @click="aberto = false">Cancelar</Button><Button form="intimacao-form" type="submit" :loading="salvando" icon="ph:check-bold" data-testid="i-salvar">Registrar</Button></div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
