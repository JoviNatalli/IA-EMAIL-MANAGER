# Nuvoly

**Your inbox, intelligently managed.**

SaaS de gestão inteligente de email com IA integrada como copiloto — não um
chatbot ao lado, mas parte da própria experiência de gerir a inbox.

> Projeto de portfólio construído por fases. Este README reflete o estado
> após a **Fase 3 — Gmail**. O plano completo (64 secções) está em
> [`docs/master-spec.md`](./docs/master-spec.md).

## Estado atual (Fase 3 — Gmail) ✅

**Fase 1 — Foundation**
- Next.js 16 (App Router, Turbopack, React 19.2), TypeScript strict
- Design system próprio sobre Tailwind CSS v4 + Radix UI (light/dark, tokens OKLCH)
- Autenticação (Auth.js v5): login/signup por credenciais + **Demo Mode** de um clique
- PostgreSQL + Drizzle ORM, schema de utilizadores/sessões/preferências
- Layout da app: sidebar, topbar, command palette (⌘K), 14 rotas de `/app/*`
- Onboarding de 4 passos (foco, nível de IA, funcionalidades) persistido em BD
- Landing page completa (hero, features, workflow, pricing, FAQ)
- Rota `/proxy.ts` protege `/app/*` e `/onboarding` (checagem otimista); cada
  Server Action/Route Handler revalida a sessão antes de tocar na BD

**Fase 2 — Email** (nova)
- Schema real de email: `threads`, `emails`, `attachments`, `labels`,
  `threadLabels` — multi-tenant (tudo escopado a `userId`), com pastas
  (inbox/sent/drafts/archive/trash), estrelas, prioridade e categoria
  (campos já no modelo, prontos para a Fase 4 — ver nota abaixo)
- Dataset de demonstração realista: 20 threads / 24 emails / 5 labels em
  português, gerado por `pnpm db:seed` (idempotente, reexecutável)
- Inbox de duas colunas (lista + detail) com contagens por pasta na sidebar,
  thread expansível com histórico de mensagens
- Ações: ler, responder, estrela, arquivar, mover para o lixo, apagar
  definitivamente — todas via Server Actions que revalidam a sessão e a
  posse do recurso no servidor antes de mutar
- Compose com autosave de rascunho (debounced) e envio (modo demo — grava em
  Sent, sem envio real de email)
- Labels: criar, aplicar/remover a uma thread, apagar, navegar por label
- Search por assunto/remetente/conteúdo (`/app/search`) — pesquisa semântica
  fica para a Fase 6
- Suite E2E (Playwright, `pnpm test:e2e`) cobrindo o fluxo crítico: login →
  abrir thread → estrela → arquivar/restaurar → lixo → compose/enviar →
  responder → labels → search

> **Nota — sem IA ainda**: `priority`/`category` já existem no schema (para
> não exigir migration na Fase 4) mas são apenas placeholders estáticos do
> seed, nunca apresentados como classificação de IA. O painel "AI Insights"
> na thread diz explicitamente que chega na Fase 4 — por spec (§13),
> **nunca inventar informação**.

**Fase 3 — Gmail** (nova)
- Login real com Google (OAuth, `next-auth`), a par do Credentials/Demo Mode
  já existentes — `access_type=offline`+`prompt=consent` para garantir
  `refresh_token`; tokens persistidos na tabela `account` (o mesmo adapter
  da Fase 1) e renovados automaticamente quando expiram
  (`src/lib/google/tokens.ts`)
- Sincronização real via Gmail API (`src/lib/google/`): importa as últimas
  30 conversas da conta ligada (threads + mensagens + labels do utilizador),
  botão "Sincronizar agora" em Definições → Contas
- Envio real (`messages.send`) e rascunhos reais (`users.drafts`) quando a
  conta tem Gmail ligado — compose/reply passam a sair de verdade; sem
  Gmail ligado mantém-se o envio simulado da Fase 2 (Demo Mode)
- Ações do dia a dia propagadas para o Gmail real: estrela, lido,
  arquivar/restaurar (best-effort — nunca bloqueiam a UI), mover para o
  lixo e apagar definitivamente (aqui sim, falham de forma visível em vez
  de fingir sucesso — spec §35)
- Labels importadas do Gmail sincronizam nos dois sentidos (aplicar/remover
  na app reflete-se lá); labels criadas só na app ainda não sobem para o
  Gmail — ver "Future Improvements"
