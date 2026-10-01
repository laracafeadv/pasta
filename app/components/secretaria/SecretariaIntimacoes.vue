<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { SecretariaGoogle } from '~/composables/useSecretariaGoogle'
import type { AvisoItem, InicioSecretaria } from '~~/shared/data/secretaria'
import { TRIBUNAIS, contarPrazo, type ContextoPrazo } from '~~/shared/utils/calendarioForense'
import GoogleConectar from './GoogleConectar.vue'

// Intimações lidas do Gmail (remetentes @jus.br). "Lançar prazo" cria o evento no Google Agenda (avisos 3 dias e 1 dia antes),
// o prazo na agenda da Secretária e o lembrete, e marca o aviso como "Prazo lançado".
const props = defineProps<{ g: SecretariaGoogle }>()
const emit = defineEmits<{ mudou: [] }>()
const DJEN = 'https://comunica.pje.jus.br'
const filtro = ref<'prazos' | 'tudo'>('prazos')
const verMais = ref(10)
const inicio = ref<InicioSecretaria | null>(null)
const fmt = (iso: string, o: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', ...o }).format(new Date(Date.parse(iso + 'T00:00:00Z')))
const semana = (iso: string) => fmt(iso, { weekday: 'long' })
const brtDia = (iso: string) => iso ? new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date(iso)) : ''
const hhmm = (t: number) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(t))

async function carregarConfig() { try { inicio.value = await $fetch<InicioSecretaria>('/api/secretaria/inicio') } catch { /* a prévia usa o padrão */ } }
onMounted(carregarConfig)

const lista = computed(() => props.g.intim.itens.filter(i => filtro.value === 'tudo' || i.intimacao))
const dataAviso = (i: AvisoItem) => i.dataMov ? fmt(i.dataMov) : (brtDia(i.quando) || i.dataEmail) ? fmt(brtDia(i.quando) || i.dataEmail) : ''

