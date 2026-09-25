<template>
  <div class="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
    <section class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-6 space-y-4">
      <div>
        <h2 class="text-2xl text-primary dark:text-zinc-100">Mapa da Empatia</h2>
        <p class="text-xs text-gray-500 mt-1">
          Quem mais você quer atender, como pessoa, não como área do direito. A Ana usa este mapa para falar na língua dela
          (sem supor nada sobre quem está conversando). Escreva uma linha por bloco; comece de cabeça e depois confirme com os dados reais ao lado.
        </p>
      </div>
      <label v-for="m in MAPA_EMPATIA" :key="m.chave" class="block space-y-1">
        <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{{ m.bloco }}</span>
        <textarea v-model="form[m.chave]" rows="2" class="modal-input" :placeholder="m.pergunta" />
        <button v-if="analise?.sugestoes?.[m.chave] && analise.sugestoes[m.chave] !== form[m.chave]" type="button"
                class="text-xs text-left text-secondary-dark hover:underline" @click="form[m.chave] = analise!.sugestoes[m.chave]!">
          Sugestão pelos dados reais: “{{ analise.sugestoes[m.chave] }}” — usar
        </button>
      </label>
      <div class="flex items-center gap-3">
        <Button :loading="salvando" icon="ph:check-bold" @click="salvar">Salvar mapa</Button>
        <span v-if="msg" class="text-xs text-success-dark">{{ msg }}</span>
      </div>
    </section>

    <section class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-6 space-y-4">
      <div>
        <h2 class="text-2xl text-primary dark:text-zinc-100">O que elas dizem de verdade</h2>
        <p class="text-xs text-gray-500 mt-1">
          A Ana anota, com as palavras de cada pessoa, o que a preocupa e o que ela quer que mude. Aqui aparecem só as frases (sem nome), dos últimos 6 meses — {{ vozes?.total ?? 0 }} conversa(s).
        </p>
      </div>
      <div v-if="vozes">
        <h3 class="rotulo">O que mais preocupa</h3>
        <p v-if="!vozes.dores.length" class="text-sm italic text-gray-400">Ainda sem registros.</p>
        <ul class="space-y-1 text-sm">
          <li v-for="(d, i) in vozes.dores.slice(0, 8)" :key="i">“{{ d.texto }}” <span class="text-xs text-gray-400">{{ d.area }}</span></li>
        </ul>
        <h3 class="rotulo mt-4">O que querem que mude</h3>
        <p v-if="!vozes.objetivos.length" class="text-sm italic text-gray-400">Ainda sem registros.</p>
        <ul class="space-y-1 text-sm">
          <li v-for="(d, i) in vozes.objetivos.slice(0, 8)" :key="i">“{{ d.texto }}”</li>
        </ul>
        <div class="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <h3 class="rotulo">Objeções</h3>
            <p v-for="[k, n] in vozes.objecoes" :key="k">{{ k }} <span class="text-gray-400">· {{ n }}</span></p>
          </div>
          <div>
            <h3 class="rotulo">De onde vêm</h3>
            <p v-for="[k, n] in vozes.origens" :key="k">{{ k }} <span class="text-gray-400">· {{ n }}</span></p>
          </div>
        </div>
      </div>
      <div class="border-t border-gray-100 dark:border-zinc-800 pt-4 space-y-3">
        <Button variant="outline" icon="ph:sparkle-bold" :loading="analisando" @click="analisar">Encontrar padrões e frases com IA</Button>
        <p v-if="erro" class="text-sm text-danger">{{ erro }}</p>
        <template v-if="analise">
          <h3 class="rotulo">Padrões</h3>
          <ul class="list-disc pl-5 text-sm space-y-1"><li v-for="p in analise.padroes" :key="p">{{ p }}</li></ul>
          <h3 class="rotulo">Frases para bio, post ou stories</h3>
          <ul class="text-sm space-y-2"><li v-for="f in analise.frases" :key="f" class="rounded-xl bg-secondary/10 px-3 py-2">{{ f }}</li></ul>
          <p class="text-xs text-gray-400">Revise antes de publicar (Provimento 205/2021). As sugestões para cada bloco aparecem no mapa, ao lado.</p>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import Button from '../Button.vue'
import { MAPA_EMPATIA } from '../../../shared/types/crm'

interface Vozes { total: number; dores: { texto: string; area: string | null }[]; objetivos: { texto: string }[]; objecoes: [string, number][]; origens: [string, number][] }
interface Analise { padroes: string[]; frases: string[]; sugestoes: Record<string, string | null> }

const form = reactive<Record<string, string>>({})
const vozes = ref<Vozes | null>(null)
const analise = ref<Analise | null>(null)
const salvando = ref(false)
const analisando = ref(false)
const msg = ref('')
const erro = ref('')

onMounted(async () => {
  const [e, v] = await Promise.all([$fetch<Record<string, string>>('/api/escritorio'), $fetch<Vozes>('/api/mapa/vozes')])
  for (const m of MAPA_EMPATIA) form[m.chave] = e[m.chave] ?? ''
  vozes.value = v
})

async function salvar() {
  salvando.value = true
  try {
    await $fetch('/api/escritorio', { method: 'PUT', body: { ...form } })
    msg.value = 'Salvo. A Ana já usa o novo mapa.'
    setTimeout(() => { msg.value = '' }, 3000)
  } finally {
    salvando.value = false
  }
}

async function analisar() {
  analisando.value = true
  erro.value = ''
  try {
    analise.value = await $fetch<Analise>('/api/mapa/analisar', { method: 'POST' })
  } catch (e: any) {
    erro.value = e?.data?.message || 'Não foi possível analisar agora.'
  } finally {
    analisando.value = false
  }
}
</script>

<style scoped>
.rotulo { @apply text-[10px] font-bold uppercase tracking-widest text-primary dark:text-zinc-300 mb-1.5; }
</style>
