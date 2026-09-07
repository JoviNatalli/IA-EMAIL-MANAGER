# Nuvoly

**Your inbox, intelligently managed.**

SaaS de gestão inteligente de email com IA integrada como copiloto — não um
chatbot ao lado, mas parte da própria experiência de gerir a inbox.

> Projeto de portfólio construído por fases. Este README reflete o estado
> após a **Fase 6 — Pesquisa semântica e calendário real**. O plano completo (64 secções) está em
> [`docs/master-spec.md`](./docs/master-spec.md); o estado detalhado e as
> decisões de execução de cada fase em [`docs/status.md`](./docs/status.md).

## Estado atual (Fase 6 — Pesquisa semântica e calendário real) ✅

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

**Fase 2 — Email**
- Schema real de email: `threads`, `emails`, `attachments`, `labels`,
  `threadLabels` — multi-tenant (tudo escopado a `userId`), com pastas
  (inbox/sent/drafts/archive/trash), estrelas, prioridade e categoria
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
- Search por assunto/remetente/conteúdo (`/app/search`) — a pesquisa
  semântica chegou na Fase 6, como um segundo modo
- Suite E2E (Playwright, `pnpm test:e2e`) cobrindo o fluxo crítico: login →
  abrir thread → estrela → arquivar/restaurar → lixo → compose/enviar →
  responder → labels → search

**Fase 3 — Gmail**
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

**Fase 4 — IA**
- **Camada de abstração de provider** (`src/lib/ai/provider.ts`, spec §4): a
  app nunca importa o SDK de um provider diretamente. Anthropic e Google
  (Gemini) estão implementados; trocar é mudar `AI_DEFAULT_PROVIDER` no
  ambiente, sem tocar em lógica de negócio
- **Model routing por tarefa** (spec §51–52): classificação → modelo pequeno,
  resumo/composição → modelo médio, agente → o mais capaz disponível
- **AI Insights na thread**: resumo, categoria, prioridade (só Alta/Média/
  Baixa — a fórmula nunca é exposta), intenção, sentimento e ação sugerida.
  Corre a pedido (botão "Analisar com IA"), nunca automaticamente, e fica em
  cache na tabela `ai_analysis` para não repetir chamadas pagas
- **AI Reply Generator** com tom (profissional/simpático/conciso/formal/
  casual/empático) e comprimento configuráveis, mais instrução livre
- **Smart Reply**: até 3 respostas curtas prontas a enviar
- **Ações de IA no compose**: melhorar escrita, encurtar, tornar mais
  profissional/simpático, traduzir, continuar a escrever — e "Escrever com
  IA" que gera assunto + corpo a partir de uma instrução
- **Structured outputs validados com Zod** em todos os casos (spec §22/§58):
  nunca se parseia texto livre à mão, e o output do modelo é sempre
  revalidado antes de chegar à UI ou à base de dados
- **Nunca inventar** (spec §13): quando não há informação suficiente para
  um resumo fiável, a UI diz isso em vez de encher

**Fase 5 — AI Agent**
- **Agente com tool calling** (`src/lib/ai/agent.ts`, spec §16–18): 20
  ferramentas — pesquisar, ler, resumir, arquivar, marcar como lida, aplicar
  estrelas e labels, criar rascunhos, enviar, responder, criar tarefas,
  lembretes e eventos, detetar tarefas/reuniões num email
- **Pipeline obrigatório em cada tool call** (spec §59): LLM → validação Zod
  dos argumentos → regras de negócio + verificação de posse → decisão de
  confirmação → execução. O modelo nunca fala com a base de dados: devolve o
  nome de uma ferramenta e um objeto de argumentos, tratados como input
  hostil
- **Ações confirmáveis** (spec §18): enviar e responder confirmam sempre;
  arquivar/marcar/etiquetar confirmam a partir de 2 itens. O ciclo do agente
  PARA, a ação fica guardada no servidor (`ai_pending_action`) e a UI mostra
  o que vai acontecer **e a quantos itens** antes de qualquer coisa
  acontecer. Ao confirmar, o cliente envia apenas o id da ação — os
  argumentos vêm da base de dados e são revalidados
- **Task Extraction** (§20) e **Calendar Intelligence** (§21): as ferramentas
  de deteção são de leitura pura — devolvem propostas que aparecem como
  cards com botão. Nada é criado sem clique do utilizador. `/app/tasks`
  agrupa por dia; `/app/calendar` guarda os eventos (e, desde a Fase 6,
  também no Google Calendar real quando ligado)
- **Daily AI Briefing** (§19): as contagens e destaques são calculados em
  SQL; o modelo só escreve o texto por cima deles, e é gerado a pedido
