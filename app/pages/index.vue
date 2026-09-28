<template>
  <div class="min-h-[calc(100vh-96px)] px-4 py-10">
    <div class="container mx-auto max-w-6xl">

      <!-- Visitante: convite para entrar -->
      <div v-if="!user" class="w-full max-w-3xl mx-auto rounded-[2.5rem] bg-cafe text-cafe-creme px-6 py-14 sm:px-14 text-center relative overflow-hidden">
        <img src="/mono-light.png" alt="" class="absolute -right-10 -bottom-16 h-80 opacity-[0.06] pointer-events-none select-none" />
        <p class="eyebrow !text-cafe-creme/70">Lara Café Advocacia &amp; Consultoria</p>
        <h1 class="text-4xl sm:text-5xl mt-4 leading-tight">Área restrita do escritório</h1>
        <p class="mt-4 text-cafe-creme/75 max-w-lg mx-auto">CRM, conversas de WhatsApp e honorários em um só lugar. Acesso restrito ao escritório.</p>
        <NuxtLink to="/login" class="inline-block mt-8 px-8 py-3 rounded-full border border-cafe-creme/50 text-xs font-semibold uppercase tracking-[0.16em] hover:bg-cafe-creme hover:text-cafe transition-colors">Entrar</NuxtLink>
      </div>

      <!-- Aguardando liberação -->
      <div v-else-if="aguardando" class="w-full max-w-3xl mx-auto rounded-[2.5rem] bg-cafe text-cafe-creme px-6 py-14 sm:px-14 text-center relative overflow-hidden">
        <img src="/mono-light.png" alt="" class="absolute -right-10 -bottom-16 h-80 opacity-[0.06] pointer-events-none select-none" />
        <p class="eyebrow !text-cafe-creme/70">Lara Café Advocacia &amp; Consultoria</p>
        <h1 class="text-4xl sm:text-5xl mt-4 leading-tight">Cadastro recebido</h1>
        <p class="mt-4 text-cafe-creme/75 max-w-lg mx-auto">
          Sua conta ainda não tem acesso aos dados do escritório. Fale com a Dra. Lara para liberar o seu acesso.
        </p>
      </div>

      <!-- Painel do escritório: atalhos por categoria -->
      <template v-else>
        <div class="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p class="eyebrow">{{ saudacao }}</p>
            <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Painel do escritório</h1>
            <p class="text-sm text-gray-500 mt-2">Tudo o que você usa no dia a dia, num só lugar.</p>
          </div>
          <NuxtLink to="/crm" class="px-6 py-3 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-[0.14em] hover:bg-primary-light transition-colors inline-flex items-center gap-2">
            <Icon name="ph:sun-bold" /> Ir para o Hoje
            <span v-if="crm.pendencias" class="min-w-[20px] h-5 px-1.5 rounded-full bg-danger text-white text-[11px] inline-flex items-center justify-center">{{ crm.pendencias }}</span>
          </NuxtLink>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          <section v-for="grupo in grupos" :key="grupo.titulo" class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-6">
            <h2 class="text-[10px] font-bold uppercase tracking-widest text-secondary-dark mb-3">{{ grupo.titulo }}</h2>
            <div class="space-y-1">
              <NuxtLink
                v-for="item in grupo.itens" :key="item.to" :to="item.to"
                class="flex items-start gap-3 rounded-2xl px-3 py-2.5 -mx-3 hover:bg-secondary/10 dark:hover:bg-white/5 transition-colors group"
              >
                <Icon :name="item.icone" class="text-xl text-secondary-dark mt-0.5 shrink-0" />
                <span class="min-w-0">
                  <span class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-primary dark:text-zinc-100 group-hover:underline">{{ item.nome }}</span>
                    <span v-if="item.badge" class="min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] inline-flex items-center justify-center shrink-0">{{ item.badge }}</span>
                  </span>
                  <span class="block text-xs text-gray-500 dark:text-zinc-400 leading-snug">{{ item.desc }}</span>
                </span>
              </NuxtLink>
            </div>
          </section>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { navigateTo, useHead, useSupabaseUser } from '#imports'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '../stores/profile'
