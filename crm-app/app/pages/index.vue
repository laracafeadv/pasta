<template>
  <div class="min-h-[calc(100vh-96px)] flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-3xl rounded-[2.5rem] bg-cafe text-cafe-creme px-6 py-14 sm:px-14 text-center relative overflow-hidden">
      <img src="/mono-light.png" alt="" class="absolute -right-10 -bottom-16 h-80 opacity-[0.06] pointer-events-none select-none" />
      <p class="eyebrow !text-cafe-creme/70">Lara Café Advocacia &amp; Consultoria</p>

      <template v-if="!user">
        <h1 class="text-4xl sm:text-5xl mt-4 leading-tight">Área restrita do escritório</h1>
        <p class="mt-4 text-cafe-creme/75 max-w-lg mx-auto">CRM, conversas de WhatsApp e honorários em um só lugar. Acesso restrito ao escritório.</p>
        <NuxtLink to="/login" class="inline-block mt-8 px-8 py-3 rounded-full border border-cafe-creme/50 text-xs font-semibold uppercase tracking-[0.16em] hover:bg-cafe-creme hover:text-cafe transition-colors">Entrar</NuxtLink>
      </template>

      <template v-else-if="aguardando">
        <h1 class="text-4xl sm:text-5xl mt-4 leading-tight">Cadastro recebido</h1>
        <p class="mt-4 text-cafe-creme/75 max-w-lg mx-auto">
          Sua conta ainda não tem acesso aos dados do escritório. Peça para a administração liberar o seu usuário em “Equipe”.
        </p>
      </template>

      <template v-else>
        <h1 class="text-4xl sm:text-5xl mt-4 leading-tight">Abrindo o CRM…</h1>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { navigateTo, useHead, useSupabaseUser } from '#imports'
import { useProfileStore } from '../stores/profile'

useHead({ title: 'Lara Café' })

const user = useSupabaseUser()
const profileStore = useProfileStore()
const aguardando = computed(() => profileStore.profile?.role === 'user')

onMounted(async () => {
  // Links de convite / recuperação de senha chegam com o token no hash.
  if (window.location.hash) {
    const type = new URLSearchParams(window.location.hash.substring(1)).get('type')
    if (type === 'invite' || type === 'recovery') return navigateTo('/confirm' + window.location.hash)
  }
  if (!user.value) return
  if (!profileStore.profile) await profileStore.fetchMe()
  const role = profileStore.profile?.role
  if (role === 'admin' || role === 'equipe') navigateTo('/crm')
})
</script>
