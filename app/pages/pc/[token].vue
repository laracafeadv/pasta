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
            <label class="campo"><span>Conte um pouco da sua situação *</span>
              <textarea id="pf-resumo" v-model="f.resumo" rows="5" class="modal-input" required placeholder="O que está acontecendo, desde quando, e o que você espera resolver..." />
            </label>

            <label v-for="(p, i) in info.perguntas" :key="i" class="campo">
              <span>{{ p.texto }}{{ p.obrigatoria ? ' *' : '' }}</span>

              <textarea v-if="p.tipo === 'texto_longo'" v-model="respostas[i]" rows="3" class="modal-input" :required="p.obrigatoria" />
              <input v-else-if="p.tipo === 'numero'" v-model="respostas[i]" type="number" class="modal-input" :required="p.obrigatoria" />
              <input v-else-if="p.tipo === 'data'" v-model="respostas[i]" type="date" class="modal-input" :required="p.obrigatoria" />
              <input v-else-if="p.tipo === 'email'" v-model="respostas[i]" type="email" class="modal-input" :required="p.obrigatoria" />
              <input v-else-if="p.tipo === 'telefone'" v-model="respostas[i]" type="tel" class="modal-input" :required="p.obrigatoria" />

              <div v-else-if="p.tipo === 'sim_nao'" class="flex gap-4 text-sm">
                <label class="flex items-center gap-1.5"><input v-model="respostas[i]" type="radio" value="Sim" :name="`p${i}`" class="accent-[#3c2923]" /> Sim</label>
                <label class="flex items-center gap-1.5"><input v-model="respostas[i]" type="radio" value="Não" :name="`p${i}`" class="accent-[#3c2923]" /> Não</label>
              </div>

              <div v-else-if="p.tipo === 'selecao_unica'" class="flex flex-col gap-1.5 text-sm">
                <label v-for="op in p.opcoes" :key="op" class="flex items-center gap-1.5">
                  <input v-model="respostas[i]" type="radio" :value="op" :name="`p${i}`" class="accent-[#3c2923]" /> {{ op }}
                </label>
              </div>

              <div v-else-if="p.tipo === 'selecao_multipla' || p.tipo === 'checklist'" class="flex flex-col gap-1.5 text-sm">
                <label v-for="op in p.opcoes" :key="op" class="flex items-center gap-1.5">
                  <input type="checkbox" :checked="((respostas[i] as string[] | undefined)?.includes(op))" class="accent-[#3c2923]" @change="alternarOpcao(i, op)" /> {{ op }}
                </label>
              </div>

              <input v-else v-model="respostas[i]" type="text" class="modal-input" :required="p.obrigatoria" />
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

definePageMeta({ layout: false })
useHead({ title: 'Antes da consulta', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

interface PerguntaPublica { texto: string; tipo: string; opcoes: string[]; obrigatoria: boolean }
const token = String(useRoute().params.token)
const info = ref<{ primeiroNome: string | null; advogada: string; respondido: boolean; perguntas: PerguntaPublica[] } | null>(null)
const f = reactive<Record<string, any>>({ consentimento: false })
const respostas = ref<(string | string[])[]>([])
const enviado = ref(false)
const enviando = ref(false)
const erro = ref('')

const preview = token === 'preview'

onMounted(async () => {
  if (preview) {
    info.value = {
      primeiroNome: 'Maria', advogada: 'a advogada', respondido: false,
      perguntas: [
        { texto: 'Há medida protetiva em vigor?', tipo: 'sim_nao', opcoes: [], obrigatoria: true },
        { texto: 'Área do caso', tipo: 'selecao_unica', opcoes: ['Divórcio', 'Inventário', 'Guarda e alimentos'], obrigatoria: false },
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

function alternarOpcao(i: number, op: string) {
  const atual = (respostas.value[i] as string[] | undefined) ?? []
  respostas.value[i] = atual.includes(op) ? atual.filter(o => o !== op) : [...atual, op]
}

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
