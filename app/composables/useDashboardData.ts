import { ref } from 'vue'

type PeriodValue = number | 'month' | 'year'

interface DashboardMetricRow {
    date: string
    novos_clientes: number | string | null
    clientes_recorrentes: number | string | null
    vendas: number | string | null
    valor_vendas: number | string | null
}

interface DashboardMetricsResponse {
    metrics: DashboardMetricRow[]
}

export const useDashboardData = () => {
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Period management
    const periods: Array<{ label: string, value: PeriodValue }> = [
        { label: 'Hoje', value: 0 },
        { label: 'Últimos 7 dias', value: 7 },
        { label: 'Últimos 30 dias', value: 30 },
        { label: 'Este Mês', value: 'month' },
        { label: 'Este Ano', value: 'year' },
    ]
    const selectedPeriod = ref<PeriodValue>(periods[2]!.value)

    // KPIs (Filtered by selected period)
    const novosLeads = ref(0)
    const recorrentes = ref(0)
    const leadsNoPeriodo = ref(0)
    const vendasNoPeriodo = ref(0)
    const valorVendasNoPeriodo = ref(0)

    // Totais do Período (Internal use)
    const totalLeadsPeriodo = ref(0)
    const totalRecorrentesPeriodo = ref(0)
    const totalVendasPeriodo = ref(0)
    const valorTotalVendasPeriodo = ref(0)

    // Charts Data
    const chartData = ref<{ date: string; leads: number; recorrentes: number; vendas: number }[]>([])

    const resolveDateRange = (period: PeriodValue) => {
        const now = new Date()
        const startDate = new Date(now)

        if (typeof period === 'number') {
            if (period === 0) {
                startDate.setHours(0, 0, 0, 0)
            } else {
                startDate.setDate(now.getDate() - period)
            }
        } else if (period === 'month') {
            startDate.setDate(1)
            startDate.setHours(0, 0, 0, 0)
        } else if (period === 'year') {
            startDate.setMonth(0, 1)
            startDate.setHours(0, 0, 0, 0)
        }

        return {
            startIso: startDate.toISOString(),
            endIso: now.toISOString(),
        }
    }

    const fetchDashboardData = async () => {
        loading.value = true
        error.value = null

        try {
            const { startIso, endIso } = resolveDateRange(selectedPeriod.value)
            const response = await $fetch<DashboardMetricsResponse>('/api/dashboard/metrics', {
                params: {
                    startDate: startIso,
                    endDate: endIso,
                },
            })

            calculateMetrics(response.metrics || [])

        } catch (e: any) {
            console.error('Error fetching dashboard data:', e)
            error.value = e?.data?.message || e?.message || 'Erro ao carregar dados do dashboard.'
        } finally {
            loading.value = false
        }
    }

    const calculateMetrics = (metricsData: DashboardMetricRow[]) => {
        let tNovos = 0
        let tRecorrentes = 0
        let tVendas = 0
        let tValorVendas = 0

        const formattedChartData = metricsData.map(point => {
            const novos = Number(point.novos_clientes) || 0
            const recorrentesCount = Number(point.clientes_recorrentes) || 0
            const vendasCount = Number(point.vendas) || 0
            const valorVendas = Number(point.valor_vendas) || 0

            tNovos += novos
            tRecorrentes += recorrentesCount
            tVendas += vendasCount
            tValorVendas += valorVendas

            const [year, month, day] = point.date.split('-')

            return {
                date: `${day}/${month}`,
                leads: novos,
                recorrentes: recorrentesCount,
                vendas: vendasCount
            }
        })

        // Update KPIs for the SELECTED PERIOD
        novosLeads.value = tNovos
        recorrentes.value = tRecorrentes
        leadsNoPeriodo.value = tNovos + tRecorrentes
        vendasNoPeriodo.value = tVendas
        valorVendasNoPeriodo.value = tValorVendas

        totalLeadsPeriodo.value = tNovos + tRecorrentes
        totalRecorrentesPeriodo.value = tRecorrentes
        totalVendasPeriodo.value = tVendas
        valorTotalVendasPeriodo.value = tValorVendas

        chartData.value = formattedChartData
    }

    return {
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
        fetchDashboardData
    }
}
