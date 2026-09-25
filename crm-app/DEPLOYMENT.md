# Guia de Deploy - Nuxt 4 no Coolify

Este documento detalha as configurações necessárias para garantir que o projeto Nuxt 4 seja implantado com sucesso no Coolify (usando Nixpacks).

## 1. Requisitos de Ambiente

### Versão do Node.js
O Nuxt 4 (especificamente o Nitro) exige o **Node.js >= 22.12.0**.
- **No `package.json`**: Certifique-se de que o campo `engines` está presente:
  ```json
  "engines": {
    "node": ">=22.12.0"
  }
  ```
- **No Coolify**: Adicione uma variável de ambiente:
  `NIXPACKS_NODE_VERSION=22.12.0` (ou apenas `22`).

## 2. Compatibilidade de Binários Nativos (Windows -> Linux)

O Nuxt 4 e suas ferramentas de build (como Tailwind e Oxc) utilizam binários nativos e WASM. Desenvolver no Windows e fazer deploy no Linux exige cuidados com o `package-lock.json`.

### Passo A: Forçar dependências WASM
Alguns pacotes como `@emnapi/runtime` e `@emnapi/core` podem ser omitidos do lockfile no Windows por serem considerados opcionais/específicos de plataforma, mas o build do Linux pode exigi-los. Para evitar o erro `npm error Missing: ... from lock file`, eles foram adicionados como dependências explícitas no `package.json`.

### Passo B: Gerar lockfile multiplataforma
Sempre que atualizar dependências, rode o comando abaixo para garantir que os binários de Linux sejam incluídos no seu `package-lock.json`:

```bash
npm install --os=linux --cpu=x64 --libc=glibc --package-lock-only
```

Isso garante que o comando `npm ci` no servidor de deploy funcione sem erros.

## 3. Scripts de Inicialização

O Coolify/Nixpacks precisa saber como iniciar a aplicação.
- **No `package.json`**: O script `start` deve apontar para o servidor gerado:
  ```json
  "scripts": {
    "build": "nuxt build",
    "start": "node .output/server/index.mjs"
  }
  ```

## 4. Configurações no Painel do Coolify

1. **Build Pack**: Certifique-se de que está usando **Nixpacks**.
2. **Start Command**: Deixe o campo **vazio** para usar o `npm start` automático.
3. **Porta**: A porta padrão do Nuxt é `3000`.
4. **Variáveis de Ambiente**:
   - `NODE_ENV=production`
   - `NIXPACKS_NODE_VERSION=22.12.0`

## 5. Troubleshooting (Resolução de Problemas)

- **Erro `Missing: @emnapi/runtime from lock file`**: Ocorre quando o `npm ci` no servidor não encontra a referência no lockfile gerado no Windows. Solução: Adicionar o pacote como dependência explícita no `package.json` e rodar o comando do item 2.
- **Erro `Cannot find module '@oxc-parser/binding-linux-x64-gnu'`**: Significa que o lockfile não tem os binários de Linux. Rode o comando do item 2 e faça o push.
- **Erro `/bin/bash: -c: option requires an argument`**: O campo "Start Command" no Coolify tem espaços ou está mal preenchido. Deixe-o totalmente vazio.
