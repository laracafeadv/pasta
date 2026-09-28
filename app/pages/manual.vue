<template>
  <div class="space-y-6">
    <div>
      <p class="eyebrow">Gestão</p>
      <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Padrões operacionais</h1>
      <p class="text-sm text-gray-500 mt-2 max-w-2xl">
        O passo a passo de cada etapa do atendimento — o que você faz e o que o sistema já faz sozinho.
        Serve de referência para você e, no futuro, para quem entrar no escritório.
      </p>
    </div>

    <!-- Alternância Fluxo / Serviços -->
    <div class="flex gap-2">
      <button type="button" class="tab-btn" :class="{ 'tab-btn-ativo': modo === 'fluxo' }" @click="modo = 'fluxo'">
        <Icon name="ph:flow-arrow-bold" class="align-middle" /> Fluxo do atendimento
      </button>
      <button type="button" class="tab-btn" :class="{ 'tab-btn-ativo': modo === 'servicos' }" @click="modo = 'servicos'">
        <Icon name="ph:scales-bold" class="align-middle" /> Serviços e documentos
      </button>
    </div>

    <div v-if="modo === 'fluxo'" class="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
      <!-- Índice das fases -->
      <nav class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-3 lg:sticky lg:top-24 space-y-1">
        <button
          v-for="(f, i) in FASES" :key="f.id" type="button"
          class="w-full flex items-center gap-3 text-left px-4 py-3 rounded-2xl transition-colors"
          :class="fase === f.id ? 'bg-primary text-white' : 'hover:bg-secondary/10 dark:hover:bg-white/5 text-primary dark:text-zinc-100'"
          @click="fase = f.id"
        >
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                :class="fase === f.id ? 'bg-white/20' : 'bg-secondary/20 text-secondary-dark'">{{ i + 1 }}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold leading-tight truncate">{{ f.nome }}</span>
            <span class="block text-[10px] mt-0.5" :class="fase === f.id ? 'text-white/70' : 'text-gray-400'">{{ f.passos.length }} passo(s) · {{ f.passos.filter(p => p.automatico === 'faz').length }} automático(s)</span>
          </span>
        </button>
      </nav>

      <!-- Conteúdo da fase -->
      <section v-if="atual" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-6 sm:p-8 space-y-6">
        <div>
          <h2 class="text-2xl text-primary dark:text-zinc-100">{{ atual.nome }}</h2>
          <p class="text-sm text-gray-500 mt-1">{{ atual.resumo }}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-success" /> o sistema faz sozinho</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-warning" /> o sistema só avisa — você ainda envia</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-secondary" /> você faz do zero</span>
          <span class="ml-auto font-semibold">{{ atual.passos.length }} passo(s)</span>
        </div>

        <ol class="space-y-2.5">
          <li v-for="(passo, i) in atual.passos" :key="i"
              class="rounded-2xl border-l-[3px] p-3.5 flex gap-3.5 bg-white dark:bg-zinc-800/60"
              :class="passo.automatico === 'faz' ? 'border-success' : passo.automatico === 'avisa' ? 'border-warning' : 'border-secondary'">
            <span class="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                  :class="passo.automatico === 'faz' ? 'bg-success/15 text-success-dark' : passo.automatico === 'avisa' ? 'bg-warning/15 text-warning-dark' : 'bg-secondary/15 text-secondary-dark'">{{ i + 1 }}</span>
            <div class="min-w-0">
              <p class="text-sm text-primary dark:text-zinc-100 font-semibold">{{ passo.titulo }}</p>
              <p class="text-sm text-gray-600 dark:text-zinc-300 mt-0.5 leading-relaxed">{{ passo.texto }}</p>
              <p v-if="passo.automatico === 'faz'" class="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-success-dark bg-success/10 px-2.5 py-1 rounded-full">
                <Icon name="ph:sparkle-bold" /> O sistema faz isso sozinho, sem você clicar em nada
              </p>
              <p v-else-if="passo.automatico === 'avisa'" class="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-warning-dark bg-warning/10 px-2.5 py-1 rounded-full">
                <Icon name="ph:bell-bold" /> O sistema avisa — você ainda precisa enviar
              </p>
            </div>
          </li>
        </ol>

        <div v-if="atual.links?.length" class="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
          <NuxtLink v-for="l in atual.links" :key="l.to" :to="l.to" class="chip">
            <Icon name="ph:arrow-square-out-bold" class="align-middle" /> {{ l.nome }}
          </NuxtLink>
        </div>
      </section>
    </div>

    <!-- Serviços e documentos -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
      <nav class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-3 lg:sticky lg:top-24 space-y-1">
        <button
          v-for="s in SERVICOS" :key="s.id" type="button"
          class="w-full text-left px-4 py-2.5 rounded-2xl text-sm font-semibold transition-colors"
          :class="servico === s.id ? 'bg-primary text-white' : 'hover:bg-secondary/10 dark:hover:bg-white/5 text-primary dark:text-zinc-100'"
          @click="servico = s.id"
        >{{ s.nome }}</button>
      </nav>

      <section v-if="servicoAtual" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-6 sm:p-8 space-y-6">
        <div>
          <h2 class="text-2xl text-primary dark:text-zinc-100">{{ servicoAtual.nome }}</h2>
          <p class="text-sm text-gray-500 mt-1">{{ servicoAtual.resumo }}</p>
        </div>

        <!-- Variantes (judicial/extrajudicial etc.) -->
        <div v-if="servicoAtual.variantes.length > 1" class="flex flex-wrap gap-2">
          <button
            v-for="v in servicoAtual.variantes" :key="v.id" type="button"
            class="chip"
            :class="variante === v.id ? '!border-primary !text-primary dark:!text-white' : ''"
            @click="variante = v.id"
          >{{ v.nome }}</button>
        </div>

        <ol v-if="varianteAtual" class="space-y-2.5">
          <li v-for="(f, i) in varianteAtual.fases" :key="i"
              class="rounded-2xl border-l-[3px] border-secondary p-3.5 flex gap-3.5 bg-white dark:bg-zinc-800/60">
            <span class="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 bg-secondary/15 text-secondary-dark">{{ i + 1 }}</span>
            <div class="min-w-0">
              <p class="text-sm text-primary dark:text-zinc-100 font-semibold">{{ f.titulo }}</p>
              <p class="text-sm text-gray-600 dark:text-zinc-300 mt-0.5 leading-relaxed">{{ f.texto }}</p>
            </div>
          </li>
        </ol>

        <!-- Checklist de documentos -->
        <div v-if="servicoAtual.documentos.length" class="pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-4">
          <p class="text-sm font-semibold text-primary dark:text-zinc-100">Checklist de documentos</p>
          <div v-for="(g, gi) in servicoAtual.documentos" :key="gi">
            <p v-if="g.grupo" class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">{{ g.grupo }}</p>
            <ul class="space-y-1">
              <li v-for="(item, ii) in g.itens" :key="ii" class="text-sm text-gray-600 dark:text-zinc-300 flex gap-2">
                <Icon name="ph:check-square-bold" class="text-secondary mt-0.5 shrink-0" /> {{ item }}
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { definePageMeta, useHead } from '#imports'
import { SERVICOS } from '~~/shared/data/servicos'

