import { computed, ref } from 'vue'
import type { EtapaInicial, InicialEntrada, InicialSecretaria } from '~~/shared/data/secretaria'
import { adicionarDoc, checklistPendente, paraHoje, proximaEtapa } from '~~/shared/utils/iniciaisSecretaria'

/** Estado da aba Iniciais da Secretária: a lista, as ações sobre cada inicial e o que alimenta o "Hoje" e o número da aba. */
const msg = (e: any, padrao: string) => e?.data?.message || padrao
const hojeBR = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bahia' }).format(new Date())

export function useSecretariaIniciais() {
  const iniciais = ref<InicialSecretaria[]>([])
  const carregando = ref(false)
  const erro = ref<string | null>(null)
  const dia = ref(hojeBR())
  /** Pedido para a aba abrir uma janela (protocolar / pendências) — vem do botão Avançar ou do campo "O que você precisa?". */
  const pedido = ref<{ id: number | string; tipo: 'protocolar' | 'pendencias' } | null>(null)
  const noHoje = computed(() => paraHoje(iniciais.value, dia.value))
  const selo = computed(() => noHoje.value.length)

  async function carregar() {
    carregando.value = true; dia.value = hojeBR()
    try { iniciais.value = await $fetch<InicialSecretaria[]>('/api/secretaria/iniciais'); erro.value = null }
    catch (e: any) { erro.value = msg(e, 'Não foi possível carregar as iniciais.') } finally { carregando.value = false }
  }
  const trocar = (i: InicialSecretaria) => { const k = iniciais.value.findIndex(x => String(x.id) === String(i.id)); if (k >= 0) iniciais.value[k] = i; else iniciais.value.unshift(i); dia.value = hojeBR() }
  async function criar(b: InicialEntrada) { const i = await $fetch<InicialSecretaria>('/api/secretaria/iniciais', { method: 'POST', body: b }); trocar(i); return i }
  async function salvar(id: number | string, b: InicialEntrada) { const i = await $fetch<InicialSecretaria>(`/api/secretaria/iniciais/${id}`, { method: 'PUT', body: b }); trocar(i); return i }
  async function mover(id: number | string, b: { etapa: EtapaInicial; protocolo_data?: string | null; processo_numero?: string | null; confirmar_pendencias?: boolean }) {
    const i = await $fetch<InicialSecretaria>(`/api/secretaria/iniciais/${id}/mover`, { method: 'POST', body: b }); trocar(i); return i
  }
  async function excluir(id: number | string) { await $fetch(`/api/secretaria/iniciais/${id}`, { method: 'DELETE' }); iniciais.value = iniciais.value.filter(x => String(x.id) !== String(id)) }
  const achar = (id: number | string) => iniciais.value.find(x => String(x.id) === String(id))

  /** "Avançar": uma etapa por vez. Protocolar e chegar a "Pronta" com documentos pendentes pedem uma confirmação na tela. Devolve true se já moveu. */
  async function avancar(id: number | string): Promise<boolean> {
    const x = achar(id); const prox = x && proximaEtapa(x.etapa); if (!x || !prox) return false
    if (prox === 'protocolada') { pedido.value = { id, tipo: 'protocolar' }; return false }
    if (prox === 'pronta' && checklistPendente(x).length) { pedido.value = { id, tipo: 'pendencias' }; return false }
    await mover(id, { etapa: prox }); return true
  }
  async function docPendente(id: number | string, texto: string) { const x = achar(id); if (!x) throw new Error('Inicial não encontrada.'); return salvar(id, { checklist: adicionarDoc(x.checklist, texto) }) }
  async function docRecebido(id: number | string, docId: string) { const x = achar(id); if (!x) throw new Error('Inicial não encontrada.'); return salvar(id, { checklist: x.checklist.map(c => c.id === docId ? { ...c, ok: true } : c) }) }
  return { iniciais, carregando, erro, dia, pedido, noHoje, selo, carregar, criar, salvar, mover, excluir, achar, avancar, docPendente, docRecebido, msg }
}
export type SecretariaIniciais = ReturnType<typeof useSecretariaIniciais>
