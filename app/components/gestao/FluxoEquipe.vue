<template>
  <section class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-6 space-y-4">
    <div>
      <h2 class="text-2xl text-primary dark:text-zinc-100">Fluxo de trabalho: quem faz o quê</h2>
      <p class="text-xs text-gray-500 mt-1">
        O manual de atribuições do escritório, dentro do sistema. Ao mudar de etapa, o caso passa automaticamente para a pessoa responsável
        e aparece em “Só as minhas” na tela Hoje. A cadência (o que fazer e quando) é a mesma do “Registrar andamento”.
      </p>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm min-w-[640px]">
        <thead>
          <tr class="text-left text-[10px] uppercase tracking-widest text-gray-400">
            <th class="py-2 font-semibold">Etapa</th><th class="font-semibold">Primeira ação e prazo</th><th class="font-semibold">Entregável</th><th class="font-semibold w-56">Responsável</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in etapas" :key="e.id" class="border-t border-gray-100 dark:border-zinc-800 align-top">
            <td class="py-2.5 font-medium">{{ e.nome }}</td>
            <td class="py-2.5">{{ CADENCIA[e.id]?.acao ?? '—' }} <span class="text-xs text-gray-400">{{ prazoTexto(CADENCIA[e.id]?.dias) }}</span><code v-if="CADENCIA[e.id]?.modelo" class="ml-1 text-xs">{{ CADENCIA[e.id]?.modelo }}</code></td>
            <td class="py-2.5 text-gray-500">{{ ENTREGAVEL[e.id] }}</td>
            <td class="py-2">
              <select v-model="resp[e.id]" class="w-full rounded-full border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-1.5 text-sm" @change="salvar(e.id)">
                <option value="">Quem registrar o andamento</option>
                <option v-for="u in equipe" :key="u.id" :value="u.id">{{ u.name }}<template v-if="u.cargo"> — {{ u.cargo }}</template></option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-xs text-gray-500">
      <b>Rotina de acompanhamento sugerida:</b> segunda-feira, 20 minutos com a equipe olhando Relatórios → “Qualidade e equipe” (atrasos por pessoa)
      e a etapa-gargalo; sexta-feira, revisão por amostragem de 3 casos.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { CADENCIA, ETAPAS, chaveResponsavelEtapa } from '../../../shared/types/crm'
import type { Profile } from '../../../shared/types/profile'

const props = defineProps<{ usuarios: (Profile & { cargo?: string | null })[] }>()
const equipe = computed(() => props.usuarios.filter(u => u.role === 'admin' || u.role === 'equipe'))
const etapas = ETAPAS.filter(e => e.aberta)
const resp = reactive<Record<string, string>>({})

const ENTREGAVEL: Record<string, string> = {
  novo: 'Resposta em minutos; triagem iniciada',
  qualificacao: 'Triagem completa e convite para a consulta',
  agendado: 'Consulta confirmada, pagamento e lembrete',
  diagnostico: 'Diagnóstico (5 porquês e viabilidade) e resumo enviado',
  proposta: 'Proposta com o que está em jogo; follow-ups 24h/7d/final',
  ativo: 'Caso aberto, procuração, documentos e prazos na agenda',
}
const prazoTexto = (d?: number) => (d == null ? '' : d < 0 ? `(${-d} dia antes)` : d === 0 ? '(no mesmo dia)' : `(em ${d} dia${d > 1 ? 's' : ''})`)

onMounted(async () => {
  const e = await $fetch<Record<string, string>>('/api/escritorio')
  for (const x of etapas) resp[x.id] = e[chaveResponsavelEtapa(x.id)] ?? ''
})
async function salvar(etapaId: string) {
  await $fetch('/api/escritorio', { method: 'PUT', body: { [chaveResponsavelEtapa(etapaId)]: resp[etapaId] ?? '' } })
}
</script>
