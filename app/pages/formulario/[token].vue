<template>
  <div class="min-h-screen bg-[#edeae2] dark:bg-zinc-950 px-4 py-10">
    <div class="max-w-xl mx-auto space-y-6">
      <header class="text-center space-y-2">
        <img src="/mono-dark.png" alt="Lara Café Advocacia & Consultoria" class="h-16 w-auto mx-auto dark:invert" />
      </header>

      <div v-if="erro && !info" class="card text-center text-sm" data-testid="link-invalido">{{ erro }}</div>
      <p v-else-if="!info" class="text-center text-sm text-gray-500">Carregando…</p>

      <template v-else>
        <section v-if="enviado" class="card space-y-1 text-center" data-testid="formulario-enviado">
          <h1 class="text-2xl text-primary dark:text-zinc-100">Formulário enviado com sucesso.</h1>
          <p class="text-sm text-gray-600 dark:text-zinc-300">{{ info.formulario.mensagem_final || 'Obrigada! Recebemos as suas respostas.' }}</p>
        </section>

        <template v-else>
          <section class="card space-y-2">
            <h1 class="text-3xl text-primary dark:text-zinc-100" data-testid="publico-titulo">{{ info.formulario.nome }}</h1>
            <p v-if="info.formulario.descricao" class="text-sm text-gray-600 dark:text-zinc-300 whitespace-pre-line">{{ info.formulario.descricao }}</p>
            <p class="text-xs text-gray-400">
              {{ info.primeiroNome ? `Olá, ${info.primeiroNome}. ` : '' }}Este formulário é de {{ info.advogada }}. * indica resposta obrigatória.
              <template v-if="info.prazo_resposta"> Responda, se possível, até {{ dataBR(info.prazo_resposta) }}.</template>
            </p>
          </section>
          <section v-if="info.formulario.instrucoes" class="card"><p class="text-sm whitespace-pre-line" data-testid="instrucoes">{{ info.formulario.instrucoes }}</p></section>

          <FormularioPreenchimento v-model="respostas" :secoes="info.secoes" :enviando="enviando" rotulo-enviar="Enviar formulário" @enviar="enviar">
            <template #fim>
              <section class="card space-y-3">
                <label class="campo"><span>Quem está preenchendo? (opcional)</span>
                  <input v-model="respondente" class="modal-input" maxlength="120" autocomplete="name" placeholder="Seu nome" />
                </label>
                <label class="flex items-start gap-3 text-sm cursor-pointer">
                  <input v-model="consentimento" type="checkbox" class="mt-1 accent-[#3c2923]" data-testid="aceite-privacidade" />
                  <span>
                    Li e concordo: as respostas serão usadas só para o meu atendimento jurídico, com sigilo profissional e conforme a LGPD.
                    <span v-if="info.formulario.finalidade" class="text-gray-500"> Finalidade: {{ info.formulario.finalidade }}</span>
                  </span>
                </label>
                <p v-if="erro" class="text-sm text-danger" data-testid="erro-envio">{{ erro }}</p>
              </section>
            </template>
          </FormularioPreenchimento>
        </template>

        <p class="text-center text-xs text-gray-500">Lara Café Advocacia &amp; Consultoria · informações protegidas pelo sigilo profissional</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { definePageMeta, useHead, useRoute } from '#imports'
import FormularioPreenchimento from '~/components/formularios/FormularioPreenchimento.vue'
import type { SecaoForm, Valor } from '~~/shared/data/formulario'

// Página PÚBLICA: sem login, sem menu do CRM e sem indexação. Só mostra o formulário deste link.
definePageMeta({ layout: false })
useHead({ title: 'Formulário', meta: [{ name: 'robots', content: 'noindex, nofollow' }, { name: 'referrer', content: 'no-referrer' }] })

interface Info { primeiroNome: string | null; advogada: string; respondido: boolean; prazo_resposta: string | null; formulario: { nome: string; descricao: string | null; instrucoes: string | null; finalidade: string | null; mensagem_final: string | null }; secoes: SecaoForm[] }
const token = String(useRoute().params.token)
const info = ref<Info | null>(null)
const respostas = ref<Record<number, Valor>>({})
const respondente = ref('')
const consentimento = ref(false)
const enviado = ref(false)
const enviando = ref(false)
const erro = ref('')
let iniciou = false

const dataBR = (iso: string) => iso.split('-').reverse().join('/')

onMounted(async () => {
  try {
    info.value = await $fetch<Info>(`/api/formulario-publico/${token}`)
    enviado.value = info.value.respondido
  } catch (e: any) {
    erro.value = e?.data?.message || 'Este link não é mais válido. Peça um novo ao escritório.'
  }
})

// Primeira digitação: avisa o escritório que a cliente começou (status "iniciado").
watch(respostas, () => {
  if (iniciou) return
  iniciou = true
  $fetch(`/api/formulario-publico/${token}/iniciar`, { method: 'POST' }).catch(() => { /* só informativo */ })
}, { deep: true })

async function enviar() {
  if (!consentimento.value) { erro.value = 'Para enviar, confirme que leu o aviso de privacidade.'; return }
  enviando.value = true
  erro.value = ''
  try {
    await $fetch(`/api/formulario-publico/${token}`, { method: 'POST', body: { respostas: respostas.value, respondente: respondente.value, consentimento: true } })
    enviado.value = true
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível enviar agora. Tente de novo em instantes.'
  } finally {
    enviando.value = false
  }
}
</script>

<style scoped>
.card { @apply rounded-3xl bg-white/80 dark:bg-zinc-900/70 border border-gray-200/70 dark:border-zinc-800 p-6; }
.campo { @apply flex flex-col gap-1.5; }
.campo > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
