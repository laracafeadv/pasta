<template>
  <div class="min-h-screen bg-[#edeae2] dark:bg-zinc-950 px-4 py-10">
    <div class="max-w-xl mx-auto space-y-6">
      <header class="text-center space-y-2">
        <img src="/mono-dark.png" alt="Lara Café Advocacia & Consultoria" class="h-16 w-auto mx-auto dark:invert" />
        <p class="eyebrow">Antes da nossa consulta</p>
      </header>

      <div v-if="erro && !info" class="card text-center text-sm">{{ erro }}</div>
      <p v-else-if="!info" class="text-center text-sm text-gray-500">Carregando…</p>

      <template v-else>
        <div v-if="preview" class="rounded-2xl border border-secondary/40 bg-secondary/10 p-3 text-xs text-center font-semibold text-secondary-dark">
          Prévia — é assim que a cliente vê. Nada aqui é enviado de verdade.
        </div>
        <section class="card space-y-2">
          <h1 class="text-3xl text-primary dark:text-zinc-100">{{ info.primeiroNome ? `Olá, ${info.primeiroNome}!` : 'Olá!' }}</h1>
          <p class="text-sm text-gray-600 dark:text-zinc-300">
            Para {{ info.advogada }} já chegar preparada na sua consulta, responda essas perguntas rápidas — leva uns 2 minutos.
          </p>
        </section>

        <form v-if="!enviado" class="space-y-6" @submit.prevent="enviar">
          <section class="card space-y-4">
            <label class="campo"><span>Qual área tem a ver com a sua situação?</span>
              <select id="pf-area" v-model="f.area" class="modal-input">
                <option value="">—</option>
                <option v-for="a in Object.keys(AREAS)" :key="a">{{ a }}</option>
              </select>
            </label>
            <label class="campo"><span>Conte um pouco da sua situação *</span>
              <textarea id="pf-resumo" v-model="f.resumo" rows="4" class="modal-input" required placeholder="O que está acontecendo, desde quando..." />
            </label>
            <label class="campo"><span>O que mais te preocupa agora?</span><textarea id="pf-preoc" v-model="f.preocupacao" rows="2" class="modal-input" /></label>
            <label class="campo"><span>O que você espera alcançar com a consulta?</span><textarea id="pf-exp" v-model="f.expectativa" rows="2" class="modal-input" /></label>
            <label class="campo"><span>Quão urgente você sente que isso é?</span>
              <select id="pf-urg" v-model="f.urgencia" class="modal-input">
                <option value="">—</option>
                <option v-for="u in URGENCIAS" :key="u">{{ u }}</option>
              </select>
            </label>
            <fieldset class="campo">
              <span>Já existe um processo em andamento sobre isso?</span>
              <div class="flex gap-4 text-sm">
                <label class="flex items-center gap-2"><input v-model="f.processo_em_andamento" type="radio" :value="true" class="accent-[#3c2923]" /> Sim</label>
                <label class="flex items-center gap-2"><input v-model="f.processo_em_andamento" type="radio" :value="false" class="accent-[#3c2923]" /> Não</label>
              </div>
            </fieldset>
            <label v-if="info.perguntaExtra" class="campo">
              <span>{{ info.perguntaExtra }}</span>
              <textarea id="pf-extra" v-model="f.resposta_extra" rows="2" class="modal-input" />
            </label>
          </section>

          <section class="card space-y-3">
            <label class="flex items-start gap-3 text-sm cursor-pointer">
              <input id="pf-lgpd" v-model="f.consentimento" type="checkbox" class="mt-1 accent-[#3c2923]" required />
              <span>
                Li e concordo: minhas respostas serão usadas só para preparar o meu atendimento, com sigilo profissional e conforme a LGPD
                (<a href="https://laracafe.com.br/politica-de-privacidade" target="_blank" rel="noopener" class="underline">política de privacidade</a>). *
              </span>
            </label>
            <p v-if="erro" class="text-sm text-danger">{{ erro }}</p>
            <button type="submit" class="botao" :disabled="enviando">{{ enviando ? 'Enviando…' : 'Enviar respostas' }}</button>
          </section>
        </form>

        <section v-else class="card space-y-1">
          <h2 class="text-xl text-primary dark:text-zinc-100">Recebemos, obrigada! 🤍</h2>
          <p class="text-sm text-gray-600 dark:text-zinc-300">Já anotamos tudo. Até a nossa consulta!</p>
        </section>

        <p class="text-center text-xs text-gray-500">Lara Café Advocacia &amp; Consultoria · informações protegidas pelo sigilo profissional</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { definePageMeta, useHead, useRoute } from '#imports'
import { AREAS, URGENCIAS } from '~~/shared/types/crm'

definePageMeta({ layout: false })
useHead({ title: 'Antes da consulta', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const token = String(useRoute().params.token)
const info = ref<{ primeiroNome: string | null; advogada: string; respondido: boolean; area: string | null; perguntaExtra?: string | null } | null>(null)
const f = reactive<Record<string, any>>({ processo_em_andamento: null, consentimento: false })
const enviado = ref(false)
const enviando = ref(false)
const erro = ref('')

const preview = token === 'preview'

onMounted(async () => {
  if (preview) {
    info.value = { primeiroNome: 'Maria', advogada: 'a advogada', respondido: false, area: null, perguntaExtra: 'Pergunta extra de exemplo, específica deste caso' }
    return
  }
  try {
    info.value = await $fetch(`/api/pre-formulario/${token}`)
    enviado.value = info.value!.respondido
    if (info.value?.area) f.area = info.value.area
  } catch (e: any) {
    erro.value = e?.data?.message || 'Este link não é mais válido. Peça um novo ao escritório.'
  }
})

async function enviar() {
  if (preview) { erro.value = 'Isso é só uma prévia — nada é enviado de verdade.'; return }
  enviando.value = true
  erro.value = ''
  try {
    await $fetch(`/api/pre-formulario/${token}`, { method: 'POST', body: { ...f } })
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
.botao { @apply w-full sm:w-auto px-6 py-3 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-60; }
</style>
