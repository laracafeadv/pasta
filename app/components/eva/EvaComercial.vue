<template>
  <div class="space-y-5">
    <div class="rounded-2xl border border-secondary/30 bg-secondary/10 p-4 text-sm space-y-1">
      <p><b>Toda semana, uma leitura do seu comercial.</b> A Ana olha o funil, as propostas paradas e os motivos de perda, e deixa aqui o que vale sua atenção — sem custar nada além da sua assinatura.</p>
    </div>

    <p v-if="carregando" class="text-sm text-gray-400">Carregando…</p>
    <p v-else-if="!grupos.length" class="text-sm italic text-gray-400">Ainda sem ideias registradas — a primeira leitura semanal aparece aqui em breve.</p>

    <section v-for="g in grupos" :key="g.semana" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-5 sm:p-6">
      <h2 class="text-lg font-semibold text-primary dark:text-zinc-100 mb-3">{{ g.rotulo }}</h2>
      <div class="space-y-2.5">
        <div v-for="it in g.itens" :key="it.id" class="rounded-2xl border-l-[3px] border-secondary p-3.5 bg-white dark:bg-zinc-800/60 flex gap-3">
          <Icon name="ph:lightbulb-bold" class="text-secondary shrink-0 mt-0.5" />
          <p class="text-sm text-gray-700 dark:text-zinc-200">{{ it.texto }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

interface Insight { id: number; texto: string; categoria: string | null; created_at: string }
const lista = ref<Insight[]>([])
const carregando = ref(false)

async function carregar() {
  carregando.value = true
  try {
    lista.value = await $fetch<Insight[]>('/api/ana/insights')
  } finally {
    carregando.value = false
  }
}
onMounted(carregar)

function inicioDaSemana(d: Date) {
  const x = new Date(d)
  x.setDate(x.getDate() - x.getDay())
  x.setHours(0, 0, 0, 0)
  return x
}
const grupos = computed(() => {
  const mapa = new Map<string, { rotulo: string; itens: Insight[] }>()
  for (const it of lista.value) {
    const inicio = inicioDaSemana(new Date(it.created_at))
    const chave = inicio.toISOString().slice(0, 10)
    if (!mapa.has(chave)) {
      const rotulo = `Semana de ${inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`
      mapa.set(chave, { rotulo, itens: [] })
    }
    mapa.get(chave)!.itens.push(it)
  }
  return Array.from(mapa.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(([semana, v]) => ({ semana, ...v }))
})
</script>
