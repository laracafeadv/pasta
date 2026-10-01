<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-text-light dark:text-text-dark">Recuperar senha</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Informe seu email para receber as instruções de recuperação.
      </p>
    </div>

    <form class="space-y-4" @submit.prevent="handleRecovery">
      <Input
        v-model="email"
        label="Email"
        type="email"
        placeholder="voce@empresa.com"
        required
      />

      <p v-if="errorMsg" class="text-sm text-danger dark:text-danger-300">
        {{ errorMsg }}
      </p>
      
      <p v-if="successMsg" class="text-sm text-success dark:text-success-300">
        {{ successMsg }}
      </p>

      <Button
        variant="primary"
        size="lg"
        class="w-full"
        :disabled="loading"
      >
        {{ loading ? 'Enviando...' : 'Enviar instruções' }}
      </Button>

      <div class="text-center">
        <NuxtLink
          to="/login"
          class="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
        >
          Voltar para o login
        </NuxtLink>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Input from '../Input.vue'
import Button from '../Button.vue'
import { useSupabaseClient, useRuntimeConfig } from '#imports'

const email = ref('')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const lastAttemptAt = ref(0)
const RATE_LIMIT_MS = 30_000 // 30 seconds between attempts

const supabase = useSupabaseClient()
const runtimeConfig = useRuntimeConfig()

async function handleRecovery() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!email.value.trim()) {
    errorMsg.value = 'Por favor, informe seu email.'
    return
  }

  // Client-side rate limit to prevent abuse
  const now = Date.now()
  if (now - lastAttemptAt.value < RATE_LIMIT_MS) {
    const remaining = Math.ceil((RATE_LIMIT_MS - (now - lastAttemptAt.value)) / 1000)
    errorMsg.value = `Aguarde ${remaining}s antes de tentar novamente.`
    return
  }
  lastAttemptAt.value = now

  loading.value = true

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const baseUrl = (currentOrigin || runtimeConfig.public.siteUrl || runtimeConfig.public.originalSiteUrl || '').replace(/\/$/, '')
  
  try {
    await supabase.auth.resetPasswordForEmail(email.value.trim().toLowerCase(), {
      redirectTo: `${baseUrl}/confirm?flow=recovery`
    })

    // Always show success to prevent email enumeration
    successMsg.value = 'Se este email estiver cadastrado, você receberá as instruções de recuperação. Verifique sua caixa de entrada e spam.'
    email.value = ''
  } catch (err) {
    // Still show success message to prevent enumeration
    successMsg.value = 'Se este email estiver cadastrado, você receberá as instruções de recuperação. Verifique sua caixa de entrada e spam.'
    email.value = ''
  } finally {
    loading.value = false
  }
}
</script>
