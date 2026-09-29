<script setup lang="ts">
import { definePageMeta, useHead } from '#imports'
import PainelTarefas from '~/components/clientes/PainelTarefas.vue'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Tarefas' })
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="eyebrow">Trabalho</p>
      <h1 class="text-4xl sm:text-5xl text-primary dark:text-zinc-100 mt-1">Tarefas</h1>
    </div>
    <PainelTarefas />
  </div>
</template>
