import { ref } from 'vue'
import type { ModeloMensagem } from '../../shared/types/crm'

// Cache simples em memória: os modelos mudam pouco e são usados em várias telas.
const modelos = ref<ModeloMensagem[]>([])
const carregando = ref(false)
let carregado = false

export function useModelos() {
  async function carregar(forcar = false) {
    if (carregado && !forcar) return
    carregando.value = true
    try {
      modelos.value = await $fetch<ModeloMensagem[]>('/api/modelos')
      carregado = true
    } finally {
      carregando.value = false
    }
  }

  /** Troca [NOME] pelo primeiro nome; os demais [CAMPOS] ficam para completar. */
  function preencher(texto: string, nome?: string | null) {
    const primeiro = (nome ?? '').trim().split(/\s+/)[0]
    return primeiro ? texto.replace(/\[NOME\]/g, primeiro) : texto
  }

  return { modelos, carregando, carregar, preencher, invalidar: () => { carregado = false } }
}
