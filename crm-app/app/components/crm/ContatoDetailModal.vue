<template>
  <Modal
    :is-open="isOpen"
    :title="dados?.contato.nome || telefoneFormatado(dados?.contato.telefone) || 'Carregando…'"
    :description="dados ? `${etapa(dados.contato.etapa).nome} · desde ${dataCurta(dados.contato.created_at)}` : ''"
    content-class="!p-0"
    max-width="4xl"
    @close="emit('close')"
  >
    <div v-if="loading && !dados" class="p-10 text-center text-sm text-gray-400">Carregando…</div>

    <template v-else-if="dados">
      <div class="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-zinc-800 sticky top-0 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur">
        <button
          v-for="t in abas"
          :key="t.id"
          class="px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors"
          :class="aba === t.id ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800'"
          @click="aba = t.id"
        >
          {{ t.label }}<span v-if="t.badge" class="ml-1.5 opacity-70">{{ t.badge }}</span>
        </button>
        <div class="ml-auto flex gap-2">
          <Button size="sm" variant="outline" icon="ph:pencil-simple-bold" @click="emit('editar', dados.contato)">Editar</Button>
          <Button v-if="etapa(dados.contato.etapa).aberta" size="sm" icon="ph:check-bold" @click="emit('andamento', dados.contato)">Registrar andamento</Button>
        </div>
      </div>

      <!-- Caso -->
      <div v-if="aba === 'caso'" class="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div class="card">
          <h3>Contato</h3>
          <p><b>WhatsApp:</b> <a :href="whatsappLink(dados.contato.telefone)" target="_blank" rel="noopener" class="text-primary">{{ telefoneFormatado(dados.contato.telefone) }}</a></p>
          <p><b>E-mail:</b> {{ dados.contato.email || '—' }}</p>
          <p><b>Cidade:</b> {{ dados.contato.cidade || '—' }}</p>
          <p><b>Origem:</b> {{ dados.contato.origem || '—' }}</p>
          <p><b>Aviso LGPD:</b> {{ dados.contato.consentimento_em ? dataHora(dados.contato.consentimento_em) : 'não enviado' }}</p>
        </div>
        <div class="card">
          <h3>Caso</h3>
          <p><b>Área:</b> {{ dados.contato.area || '—' }} <span v-if="dados.contato.demanda">· {{ dados.contato.demanda }}</span></p>
          <p><b>Parte contrária:</b> {{ dados.contato.parte_contraria || '—' }}</p>
          <p><b>Urgência:</b> {{ dados.contato.urgencia || '—' }} · <b>Sentimento:</b> {{ dados.contato.sentimento || '—' }}</p>
          <p v-if="etapa(dados.contato.etapa).aberta">
            <b>Próxima ação:</b>
            <span v-if="dados.contato.proxima_acao">{{ dados.contato.proxima_acao }} — {{ dataCurta(dados.contato.proxima_data) }} ({{ diaRelativo(dados.contato.proxima_data) }})</span>
            <span v-else class="text-warning-dark font-semibold">não definida</span>
          </p>
          <p v-if="dados.contato.motivo_perda"><b>Motivo da perda:</b> {{ dados.contato.motivo_perda }}</p>
        </div>
        <div class="card md:col-span-2">
          <h3>Resumo do caso</h3>
          <p class="whitespace-pre-wrap">{{ dados.contato.resumo || 'Sem resumo ainda. A assistente preenche durante a conversa, ou edite a ficha.' }}</p>
          <div v-if="dados.contato.interesses?.length" class="mt-3">
            <b class="text-xs uppercase tracking-wider text-gray-400">Pontos de atenção</b>
            <div class="flex flex-wrap gap-1.5 mt-1"><span v-for="t in dados.contato.interesses" :key="t" class="tag">{{ t }}</span></div>
          </div>
          <div v-if="dados.contato.objecoes?.length" class="mt-3">
            <b class="text-xs uppercase tracking-wider text-gray-400">Dúvidas / objeções</b>
            <div class="flex flex-wrap gap-1.5 mt-1"><span v-for="t in dados.contato.objecoes" :key="t" class="tag">{{ t }}</span></div>
          </div>
        </div>
      </div>

      <!-- Conversa -->
      <div v-else-if="aba === 'conversa'" class="flex flex-col">
        <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm" :class="dados.contato.ia_ativa ? 'bg-success/5' : 'bg-warning/10'">
          <span v-if="dados.contato.ia_ativa"><Icon name="ph:robot-bold" class="align-middle" /> A assistente de IA está respondendo este contato.</span>
          <span v-else><Icon name="ph:user-bold" class="align-middle" /> A equipe assumiu esta conversa. A IA não responde.</span>
          <Button size="sm" variant="outline" :loading="alternandoIa" @click="alternarIa">
            {{ dados.contato.ia_ativa ? 'Assumir conversa' : 'Devolver para a IA' }}
          </Button>
        </div>
        <div ref="scrollBox" class="flex flex-col gap-3 p-5 max-h-[50vh] overflow-y-auto">
          <p v-if="!dados.mensagens.length" class="text-center text-sm text-gray-400 py-10">Nenhuma mensagem de WhatsApp.</p>
          <div
            v-for="m in dados.mensagens"
            :key="m.id"
            class="max-w-[80%] rounded-lg px-4 py-2 text-sm"
            :class="m.direcao === 'saida' ? 'self-end bg-primary text-white' : 'self-start bg-gray-100 dark:bg-zinc-800'"
          >
            <p class="whitespace-pre-wrap break-words">{{ m.conteudo }}</p>
            <p class="mt-1 text-[10px] opacity-70 text-right">{{ m.autor === 'ia' ? 'IA · ' : m.autor === 'equipe' ? 'Equipe · ' : '' }}{{ dataHora(m.created_at) }}</p>
          </div>
        </div>
        <form class="flex gap-2 p-4 border-t border-gray-100 dark:border-zinc-800" @submit.prevent="enviar">
          <textarea v-model="resposta" rows="2" class="modal-input flex-1" placeholder="Responder pelo WhatsApp do escritório…" @keydown.enter.exact.prevent="enviar" />
          <Button type="submit" :loading="enviando" icon="ph:paper-plane-right-bold" :disabled="!resposta.trim()">Enviar</Button>
        </form>
        <p v-if="erroEnvio" class="px-5 pb-3 text-sm text-danger">{{ erroEnvio }}</p>
        <p class="px-5 pb-4 text-xs text-gray-400">Ao enviar uma mensagem, a IA é pausada neste contato automaticamente. O WhatsApp só permite mensagens livres até 24h após a última mensagem do cliente.</p>
      </div>

      <!-- Atividades -->
      <div v-else-if="aba === 'atividades'" class="p-5">
        <form class="flex flex-col sm:flex-row gap-2 mb-5" @submit.prevent="anotar">
          <select v-model="nota.tipo" class="modal-input sm:w-40">
            <option v-for="t in TIPOS_ATIVIDADE" :key="t">{{ t }}</option>
          </select>
          <input v-model="nota.texto" class="modal-input flex-1" placeholder="O que foi conversado ou decidido?" />
          <Button type="submit" :loading="anotando" :disabled="!nota.texto.trim()">Registrar</Button>
        </form>
        <p v-if="!dados.atividades.length" class="text-sm text-gray-400">Sem registros ainda.</p>
        <ol class="border-l-2 border-gray-100 dark:border-zinc-800 ml-1">
          <li v-for="a in dados.atividades" :key="a.id" class="pl-4 pb-4 relative text-sm">
            <span class="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full" :class="a.tipo === 'Sistema' ? 'bg-gray-300' : 'bg-primary'" />
            <p class="text-xs text-gray-400">{{ dataHora(a.created_at) }} · {{ a.tipo }}<span v-if="a.autor?.name"> · {{ a.autor.name }}</span></p>
            <p class="whitespace-pre-wrap" :class="a.tipo === 'Sistema' ? 'text-gray-500' : ''">{{ a.texto }}</p>
          </li>
        </ol>
      </div>

      <!-- Honorários -->
      <div v-else-if="aba === 'honorarios'" class="p-5 space-y-3">
        <div class="flex justify-end">
          <NuxtLink :to="`/honorarios?contato=${dados.contato.id}`" class="text-sm font-semibold text-primary">+ Registrar honorário</NuxtLink>
        </div>
        <p v-if="!dados.honorarios.length" class="text-sm text-gray-400">Nenhum honorário registrado para este contato.</p>
        <div v-for="h in dados.honorarios" :key="h.id" class="card flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="font-semibold">{{ brl(h.valor) }} <span class="text-xs text-gray-400">· {{ h.tipo }}<span v-if="h.parcelas > 1"> · {{ h.parcelas }}x</span></span></p>
            <p class="text-xs text-gray-500">{{ h.descricao || '—' }}</p>
          </div>
          <span class="tag">{{ h.status }}</span>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import Modal from '../Modal.vue'
