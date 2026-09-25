import { ref } from 'vue'
import type { Escritorio, ModeloMensagem } from '../../shared/types/crm'
import { valorPorExtenso } from '~~/shared/utils/extenso'
import { useProfileStore } from '../stores/profile'

// Cache simples em memória: os modelos mudam pouco e são usados em várias telas.
const modelos = ref<ModeloMensagem[]>([])
const escritorio = ref<Escritorio>({})
const carregando = ref(false)
let carregado = false

export function useModelos() {
  async function carregar(forcar = false) {
    if (carregado && !forcar) return
    carregando.value = true
    try {
      const [m, e] = await Promise.all([$fetch<ModeloMensagem[]>('/api/modelos'), $fetch<Escritorio>('/api/escritorio').catch(() => ({}))])
      modelos.value = m
      escritorio.value = e
      carregado = true
    } finally {
      carregando.value = false
    }
  }

  /**
   * Preenche o que o CRM sabe: [NOME] (primeiro nome), [SAUDAÇÃO], dados do escritório
   * ([DRA], [VALOR DA CONSULTA] e [VALOR POR EXTENSO], [PLATAFORMA], [DURAÇÃO], [PIX], [DADOS BANCÁRIOS]),
   * [MEU NOME] (quem está usando o CRM) e,
   * quando informados, os extras (ex.: [PARCELA], [VALOR DA PARCELA], [VENCIMENTO]).
   * O que não estiver cadastrado continua entre colchetes, para completar à mão.
   */
  function preencher(texto: string, nome?: string | null, extras: Record<string, string | null | undefined> = {}) {
    const e = escritorio.value
    const h = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }))
    const campos: Record<string, string | null | undefined> = {
      'NOME': (nome ?? '').trim().split(/\s+/)[0] || null,
      'SAUDAÇÃO': h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite',
      'DRA': e.advogada_nome ? `Dra. ${e.advogada_nome}` : null,
      'VALOR DA CONSULTA': e.valor_consulta,
      'VALOR POR EXTENSO': e.valor_consulta ? valorPorExtenso(e.valor_consulta) : null,
      'MEU NOME': useProfileStore().profile?.name?.trim().split(/\s+/)[0] || null,
      'PLATAFORMA': e.plataforma_consulta,
      'DURAÇÃO': e.duracao_consulta,
      'PIX': e.chave_pix,
      'DADOS BANCÁRIOS': e.dados_bancarios,
      ...extras,
    }
    return texto.replace(/\[([A-ZÀ-Ú ]+)\]/g, (m, k) => campos[k]?.trim() || m)
  }

  return { modelos, carregando, carregar, preencher, invalidar: () => { carregado = false } }
}
