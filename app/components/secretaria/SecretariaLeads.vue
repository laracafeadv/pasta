<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { SecretariaLeads } from '~/composables/useSecretariaLeads'
import type { SecretariaGoogle } from '~/composables/useSecretariaGoogle'
import type { EtapaLead, LeadEntrada, LeadSecretaria } from '~~/shared/data/secretaria'
import { ETAPAS, ORIGENS, estatisticas, serieLeads, situacaoConversa, type Periodo } from '~~/shared/utils/leadsSecretaria'

// Leads: quadro por etapa com cards arrastáveis, ficha completa, números do topo, "de onde vêm", gráfico por semana/mês,
// importação da conversa do WhatsApp e conferência/marcação da consulta no Google Agenda.
const props = defineProps<{ l: SecretariaLeads; g: SecretariaGoogle }>()
const hojeISO = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bahia' }).format(new Date())
const hoje = computed(() => hojeISO())
const fmtData = (iso: string, o: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' }) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', ...o }).format(new Date(Date.parse(iso + 'T00:00:00Z')))
const brl = (n: number | null) => n == null ? '' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
const pct = (n: number) => String(n).replace('.', ',') + '%'

const periodo = ref<Periodo>('semana')
const modoSerie = ref<'semana' | 'mes'>('semana')
const est = computed(() => estatisticas(props.l.leads.value, periodo.value, hoje.value))
const dif = computed(() => est.value.nestaSemana - est.value.semanaPassada)
const serie = computed(() => serieLeads(props.l.leads.value, modoSerie.value, hoje.value, 12))
const maxSerie = computed(() => Math.max(1, ...serie.value.map(s => s.n)))
const W = 480, H = 170, PB = 28, PT = 16
const barra = (i: number, n: number) => { const bw = W / serie.value.length, bh = n ? Math.max(3, (n / maxSerie.value) * (H - PB - PT - 14)) : 0; return { x: i * bw + bw * 0.18, w: bw * 0.64, y: H - PB - bh, h: bh } }

onMounted(async () => { await props.l.carregar(); props.l.carregarConsultas(true) })
const coluna = (k: EtapaLead) => props.l.leads.value.filter(x => x.etapa === k).sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
const dias = (x: LeadSecretaria) => Math.max(0, Math.round((Date.parse(hoje.value + 'T12:00:00Z') - Date.parse((x.data_contato || hoje.value) + 'T12:00:00Z')) / 864e5))
const sit = (x: LeadSecretaria) => situacaoConversa(x, Date.now())
const SIT_TXT: Record<string, string> = { minha: 'Aguardando minha resposta', cliente: 'Aguardando o cliente', sumiu: 'Sumiu (sem resposta há mais de 3 dias)' }

// ── arrastar e mover ──
const arrastando = ref(false)
function aoSoltar(ev: DragEvent, k: EtapaLead) {
  ev.preventDefault(); (ev.currentTarget as HTMLElement).classList.remove('alvo')
  const id = Number(ev.dataTransfer?.getData('text/plain')); if (id) mover(id, k)
}
async function mover(id: number, etapa: EtapaLead) {
  const x = props.l.leads.value.find(v => v.id === id); if (!x || x.etapa === etapa) return
  if (etapa === 'fechou' || etapa === 'nao_fechou') return abrirSub(etapa === 'fechou' ? 'fechou' : 'motivo', x)
  try { await props.l.mover(id, { etapa }); if (etapa === 'consulta') props.l.carregarConsultas(true) } catch (e: any) { aviso.value = props.l.msg(e, 'Não foi possível mover.') }
}

