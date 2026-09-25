<template>
  <div class="min-h-screen grid lg:grid-cols-2 bg-slate-100 dark:bg-slate-950">
    <!-- Lado da marca, no tom café do site -->
    <section class="relative hidden lg:flex flex-col justify-between bg-cafe text-cafe-creme p-14 overflow-hidden rounded-r-[3rem]">
      <img src="/wordmark-light.png" alt="Lara Café Advocacia & Consultoria" class="h-10 w-auto self-start" />
      <div class="relative z-10 max-w-md">
        <p class="eyebrow !text-cafe-creme/70">Área do escritório</p>
        <h1 class="text-5xl leading-tight mt-4">Clareza antes da ação.</h1>
        <p class="mt-5 text-cafe-creme/75 leading-relaxed">
          Contatos, conversas de WhatsApp, próximos passos e honorários de cada cliente em um só lugar.
        </p>
      </div>
      <p class="text-xs text-cafe-creme/50">Acesso restrito à equipe · dados protegidos conforme a LGPD</p>
      <img src="/mono-light.png" alt="" class="absolute -right-16 -bottom-10 h-[28rem] opacity-[0.07] pointer-events-none select-none" />
    </section>

    <!-- Formulário -->
    <section class="flex items-center justify-center px-6 py-14">
      <div class="w-full max-w-sm space-y-8">
        <img src="/mono-dark.png" alt="Lara Café" class="h-16 w-auto mx-auto lg:hidden dark:invert" />
        <div>
          <p class="eyebrow">Bem-vinda de volta</p>
          <h2 class="text-4xl text-primary dark:text-zinc-100 mt-2">Entrar</h2>
          <p class="text-sm text-gray-500 mt-2">Use o e-mail e a senha do seu usuário no escritório.</p>
        </div>

        <form class="space-y-4" @submit.prevent="handleLogin">
          <Input v-model="loginForm.email" label="E-mail" type="email" placeholder="voce@laracafe.adv.br" autocomplete="email" />
          <Input v-model="loginForm.password" label="Senha" type="password" placeholder="••••••••" autocomplete="current-password" />
          <LoginHelperRow />
          <p v-if="loginError" class="text-sm text-danger dark:text-danger-300">{{ loginError }}</p>
          <Button variant="primary" size="lg" class="w-full" :loading="loginLoading">Entrar</Button>
        </form>

        <p class="text-xs text-gray-500 leading-relaxed">
          Ainda não tem acesso? Peça à administração do escritório para criar o seu usuário.
          <NuxtLink to="/privacidade" class="underline underline-offset-2">Política de privacidade</NuxtLink>
        </p>
      </div>
    </section>
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