- Erros da Gmail API nunca aparecem crus — sempre traduzidos para PT-PT
  (token expirado, permissões insuficientes, rate limit, Gmail em baixo)

Ainda **não** existe: chamadas a LLMs, tool calling — isso é Fases 4–6, ver
roadmap abaixo.

## Tech stack

| Camada | Escolha |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4 |
| UI | Componentes próprios sobre Radix UI (padrão shadcn/ui — ver nota abaixo) |
| Auth | Auth.js v5 — Credentials + Demo Mode (Fase 1) e Google OAuth real (Fase 3) |
| Database | PostgreSQL 16 + Drizzle ORM |
| Validação | Zod |
| Animação | Framer Motion (a introduzir com conteúdo real na Fase 2+) |

> **Nota sobre o design system**: o CLI `shadcn` (`ui.shadcn.com`) não estava
> acessível no ambiente onde a Fase 1 foi construída, por isso os componentes
> em `src/components/ui/` foram escritos à mão seguindo exatamente as mesmas
> convenções (Radix + CVA + `cn()`), tokens e estrutura do shadcn/ui —
> funcionalmente equivalentes, sem a dependência do CLI. `pnpm dlx shadcn@latest add <componente>`
> deve continuar a funcionar normalmente para adicionar novos componentes.

## Arquitetura

```
src/
├── app/                  # Rotas (App Router)
│   ├── page.tsx          # Landing page
│   ├── login/            # Login/signup + Demo Mode
│   ├── onboarding/       # Onboarding de 4 passos
│   ├── app/               # Shell autenticado (sidebar/topbar) + rotas /app/*
│   │   ├── inbox/, sent/, drafts/, archive/, trash/, starred/, important/
│   │   │   └── [threadId]/  # Detail da thread dentro de cada pasta
│   │   ├── labels/           # Gestão de labels + navegação por label
│   │   └── search/           # Pesquisa por assunto/remetente/conteúdo
│   ├── api/auth/          # Route handler do Auth.js
│   └── actions/           # Server Actions (auth, onboarding, sessão, emails)
├── components/
│   ├── ui/                # Design system (Radix + CVA)
│   ├── layout/             # Sidebar, topbar, command palette, tema
│   ├── mail/                # Thread list/detail, compose, labels, search
│   ├── auth/, onboarding/, settings/, marketing/, shared/
├── lib/
│   ├── auth/               # Config Auth.js (edge-safe) + schemas Zod
│   ├── emails/              # Queries, tipos e formatação de email/thread
│   ├── google/              # Fase 3 — cliente Gmail API, tokens, sync, MIME
│   └── db/                 # Client Drizzle + schema + seed (+ dados demo)
├── proxy.ts                # Checagem otimista de sessão (Next.js 16)
└── types/                  # Augmentation de tipos (next-auth)
drizzle/                    # Migrations SQL geradas
tests/e2e/                  # Suite Playwright (fluxo crítico da Fase 2)
```

Princípios seguidos (ver `docs/master-spec.md` §58–59):
server/client logic separados, nunca confiar em input externo sem validação
Zod, autorização sempre revalidada no servidor (nunca só no proxy), secrets
apenas no servidor.

## Desenvolvimento local

### Pré-requisitos
- Node.js ≥ 20.9, pnpm
- Um Postgres acessível — não precisa de instalar nada: `pnpm db:local`
  sobe um Postgres real (PGlite) em `127.0.0.1:5433`, ver
  [`dev-db/README.md`](./dev-db/README.md). Alternativa: Postgres.app /
  Homebrew / Docker / uma connection string remota.

### Setup

```bash
pnpm install
cp .env.example .env.local   # já vem pronto para o dev-db; ajuste se usar outro Postgres
pnpm db:local                 # (terminal 1, deixe a correr) sobe o Postgres local
pnpm db:migrate               # (terminal 2) aplica o schema
pnpm db:seed                  # cria o utilizador demo + 20 threads/24 emails de exemplo
pnpm dev
```

Abra `http://localhost:3000` — clique **"Explorar demo sem conta"** no login
para entrar imediatamente, sem criar conta (`demo@nuvoly.app` / `demo1234`).

### Scripts

