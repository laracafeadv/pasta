<script setup lang="ts">
import { definePageMeta, navigateTo, useRoute } from '#imports'

definePageMeta({ middleware: ['auth', 'staff'] })

const route = useRoute()
const query: Record<string, string> = { aba: 'hoje', ver: 'calendario' }
if (route.query.contato) query.contato = String(route.query.contato)
if (route.query.caso) query.caso = String(route.query.caso)

await navigateTo({ path: '/crm', query })
</script>

<template>
  <div />
</template>
