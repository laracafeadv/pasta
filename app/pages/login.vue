<template>
  <div class="min-h-screen relative flex items-center justify-center px-4 py-14 overflow-hidden bg-cafe">
    <!-- Fundo em degradê, no tom café do site -->
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_theme(colors.secondary.DEFAULT/30%),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_theme(colors.cafe.DEFAULT),_theme(colors.primary.dark))]" />
    <img src="/mono-light.png" alt="" class="absolute -right-24 -bottom-24 h-[34rem] opacity-[0.06] pointer-events-none select-none" />
    <img src="/mono-light.png" alt="" class="absolute -left-32 -top-28 h-[26rem] opacity-[0.04] pointer-events-none select-none" />

    <!-- Cartão flutuante centralizado -->
    <div class="relative z-10 w-full max-w-md">
      <div class="rounded-[2rem] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/30 ring-1 ring-white/10 px-8 py-10 sm:px-10 sm:py-12">
        <div class="text-center">
          <img src="/mono-dark.png" alt="Lara Café" class="h-14 w-auto mx-auto dark:invert" />
          <p class="eyebrow mt-5">Área do escritório</p>
          <h1 class="text-3xl text-primary dark:text-zinc-100 mt-1">Acesso restrito</h1>
          <p class="text-sm text-gray-500 mt-2">Use o e-mail e a senha do seu usuário.</p>
        </div>

        <form class="space-y-4 mt-8" @submit.prevent="handleLogin">
          <Input v-model="loginForm.email" label="E-mail" type="email" placeholder="voce@laracafe.adv.br" autocomplete="email" />
          <Input v-model="loginForm.password" label="Senha" type="password" placeholder="••••••••" autocomplete="current-password" />
          <LoginHelperRow />
          <p v-if="loginError" class="text-sm text-danger dark:text-danger-300">{{ loginError }}</p>
          <Button variant="primary" size="lg" class="w-full" :loading="loginLoading">Entrar</Button>
        </form>
      </div>

      <p class="text-xs text-cafe-creme/60 text-center leading-relaxed mt-6">
        Acesso restrito · dados protegidos conforme a LGPD ·
        <NuxtLink to="/privacidade" class="underline underline-offset-2 hover:text-cafe-creme">Política de privacidade</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { navigateTo, useHead, useSupabaseClient, useSupabaseUser } from '#imports'
import Button from '../components/Button.vue'
import Input from '../components/Input.vue'
import LoginHelperRow from '../components/login/LoginHelperRow.vue'

useHead({ title: 'Entrar' })

const user = useSupabaseUser()
watch(user, () => {
  if (user.value) navigateTo('/')
}, { immediate: true })

const loginForm = ref({ email: '', password: '' })
const loginLoading = ref(false)
const loginError = ref('')
const supabase = useSupabaseClient()

async function handleLogin() {
  loginError.value = ''
  if (!loginForm.value.email || !loginForm.value.password) {
    loginError.value = 'Preencha e-mail e senha.'
    return
  }

  loginLoading.value = true
  const { error } = await supabase.auth.signInWithPassword({
    email: loginForm.value.email.trim().toLowerCase(),
    password: loginForm.value.password,
  })
  loginLoading.value = false

  if (error) {
    const texto = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
    loginError.value = texto.includes('not confirmed') || texto.includes('email_not_confirmed')
      ? 'E-mail não confirmado. Verifique sua caixa de entrada.'
      : 'E-mail ou senha incorretos.'
  }
  // A navegação é feita pelo watch(user)
}
</script>
