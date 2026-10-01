<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { definePageMeta } from '#imports'
import ProcessoCard from '~/components/crm/ProcessoCard.vue'
import ProcessoFormModal from '~/components/crm/ProcessoFormModal.vue'
definePageMeta({ layout: false })
const estado = ref<any>(null)
const aberto = ref(false)
const nat = ref<'judicial' | 'extrajudicial'>('judicial')
const editando = ref<any>(null)
async function carregar() { estado.value = await $fetch('/api/__estado') }
onMounted(carregar)
</script>
<template>
  <div v-if="estado" class="min-h-screen bg-[#edeae2] px-4 py-6 max-w-3xl mx-auto space-y-4">
    <ProcessoCard v-for="p in estado.processos" :key="p.id" :processo="p" :movimentacoes="estado.movs.filter((m: any) => m.processo_id === p.id)" :etapas="estado.etapas.filter((e: any) => e.processo_id === p.id)" :pendencias="estado.pendencias.filter((e: any) => e.processo_id === p.id)" responsavel="Lara Café" @mudou="carregar" @editar="(x: any) => { editando = x; nat = x.natureza; aberto = true }" />
    <button data-testid="abrir-jud" @click="editando = null; nat = 'judicial'; aberto = true">novo judicial</button>
    <button data-testid="abrir-ext" @click="editando = null; nat = 'extrajudicial'; aberto = true">novo extrajudicial</button>
    <ProcessoFormModal :is-open="aberto" :caso-id="1" :natureza="nat" :processo="editando" tipo-sugerido="Inventário extrajudicial (escritura)" @close="aberto = false" @salvo="aberto = false; carregar()" />
  </div>
</template>
