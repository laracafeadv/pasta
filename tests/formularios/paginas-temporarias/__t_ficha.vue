<script setup lang="ts">
import { definePageMeta } from '#imports'
import InformacoesCliente from '~/components/crm/InformacoesCliente.vue'
definePageMeta({ layout: false })
</script>
<template><div class="min-h-screen bg-[#edeae2] px-4 py-6 max-w-2xl mx-auto"><InformacoesCliente :contato-id="1" iniciar-aberto /></div></template>
