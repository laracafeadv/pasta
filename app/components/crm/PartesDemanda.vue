<template>
  <div>
    <ul v-if="partes.length" class="text-sm divide-y divide-gray-50 dark:divide-zinc-800/60">
      <li v-for="p in partes" :key="p.id" class="py-1.5" :data-testid="`parte-${p.id}`">
        <div class="flex flex-wrap items-baseline gap-x-2">
          <NuxtLink v-if="p.contato" :to="`/crm?abrir=${p.contato.id}`" class="font-medium underline underline-offset-2 hover:text-primary" title="Abrir a ficha desta pessoa">{{ p.contato.nome ?? p.nome }}</NuxtLink>
          <span v-else class="font-medium">{{ p.nome }}</span>
          <span class="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500">{{ p.papel }}</span>
          <span v-if="p.polo" class="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:text-zinc-200">{{ POLOS_PARTE[p.polo] }}</span>
          <span v-if="p.processo_id && nomeProcesso(p.processo_id)" class="text-[11px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary-dark">{{ nomeProcesso(p.processo_id) }}</span>
          <span v-if="p.contato && ['ativo', 'concluido'].includes(p.contato.etapa)" class="text-[11px] px-2 py-0.5 rounded-full bg-success/15 text-success-dark">também é cliente</span>
          <span v-if="!p.contato" class="text-[11px] px-2 py-0.5 rounded-full bg-warning/15 text-warning-dark" title="Digitada à mão: ainda não é uma pessoa cadastrada">sem cadastro</span>
          <span v-if="p.telefone || p.email" class="text-xs text-gray-400">{{ [p.telefone, p.email].filter(Boolean).join(' · ') }}</span>
          <span class="ml-auto flex items-center gap-2">
            <button v-if="!p.contato" type="button" class="text-[11px] underline text-secondary-dark" data-testid="parte-vincular" @click="abrirVinculo(p)">vincular a pessoa cadastrada</button>
            <button type="button" class="text-[11px] underline text-gray-400 hover:text-primary" data-testid="parte-editar" @click="editar(p)">editar</button>
            <button type="button" class="text-gray-300 hover:text-danger" title="Remover da demanda (a pessoa continua cadastrada)" data-testid="parte-remover" @click="remover(p)"><Icon name="ph:x-bold" /></button>
          </span>
        </div>
        <p v-if="p.observacao" class="text-xs text-gray-500 mt-0.5">{{ p.observacao }}</p>

        <form v-if="editando === p.id" class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2" @submit.prevent="salvarEdicao(p)">
          <div><input v-model="ed.papel" class="modal-input" list="papeis-parte" placeholder="Papel" data-testid="ed-papel" /></div>
          <select v-if="judicial" v-model="ed.polo" class="modal-input"><option value="">Polo (opcional)</option><option v-for="(n, k) in POLOS_PARTE" :key="k" :value="k">{{ n }}</option></select>
          <select v-if="processos.length" v-model="ed.processo_id" class="modal-input"><option :value="null">Toda a demanda</option><option v-for="pr in processos" :key="pr.id" :value="pr.id">{{ rotuloProcesso(pr) }}</option></select>
          <input v-model="ed.observacao" class="modal-input sm:col-span-2" placeholder="Observação (opcional)" />
          <div class="flex gap-2 sm:col-span-2"><Button type="submit" size="sm" :loading="salvando">Salvar</Button><Button type="button" size="sm" variant="outline" @click="editando = null">Cancelar</Button></div>
        </form>

        <div v-if="vinculando === p.id" class="mt-2 space-y-2 rounded-xl bg-gray-50 dark:bg-zinc-900/60 p-3">
          <p class="text-xs text-gray-500">Escolha a pessoa já cadastrada que é "{{ p.nome }}" — ou cadastre-a agora.</p>
          <SeletorPessoa v-model="pessoaVinculo" @nova="v => (novaVinculo = v)" />
          <div class="flex gap-2">
            <Button type="button" size="sm" :loading="salvando" data-testid="vinculo-confirmar" @click="confirmarVinculo(p)">Vincular</Button>
            <Button type="button" size="sm" variant="outline" @click="vinculando = null">Cancelar</Button>
          </div>
        </div>
      </li>
    </ul>
    <p v-else-if="!adicionando" class="text-xs text-gray-400">Nenhuma parte ou interessado registrado.</p>

    <form v-if="adicionando" class="mt-2 space-y-2" @submit.prevent="adicionar()">
      <SeletorPessoa v-model="escolhida" :excluir="idsNaDemanda" @nova="v => (nova = v)" />
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input v-model="form.papel" class="modal-input" list="papeis-parte" placeholder="Papel (Herdeiro, Cônjuge… ou outro)" data-testid="parte-papel" />
        <select v-if="judicial" v-model="form.polo" class="modal-input" data-testid="parte-polo"><option value="">Polo (opcional)</option><option v-for="(n, k) in POLOS_PARTE" :key="k" :value="k">{{ n }}</option></select>
        <select v-if="processos.length" v-model="form.processo_id" class="modal-input" data-testid="parte-processo"><option :value="null">Toda a demanda</option><option v-for="pr in processos" :key="pr.id" :value="pr.id">{{ rotuloProcesso(pr) }}</option></select>
      </div>
      <div v-if="candidatas.length" class="rounded-xl border border-warning/50 bg-warning/5 p-3 text-sm space-y-2" data-testid="candidatas">
        <p>Já existe alguém com esse nome. É a mesma pessoa?</p>
        <div v-for="c in candidatas" :key="c.id" class="flex items-center justify-between gap-2">
          <span><b>{{ c.nome }}</b> <span class="text-xs text-gray-400">{{ c.telefone }}</span></span>
          <Button type="button" size="sm" data-testid="usar-candidata" @click="usarCandidata(c)">Sim, usar esta</Button>
        </div>
        <Button type="button" size="sm" variant="outline" data-testid="e-outra" @click="adicionar(true)">É outra pessoa — cadastrar nova</Button>
      </div>
      <div class="flex gap-2"><Button type="submit" size="sm" :loading="salvando" data-testid="parte-adicionar">Adicionar</Button><Button type="button" size="sm" variant="outline" @click="fechar">Cancelar</Button></div>
    </form>
    <button v-else type="button" class="mt-1 text-xs font-semibold text-secondary-dark hover:underline" data-testid="parte-nova" @click="adicionando = true">+ Parte ou interessado</button>
    <p v-if="erro" class="text-xs text-danger mt-1" data-testid="parte-erro">{{ erro }}</p>
    <datalist id="papeis-parte"><option v-for="p in papeis" :key="p" :value="p" /></datalist>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import Button from '../Button.vue'
