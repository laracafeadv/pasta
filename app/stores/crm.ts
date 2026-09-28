import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Compromisso, Contato, ContatoInput } from '../../shared/types/crm'

interface ListaResponse { records: Contato[]; total: number; page: number; pageSize: number }

export interface Agenda {
  atrasadas: Contato[]
  hoje: Contato[]
  semAcao: Contato[]
  semana: Contato[]
  transferidas: Contato[]
  sugestoes?: Contato[]
  compromissos: Compromisso[]
  aniversarios: Pick<Contato, 'id' | 'nome' | 'telefone' | 'data_nascimento' | 'classificacao'>[]
  semRelatorio?: Contato[]
}

export interface AndamentoPayload {
  resultado?: string
  etapa: string
  proxima_acao?: string
  proxima_data?: string
  motivo_perda?: string
  consulta_em?: string | null
  pagamento_confirmado?: boolean
  honorario?: Record<string, unknown> | null
}

const erro = (e: any, fallback: string) => e?.data?.message || e?.message || fallback

export const useCrmStore = defineStore('crm', () => {
  // ─── Lista de contatos ───────────────────────────────────────────────────
  const records = ref<Contato[]>([])
  const total = ref(0)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const currentPage = ref(1)
  const pageSize = ref(25)
  const filtros = ref({ search: '', etapa: '', area: '', origem: '' })
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  // ─── Funil (todos os abertos, sem paginação) ─────────────────────────────
  const funil = ref<Contato[]>([])
  const funilLoading = ref(false)

  // ─── Agenda "Hoje" ───────────────────────────────────────────────────────
  const agenda = ref<Agenda>({ atrasadas: [], hoje: [], semAcao: [], semana: [], transferidas: [], aniversarios: [], compromissos: [] })
  const agendaLoading = ref(false)
  const pendencias = computed(() => agenda.value.atrasadas.length + agenda.value.hoje.length + agenda.value.semAcao.length)

  async function fetchRecords() {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, string> = { page: String(currentPage.value), pageSize: String(pageSize.value) }
      for (const [k, v] of Object.entries(filtros.value)) if (v) params[k] = v
      const res = await $fetch<ListaResponse>('/api/crm/contatos', { params })
      records.value = res.records
      total.value = res.total
    } catch (e) {
      error.value = erro(e, 'Erro ao carregar contatos.')
    } finally {
      loading.value = false
    }
  }

  async function fetchFunil(incluirEncerrados = false) {
    funilLoading.value = true
    try {
      const params: Record<string, string> = { pageSize: '200' }
      if (!incluirEncerrados) params.abertos = '1'
      const res = await $fetch<ListaResponse>('/api/crm/contatos', { params })
      funil.value = res.records
    } catch (e) {
      error.value = erro(e, 'Erro ao carregar o funil.')
    } finally {
      funilLoading.value = false
    }
  }

  async function fetchAgenda() {
    agendaLoading.value = true
    try {
      agenda.value = await $fetch<Agenda>('/api/crm/contatos/hoje')
    } catch (e) {
      error.value = erro(e, 'Erro ao carregar a agenda.')
    } finally {
      agendaLoading.value = false
    }
  }

  /** Recarrega tudo o que pode ter mudado após uma alteração. */
  async function refresh() {
    await Promise.all([fetchRecords(), fetchAgenda(), funil.value.length ? fetchFunil() : Promise.resolve()])
  }

  async function salvar(id: number | null, payload: ContatoInput) {
    saving.value = true
    error.value = null
    try {
      const saved = id
        ? await $fetch<Contato>(`/api/crm/contatos/${id}`, { method: 'PUT', body: payload })
        : await $fetch<Contato>('/api/crm/contatos', { method: 'POST', body: payload })
      refresh()
      return saved
    } catch (e) {
      error.value = erro(e, 'Erro ao salvar contato.')
      throw e
    } finally {
      saving.value = false
    }
  }

  async function registrarAndamento(id: number, payload: AndamentoPayload) {
    saving.value = true
    error.value = null
    try {
      const saved = await $fetch<Contato>(`/api/crm/contatos/${id}/andamento`, { method: 'POST', body: payload })
      refresh()
      return saved
    } catch (e) {
      error.value = erro(e, 'Erro ao registrar andamento.')
      throw e
    } finally {
      saving.value = false
    }
  }

  async function adiar(contato: Contato, dias = 1) {
    const base = contato.proxima_data && contato.proxima_data > hojeISO() ? contato.proxima_data : hojeISO()
    await salvar(contato.id, { proxima_data: somarDias(base, dias) })
  }

  async function excluir(id: number) {
    await $fetch(`/api/crm/contatos/${id}`, { method: 'DELETE' })
    refresh()
  }

  function setFiltro(campo: keyof typeof filtros.value, valor: string) {
    filtros.value[campo] = valor
    currentPage.value = 1
    fetchRecords()
  }

  function goToPage(page: number) {
    if (page < 1 || page > totalPages.value) return
    currentPage.value = page
    fetchRecords()
  }

  return {
    records, total, loading, saving, error, currentPage, pageSize, totalPages, filtros,
    funil, funilLoading, agenda, agendaLoading, pendencias,
    fetchRecords, fetchFunil, fetchAgenda, refresh, salvar, registrarAndamento, adiar, excluir, setFiltro, goToPage,
  }
})

export function hojeISO(deslocamentoDias = 0) {
  const d = new Date(Date.now() + deslocamentoDias * 864e5)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function somarDias(iso: string, dias: number) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
