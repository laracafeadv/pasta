<template>
  <div class="min-h-screen bg-[#edeae2] dark:bg-zinc-950 px-4 py-10">
    <div class="max-w-2xl mx-auto space-y-6">
      <header class="text-center space-y-2">
        <img src="/mono-dark.png" alt="Lara Café Advocacia & Consultoria" class="h-16 w-auto mx-auto dark:invert" />
        <p class="eyebrow">Formulário da cliente</p>
      </header>

      <div v-if="erro && !info" class="card text-center text-sm">{{ erro }}</div>
      <p v-else-if="!info" class="text-center text-sm text-gray-500">Carregando…</p>

      <template v-else>
        <section class="card space-y-2">
          <h1 class="text-3xl text-primary dark:text-zinc-100">{{ info.primeiroNome ? `Olá, ${info.primeiroNome}!` : 'Olá!' }}</h1>
          <p class="text-sm text-gray-600 dark:text-zinc-300">
            Agora que vamos cuidar do seu caso, este formulário reúne os dados da procuração e do contrato e nos ajuda a entender melhor a sua situação.
            Leva uns 5 minutos. Os campos com * são obrigatórios.
          </p>
        </section>

        <form v-if="!enviado" class="space-y-6" @submit.prevent="enviar">
          <section class="card grid grid-cols-1 sm:grid-cols-2 gap-4">
            <h2 class="sm:col-span-2 text-xl text-primary dark:text-zinc-100">Seus dados</h2>
            <label class="campo sm:col-span-2"><span>Nome completo *</span><input id="f-nome" v-model="f.nome_completo" class="modal-input" required autocomplete="name" /></label>
            <label class="campo"><span>CPF</span><input id="f-cpf" v-model="f.cpf" class="modal-input" inputmode="numeric" placeholder="000.000.000-00" /></label>
            <label class="campo"><span>Data de nascimento</span><input id="f-nasc" v-model="f.data_nascimento" type="date" class="modal-input" /></label>
            <label class="campo"><span>RG</span><input id="f-rg" v-model="f.rg" class="modal-input" /></label>
            <label class="campo"><span>Órgão emissor</span><input id="f-org" v-model="f.orgao_emissor" class="modal-input" placeholder="SSP/BA" /></label>
            <label class="campo"><span>Estado civil</span>
              <select id="f-ec" v-model="f.estado_civil" class="modal-input"><option value="">—</option><option v-for="e in ESTADOS_CIVIS" :key="e">{{ e }}</option></select>
            </label>
            <label class="campo"><span>Profissão</span><input id="f-prof" v-model="f.profissao" class="modal-input" /></label>
            <label class="campo sm:col-span-2"><span>E-mail</span><input id="f-email" v-model="f.email" type="email" class="modal-input" autocomplete="email" /></label>
            <label class="campo sm:col-span-2"><span>Endereço (rua, número, complemento)</span><input id="f-end" v-model="f.endereco" class="modal-input" autocomplete="street-address" /></label>
            <label class="campo"><span>Bairro</span><input id="f-bairro" v-model="f.bairro" class="modal-input" /></label>
            <label class="campo"><span>CEP</span><input id="f-cep" v-model="f.cep" class="modal-input" inputmode="numeric" autocomplete="postal-code" /></label>
            <label class="campo"><span>Cidade</span><input id="f-cidade" v-model="f.cidade" class="modal-input" /></label>
            <label class="campo"><span>UF</span>
              <select id="f-uf" v-model="f.uf" class="modal-input"><option value="">—</option><option v-for="u in UFS" :key="u">{{ u }}</option></select>
            </label>
          </section>

          <section class="card space-y-4">
            <h2 class="text-xl text-primary dark:text-zinc-100">Para te conhecer melhor</h2>
            <p class="text-xs text-gray-500 -mt-2">Responda só o que se sentir à vontade.</p>
            <fieldset class="campo">
              <span>Você tem filhos?</span>
              <div class="flex gap-4 text-sm">
                <label class="flex items-center gap-2"><input v-model="f.tem_filhos" type="radio" :value="true" class="accent-[#3c2923]" /> Sim</label>
                <label class="flex items-center gap-2"><input v-model="f.tem_filhos" type="radio" :value="false" class="accent-[#3c2923]" /> Não</label>
              </div>
            </fieldset>
            <label class="campo"><span>Como você está se sentindo com tudo isso?</span><textarea id="f-sent" v-model="f.sentimento" rows="2" class="modal-input" /></label>
            <label class="campo"><span>O que mais te preocupa hoje?</span><textarea id="f-preoc" v-model="f.preocupacao" rows="2" class="modal-input" /></label>
            <label class="campo"><span>Quando isso estiver resolvido, o que você espera que mude na sua vida?</span><textarea id="f-exp" v-model="f.expectativa" rows="2" class="modal-input" /></label>
            <label class="campo"><span>Como você conheceu o escritório?</span>
              <select id="f-orig" v-model="f.origem" class="modal-input"><option value="">—</option><option v-for="o in ORIGENS" :key="o">{{ o }}</option></select>
            </label>
          </section>

          <section class="card space-y-3">
            <label class="flex items-start gap-3 text-sm cursor-pointer">
              <input id="f-lgpd" v-model="f.consentimento" type="checkbox" class="mt-1 accent-[#3c2923]" required />
              <span>
                Li e concordo: meus dados serão usados só para o meu atendimento e o meu processo, com sigilo profissional e conforme a LGPD
                (<a href="https://laracafe.com.br/politica-de-privacidade" target="_blank" rel="noopener" class="underline">política de privacidade</a>). *
              </span>
            </label>
            <p v-if="erro" class="text-sm text-danger">{{ erro }}</p>
            <button type="submit" class="botao" :disabled="enviando">{{ enviando ? 'Enviando…' : 'Enviar respostas' }}</button>
          </section>
        </form>

        <section v-else class="card space-y-1">
          <h2 class="text-xl text-primary dark:text-zinc-100">Recebemos, obrigada! 🤍</h2>
          <p class="text-sm text-gray-600 dark:text-zinc-300">Seus dados já estão com {{ info.advogada }}. Se quiser, anexe os documentos abaixo.</p>
        </section>

        <section class="card space-y-3">
          <h2 class="text-xl text-primary dark:text-zinc-100">Documentos</h2>
          <p class="text-sm text-gray-600 dark:text-zinc-300">RG ou CNH, CPF, comprovante de residência e os documentos do seu caso. PDF ou foto, até 10 MB cada. Vão direto para a sua pasta, com segurança.</p>
          <label class="botao-claro inline-flex cursor-pointer">
            <input id="f-arquivos" type="file" class="sr-only" multiple accept="application/pdf,image/jpeg,image/png,image/heic,image/webp" @change="anexar" />
            {{ subindo ? `Enviando ${subindo}…` : 'Escolher arquivos' }}
          </label>
          <ul v-if="enviados.length" class="text-sm space-y-1">
            <li v-for="n in enviados" :key="n">✓ {{ n }}</li>
          </ul>
          <p v-if="erroArquivo" class="text-sm text-danger">{{ erroArquivo }}</p>
        </section>

        <p class="text-center text-xs text-gray-500">Lara Café Advocacia &amp; Consultoria · informações protegidas pelo sigilo profissional</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { definePageMeta, useHead, useRoute } from '#imports'