import SeletorPessoa from './SeletorPessoa.vue'
import { type Parte, type Processo } from '../../../shared/types/crm'
import { POLOS_PARTE, papeisSugeridos } from '~~/shared/data/procedimentos'

// Partes e interessados de uma demanda. A pessoa é escolhida entre as já cadastradas OU cadastrada na hora
// (como "pessoa cadastrada", fora do funil): o servidor reaproveita telefone/nome já existentes — nunca há duas fichas.
const props = withDefaults(defineProps<{ partes: Parte[]; casoId: number; judicial?: boolean; extrajudicial?: boolean; processos?: Processo[] }>(), { judicial: false, extrajudicial: false, processos: () => [] })
const emit = defineEmits<{ mudou: [] }>()
const papeis = computed(() => papeisSugeridos(props.judicial, props.extrajudicial))
const idsNaDemanda = computed(() => props.partes.map(p => p.contato_id).filter((x): x is number => !!x))

interface Pessoa { id: number; nome: string | null; telefone?: string | null; etapa?: string }
interface NovaPessoa { nome: string; telefone: string; email: string }
const adicionando = ref(false)
const salvando = ref(false)
const erro = ref<string | null>(null)
const escolhida = ref<Pessoa | null>(null)
const nova = ref<NovaPessoa>({ nome: '', telefone: '', email: '' })
const candidatas = ref<Pessoa[]>([])
const form = reactive<{ papel: string; polo: string; processo_id: number | null }>({ papel: 'Herdeiro', polo: '', processo_id: null })
const editando = ref<number | null>(null)
const ed = reactive<{ papel: string; polo: string; processo_id: number | null; observacao: string }>({ papel: '', polo: '', processo_id: null, observacao: '' })
const vinculando = ref<number | null>(null)
const pessoaVinculo = ref<Pessoa | null>(null)
const novaVinculo = ref<NovaPessoa>({ nome: '', telefone: '', email: '' })

