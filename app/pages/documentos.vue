<script setup lang="ts">
import { definePageMeta, useHead } from '#imports'
import PainelDocumentos from '~/components/clientes/PainelDocumentos.vue'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Documentos' })
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="eyebrow">Serviços jurídicos</p>
      <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Documentos</h1>
    </div>
    <PainelDocumentos />
  </div>
</template>
