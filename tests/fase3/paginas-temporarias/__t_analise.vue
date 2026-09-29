<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { definePageMeta } from '#imports'
import AnaliseDemanda from '~/components/crm/AnaliseDemanda.vue'
definePageMeta({ layout: false })
const d = ref<any>(null)
const notas = ref<any[]>([])
async function carregar() { d.value = await $fetch('/api/demandas/10'); notas.value = await $fetch('/api/demandas/10/notas') }
onMounted(carregar)
</script>
<template><div class="min-h-screen bg-[#edeae2] px-4 py-6 max-w-2xl mx-auto"><AnaliseDemanda v-if="d" :demanda="d" :notas="notas" @mudou="carregar" /></div></template>