// ── ficha ──
const aviso = ref('')
const erro = ref('')
const draft = ref<(LeadEntrada & { id?: number }) | null>(null)
const novo = ref(false)
const sub = ref<null | { tipo: 'fechou' | 'motivo'; valor: string; exito: string; motivo: string }>(null)
const cons = reactive({ dia: '', hora: '', duracao: 60, modo: 'presencial', salvando: false })
const vazio = (): LeadEntrada => ({ nome: '', whatsapp: '', origem: 'WhatsApp', origem_detalhe: '', area: '', cidade: 'Salvador', data_contato: hojeISO(), etapa: 'novo', conversa: 'minha', caso: '', honorarios_prop: null, valor_fechado: null, exito: null, motivo_nao_fechou: '', proximo_passo: '', obs: '' })
function abrirFicha(x: LeadSecretaria) { draft.value = { ...x }; novo.value = false; sub.value = null; erro.value = ''; aviso.value = ''; Object.assign(cons, { dia: x.consulta_data ?? '', hora: (x.consulta_hora ?? '').slice(0, 5), duracao: 60, modo: 'presencial', salvando: false }) }
function abrirNovo() { draft.value = vazio(); novo.value = true; sub.value = null; erro.value = ''; aviso.value = ''; Object.assign(cons, { dia: '', hora: '', duracao: 60, modo: 'presencial', salvando: false }) }
function fechar() { draft.value = null; sub.value = null; imp.aberto = false; erro.value = '' }
function abrirSub(tipo: 'fechou' | 'motivo', x: LeadEntrada & { id?: number }) { draft.value = { ...x }; novo.value = false; sub.value = { tipo, valor: String(x.valor_fechado ?? x.honorarios_prop ?? '').replace('.', ','), exito: String(x.exito ?? '').replace('.', ','), motivo: x.motivo_nao_fechou ?? '' }; erro.value = '' }
const num = (v: unknown) => { const t = String(v ?? '').trim(); return t === '' ? null : t.replace(/\./g, '').replace(',', '.') }
async function gravar(extra: LeadEntrada = {}): Promise<LeadSecretaria | null> {
  const d = { ...draft.value, ...extra } as any
  if (!String(d.nome ?? '').trim()) { erro.value = 'Informe o nome.'; return null }
  try {
    const corpo = { ...d, honorarios_prop: d.honorarios_prop, valor_fechado: d.valor_fechado, exito: d.exito }
    delete corpo.id; delete corpo.created_at; delete corpo.updated_at; delete corpo.user_id
    const r = novo.value ? await props.l.criar(corpo) : await props.l.salvar(d.id, corpo)
    draft.value = { ...r }; novo.value = false; erro.value = ''; return r
  } catch (e: any) { erro.value = props.l.msg(e, 'Não foi possível salvar.'); return null }
}
async function salvarEFechar() { if (await gravar()) { fechar(); props.l.carregarConsultas(true) } }
async function confirmarSub() {
  const s = sub.value!, d = draft.value!
  try {
    if (s.tipo === 'fechou') { if (novo.value && !(await gravar())) return; const id = (draft.value as any).id; await props.l.mover(id, { etapa: 'fechou', valor_fechado: num(s.valor), exito: num(s.exito) }) }
    else { if (!s.motivo.trim()) { erro.value = 'Conte o motivo: ele alimenta o que você aprende com os leads.'; return } if (novo.value && !(await gravar())) return; await props.l.mover((draft.value as any).id, { etapa: 'nao_fechou', motivo: s.motivo.trim() }) }
    fechar()
  } catch (e: any) { erro.value = props.l.msg(e, 'Não foi possível salvar.') }
  void d
}
async function rapida(quem: 'respondi' | 'cliente') {
  const r = await gravar(); if (!r) return
  try { const x = await props.l.conversa(r.id, quem); draft.value = { ...x } } catch (e: any) { erro.value = props.l.msg(e, 'Não foi possível registrar.') }
}
async function excluir() { const d = draft.value as any; if (!d?.id) return; await props.l.excluir(d.id); fechar() }
async function marcar() {
  if (!cons.dia || !cons.hora) { erro.value = 'Informe o dia e a hora da consulta.'; return }
  const r = await gravar(); if (!r) return
  cons.salvando = true; erro.value = ''
  try { const x = await props.l.marcarConsulta(r.id, { dia: cons.dia, hora: cons.hora, duracao: Number(cons.duracao), modo: cons.modo }); draft.value = { ...x.lead } }
  catch (e: any) { erro.value = 'A consulta NÃO foi marcada no Google Agenda. ' + props.l.msg(e, '') } finally { cons.salvando = false }
}