const rotuloProcesso = (pr: Processo) => pr.numero || pr.tipo_procedimento || (pr.natureza === 'judicial' ? 'Processo judicial' : 'Procedimento extrajudicial')
const nomeProcesso = (id: number) => { const pr = props.processos.find(x => x.id === id); return pr ? rotuloProcesso(pr) : null }
const msg = (e: any) => e?.data?.message || e?.statusMessage || 'Não foi possível concluir.'

function fechar() {
  adicionando.value = false; escolhida.value = null; nova.value = { nome: '', telefone: '', email: '' }; candidatas.value = []
  Object.assign(form, { papel: 'Herdeiro', polo: '', processo_id: null }); erro.value = null
}
function usarCandidata(c: Pessoa) { escolhida.value = c; candidatas.value = [] }

async function adicionar(confirmarNova = false) {
  erro.value = null
  if (!escolhida.value && !nova.value.nome.trim()) { erro.value = 'Escolha uma pessoa cadastrada ou digite o nome.'; return }
  salvando.value = true
  try {
    await $fetch('/api/partes', { method: 'POST', body: {
      caso_id: props.casoId, papel: form.papel, polo: props.judicial ? (form.polo || null) : null, processo_id: form.processo_id,
      ...(escolhida.value ? { pessoa_id: escolhida.value.id } : { nova_pessoa: nova.value, confirmar_nova: confirmarNova }),
    } })
    fechar(); emit('mudou')
  } catch (e: any) {
    if (e?.statusCode === 409 && e?.data?.data?.candidatas?.length) { candidatas.value = e.data.data.candidatas; return }
    erro.value = msg(e)
  } finally { salvando.value = false }
}

function editar(p: Parte) {
  editando.value = p.id; vinculando.value = null
  Object.assign(ed, { papel: p.papel, polo: p.polo ?? '', processo_id: p.processo_id ?? null, observacao: p.observacao ?? '' })
}
async function salvarEdicao(p: Parte) {
  salvando.value = true; erro.value = null
  try {
    await $fetch(`/api/partes/${p.id}`, { method: 'PUT', body: { papel: ed.papel, polo: props.judicial ? (ed.polo || null) : null, processo_id: ed.processo_id, observacao: ed.observacao } })
    editando.value = null; emit('mudou')
  } catch (e: any) { erro.value = msg(e) } finally { salvando.value = false }
}

function abrirVinculo(p: Parte) { vinculando.value = p.id; editando.value = null; pessoaVinculo.value = null; novaVinculo.value = { nome: p.nome, telefone: p.telefone ?? '', email: p.email ?? '' } }
async function confirmarVinculo(p: Parte) {
  salvando.value = true; erro.value = null
  try {
    await $fetch(`/api/partes/${p.id}/vincular`, { method: 'POST', body: pessoaVinculo.value ? { pessoa_id: pessoaVinculo.value.id } : { nova_pessoa: novaVinculo.value } })
    vinculando.value = null; emit('mudou')
  } catch (e: any) { erro.value = msg(e) } finally { salvando.value = false }
}

async function remover(p: Parte) {
  erro.value = null
  try { await $fetch(`/api/partes/${p.id}`, { method: 'DELETE' }); emit('mudou') } catch (e: any) { erro.value = msg(e) }
}
</script>
