<script setup lang="ts">
import type { SecretariaGoogle } from '~/composables/useSecretariaGoogle'
const props = defineProps<{ g: SecretariaGoogle; recurso: string }>()
const s = () => props.g.status.value
</script>

<template>
  <section class="cartao" data-testid="google-conectar">
    <h2>Conectar o Google</h2>
    <p v-if="!s()" class="txt">Verificando a conexão com o Google…</p>
    <template v-else-if="!s()!.configurado">
      <p class="txt">Para {{ recurso }}, o CRM precisa entrar na sua conta Google. Falta uma configuração única no servidor (só você pode fazer, no Google Cloud):</p>
      <ol class="passos">
        <li>Em <b>console.cloud.google.com</b>, crie um projeto e ative as APIs <b>Gmail API</b> e <b>Google Calendar API</b>.</li>
        <li>Em <b>Tela de permissão OAuth</b>, tipo <b>Externo</b>, deixe em <b>Teste</b> e adicione o seu e-mail como usuário de teste.</li>
        <li>Em <b>Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web</b>, coloque como URI de redirecionamento: <code>{{ s()!.redirectUri }}</code></li>
        <li>Na Vercel (Settings → Environment Variables), crie <code>GOOGLE_CLIENT_ID</code> e <code>GOOGLE_CLIENT_SECRET</code> com os valores gerados e faça um novo deploy.</li>
      </ol>
      <p class="txt">Depois disso, esta tela mostra o botão para conectar.</p>
    </template>
    <template v-else>
      <p class="txt">Conecte a sua conta Google para {{ recurso }}. O CRM pede só o que precisa: <b>ler</b> o Gmail (nunca envia nem apaga e-mails) e <b>criar eventos</b> na Agenda.</p>
      <a class="btn" href="/api/google/conectar" data-testid="botao-conectar">Conectar com o Google</a>
    </template>
  </section>
</template>

<style scoped>
.cartao { background: #fff; border: 1px solid rgb(0 0 0 / .08); border-top: 3px solid var(--ouro, #c9a24a); border-radius: 10px; padding: 16px; }
:global(.dark) .cartao { background: #1e1b17; border-color: rgb(255 255 255 / .1); border-top-color: var(--ouro, #d4af5a); }
h2 { font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ouro-esc, #8a6a26); margin-bottom: 10px; }
.txt { font-size: 14px; margin-bottom: 10px; }
.passos { list-style: decimal; padding-left: 20px; font-size: 13px; display: grid; gap: 6px; margin-bottom: 10px; }
code { font-size: 12px; overflow-wrap: anywhere; user-select: all; background: rgb(0 0 0 / .05); padding: 1px 5px; border-radius: 4px; }
.btn { display: inline-block; background: var(--ouro-esc, #8a6a26); color: #fff; border-radius: 8px; padding: 9px 14px; font-weight: 600; font-size: 13px; }
:global(.dark) .btn { color: #17130b; background: var(--ouro, #d4af5a); }
</style>