| Comando | Descrição |
| --- | --- |
| `pnpm dev` | Servidor de desenvolvimento (Turbopack) |
| `pnpm db:local` | Sobe o Postgres local (PGlite), sem instalação |
| `pnpm build` / `pnpm start` | Build e serve de produção |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit` |
| `pnpm db:generate` | Gera migration a partir do schema |
| `pnpm db:migrate` | Aplica migrations pendentes |
| `pnpm db:seed` | Recria o utilizador e o dataset de demonstração (idempotente) |
| `pnpm db:studio` | Drizzle Studio (explorar a BD) |
| `pnpm test:e2e` | Suite Playwright (reseeda a BD antes de correr) |

## Variáveis de ambiente

Ver [`.env.example`](./.env.example). `DATABASE_URL` e `AUTH_SECRET` chegam
para a Fase 1/2. A partir da Fase 3, `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`
(Google Cloud Console → Auth Platform → Clients, tipo "Web application",
redirect URI `http://localhost:3000/api/auth/callback/google`) são
necessárias para o botão "Continuar com Google" funcionar — sem elas, o
provider falha ao autorizar mas o resto da app (Credentials + Demo Mode)
continua a funcionar normalmente. Os providers de IA só passam a ser lidos
na Fase 4.

## Segurança (Fases 1–3)

- Passwords com hash `bcrypt` (nunca em texto simples)
- `AUTH_SECRET` gerado aleatoriamente, nunca commitado (`.env*` no `.gitignore`)
- Sessão JWT; toda rota `/app/*` e `/onboarding` revalida `auth()` no servidor
  além da checagem otimista do proxy
- Nenhuma API key exposta ao cliente
- Multi-tenant: todas as queries/Server Actions de email escopam por
  `userId` — nenhuma thread/email é lida ou mutada sem confirmar a posse do
  recurso no servidor (nunca confiar no `threadId` do cliente sozinho)
- OAuth Google com `access_type=offline`+`prompt=consent` (garante
  `refresh_token`); tokens Gmail nunca vão para o cliente nem para logs —
  todas as chamadas à Gmail API correm em Server Actions/módulos
  `server-only` (`src/lib/google/`)
- Erros da Gmail API são sempre traduzidos para uma mensagem em PT-PT antes
  de chegar à UI (`GmailError.userMessage`) — a mensagem técnica fica só na
  consola do servidor

## Future Improvements

- **Outlook/Microsoft Graph**: arquitetura de acesso a email já pensada
  para ficar abstraída por trás de um `EmailProvider` — hoje só o Gmail está
  implementado
- **Sincronização incremental**: já guardamos o `historyId` da Gmail History
  API a cada sync, mas ainda não o usamos — hoje "Sincronizar agora" volta a
  importar as últimas 30 conversas em vez de só as mudanças
- **Anexos reais**: a Gmail API devolve anexos nas mensagens, mas ainda não
  são transferidos nem guardados (`attachments` fica vazio para threads
  Gmail) — a UI nunca finge tê-los
- **Labels novas → Gmail**: uma label criada só na app ainda não é criada na
  conta Gmail real; só labels importadas de lá sincronizam nos dois sentidos
- **Emails em HTML**: o corpo de mensagens Gmail é sempre convertido para
  texto simples (mesmo critério da Fase 2) — mostrar o HTML original de
  forma segura (sanitizado) é trabalho futuro
- **Encriptação de tokens em repouso**: `access_token`/`refresh_token`
  ficam na base de dados tal como o Auth.js Drizzle Adapter os grava
  (padrão da biblioteca) — cifrá-los em repouso é um endurecimento razoável
  antes de produção real com utilizadores externos

## Roadmap

- ~~**Fase 2** — Emails de demonstração, inbox real, thread, compose, labels~~ ✅
- ~~**Fase 3** — OAuth Google real + Gmail API (sync, send, drafts)~~ ✅
- **Fase 4** — Resumo, categorização, prioridade e respostas por IA
- **Fase 5** — AI Agent com tool calling e ações confirmáveis
- **Fase 6** — Pesquisa semântica/RAG, daily briefing, calendar intelligence
- **Fase 7** — Polish: animações, responsividade, acessibilidade, testes
- **Fase 8** — Landing final, demo mode com dataset completo, case study

Plano detalhado por secção: [`docs/master-spec.md`](./docs/master-spec.md).
