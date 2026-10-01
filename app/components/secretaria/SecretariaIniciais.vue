<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { SecretariaIniciais } from '~/composables/useSecretariaIniciais'
import type { EtapaInicial, InicialEntrada, InicialSecretaria, ItemChecklist } from '~~/shared/data/secretaria'
import {
  AREAS_INI, ETAPAS_INI, PRIORIDADES, TIPOS_FATAL, acoesDaArea, adicionarDoc, alerta, checklistPendente, docsSugeridos, erroInicial,
  filtrarIniciais, formataCNJ, nomeEtapa, ordenarColuna, prazosProximos, proximaEtapa, resumoIniciais,
} from '~~/shared/utils/iniciaisSecretaria'

// Iniciais: quadro por etapa (cards arrastáveis + "Avançar"), ficha com checklist de documentos, resumo, faixa de prazos de 7 dias, busca e filtro por área.
const props = defineProps<{ ini: SecretariaIniciais }>()
const hoje = computed(() => props.ini.dia.value)
const fmtData = (iso: string, o: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' }) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', ...o }).format(new Date(Date.parse(iso + 'T00:00:00Z')))
const busca = ref('')
const filtroArea = ref('')
const lista = computed(() => props.ini.iniciais.value)
const visiveis = computed(() => filtrarIniciais(lista.value, busca.value, filtroArea.value))
const resumo = computed(() => resumoIniciais(lista.value, hoje.value))
const faixa = computed(() => prazosProximos(visiveis.value, hoje.value))
const mostrarTodasProt = ref(false)
const LIMITE_PROT = 10
const coluna = (k: EtapaInicial) => ordenarColuna(visiveis.value, k, hoje.value)
const colunaVista = (k: EtapaInicial) => k === 'protocolada' && !mostrarTodasProt.value ? coluna(k).slice(0, LIMITE_PROT) : coluna(k)
const pend = (x: InicialSecretaria) => checklistPendente(x).length
const diasNaEtapa = (x: InicialSecretaria) => Math.max(0, Math.round((Date.parse(hoje.value + 'T12:00:00Z') - Date.parse((x.etapa_desde || '').slice(0, 10) + 'T12:00:00Z')) / 864e5)) || 0
const aviso = ref('')
const erro = ref('')

function textoAlerta(x: InicialSecretaria) {
  const a = alerta(x, hoje.value); if (!a || !a.data) return ''
  const o = a.tipo === 'fatal' ? 'Prazo fatal' : 'Meta'
  if (a.dias! < 0) return `${o} vencido há ${-a.dias!} ${a.dias === -1 ? 'dia' : 'dias'} (${fmtData(a.data)})`
  return a.dias === 0 ? `${o} é HOJE` : a.dias === 1 ? `${o} é amanhã` : `${o}: ${fmtData(a.data)} (${a.dias} dias)`
}

// ── arrastar, avançar e mover ──
function aoSoltar(ev: DragEvent, k: EtapaInicial) {
  ev.preventDefault(); (ev.currentTarget as HTMLElement).classList.remove('alvo')
  const id = ev.dataTransfer?.getData('text/plain'); if (id) mover(id, k)
}
async function mover(id: number | string, etapa: EtapaInicial) {
  const x = props.ini.achar(id); if (!x || x.etapa === etapa) return
  if (etapa === 'protocolada') return abrirSub('protocolar', x)
  if (etapa === 'pronta' && pend(x)) return abrirSub('pendencias', x)
  try { await props.ini.mover(id, { etapa }) } catch (e: any) { aviso.value = props.ini.msg(e, 'Não foi possível mover.') }
}
async function avancar(x: InicialSecretaria) { try { await props.ini.avancar(x.id) } catch (e: any) { aviso.value = props.ini.msg(e, 'Não foi possível avançar.') } }