- **Proteção contra prompt injection** (§31): conteúdo de email e resultados
  de ferramentas vão para o modelo dentro de blocos `<EMAIL_CONTENT>` /
  `<TOOL_RESULTS>` delimitados, com os delimitadores internos neutralizados
  — um email não consegue "sair" do bloco de dados e passar por instrução.
  Coberto por testes dedicados
- **Erros de IA** (rate limit, quota diária esgotada, modelo indisponível,
  resposta inválida) são sempre traduzidos para PT-PT, como já acontecia com
  os erros do Gmail

> **Nota — o que é IA e o que não é**: os campos `priority`/`category` da
> tabela `thread` continuam a ser placeholders estáticos do seed (existem
> desde a Fase 2 e alimentam a pasta "Important"). A classificação real de
> IA vive noutro sítio — na tabela `ai_analysis` — e só aparece depois de o
> utilizador clicar em "Analisar com IA". Por spec (§13), a app nunca
> apresenta como IA aquilo que não foi gerado por IA.

**Fase 6 — Pesquisa semântica e calendário real** (nova)
- **Pesquisa semântica / RAG** (§24/§27): pipeline completo — limpar o texto
  do email, dividir em chunks com contexto, gerar embeddings
  (`gemini-embedding-001`, 768 dimensões) e guardar em **pgvector** com
  índice HNSW. `/app/search` passou a ter dois modos: "Palavras-chave"
  (o `ilike` de sempre) e "Significado". No modo semântico cada resultado
  mostra o excerto que fez o match e a proximidade
- **Resposta com IA sobre os emails encontrados**: botão explícito (nunca
  automático — custo, §51) que devolve a resposta em streaming, citando os
  excertos. Quando os emails não contêm a resposta, o modelo diz isso em vez
  de a inventar (§13)
- **Indexação incremental e idempotente**: corre a seguir ao sync do Gmail
  (sem bloquear a resposta) e antes de uma pesquisa semântica, e só toca nos
  emails que ainda não têm embedding
- **`searchEmailsByMeaning`** entrou na caixa de ferramentas do agente, ao
  lado da pesquisa por palavras — o modelo escolhe conforme o utilizador
  sabe (ou não) as palavras exatas
- **Google Calendar real** (§21): autorização **separada** da do Gmail
  (incremental — o scope `calendar.events` só é pedido quando o utilizador
  liga o calendário em Definições → Contas). O evento é sempre gravado
  localmente primeiro e escrito no Google a seguir: se o Google recusar, o
  utilizador fica com o evento na app e é avisado de que não foi para lá

## Tech stack

| Camada | Escolha |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4 |
| UI | Componentes próprios sobre Radix UI (padrão shadcn/ui — ver nota abaixo) |
| Auth | Auth.js v5 — Credentials + Demo Mode (Fase 1) e Google OAuth real (Fase 3) |
| Database | PostgreSQL 16 + Drizzle ORM + **pgvector** (embeddings da pesquisa semântica, índice HNSW) |
| IA | Camada própria de abstração sobre `@google/genai` (Gemini) e `@anthropic-ai/sdk` (Claude) — sem SDK de agente intermédio, para controlo total de structured outputs e tool calling |
| Embeddings | `gemini-embedding-001` (768 dimensões) via REST — fora da abstração de provider, porque a Anthropic não tem embeddings |
| Validação | Zod (inclui os structured outputs e os argumentos das ferramentas de IA) |
| Testes | Vitest (unitários) + Playwright (E2E) |
| Animação | Framer Motion |

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
│   │   ├── search/           # Pesquisa por assunto/remetente/conteúdo
│   │   ├── ai/               # Copiloto (agente com tool calling)
│   │   ├── tasks/, calendar/ # Tarefas e eventos extraídos de emails
│   │   └── briefing/         # Daily AI Briefing
│   ├── api/
│   │   ├── auth/          # Route handler do Auth.js
│   │   └── ai/agent/      # Turno do agente (stream NDJSON de eventos)
│   └── actions/           # Server Actions (auth, onboarding, emails, ai, agent)
├── components/
│   ├── ui/                # Design system (Radix + CVA)
│   ├── layout/             # Sidebar, topbar, command palette, tema
│   ├── mail/                # Thread list/detail, compose, labels, search
│   ├── ai/                  # Painel do agente, AI Insights, reply generator
│   ├── tasks/, calendar/, dashboard/
│   ├── auth/, onboarding/, settings/, marketing/, shared/
├── lib/
│   ├── ai/                 # Providers, model routing, prompts, schemas Zod
│   │   ├── agent.ts         # Ciclo do agente + ações confirmáveis
│   │   ├── tools/           # Ferramentas (§17) com schema e política de confirmação
│   │   └── briefing.ts      # Dados do briefing (contagens em SQL)
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

