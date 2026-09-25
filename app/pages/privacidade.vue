<script setup lang="ts">
import PrivacyContent from '../components/privacidade/PrivacyContent.vue'

// Esta página deve ser acessível sem login
definePageMeta({
  middleware: []
})
</script>

<template>
  <div class="py-12">
    <main class="container mx-auto">
      <PrivacyContent />
    </main>
  </div>
</template>
