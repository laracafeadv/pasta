<template>
  <div class="flex items-center">
    <Button 
      variant="primary" 
      size="sm" 
      class="font-black px-6"
      @click="navigateTo('/login')"
    >
      Fazer Login
    </Button>
  </div>
</template>

<script setup lang="ts">
import { navigateTo } from '#imports'
import Button from '../Button.vue'
</script>