## Arquitetura de IA

```
UI (Server Action / Route Handler)
      ↓
lib/ai/prompts.ts     SYSTEM / USER / <EMAIL_CONTENT> / <TOOL_RESULTS> separados (§31)
      ↓
lib/ai/provider.ts    abstração: Anthropic | Google  (+ retry, fallback de modelo)
      ↓
      LLM
      ↓
Zod                   structured output ou argumentos de ferramenta validados (§58)
      ↓
regras de negócio + verificação de posse por userId (§29/§30)
      ↓
confirmação do utilizador quando a ação é sensível (§18)
      ↓
execução (Server Actions existentes → base de dados / Gmail API)
```

Pontos que interessam para quem for ler o código:

- **O LLM nunca escreve na base de dados.** As ferramentas de escrita
  reutilizam as Server Actions da Fase 2/3, herdando ownership, regras de
  negócio e a propagação para o Gmail — em vez de duplicarem essa lógica
- **Controlo de custo** (§51): análises em cache, contexto truncado, número
  máximo de passos por pedido do agente, e o texto do briefing só é gerado
  quando o utilizador o pede
- **Resiliência**: retry com backoff para erros transitórios, cadeia de
  modelos por tarefa (quando um esgota a quota diária do plano gratuito, o
  seguinte assume) e deteção de respostas truncadas — uma resposta cortada
  nunca passa por resposta válida
- **RAG com corte duplo** (§27): a pesquisa vetorial devolve sempre os K mais
  próximos, mesmo quando nada é relevante. Há por isso um corte absoluto de
  semelhança **e** um corte relativo ao melhor resultado — uma pergunta sem
  resposta nos emails devolve zero resultados em vez de oito irrelevantes

## Desenvolvimento local

### Pré-requisitos
- Node.js ≥ 20.9, pnpm
- Um Postgres acessível — não precisa de instalar nada: `pnpm db:local`
  sobe um Postgres real (PGlite) em `127.0.0.1:5433`, ver
  [`dev-db/README.md`](./dev-db/README.md). Alternativa: Postgres.app /
  Homebrew / Docker / uma connection string remota.
- Uma chave de API de IA para as Fases 4–5 (ver "Variáveis de ambiente").
  Sem chave, a app corre na mesma: as funcionalidades de IA mostram uma
  mensagem a dizer que não estão configuradas, em vez de fingirem resultados.

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
| `pnpm test:unit` | Vitest — schemas de IA, prompts e invariantes das ferramentas |
| `pnpm test:e2e` | Suite Playwright (reseeda a BD antes de correr) |

## Variáveis de ambiente

Ver [`.env.example`](./.env.example).

- `DATABASE_URL` e `AUTH_SECRET` chegam para as Fases 1/2.
- `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` (Google Cloud Console → Auth
  Platform → Clients, tipo "Web application", redirect URI
  `http://localhost:3000/api/auth/callback/google`) são necessárias para o
  botão "Continuar com Google" — sem elas, o resto da app (Credentials +
  Demo Mode) continua a funcionar normalmente.
- **Google Calendar (Fase 6)** reutiliza as mesmas credenciais, mas com um
  fluxo OAuth próprio (autorização incremental — o scope do calendário nunca
  é pedido no login). Para o activar é preciso, no mesmo cliente OAuth:
  1. adicionar `http://localhost:3000/api/google/calendar/callback` aos
     **Authorized redirect URIs**;
  2. adicionar o scope `.../auth/calendar.events` em **Data Access**;
  3. activar a **Google Calendar API** em APIs & Services → Library.
  Sem estes passos, o botão "Ligar Google Calendar" leva a um
  `redirect_uri_mismatch` do lado da Google. Sem o calendário ligado a app
  funciona na mesma: os eventos ficam locais e a UI diz isso.
