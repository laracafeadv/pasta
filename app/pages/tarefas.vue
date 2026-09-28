<script setup lang="ts">
import { definePageMeta, navigateTo } from '#imports'

definePageMeta({ middleware: ['auth', 'staff'] })

await navigateTo({ path: '/crm', query: { aba: 'hoje' } })
</script>

<template>
  <div />
</template>
