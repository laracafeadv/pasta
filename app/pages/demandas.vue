<script setup lang="ts">
import { definePageMeta, useHead } from '#imports'
import PainelDemandas from '~/components/clientes/PainelDemandas.vue'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Demandas' })
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="eyebrow">Serviços jurídicos</p>
      <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Demandas</h1>
    </div>
    <PainelDemandas />
  </div>
</template>
