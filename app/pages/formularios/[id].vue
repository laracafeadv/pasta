<script setup lang="ts">
import { computed } from 'vue'
import { definePageMeta, useHead, useRoute } from '#imports'
import ConstrutorFormulario from '~/components/formularios/ConstrutorFormulario.vue'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Construtor de formulário' })
const id = computed(() => Number(useRoute().params.id))
</script>

<template>
  <ConstrutorFormulario :id="id" :key="id" />
</template>