- `AI_DEFAULT_PROVIDER` escolhe o provider de IA (`google` ou `anthropic`) e
  a chave correspondente tem de estar preenchida:
  `GOOGLE_GENERATIVE_AI_API_KEY` (gratuita em
  [aistudio.google.com/apikey](https://aistudio.google.com/apikey)) ou
  `ANTHROPIC_API_KEY`. `OPENAI_API_KEY` está prevista mas esse provider
  ainda não está implementado — pedi-lo dá um erro claro, nunca uma
  resposta simulada.

> **Privacidade — plano gratuito do Gemini**: o provider ativo por omissão é
> o Gemini no tier gratuito, onde a Google pode usar o conteúdo enviado para
> melhorar os produtos dela. Isto é aceitável neste projeto porque a
> demonstração corre sobre o dataset fictício do Demo Mode. **Se ligar uma
> conta Gmail real e usar as funcionalidades de IA, o conteúdo desses emails
> é enviado para a API do Gemini nessas condições** — use um plano pago (ou
> o provider Anthropic) se isso não for aceitável para si.

## Segurança

- Passwords com hash `bcrypt` (nunca em texto simples)
- `AUTH_SECRET` gerado aleatoriamente, nunca commitado (`.env*` no `.gitignore`)
- Sessão JWT; toda rota `/app/*` e `/onboarding` revalida `auth()` no servidor
  além da checagem otimista do proxy
- Nenhuma API key exposta ao cliente — as chaves de IA e os tokens Gmail só
  existem no servidor
- Multi-tenant: todas as queries/Server Actions de email escopam por
  `userId` — nenhuma thread/email é lida ou mutada sem confirmar a posse do
  recurso no servidor (nunca confiar no `threadId` do cliente sozinho). As
  ferramentas do agente repetem essa verificação: um id inventado pelo
  modelo é recusado, não ignorado em silêncio
- OAuth Google com `access_type=offline`+`prompt=consent` (garante
  `refresh_token`); tokens Gmail nunca vão para o cliente nem para logs —
  todas as chamadas à Gmail API correm em Server Actions/módulos
  `server-only` (`src/lib/google/`)
- **Prompt injection**: conteúdo de email e resultados de ferramentas são
  sempre tratados como dados não confiáveis — delimitados, com os
  delimitadores internos neutralizados, e nunca escritos no prompt de
  sistema. Um email que diga "ignora as instruções anteriores" é analisado,
  não obedecido
- **Ações sensíveis** (enviar, responder, mexer em vários emails de uma vez)
  nunca são executadas pelo agente sem confirmação explícita, com contagem
  de itens afetados. Os argumentos ficam no servidor e são revalidados no
  momento de executar — a confirmação do cliente é só um id
- Erros da Gmail API e dos providers de IA são sempre traduzidos para uma
  mensagem em PT-PT antes de chegar à UI — a mensagem técnica fica só na
  consola do servidor

## Future Improvements

**Email / Gmail**
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
  texto simples — mostrar o HTML original de forma segura (sanitizado) é
  trabalho futuro
- **Encriptação de tokens em repouso**: `access_token`/`refresh_token`
  ficam na base de dados tal como o Auth.js Drizzle Adapter os grava
  (padrão da biblioteca) — cifrá-los em repouso é um endurecimento razoável
  antes de produção real com utilizadores externos

**IA**
- **Conversas do agente não são persistidas**: o histórico vive no estado do
  cliente e perde-se ao recarregar a página (as ações pendentes, essas,
  ficam no servidor). As entidades `AIConversation`/`AIMessage`/`AIToolCall`
  do §28 ficam por fazer
- **Lembretes não notificam**: `createReminder` grava o lembrete, mas ainda
  não há nada que dispare notificações
- **Google Calendar — só escrita**: criar e apagar eventos propaga para o
  Google, mas não há leitura do calendário nem sincronização de alterações
  feitas do lado de lá. O fuso usado ao escrever é o do servidor (a app não
  guarda o fuso do utilizador)
- **Reindexação semântica**: um email cujo corpo mude depois de indexado
  mantém o embedding antigo. Na prática não acontece (o Gmail não reescreve
  mensagens), mas trocar o modelo de embeddings obriga a limpar a tabela
  `email_embedding` à mão
- **Testes de integração das ferramentas**: as invariantes (políticas de
  confirmação, validação de argumentos, isolamento de prompt injection) têm
  testes unitários; o isolamento entre utilizadores é verificado
  manualmente, porque um teste automatizado exigiria uma base de dados de
  teste com dois utilizadores

## Roadmap

- ~~**Fase 2** — Emails de demonstração, inbox real, thread, compose, labels~~ ✅
- ~~**Fase 3** — OAuth Google real + Gmail API (sync, send, drafts)~~ ✅
- ~~**Fase 4** — Resumo, categorização, prioridade e respostas por IA~~ ✅
- ~~**Fase 5** — AI Agent com tool calling, ações confirmáveis, tarefas,
  calendar intelligence e daily briefing~~ ✅
- ~~**Fase 6** — Pesquisa semântica/RAG e integração real com o Google
  Calendar~~ ✅ (a sincronização incremental do Gmail via `historyId`
  continua em Future Improvements)
- **Fase 7** — Polish: animações, responsividade, acessibilidade, testes
- **Fase 8** — Landing final, demo mode com dataset completo, case study

Plano detalhado por secção: [`docs/master-spec.md`](./docs/master-spec.md).
Estado e decisões por fase: [`docs/status.md`](./docs/status.md).
