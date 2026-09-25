<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-background-light via-rose-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 px-6">
    <Card variant="light" class="p-8 max-w-md w-full border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden">
      <div class="bg-primary/5 -mx-8 -mt-8 p-8 mb-8 border-b border-primary/10">
        <div class="w-16 h-16 rounded-md bg-primary text-white flex items-center justify-center text-3xl font-bold mx-auto shadow-lg shadow-primary/20">
          <Icon name="ph:lock-key-fill" />
        </div>
      </div>
      
      <ConfirmPasswordForm />
      
      <div class="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 text-center">
        <NuxtLink to="/login" class="text-xs font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-widest">
          Voltar para o Login
        </NuxtLink>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { useHead, definePageMeta } from '#imports'
import Card from '../../components/Card.vue'
import ConfirmPasswordForm from '../../components/auth/ConfirmPasswordForm.vue'

useHead({ title: 'Confirmar Senha | Andréa Rosa' })

definePageMeta({
  layout: false,
  middleware: 'auth' // Needs to be authenticated (via the recovery/invite link)
})
</script>
