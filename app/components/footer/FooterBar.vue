<template>
  <footer class="mt-10 py-8 text-xs text-gray-500">
    <div class="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
      <p>© {{ new Date().getFullYear() }} Lara Café Advocacia &amp; Consultoria · uso interno do escritório</p>
      <div class="flex gap-5 uppercase tracking-[0.14em] font-semibold">
        <a href="https://laracafe.com.br" target="_blank" rel="noopener" class="hover:text-primary">Site</a>
        <NuxtLink to="/privacidade" class="hover:text-primary">Privacidade</NuxtLink>
      </div>
    </div>
  </footer>
</template>