// formulário "Lançar prazo"
const form = reactive({ id: '', dias: 15, modo: 'uteis' as 'uteis' | 'corridos', ciencia: '', trib: 'tjba', erro: '', salvando: false })
function abrir(i: AvisoItem) {
  if (form.id === i.id) { form.id = ''; return }
  Object.assign(form, { id: i.id, dias: 15, modo: 'uteis', ciencia: brtDia(i.quando) || i.dataEmail, trib: i.chave === 'nac' ? (inicio.value?.config.tribunal ?? 'tjba') : i.chave, erro: '', salvando: false })
}
const ctx = computed<ContextoPrazo>(() => ({ trib: form.trib, ssa: /salvador/i.test(inicio.value?.config.cidade ?? 'Salvador'), fac: inicio.value?.config.pontos_facultativos ?? false, susp: (inicio.value?.suspensoes ?? []).map(s => ({ de: s.de, ate: s.ate, trib: s.tribunal, motivo: s.motivo })) }))
const previa = computed(() => form.dias >= 1 && form.dias <= 365 && /^\d{4}-\d{2}-\d{2}$/.test(form.ciencia) ? contarPrazo(form.ciencia, form.dias, ctx.value, form.modo) : null)
async function lancar(i: AvisoItem) {
  if (!previa.value || form.salvando) return
  form.salvando = true; form.erro = ''
  try {
    await $fetch(`/api/secretaria/intimacoes/${encodeURIComponent(i.id)}/prazo`, { method: 'POST', body: { dias: form.dias, modo: form.modo, ciencia: form.ciencia, tribunal: form.trib } })
    form.id = ''
    await props.g.carregarIntimacoes(); await carregarConfig(); emit('mudou')
  } catch (e: any) {
    form.erro = e?.data?.message || 'Não foi possível lançar o prazo.'
    if (e?.statusCode === 500 || /Google Agenda \(vence/.test(form.erro)) { await props.g.carregarIntimacoes() }
  } finally { form.salvando = false }
}
</script>

<template>
  <div class="space-y-4">
    <GoogleConectar v-if="!g.status.value?.conectado" :g="g" recurso="ler as intimações no seu Gmail e lançar os prazos na Agenda" />
    <section v-else id="sIntim" class="cartao">
      <h2>Intimações dos tribunais · últimos 14 dias
        <span class="flex gap-2 items-center flex-wrap">
          <span class="flex gap-1.5" role="group" aria-label="Filtro">
            <button type="button" class="chip" :aria-pressed="filtro === 'prazos'" @click="filtro = 'prazos'; verMais = 10">Intimações e prazos</button>
            <button type="button" class="chip" :aria-pressed="filtro === 'tudo'" @click="filtro = 'tudo'; verMais = 10">Tudo</button>
          </span>
          <button type="button" class="btn sec sm" @click="g.carregarIntimacoes">Atualizar</button>
        </span>
      </h2>
      <p class="msg">Lê os avisos de @jus.br no seu Gmail (eproc, PJe Push, nomeações) e ignora alertas de login e senha.
        <a :href="DJEN" target="_blank" rel="noopener">Abrir o DJEN</a> — este painel não substitui a consulta oficial.
        <template v-if="g.intim.em"> Atualizado às {{ hhmm(g.intim.em) }}.</template></p>
      <p v-if="g.intim.carregando && !g.intim.itens.length" class="msg">Lendo os avisos no Gmail…</p>
      <p v-if="g.intim.erro" class="msg err">{{ g.intim.erro }} <button type="button" class="link" @click="g.carregarIntimacoes">Tentar de novo</button></p>
      <p v-else-if="!lista.length && !g.intim.carregando" class="msg">{{ g.intim.itens.length ? 'Nenhuma intimação ou prazo nos avisos. Veja "Tudo".' : 'Nenhum aviso de tribunal nos últimos 14 dias.' }}</p>

      <template v-for="i in lista.slice(0, verMais)" :key="i.id">
        <div class="intim" :class="{ nova: i.naoLida }" :data-testid="`intim-${i.id}`">
          <span class="bolinha" :class="{ on: i.naoLida }" :title="i.naoLida ? 'Não lida' : 'Lida'" />
          <div class="cx">
            <div><span class="pilula">{{ i.tribunal }}</span> <b v-if="i.cnj" class="cnj">{{ i.cnj }}</b><span v-else class="msg">sem número de processo no aviso</span></div>
            <div class="mov">{{ i.movimentacao || '(sem descrição)' }}</div>
            <div class="q">{{ dataAviso(i) }}{{ i.intimacao ? '' : ' · aviso' }} · <a :href="i.link" target="_blank" rel="noopener">abrir e-mail</a></div>
          </div>
          <span v-if="g.intim.lancados[i.id]" class="pilula ok" :data-testid="`lancado-${i.id}`">Prazo lançado · vence {{ fmt(g.intim.lancados[i.id]!.prazo, { day: '2-digit', month: '2-digit' }) }}</span>
          <button v-else type="button" class="btn sm" :data-testid="`lancar-${i.id}`" @click="abrir(i)">Lançar prazo</button>
        </div>
        <div v-if="form.id === i.id && !g.intim.lancados[i.id]" class="conf" data-testid="form-prazo">
          <strong>Lançar prazo: {{ i.cnj || i.tribunal }}</strong>
          <div class="flex gap-2 flex-wrap items-end">
            <label class="rot">Dias<input id="fDias" v-model.number="form.dias" type="number" min="1" max="365" class="campo w-24" /></label>
            <label class="rot">Contagem<select id="fModo" v-model="form.modo" class="campo"><option value="uteis">Dias úteis</option><option value="corridos">Dias corridos</option></select></label>
            <label class="rot">Data da ciência<input id="fCiencia" v-model="form.ciencia" type="date" class="campo" /></label>
            <label class="rot">Calendário<select id="fTrib" v-model="form.trib" class="campo"><option v-for="(n, k) in TRIBUNAIS" :key="k" :value="k">{{ n }}</option></select></label>
          </div>
          <p class="msg">O dia da ciência não conta (CPC, art. 224). Em publicação no DJe, a ciência costuma ser o 1º dia útil após a disponibilização: confira no DJEN.</p>
          <p v-if="previa">Vence em <strong data-testid="form-venc">{{ fmt(previa.vencimento) }} ({{ semana(previa.vencimento) }})</strong>. Ao confirmar, cria o lembrete e o evento no Google Agenda com avisos 3 dias e 1 dia antes.</p>
          <p v-else class="msg">Informe os dias e a data da ciência.</p>
          <p v-if="form.erro" class="msg err" role="alert">{{ form.erro }}</p>
          <div class="flex gap-2"><button type="button" class="btn" :disabled="!previa || form.salvando" data-testid="form-confirmar" @click="lancar(i)">{{ form.salvando ? 'Lançando…' : 'Confirmar e lançar' }}</button><button type="button" class="btn sec" @click="form.id = ''">Cancelar</button></div>
        </div>
      </template>
      <button v-if="lista.length > verMais" type="button" class="btn sec sm mt-2" @click="verMais += 10">Ver mais ({{ lista.length - verMais }})</button>
      <p class="msg mt-3">Conta conectada: {{ g.status.value?.email || 'Google' }} · <button type="button" class="link" @click="g.desconectar">Desconectar</button></p>
    </section>
  </div>
</template>

<style scoped>
.cartao { background: #fff; border: 1px solid rgb(0 0 0 / .08); border-top: 3px solid var(--ouro, #c9a24a); border-radius: 10px; padding: 16px; min-width: 0; }
:global(.dark) .cartao { background: #1e1b17; border-color: rgb(255 255 255 / .1); border-top-color: var(--ouro, #d4af5a); }
h2 { font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ouro-esc, #8a6a26); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.btn { background: var(--ouro-esc, #8a6a26); color: #fff; border-radius: 8px; padding: 9px 14px; font-weight: 600; font-size: 13px; }
:global(.dark) .btn { color: #17130b; background: var(--ouro, #d4af5a); }
.btn.sec { background: transparent; color: var(--ouro-esc, #8a6a26); border: 1px solid var(--ouro, #c9a24a); }
:global(.dark) .btn.sec { color: var(--ouro, #d4af5a); }
.btn.sm { padding: 5px 10px; font-size: 12px; }
.btn:disabled { opacity: .5; }
.link { background: none; text-decoration: underline; font-size: 12px; color: var(--ouro-esc, #8a6a26); }
.chip { border: 1px solid rgb(0 0 0 / .12); border-radius: 999px; padding: 4px 11px; font-size: 12px; font-weight: 500; text-transform: none; letter-spacing: 0; }
.chip[aria-pressed='true'] { border-color: var(--ouro, #c9a24a); background: var(--ouro-suave, #f4ecd9); font-weight: 700; }
:global(.dark) .chip { border-color: rgb(255 255 255 / .18); }
.campo { border: 1px solid rgb(0 0 0 / .14); border-radius: 8px; padding: 8px 10px; background: transparent; min-width: 0; max-width: 100%; font-size: 14px; }
:global(.dark) .campo { border-color: rgb(255 255 255 / .18); }
.rot { display: grid; gap: 3px; font-size: 12px; color: #857866; font-weight: 500; text-transform: none; letter-spacing: 0; }
.msg { font-size: 13px; color: #857866; padding: 4px 0; } .msg.err { color: #b3261e; }
.intim { display: grid; grid-template-columns: 14px 1fr auto; gap: 10px; align-items: start; padding: 10px; border-radius: 8px; border: 1px solid rgb(0 0 0 / .1); margin-bottom: 8px; min-width: 0; }
:global(.dark) .intim { border-color: rgb(255 255 255 / .12); }
.intim.nova { border-left: 4px solid var(--ouro, #c9a24a); background: var(--ouro-suave, #f4ecd9); }
.bolinha { width: 10px; height: 10px; border-radius: 50%; border: 2px solid rgb(0 0 0 / .2); margin-top: 6px; } .bolinha.on { background: var(--ouro, #c9a24a); border-color: var(--ouro, #c9a24a); }
.cx { min-width: 0; display: grid; gap: 2px; }
.cnj { font-variant-numeric: tabular-nums; user-select: all; overflow-wrap: anywhere; }
.mov { font-weight: 600; overflow-wrap: anywhere; } .q { font-size: 11px; color: #857866; }
.pilula { display: inline-block; border-radius: 999px; padding: 2px 9px; font-size: 11px; font-weight: 600; background: var(--ouro-suave, #f4ecd9); color: var(--ouro-esc, #8a6a26); }
.pilula.ok { background: rgb(47 125 79 / .15); color: #2f7d4f; }
.conf { border: 1px dashed var(--ouro, #c9a24a); border-radius: 10px; padding: 12px; margin: -2px 0 10px; background: var(--ouro-suave, #f4ecd9); display: grid; gap: 10px; }
:global(.dark) .conf { background: #2c2618; }
a { color: var(--ouro-esc, #8a6a26); text-decoration: underline; }
</style>