// ── importar conversa ──
const imp = reactive({ aberto: false, carregando: false, erro: '' })
async function textoDoArquivo(f: File): Promise<string> {
  if (/\.zip$/i.test(f.name)) {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(f)
    const txts = Object.values(zip.files).filter(z => !z.dir && /\.txt$/i.test(z.name))
    if (!txts.length) throw new Error('Não achei o arquivo .txt da conversa dentro do .zip.')
    return await (txts.find(z => /_chat\.txt$|conversa/i.test(z.name)) ?? txts[0]!).async('string')
  }
  return await f.text()
}
async function importar(ev: Event) {
  const f = (ev.target as HTMLInputElement).files?.[0]; if (!f) return
  imp.carregando = true; imp.erro = ''
  try {
    const r = await props.l.importar(await textoDoArquivo(f), f.name)
    imp.aberto = false; draft.value = { ...vazio(), ...r.lead }; novo.value = true; sub.value = null; erro.value = ''
    aviso.value = `${r.aviso ? r.aviso + ' ' : ''}Conversa lida (${r.mensagens} mensagens). Confira os campos e salve.`
    Object.assign(cons, { dia: '', hora: '', duracao: 60, modo: 'presencial', salvando: false })
  } catch (e: any) { imp.erro = e?.data?.message || e?.message || 'Não consegui ler o arquivo.' } finally { imp.carregando = false; (ev.target as HTMLInputElement).value = '' }
}
const conectado = computed(() => !!props.g.status.value?.conectado)
const MOTIVOS = ['Preço / honorários', 'Escolheu outro advogado', 'Sem retorno do cliente', 'Resolveu sozinho / acordo', 'Não tem caso', 'Fora da minha área']
const AREAS = ['Divórcio', 'União estável', 'Guarda', 'Pensão alimentícia', 'Inventário', 'Testamento', 'Planejamento sucessório', 'Partilha de bens']
</script>

