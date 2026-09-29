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

      <!-- Painel do escritório: atalhos por categoria, no mesmo tom escuro da marca -->
      <template v-else>
        <div class="rounded-[2.5rem] bg-cafe text-cafe-creme px-6 py-10 sm:px-10 sm:py-12 relative overflow-hidden">
          <img src="/mono-light.png" alt="" class="absolute -right-16 -bottom-20 h-96 opacity-[0.05] pointer-events-none select-none" />

          <div class="relative z-10">
            <div class="flex flex-wrap items-end justify-between gap-4 mb-10">
              <div>
                <p class="eyebrow !text-cafe-creme/60">{{ saudacao }}</p>
                <h1 class="text-4xl sm:text-5xl mt-1">Painel do escritório</h1>
                <p class="text-sm text-cafe-creme/60 mt-2">Tudo o que você usa no dia a dia, num só lugar.</p>
              </div>
              <NuxtLink to="/crm" class="px-6 py-3 rounded-full bg-cafe-creme text-cafe text-xs font-semibold uppercase tracking-[0.14em] hover:bg-white transition-colors inline-flex items-center gap-2">
                <Icon name="ph:sun-bold" /> Ir para o Hoje
                <span v-if="crm.pendencias" class="min-w-[20px] h-5 px-1.5 rounded-full bg-danger text-white text-[11px] inline-flex items-center justify-center">{{ crm.pendencias }}</span>
              </NuxtLink>
            </div>

            <div class="space-y-9">
              <section v-for="grupo in grupos" :key="grupo.titulo">
                <h2 class="text-[10px] font-bold uppercase tracking-widest text-cafe-creme/45 mb-3">{{ grupo.titulo }}</h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NuxtLink
                    v-for="item in grupo.itens" :key="item.to" :to="item.to"
                    class="group rounded-3xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 p-5 flex items-start gap-4 transition-colors"
                  >
                    <span class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" :class="CORES_ICONE[grupo.cor]">
                      <Icon :name="item.icone" class="text-2xl" />
                    </span>
                    <span class="min-w-0">
                      <span class="flex items-center gap-2">
                        <span class="text-sm font-bold text-white">{{ item.nome }}</span>
                        <span v-if="item.badge" class="min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] inline-flex items-center justify-center shrink-0">{{ item.badge }}</span>
                      </span>
                      <span class="block text-xs text-cafe-creme/50 leading-relaxed mt-1">{{ item.desc }}</span>
                    </span>
                  </NuxtLink>
                </div>
              </section>
            </div>
          </div>
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

// Classes estáticas (Tailwind precisa ver a string completa para gerar o CSS).
const CORES_ICONE: Record<string, string> = {
  danger: 'bg-danger-400/25 text-danger-200',
  secondary: 'bg-secondary-400/25 text-secondary-100',
  success: 'bg-success-400/25 text-success-200',
  primary: 'bg-primary-300/25 text-primary-100',
}

// Agrupado pela rotina do dia a dia, não pela estrutura interna do sistema.
const grupos = computed(() => {
  const lista = [
    {
      titulo: 'O que fazer agora',
      cor: 'danger',
      itens: [
        { nome: 'Hoje', to: '/crm', desc: 'Lista, calendário e tarefas internas — tudo num só lugar.', icone: 'ph:sun-bold', badge: crm.pendencias || undefined },
      ],
    },
    {
      titulo: 'Meus clientes',
      cor: 'secondary',
      itens: [
        { nome: 'Funil e contatos', to: '/crm?aba=funil', desc: 'Todo o funil, de novo contato a cliente ativo.', icone: 'ph:kanban-bold' },
        { nome: 'Casos', to: '/clientes?aba=casos', desc: 'Processos ativos, número CNJ e partes.', icone: 'ph:briefcase-bold' },
        { nome: 'Mensagens', to: '/mensagens', desc: 'Biblioteca de mensagens prontas (/atalho).', icone: 'ph:chat-circle-text-bold' },
        { nome: 'Remarketing', to: '/crm?aba=remarketing', desc: 'Quem não fechou, por demanda e motivo.', icone: 'ph:arrow-counter-clockwise-bold' },
      ],
    },
    {
      titulo: 'Dinheiro',
      cor: 'success',
      itens: [
        { nome: isAdmin.value ? 'Financeiro' : 'Honorários', to: '/honorarios', desc: 'Propostas, contratos, caixa e preço mínimo.', icone: 'ph:wallet-bold' },
        { nome: 'Relatórios', to: '/relatorios', desc: 'Funil, gargalos, qualidade e propostas.', icone: 'ph:chart-bar-bold' },
      ],
    },
    {
      titulo: 'Escritório',
      cor: 'primary',
      itens: [
        { nome: 'Padrões operacionais', to: '/manual', desc: 'O passo a passo de cada etapa, e o que o sistema já faz sozinho.', icone: 'ph:list-checks-bold' },
      ],
    },
  ]
  if (isAdmin.value) {
    lista[3]!.itens.push(
      { nome: 'Ana', to: '/eva', desc: 'Ideias comerciais toda semana, sem custo de IA.', icone: 'ph:robot-bold' },
      { nome: 'Configurações', to: '/admin/escritorio', desc: 'Dados do escritório, PIX e posicionamento.', icone: 'ph:gear-bold' },
    )
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
