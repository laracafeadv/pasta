<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-background-light via-rose-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 px-6">
    <Card variant="light" class="p-8 max-w-md w-full">
      <div v-if="error" class="space-y-4 text-center">
        <div class="w-14 h-14 rounded-md bg-danger/10 text-danger flex items-center justify-center text-2xl font-bold mx-auto">
          !
        </div>
        <h1 class="text-xl font-bold text-text-light dark:text-text-dark">Ops! Algo deu errado</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ error }}</p>
        <Button variant="outline" class="w-full" @click="goLogin">Voltar para login</Button>
      </div>
      
      <div v-else-if="!isPasswordFlow" class="space-y-4 text-center">
        <div class="w-14 h-14 rounded-md bg-primary text-white flex items-center justify-center text-2xl font-bold mx-auto">
          ✓
        </div>
        <div>
          <h1 class="text-2xl font-bold text-text-light dark:text-text-dark">Confirmando acesso...</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">Aguarde enquanto validamos sua conta.</p>
        </div>
        <Button variant="outline" class="w-full" @click="goLogin">Voltar para login</Button>
      </div>
      
      <div v-else-if="user">
        <ConfirmPasswordForm />
      </div>
      
      <div v-else class="py-12 text-center">
        <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">Preparando seu ambiente...</p>
        <p class="mt-2 text-[10px] text-gray-400">Sincronizando sessão com Supabase...</p>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useHead, navigateTo, useSupabaseCookieRedirect, useSupabaseUser, useRoute, useSupabaseClient } from '#imports'
import Button from '../components/Button.vue'
import Card from '../components/Card.vue'
import ConfirmPasswordForm from '../components/auth/ConfirmPasswordForm.vue'

useHead({ title: 'Confirmando... | Andréa Rosa' })

const error = ref('')
const user = useSupabaseUser()
const route = useRoute()
const supabase = useSupabaseClient()
const redirectInfo = useSupabaseCookieRedirect()

onMounted(async () => {
  // Check for error in hash
  if (typeof window !== 'undefined' && window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const errorMsg = hashParams.get('error_description') || hashParams.get('error')
    if (errorMsg) {
      error.value = errorMsg.replace(/\+/g, ' ')
      return
    }

    // Explicitly try to get session to force hash processing
    await supabase.auth.getSession()
  }

  // Safety timeout: if after 15s no user and isPasswordFlow, show helpful error
  setTimeout(() => {
    if (!user.value && isPasswordFlow.value && !error.value) {
      error.value = 'O link pode ter expirado ou houve um problema de conexão. Solicite um novo link de recuperação na página de login.'
    }
  }, 15000)
})

const isPasswordFlow = computed(() => {
  if (route.query.flow === 'recovery' || route.query.flow === 'invite') return true

  // Check standard query params first
  if (route.query.type === 'invite' || route.query.type === 'recovery') return true
  
  // Check hash fragment (Supabase default)
  if (typeof window !== 'undefined' && window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const type = hashParams.get('type')
    if (type === 'invite' || type === 'recovery') return true
  }
  
  return false
})

watch(
  user,
  () => {
    if (user.value && !isPasswordFlow.value) {
      const path = redirectInfo.pluck()
      navigateTo(path || '/')
    }
  },
  { immediate: true }
)

function goLogin() {
  navigateTo('/login')
}
</script>