<template>
  <div class="space-y-4">
    <p v-if="l.erro.value" class="cartao text-sm text-danger" role="alert">{{ l.erro.value }} <button type="button" class="link" @click="l.carregar">Tentar de novo</button></p>
    <p v-if="aviso && !draft" class="cartao text-sm" role="status">{{ aviso }}</p>

    <section class="cartao" id="sLeadsTopo">
      <h2>Leads
        <span class="flex gap-2 flex-wrap">
          <button type="button" class="btn" data-testid="novo-lead" @click="abrirNovo">+ Novo lead</button>
          <button type="button" class="btn sec" data-testid="importar" @click="imp.aberto = true; imp.erro = ''">Importar conversa do WhatsApp</button>
        </span>
      </h2>
      <div class="lgrid">
        <div class="big2"><span class="n" data-testid="nesta-semana">{{ est.nestaSemana }}</span><span class="t">leads nesta semana</span>
          <span class="sub">semana passada: <b data-testid="semana-passada">{{ est.semanaPassada }}</b>{{ dif ? (dif > 0 ? ` (+${dif})` : ` (${dif})`) : '' }}</span></div>
        <div>
          <div class="flex gap-1.5 flex-wrap" role="group" aria-label="Período">
            <button v-for="[k, n] in ([['semana', 'Semana'], ['30d', '30 dias'], ['tudo', 'Tudo']] as [Periodo, string][])" :key="k" type="button" class="chip" :aria-pressed="periodo === k" :data-testid="`per-${k}`" @click="periodo = k">{{ n }}</button>
          </div>
          <div class="kpis">
            <div class="kpi"><span class="v" data-testid="k-total">{{ est.total }}</span><span class="t">Total</span></div>
            <div class="kpi"><span class="v" data-testid="k-and">{{ est.andamento }}</span><span class="t">Em andamento</span></div>
            <div class="kpi"><span class="v" data-testid="k-fech">{{ est.fechados }}</span><span class="t">Fechados</span></div>
            <div class="kpi"><span class="v" data-testid="k-conv">{{ pct(est.conversao) }}</span><span class="t">Conversão</span></div>
          </div>
          <p class="msg">Conversão = fechados ÷ leads do período (pela data do contato).</p>
        </div>
      </div>
    </section>

    <div class="grid2">
      <section class="cartao" id="sOrigens">
        <h2>De onde vêm</h2>
        <template v-if="est.total">
          <div v-for="o in est.origens" :key="o.origem" class="orig" :data-testid="`orig-${o.origem}`">
            <div class="ot"><b>{{ o.origem }}</b><span>{{ o.total }} · {{ pct(o.pct) }}</span></div>
            <div class="barra"><span :style="{ width: o.pct + '%' }" /></div>
            <div class="oc">Conversão: {{ o.total ? `${pct(o.conversao)} (${o.fechados} de ${o.total})` : '—' }}</div>
          </div>
        </template>
        <p v-else class="msg">Sem leads neste período.</p>
      </section>
      <section class="cartao" id="sSerie">
        <h2>Leads por {{ modoSerie === 'mes' ? 'mês' : 'semana' }}
          <span class="flex gap-1.5"><button v-for="[k, n] in ([['semana', 'Semana'], ['mes', 'Mês']] as ['semana' | 'mes', string][])" :key="k" type="button" class="chip" :aria-pressed="modoSerie === k" :data-testid="`serie-${k}`" @click="modoSerie = k">{{ n }}</button></span>
        </h2>
        <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Leads por período" style="width:100%;height:auto" data-testid="grafico">
          <line :x1="0" :y1="H - PB" :x2="W" :y2="H - PB" class="eixo" />
          <template v-for="(s, i) in serie" :key="s.chave">
            <rect v-if="s.n" :x="barra(i, s.n).x" :y="barra(i, s.n).y" :width="barra(i, s.n).w" :height="barra(i, s.n).h" rx="3" class="col-barra" />
            <text v-if="s.n" :x="barra(i, s.n).x + barra(i, s.n).w / 2" :y="barra(i, s.n).y - 4" text-anchor="middle" font-size="11" font-weight="600" class="txt-barra">{{ s.n }}</text>
            <text :x="barra(i, 0).x + barra(i, 0).w / 2" :y="H - 10" text-anchor="middle" font-size="9.5" class="txt-eixo">{{ s.rotulo }}</text>
          </template>
        </svg>
      </section>
    </div>

    <section class="cartao" id="sQuadro">
      <h2>Quadro <span class="msg tit-msg">Arraste os cards entre as colunas (ou use "Mover para" no card).</span></h2>
      <div class="quadro">
        <div v-for="[k, nome] in ETAPAS" :key="k" class="col" :data-testid="`col-${k}`" @dragover.prevent="($event.currentTarget as HTMLElement).classList.add('alvo')" @dragleave="($event.currentTarget as HTMLElement).classList.remove('alvo')" @drop="aoSoltar($event, k)">
          <div class="ch"><b>{{ nome }}</b><span class="pilula">{{ coluna(k).length }}</span>
            <button v-if="k === 'consulta' && conectado" type="button" class="link" title="Conferir de novo no Google Agenda" @click="l.carregarConsultas(true)">conferir agenda</button></div>
          <p v-if="!coluna(k).length" class="msg">Nenhum lead.</p>
          <div v-for="x in coluna(k)" :key="x.id" class="lcard" :class="{ minha: sit(x) === 'minha' }" draggable="true" :data-testid="`lead-${x.id}`"
            @dragstart="arrastando = true; $event.dataTransfer?.setData('text/plain', String(x.id))" @dragend="arrastando = false" @click="abrirFicha(x)">
            <div class="ln">{{ x.nome }}</div>
            <div class="lm"><span class="pilula">{{ x.origem }}</span> {{ x.area }}{{ x.cidade ? ' · ' + x.cidade : '' }}</div>
            <div v-if="x.whatsapp" class="lm"><a :href="`https://wa.me/${x.whatsapp}`" target="_blank" rel="noopener" @click.stop>{{ x.whatsapp }}</a></div>
            <div v-if="sit(x)"><span class="sit" :class="sit(x)" :data-testid="`sit-${x.id}`">{{ SIT_TXT[sit(x)!] }}</span></div>
            <div v-if="k === 'consulta'">
              <span v-if="!conectado" class="cons sem">Conecte o Google para conferir</span>
              <span v-else-if="!l.consultas.value[x.id] || l.consultas.value[x.id]!.carregando" class="cons sem" :data-testid="`cons-${x.id}`">Conferindo agenda…</span>
              <span v-else-if="l.consultas.value[x.id]!.st === 'verde'" class="cons verde" :data-testid="`cons-${x.id}`">Consulta marcada · {{ fmtData(l.consultas.value[x.id]!.dia!) }} {{ l.consultas.value[x.id]!.hora }}</span>
              <span v-else-if="l.consultas.value[x.id]!.st === 'amarelo'" class="cons amarelo" :data-testid="`cons-${x.id}`">Consulta já passou · {{ fmtData(l.consultas.value[x.id]!.dia!) }}</span>
              <span v-else-if="l.consultas.value[x.id]!.st === 'vermelho'" class="cons vermelho" :data-testid="`cons-${x.id}`">Sem consulta na agenda</span>
              <span v-else class="cons sem" :title="l.consultas.value[x.id]!.msg">Não consegui conferir</span>
            </div>
            <div v-if="k === 'fechou' && x.valor_fechado != null" class="lm">{{ brl(x.valor_fechado) }}</div>
            <div v-if="k === 'nao_fechou' && x.motivo_nao_fechou" class="lm">Motivo: {{ x.motivo_nao_fechou }}</div>
            <div class="lm">{{ dias(x) }} {{ dias(x) === 1 ? 'dia' : 'dias' }} desde o contato</div>
            <select class="mover" aria-label="Mover para" @click.stop @change="(e) => { const v = (e.target as HTMLSelectElement).value as EtapaLead; (e.target as HTMLSelectElement).value = ''; if (v) mover(x.id, v) }">
              <option value="">Mover para…</option>
              <option v-for="[kk, nn] in ETAPAS.filter(e => e[0] !== x.etapa)" :key="kk" :value="kk">{{ nn }}</option>
            </select>
          </div>
        </div>
      </div>
    </section>

    <!-- importar -->
    <div v-if="imp.aberto" class="modal" @click.self="fechar"><div class="cartao" data-testid="modal-importar" style="max-width:520px;width:100%">
      <h2>Importar conversa do WhatsApp</h2>
      <p class="msg">No WhatsApp: abra a conversa → ⋮ → Mais → Exportar conversa → Sem mídia. Envie aqui o arquivo .zip ou .txt. A IA lê a conversa e preenche a ficha; você só confere e salva. O texto da conversa é enviado ao servidor do CRM e à IA (Claude).</p>
      <input id="impArquivo" data-testid="impArquivo" type="file" accept=".zip,.txt,text/plain,application/zip" :disabled="imp.carregando" @change="importar" />
      <p v-if="imp.carregando" class="msg">Lendo a conversa…</p><p v-if="imp.erro" class="msg err" role="alert">{{ imp.erro }}</p>
      <div class="mt-3"><button type="button" class="btn sec" @click="fechar">Fechar</button></div>
    </div></div>

    <!-- fechou / não fechou -->
    <div v-if="draft && sub" class="modal"><div class="cartao" :data-testid="`sub-${sub.tipo}`" style="max-width:520px;width:100%">
      <h2>{{ sub.tipo === 'fechou' ? 'Fechou contrato' : 'Não fechou' }}</h2><p class="msg">{{ draft.nome }}</p>
      <div v-if="sub.tipo === 'fechou'" class="flex gap-2 flex-wrap">
        <label class="rot">Valor fechado (R$)<input id="sValor" v-model="sub.valor" class="campo" inputmode="decimal" /></label>
        <label class="rot">% de êxito<input id="sExito" v-model="sub.exito" class="campo" inputmode="decimal" /></label>
      </div>
      <label v-else class="rot">Motivo de não ter fechado (obrigatório)<input id="sMotivo" v-model="sub.motivo" class="campo" list="motivos" /><datalist id="motivos"><option v-for="m in MOTIVOS" :key="m" :value="m" /></datalist></label>
      <p v-if="erro" class="msg err" role="alert">{{ erro }}</p>
      <div class="flex gap-2 mt-3"><button type="button" class="btn" data-testid="sub-confirmar" @click="confirmarSub">Confirmar</button><button type="button" class="btn sec" @click="fechar">Cancelar</button></div>
    </div></div>

    <!-- ficha -->
    <div v-if="draft && !sub" class="modal"><div class="cartao ficha" data-testid="ficha">
      <h2>{{ novo ? 'Novo lead' : 'Ficha do lead' }}
        <span v-if="!novo && (draft as any).etapa && situacaoConversa({ etapa: draft.etapa!, conversa: draft.conversa!, conversa_desde: (draft as any).conversa_desde }, Date.now())" class="sit" :class="situacaoConversa({ etapa: draft.etapa!, conversa: draft.conversa!, conversa_desde: (draft as any).conversa_desde }, Date.now())!">{{ SIT_TXT[situacaoConversa({ etapa: draft.etapa!, conversa: draft.conversa!, conversa_desde: (draft as any).conversa_desde }, Date.now())!] }}</span></h2>
      <p v-if="aviso" class="aviso" data-testid="aviso-importacao">{{ aviso }}</p>
      <div class="flex gap-2 flex-wrap mb-3">
        <button type="button" class="btn sm" data-testid="q-fechou" @click="abrirSub('fechou', draft!)">Fechou contrato</button>
        <button type="button" class="btn sm sec" data-testid="q-nao" @click="abrirSub('motivo', draft!)">Não fechou</button>
        <button type="button" class="btn sm sec" data-testid="q-respondi" @click="rapida('respondi')">Respondi agora</button>
        <button type="button" class="btn sm sec" data-testid="q-cliente" @click="rapida('cliente')">Cliente me mandou mensagem</button>
      </div>
      <div class="fgrid">
        <label class="rot">Nome<input id="lNome" v-model="draft.nome" class="campo" /></label>
        <label class="rot">WhatsApp<input id="lFone" v-model="draft.whatsapp" class="campo" type="tel" placeholder="71 99999-0000" /></label>
        <label class="rot">Origem<select id="lOrigem" v-model="draft.origem" class="campo"><option v-for="o in ORIGENS" :key="o" :value="o">{{ o }}</option></select></label>
        <label class="rot">Detalhe da origem<input id="lOrigemDet" v-model="draft.origem_detalhe" class="campo" placeholder="@perfil, quem indicou, palavra buscada…" /></label>
        <label class="rot">Área<input id="lArea" v-model="draft.area" class="campo" list="areas" /></label>
        <label class="rot">Cidade<input id="lCidade" v-model="draft.cidade" class="campo" /></label>
        <label class="rot">Data do contato<input id="lData" v-model="draft.data_contato" class="campo" type="date" /></label>
        <label class="rot">Etapa<select id="lEtapa" v-model="draft.etapa" class="campo"><option v-for="[k, n] in ETAPAS" :key="k" :value="k">{{ n }}</option></select></label>
        <label class="rot">Situação da conversa<select id="lConversa" v-model="draft.conversa" class="campo"><option value="minha">Aguardando minha resposta</option><option value="cliente">Aguardando o cliente</option></select></label>
        <label class="rot">Honorários propostos (R$)<input id="lProp" :value="draft.honorarios_prop ?? ''" class="campo" inputmode="decimal" @input="draft!.honorarios_prop = num(($event.target as HTMLInputElement).value) as any" /></label>
        <label class="rot">Valor fechado (R$)<input id="lFech" :value="draft.valor_fechado ?? ''" class="campo" inputmode="decimal" @input="draft!.valor_fechado = num(($event.target as HTMLInputElement).value) as any" /></label>
        <label class="rot">% de êxito<input id="lExito" :value="draft.exito ?? ''" class="campo" inputmode="decimal" @input="draft!.exito = num(($event.target as HTMLInputElement).value) as any" /></label>
        <label class="rot">Motivo de não fechar<input id="lMotivo" v-model="draft.motivo_nao_fechou" class="campo" list="motivos" /></label>
      </div>
      <datalist id="areas"><option v-for="a in AREAS" :key="a" :value="a" /></datalist><datalist id="motivos"><option v-for="m in MOTIVOS" :key="m" :value="m" /></datalist>
      <label class="rot mt-3">Caso<textarea id="lCaso" v-model="draft.caso" class="campo" rows="3" /></label>
      <label class="rot mt-3">Próximo passo<input id="lProx" v-model="draft.proximo_passo" class="campo" /></label>
      <label class="rot mt-3">Observações<textarea id="lObs" v-model="draft.obs" class="campo" rows="3" /></label>
      <div class="conf" data-testid="quadro-consulta"><strong>Consulta</strong>
        <p class="msg">{{ draft.consulta_data ? `Marcada para ${fmtData(draft.consulta_data, { day: '2-digit', month: '2-digit', year: 'numeric' })}${draft.consulta_hora ? ' às ' + String(draft.consulta_hora).slice(0, 5) : ''}.` : 'Ainda sem consulta marcada por aqui.' }}
          <a v-if="draft.consulta_link" :href="draft.consulta_link" target="_blank" rel="noopener">abrir no Google Agenda</a></p>
        <div v-if="conectado" class="flex gap-2 flex-wrap items-end">
          <label class="rot">Dia<input id="cDia" v-model="cons.dia" class="campo" type="date" /></label>
          <label class="rot">Hora<input id="cHora" v-model="cons.hora" class="campo" type="time" /></label>
          <label class="rot">Duração<select id="cDur" v-model.number="cons.duracao" class="campo"><option v-for="n in [30, 45, 60, 90, 120]" :key="n" :value="n">{{ n }} min</option></select></label>
          <label class="rot">Modalidade<select id="cModo" v-model="cons.modo" class="campo"><option value="presencial">Presencial</option><option value="online">On-line (Google Meet)</option></select></label>
          <button type="button" class="btn" data-testid="marcar-consulta" :disabled="cons.salvando" @click="marcar">{{ cons.salvando ? 'Marcando…' : 'Marcar na agenda' }}</button>
        </div>
        <p v-else class="msg">Para marcar a consulta direto na agenda, conecte o Google na aba Intimações.</p>
        <p class="msg">Cria o evento "CONSULTA — nome" com lembretes 1 dia e 1 hora antes.</p>
      </div>
      <p v-if="erro" class="msg err" role="alert" data-testid="erro-ficha">{{ erro }}</p>
      <div class="flex gap-2 flex-wrap items-center mt-3"><button type="button" class="btn" data-testid="salvar-lead" @click="salvarEFechar">Salvar</button><button type="button" class="btn sec" @click="fechar">Fechar</button>
        <button v-if="!novo" type="button" class="link" data-testid="excluir-lead" @click="excluir">excluir lead</button></div>
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
</style>
