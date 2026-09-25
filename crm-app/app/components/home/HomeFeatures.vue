<template>
  <section class="py-24 container mx-auto px-6">
    <div class="text-center mb-20">
      <h2 class="text-xs font-black uppercase tracking-[0.3em] text-primary mb-4">Funcionalidades</h2>
      <h3 class="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">O que você ganha com o CRM Andréa Rosa</h3>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <Card 
        v-for="feature in features" 
        :key="feature.title"
        variant="light"
        class="p-8 hover:transform hover:-translate-y-2 transition-all duration-300 group"
      >
        <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
          <Icon :name="feature.icon" class="w-7 h-7" />
        </div>
        <h4 class="text-xl font-bold text-slate-900 dark:text-white mb-4">{{ feature.title }}</h4>
        <p class="text-slate-500 dark:text-slate-400 leading-relaxed">{{ feature.description }}</p>
      </Card>
    </div>
  </section>
</template>

<script setup lang="ts">
import Card from '../Card.vue'

const features = [
  {
    title: 'Gestão de Atendimentos',
    description: 'Acompanhe todo o fluxo de atendimentos em tempo real, desde o primeiro contato até o fechamento com métricas precisas.',
    icon: 'ph:scales-bold'
  },
  {
    title: 'Relatórios Inteligentes',
    description: 'Gráficos e dashboards modernos que mostram exatamente onde seu negócio está crescendo e onde precisa de atenção.',
    icon: 'ph:chart-pie-slice-bold'
  },
  {
    title: 'Inteligência Artificial (Andréa)',
    description: 'Sua assistente virtual integrada para análise de dados e automação de tarefas repetitivas, economizando seu tempo.',
    icon: 'ph:sparkle-bold'
  }
]
</script>
