<template>
  <div class="w-full">
    <div class="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
      <!-- Topbar / Header -->
      <header
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1
            class="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3"
          >
            Dashboard
          </h1>
          <p class="text-slate-500 dark:text-slate-400 mt-1">
            Visão geral de performance e métricas comerciais
          </p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Period Selector -->
          <Select
            v-model="selectedPeriod"
            :options="periods"
            container-class="w-48"
          />

          <!-- Refresh Button -->
          <Button
            variant="primary"
            icon="ph:arrows-clockwise-bold"
            :loading="loading"
            class="shadow-lg shadow-primary/20"
            @click="fetchDashboardData"
          />
        </div>
      </header>

      <!-- Main Grid -->
      <main class="space-y-6">
        <!-- Error Alert -->
        <Alert v-if="error" type="danger" :title="error" class="mb-6">
          Ocorreu um erro ao carregar os dados do dashboard.
        </Alert>

        <!-- KPI Cards row -->
        <section
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
        >
          <KpiCard
            title="Novos Leads"
            :value="novosLeads"
            color="success"
            icon="ph:user-plus-bold"
            :loading="loading"
          />
          <KpiCard
            title="Recorrentes"
            :value="recorrentes"
            color="info"
            icon="ph:users-three-bold"
            :loading="loading"
          />
          <KpiCard
            :title="leadsLabel"
            :value="leadsNoPeriodo"
            color="neutral"
            icon="ph:users-bold"
            :loading="loading"
          />
          <KpiCard
            :title="vendasLabel"
            :value="vendasNoPeriodo"
            :sub-value="formatCurrency(valorVendasNoPeriodo)"
            color="warning"
            icon="ph:currency-dollar-bold"
            :loading="loading"
          />
        </section>
        <!-- Charts Area -->
        <section class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div class="lg:col-span-2 h-full">
            <DashboardChartArea
              :chartData="chartData"
              class="h-full"
            ></DashboardChartArea>
          </div>

          <!-- Quick Summary -->
          <div class="lg:col-span-1 h-full">
            <div
              class="bg-white dark:bg-slate-900/50 rounded-lg p-6 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-sm dark:shadow-none flex flex-col h-full"
            >
              <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Resumo Rápido
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Métricas consolidadas do período selecionado.
              </p>

              <div class="space-y-5 flex-1">
                <!-- Taxa de Conversão -->
                <div class="group relative">
                  <div class="flex justify-between items-end mb-1.5">
                    <span
                      class="text-sm text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1.5 cursor-help"
                    >
                      Conversão
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                        stroke="currentColor"
                        class="w-4 h-4 text-slate-400"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                        />
                      </svg>
                    </span>
                    <span
                      class="text-xl font-black text-slate-900 dark:text-white"
                      >{{ maxConversion }}%</span
                    >
                  </div>
                  <div
                    class="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden"
                  >
                    <div
                      class="h-full bg-gradient-to-r from-primary to-green-500"
                      :style="{ width: `${maxConversion}%` }"
                    ></div>
                  </div>
                  <!-- Tooltip -->
                  <div
                    class="opacity-0 invisible group-hover:opacity-100 group-hover:visible absolute z-20 w-[95%] p-3 mt-2 text-xs text-white bg-slate-800 dark:bg-slate-700 rounded-md shadow-xl transition-all duration-200 bottom-full left-1/2 -translate-x-1/2 mb-2"
                  >
                    Registra o percentual de contatos que se transformaram em
                    atendimentos.<br /><span
                      class="text-slate-300 mt-1 block font-mono"
                      >{{ totalVendasPeriodo }} atendimentos /
                      {{ totalLeadsPeriodo }} leads</span
                    >
                    <!-- Arrow -->
                    <div
                      class="absolute w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45 -bottom-1 left-1/2 -translate-x-1/2"
                    ></div>
                  </div>
                </div>

                <!-- Taxa de Recorrência -->
                <div class="group relative">
                  <div class="flex justify-between items-end mb-1.5">
                    <span
                      class="text-sm text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1.5 cursor-help"
                    >
                      Recorrência
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                        stroke="currentColor"
                        class="w-4 h-4 text-slate-400"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                        />
                      </svg>
                    </span>
                    <span
                      class="text-xl font-black text-slate-900 dark:text-white"
                      >{{ recorrenciaPercentual }}%</span
                    >
                  </div>
                  <div
                    class="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden"
                  >
                    <div
                      class="h-full bg-gradient-to-r from-orange-400 to-orange-600"
                      :style="{ width: `${recorrenciaPercentual}%` }"
                    ></div>
                  </div>
                  <!-- Tooltip -->
                  <div
                    class="opacity-0 invisible group-hover:opacity-100 group-hover:visible absolute z-20 w-[95%] p-3 mt-2 text-xs text-white bg-slate-800 dark:bg-slate-700 rounded-lg shadow-xl transition-all duration-200 bottom-full left-1/2 -translate-x-1/2 mb-2"
                  >
                    Mede a fidelidade: percentual de contatos do período que já
                    haviam contratado anteriormente.<br /><span
                      class="text-slate-300 mt-1 block font-mono"
                      >{{ totalRecorrentesPeriodo }} recorrentes /
                      {{ totalLeadsPeriodo }} leads</span
                    >
                    <!-- Arrow -->
                    <div
                      class="absolute w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45 -bottom-1 left-1/2 -translate-x-1/2"
                    ></div>
                  </div>
                </div>

                <hr class="border-slate-100 dark:border-white/5" />

                <!-- Grid Stats -->
                <div class="grid grid-cols-2 gap-3">
                  <!-- Volume Leads -->
                  <div
                    class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 group relative"
                  >
                    <p
                      class="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 flex items-center gap-1 cursor-help"
                    >
                      Total Leads
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                        stroke="currentColor"
                        class="w-3 h-3 text-slate-400"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                        />
                      </svg>
                    </p>
                    <p
                      class="text-xl font-black text-slate-900 dark:text-white"
                    >
                      {{ totalLeadsPeriodo }}
                    </p>
                    <div
                      class="opacity-0 invisible group-hover:opacity-100 group-hover:visible absolute z-20 w-[180px] p-2.5 mt-1 text-xs text-white bg-slate-800 dark:bg-slate-700 rounded-lg shadow-xl transition-all duration-200 left-0 top-full"
                    >
                      Soma de clientes novos + clientes recorrentes que entraram
                      em contato neste período.
                      <!-- Arrow -->
                      <div
                        class="absolute w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45 -top-1 left-4"
                      ></div>
                    </div>
                  </div>

                  <!-- Volume Vendas -->
                  <div
                    class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 group relative"
                  >
                    <p
                      class="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 flex items-center gap-1 cursor-help justify-end"
                    >
                      Total Atendimentos
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                        stroke="currentColor"
                        class="w-3 h-3 text-slate-400"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                        />
                      </svg>
                    </p>
                    <p
                      class="text-xl font-black text-slate-900 dark:text-white text-right"
                    >
                      {{ totalVendasPeriodo }}
                    </p>
                    <div
                      class="opacity-0 invisible group-hover:opacity-100 group-hover:visible absolute z-20 w-[180px] p-2.5 mt-1 text-xs text-white bg-slate-800 dark:bg-slate-700 rounded-lg shadow-xl transition-all duration-200 right-0 top-full"
                    >
                      Quantidade absoluta de atendimentos concretizados neste período.
                      <!-- Arrow -->
                      <div
                        class="absolute w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45 -top-1 right-4"
                      ></div>
                    </div>
                  </div>

                  <!-- Valor Faturado -->
                  <div
                    class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 group relative col-span-2 flex justify-between items-center"
                  >
                    <div>
                      <p
                        class="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 flex items-center gap-1 cursor-help"
                      >
                        Faturamento
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke-width="2"
                          stroke="currentColor"
                          class="w-3 h-3 text-slate-400"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                          />
                        </svg>
                      </p>
                      <p
                        class="text-lg font-black text-primary dark:text-primary-400 leading-none"
                      >
                        {{ formatCurrency(valorTotalVendasPeriodo) }}
                      </p>
                    </div>
                    <div
                      class="text-right border-l pl-4 border-slate-200 dark:border-white/10"
                    >
                      <p
                        class="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 flex items-center justify-end gap-1 cursor-help"
                      >
                        Ticket Médio
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke-width="2"
                          stroke="currentColor"
                          class="w-3 h-3 text-slate-400"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                          />
                        </svg>
                      </p>
                      <p
                        class="text-sm font-black text-slate-700 dark:text-slate-200 leading-none"
                      >
                        {{ formatCurrency(ticketMedio) }}
                      </p>
                    </div>

                    <!-- Tooltip for Faturamento/Ticket -->
                    <div
                      class="opacity-0 invisible group-hover:opacity-100 group-hover:visible absolute z-20 w-[90%] left-1/2 -translate-x-1/2 p-3 mt-1 text-xs text-white bg-slate-800 dark:bg-slate-700 rounded-lg shadow-xl transition-all duration-200 top-full"
                    >
                      <strong>Faturamento Bruto:</strong> Soma financeira de
                      todos os atendimentos.<br />
                      <strong class="mt-1.5 block">Ticket Médio:</strong>
                      Faturamento dividido pela Quantidade de Atendimentos.
                      <!-- Arrow -->
                      <div
                        class="absolute w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45 -top-1 left-1/2 -translate-x-1/2"
                      ></div>
                    </div>
                  </div>
                </div>
                <!-- End Grid Stats -->
              </div>
              <!-- End space-y-5 -->
            </div>
            <!-- End root card context -->
          </div>
          <!-- End lg:col-span-1 -->
        </section>
        <!-- End main charts section -->
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, watch } from "vue";
import { useHead } from "#imports";
import KpiCard from "../components/KpiCard.vue";
import Alert from "../components/Alert.vue";
import Select from "../components/Select.vue";
import Button from "../components/Button.vue";
import DashboardChartArea from "../components/dashboard/DashboardChartArea.vue";
import { useDashboardData } from "../composables/useDashboardData";

