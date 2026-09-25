# Manual do Projeto

## Visao geral
Projeto Nuxt 4 com Tailwind CSS, Supabase, Pinia e nuxt-llms. Inclui autenticacao completa (login/cadastro/confirmacao), header global, gerenciamento de perfil com Pinia e rotas de API protegidas para administracao.

## Como rodar
- Instalar dependencias: `npm install`
- Ambiente de desenvolvimento: `npm run dev`
- Gerar tipos Nuxt: `npx nuxt prepare`
- Build de producao: `npm run build`
- Preview de producao: `npm run preview`

## Modulos principais
- `@nuxtjs/tailwindcss`
- `@nuxt/image`
- `@nuxtjs/supabase`
- `@pinia/nuxt`
- `nuxt-llms`

## Variaveis de ambiente (.env)
```
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SECRET_KEY=
NUXT_PUBLIC_SITE_URL=
NUXT_PUBLIC_ORIGINAL_SITE_URL=
```

## Rotas do app
| Rota | Descricao | Protegida |
|---|---|---|
| `/` | Design system / pagina principal | Sim (middleware auth) |
| `/login` | Login e cadastro | Nao |
| `/confirm` | Confirmacao de email Supabase | Nao |
| `/llms.txt` | Documentacao para LLMs | Nao |
| `/llms-full.txt` | Documentacao completa para LLMs | Nao |
| `/.well-known/llms.txt` | Redirect para /llms.txt | Nao |

## Rotas de API (server)
| Endpoint | Metodo | Descricao | Autenticacao |
|---|---|---|---|
| `/api/me` | GET | Retorna perfil do usuario logado. Cria perfil automaticamente se nao existir | JWT valido |
| `/api/admin/users` | GET | Lista todos os usuarios | JWT + role admin |
| `/api/admin/users` | PUT | Edita nome/role de um usuario | JWT + role admin |

## Estrutura de pastas
```
saas/
├── app/
│   ├── app.vue                    # Shell do app, header global condicional
│   ├── middleware/
│   │   └── auth.ts                # Redireciona para /login se nao autenticado
│   ├── pages/
│   │   ├── index.vue              # Pagina principal (middleware: auth)
│   │   ├── login.vue              # Login e cadastro
│   │   └── confirm.vue            # Confirmacao de email
│   ├── components/
│   │   ├── Alert.vue              # Alertas com 4 tipos: success/danger/warning/info
│   │   ├── Badge.vue              # Badge de status
│   │   ├── Button.vue             # Botao reutilizavel com variantes
│   │   ├── Card.vue               # Card container
│   │   ├── DarkModeToggle.vue     # Toggle dark/light mode
│   │   ├── Input.vue              # Input com label
│   │   ├── header/
│   │   │   ├── HeaderBar.vue      # Header global: logo, dark mode, perfil, logout
│   │   │   └── HeaderProfile.vue  # Exibe nome, email e avatar do usuario
│   │   └── login/
│   │       ├── LoginBadge.vue     # Badge da area de login
│   │       ├── LoginDivider.vue   # Divisor visual
│   │       ├── LoginHelperRow.vue # Links auxiliares (ex: esqueci senha)
│   │       ├── LoginStatCard.vue  # Card de estatistica
│   │       └── LoginTabs.vue      # Tabs Login / Cadastro
│   ├── plugins/
│   │   └── profile.client.ts     # Carrega perfil no Pinia apos autenticacao
│   ├── stores/
│   │   └── profile.ts            # Pinia store: estado global do perfil
│   └── types/
│       └── database.types.ts     # Tipos TypeScript espelhando o banco Supabase
├── config/
│   ├── nuxt-image.ts             # Config do @nuxt/image
│   ├── nuxt-llms.ts              # Config do nuxt-llms
│   └── supabase.ts               # Config do @nuxtjs/supabase
├── server/
│   ├── api/
│   │   ├── me.get.ts             # GET /api/me
│   │   └── admin/
│   │       ├── users.get.ts      # GET /api/admin/users
│   │       └── users.put.ts      # PUT /api/admin/users
│   └── routes/
│       └── .well-known/
│           └── llms.txt.get.ts   # Redirect /.well-known/llms.txt -> /llms.txt
├── types/
│   └── profile.ts                # Interface Profile (id, email, name, role, created_at)
├── public/
│   └── robots.txt
├── tailwind.config.js
├── nuxt.config.ts
├── nuxt.schema.d.ts
└── tsconfig.json
```

## Banco de dados (Supabase)
### Tabela `profiles`
| Coluna | Tipo | Descricao |
|---|---|---|
| `id` | uuid (FK auth.users) | ID do usuario |
| `email` | text | Email |
| `name` | text | Nome |
| `role` | text | `admin` \| `vendedor` \| `user` (default: user) |
| `created_at` | timestamptz | Data de criacao |

## Autenticacao
- **Login**: `supabase.auth.signInWithPassword` → redireciona para `/`
- **Cadastro**: `supabase.auth.signUp` → redireciona para `/confirm`
- **Confirmacao**: `/confirm` monitora `useSupabaseUser` e redireciona
- **Logout**: `supabase.auth.signOut` no HeaderBar
- **Middleware**: `app/middleware/auth.ts` protege rotas com `definePageMeta({ middleware: 'auth' })`

## Validacoes do formulario de cadastro
- Nome obrigatorio
- Email obrigatorio
- Senha minimo 8 caracteres
- Senha deve conter 1 maiuscula e 1 numero
- Confirmacao de senha deve coincidir
- Checkbox de termos obrigatorio

## Pinia (estado global)
- **Store**: `useProfileStore` em `app/stores/profile.ts`
- **Plugin**: `app/plugins/profile.client.ts` carrega o perfil automaticamente apos login
- **Actions**: `fetchMe()` (via /api/me), `fetchProfile(userId)` (via Supabase direto), `clearProfile()`

## Seguranca
- Sessao em HTTP-only cookies (`useSsrCookies: true`)
- `sameSite: lax` + `secure: true` (anti-CSRF, HTTPS forcado em prod)
- Rotas admin verificam `role === 'admin'` no servidor antes de qualquer query
- JWT verificado server-side via `serverSupabaseUser`
- Service Role Key nunca exposta ao cliente
- Mensagens de erro genericas (nao revelam se email existe)
- Emails normalizados com `.trim().toLowerCase()`

## Notas
- O header global nao aparece em `/login` e `/confirm` (condicional no `app.vue`)
- O tema escuro e controlado pela classe `dark` no `<html>`
- `serverSupabaseUser` retorna `JwtPayload` — usar `.sub` para obter o UUID do usuario

