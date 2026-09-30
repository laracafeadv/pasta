<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SecretariaGoogle } from '~/composables/useSecretariaGoogle'
import type { CaixaSub } from '~~/shared/data/secretaria'
import GoogleConectar from './GoogleConectar.vue'

// Caixa de entrada do Gmail (somente leitura): Principal (7 dias), Não lidos (14 dias) e Tudo (3 dias). Atualiza sozinha a cada 5 minutos (na página).
const props = defineProps<{ g: SecretariaGoogle }>()
const SUBS: [CaixaSub, string][] = [['principal', 'Principal · 7 dias'], ['naolidos', 'Não lidos · 14 dias'], ['tudo', 'Tudo · 3 dias']]
const verMais = ref(15)
const sub = computed(() => props.g.caixa.sub)
const lista = computed(() => props.g.caixa.dados[sub.value] ?? [])
const hhmm = (t: number) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(t))
const dia = (iso: string) => iso ? new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date(iso)) : ''
const quando = (iso: string) => !iso ? '' : dia(iso) === dia(new Date().toISOString()) ? hhmm(new Date(iso).getTime()) : new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }).format(new Date(iso))
function trocar(k: CaixaSub) { props.g.caixa.sub = k; verMais.value = 15; if (!props.g.caixa.dados[k] || Date.now() - (props.g.caixa.em[k] ?? 0) > 120000) props.g.carregarCaixa(k) }
</script>

<template>
  <div class="space-y-4">
    <GoogleConectar v-if="!g.status.value?.conectado" :g="g" recurso="ver o seu e-mail aqui" />
    <section v-else id="sEmail" class="cartao">
      <h2>E-mail
        <span class="flex gap-2 items-center flex-wrap">
          <span class="flex gap-1.5" role="group" aria-label="Caixa">
            <button v-for="[k, n] in SUBS" :key="k" type="button" class="chip" :aria-pressed="sub === k" :data-testid="`sub-${k}`" @click="trocar(k)">{{ n }}</button>
          </span>
          <button type="button" class="btn sec sm" @click="g.carregarCaixa(sub)">Atualizar</button>
        </span>
      </h2>
      <p class="msg">Atualiza sozinho a cada 5 minutos.<template v-if="g.caixa.em[sub]"> Atualizado às {{ hhmm(g.caixa.em[sub]!) }}.</template></p>
      <p v-if="g.caixa.carregando[sub] && !g.caixa.dados[sub]" class="msg">Lendo o Gmail…</p>
      <p v-if="g.caixa.erro[sub]" class="msg err">{{ g.caixa.erro[sub] }} <button type="button" class="link" @click="g.carregarCaixa(sub)">Tentar de novo</button></p>
      <p v-else-if="g.caixa.dados[sub] && !lista.length" class="msg">Nenhum e-mail nesta aba.</p>
      <a v-for="m in lista.slice(0, verMais)" :key="m.id" class="mail" :class="{ nova: m.naoLida }" :href="m.link" target="_blank" rel="noopener" :data-testid="`mail-${m.id}`">
        <span class="bolinha" :class="{ on: m.naoLida }" />
        <span class="cx"><span class="de">{{ m.de }}</span><span class="as">{{ m.assunto }}</span><span class="pv">{{ m.previa }}</span></span>
        <span class="hr">{{ quando(m.quando) }}</span>
      </a>
      <button v-if="lista.length > verMais" type="button" class="btn sec sm mt-2" @click="verMais += 15">Ver mais ({{ lista.length - verMais }})</button>
      <p class="msg mt-3">Conta conectada: {{ g.status.value?.email || 'Google' }} · só leitura · <button type="button" class="link" @click="g.desconectar">Desconectar</button></p>
    </section>
  </div>
</template>

<style scoped>
.cartao { background: #fff; border: 1px solid rgb(0 0 0 / .08); border-top: 3px solid var(--ouro, #c9a24a); border-radius: 10px; padding: 16px; min-width: 0; }
:global(.dark) .cartao { background: #1e1b17; border-color: rgb(255 255 255 / .1); border-top-color: var(--ouro, #d4af5a); }
h2 { font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ouro-esc, #8a6a26); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.btn { background: var(--ouro-esc, #8a6a26); color: #fff; border-radius: 8px; padding: 9px 14px; font-weight: 600; font-size: 13px; }
.btn.sec { background: transparent; color: var(--ouro-esc, #8a6a26); border: 1px solid var(--ouro, #c9a24a); }
:global(.dark) .btn.sec { color: var(--ouro, #d4af5a); }
.btn.sm { padding: 5px 10px; font-size: 12px; }
.link { background: none; text-decoration: underline; font-size: 12px; color: var(--ouro-esc, #8a6a26); }
.chip { border: 1px solid rgb(0 0 0 / .12); border-radius: 999px; padding: 4px 11px; font-size: 12px; font-weight: 500; text-transform: none; letter-spacing: 0; }
.chip[aria-pressed='true'] { border-color: var(--ouro, #c9a24a); background: var(--ouro-suave, #f4ecd9); font-weight: 700; }
:global(.dark) .chip { border-color: rgb(255 255 255 / .18); }
.msg { font-size: 13px; color: #857866; padding: 4px 0; } .msg.err { color: #b3261e; }
.mail { display: grid; grid-template-columns: 14px 1fr auto; gap: 10px; align-items: start; padding: 10px; border-radius: 8px; border: 1px solid rgb(0 0 0 / .1); margin-bottom: 8px; min-width: 0; color: inherit; text-decoration: none; }
:global(.dark) .mail { border-color: rgb(255 255 255 / .12); }
.mail.nova { border-left: 4px solid var(--ouro, #c9a24a); background: var(--ouro-suave, #f4ecd9); }
.bolinha { width: 10px; height: 10px; border-radius: 50%; border: 2px solid rgb(0 0 0 / .2); margin-top: 6px; } .bolinha.on { background: var(--ouro, #c9a24a); border-color: var(--ouro, #c9a24a); }
.cx { min-width: 0; display: grid; gap: 2px; }
.de { font-size: 12px; color: #857866; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.as { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mail.nova .as, .mail.nova .de { font-weight: 700; color: inherit; }
.pv { font-size: 12px; color: #857866; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hr { font-size: 11px; color: #857866; font-weight: 600; }
a { color: inherit; }
</style>
