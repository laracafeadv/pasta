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

    <div class="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
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
          <span class="text-sm font-semibold leading-tight">{{ f.nome }}</span>
        </button>
      </nav>

      <!-- Conteúdo da fase -->
      <section v-if="atual" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-6 sm:p-8 space-y-6">
        <div>
          <h2 class="text-2xl text-primary dark:text-zinc-100">{{ atual.nome }}</h2>
          <p class="text-sm text-gray-500 mt-1">{{ atual.resumo }}</p>
        </div>

        <ol class="space-y-4">
          <li v-for="(passo, i) in atual.passos" :key="i" class="flex gap-4">
            <span class="w-7 h-7 rounded-full bg-secondary/15 text-secondary-dark text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{{ i + 1 }}</span>
            <div class="min-w-0">
              <p class="text-sm text-primary dark:text-zinc-100 font-semibold">{{ passo.titulo }}</p>
              <p class="text-sm text-gray-600 dark:text-zinc-300 mt-0.5 leading-relaxed">{{ passo.texto }}</p>
              <p v-if="passo.automatico" class="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-success-dark bg-success/10 px-2.5 py-1 rounded-full">
                <Icon name="ph:sparkle-bold" /> O sistema já faz isso sozinho
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { definePageMeta, useHead } from '#imports'

definePageMeta({ middleware: ['auth', 'admin'] })
useHead({ title: 'Padrões operacionais' })

interface Passo { titulo: string; texto: string; automatico?: boolean }
interface Fase { id: string; nome: string; resumo: string; passos: Passo[]; links?: { nome: string; to: string }[] }

const FASES: Fase[] = [
  {
    id: 'atendimento',
    nome: '1. Atendimento inicial',
    resumo: 'Do primeiro "oi" no WhatsApp até a consulta agendada e paga.',
    passos: [
      { titulo: 'A cliente escreve no WhatsApp', texto: 'A conversa entra no CRM, o contato é criado e a Ana faz a triagem: entende a situação com a técnica dos 5 porquês, sem dar orientação jurídica.', automatico: true },
      { titulo: 'Triagem x consulta', texto: 'A triagem é gratuita e só entende os fatos. A partir do momento em que se analisa direitos, riscos e estratégia do caso concreto, é consulta — e é paga.' },
      { titulo: 'Convite para a consulta', texto: 'Depois da triagem, o sistema sugere convidar para a consulta estratégica (mensagem /consulta) e move o contato para "Em qualificação".', automatico: true },
      { titulo: 'Pagamento e agendamento', texto: 'Confirma o pagamento (PIX) e agenda o horário. Ao registrar, o contato vai para "Consulta agendada" e entra na Agenda.' },
      { titulo: 'Formulário pré-consulta', texto: 'Envie a mensagem /pre-consulta: um formulário leve (área, resumo da situação, o que preocupa, o que espera, urgência) para você já chegar com contexto. Sem dados formais — isso fica só para depois de fechar.' },
      { titulo: 'Lembrete', texto: 'No dia anterior, o sistema lembra de mandar a mensagem /lembrete com data, hora e link.', automatico: true },
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
      { titulo: 'Feedback pós-consulta', texto: 'No dia seguinte, o sistema lembra de mandar a mensagem /feedback e avisa que a proposta vem em até 2 dias úteis.', automatico: true },
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
      { titulo: 'Follow-up automático', texto: '24h depois da proposta, 7 dias depois, e um follow-up final aos 14 dias — cada um com a mensagem certa.', automatico: true },
      { titulo: 'Formulário da cliente', texto: 'Depois de fechar, envie o formulário (/formulario): ele reúne os dados da procuração e do contrato, sem barrar a consulta antes de fechar.' },
      { titulo: 'Contrato e procuração', texto: 'Gere os dois em Word a partir da ficha, já com a qualificação preenchida.' },
    ],
    links: [{ nome: 'Ir para o Financeiro', to: '/honorarios' }],
  },
  {
    id: 'caso',
    nome: '4. Abertura do caso',
    resumo: 'Cliente virou cliente ativa: organizar a pasta e abrir o processo.',
    passos: [
      { titulo: 'Pasta no Google Drive', texto: 'Ao criar a pasta do cliente (ou automaticamente, no primeiro documento), o sistema cria a estrutura padrão: Recebidos, Documentos pessoais, Contrato, Peças, Provas, Comunicações, Financeiro e Arquivo.', automatico: true },
      { titulo: 'Arquivos do WhatsApp', texto: 'Fotos e documentos que a cliente manda pelo WhatsApp vão sozinhos para "00 Recebidos pelo WhatsApp" na pasta dela.', automatico: true },
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
      { titulo: 'Relatório semanal', texto: 'Quando um cliente ativo fica 7+ dias sem novidade registrada, a tela Hoje avisa e sugere a mensagem /relatorio-semanal.', automatico: true },
      { titulo: 'Revisão por amostragem', texto: 'Nos Relatórios, revise casos por amostragem (prazos, próxima ação, cliente informado, documentos, financeiro). Falha vira tarefa com prazo.' },
      { titulo: 'Aniversários e classificação', texto: 'A tela Hoje avisa aniversário do dia; a classificação (promotora/neutra/fria/detratora) fica na ficha do cliente e é definida automaticamente pela nota do NPS.', automatico: true },
    ],
    links: [{ nome: 'Ir para a Agenda', to: '/agenda' }],
  },
  {
    id: 'encerramento',
    nome: '6. Encerramento e pós-venda',
    resumo: 'Fechar o caso sem perder o relacionamento.',
    passos: [
      { titulo: 'Encerrar o caso', texto: 'Registre o resultado (êxito, parcial, acordo, sem êxito ou desistência) e a data de encerramento.' },
      { titulo: 'Pós-venda agendado', texto: 'O sistema já agenda um contato 30 dias depois (/pos-venda-30) e outro 1 ano depois (/pos-venda-1ano).', automatico: true },
      { titulo: 'Pesquisa de satisfação', texto: 'Convite, nota de 0 a 10 e o motivo — a nota classifica a cliente sozinha na ficha dela.', automatico: true },
      { titulo: 'Pedido de avaliação', texto: 'Só para quem deu nota alta: peça a avaliação no Google (/avaliacao).' },
      { titulo: 'Remarketing', texto: 'Quem não fechou entra no Remarketing, agrupado por demanda, e pode receber conteúdo a cada 45 dias — nunca quem pediu para não receber.' },
    ],
    links: [{ nome: 'Ir para o Remarketing', to: '/crm?aba=remarketing' }],
  },
]

const fase = ref(FASES[0]!.id)
const atual = computed(() => FASES.find(f => f.id === fase.value))
</script>

<style scoped>
.chip { @apply text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:border-primary hover:text-primary dark:hover:text-white transition-colors inline-flex items-center gap-1.5; }
</style>
