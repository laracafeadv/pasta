<template>
  <div class="min-h-[calc(100vh-96px)] px-4 py-8 md:px-8 md:py-10">
    <div class="mx-auto" :class="user && !aguardando ? 'max-w-7xl' : 'max-w-6xl'">

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

      <!-- Equipe: Dashboard do escritório (porta de entrada do CRM) -->
      <DashboardPainel v-else />

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { navigateTo, useHead, useSupabaseUser } from '#imports'
import { storeToRefs } from 'pinia'
import DashboardPainel from '../components/dashboard/DashboardPainel.vue'
import { useProfileStore } from '../stores/profile'

useHead({ title: 'Dashboard' })

const user = useSupabaseUser()
const profileStore = useProfileStore()
const { profile } = storeToRefs(profileStore)
const aguardando = computed(() => profile.value?.role === 'user')

onMounted(async () => {
  if (window.location.hash) {
    const type = new URLSearchParams(window.location.hash.substring(1)).get('type')
    if (type === 'invite' || type === 'recovery') return navigateTo('/confirm' + window.location.hash)
  }
  if (!user.value) return
  if (!profileStore.profile) await profileStore.fetchMe()
})
</script>