// ── janelas: protocolar e pendências ──
const sub = ref<null | { tipo: 'protocolar' | 'pendencias'; x: InicialSecretaria; data: string; numero: string; erro: string }>(null)
function abrirSub(tipo: 'protocolar' | 'pendencias', x: InicialSecretaria) { sub.value = { tipo, x, data: x.protocolo_data || hoje.value, numero: x.processo_numero || '', erro: '' } }
watch(() => props.ini.pedido.value, p => { if (!p) return; const x = props.ini.achar(p.id); props.ini.pedido.value = null; if (x) abrirSub(p.tipo, x) }, { immediate: true })
async function confirmarSub() {
  const s = sub.value; if (!s) return
  try {
    if (s.tipo === 'pendencias') await props.ini.mover(s.x.id, { etapa: 'pronta', confirmar_pendencias: true })
    else {
      const e = erroInicial({ ...s.x, etapa: 'protocolada', protocolo_data: s.data, processo_numero: s.numero.trim() || null }); if (e) { s.erro = e; return }
      await props.ini.mover(s.x.id, { etapa: 'protocolada', protocolo_data: s.data, processo_numero: s.numero.trim() ? formataCNJ(s.numero) : null, confirmar_pendencias: pend(s.x) > 0 })
    }
    sub.value = null
  } catch (e: any) { s.erro = props.ini.msg(e, 'Não foi possível salvar.') }
}

// ── ficha ──
const draft = ref<(InicialEntrada & { id?: number | string }) | null>(null)
const novo = ref(false)
const novoDoc = ref('')
const vazio = (): InicialEntrada => ({ cliente: '', acao: '', area: '', parte_contraria: '', meta_protocolo: null, prazo_fatal: null, prazo_fatal_tipo: null, prioridade: 'normal', etapa: 'aguardando', checklist: [], obs: '', processo_numero: '', protocolo_data: null })
function abrirFicha(x: InicialSecretaria) { draft.value = { ...x, checklist: x.checklist.map(c => ({ ...c })), acao: x.acao ?? '', area: x.area ?? '', parte_contraria: x.parte_contraria ?? '', obs: x.obs ?? '', processo_numero: x.processo_numero ?? '' }; novo.value = false; erro.value = ''; novoDoc.value = '' }
function abrirNova() { draft.value = vazio(); novo.value = true; erro.value = ''; novoDoc.value = '' }
function fechar() { draft.value = null; sub.value = null; erro.value = '' }
const nulo = (v: unknown) => { const t = String(v ?? '').trim(); return t === '' ? null : t }
async function salvarFicha() {
  const d = draft.value; if (!d) return
  const corpo: InicialEntrada = { cliente: String(d.cliente ?? '').trim(), acao: nulo(d.acao), area: nulo(d.area), parte_contraria: nulo(d.parte_contraria), meta_protocolo: nulo(d.meta_protocolo),
    prazo_fatal: nulo(d.prazo_fatal), prazo_fatal_tipo: d.prazo_fatal ? (nulo(d.prazo_fatal_tipo) as any) : null, prioridade: d.prioridade, checklist: d.checklist, obs: nulo(d.obs) }
  if (!novo.value && d.etapa !== undefined) corpo.etapa = d.etapa
  if (d.etapa === 'protocolada' || d.protocolo_data) { corpo.protocolo_data = nulo(d.protocolo_data); corpo.processo_numero = nulo(d.processo_numero) ? formataCNJ(d.processo_numero) : null }
  const e = erroInicial({ ...corpo, etapa: d.etapa }); if (e) { erro.value = e; return }
  try {
    if (novo.value) await props.ini.criar({ ...corpo, etapa: d.etapa })
    else await props.ini.salvar(d.id!, corpo)
    fechar()
  } catch (er: any) { erro.value = props.ini.msg(er, 'Não foi possível salvar.') }
}
async function excluir() { const d = draft.value; if (!d?.id || !confirmarExcluir.value) { confirmarExcluir.value = true; return } await props.ini.excluir(d.id); confirmarExcluir.value = false; fechar() }
const confirmarExcluir = ref(false)
watch(draft, () => { confirmarExcluir.value = false })
const sugestoesAcao = computed(() => acoesDaArea(draft.value?.area).slice(0, 12))
const sugestoesDoc = computed(() => docsSugeridos(draft.value?.area, draft.value?.checklist ?? []))
function addDoc(t: string) { if (!draft.value) return; draft.value.checklist = adicionarDoc(draft.value.checklist ?? [], t); novoDoc.value = '' }
function tirarDoc(c: ItemChecklist) { if (draft.value) draft.value.checklist = (draft.value.checklist ?? []).filter(x => x.id !== c.id) }
</script>