import { ESTADOS_CIVIS, ORIGENS, UFS } from '~~/shared/types/crm'

definePageMeta({ layout: false })
useHead({ title: 'Formulário da cliente', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const token = String(useRoute().params.token)
const info = ref<{ primeiroNome: string | null; advogada: string; respondido: boolean; arquivos: number } | null>(null)
const f = reactive<Record<string, any>>({ nacionalidade: 'brasileira', tem_filhos: null, consentimento: false })
const enviado = ref(false)
const enviando = ref(false)
const erro = ref('')
const subindo = ref('')
const enviados = ref<string[]>([])
const erroArquivo = ref('')

onMounted(async () => {
  try {
    info.value = await $fetch(`/api/formulario/${token}`)
    enviado.value = info.value!.respondido
  } catch (e: any) {
    erro.value = e?.data?.message || 'Este link não é mais válido. Peça um novo ao escritório.'
  }
})

async function enviar() {
  enviando.value = true
  erro.value = ''
  try {
    await $fetch(`/api/formulario/${token}`, { method: 'POST', body: { ...f } })
    enviado.value = true
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível enviar agora. Tente de novo em instantes.'
  } finally {
    enviando.value = false
  }
}

async function anexar(ev: Event) {
  const input = ev.target as HTMLInputElement
  erroArquivo.value = ''
  for (const arquivo of Array.from(input.files ?? [])) {
    subindo.value = arquivo.name
    const fd = new FormData()
    fd.append('arquivo', arquivo)
    try {
      await $fetch(`/api/formulario/${token}/arquivo`, { method: 'POST', body: fd })
      enviados.value.push(arquivo.name)
    } catch (e: any) {
      erroArquivo.value = `${arquivo.name}: ${e?.data?.message || 'não foi possível enviar.'}`
    }
  }
  subindo.value = ''
  input.value = ''
}
</script>

<style scoped>
.card { @apply rounded-3xl bg-white/80 dark:bg-zinc-900/70 border border-gray-200/70 dark:border-zinc-800 p-6; }
.campo { @apply flex flex-col gap-1.5; }
.campo > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
.botao { @apply w-full sm:w-auto px-6 py-3 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-60; }
.botao-claro { @apply px-5 py-2.5 rounded-full border border-primary/40 text-primary dark:text-zinc-100 text-xs font-semibold uppercase tracking-[0.14em] hover:bg-primary hover:text-white; }
</style>
