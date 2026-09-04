# MailMind

**Your inbox, intelligently managed.**

SaaS de gestão inteligente de email com IA integrada como copiloto — não um
chatbot ao lado, mas parte da própria experiência de gerir a inbox.

> Projeto de portfólio construído por fases. Este README reflete o estado
> após a **Fase 1 — Foundation**. O plano completo (64 secções) está em
> [`docs/master-spec.md`](./docs/master-spec.md).

## Estado atual (Fase 1 — Foundation) ✅

- Next.js 16 (App Router, Turbopack, React 19.2), TypeScript strict
- Design system próprio sobre Tailwind CSS v4 + Radix UI (light/dark, tokens OKLCH)
- Autenticação (Auth.js v5): login/signup por credenciais + **Demo Mode** de um clique
- PostgreSQL + Drizzle ORM, schema de utilizadores/sessões/preferências
- Layout da app: sidebar, topbar, command palette (⌘K), 14 rotas de `/app/*`
- Onboarding de 4 passos (foco, nível de IA, funcionalidades) persistido em BD
- Landing page completa (hero, features, workflow, pricing, FAQ)
- Rota `/proxy.ts` protege `/app/*` e `/onboarding` (checagem otimista); cada
  Server Action/Route Handler revalida a sessão antes de tocar na BD

Ainda **não** existe: dados reais de email, integração Gmail, chamadas a LLMs,
tool calling. Isso é propositadamente Fases 2–6 — ver roadmap abaixo.

## Tech stack

| Camada | Escolha |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4 |
| UI | Componentes próprios sobre Radix UI (padrão shadcn/ui — ver nota abaixo) |
| Auth | Auth.js v5 (Credentials na Fase 1; Google OAuth real na Fase 3) |
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
│   ├── api/auth/          # Route handler do Auth.js
│   └── actions/           # Server Actions (auth, onboarding, sessão)
├── components/
│   ├── ui/                # Design system (Radix + CVA)
│   ├── layout/             # Sidebar, topbar, command palette, tema
│   ├── auth/, onboarding/, settings/, marketing/, shared/
├── lib/
│   ├── auth/               # Config Auth.js (edge-safe) + schemas Zod
│   └── db/                 # Client Drizzle + schema + seed
├── proxy.ts                # Checagem otimista de sessão (Next.js 16)
└── types/                  # Augmentation de tipos (next-auth)
drizzle/                    # Migrations SQL geradas
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
pnpm db:seed                  # cria o utilizador demo (demo@mailmind.app / demo1234)
pnpm dev
```

Abra `http://localhost:3000` — clique **"Explorar demo sem conta"** no login
para entrar imediatamente, sem criar conta.

### Scripts

| Comando | Descrição |
| --- | --- |
| `pnpm dev` | Servidor de desenvolvimento (Turbopack) |
| `pnpm db:local` | Sobe o Postgres local (PGlite), sem instalação |
| `pnpm build` / `pnpm start` | Build e serve de produção |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit` |
| `pnpm db:generate` | Gera migration a partir do schema |
| `pnpm db:migrate` | Aplica migrations pendentes |
| `pnpm db:seed` | Cria o utilizador de demonstração |
| `pnpm db:studio` | Drizzle Studio (explorar a BD) |

## Variáveis de ambiente

Ver [`.env.example`](./.env.example). Nenhuma é necessária além de
`DATABASE_URL` e `AUTH_SECRET` para correr a Fase 1 — as chaves de
Google OAuth e dos providers de IA só passam a ser lidas nas Fases 3–4.

## Segurança (Fase 1)

- Passwords com hash `bcrypt` (nunca em texto simples)
- `AUTH_SECRET` gerado aleatoriamente, nunca commitado (`.env*` no `.gitignore`)
- Sessão JWT; toda rota `/app/*` e `/onboarding` revalida `auth()` no servidor
  além da checagem otimista do proxy
- Nenhuma API key exposta ao cliente

## Roadmap

- **Fase 2** — Emails de demonstração, inbox real, thread, compose, labels
- **Fase 3** — OAuth Google real + Gmail API (sync, send, drafts)
- **Fase 4** — Resumo, categorização, prioridade e respostas por IA
- **Fase 5** — AI Agent com tool calling e ações confirmáveis
- **Fase 6** — Pesquisa semântica/RAG, daily briefing, calendar intelligence
- **Fase 7** — Polish: animações, responsividade, acessibilidade, testes
- **Fase 8** — Landing final, demo mode com dataset completo, case study

Plano detalhado por secção: [`docs/master-spec.md`](./docs/master-spec.md).
