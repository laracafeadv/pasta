<script setup lang="ts">
import { definePageMeta } from '#imports'
import ConstrutorFormulario from '~/components/formularios/ConstrutorFormulario.vue'
definePageMeta({ layout: false })
</script>
<template><div class="min-h-screen bg-[#edeae2] px-4 py-6"><ConstrutorFormulario :id="1" /></div></template>
