# Nuvoly — estado do projeto (para retomar com Claude Code)

> Ler isto + `docs/master-spec.md` completo antes de começar qualquer fase nova.
> Regra do projeto: avançar fase a fase, verificar qualidade/tipos/lint e testar
> manualmente no fim de cada fase antes de passar à seguinte (master-spec §56).

## Estado (2026-09-05)

- **Fases 1-3: completas e testadas manualmente.** HEAD `60d8846` em
  `main` (https://github.com/JoviNatalli/IA-EMAIL-MANAGER).
- **Fase 4 (IA): implementada, aguarda `ANTHROPIC_API_KEY` real +
  confirmação de teste manual do utilizador antes de avançar para a Fase 5.**
  Ver secção "Fase 4 — o que foi feito" abaixo.
- **Fase 5 (AI Agent com tool calling): não iniciada.** Só arranca depois
  de o utilizador confirmar que testou a Fase 4.
- Stack: Next.js 16 (App Router, Turbopack), TypeScript strict, Tailwind v4,
  design system próprio sobre Radix, Drizzle + PostgreSQL, Auth.js v5
  (Credentials + Google OAuth real), Gmail API via `fetch` direto (sem SDK
  `googleapis`).
- Login demo: `demo@nuvoly.app` / `demo1234` (botão "Explorar demo sem
  conta" em `/login`). Conta Google de teste já autorizada:
  `cansvitor@gmail.com` (o projeto Google Cloud está em modo "Testing" —
  só emails adicionados como test user conseguem autenticar).

## Antes de começar a Fase 4

1. `pnpm install && pnpm db:local` (terminal 1, deixar a correr —
   Postgres local via PGlite, ver `dev-db/README.md`).
2. `pnpm db:migrate && pnpm db:seed && pnpm dev` (terminal 2).
3. Ler `docs/master-spec.md` secções §12-27 (funcionalidades de IA),
   §31 (prompt injection), §35 (error handling), §51-52 (custo/model
   routing), §58-59 (regras de implementação — nunca confiar no output do
   LLM sem validação Zod, pipeline LLM → schema → business rules →
   permission check → tool execution).

## Decisão de provider de IA (2026-09-05)

**Gemini (tier gratuito da Google), não Anthropic/OpenAI, por agora.**
Motivo: projeto de portfólio sem orçamento definido ainda — a Anthropic e
a OpenAI cobram desde a primeira chamada, a API do Gemini tem tier
gratuito real (via https://aistudio.google.com/apikey, conta Google, sem
cartão). `AI_DEFAULT_PROVIDER="google"` já em `.env.example`; falta criar
a chave e pôr em `GOOGLE_GENERATIVE_AI_API_KEY` no `.env.local` real.

Isto é só a escolha do provider concreto por trás da abstração que o
spec já pede (§4) — a lógica de negócio (categorização, resumo, tool
calling) não deve depender do provider escolhido; trocar para
Anthropic/OpenAI mais tarde deve ser só mudar a env var + adaptador,
nunca reescrever regras.

Ressalva a documentar no README (não esconder): no tier gratuito do
Gemini, o conteúdo enviado pode ser usado pela Google para melhorar os
produtos deles — aceitável aqui porque a demonstração principal corre
sobre o dataset fictício do Demo Mode (§47), não sobre Gmail real. Se a
Fase 4/5 for testada com Gmail real ligado, avisar isso explicitamente
antes (não assumir que o utilizador aceita silenciosamente).

Dependência a adicionar: SDK do Gemini para a camada de abstração (ex.:
`@ai-sdk/google` se usar o Vercel AI SDK, que já dá suporte a structured
outputs/Zod e tool calling de forma uniforme entre providers — `ai` +
`@ai-sdk/google` é a escolha mais direta dado que `@anthropic-ai/sdk` já
está instalado à espera de ser plugado como segundo provider mais tarde).

## Regras não-negociáveis para a Fase 4/5 (master-spec)

- **§13 — nunca inventar informação.** Se o resumo/análise de IA não tiver
  dados suficientes, dizer isso explicitamente em vez de inventar.
- **§17/§18 — tool calling e ações confirmáveis.** Lista de ferramentas em
  §17. Ações destrutivas/sensíveis (enviar, apagar, mover em massa, alterar
  definições) nunca executam sem confirmação explícita do utilizador —
  mostrar contagem de itens afetados antes.
- **§22/§23 — categorização/prioridade via structured outputs** (Zod),
  nunca texto livre parseado à mão. Fórmula de prioridade não é exposta ao
  utilizador (só High/Medium/Low).
- **§29/§30 — multi-tenancy e segurança**: toda query de IA que toque em
  dados de email tem de escopar por `userId` no servidor (nunca confiar em
  IDs vindos do cliente/LLM); secrets e API keys de IA só no servidor.
- **§31 — prompt injection**: conteúdo de email é sempre não confiável.
  Separar claramente SYSTEM INSTRUCTIONS / USER INSTRUCTIONS / EMAIL
  CONTENT / TOOL RESULTS — conteúdo de email nunca pode alterar
  instruções do sistema.
- **§35 — nunca mostrar erro técnico cru**; sempre traduzir para PT-PT
  (mesmo padrão já usado em `GmailError.userMessage` na Fase 3).
- **§51/§52 — custo e model routing**: classificação simples → modelo
  pequeno/barato; resumo → modelo médio; raciocínio complexo (agente,
  Fase 5) → modelo avançado. Camada de abstração de provider (não
  hardcodar um único provider/modelo — master-spec §4).

## Fase 4 — o que foi feito (2026-09-05)

- **Provider**: só Anthropic implementado (decisão do utilizador — Claude,
  já era o `AI_DEFAULT_PROVIDER` em `.env.local`). `src/lib/ai/provider.ts`
  define a interface `AIProvider` (spec §4) — trocar de provider é
  implementar essa interface, não reescrever chamadores. OpenAI/Gemini têm
  as env vars já previstas em `.env.example` mas lançam
  `AIProviderNotConfiguredError` (erro amigável, nunca uma resposta
  simulada) até serem implementados.
- **Model routing** (`src/lib/ai/models.ts`, spec §51-52): classificação/
  quick replies → `claude-haiku-4-5`; resumo, reply generator, compose
  actions e chat → `claude-sonnet-5`. Sem raciocínio complexo nesta fase
  (isso é o AI Agent da Fase 5).
- **Structured outputs**: `client.messages.parse` + `zodOutputFormat`
  (`@anthropic-ai/sdk`) — nunca parse de texto livre à mão. Schemas em
  `src/lib/ai/schemas.ts`.
- **Prompt injection** (spec §31): `src/lib/ai/prompts.ts` separa
  SYSTEM INSTRUCTIONS / USER INSTRUCTIONS / `<EMAIL_CONTENT>` /
  `<TEXT_TO_EDIT>` em todos os prompts, com aviso anti-injeção explícito no
  `system`. Testado em `src/lib/ai/__tests__/prompts.test.ts` com conteúdo
  de email deliberadamente malicioso.
- **Funcionalidades implementadas**: AI Insights (resumo + categoria +
  prioridade + intenção + sentimento + ação sugerida, cache em
  `ai_analysis`, botão "Analisar com IA" — nunca automático, spec §51),
  AI Reply Generator (tom/comprimento/instrução livre), Smart Reply (até 3
  sugestões rápidas), AI Compose actions (improve/shorten/professional/
  friendlier/translate/continue) e "Escrever com IA" (gera assunto+corpo),
  AI Chat lateral com streaming real (`/api/ai/chat`, Route Handler +
  `ReadableStream`) e contexto agregado da inbox (nunca conteúdo de email —
  "minimum necessary context", spec §26).
- **Erros**: `AIError`/`AIProviderNotConfiguredError`
  (`src/lib/ai/errors.ts`), mesmo padrão do `GmailError` da Fase 3 — nunca
  erro técnico cru na UI. Verificado manualmente sem chave configurada: a
  UI mostra "A funcionalidade de IA ainda não está configurada neste
  ambiente" em vez do erro técnico. Commit `65153a9` no branch
  `phase-4-ai` (por push/merge — não fiz push, ver PAT por rodar abaixo).
- **DB**: tabela `ai_analysis` (spec §28 "AIAnalysis") como cache por
  thread — migração `drizzle/0003_cuddly_quicksilver.sql`.
- **Testes**: `vitest` (novo, projeto não tinha runner de unit tests) —
  `pnpm test:unit`. 18 testes: validação Zod de todos os structured
  outputs (aceita bom, rejeita categoria/prioridade fora do enum, rejeita
  campo em falta) e separação SYSTEM/EMAIL CONTENT em todos os builders de
  prompt com um payload de prompt injection real.
- **Fora do âmbito desta fase (decisão documentada, não escondida)**:
  - **AI chat sem histórico persistido** — conversa só em estado do
    cliente (perde-se ao recarregar a página). A Fase 5 vai precisar de
    persistir conversas/tool calls de qualquer forma (`AIConversation`/
    `AIMessage`/`AIToolCall`, spec §28) — decidi não duplicar esse trabalho
    agora.
  - **Streaming só no AI Chat** — resumo/categorização/reply usam
    `messages.parse` (não-streaming) porque precisam do JSON completo para
    validar com Zod antes de mostrar algo; o "loading state com passos"
    (spec §34) é simulado no cliente (`AiInsightsPanel`) enquanto os dois
    pedidos reais correm em paralelo — não é um progresso fabricado, é o
    verdadeiro estado das duas chamadas em curso.
  - **Testes de integração das Server Actions com o provider real** — não
    escrito automatizado (exigiria mockar `@anthropic-ai/sdk` ou gastar
    tokens reais em CI); verificado manualmente no browser com o pipeline
    completo (auth → ownership → provider → erro amigável), só falta
    validar com uma `ANTHROPIC_API_KEY` real.
- **Por fazer antes de considerar a Fase 4 fechada**: o utilizador tem de
  colocar uma `ANTHROPIC_API_KEY` real em `.env.local` e testar pelo menos
  uma vez cada funcionalidade (Analisar com IA, Draft reply, Smart Reply,
  Ações de IA no compose, AI Chat) para confirmar que a saída do modelo
  real é sensata — sem chave, só foi possível validar o esqueleto e o
  tratamento de erro.

## Notas operacionais que ainda importam

- **PAT do GitHub por rodar**: um Personal Access Token foi partilhado em
  texto simples numa sessão anterior e reutilizado várias vezes para
  pushes. Rodar/revogar em https://github.com/settings/tokens assim que
  possível, se ainda não foi feito.
- Ao fechar a Fase 4 e a Fase 5, atualizar este ficheiro (estado, decisões
  de execução tomadas, o que ficou fora do âmbito) — é o que substitui o
  hand-off manual entre sessões.
