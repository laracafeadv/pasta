<script setup lang="ts">
import { definePageMeta, useHead } from '#imports'
import PainelProcessos from '~/components/clientes/PainelProcessos.vue'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Processos e procedimentos' })
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="eyebrow">Serviços jurídicos</p>
      <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Processos e procedimentos</h1>
    </div>
    <PainelProcessos />
  </div>
</template>
