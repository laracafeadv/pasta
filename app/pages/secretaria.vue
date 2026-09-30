<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { definePageMeta, useHead } from '#imports'
import { storeToRefs } from 'pinia'
import SecretariaInicio from '~/components/secretaria/SecretariaInicio.vue'
import { useProfileStore } from '~/stores/profile'
import { useAvatar } from '~/composables/useAvatar'

definePageMeta({ middleware: ['auth', 'staff'] })
useHead({ title: 'Secretária' })

// Painel pessoal para organizar o dia. Só o Início está pronto; as outras abas mostram "em breve"
// (Intimações e Leads apontam para as telas que o CRM já tem).
const profileStore = useProfileStore()
const { profile } = storeToRefs(profileStore)
const { uploadAvatar, isUploading, error: avatarError } = useAvatar()
const fotoIn = ref<HTMLInputElement | null>(null)
onMounted(() => { if (!profile.value) profileStore.fetchMe() })

const aba = ref<string>('inicio')
const urgentes = ref(0)
const novos = ref({ intimacoes: 0, leads: 0 })
const ABAS = [
  { id: 'inicio', nome: 'Início' }, { id: 'intimacoes', nome: 'Intimações' }, { id: 'email', nome: 'E-mail' },
  { id: 'leads', nome: 'Leads' }, { id: 'iniciais', nome: 'Iniciais' }, { id: 'noticias', nome: 'Notícias' }, { id: 'conteudo', nome: 'Conteúdo' },
]
const selo = (id: string) => id === 'inicio' ? urgentes.value : id === 'intimacoes' ? novos.value.intimacoes : id === 'leads' ? novos.value.leads : 0

const tratamento = computed(() => profile.value?.role === 'admin' ? 'Dra. Lara' : (profile.value?.name || '').split(' ')[0] || 'Olá')
const hora = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', hour: '2-digit', hour12: false }).format(new Date()))
const saudacao = computed(() => `${hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'}, ${tratamento.value}`)
const dataHoje = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', dateStyle: 'full' }).format(new Date())
async function trocarFoto(ev: Event) {
  const f = (ev.target as HTMLInputElement).files?.[0]
  if (f) await uploadAvatar(f)
  if (fotoIn.value) fotoIn.value.value = ''
}
const EM_BREVE: Record<string, { link?: string; texto?: string }> = {
  intimacoes: { link: '/intimacoes', texto: 'Abrir as intimações do CRM' }, leads: { link: '/leads', texto: 'Abrir os leads do CRM' },
}
</script>

<template>
  <div class="secretaria space-y-4">
    <header class="flex flex-col items-center gap-3 text-center pt-2">
      <img src="/mono-dark.png" alt="Lara Café Advocacia & Consultoria" class="h-14 w-auto dark:invert select-none" />
      <div class="flex items-center gap-4 flex-wrap justify-center">
        <button type="button" class="foto" :disabled="isUploading" title="Clique para trocar a foto" aria-label="Trocar foto" @click="fotoIn?.click()">
          <img v-if="profile?.avatar_url" :src="profile.avatar_url" alt="Minha foto" />
          <span v-else>Sua foto</span>
        </button>
        <input ref="fotoIn" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="trocarFoto" />
        <div class="text-left">
          <h1 class="text-2xl font-semibold text-primary dark:text-zinc-100">{{ saudacao }}</h1>
          <p class="text-sm text-gray-500 capitalize-first">{{ dataHoje }}</p>
          <p v-if="avatarError" class="text-xs text-danger">{{ avatarError }}</p>
        </div>
      </div>
    </header>

    <nav class="tabs" role="tablist" aria-label="Seções da Secretária">
      <button v-for="a in ABAS" :key="a.id" type="button" role="tab" :aria-selected="aba === a.id" :class="{ ativa: aba === a.id }" @click="aba = a.id">
        {{ a.nome }}<span v-if="selo(a.id)" class="selo" :aria-label="`${selo(a.id)} novos`">{{ selo(a.id) }}</span>
      </button>
    </nav>

    <SecretariaInicio v-show="aba === 'inicio'" @urgentes="urgentes = $event" @novos="novos = $event" />
    <section v-if="aba !== 'inicio'" class="cartao text-center py-12">
      <h2 class="text-lg font-semibold">{{ ABAS.find(a => a.id === aba)?.nome }}</h2>
      <p class="text-sm text-gray-500 mt-2">Em breve. Esta aba será montada na próxima etapa.</p>
      <NuxtLink v-if="EM_BREVE[aba]?.link" :to="EM_BREVE[aba]!.link" class="inline-block mt-4 text-sm font-semibold underline text-secondary-dark">{{ EM_BREVE[aba]!.texto }}</NuxtLink>
    </section>
    <p class="text-[11px] text-gray-400 text-center max-w-3xl mx-auto pt-2">Comunicação e conteúdo do escritório seguem o Provimento 205/2021 da OAB: sem captação de clientela, sem promessa de resultado e sem expor dados de clientes. Prazos calculados aqui são apoio: confirme sempre no sistema do tribunal.</p>
  </div>
</template>

<style scoped>
.secretaria { --ouro: #c9a24a; --ouro-esc: #8a6a26; --ouro-suave: #f4ecd9; max-width: 1040px; margin: 0 auto; }
:global(.dark) .secretaria { --ouro: #d4af5a; --ouro-esc: #b8903a; --ouro-suave: #2c2618; }
.foto { width: 84px; height: 84px; border-radius: 9999px; border: 3px solid var(--ouro); background: var(--ouro-suave); overflow: hidden; display: grid; place-items: center; font-size: 11px; font-weight: 600; color: var(--ouro-esc); padding: 0; cursor: pointer; }
.foto img { width: 100%; height: 100%; object-fit: cover; }
.capitalize-first::first-letter { text-transform: uppercase; }
.tabs { display: flex; gap: 2px; overflow-x: auto; border-bottom: 1px solid rgb(0 0 0 / .08); position: sticky; top: 0; z-index: 5; background: inherit; scrollbar-width: none; }
:global(.dark) .tabs { border-color: rgb(255 255 255 / .1); }
.tabs button { flex: 0 0 auto; padding: 12px 14px; font-weight: 600; font-size: 13px; color: #857866; border-bottom: 3px solid transparent; display: flex; gap: 7px; align-items: center; }
.tabs button.ativa { color: inherit; border-bottom-color: var(--ouro); }
.selo { min-width: 19px; height: 19px; padding: 0 5px; border-radius: 10px; background: var(--ouro); color: #fff; font-size: 11px; font-weight: 700; display: inline-grid; place-items: center; }
:global(.dark) .selo { color: #17130b; }
.cartao { background: #fff; border: 1px solid rgb(0 0 0 / .08); border-top: 3px solid var(--ouro); border-radius: 10px; padding: 16px; }
:global(.dark) .cartao { background: #1e1b17; border-color: rgb(255 255 255 / .1); border-top-color: var(--ouro); }
</style>
