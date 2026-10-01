import { computed, ref } from 'vue'
import type { ConsultaNaAgenda, LeadEntrada, LeadSecretaria } from '~~/shared/data/secretaria'
import { aguardandoMinha } from '~~/shared/utils/leadsSecretaria'

/** Estado da aba Leads da Secretária: a lista, a conferência das consultas no Google Agenda e as ações sobre cada lead. */
const msg = (e: any, padrao: string) => e?.data?.message || padrao

export function useSecretariaLeads() {
  const leads = ref<LeadSecretaria[]>([])
  const consultas = ref<Record<number, ConsultaNaAgenda & { carregando?: boolean }>>({})
  const carregando = ref(false)
  const erro = ref<string | null>(null)
  const agoraMs = ref(Date.now())
  const selo = computed(() => aguardandoMinha(leads.value, agoraMs.value))
  let consultasEm = 0

  async function carregar() {
    carregando.value = true
    try { leads.value = await $fetch<LeadSecretaria[]>('/api/secretaria/leads'); erro.value = null; agoraMs.value = Date.now() }
    catch (e: any) { erro.value = msg(e, 'Não foi possível carregar os leads.') } finally { carregando.value = false }
  }
  async function carregarConsultas(forcar = false) {
    if (!forcar && Date.now() - consultasEm < 300000) return
    consultasEm = Date.now()
    const col = leads.value.filter(l => l.etapa === 'consulta')
    if (!col.length) return
    for (const l of col) consultas.value[l.id] = { ...(consultas.value[l.id] ?? { st: 'erro' }), carregando: true }
    try {
      const r = await $fetch<{ conectado: boolean; consultas: Record<number, ConsultaNaAgenda> }>('/api/secretaria/leads/consultas')
      consultas.value = r.conectado ? r.consultas : {}
    } catch { consultas.value = Object.fromEntries(col.map(l => [l.id, { st: 'erro' as const, msg: 'Não consegui conferir a agenda.' }])) }
  }
  const trocar = (l: LeadSecretaria) => { const i = leads.value.findIndex(x => x.id === l.id); if (i >= 0) leads.value[i] = l; else leads.value.unshift(l); agoraMs.value = Date.now() }
  async function criar(b: LeadEntrada) { const l = await $fetch<LeadSecretaria>('/api/secretaria/leads', { method: 'POST', body: b }); trocar(l); return l }
  async function salvar(id: number, b: LeadEntrada) { const l = await $fetch<LeadSecretaria>(`/api/secretaria/leads/${id}`, { method: 'PUT', body: b }); trocar(l); return l }
  async function mover(id: number, b: { etapa: string; valor_fechado?: unknown; exito?: unknown; motivo?: string }) { const l = await $fetch<LeadSecretaria>(`/api/secretaria/leads/${id}/mover`, { method: 'POST', body: b }); trocar(l); return l }
  async function conversa(id: number, quem: 'respondi' | 'cliente') { const l = await $fetch<LeadSecretaria>(`/api/secretaria/leads/${id}/conversa`, { method: 'POST', body: { quem } }); trocar(l); return l }
  async function excluir(id: number) { await $fetch(`/api/secretaria/leads/${id}`, { method: 'DELETE' }); leads.value = leads.value.filter(l => l.id !== id) }
  async function marcarConsulta(id: number, b: { dia: string; hora: string; duracao: number; modo: string }) {
    const r = await $fetch<{ lead: LeadSecretaria; evento_link: string }>(`/api/secretaria/leads/${id}/consulta`, { method: 'POST', body: b })
    trocar(r.lead); consultas.value[id] = { st: 'verde', dia: b.dia, hora: b.hora, link: r.evento_link }; return r
  }
  async function importar(texto: string, arquivo: string) { return await $fetch<{ lead: LeadEntrada; aviso: string; mensagens: number }>('/api/secretaria/leads/importar', { method: 'POST', body: { texto, arquivo } }) }
  return { leads, consultas, carregando, erro, selo, carregar, carregarConsultas, criar, salvar, mover, conversa, excluir, marcarConsulta, importar, msg }
}
export type SecretariaLeads = ReturnType<typeof useSecretariaLeads>
