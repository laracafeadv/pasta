<template>
  <div class="space-y-6">
    <div class="text-center">
      <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-2">Definir Nova Senha</h2>
      <p class="text-sm text-slate-500 dark:text-gray-400">
        Para concluir seu convite, escolha uma senha segura para sua conta.
      </p>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <Input
        id="new-password-input"
        v-model="password"
        type="password"
        label="Nova Senha"
        placeholder="Mínimo 6 caracteres"
        required
        :disabled="loading"
      />
      
      <Input
        id="confirm-password-input"
        v-model="confirmPassword"
        type="password"
        label="Confirmar Senha"
        placeholder="Repita a senha"
        required
        :disabled="loading"
      />

      <Alert v-if="error" type="danger" :title="error" class="mb-4" />
      <Alert v-if="success" type="success" title="Senha definida com sucesso!" class="mb-4">
        Você será redirecionado em instantes...
      </Alert>

      <Button
        type="submit"
        variant="primary"
        class="w-full shadow-lg shadow-primary/20"
        :loading="loading"
        :disabled="!isValid"
      >
        Confirmar Senha
      </Button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSupabaseClient, navigateTo } from '#imports'
import Input from '../Input.vue'
import Button from '../Button.vue'
import Alert from '../Alert.vue'

const supabase = useSupabaseClient()

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

function validatePassword(pwd: string): string | null {
  if (pwd.length < 6) return 'A senha deve ter no mínimo 6 caracteres.'
  return null
}

const isValid = computed(() => {
  return !validatePassword(password.value) && password.value === confirmPassword.value
})

async function handleSubmit() {
  const pwdError = validatePassword(password.value)
  if (pwdError) {
    error.value = pwdError
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'As senhas não coincidem.'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const { error: updateError } = await supabase.auth.updateUser({
      password: password.value
    })

    if (updateError) throw updateError

    // Invalidate other sessions for security
    try {
      await supabase.auth.signOut({ scope: 'others' })
    } catch (_) {
      // Non-critical — continue even if this fails
    }

    success.value = true
    setTimeout(() => {
      navigateTo('/')
    }, 2000)
  } catch (err: any) {
    console.error('[ConfirmPasswordForm] Erro ao atualizar senha:', err)
    error.value = 'Erro ao definir a senha. Tente novamente.'
  } finally {
    loading.value = false
  }
}
</script>
