<script setup lang="ts">
import { definePageMeta, useHead } from '#imports'
import PainelClientes from '~/components/clientes/PainelClientes.vue'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Clientes' })
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="eyebrow">Pessoas</p>
      <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Clientes</h1>
    </div>
    <PainelClientes />
  </div>
</template>
