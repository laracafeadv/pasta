<script setup lang="ts">
// Advogada autônoma: não há gestão de equipe. Configurações = Dados do escritório.
import { definePageMeta } from '#imports'
definePageMeta({ middleware: ['auth', 'admin'] })
await navigateTo('/admin/escritorio', { replace: true })
</script>

<template><div /></template>
