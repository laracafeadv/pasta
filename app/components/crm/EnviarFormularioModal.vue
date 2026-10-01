<template>
  <Modal :is-open="isOpen" :title="link ? 'Link criado com sucesso' : 'Enviar formulário'" :description="link ? undefined : `Para ${nomePessoa || 'a pessoa'}: escolha o formulário e a demanda, e gere o link individual.`" max-width="lg" @close="fechar">
    <div v-if="!link" class="p-5 space-y-4" data-testid="envio-config">
      <label class="field"><span>Formulário (só os publicados)</span>
        <select v-model="formularioId" class="modal-input" data-testid="env-form">
          <option v-for="f in formularios" :key="f.id" :value="f.id">{{ f.nome }} — {{ CONTEXTOS[f.contexto]?.nome ?? f.contexto }}</option>
        </select>
      </label>
      <p v-if="!formularios.length" class="text-sm text-gray-500">Nenhum formulário publicado. Publique um em <NuxtLink to="/formularios" class="underline" @click="fechar">Formulários</NuxtLink>.</p>
      <label class="field"><span>{{ exigeDemanda ? 'Demanda (obrigatória para este formulário)' : 'Demanda (opcional)' }}</span>
        <select v-model="casoId" class="modal-input" data-testid="env-caso">
          <option :value="null">{{ exigeDemanda ? 'Escolha…' : '— sem demanda —' }}</option>
          <option v-for="c in casos" :key="c.id" :value="c.id">{{ c.titulo }}</option>
        </select>
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label class="field"><span>Link vale por (dias)</span><input v-model.number="validade" type="number" min="1" max="90" class="modal-input" data-testid="env-validade" /></label>
        <label class="field"><span>Data limite p/ resposta (opcional)</span><input v-model="prazo" type="date" class="modal-input" data-testid="env-prazo" /></label>
      </div>
      <p class="text-xs text-gray-500">Link público individual: a cliente abre no celular ou computador, sem login e sem ver nada do CRM. As respostas voltam para a ficha da pessoa{{ casoId ? ' e da demanda' : '' }}.</p>
      <p v-if="erro" class="text-sm text-danger" data-testid="env-erro">{{ erro }}</p>
      <div class="flex justify-end gap-2"><Button variant="outline" @click="fechar">Cancelar</Button><Button :loading="gerando" :disabled="!formularioId" data-testid="gerar-link" @click="gerar">Gerar link</Button></div>
    </div>

    <div v-else class="p-5 space-y-4" data-testid="envio-pronto">
      <input class="modal-input" readonly :value="link.url" data-testid="link-form" @focus="($event.target as HTMLInputElement).select()" />
      <p class="text-xs text-gray-500">{{ link.formulario_nome }} · válido até {{ dataCurta(link.expira_em) }}<template v-if="link.prazo_resposta"> · responder até {{ dataCurta(link.prazo_resposta) }}</template>. Quem tiver o link consegue responder: envie só à própria cliente.</p>
      <div class="flex flex-wrap gap-2">
        <Button icon="ph:copy-bold" data-testid="copiar-link" @click="copiar">{{ copiado ? 'Copiado!' : 'Copiar link' }}</Button>
        <a :href="linkWhatsapp" target="_blank" rel="noopener" class="inline-flex" @click="marcar('whatsapp')"><Button variant="outline" icon="ph:whatsapp-logo-bold" :disabled="!telefone" data-testid="env-whatsapp">Enviar por WhatsApp</Button></a>
        <a :href="linkEmail" class="inline-flex" @click="marcar('email')"><Button variant="outline" icon="ph:envelope-simple-bold" :disabled="!email" data-testid="env-email">Enviar por e-mail</Button></a>
        <NuxtLink :to="`/formularios/${link.formulario_id}`" @click="fechar"><Button variant="outline" icon="ph:eye-bold">Ver formulário</Button></NuxtLink>
        <Button variant="outline" icon="ph:list-checks-bold" data-testid="ver-respostas" @click="emit('ver-respostas', link.id); fechar()">Ver respostas</Button>
      </div>
      <p class="text-[11px] text-gray-400">WhatsApp e e-mail abrem o seu aplicativo com a mensagem pronta (envio manual). O envio automático depende da integração do WhatsApp/e-mail do CRM.</p>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Modal from '../Modal.vue'
