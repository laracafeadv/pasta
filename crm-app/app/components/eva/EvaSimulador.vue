<template>
  <div class="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
    <!-- Conversa simulada -->
    <section class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 flex flex-col min-h-[560px]">
      <header class="px-6 py-4 border-b border-gray-200/70 dark:border-zinc-800 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl text-primary dark:text-zinc-100">Testar a assistente</h2>
          <p class="text-xs text-gray-500">Converse como se fosse uma cliente. Nada é enviado pelo WhatsApp nem gravado no CRM.</p>
        </div>
        <button class="text-xs font-semibold uppercase tracking-wider text-secondary-dark hover:underline" @click="reiniciar">Recomeçar</button>
      </header>

      <div ref="caixa" class="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
        <p v-if="!historico.length" class="m-auto text-center text-sm text-gray-400 max-w-xs">
          Exemplos: “Oi, quero me divorciar mas não sei por onde começar”, “Quanto custa um inventário?”, “Meu ex está me ameaçando”.
        </p>
        <div
          v-for="(m, i) in historico"
          :key="i"
          class="max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap"
          :class="m.autor === 'cliente' ? 'self-end bg-primary text-white' : 'self-start bg-gray-100 dark:bg-zinc-800'"
        >
          {{ m.conteudo }}
        </div>
        <div v-if="pensando" class="self-start text-xs text-gray-400 italic">A assistente está digitando…</div>
        <div v-if="ultimo?.transferir_para_humano" class="self-center text-xs font-semibold text-warning-dark bg-warning/10 rounded-full px-4 py-1.5">
          Transferida para a equipe: {{ ultimo.motivo_transferencia || 'pedido de atendimento humano' }}
        </div>
      </div>

      <form class="p-4 border-t border-gray-200/70 dark:border-zinc-800 flex gap-2" @submit.prevent="enviar">
        <input v-model="texto" class="modal-input flex-1" placeholder="Escreva como a cliente escreveria…" :disabled="pensando" />
        <Button type="submit" :loading="pensando" :disabled="!texto.trim()" icon="ph:paper-plane-right-bold">Enviar</Button>
      </form>
      <p v-if="erro" class="px-6 pb-4 text-sm text-danger">{{ erro }}</p>
    </section>

    <!-- Lateral: o que a IA registraria + status -->
    <aside class="space-y-5">
      <section class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-5 text-sm">
        <p class="eyebrow mb-3">O que iria para a ficha</p>
        <p v-if="!ultimo" class="text-gray-400 italic">Aparece aqui depois da primeira resposta.</p>
        <dl v-else class="space-y-2">
          <div v-for="[rotulo, valor] in fichaLinhas" :key="rotulo">
            <dt class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{{ rotulo }}</dt>
            <dd>{{ valor }}</dd>
          </div>
        </dl>
      </section>

      <section class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-5 text-sm space-y-2">
        <p class="eyebrow mb-1">Conexões</p>
        <p v-for="s in statusLinhas" :key="s.rotulo" class="flex items-center gap-2">
          <Icon :name="s.ok ? 'ph:check-circle-fill' : 'ph:x-circle-fill'" :class="s.ok ? 'text-success' : 'text-danger'" />
          {{ s.rotulo }}
        </p>
        <div v-if="status" class="pt-2">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">URL do webhook (cole no app da Meta)</p>
          <code class="block mt-1 text-xs break-all bg-gray-100 dark:bg-zinc-800 rounded-lg p-2">{{ status.webhookUrl }}</code>
        </div>
      </section>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import Button from '../Button.vue'
import { useEvaPromptStore } from '../../stores/evaPrompt'

interface Msg { autor: 'cliente' | 'ia'; conteudo: string }
interface Resposta {
  resposta: string
  ficha: Record<string, any>
  transferir_para_humano: boolean
  motivo_transferencia: string | null
}
interface Status { openai: boolean; modelo: string; whatsapp: boolean; verificacao: boolean; assinatura: boolean; webhookUrl: string }

const promptStore = useEvaPromptStore()
const historico = ref<Msg[]>([])
const texto = ref('')
const pensando = ref(false)
const erro = ref<string | null>(null)
const ultimo = ref<Resposta | null>(null)
const caixa = ref<HTMLElement | null>(null)
const status = ref<Status | null>(null)

onMounted(async () => {
  status.value = await $fetch<Status>('/api/eva/status').catch(() => null)
})

const statusLinhas = computed(() => status.value ? [
  { rotulo: `OpenAI (${status.value.modelo})`, ok: status.value.openai },
  { rotulo: 'WhatsApp: número e token', ok: status.value.whatsapp },
  { rotulo: 'WhatsApp: token de verificação', ok: status.value.verificacao },
  { rotulo: 'WhatsApp: App Secret (segurança)', ok: status.value.assinatura },
] : [])

const fichaLinhas = computed(() => {
  const f = ultimo.value?.ficha ?? {}
  const linhas: [string, string][] = [
    ['Nome', f.nome], ['Cidade', f.cidade], ['Área', f.area], ['Demanda', f.demanda],
    ['Parte contrária', f.parte_contraria], ['Urgência', f.urgencia], ['Sentimento', f.sentimento],
    ['Resumo', f.resumo], ['Pontos de atenção', f.interesses?.join(', ')], ['Dúvidas / objeções', f.objecoes?.join(', ')],
  ]
  return linhas.filter(([, v]) => v)
})

async function enviar() {
  const t = texto.value.trim()
  if (!t) return
  historico.value.push({ autor: 'cliente', conteudo: t })
  texto.value = ''
  erro.value = null
  pensando.value = true
  await rolar()
  try {
    // Usa o texto que está no editor (mesmo sem salvar), para testar antes de publicar.
    const r = await $fetch<Resposta>('/api/eva/simular', {
      method: 'POST',
      body: { historico: historico.value, prompt: promptStore.rascunho || undefined },
    })
    ultimo.value = r
    historico.value.push({ autor: 'ia', conteudo: r.resposta })
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível gerar a resposta.'
  } finally {
    pensando.value = false
    await rolar()
  }
}

async function rolar() {
  await nextTick()
  caixa.value?.scrollTo({ top: caixa.value.scrollHeight, behavior: 'smooth' })
}

function reiniciar() {
  historico.value = []
  ultimo.value = null
  erro.value = null
}
</script>