<template>
  <div class="space-y-4">
    <p v-if="ini.erro.value" class="cartao text-sm text-danger" role="alert">{{ ini.erro.value }} <button type="button" class="link" @click="ini.carregar">Tentar de novo</button></p>
    <p v-if="aviso && !draft" class="cartao text-sm" role="status" data-testid="aviso-iniciais">{{ aviso }} <button type="button" class="link" @click="aviso = ''">fechar</button></p>

    <section class="cartao" id="sIniciaisTopo">
      <h2>Iniciais
        <button type="button" class="btn" data-testid="nova-inicial" @click="abrirNova">+ Nova inicial</button>
      </h2>
      <div class="kpis">
        <div class="kpi"><span class="v" data-testid="k-andamento">{{ resumo.andamento }}</span><span class="t">Em andamento</span></div>
        <div class="kpi" :class="{ ruim: resumo.atrasadas }"><span class="v" data-testid="k-atrasadas">{{ resumo.atrasadas }}</span><span class="t">Atrasadas</span></div>
        <div class="kpi" :class="{ atencao: resumo.vencendo }"><span class="v" data-testid="k-vencendo">{{ resumo.vencendo }}</span><span class="t">Vencendo em 7 dias</span></div>
      </div>
      <div class="flex gap-2 flex-wrap mt-3">
        <input v-model="busca" class="campo grow min-w-[200px]" style="width:auto" type="search" placeholder="Buscar por cliente, ação, parte contrária ou processo" aria-label="Buscar iniciais" data-testid="busca" />
        <select v-model="filtroArea" class="campo" style="width:auto" aria-label="Filtrar por área" data-testid="filtro-area"><option value="">Todas as áreas</option><option v-for="a in AREAS_INI" :key="a" :value="a">{{ a }}</option></select>
      </div>
    </section>

    <section class="cartao" id="sFaixa7">
      <h2>Prazos dos próximos 7 dias</h2>
      <p v-if="!faixa.length" class="msg" data-testid="faixa-vazia">Nenhuma meta de protocolo nem prazo fatal nos próximos 7 dias.</p>
      <ul v-else class="faixa" data-testid="faixa">
        <li v-for="p in faixa" :key="p.id + p.tipo" :class="{ atrasado: p.atrasado, fatal: p.tipo === 'fatal' }" :data-testid="`faixa-${p.id}-${p.tipo}`">
          <b>{{ fmtData(p.data) }}</b>
          <span class="pilula" :class="{ fatal: p.tipo === 'fatal' }">{{ p.tipo === 'fatal' ? 'Prazo fatal' : 'Meta' }}</span>
          <span class="grow">{{ p.cliente }}{{ p.acao ? ' — ' + p.acao : '' }}</span>
          <em>{{ p.atrasado ? `vencido há ${-p.dias} ${p.dias === -1 ? 'dia' : 'dias'}` : p.dias === 0 ? 'hoje' : p.dias === 1 ? 'amanhã' : `em ${p.dias} dias` }}</em>
        </li>
      </ul>
    </section>

    <section class="cartao" id="sQuadroIni">
      <h2>Quadro <span class="msg tit-msg">Arraste os cards, use "Avançar" ou "Mover para…".</span></h2>
      <p v-if="!lista.length && !ini.carregando.value" class="msg" data-testid="vazio-iniciais">Nenhuma inicial ainda. Clique em "+ Nova inicial" para começar.</p>
      <div class="quadro">
        <div v-for="[k, nome] in ETAPAS_INI" :key="k" class="col" :data-testid="`col-${k}`" @dragover.prevent="($event.currentTarget as HTMLElement).classList.add('alvo')" @dragleave="($event.currentTarget as HTMLElement).classList.remove('alvo')" @drop="aoSoltar($event, k)">
          <div class="ch"><b>{{ nome }}</b><span class="pilula">{{ coluna(k).length }}</span></div>
          <p v-if="!coluna(k).length" class="msg">Nenhuma inicial.</p>
          <div v-for="x in colunaVista(k)" :key="x.id" class="lcard" :class="[x.prioridade === 'alta' ? 'alta' : '', alerta(x, hoje)?.nivel === 'atrasada' ? 'atrasada' : '']" draggable="true" :data-testid="`ini-${x.id}`"
            @dragstart="$event.dataTransfer?.setData('text/plain', String(x.id))" @click="abrirFicha(x)">
            <div class="ln">{{ x.cliente }}</div>
            <div v-if="x.acao" class="lm">{{ x.acao }}</div>
            <div class="lm"><span v-if="x.area" class="pilula">{{ x.area }}</span> <span v-if="x.prioridade === 'alta'" class="pilula prio" :data-testid="`prio-${x.id}`">Prioridade alta</span></div>
            <div v-if="x.parte_contraria" class="lm">Contra: {{ x.parte_contraria }}</div>
            <div v-if="k !== 'protocolada' && textoAlerta(x)" class="alerta" :class="alerta(x, hoje)?.nivel" :data-testid="`alerta-${x.id}`">{{ textoAlerta(x) }}</div>
            <div v-if="k !== 'protocolada' && x.meta_protocolo && x.prazo_fatal" class="lm">Meta {{ fmtData(x.meta_protocolo) }} · fatal {{ fmtData(x.prazo_fatal) }}{{ x.prazo_fatal_tipo ? ' (' + TIPOS_FATAL.find(t => t[0] === x.prazo_fatal_tipo)?.[1].toLowerCase() + ')' : '' }}</div>
            <div v-if="pend(x)" class="docs" :data-testid="`docs-${x.id}`">{{ pend(x) }} {{ pend(x) === 1 ? 'documento pendente' : 'documentos pendentes' }}</div>
            <div v-if="k === 'protocolada'" class="lm" :data-testid="`prot-${x.id}`">Protocolada em {{ x.protocolo_data ? fmtData(x.protocolo_data, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—' }}<template v-if="x.processo_numero"> · {{ x.processo_numero }}</template><span v-else class="semnum"> · sem nº do processo</span></div>
            <div v-else class="lm">{{ diasNaEtapa(x) }} {{ diasNaEtapa(x) === 1 ? 'dia' : 'dias' }} nesta etapa</div>
            <div class="acoes" @click.stop>
              <button v-if="proximaEtapa(x.etapa)" type="button" class="btn sm" :data-testid="`avancar-${x.id}`" @click="avancar(x)">Avançar →</button>
              <select class="mover" aria-label="Mover para" @change="(e) => { const v = (e.target as HTMLSelectElement).value as EtapaInicial; (e.target as HTMLSelectElement).value = ''; if (v) mover(x.id, v) }">
                <option value="">Mover para…</option>
                <option v-for="[kk, nn] in ETAPAS_INI.filter(e => e[0] !== x.etapa)" :key="kk" :value="kk">{{ nn }}</option>
              </select>
            </div>
          </div>
          <button v-if="k === 'protocolada' && coluna(k).length > LIMITE_PROT" type="button" class="link" data-testid="ver-todas-prot" @click="mostrarTodasProt = !mostrarTodasProt">{{ mostrarTodasProt ? 'Mostrar só as 10 mais recentes' : `Ver todas (${coluna(k).length})` }}</button>
        </div>
      </div>
    </section>

    <!-- protocolar / pendências -->
    <div v-if="sub" class="modal"><div class="cartao" :data-testid="`sub-${sub.tipo}`" style="max-width:520px;width:100%">
      <h2>{{ sub.tipo === 'protocolar' ? 'Protocolar' : 'Documentos pendentes' }}</h2>
      <p class="msg"><b>{{ sub.x.cliente }}</b>{{ sub.x.acao ? ' — ' + sub.x.acao : '' }}</p>
      <template v-if="sub.tipo === 'protocolar'">
        <div class="fgrid">
          <label class="rot">Data do protocolo<input id="pData" v-model="sub.data" type="date" class="campo" /></label>
          <label class="rot">Número do processo (CNJ)<input id="pNumero" v-model="sub.numero" class="campo" placeholder="0000000-00.0000.0.00.0000" inputmode="numeric" /></label>
        </div>
        <p class="msg">O número pode ser informado depois, na ficha. Se digitar, os dígitos são conferidos.</p>
      </template>
      <p v-if="pend(sub.x)" class="aviso" data-testid="aviso-pendencias">Ainda há {{ pend(sub.x) }} {{ pend(sub.x) === 1 ? 'documento pendente' : 'documentos pendentes' }}: {{ checklistPendente(sub.x).map(c => c.texto).join(', ') }}.</p>
      <p v-if="sub.erro" class="msg err" role="alert">{{ sub.erro }}</p>
      <div class="flex gap-2 mt-3 flex-wrap">
        <button type="button" class="btn" data-testid="sub-confirmar" @click="confirmarSub">{{ sub.tipo === 'protocolar' ? 'Confirmar protocolo' : 'Avançar mesmo assim' }}</button>
        <button type="button" class="btn sec" @click="sub = null">Cancelar</button>
      </div>
    </div></div>

    <!-- ficha -->
    <div v-if="draft && !sub" class="modal"><div class="cartao ficha" data-testid="ficha">
      <h2>{{ novo ? 'Nova inicial' : 'Ficha da inicial' }}<span v-if="!novo && draft.etapa" class="pilula">{{ nomeEtapa(draft.etapa) }}</span></h2>
      <div class="fgrid">
        <label class="rot">Cliente<input id="iCliente" v-model="draft.cliente" class="campo" /></label>
        <label class="rot">Área<select id="iArea" v-model="draft.area" class="campo"><option value="">—</option><option v-for="a in AREAS_INI" :key="a" :value="a">{{ a }}</option></select></label>
        <label class="rot">Ação<input id="iAcao" v-model="draft.acao" class="campo" list="acoesIni" placeholder="Ex.: Divórcio litigioso" /></label>
        <label class="rot">Parte contrária<input id="iParte" v-model="draft.parte_contraria" class="campo" /></label>
        <label class="rot">Meta de protocolo<input id="iMeta" v-model="draft.meta_protocolo" type="date" class="campo" /></label>
        <label class="rot">Prazo fatal<input id="iFatal" v-model="draft.prazo_fatal" type="date" class="campo" /></label>
        <label class="rot">Tipo do prazo fatal<select id="iFatalTipo" v-model="draft.prazo_fatal_tipo" class="campo" :disabled="!draft.prazo_fatal"><option :value="null">—</option><option v-for="[v, n] in TIPOS_FATAL" :key="v" :value="v">{{ n }}</option></select></label>
        <label class="rot">Prioridade<select id="iPrio" v-model="draft.prioridade" class="campo"><option v-for="[v, n] in PRIORIDADES" :key="v" :value="v">{{ n }}</option></select></label>
        <label class="rot">Etapa<select id="iEtapa" v-model="draft.etapa" class="campo"><option v-for="[v, n] in ETAPAS_INI" :key="v" :value="v">{{ n }}</option></select></label>
      </div>
      <datalist id="acoesIni"><option v-for="a in sugestoesAcao" :key="a" :value="a" /></datalist>
      <div v-if="!draft.acao" class="chips-sug" data-testid="sug-acoes"><span class="msg">Sugestões:</span><button v-for="a in sugestoesAcao.slice(0, 6)" :key="a" type="button" class="chip" @click="draft.acao = a">{{ a }}</button></div>

      <div class="conf" data-testid="checklist">
        <strong>Documentos pendentes</strong>
        <p v-if="!(draft.checklist ?? []).length" class="msg">Nenhum documento no checklist.</p>
        <ul class="cl">
          <li v-for="c in draft.checklist" :key="c.id"><label><input v-model="c.ok" type="checkbox" :data-testid="`doc-${c.texto}`" /> <span :class="{ feito: c.ok }">{{ c.texto }}</span></label><button type="button" class="link" :aria-label="`Remover ${c.texto}`" @click="tirarDoc(c)">remover</button></li>
        </ul>
        <div class="flex gap-2"><input v-model="novoDoc" class="campo" placeholder="Adicionar documento" aria-label="Novo documento" data-testid="novo-doc" @keydown.enter.prevent="addDoc(novoDoc)" /><button type="button" class="btn sm sec" data-testid="add-doc" @click="addDoc(novoDoc)">Adicionar</button></div>
        <div v-if="sugestoesDoc.length" class="chips-sug" data-testid="sug-docs"><span class="msg">Sugestões{{ draft.area ? ' para ' + draft.area : '' }}:</span><button v-for="d in sugestoesDoc.slice(0, 10)" :key="d" type="button" class="chip" :data-testid="`sug-${d}`" @click="addDoc(d)">+ {{ d }}</button></div>
      </div>

      <div v-if="draft.etapa === 'protocolada'" class="conf" data-testid="quadro-protocolo">
        <strong>Protocolo</strong>
        <div class="fgrid">
          <label class="rot">Data do protocolo<input id="iProtData" v-model="draft.protocolo_data" type="date" class="campo" /></label>
          <label class="rot">Número do processo (CNJ)<input id="iProc" v-model="draft.processo_numero" class="campo" placeholder="0000000-00.0000.0.00.0000" inputmode="numeric" /></label>
        </div>
      </div>
      <label class="rot mt-3">Observações<textarea id="iObs" v-model="draft.obs" rows="3" class="campo" /></label>
      <p v-if="erro" class="msg err" role="alert" data-testid="erro-ficha">{{ erro }}</p>
      <div class="flex gap-2 mt-3 items-center flex-wrap">
        <button type="button" class="btn" data-testid="salvar-inicial" @click="salvarFicha">Salvar</button>
        <button type="button" class="btn sec" @click="fechar">Cancelar</button>
        <button v-if="!novo" type="button" class="link" data-testid="excluir-inicial" @click="excluir">{{ confirmarExcluir ? 'Confirmar exclusão' : 'excluir inicial' }}</button>
      </div>
    </div></div>
  </div>
</template>

<style scoped>
.cartao { background: #fff; border: 1px solid rgb(0 0 0 / .08); border-top: 3px solid var(--ouro, #c9a24a); border-radius: 10px; padding: 16px; min-width: 0; }
:global(.dark) .cartao { background: #1e1b17; border-color: rgb(255 255 255 / .1); border-top-color: var(--ouro, #d4af5a); }
h2 { font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ouro-esc, #8a6a26); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.btn { background: var(--ouro-esc, #8a6a26); color: #fff; border-radius: 8px; padding: 9px 14px; font-weight: 600; font-size: 13px; text-transform: none; letter-spacing: 0; }
:global(.dark) .btn { color: #17130b; background: var(--ouro, #d4af5a); }
.btn.sec { background: transparent; color: var(--ouro-esc, #8a6a26); border: 1px solid var(--ouro, #c9a24a); }
:global(.dark) .btn.sec { color: var(--ouro, #d4af5a); }
.btn.sm { padding: 5px 10px; font-size: 12px; } .btn:disabled { opacity: .5; }
.link { background: none; text-decoration: underline; font-size: 12px; color: var(--ouro-esc, #8a6a26); text-transform: none; letter-spacing: 0; font-weight: 500; }
.chip { border: 1px solid rgb(0 0 0 / .12); border-radius: 999px; padding: 4px 11px; font-size: 12px; font-weight: 500; text-transform: none; letter-spacing: 0; }
.chip[aria-pressed='true'] { border-color: var(--ouro, #c9a24a); background: var(--ouro-suave, #f4ecd9); font-weight: 700; }
:global(.dark) .chip { border-color: rgb(255 255 255 / .18); }
.campo { border: 1px solid rgb(0 0 0 / .14); border-radius: 8px; padding: 8px 10px; background: transparent; min-width: 0; max-width: 100%; font-size: 14px; width: 100%; }
:global(.dark) .campo { border-color: rgb(255 255 255 / .18); }
.rot { display: grid; gap: 3px; font-size: 12px; color: #857866; font-weight: 500; text-transform: none; letter-spacing: 0; }
.msg { font-size: 13px; color: #857866; padding: 4px 0; } .msg.err { color: #b3261e; } .tit-msg { padding: 0; text-transform: none; letter-spacing: 0; font-weight: 500; }
.lgrid { display: grid; grid-template-columns: minmax(150px, 220px) 1fr; gap: 16px; align-items: center; }
@media (max-width: 560px) { .lgrid { grid-template-columns: 1fr; } }
.big2 { display: grid; gap: 2px; border-right: 1px solid rgb(0 0 0 / .1); padding-right: 12px; }
@media (max-width: 560px) { .big2 { border-right: 0; border-bottom: 1px solid rgb(0 0 0 / .1); padding: 0 0 10px; } }
.big2 .n { font-size: 54px; font-weight: 700; line-height: 1; color: var(--ouro-esc, #8a6a26); } .big2 .t { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: #857866; font-weight: 600; } .big2 .sub { font-size: 13px; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; margin-top: 10px; }
.kpi { border: 1px solid rgb(0 0 0 / .1); border-radius: 10px; padding: 10px; display: grid; gap: 2px; } :global(.dark) .kpi { border-color: rgb(255 255 255 / .12); }
.kpi .v { font-size: 22px; font-weight: 700; } .kpi .t { font-size: 11px; color: #857866; text-transform: uppercase; letter-spacing: .06em; font-weight: 600; }
.orig { margin-bottom: 10px; } .ot { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; }
.barra { height: 10px; border-radius: 5px; background: rgb(0 0 0 / .08); overflow: hidden; margin: 4px 0; } :global(.dark) .barra { background: rgb(255 255 255 / .12); }
.barra span { display: block; height: 100%; background: var(--ouro, #c9a24a); border-radius: 5px; } .oc { font-size: 11px; color: #857866; }
.eixo { stroke: rgb(0 0 0 / .15); stroke-width: 1; } .col-barra { fill: var(--ouro, #c9a24a); } .txt-barra { fill: currentColor; } .txt-eixo { fill: #857866; }
.quadro { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(230px, 1fr); gap: 10px; overflow-x: auto; padding-bottom: 8px; }
.col { border: 1px solid rgb(0 0 0 / .1); border-radius: 10px; padding: 8px; min-height: 160px; min-width: 0; } :global(.dark) .col { border-color: rgb(255 255 255 / .12); }
.col.alvo { outline: 2px dashed var(--ouro, #c9a24a); }
.ch { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-size: 13px; } .ch .link { margin-left: auto; }
.lcard { background: #fff; border: 1px solid rgb(0 0 0 / .1); border-radius: 8px; padding: 9px; margin-bottom: 8px; cursor: grab; display: grid; gap: 4px; min-width: 0; }
:global(.dark) .lcard { background: #262219; border-color: rgb(255 255 255 / .12); } .lcard.minha { border-left: 4px solid var(--ouro, #c9a24a); }
.ln { font-weight: 700; overflow-wrap: anywhere; } .lm { font-size: 12px; color: #857866; overflow-wrap: anywhere; } .lm a { text-decoration: underline; color: var(--ouro-esc, #8a6a26); }
.pilula { display: inline-block; border-radius: 999px; padding: 2px 9px; font-size: 11px; font-weight: 600; background: var(--ouro-suave, #f4ecd9); color: var(--ouro-esc, #8a6a26); }
.sit { display: inline-block; border-radius: 999px; padding: 2px 9px; font-size: 11px; font-weight: 600; background: rgb(0 0 0 / .08); }
.sit.minha { background: var(--ouro, #c9a24a); color: #fff; } .sit.sumiu { background: #fdecea; color: #b3261e; }
:global(.dark) .sit { background: rgb(255 255 255 / .12); } :global(.dark) .sit.minha { color: #17130b; } :global(.dark) .sit.sumiu { background: #3a1c1a; color: #ff8a80; }
.cons { display: inline-block; border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 600; }
.cons.verde { background: rgb(47 125 79 / .18); color: #2f7d4f; } .cons.amarelo { background: rgb(214 158 0 / .2); color: #a15c00; } .cons.vermelho { background: #fdecea; color: #b3261e; } .cons.sem { background: rgb(0 0 0 / .08); color: #857866; }
:global(.dark) .cons.vermelho { background: #3a1c1a; color: #ff8a80; } :global(.dark) .cons.amarelo { color: #f2b35a; } :global(.dark) .cons.verde { color: #6fcf97; }
.mover { font-size: 11px; padding: 3px 6px; border: 1px solid rgb(0 0 0 / .14); border-radius: 6px; background: transparent; }
.modal { position: fixed; inset: 0; background: rgb(0 0 0 / .45); display: grid; place-items: center; padding: 16px; z-index: 200; overflow-y: auto; }
.ficha { max-width: 760px; width: 100%; max-height: 92vh; overflow-y: auto; }
.fgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
.conf { border: 1px dashed var(--ouro, #c9a24a); border-radius: 10px; padding: 12px; margin-top: 12px; background: var(--ouro-suave, #f4ecd9); display: grid; gap: 10px; } :global(.dark) .conf { background: #2c2618; }
.aviso { border: 1px solid #a15c00; border-radius: 8px; padding: 9px 11px; font-size: 12px; margin-bottom: 10px; }
a { color: var(--ouro-esc, #8a6a26); text-decoration: underline; }

.kpi.ruim .v { color: #b3261e; } .kpi.atencao .v { color: #a15c00; }
.faixa { display: grid; gap: 6px; list-style: none; padding: 0; margin: 0; }
.faixa li { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; border: 1px solid rgb(0 0 0 / .1); border-radius: 8px; padding: 7px 10px; font-size: 13px; } :global(.dark) .faixa li { border-color: rgb(255 255 255 / .12); }
.faixa li.atrasado { border-color: #b3261e; background: rgb(179 38 30 / .07); } .faixa li em { font-size: 12px; color: #857866; font-style: normal; }
.pilula.fatal { background: #fdecea; color: #b3261e; } :global(.dark) .pilula.fatal { background: #3a1c1a; color: #ff8a80; }
.pilula.prio { background: #b3261e; color: #fff; }
.lcard.alta { border-left: 4px solid #b3261e; } .lcard.atrasada { background: rgb(179 38 30 / .06); }
.alerta { font-size: 12px; font-weight: 600; } .alerta.atrasada { color: #b3261e; } .alerta.vencendo { color: #a15c00; } .alerta.ok { color: #857866; font-weight: 500; }
.docs { font-size: 12px; font-weight: 600; color: #a15c00; } .semnum { color: #a15c00; }
.acoes { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 4px; }
.chips-sug { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 8px; }
.cl { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; } .cl li { display: flex; justify-content: space-between; gap: 8px; align-items: center; } .cl .feito { text-decoration: line-through; color: #857866; }
.kpi { border-radius: 10px; }
</style>
