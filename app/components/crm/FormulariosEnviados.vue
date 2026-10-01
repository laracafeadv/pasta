<template>
  <section class="space-y-3" data-testid="formularios-enviados">
    <div class="flex items-center justify-between gap-2">
      <h4 class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Formulários</h4>
      <Button size="sm" variant="outline" icon="ph:paper-plane-tilt-bold" data-testid="enviar-formulario-lista" @click="emit('enviar')">Enviar formulário</Button>
    </div>
    <p v-if="!envios.length" class="text-sm text-gray-400">{{ carregando ? 'Carregando…' : 'Nenhum formulário enviado.' }}</p>
    <ul v-else class="divide-y divide-gray-50 dark:divide-zinc-800/60 text-sm">
      <li v-for="e in envios" :key="e.id" class="py-2 flex flex-wrap items-center gap-2" data-testid="linha-envio">
        <div class="min-w-0 flex-1">
          <p class="font-semibold truncate">{{ e.formulario_nome || 'Formulário' }}<span v-if="e.versao" class="font-normal text-gray-400"> · v{{ e.versao }}</span></p>
          <p class="text-[11px] text-gray-500">Gerado {{ dataCurta(e.created_at) }}<template v-if="e.caso_titulo"> · {{ e.caso_titulo }}</template><template v-if="e.respondido_em"> · respondido {{ dataHora(e.respondido_em) }}</template><template v-else-if="e.prazo_resposta"> · responder até {{ dataCurta(e.prazo_resposta) }}</template></p>
        </div>
        <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" :class="COR[e.estado]" data-testid="status-envio">{{ ROTULO[e.estado] }}</span>
        <span v-if="e.pendente_de_prazo" class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">Prazo vencido</span>
        <Button v-if="e.estado === 'respondido'" size="sm" variant="outline" data-testid="ver-resposta" @click="abrir(e.id)">Ver respostas</Button>
        <template v-else-if="e.estado !== 'cancelado'">
          <Button size="sm" variant="outline" @click="copiar(e)">Copiar link</Button>
          <Button size="sm" variant="outline" @click="cancelar(e)">Cancelar</Button>
        </template>
      </li>
    </ul>
    <p v-if="aviso" class="text-xs text-success-dark">{{ aviso }}</p>

    <Modal :is-open="!!detalhe" title="Respostas recebidas" max-width="2xl" @close="detalhe = null">
      <div v-if="detalhe" class="p-5 space-y-4" data-testid="detalhe-resposta">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <p><b>Formulário:</b> {{ detalhe.formulario_nome }} (versão {{ detalhe.versao_formulario ?? '—' }})</p>
          <p><b>Pessoa:</b> {{ detalhe.contato_nome }}</p>
          <p v-if="detalhe.caso_titulo"><b>Demanda:</b> {{ detalhe.caso_titulo }}</p>
          <p><b>Respondido em:</b> {{ detalhe.respondido_em ? dataHora(detalhe.respondido_em) : '—' }}</p>
          <p><b>Quem respondeu:</b> {{ detalhe.respondente || 'não informado' }} (pelo link individual)</p>
          <p v-if="detalhe.consentimento_em"><b>Ciência da privacidade:</b> {{ dataHora(detalhe.consentimento_em) }}</p>
        </div>
        <p v-if="detalhe.versao_atual && detalhe.versao_formulario && detalhe.versao_atual > detalhe.versao_formulario" class="text-xs text-amber-700">O formulário foi editado depois deste envio (hoje na versão {{ detalhe.versao_atual }}). As respostas abaixo mostram as perguntas exatamente como a cliente as viu.</p>
        <div v-for="(grupo, i) in grupos" :key="i" class="space-y-2">
          <h5 v-if="grupo.titulo" class="text-[10px] font-bold uppercase tracking-widest text-gray-400">{{ grupo.titulo }}</h5>
          <div v-for="r in grupo.itens" :key="r.id" class="rounded-xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 px-3 py-2">
            <p class="text-[11px] text-gray-500">{{ r.pergunta_texto }}</p>
            <p class="text-sm whitespace-pre-line">{{ texto(r.resposta) }}</p>
          </div>
        </div>
      </div>
    </Modal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Modal from '../Modal.vue'
import Button from '../Button.vue'
import { dataCurta, dataHora } from '../../utils/formatadores'

const props = defineProps<{ contatoId?: number; casoId?: number; recarregar?: number; abrirEnvio?: number | null }>()
const emit = defineEmits<{ enviar: [] }>()

interface Envio { id: number; formulario_nome: string | null; versao: number | null; created_at: string; caso_titulo: string | null; respondido_em: string | null; prazo_resposta: string | null; estado: string; pendente_de_prazo: boolean; url: string }
const ROTULO: Record<string, string> = { gerado: 'Link gerado', enviado: 'Enviado', visualizado: 'Aberto', iniciado: 'Iniciado', respondido: 'Respondido', expirado: 'Expirado', cancelado: 'Cancelado' }
const COR: Record<string, string> = { gerado: 'bg-gray-100 text-gray-600', enviado: 'bg-sky-100 text-sky-800', visualizado: 'bg-amber-100 text-amber-800', iniciado: 'bg-amber-100 text-amber-800', respondido: 'bg-emerald-100 text-emerald-800', expirado: 'bg-red-100 text-red-700', cancelado: 'bg-gray-100 text-gray-500' }
const envios = ref<Envio[]>([])
const carregando = ref(true)
const aviso = ref('')
const detalhe = ref<any>(null)

async function carregar() {
  carregando.value = true
  try { envios.value = await $fetch<Envio[]>('/api/formularios/envios', { params: { contato_id: props.contatoId, caso_id: props.casoId } }) } catch { envios.value = [] } finally { carregando.value = false }
}
async function abrir(id: number) { detalhe.value = await $fetch(`/api/formularios/envios/${id}`) }
async function copiar(e: Envio) {
  try { await navigator.clipboard.writeText(e.url); aviso.value = 'Link copiado.' } catch { aviso.value = 'Não foi possível copiar.' }
  setTimeout(() => { aviso.value = '' }, 4000)
}
async function cancelar(e: Envio) {
  if (!confirm('Cancelar este link? A cliente não poderá mais abrir.')) return
  await $fetch(`/api/formularios/envios/${e.id}`, { method: 'PATCH', body: { acao: 'cancelar' } })
  await carregar()
}
const texto = (v: unknown) => v == null || v === '' || (Array.isArray(v) && !v.length) ? '(sem resposta)' : Array.isArray(v) ? v.join(', ') : String(v)
const grupos = computed(() => {
  const out: { titulo: string; itens: any[] }[] = []
  for (const r of detalhe.value?.respostas ?? []) { const t = r.secao_titulo ?? ''; const ult = out[out.length - 1]; if (ult && ult.titulo === t) ult.itens.push(r); else out.push({ titulo: t, itens: [r] }) }
  return out
})
onMounted(carregar)
watch(() => props.recarregar, carregar)
watch(() => props.abrirEnvio, (id) => { if (id) abrir(id) })
</script>