import { useCrmStore } from '../stores/crm'

useHead({ title: 'Lara Café' })

const user = useSupabaseUser()
const profileStore = useProfileStore()
const { profile } = storeToRefs(profileStore)
const aguardando = computed(() => profile.value?.role === 'user')
const isAdmin = computed(() => profile.value?.role === 'admin')

const crm = useCrmStore()

const saudacao = computed(() => {
  const h = new Date().getHours()
  const nome = profile.value?.name?.split(' ')[0]
  const parte = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  return nome ? `${parte}, ${nome}` : parte
})

const grupos = computed(() => {
  const lista = [
    {
      titulo: 'CRM e relacionamento',
      itens: [
        { nome: 'Hoje', to: '/crm', desc: 'Atrasadas, para hoje e sem próxima ação.', icone: 'ph:sun-bold', badge: crm.pendencias || undefined },
        { nome: 'Funil e contatos', to: '/crm?aba=funil', desc: 'Todo o funil, de novo contato a cliente ativo.', icone: 'ph:kanban-bold' },
        { nome: 'Carteira', to: '/crm?aba=carteira', desc: 'Promotoras, neutras, frias e detratoras.', icone: 'ph:heart-bold' },
        { nome: 'Remarketing', to: '/crm?aba=remarketing', desc: 'Quem não fechou, por demanda e motivo.', icone: 'ph:arrow-counter-clockwise-bold' },
      ],
    },
    {
      titulo: 'Agenda e casos',
      itens: [
        { nome: 'Agenda', to: '/agenda', desc: 'Prazos, audiências, reuniões e consultas.', icone: 'ph:calendar-bold' },
        { nome: 'Casos', to: '/casos', desc: 'Processos ativos, número CNJ e partes.', icone: 'ph:briefcase-bold' },
      ],
    },
    {
      titulo: 'Conversa e mensagens',
      itens: [
        { nome: 'Mensagens', to: '/mensagens', desc: 'Biblioteca de mensagens prontas (/atalho).', icone: 'ph:chat-circle-text-bold' },
      ],
    },
    {
      titulo: 'Financeiro',
      itens: [
        { nome: isAdmin.value ? 'Financeiro' : 'Honorários', to: '/honorarios', desc: 'Propostas, contratos, caixa e preço mínimo.', icone: 'ph:wallet-bold' },
      ],
    },
    {
      titulo: 'Gestão',
      itens: [
        { nome: 'Relatórios', to: '/relatorios', desc: 'Funil, gargalos, qualidade e propostas.', icone: 'ph:chart-bar-bold' },
        { nome: 'Padrões operacionais', to: '/manual', desc: 'O passo a passo de cada etapa, e o que o sistema já faz sozinho.', icone: 'ph:list-checks-bold' },
      ],
    },
  ]
  if (isAdmin.value) {
    lista.push({
      titulo: 'Assistente e configurações',
      itens: [
        { nome: 'Ana (IA)', to: '/eva', desc: 'Instruções, base de conhecimento e teste.', icone: 'ph:robot-bold' },
        { nome: 'Configurações', to: '/admin/escritorio', desc: 'Dados do escritório, PIX e posicionamento.', icone: 'ph:gear-bold' },
      ],
    })
  }
  return lista
})

onMounted(async () => {
  if (window.location.hash) {
    const type = new URLSearchParams(window.location.hash.substring(1)).get('type')
    if (type === 'invite' || type === 'recovery') return navigateTo('/confirm' + window.location.hash)
  }
  if (!user.value) return
  if (!profileStore.profile) await profileStore.fetchMe()
  if (profile.value?.role === 'admin' || profile.value?.role === 'equipe') crm.fetchAgenda()
})
</script>