definePageMeta({ middleware: ['auth', 'admin'] })
useHead({ title: 'Padrões operacionais' })

interface Passo { titulo: string; texto: string; automatico?: 'faz' | 'avisa' }
interface Fase { id: string; nome: string; resumo: string; passos: Passo[]; links?: { nome: string; to: string }[] }

const FASES: Fase[] = [
  {
    id: 'atendimento',
    nome: '1. Atendimento inicial',
    resumo: 'Do primeiro "oi" no WhatsApp até a consulta agendada e paga.',
    passos: [
      { titulo: 'A cliente escreve no WhatsApp', texto: 'A conversa entra no CRM e o contato é criado. A triagem automática por IA (5 porquês, sem orientação jurídica) só roda se você configurar a chave da OpenAI — como você optou por não pagar por isso, hoje essa parte é manual: é você (ou a equipe) que responde.', automatico: 'avisa' },
      { titulo: 'Triagem x consulta', texto: 'A triagem é gratuita e só entende os fatos. A partir do momento em que se analisa direitos, riscos e estratégia do caso concreto, é consulta — e é paga.' },
      { titulo: 'Convite para a consulta', texto: 'Depois da triagem, o sistema sugere convidar para a consulta estratégica (mensagem /consulta) e move o contato para "Em qualificação".', automatico: 'avisa' },
      { titulo: 'Pagamento e agendamento', texto: 'Confirma o pagamento (PIX) e agenda o horário. Ao registrar, o contato vai para "Consulta agendada" e entra na Agenda.' },
      { titulo: 'Formulário pré-consulta', texto: 'Um clique já gera o link e copia pra você: abra a ficha da cliente e clique em "Gerar e copiar link do formulário". É só colar no seu WhatsApp normal e mandar. Só tem o resumo livre — se quiser perguntar algo específico deste caso, use "+ perguntas deste caso" antes de gerar o link.' },
      { titulo: 'Lembrete', texto: 'No dia anterior, o sistema lembra de mandar a mensagem /lembrete com data, hora e link — mas é você que manda.', automatico: 'avisa' },
    ],
    links: [{ nome: 'Ir para o Hoje', to: '/crm' }, { nome: 'Mensagens prontas', to: '/mensagens' }],
  },
  {
    id: 'consulta',
    nome: '2. Consulta e diagnóstico',
    resumo: 'A análise do caso: os 5 porquês, a viabilidade e o que está em jogo.',
    passos: [
      { titulo: 'Roteiro da consulta', texto: 'Abra a aba Diagnóstico da ficha: roteiro por área, os 5 porquês até a causa raiz e o objetivo real da cliente.' },
      { titulo: 'Checagem de viabilidade', texto: 'Marque prescrição, competência, provas e conflito de interesses. Registre os riscos por escrito — eles vão para a proposta.' },
      { titulo: '"O que está em jogo"', texto: 'Registre o valor aproximado do que está em jogo (a meação, a pensão, o patrimônio) para ancorar o valor do honorário.' },
      { titulo: 'Decisão', texto: 'Marque viável, com ressalvas ou inviável. Isso fica no histórico do caso.' },
      { titulo: 'Feedback pós-consulta', texto: 'No dia seguinte, o sistema lembra de mandar a mensagem /feedback e avisa que a proposta vem em até 2 dias úteis — mas é você que envia.', automatico: 'avisa' },
    ],
    links: [{ nome: 'Ir para o Hoje', to: '/crm' }],
  },
  {
    id: 'fechamento',
    nome: '3. Proposta e fechamento',
    resumo: 'Da proposta enviada ao contrato assinado.',
    passos: [
      { titulo: 'Montar a proposta', texto: 'Na aba Diagnóstico, "Montar mensagem de proposta" já usa o que está em jogo e o honorário proposto.' },
      { titulo: 'Registrar o honorário', texto: 'Contrato fixo, êxito, assessoria mensal ou em camadas (arranque + mensal + % de êxito) — o que fizer sentido para o caso.' },
      { titulo: 'Follow-up de proposta', texto: '24h depois da proposta, 7 dias depois, e um follow-up final aos 14 dias — o sistema avisa em cada marco com a mensagem certa, mas é você que manda.', automatico: 'avisa' },
      { titulo: 'Dados para o contrato', texto: 'Depois de fechar, envie o link com /formulario: reúne CPF, endereço e demais dados formais pra procuração e contrato. É diferente do formulário pré-consulta — esse aqui só faz sentido depois que ela já fechou.' },
      { titulo: 'Contrato e procuração', texto: 'Gere os dois em Word a partir da ficha, já com a qualificação preenchida.' },
    ],
    links: [{ nome: 'Ir para o Financeiro', to: '/honorarios' }],
  },
  {
    id: 'caso',
    nome: '4. Abertura do caso',
    resumo: 'Cliente virou cliente ativa: organizar a pasta e abrir o processo.',
    passos: [
      { titulo: 'Pasta no Google Drive', texto: 'Ao criar a pasta do cliente (ou automaticamente, no primeiro documento), o sistema cria a estrutura padrão: Recebidos, Documentos pessoais, Contrato, Peças, Provas, Comunicações, Financeiro e Arquivo.', automatico: 'faz' },
      { titulo: 'Arquivos do WhatsApp', texto: 'Fotos e documentos que a cliente manda pelo WhatsApp vão sozinhos para "00 Recebidos pelo WhatsApp" na pasta dela.', automatico: 'faz' },
      { titulo: 'Nome padrão dos arquivos', texto: 'AAAA-MM-DD_CLI-0000_TIPO_descrição_v01.ext — o código do cliente nunca expõe nome completo nem CPF.' },
      { titulo: 'Abrir o caso', texto: 'Cadastre o número do processo (validado no padrão CNJ), a vara ou o cartório e a parte contrária.' },
      { titulo: 'Checklist de documentos', texto: 'A lista de documentos por área já vem pronta; cobre os pendentes em um clique.' },
    ],
    links: [{ nome: 'Ir para Casos', to: '/casos' }],
  },
  {
    id: 'acompanhamento',
    nome: '5. Acompanhamento',
    resumo: 'Prazos, audiências e manter a cliente informada.',
    passos: [
      { titulo: 'Prazos em dias úteis', texto: 'A calculadora já considera fins de semana, feriados nacionais e o recesso de 20/12 a 20/01 (CPC art. 219/220/224).' },
      { titulo: 'Relatório semanal', texto: 'Quando um cliente ativo fica 7+ dias sem novidade registrada, a tela Hoje avisa e sugere a mensagem /relatorio-semanal — você decide se manda.', automatico: 'avisa' },
      { titulo: 'Revisão por amostragem', texto: 'Nos Relatórios, revise casos por amostragem (prazos, próxima ação, cliente informado, documentos, financeiro). Falha vira tarefa com prazo.' },
      { titulo: 'Aniversário', texto: 'A tela Hoje avisa aniversário do dia — o convite pra mandar parabéns é seu.', automatico: 'avisa' },
      { titulo: 'Classificação da cliente', texto: 'Promotora, neutra, fria ou detratora: calculada sozinha a partir da nota do NPS, sem você precisar marcar nada.', automatico: 'faz' },
    ],
    links: [{ nome: 'Ir para a Agenda', to: '/crm?aba=hoje&ver=calendario' }],
  },
  {
    id: 'encerramento',
    nome: '6. Encerramento e pós-venda',
    resumo: 'Fechar o caso sem perder o relacionamento.',
    passos: [
      { titulo: 'Encerrar o caso', texto: 'Registre o resultado (êxito, parcial, acordo, sem êxito ou desistência) e a data de encerramento.' },
      { titulo: 'Pós-venda agendado', texto: 'O sistema já agenda o lembrete de contato 30 dias depois (/pos-venda-30) e outro 1 ano depois (/pos-venda-1ano) — aparece na tela Hoje na hora certa, mas é você que envia.', automatico: 'avisa' },
      { titulo: 'Pesquisa de satisfação', texto: 'Convite e motivo são seus; a nota de 0 a 10 que a cliente responde já classifica ela sozinha na ficha.', automatico: 'avisa' },
      { titulo: 'Pedido de avaliação', texto: 'Só para quem deu nota alta: peça a avaliação no Google (/avaliacao).' },
      { titulo: 'Remarketing', texto: 'Quem não fechou entra no Remarketing, agrupado por demanda, e pode receber conteúdo a cada 45 dias — nunca quem pediu para não receber.' },
    ],
    links: [{ nome: 'Ir para o Remarketing', to: '/crm?aba=remarketing' }],
  },
]

const fase = ref(FASES[0]!.id)
const atual = computed(() => FASES.find(f => f.id === fase.value))

const modo = ref<'fluxo' | 'servicos'>('fluxo')
const servico = ref(SERVICOS[0]!.id)
const servicoAtual = computed(() => SERVICOS.find(s => s.id === servico.value))
const variante = ref(servicoAtual.value?.variantes[0]?.id ?? '')
const varianteAtual = computed(() => servicoAtual.value?.variantes.find(v => v.id === variante.value))

watch(servico, () => {
  variante.value = servicoAtual.value?.variantes[0]?.id ?? ''
})
</script>

<style scoped>
.chip { @apply text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:border-primary hover:text-primary dark:hover:text-white transition-colors inline-flex items-center gap-1.5; }
.tab-btn { @apply text-sm font-semibold px-4 py-2 rounded-full border border-gray-300 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:text-primary dark:hover:text-white transition-colors; }
.tab-btn-ativo { @apply bg-primary text-white border-primary; }
</style>
