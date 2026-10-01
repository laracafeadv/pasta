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

        <template v-if="!enviado">
          <section v-if="info.formulario?.nome || info.formulario?.descricao" class="card space-y-1">
            <h2 class="text-xl text-primary dark:text-zinc-100">{{ info.formulario?.nome }}</h2>
            <p v-if="info.formulario?.descricao" class="text-sm text-gray-500">{{ info.formulario.descricao }}</p>
          </section>

          <FormularioPreenchimento v-if="info.secoes.length" v-model="respostas" :secoes="info.secoes" :enviando="enviando" @enviar="enviar">
            <template #inicio>
              <section class="card space-y-2">
                <label class="campo"><span>Conte um pouco da sua situação *</span>
                  <textarea id="pf-resumo" v-model="f.resumo" rows="5" class="modal-input" required placeholder="O que está acontecendo, desde quando, e o que você espera resolver..." />
                </label>
              </section>
            </template>
            <template #fim>
              <section class="card space-y-3">
                <label class="flex items-start gap-3 text-sm cursor-pointer">
                  <input id="pf-lgpd" v-model="f.consentimento" type="checkbox" class="mt-1 accent-[#3c2923]" required />
                  <span>Li e concordo: minhas respostas serão usadas só para preparar o meu atendimento, com sigilo profissional e conforme a LGPD (<a href="https://laracafe.com.br/politica-de-privacidade" target="_blank" rel="noopener" class="underline">política de privacidade</a>). *</span>
                </label>
                <p v-if="erro" class="text-sm text-danger">{{ erro }}</p>
              </section>
            </template>
          </FormularioPreenchimento>

          <form v-else class="space-y-6" @submit.prevent="enviar">
            <section class="card space-y-4">
              <label class="campo"><span>Conte um pouco da sua situação *</span>
                <textarea id="pf-resumo" v-model="f.resumo" rows="5" class="modal-input" required placeholder="O que está acontecendo, desde quando, e o que você espera resolver..." />
              </label>
            </section>
            <section class="card space-y-3">
              <label class="flex items-start gap-3 text-sm cursor-pointer">
                <input id="pf-lgpd" v-model="f.consentimento" type="checkbox" class="mt-1 accent-[#3c2923]" required />
                <span>Li e concordo: minhas respostas serão usadas só para preparar o meu atendimento, com sigilo profissional e conforme a LGPD (<a href="https://laracafe.com.br/politica-de-privacidade" target="_blank" rel="noopener" class="underline">política de privacidade</a>). *</span>
              </label>
              <p v-if="erro" class="text-sm text-danger">{{ erro }}</p>
              <button type="submit" class="botao" :disabled="enviando">{{ enviando ? 'Enviando…' : 'Enviar respostas' }}</button>
            </section>
          </form>
        </template>

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
import FormularioPreenchimento from '~/components/formularios/FormularioPreenchimento.vue'
import type { SecaoForm, Valor } from '~~/shared/data/formulario'

definePageMeta({ layout: false })
useHead({ title: 'Antes da consulta', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const token = String(useRoute().params.token)
const info = ref<{ primeiroNome: string | null; advogada: string; respondido: boolean; formulario: { nome: string; descricao: string | null } | null; secoes: SecaoForm[] } | null>(null)
const f = reactive<Record<string, any>>({ consentimento: false })
const respostas = ref<Record<number, Valor>>({})
const enviado = ref(false)
const enviando = ref(false)
const erro = ref('')

const preview = token === 'preview'

onMounted(async () => {
  if (preview) {
    info.value = {
      primeiroNome: 'Maria', advogada: 'a advogada', respondido: false,
      formulario: { nome: 'Exemplo de formulário', descricao: 'Assim a cliente vê o formulário que você monta em Formulários.' },
      secoes: [
        { id: 1, titulo: 'Sobre você', descricao: null, mostrar_se: null, itens: [
          { pergunta_id: 1, texto: 'Possui filhos?', tipo: 'sim_nao', opcoes: [], ajuda: null, obrigatoria: true, mostrar_se: null },
          { pergunta_id: 2, texto: 'Quantos filhos?', tipo: 'numero', opcoes: [], ajuda: null, obrigatoria: false, mostrar_se: { juntar: 'e', regras: [{ pergunta_id: 1, operador: 'igual', valor: 'Sim' }] } },
        ] },
        { id: 2, titulo: 'Sua demanda', descricao: null, mostrar_se: null, itens: [
          { pergunta_id: 3, texto: 'Área da demanda', tipo: 'selecao_unica', opcoes: ['Divórcio', 'Inventário', 'Guarda e alimentos'], ajuda: null, obrigatoria: false, mostrar_se: null },
        ] },
      ],
    }
    return
  }
  try {
    info.value = await $fetch(`/api/pre-formulario/${token}`)
    enviado.value = info.value!.respondido
  } catch (e: any) {
    erro.value = e?.data?.message || 'Este link não é mais válido. Peça um novo ao escritório.'
  }
})

async function enviar() {
  if (preview) { erro.value = 'Isso é só uma prévia — nada é enviado de verdade.'; return }
  enviando.value = true
  erro.value = ''
  try {
    await $fetch(`/api/pre-formulario/${token}`, { method: 'POST', body: { ...f, respostas: respostas.value } })
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