import Button from '../Button.vue'
import { TIPOS_ATIVIDADE, etapa, type Atividade, type Contato, type Honorario, type MensagemWhatsapp } from '../../../shared/types/crm'
import { brl, dataCurta, dataHora, diaRelativo, telefoneFormatado, whatsappLink } from '../../utils/formatadores'
import { useCrmStore } from '../../stores/crm'

interface Detalhe { contato: Contato; honorarios: Honorario[]; mensagens: MensagemWhatsapp[]; atividades: Atividade[] }

const props = defineProps<{ isOpen: boolean; contatoId: number | null; abaInicial?: string }>()
const emit = defineEmits<{ close: []; editar: [c: Contato]; andamento: [c: Contato] }>()

const crm = useCrmStore()
const dados = ref<Detalhe | null>(null)
const loading = ref(false)
const aba = ref('caso')
const scrollBox = ref<HTMLElement | null>(null)

const abas = computed(() => [
  { id: 'caso', label: 'Caso' },
  { id: 'conversa', label: 'Conversa', badge: dados.value?.mensagens.length || undefined },
  { id: 'atividades', label: 'Atividades', badge: dados.value?.atividades.length || undefined },
  { id: 'honorarios', label: 'Honorários', badge: dados.value?.honorarios.length || undefined },
])