import Button from '../Button.vue'
import { CONTEXTOS } from '~~/shared/data/formulario'
import { dataCurta, whatsappLink } from '../../utils/formatadores'

const props = defineProps<{ isOpen: boolean; contatoId: number; nomePessoa: string | null; telefone: string | null; email: string | null; casos: { id: number; titulo: string }[]; casoInicial?: number | null }>()
const emit = defineEmits<{ close: []; criado: []; 'ver-respostas': [envioId: number] }>()

interface FormLista { id: number; nome: string; contexto: 'cliente' | 'consulta' | 'demanda' }
interface Link { id: number; token: string; url: string; expira_em: string; prazo_resposta: string | null; formulario_id: number; formulario_nome: string }
const formularios = ref<FormLista[]>([])
const formularioId = ref<number | null>(null)
const casoId = ref<number | null>(null)
const validade = ref(30)
const prazo = ref('')
const gerando = ref(false)
const erro = ref('')
const link = ref<Link | null>(null)
const copiado = ref(false)

const escolhido = computed(() => formularios.value.find(f => f.id === formularioId.value))
const exigeDemanda = computed(() => escolhido.value?.contexto === 'demanda')
const primeiro = computed(() => (props.nomePessoa ?? '').trim().split(/\s+/)[0] || '')
const mensagem = computed(() => `Olá${primeiro.value ? `, ${primeiro.value}` : ''}! Para avançarmos, preciso que você preencha este formulário: ${link.value?.url ?? ''}\nO link é individual, abre direto no celular, sem cadastro${link.value ? `, e vale até ${dataCurta(link.value.expira_em)}` : ''}. As informações são usadas só para o seu atendimento, conforme a LGPD.`)
const linkWhatsapp = computed(() => props.telefone ? `${whatsappLink(props.telefone)}?text=${encodeURIComponent(mensagem.value)}` : '#')
const linkEmail = computed(() => props.email ? `mailto:${props.email}?subject=${encodeURIComponent(link.value?.formulario_nome ?? 'Formulário')}&body=${encodeURIComponent(mensagem.value)}` : '#')

watch(() => props.isOpen, async (aberto) => {
  if (!aberto) return
  link.value = null; erro.value = ''; prazo.value = ''; validade.value = 30; casoId.value = props.casoInicial ?? null; copiado.value = false
  try {
    const todos = await $fetch<(FormLista & { situacao?: string })[]>('/api/formularios')
    formularios.value = todos.filter(f => !f.situacao || f.situacao === 'publicado')
    formularioId.value = (props.casoInicial ? formularios.value.find(f => f.contexto === 'demanda') : formularios.value.find(f => f.contexto !== 'demanda'))?.id ?? formularios.value[0]?.id ?? null
  } catch { erro.value = 'Não foi possível carregar os formulários.' }
})

async function gerar() {
  if (exigeDemanda.value && !casoId.value) { erro.value = 'Este formulário é de demanda: escolha a demanda.'; return }
  gerando.value = true; erro.value = ''
  try {
    const r = await $fetch<Omit<Link, 'formulario_id'>>('/api/formularios/envios', { method: 'POST', body: { contato_id: props.contatoId, formulario_id: formularioId.value, caso_id: casoId.value, validade_dias: validade.value, prazo_resposta: prazo.value || null } })
    link.value = { ...r, formulario_id: formularioId.value! }
    emit('criado')
  } catch (e: any) { erro.value = e?.data?.message || 'Não foi possível gerar o link.' } finally { gerando.value = false }
}
async function copiar() {
  try { await navigator.clipboard.writeText(link.value!.url); copiado.value = true; marcar('manual'); setTimeout(() => { copiado.value = false }, 3000) } catch { erro.value = 'Não foi possível copiar: selecione o link e copie.' }
}
// Registra o envio só depois de a usuária abrir o WhatsApp/e-mail (ou copiar o link para colar): é um envio manual, e o status diz isso.
async function marcar(canal: 'whatsapp' | 'email' | 'manual') {
  if (!link.value) return
  try { await $fetch(`/api/formularios/envios/${link.value.id}`, { method: 'PATCH', body: { acao: 'enviado', canal } }); emit('criado') } catch { /* o link continua valendo */ }
}
function fechar() { emit('close') }
</script>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field > span { @apply text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400; }
</style>