definePageMeta({ middleware: ['auth', 'staff'] });

const {
  loading,
  error,
  periods,
  selectedPeriod,
  novosLeads,
  recorrentes,
  leadsNoPeriodo,
  vendasNoPeriodo,
  valorVendasNoPeriodo,
  totalLeadsPeriodo,
  totalRecorrentesPeriodo,
  totalVendasPeriodo,
  valorTotalVendasPeriodo,
  chartData,
  fetchDashboardData,
} = useDashboardData();

useHead({ title: "Dashboard | Andréa Rosa" });

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
};

const leadsLabel = computed(() => {
  return selectedPeriod.value === 0 ? "Leads Hoje" : "Leads no Período";
});

const vendasLabel = computed(() => {
  return selectedPeriod.value === 0 ? "Atendimentos Hoje" : "Atendimentos no Período";
});

const conversaoPercentual = computed(() => {
  if (totalLeadsPeriodo.value === 0) return 0;
  const pct = (totalVendasPeriodo.value / totalLeadsPeriodo.value) * 100;
  return Math.round(pct * 10) / 10;
});

const maxConversion = computed(() => {
  return conversaoPercentual.value > 100 ? 100 : conversaoPercentual.value;
});

const recorrenciaPercentual = computed(() => {
  if (totalLeadsPeriodo.value === 0) return 0;
  return (
    Math.round(
      (totalRecorrentesPeriodo.value / totalLeadsPeriodo.value) * 100 * 10,
    ) / 10
  );
});

const ticketMedio = computed(() => {
  if (totalVendasPeriodo.value === 0) return 0;
  return valorTotalVendasPeriodo.value / totalVendasPeriodo.value;
});

onMounted(() => {
  fetchDashboardData();
});

// Trigger fetch when period changes
watch(
  () => selectedPeriod.value,
  () => {
    fetchDashboardData();
  },
);
</script>
