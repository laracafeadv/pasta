import { computed, reactive, ref } from 'vue'
import type { AvisoItem, AvisoLancado, CaixaSub, GoogleStatus, MailItem } from '~~/shared/data/secretaria'

/**
 * Estado compartilhado das abas Intimações e E-mail da Secretária: conexão com o Google, avisos dos tribunais e caixa de entrada.
 * Tudo é lido pelo servidor (Gmail API com a conta conectada); aqui só guardamos o que a tela mostra.
 */
const msg = (e: any, padrao: string) => e?.data?.message || padrao
const precisaConectar = (e: any) => !!(e?.data?.data?.conectar)

export function useSecretariaGoogle() {
  const status = ref<GoogleStatus | null>(null)
  const intim = reactive({ itens: [] as AvisoItem[], lancados: {} as Record<string, AvisoLancado>, carregando: false, erro: null as string | null, em: 0 })
  const caixa = reactive({ sub: 'principal' as CaixaSub, dados: {} as Partial<Record<CaixaSub, MailItem[]>>, carregando: {} as Partial<Record<CaixaSub, boolean>>, erro: {} as Partial<Record<CaixaSub, string | null>>, em: {} as Partial<Record<CaixaSub, number>> })
  const semPrazo = computed(() => intim.itens.filter(i => i.intimacao && !intim.lancados[i.id]))

  async function carregarStatus() {
    try { status.value = await $fetch<GoogleStatus>('/api/google/status') } catch { status.value = { configurado: false, conectado: false, email: null } }
  }
  async function carregarIntimacoes() {
    if (intim.carregando || !status.value?.conectado) return
    intim.carregando = true
    try {
      const r = await $fetch<{ itens: AvisoItem[]; lancados: Record<string, AvisoLancado>; conectado: boolean }>('/api/secretaria/intimacoes')
      if (!r.conectado && status.value) status.value.conectado = false
      intim.itens = r.itens; intim.lancados = r.lancados; intim.erro = null; intim.em = Date.now()
    } catch (e: any) {
      if (precisaConectar(e) && status.value) status.value.conectado = false
      intim.erro = msg(e, 'Não consegui ler o Gmail agora.')
    } finally { intim.carregando = false }
  }
  async function carregarCaixa(sub: CaixaSub = caixa.sub) {
    if (caixa.carregando[sub] || !status.value?.conectado) return
    caixa.carregando[sub] = true
    try { caixa.dados[sub] = await $fetch<MailItem[]>('/api/secretaria/email', { params: { sub } }); caixa.erro[sub] = null; caixa.em[sub] = Date.now() }
    catch (e: any) { if (precisaConectar(e) && status.value) status.value.conectado = false; caixa.erro[sub] = msg(e, 'Não consegui ler o Gmail agora.') }
    finally { caixa.carregando[sub] = false }
  }
  async function desconectar() {
    await $fetch('/api/google/desconectar', { method: 'POST' })
    await carregarStatus(); intim.itens = []; intim.lancados = {}; caixa.dados = {}
  }
  return { status, intim, caixa, semPrazo, carregarStatus, carregarIntimacoes, carregarCaixa, desconectar }
}
export type SecretariaGoogle = ReturnType<typeof useSecretariaGoogle>
