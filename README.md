# Lara Café Advocacia

Site institucional para escritório de advocacia especializado em Direito de Família,
Sucessões e Direito Patrimonial — com blog jurídico e painel administrativo completo.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4 + Framer Motion + React Router 7
- **Backend:** Express + tRPC 11
- **Banco de dados:** SQLite (via Drizzle ORM) — troque para MySQL/TiDB em produção apenas
  alterando o driver em `server/src/db/index.ts` e `server/drizzle.config.ts` (o schema em
  `server/src/db/schema.ts` já usa tipos compatíveis com Drizzle para ambos os dialetos)
- **Autenticação admin:** cookie httpOnly + JWT, senha com bcrypt
- **Editor de conteúdo:** TipTap
- **Upload de imagens:** disco local (`server/uploads`), servido em `/uploads` — troque por S3
  facilmente substituindo o `multer.diskStorage` em `server/src/routes/upload.ts`

## Estrutura

```
client/   # SPA React (Vite)
server/   # API Express + tRPC + Drizzle
```

## Como rodar localmente

Pré-requisitos: Node 22+, pnpm.

```bash
pnpm install

# configurar variáveis de ambiente
cp server/.env.example server/.env
# edite server/.env e defina ADMIN_EMAIL / ADMIN_PASSWORD / JWT_SECRET

# criar tabelas e popular dados de exemplo (categorias, artigos, depoimentos, usuário admin)
pnpm db:push
pnpm db:seed

# subir servidor (porta 3001) e cliente (porta 5173) juntos
pnpm dev
```

Acesse:
- Site: http://localhost:5173
- Painel admin: http://localhost:5173/admin/login (credenciais do `.env`)

## Build de produção

```bash
pnpm build   # gera client/dist e server/dist
pnpm start   # sobe o servidor Express, que também serve o client/dist
```

## Variáveis de ambiente (`server/.env`)

| Variável | Descrição |
| --- | --- |
| `PORT` | Porta da API (padrão 3001) |
| `DATABASE_URL` | Caminho do arquivo SQLite |
| `JWT_SECRET` | Segredo para assinar o cookie de sessão do admin |
| `CLIENT_ORIGIN` | Origem do frontend (CORS) |
| `UPLOAD_DIR` | Diretório de upload de imagens |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credenciais do usuário admin criado pelo seed |

## Funcionalidades

- Landing page completa (hero, sobre, áreas de atuação, depoimentos, CTA final, contato)
- Blog jurídico com categorias, busca, paginação "carregar mais" e página de artigo
- Formulário de contato com validação em tempo real, salvo no banco
- Botão flutuante do WhatsApp
- Painel administrativo protegido por login:
  - Dashboard com indicadores
  - CRUD de artigos com editor rico e upload de imagem de capa
  - CRUD de categorias (com proteção contra exclusão de categoria com artigos)
  - Gerenciamento de mensagens de contato (marcar lido/não lido, excluir, exportar CSV)

## Observações

- WhatsApp e e-mail de contato ficam centralizados em `client/src/lib/constants.ts`
  (`WHATSAPP_NUMBER`, `WHATSAPP_DISPLAY`, `CONTACT_EMAIL`) — atualize ali para propagar a
  mudança para header, rodapé, seção de contato e botão flutuante.
- A navegação principal (Início, Sobre, Áreas de Atuação, Blog, Contato) usa rolagem suave por
  âncoras (`/#sobre`, `/#areas-de-atuacao`, `/#contato`) definidas em `NAV_LINKS`, no mesmo
  arquivo de constantes.