async function carregar() {
  if (!props.contatoId) return
  loading.value = true
  try {
    dados.value = await $fetch<Detalhe>(`/api/crm/contatos/${props.contatoId}`)
  } finally {
    loading.value = false
  }
}

watch(() => props.isOpen, (open) => {
  if (open) {
    aba.value = props.abaInicial || 'caso'
    dados.value = null
    carregar()
  }
})

watch(aba, async (v) => {
  if (v === 'conversa') {
    await nextTick()
    scrollBox.value?.scrollTo({ top: scrollBox.value.scrollHeight })
  }
})

defineExpose({ recarregar: carregar })

// ─── Conversa ─────────────────────────────────────────────────────────────
const resposta = ref('')
const enviando = ref(false)
const erroEnvio = ref<string | null>(null)
const alternandoIa = ref(false)

async function enviar() {
  if (!resposta.value.trim() || !dados.value) return
  enviando.value = true
  erroEnvio.value = null
  try {
    await $fetch(`/api/crm/contatos/${dados.value.contato.id}/whatsapp`, { method: 'POST', body: { texto: resposta.value } })
    resposta.value = ''
    await carregar()
    aba.value = 'conversa'
    await nextTick()
    scrollBox.value?.scrollTo({ top: scrollBox.value.scrollHeight })
  } catch (e: any) {
    erroEnvio.value = e?.data?.message || 'Não foi possível enviar a mensagem.'
  } finally {
    enviando.value = false
  }
}

async function alternarIa() {
  if (!dados.value) return
  alternandoIa.value = true
  try {
    await crm.salvar(dados.value.contato.id, { ia_ativa: !dados.value.contato.ia_ativa })
    await carregar()
  } finally {
    alternandoIa.value = false
  }
}

// ─── Atividades ───────────────────────────────────────────────────────────
const nota = reactive({ tipo: 'Anotação', texto: '' })
const anotando = ref(false)

async function anotar() {
  if (!nota.texto.trim() || !dados.value) return
  anotando.value = true
  try {
    await $fetch(`/api/crm/contatos/${dados.value.contato.id}/atividades`, { method: 'POST', body: { ...nota } })
    nota.texto = ''
    await carregar()
  } finally {
    anotando.value = false
  }
}
</script>

<style scoped>
.card { @apply rounded-lg border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 space-y-1.5; }
.card h3 { @apply text-[10px] font-bold uppercase tracking-widest text-primary mb-2; }
.tag { @apply text-[11px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300; }
</style>
