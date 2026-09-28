<script setup lang="ts">
import { definePageMeta, navigateTo } from '#imports'

definePageMeta({ middleware: ['auth', 'staff'] })

await navigateTo({ path: '/crm', query: { aba: 'hoje', ver: 'tarefas' } })
</script>

<template>
  <div />
</template>
