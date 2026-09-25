<template>
  <div class="min-h-[70vh]">
    <main class="max-w-md mx-auto px-6 py-12 space-y-6">
      <div>
        <p class="eyebrow">Acesso</p>
        <h1 class="text-4xl text-primary dark:text-zinc-100 mt-2">Recuperar senha</h1>
        <p class="text-sm text-gray-500 mt-2">Enviaremos um link seguro para o seu e-mail para você criar uma nova senha.</p>
      </div>
      <div class="rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 p-6">
        <RecoveryForm />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import RecoveryForm from '../components/recovery/RecoveryForm.vue'

definePageMeta({ layout: false, middleware: [] })
useHead({ title: 'Recuperar senha' })
</script>
