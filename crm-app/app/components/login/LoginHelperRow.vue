<template>
  <div class="flex items-center justify-between">
    <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <input type="checkbox" class="rounded border-border-light dark:border-border-dark" />
      {{ rememberLabel }}
    </label>
    <NuxtLink :to="forgotHref" class="text-sm font-semibold text-primary hover:text-primary-dark">{{ forgotLabel }}</NuxtLink>
  </div>
</template>

<script setup lang="ts">
interface Props {
  rememberLabel?: string
  forgotLabel?: string
  forgotHref?: string
}

withDefaults(defineProps<Props>(), {
  rememberLabel: 'Lembrar de mim',
  forgotLabel: 'Esqueceu a senha?',
  forgotHref: '/recovery'
})
</script>
