<script setup lang="ts">
import { definePageMeta, useHead } from '#imports'
import PainelPrazos from '~/components/clientes/PainelPrazos.vue'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Prazos' })
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="eyebrow">Trabalho</p>
      <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Prazos</h1>
    </div>
    <PainelPrazos />
  </div>
</template>
