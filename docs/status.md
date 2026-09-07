# Nuvoly — estado do projeto (para retomar com Claude Code)

> Ler isto + `docs/master-spec.md` completo antes de começar qualquer fase nova.
> Regra do projeto: avançar fase a fase, verificar qualidade/tipos/lint e testar
> manualmente no fim de cada fase antes de passar à seguinte (master-spec §56).

## Estado (2026-09-08)

- **Fases 1-3: completas e testadas manualmente.**
- **Fase 4 (IA): FECHADA e testada manualmente com modelo real (Gemini).**
  Construída pela sessão local do Claude Code num branch `phase-4-ai`
  (consolidado em `main` por fast-forward em 2026-09-05); `GoogleProvider`
  implementado a seguir no mesmo dia depois de confirmado que a
  `ANTHROPIC_API_KEY` não tinha crédito. `AI_DEFAULT_PROVIDER="google"`
  em `.env.local`. As 6 funcionalidades de IA (Analisar com IA, AI Reply
  Generator, Smart Reply, Ações de IA no compose, Escrever com IA, AI
  Chat) testadas uma a uma no browser com o Gemini real — ver "Fase 4 —
  GoogleProvider (Gemini)" abaixo para o que foi implementado e os bugs
  reais encontrados e corrigidos nesse processo (truncagem silenciosa por
  "thinking" e um 400 em `gemini-3.5-flash-lite` por causa do
  `thinkingConfig`).
- **Fase 5 (AI Agent com tool calling): implementada e testada manualmente
  com o Gemini real (2026-09-06).** 20 ferramentas, ciclo do agente com o
  pipeline do §59, ações confirmáveis (§18), extração de tarefas (§20),
  deteção de reuniões (§21) e Daily Briefing (§19). Ver "Fase 5 — AI Agent"
  abaixo. **FECHADA** — validada manualmente pelo utilizador (2026-09-08):
  o agente funciona ponta a ponta com a conta real.
- **Fase 7 — Polish: COMPLETA (2026-09-08).** Tinha sido feita em duas
  partes: primeiro a landing (2026-09-06, fora de ordem por decisão do
  utilizador — o §60 põe UX e qualidade visual acima da integração de IA), e
  agora o que faltava na APP, que o redesign da landing tinha deixado
  deliberadamente intocada. Ver "Fase 7 (parcial)" e "Fase 7 — Polish da
  app" abaixo.
- **Fase 6 (pesquisa semântica/RAG + Google Calendar real): implementada
  (2026-09-07).** pgvector a funcionar no PGlite local, pipeline completo do
  §27 (limpar → chunk → embedding → pgvector → retrieval → resposta), modo
  "Significado" em `/app/search`, ferramenta `searchEmailsByMeaning` no
  agente, e integração real com o Google Calendar com autorização
  incremental. Ver "Fase 6" abaixo. **FECHADA** — o utilizador confirmou
  manualmente (2026-09-08) que o Google Calendar funciona com a conta real,
  depois de registar o redirect URI na Google Cloud Console. A
  sincronização incremental do Gmail (`historyId`) foi feita a seguir, na
  ronda de "pontos de atenção" — ver "Atualização 2026-09-07 (2)".
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
cartão).

**Atualização (2026-09-05, confirmada com o utilizador):** a
`ANTHROPIC_API_KEY` que já estava em `.env.local` (e que a sessão local
do Claude Code usou para implementar toda a Fase 4) **não tem crédito
associado** — é uma chave de teste. Isto significa que trocar para
Gemini aqui não é só mudar `AI_DEFAULT_PROVIDER` no `.env.local`: só
`AnthropicProvider` está implementado em `src/lib/ai/provider.ts` (a
interface `AIProvider` existe, mas `GoogleProvider` ainda não foi
escrito — pedir `AI_DEFAULT_PROVIDER="google"` hoje lança
`AIProviderNotConfiguredError`). É preciso trabalho de código real antes
de poder testar e fechar a Fase 4:

1. Utilizador cria a chave gratuita em https://aistudio.google.com/apikey
   e coloca em `GOOGLE_GENERATIVE_AI_API_KEY` no `.env.local` real.
2. Implementar `GoogleProvider implements AIProvider` em
   `src/lib/ai/provider.ts` (structured output via `responseSchema` +
   `responseMimeType: "application/json"` do SDK oficial do Gemini —
   mesma garantia de "nunca texto livre parseado à mão", spec §22/§58 —
   e streaming via `generateContentStream`), mais uma tabela de modelos
   Gemini equivalente em `src/lib/ai/models.ts` (spec §51-52).
3. Só depois mudar `AI_DEFAULT_PROVIDER="google"` no `.env.local` real.
4. Testar manualmente as 6 funcionalidades de IA (ver checklist na secção
   "Fase 4 — o que foi feito") antes de considerar a fase fechada.

**Atualização 2 (2026-09-05, feito):** `GoogleProvider` implementado,
`AI_DEFAULT_PROVIDER="google"` já está no `.env.local` real, e as 6
funcionalidades foram testadas com o Gemini real. Ver "Fase 4 —
GoogleProvider (Gemini)" para o detalhe técnico e os bugs reais
encontrados nesse processo.

Isto é só a escolha do provider concreto por trás da abstração que o
spec já pede (§4) — a lógica de negócio (categorização, resumo, tool
calling) não deve depender do provider escolhido; trocar de provider no
futuro (Anthropic já está implementado e pronto a reativar) deve ser só
mudar a env var, sem tocar nas Server Actions.

Ressalva a documentar no README (não esconder): no tier gratuito do
Gemini, o conteúdo enviado pode ser usado pela Google para melhorar os
produtos deles — aceitável aqui porque a demonstração principal corre
sobre o dataset fictício do Demo Mode (§47), não sobre Gmail real. Se a
Fase 4/5 for testada com Gmail real ligado, avisar isso explicitamente
antes (não assumir que o utilizador aceita silenciosamente).

Dependência adicionada: `@google/genai` (2.21.0) — **não** `@google/generative-ai`,
que está deprecated (confirmado nos docs oficiais em 2026-09-05: a
Google migrou para `@google/genai` como SDK único, GA em todas as
plataformas). Mantém consistência com a Fase 4 atual, que já usa o SDK
nativo de cada provider diretamente (sem Vercel AI SDK) para controlo
total sobre structured outputs; não vale a pena introduzir uma segunda
abstração (`ai` + `@ai-sdk/google`) só para um provider.

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

- **Provider**: dois implementados — Anthropic e Google (Gemini).
  `src/lib/ai/provider.ts` define a interface `AIProvider` (spec §4) —
  trocar de provider é mudar `AI_DEFAULT_PROVIDER`, não reescrever
  chamadores. **Google é o provider ativo** (`AI_DEFAULT_PROVIDER="google"`
  no `.env.local` real) — ver "Decisão de provider de IA" e "Fase 4 —
  GoogleProvider (Gemini)" abaixo para o porquê e o detalhe. OpenAI tem a
  env var já prevista em `.env.example` mas lança
  `AIProviderNotConfiguredError` (erro amigável, nunca uma resposta
  simulada) até ser implementado.
- **Model routing** (`src/lib/ai/models.ts`, spec §51-52): duas tabelas,
  uma por provider — `resolveModel(provider, tier)`. Anthropic:
  classificação/quick replies → `claude-haiku-4-5`; resumo/reply/compose/
  chat → `claude-sonnet-5`. Google (ativo): classificação/quick replies →
  `gemini-3.5-flash-lite`; resumo/reply/compose/chat → `gemini-3.5-flash`.
  Sem raciocínio complexo nesta fase (isso é o AI Agent da Fase 5).
- **Structured outputs**: Anthropic via `client.messages.parse` +
  `zodOutputFormat`; Google via `responseJsonSchema: z.toJSONSchema(schema)`
  + revalidação com `schema.safeParse()` no retorno (ver "Fase 4 —
  GoogleProvider" para o porquê da revalidação extra) — nunca parse de
  texto livre à mão em nenhum dos dois. Schemas em `src/lib/ai/schemas.ts`,
  agnósticos de provider.
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
  ambiente" em vez do erro técnico; e, já com o Gemini real, os erros de
  quota/rate-limit também aparecem traduzidos (ver "Fase 4 —
  GoogleProvider").
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
    escrito automatizado (exigiria mockar `@anthropic-ai/sdk`/`@google/genai`
    ou gastar quota real em CI); verificado manualmente no browser com o
    pipeline completo (auth → ownership → provider → erro amigável) e,
    depois do `GoogleProvider`, com respostas reais do Gemini.

## Fase 4 — GoogleProvider (Gemini), 2026-09-05

Feito depois de confirmado que a `ANTHROPIC_API_KEY` não tinha crédito
(ver "Decisão de provider de IA"). `AI_DEFAULT_PROVIDER="google"` no
`.env.local` real; `AnthropicProvider` fica implementado e pronto a
reativar (só mudar a env var) assim que houver crédito.

- **SDK**: `@google/genai` 2.21.0 (confirmado o pacote atual/recomendado
  nos docs oficiais — `@google/generative-ai` está deprecated). Client:
  `new GoogleGenAI({ apiKey })`; chamadas via `ai.models.generateContent` /
  `ai.models.generateContentStream` (não a "Interactions API" que a
  documentação pública menciona como caminho recomendado — essa API não
  existe nos tipos do SDK instalado nem é o que `models.list()` devolve
  como métodos suportados pelos modelos atuais; fica para reavaliar
  quando/se ficar GA e documentada de forma consistente).
- **Structured output**: `config.responseMimeType: "application/json"` +
  `config.responseJsonSchema: z.toJSONSchema(schema)` — o SDK aceita JSON
  Schema puro (gerado do Zod nativo, sem dependência extra tipo
  `zod-to-json-schema`) diretamente em `responseJsonSchema` desde a
  v1.9.0. **Nunca confiar cegamente**: o JSON devolvido é sempre
  reparseado e revalidado com `schema.safeParse()` antes de sair de
  `GoogleProvider.generateObject` (spec §58) — confirmado com um teste
  real: mesmo com o schema fornecido, isto é imprescindível porque o
  `responseJsonSchema` só *guia* a geração, não garante 100% de
  conformidade.
- **Modelos fixos, não aliases** — `gemini-3.5-flash` (summarize/compose/
  chat) e `gemini-3.5-flash-lite` (classify), nunca `gemini-flash-latest`/
  `gemini-flash-lite-latest`. Ver "Rate limits do tier gratuito" abaixo
  para o porquê (a alias "-latest" apontava para `gemini-3.8-flash`, cuja
  quota gratuita é de 20 pedidos/DIA).
- **Erros**: `mapGoogleError` segue o mesmo padrão do `mapAnthropicError`
  já existente — nunca erro técnico cru (spec §35). Detalhe específico do
  Gemini: `ApiError.message` é uma STRING com o corpo JSON completo da
  resposta HTTP (não campos estruturados no objeto de erro), por isso há
  um `parseGoogleErrorBody()` dedicado a fazer `JSON.parse` disso com
  fallback seguro. Confirmado empiricamente que uma chave inválida vem
  como **HTTP 400** com `reason: "API_KEY_INVALID"` lá dentro — não 401/403
  como seria de esperar — por isso o mapeamento nunca decide só pelo
  `status`.
- **Retry** (`withGoogleRetry`, 3 tentativas, backoff curto): só para 503
  (UNAVAILABLE, "high demand" — confirmado real e transitório, ~1 em 3
  pedidos numa amostra pequena) e 429 transitório. Só cobre o pedido
  inicial do streaming (não o meio da iteração, para nunca duplicar texto
  já mostrado ao utilizador).

### Bugs reais encontrados e corrigidos ao testar com o Gemini real

1. **Truncagem silenciosa por "thinking" invisível.** Os modelos Gemini
   3.x (`gemini-3.5-flash` pelo menos) pensam por default e o
   `thoughtsTokenCount` conta para `maxOutputTokens` — confirmado um caso
   com 613 tokens de thinking para 84 de resposta visível. No AI Chat isto
   cortou uma resposta a meio de uma frase, **sem erro nenhum** (a stream
   termina normalmente, só que com `finishReason: "MAX_TOKENS"` e o texto
   incompleto) — exatamente o tipo de falha que a spec §35 pede para nunca
   deixar passar como sucesso. Corrigido com `thinkingConfig: {
   thinkingBudget: 0 }` (desliga o thinking — não há "raciocínio complexo"
   nesta fase, spec §51) e, como defesa adicional, `streamText` agora
   deteta `finishReason === "MAX_TOKENS"` no fim e acrescenta um aviso
   visível em vez de deixar a frase a meio sem explicação.
2. **`thinkingConfig` não é aceite por `gemini-3.5-flash-lite`** — a
   request falha com **400 INVALID_ARGUMENT** só por o campo estar
   presente, mesmo com `thinkingBudget: 0`. `gemini-3.5-flash` aceita-o
   normalmente. Corrigido com `thinkingConfigFor(model)` — deteta pelo
   nome do modelo (`.includes("lite")`) em vez de assumir que todos os
   modelos da família suportam a mesma config; isto partiu literalmente o
   "Analisar com IA" (que usa o modelo lite para a classificação) até ser
   apanhado no teste manual.

### Rate limits do tier gratuito — Gemini (importa para a Fase 5)

Confirmado empiricamente (não documentado com números exatos nos docs
públicos — `ai.google.dev/gemini-api/docs/rate-limits` remete só para o
dashboard da AI Studio da própria conta):

- **A quota gratuita é por MODELO e por DIA**, não um pool partilhado —
  `gemini-3.8-flash` (para onde `gemini-flash-latest` aponta atualmente)
  tem só **20 pedidos/dia por projeto** no tier gratuito. Isto foi
  descoberto ao esgotar essa quota a meio desta sessão de testes (erro
  429 `RESOURCE_EXHAUSTED`, `quotaId:
  GenerateRequestsPerDayPerProjectPerModel-FreeTier`, `quotaValue: 20`).
- `gemini-3.5-flash` e `gemini-3.5-flash-lite` aguentaram várias dezenas
  de pedidos de teste (contando os feitos diretamente via script Node
  fora da app) sem esgotar quota — parecem ter um limite gratuito bem
  mais alto, mas o valor exato não foi confirmado (a app nunca chegou a
  esgotá-lo).
- **429 pode significar duas coisas muito diferentes** — um limite por
  minuto (transitório, resolve-se sozinho em segundos) ou por DIA
  (só se resolve amanhã, ou trocando de modelo). `mapGoogleError` já
  distingue os dois via `quotaId` (`"PerDay"` vs. outros) e devolve uma
  mensagem diferente ao utilizador para cada caso.
- **Implicação direta para a Fase 5**: o AI Agent (tool calling) vai fazer
  bastantes mais chamadas por ação do utilizador do que a Fase 4 (LLM →
  decidir ferramenta → executar → LLM interpretar resultado, por vezes em
  loop). Com uma quota diária de só 20 pedidos num modelo "-latest" mais
  recente, um único fluxo de agente testado a fundo pode esgotá-la
  sozinho. Recomendação: manter os modelos fixos em `gemini-3.5-flash`/
  `gemini-3.5-flash-lite` (não subir para a família 3.6/3.7/3.8 só porque
  "é mais recente") e, se a Fase 5 continuar a esgotar quota durante o
  desenvolvimento, considerar pedir crédito para a Anthropic (já
  implementada e pronta a reativar) em vez de insistir no tier gratuito
  do Gemini para trabalho de agente mais intensivo.

Commit `115d2c6` no branch `phase-4-gemini-provider` (não fiz push nem
merge para `main` — decisão do utilizador).

## Fase 5 — AI Agent (2026-09-06)

- **Ciclo do agente** (`src/lib/ai/agent.ts`): pipeline do §59 aplicado a
  cada tool call, sem atalhos — LLM → validação Zod dos argumentos →
  regras de negócio + ownership → decisão de confirmação → execução. O
  modelo nunca fala com a base de dados; devolve só o nome de uma
  ferramenta e um objeto de argumentos, tratado como input hostil. Máximo
  de 6 passos por pedido (trava de custo e de ciclos infinitos).
- **20 ferramentas** (`src/lib/ai/tools/`): as 15 do §17 mais
  `replyToThread`, `extractTasks`, `detectMeetings`, `listTasks` e
  `createCalendarEvent` (§20/§21 pedem deteção de tarefas/reuniões "como
  ferramentas do agente"). As que escrevem reutilizam as Server Actions da
  Fase 2/3 em vez de falarem com a BD — assim herdam ownership, regras de
  negócio (não se arquiva um rascunho) e a propagação para o Gmail real,
  em vez de duplicarem essa lógica e abrirem um buraco entre o que a UI
  faz e o que o agente faz.
- **Ações confirmáveis (§18)**: cada ferramenta declara a política
  (`never` / `bulk` / `always`). Enviar e responder confirmam sempre;
  arquivar/marcar/etiquetar confirmam a partir de 2 itens. Quando é
  preciso confirmar, o ciclo PARA, a ação fica guardada em
  `ai_pending_action` (com os argumentos já validados, no servidor) e a UI
  mostra o resumo + a contagem de itens afetados. O cliente só envia o
  `id` da ação ao confirmar — nunca os argumentos —, e o servidor
  revalida-os com o Zod da ferramenta antes de executar.
- **Prompt injection (§31)**: os resultados de ferramentas (que trazem
  corpos de email) vão para o modelo dentro de `<TOOL_RESULTS>`, com os
  delimitadores internos neutralizados. Isto fechou um buraco que já
  existia na Fase 4: um email com `</EMAIL_CONTENT>` no corpo conseguia
  "sair" do bloco de dados. Testado em
  `src/lib/ai/__tests__/prompts.test.ts`.
- **Tarefas, lembretes e calendário**: tabelas novas (`task`, `reminder`,
  `calendar_event`, `ai_pending_action`) na migração
  `drizzle/0004_real_terrax.sql`. Páginas `/app/tasks` e `/app/calendar`
  deixaram de ser placeholders. §20/§21 respeitados: `extractTasks` e
  `detectMeetings` são ferramentas de LEITURA — devolvem propostas que a
  UI mostra com botão, e nada é gravado sem clique.
- **Daily Briefing (§19) — decisão de âmbito**: feito nesta fase e não na
  6. Os dados que o tornam útil (tarefas, eventos, `requiresReply`) só
  passaram a existir agora, e é uma chamada só. As contagens e destaques
  são calculados em SQL; o modelo só escreve o texto por cima deles, e o
  prompt proíbe-o de inventar números. O texto é gerado a pedido (botão),
  não a cada visita — controlo de custo (§51).
- **AI Chat da Fase 4 substituído pelo agente**: `/api/ai/chat` e o painel
  antigo foram removidos (duas superfícies de chat era pior UX). O que se
  perdeu foi o streaming token a token; o que se ganhou foram os eventos
  de passo ("A pesquisar emails ✓"), as propostas e a confirmação. O
  `streamText` continua na interface do provider, mas neste momento não
  tem consumidor — fica para a Fase 6.
- **Testes**: 38 unitários (`pnpm test:unit`), 14 novos em
  `agent-tools.test.ts`: presença de todas as ferramentas do §17,
  invariantes das políticas de confirmação (nada destrutivo sem
  confirmação, nada que confirme sem saber contar os itens afetados) e
  rejeição de argumentos inválidos vindos do LLM (uuid inválido, ação em
  massa sem alvos, mais de 25 alvos, email inválido, data que não é data).

### Bugs reais encontrados a testar (e corrigidos)

1. **O agente voltava a propor uma ação já proposta.** Um turno que acaba
   em confirmação não produz texto, e o histórico enviado no turno
   seguinte ficava sem qualquer vestígio dele — o modelo achava que o
   pedido nunca tinha sido tratado e propunha o mesmo envio outra vez.
   Corrigido com uma nota de histórico ("a aplicação já mostrou uma
   confirmação para X" / "o utilizador confirmou/cancelou").
2. **`thinkingConfig` rejeitado por mais modelos do que se pensava.** A
   heurística da Fase 4 ("modelos com 'lite' no nome não suportam")
   partiu-se assim que o fallback trouxe o `gemini-3.6-flash`, que também
   o recusa com 400. Agora não se adivinha: há uma lista-semente e
   qualquer modelo que recuse é marcado em runtime e o pedido é repetido
   sem a opção.
3. **JSON truncado a meio nos modelos onde o thinking não se desliga.** O
   `thoughtsTokenCount` conta para o `maxOutputTokens` (vimos 864 tokens
   de raciocínio a comerem um orçamento de 900), e a resposta saía
   cortada — falhando depois na validação com um erro que não explicava
   nada. Corrigido com margem extra de tokens nesses modelos e com uma
   verificação explícita de `finishReason === "MAX_TOKENS"`, que agora dá
   erro em vez de deixar passar por resposta válida.

### Rate limits: o que mudou face à Fase 4

A previsão da Fase 4 confirmou-se — o agente gasta muito mais quota do que
as funcionalidades anteriores (uma pergunta = várias chamadas ao modelo), e
a quota diária gratuita do `gemini-3.5-flash` esgotou-se a meio da sessão
de testes. Em vez de trocar o modelo fixo (que só adiava o problema),
`src/lib/ai/models.ts` passou a ter uma CADEIA de modelos por tier: quando
um esgota a quota diária (429 com `quotaId` "PerDay"), o provider passa
automaticamente ao seguinte em vez de a app ficar sem IA até ao dia
seguinte. Notas para quem continuar:

- Um turno do agente demorou **~40 s** quando teve de percorrer a cadeia
  (fallback + retries + vários passos). Com o modelo primário disponível
  fica bastante mais rápido, mas o agente é sempre mais lento do que as
  funcionalidades de uma chamada só.
- Se a Fase 6 aumentar ainda mais o número de chamadas (RAG, embeddings),
  o tier gratuito do Gemini deixa de chegar. A alternativa continua a ser
  pôr crédito na Anthropic — o `AnthropicProvider` está implementado e a
  tier `agent` já aponta para `claude-opus-5` (o "modelo avançado" que o
  §52 pede para raciocínio complexo, ao contrário do "flash" que o plano
  gratuito do Gemini obriga a usar).

### Fora do âmbito desta fase (documentado, não escondido)

- **Conversas do agente não são persistidas.** O histórico vive no estado
  do cliente e perde-se ao recarregar a página; as tabelas `AIConversation`
  /`AIMessage`/`AIToolCall` do §28 continuam por fazer. As ações
  confirmáveis (que são o que precisa mesmo de sobreviver ao round-trip)
  essas ficam no servidor.
- **Tool calls de turnos anteriores não são reencenados** — só o texto
  entra no histórico do turno seguinte. Evita reenviar (e voltar a pagar)
  emails inteiros a cada mensagem, e evita confiar em blocos de tool call
  vindos do cliente.
- **Lembretes não notificam.** `createReminder` grava na tabela; não há
  ainda nada que dispare notificações (§43 é de outra fase).
- **Calendário é local.** A integração com o Google Calendar (§21) não
  está feita e a UI diz isso explicitamente.
- **Multi-tenancy testado manualmente, não em automático.** Toda
  ferramenta que toca em emails filtra por `userId` no servidor e recusa
  ids que não sejam do utilizador; um teste automatizado disso exigiria
  uma base de dados de teste com dois utilizadores — mantém-se a decisão
  da Fase 4 de deixar os testes de integração para verificação manual.

Commit `9943a72` no branch `phase-5-ai-agent` (não fiz push nem merge para
`main` — decisão do utilizador).

### Testado manualmente (2026-09-06, Gemini real)

Pesquisa + resumo encadeados (`searchEmails` → `summarizeThread`); envio de
email com confirmação (proposta → contagem de itens → confirmar → email
mesmo em Sent); extração de tarefas com [Criar tarefa] → tarefa em
`/app/tasks` agrupada por dia; deteção de reunião com [Adicionar] → evento
em `/app/calendar`; briefing diário gerado a partir das contagens reais;
cancelamento de uma ação pendente; erro de quota diária mostrado em PT-PT.

## Fase 7 (parcial) — redesign da homepage (2026-09-06)

Âmbito deliberadamente estreito: **só a homepage e os tokens**. A UX da app
não foi tocada — herda apenas o refresh de tokens.

A homepage foi refeita três vezes no mesmo dia, com o utilizador a apertar a
direção de cada vez. Fica registado o caminho, porque explica escolhas que
de outra forma pareceriam arbitrárias:

1. **Editorial escuro** (serifa de alto contraste sobre tinta). Boa base, mas
   ainda com esqueleto de landing de SaaS.
2. **Tipografia variável de cartaz** (Bricolage Grotesque com os eixos a
   reagir ao cursor), depois de o utilizador partilhar referências de
   fundições tipográficas.
3. **Edição impressa** — a versão atual, quando o utilizador pediu que
   mudasse "toda a estrutura, o esqueleto também".

### A direção atual: a homepage como uma edição de jornal

Premissa: um produto de email é correspondência, e a forma natural de
apresentar correspondência é uma publicação. Por isso o esqueleto **não é**
hero → features → testemunhos → preços → FAQ. É o de uma edição:

| Secção | Ficheiro | O que substitui |
| --- | --- | --- |
| Cabeçalho com data e índice | `masthead.tsx` | navbar |
| Primeira página + fio noticioso | `front-page.tsx` | hero |
| Sumário "nesta edição" | `edition-index.tsx` | grelha de features |
| Caderno I — reportagem | `report.tsx` | secção "como funciona" |
| Caderno II — provas de página | `plates.tsx` | lista de features |
| Caderno III — verificação | `verification.tsx` | testemunhos |
| Editorial assinado | `editorial.tsx` | secção de diferenciação |
| Tabela de assinaturas | `subscriptions.tsx` | cartões de preços |
| Correio dos leitores | `letters.tsx` | acordeão de FAQ |
| Última página + colofão | `back-page.tsx` | CTA final + rodapé |

- **Paleta**: a homepage é sempre PAPEL (claro e quente), mesmo com a app em
  tema escuro — `.landing` re-escopa os mesmos custom properties da app, não
  é um segundo sistema de tokens. O filete das secções é quase preto, como
  tinta, e não o cinzento de UI.
- **Tipografia**: Bodoni Moda (manchetes, eixo óptico), Newsreader (colunas,
  desenhada para texto de notícia) e Martian Mono (fólios, datas, números —
  a tensão de máquina que evita o pastiche de jornal antigo). A app mantém
  Geist, e o mockup do produto também: é uma fotografia da aplicação.
- **Detalhes de composição**: colunas verdadeiras em CSS multi-column com
  filete entre elas, capitular de três linhas, fólios por secção, cabeça
  corrente que mostra a secção a ser lida, e um erro de registo de impressão
  (offset ciano/magenta) no hover das manchetes.
- **Verificação de honestidade** (spec §8/§13): a secção "verificação"
  separa linha a linha o que é comprovável no código e o que vem da caixa
  fictícia; a tabela de preços abre com "valores ilustrativos"; o colofão
  declara a natureza do projeto. Nada em tooltip.

### Bugs reais encontrados a verificar (e corrigidos)

1. **Sem JavaScript a página ficava em branco** — o `framer-motion` escreve o
   `opacity: 0` inicial já no HTML do servidor. Fallback `<noscript>` em
   `layout.tsx` devolve `[data-reveal]` ao estado final.
2. **Contraste abaixo do mínimo** em três sítios com opacidade reduzida a
   10px (3.36–3.54:1). Passaram a usar a cor completa; o pior contraste da
   página é agora 5.31:1.
3. **`useScroll` do framer-motion no cabeçalho** — trocado por listener
   nativo, que não fica preso quando o separador volta de segundo plano.
4. **`setState` no corpo de um efeito** (regra do React) e data da edição
   calculada no cliente — a data passou a vir do servidor por prop, o que
   também elimina qualquer divergência de hidratação.

### Verificação: o que foi e o que NÃO foi confirmado

Feito e passado: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit` (38 testes,
sem regressão); contraste medido em código em toda a página (mínimo 5.31:1);
sem overflow horizontal a 375px e 1440px; fontes corretas aplicadas; as oito
secções presentes com os ids certos.

**Não confirmado visualmente**: o painel do browser ficou escondido a meio da
sessão (`document.visibilityState === "hidden"`), estado em que o Chrome não
pinta nem dispara eventos de scroll. A primeira página foi vista renderizada
e está correta; os cadernos abaixo dela não. O `prefers-reduced-motion` está
garantido por código (`useReducedMotion` nas primitivas + bloco `@media`
global) mas não foi emulado no browser. **Fica para o utilizador confirmar.**

### Fora do âmbito (não é esquecimento)

- **UX da app intocada**: nenhuma mudança em `components/mail`, `ai`,
  `dashboard`, `tasks`, `calendar`.
- ~~**Contrastes fracos que já existiam na app**~~ — **resolvidos em
  2026-09-08**, na Fase 7 completa (ver "Fase 7 — Polish da app"): 10 pares
  abaixo do mínimo, todos corrigidos, 0 falhas na nova medição.
- **Fontes das referências partilhadas** (Envato Elements): exigem
  subscrição ativa e a licença não permite deixar os ficheiros num
  repositório público. A direção foi reproduzida com fontes livres
  auto-hospedadas via `next/font`.
- **Sem imagens/vídeo**: a página é tipografia, CSS e SVG inline.

## Fase 6 — pesquisa semântica/RAG + Google Calendar (2026-09-07)

### pgvector: o bloqueio inicial e como foi resolvido (sem perder dados)

A base de dados local corre em PGlite (`dev-db/server.js`). A partir da
0.5.x as extensões saíram do pacote principal, por isso `CREATE EXTENSION
vector` falhava. A saída óbvia era descer para PGlite 0.4.x, que ainda a
trazia embutida — mas essa versão é PostgreSQL 17 e o `pgdata` existente é
18, o que obrigava a apagar a base de dados. **Isso chegou a ser autorizado,
mas não foi preciso**: existe `@electric-sql/pglite-pgvector` (0.0.9), que
carrega a extensão como plugin na 0.5.x. Resultado: PG18 mantido, pgvector
0.8.1 a funcionar, zero perda de dados (73 threads intactas).

Detalhe que custou tempo: a instalação falhou primeiro com um 404 em
`@electric-sql/pg-protocol@0.0.4` — lockfile do pnpm desatualizado dentro de
`dev-db/`. Resolveu-se apagando `node_modules` e os lockfiles dessa pasta.

`drizzle/0005_free_klaw.sql` leva um `CREATE EXTENSION IF NOT EXISTS vector`
escrito à mão no topo: o Drizzle não o gera, e sem ele a migração rebenta
numa base de dados nova.

### Decisões de arquitetura (RAG)

- **Embeddings FORA da interface `AIProvider`** (`src/lib/ai/embeddings.ts`).
  A Anthropic não tem embeddings; obrigá-la a declarar `embed()` seria criar
  uma capacidade a fingir. É uma chamada REST direta à Gemini API com o mesmo
  tratamento de erros PT-PT do resto (§35).
- **Modelo fixo: `gemini-embedding-001`, `outputDimensionality: 768`.** Nunca
  um alias (a Fase 4 já tinha ensinado que os "-latest" mudam de geração e de
  quota sem aviso). 768 e não as 3072 por omissão porque os índices do
  pgvector não aceitam vetores tão largos. Os vetores são normalizados à mão
  depois de truncados — truncar tira-lhes a norma 1 de que a distância de
  cosseno depende. O modelo fica gravado em cada linha de `email_embedding`:
  trocá-lo invalida o índice todo.
- **Chunking com cabeçalho** (`src/lib/ai/chunking.ts`): cada chunk começa
  com `Assunto:` e `De:`. Sem isso, uma pesquisa por "o email do fornecedor
  de alojamento" não encontra nada, porque o corpo pode nunca dizer nem o
  nome nem o assunto. O texto é limpo antes (corta na assinatura/citação):
  indexar assinaturas fazia com que as mesmas conversas ganhassem sempre,
  já que o que mais se repete numa caixa é o rodapé.
- **Quando é que a indexação corre** — a pergunta que a fase deixou em
  aberto. **Nem síncrona no fim do sync, nem fila.** Síncrona bloquearia o
  utilizador e faria um sync bem-sucedido parecer falhado se a quota de
  embeddings estourasse a meio; uma fila a sério precisa de um worker fora do
  Next, que este projeto não tem (seria infraestrutura a fingir). Ficou
  **indexação incremental idempotente**, chamada (a) a seguir ao sync sem
  `await` a bloquear a resposta e (b) antes de uma pesquisa semântica, para
  que a primeira pesquisa numa caixa nova não devolva vazio.
- **Dois cortes de relevância, não um.** Uma pesquisa vetorial devolve sempre
  os K mais próximos, mesmo quando nada é relevante. Há um corte absoluto
  (0.62) e um corte relativo ao melhor resultado (0.07), porque a escala
  desliza com a pergunta: uma pergunta vaga baixa todas as semelhanças. Os
  valores foram medidos no dataset de seed, não escolhidos a olho.
- **A resposta de IA é a pedido, com botão** — nunca automática a cada
  pesquisa (§51). E o pedido de resposta re-executa a pesquisa no servidor
  em vez de aceitar as passagens do cliente: aceitá-las deixaria qualquer
  pessoa injetar texto no prompt e ler emails alheios (§29/§31).

### Medição: a pesquisa semântica ganha mesmo à textual?

O §27 diz para implementar RAG só se resolver um problema real. Medido com
um script temporário sobre o dataset de seed (27 emails, 27 chunks,
indexação em 1.1 s), com seis perguntas deliberadamente parafraseadas — sem
usar as palavras dos emails:

| Pergunta | Palavras-chave | Semântica (1.º resultado) |
| --- | --- | --- |
| "o site está em baixo e os clientes não conseguem pagar" | 0 resultados | Bug crítico em produção (65%) |
| "alguém está preocupado com o prazo do trabalho" | 0 | Bug crítico / Revisão do design do Q3 (70%) |
| "quanto é que tenho de pagar este mês" | 0 | Fatura #4521 (74%) |
| "a viagem que tenho marcada" | 0 | Confirmação: Voo LIS→BER (68%) |
| "alguém quer trabalhar comigo num projeto novo" | 0 | Proposta de parceria (70%) |
| "mudança de horário de uma conversa de equipa" | 0 | Reunião reagendada (72%) |

Seis em seis: a pesquisa textual devolve **zero** e a semântica acerta no
topo. Uma sétima pergunta sem relação nenhuma ("receitas de bolo de
chocolate") devolve zero nos dois modos — é o corte absoluto a funcionar.
Retrieval a ~300 ms.

**Verdicto sobre aumentar o dataset de seed**: não é preciso, e não foi
feito. O contraste já é claro com 20 threads, e o ruído que aparece nos
lugares 4-8 vem de haver poucos documentos a competir — acrescentar emails
piorava isso em vez de o resolver. Se um dia crescer, é para a demo parecer
uma caixa real (§48), não para o RAG funcionar.

### Google Calendar (§21)

- **Autorização separada e incremental.** `CALENDAR_OAUTH_SCOPES` só tem
  `calendar.events`, e o fluxo é próprio (`/api/google/calendar/connect` →
  `/callback`), não um segundo provider do Auth.js. Razão: o Auth.js
  autentica, e aqui não se autentica ninguém — já há sessão. Metê-lo no
  `signIn` traria de volta o bug de account-linking da Fase 3 e obrigaria a
  passar pelo login outra vez. Também evita pedir acesso ao calendário a
  quem só quer entrar na app.
- **Linha própria em `account`** (`provider: "google-calendar"`), para que
  ligar/desligar o calendário não mexa na ligação do Gmail. `tokens.ts` foi
  generalizado: a renovação é a mesma, o que muda é a linha e a mensagem de
  erro que o utilizador vê.
- **Ordem de escrita: local primeiro, Google a seguir.** Se o Google recusar
  (quota, rede, autorização revogada), o utilizador fica com o evento na app
  e é avisado de que não foi para lá — em vez de perder as duas coisas. O
  contrário deixaria eventos órfãos no calendário se a gravação local
  falhasse. A ferramenta do agente devolve ao modelo ONDE o evento ficou,
  para ele não anunciar um evento no Google que ficou só local (§13).
- **Desligar revoga o token no Google**, não se limita a apagar a linha
  local (§32). Os eventos já criados lá ficam — são do utilizador.

### O que falta para o calendário funcionar (é configuração, não código)

Verificado no browser: o botão "Ligar Google Calendar" leva mesmo ao Google
e o pedido é aceite como bem formado, mas a Google devolve
**`redirect_uri_mismatch`** — o URI novo ainda não está registado. No
mesmo cliente OAuth da Google Cloud Console é preciso:

1. **Authorized redirect URIs** → adicionar
   `http://localhost:3000/api/google/calendar/callback`
2. **Data Access** → adicionar o scope
   `https://www.googleapis.com/auth/calendar.events`
3. **APIs & Services → Library** → ativar a **Google Calendar API**

**FEITO e confirmado (2026-09-08).** O utilizador registou o redirect URI,
ligou o calendário com a conta real e confirmou que a integração funciona
ponta a ponta. O que travou não foi código: ativar a Calendar API na
Library **não** regista o redirect URI — são dois ecrãs diferentes da
Console, e faltava o segundo.

### Testes

60 unitários (`pnpm test:unit`), 22 novos:

- `chunking.test.ts` (14): limpeza de assinaturas/citações/reencaminhamentos,
  fronteiras de chunk em fim de frase, teto de chunks por email, cabeçalho
  repetido em todos os chunks.
- `calendar.test.ts` (8): scopes do calendário disjuntos dos do Gmail, URL de
  autorização com `access_type=offline`/`include_granted_scopes`, e o
  mapeamento de erros — incluindo a verificação de que o detalhe técnico da
  API **nunca** aparece na mensagem mostrada ao utilizador (§35).

Nota de infraestrutura: `server-only` passou a ser dependência explícita (o
Next resolvia-o por alias interno, e fora do Next não existia). O Vitest não
corre com a condição `react-server`, por isso o `vitest.config.ts` aponta-o
para um stub — sem isso, qualquer teste que importe indiretamente um módulo
server-only falha na importação.

### Verificado / não verificado

**Verificado**: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit` (60/60);
indexação real de 27 emails contra a API do Gemini; as seis pesquisas
semânticas da tabela acima; no browser, o modo "Significado" com excertos e
percentagens e a resposta com IA em streaming — que, perguntada sobre "o
site está em baixo e os clientes não conseguem pagar", **recusou-se a
inventar**: disse que não encontrou nada sobre isso e apontou o que existe
mesmo (erro 500 ao guardar preferências), citando os excertos.

**Confirmado depois (2026-09-08)**: o fluxo OAuth do calendário e a criação
de eventos reais no Google, testados pelo utilizador com a conta ligada.
**Continua por verificar**: o comportamento com uma caixa de Gmail real
grande — o dataset de teste é o de seed (30 threads no máximo).

### Fora do âmbito desta fase (documentado, não escondido)

- **Sincronização incremental do Gmail (`historyId`)**: continua por fazer,
  como desde a Fase 3.
- **Calendário sem reconciliação de alterações**: lê os próximos eventos do
  Google e mostra-os (ver "Atualização 2026-09-07" abaixo), mas não deteta
  quando um evento criado pelo Nuvoly é editado ou apagado do lado do
  Google — a linha local fica desatualizada até o utilizador apagar os dois
  manualmente.
- **Fuso horário do servidor**: a app não guarda o fuso do utilizador. Não
  desloca eventos (as datas vão como instantes ISO, absolutos), só decide em
  que fuso o Google os mostra.
- **Reindexação de emails alterados**: um email cujo corpo mude depois de
  indexado mantém o embedding antigo. Não acontece na prática (o Gmail não
  reescreve mensagens); trocar de modelo de embeddings obriga a limpar a
  tabela `email_embedding` à mão.
- **Sem reranking**: o resultado é a ordem da distância de cosseno, sem um
  segundo modelo a reordenar. Com este volume não compensa a chamada extra.

Commit `17ea90c` no branch `phase-6-semantic-search` (não fiz push nem merge
para `main` — decisão do utilizador, como nas fases anteriores).

### Atualização 2026-09-07 — leitura do Google Calendar + bug real de setup

Ao testar com a conta real do utilizador (`joaonatalli11@gmail.com`,
adicionada entretanto como test user), o botão "Ligar Google Calendar"
falhou com `redirect_uri_mismatch` mesmo com a Calendar API já ativada.
Causa: **ativar a API não regista o redirect URI** — são dois sítios
diferentes na Google Cloud Console (API Library vs. Credenciais → o
cliente OAuth "Web application"). O cliente só tinha o URI do login
(`/api/auth/callback/google`); faltava adicionar
`/api/google/calendar/callback` à lista de "URIs de redirecionamento
autorizados" *desse mesmo cliente*. Fica como nota para o README, porque é
o tipo de erro que parece bug de código e não é.

Depois disso o utilizador ligou o calendário e reparou que a implementação
original só escrevia — as reuniões que já existiam no Google Calendar
antes de qualquer coisa nunca apareciam em `/app/calendar`. Isto estava
documentado como fora do âmbito, mas o utilizador pediu para implementar
já. Adicionado:

- `listUpcomingCalendarEvents` no cliente da API (GET com `singleEvents:
  true` — sem isto uma reunião recorrente só aparecia uma vez, na primeira
  ocorrência; e `orderBy: startTime`).
- `listGoogleOnlyEventsForUser`: lê os próximos 50 eventos do Google e
  filtra os que já têm linha local (via `googleEventId`), para não
  duplicar na lista um evento que o Nuvoly criou.
- `/app/calendar` mostra os dois conjuntos juntos, ordenados por data, com
  os eventos "só no Google" marcados como tal (sem link para o email de
  origem, porque não têm — não passaram pela app).
- Apagar um evento "só no Google" chama a API diretamente
  (`deleteRemoteCalendarEvent`, nova Server Action), porque não existe
  linha em `calendar_event` para apagar primeiro.

Ficou por fazer (documentado, não escondido): reconciliação de edições —
um evento criado pelo Nuvoly e depois editado ou apagado no Google não é
detetado; a linha local fica desatualizada até o utilizador mexer nos dois
lados. Implementar isso a sério pede sincronização incremental (`syncToken`
da Calendar API), que é o género de trabalho da "Fase 8 — polish" e não
cabia neste pedido pontual.

### Atualização 2026-09-07 (2) — os "pontos de atenção" fechados

O utilizador pediu para fechar quatro dos pontos em aberto listados acima.
Três ficaram feitos; um foi decisão de manter como está:

- **`.claude/launch.json` versionado** (`git add .claude/`) — só tem a
  config do dev server para o browser preview, sem segredos; equivalente ao
  `.vscode/launch.json`, útil para quem continuar o projeto.
- **Fuso horário do utilizador**: coluna `user_preference.time_zone`
  (migração `drizzle/0006_narrow_chameleon.sql`), capturada uma vez por
  sessão pelo componente `TimeZoneSync` no layout da app
  (`Intl.DateTimeFormat().resolvedOptions().timeZone`) e gravada via
  `setUserTimeZone`. O Calendar (`displayTimeZone` em
  `src/lib/calendar/service.ts`) usa-o em vez do fuso do servidor assim que
  existe; sem ele (sessão nova) continua a cair no fuso do servidor —
  nunca inventa um fuso a partir do IP ou de qualquer coisa do lado do
  servidor. Testado: confirmado gravado como `Europe/Lisbon` na BD depois
  de uma visita à app.
- **Sincronização incremental do Gmail**: `listHistorySince` em
  `gmail-client.ts` (`users.history.list`, paginado, tipos
  `messageAdded`/`messageDeleted`/`labelAdded`/`labelRemoved`). `runGmailSync`
  é agora o único ponto de entrada do botão "Sincronizar agora" — decide
  sozinho entre completo (primeira vez) e incremental (já tem `historyId`);
  cai para completo também se a API responder 404 (histórico fora da janela
  de retenção, ~7 dias). Uma thread cujo `getThread` responda 404 no meio do
  incremental é apagada localmente (deixou de existir no Gmail) em vez de
  abortar o sync inteiro. `syncSingleGmailThread` passou a aceitar um
  `accessToken`/`labelMap` já obtidos, para não pedir um token novo e
  reimportar labels a cada thread da lista de mudanças.
- **Reconciliação do Google Calendar**: tabela nova `calendar_sync`
  (mesmo padrão do `gmail_sync`, um `syncToken` da Calendar API em vez de
  `historyId`). `reconcileCalendarForUser` corre antes de `/app/calendar`
  mostrar a lista: lê o que mudou desde o último `syncToken`
  (`listCalendarChanges`, que nunca combina `syncToken` com
  `timeMin`/`timeMax` — a API rejeita isso), atualiza ou remove a linha
  local de qualquer evento do Nuvoly (`googleEventId` correspondente) que
  tenha sido editado/apagado do lado do Google. Um `syncToken` expirado
  (410 Gone) refaz o baseline do zero, tal como o `historyId` do Gmail.
  Eventos "só no Google" (sem linha local) ficam de fora — não têm estado
  para divergir, e continuam a aparecer pela leitura já existente
  (`listGoogleOnlyEventsForUser`).

**Bug real encontrado a verificar**: depois de aplicar a migração
(`pnpm db:migrate`, coluna e tabela confirmadas a existir via query direta),
a app continuava a dar 500 em `/app/calendar` com
`Failed query: select "time_zone" from "user_preference"...`. Não era a
migração — era um `next-server` (PID visto via `lsof -i :3000`) a correr há
17h, de uma sessão de terminal anterior, com uma ligação à base de dados
aberta antes da coluna existir. Reiniciar o dev server (autorizado pelo
utilizador) resolveu — o PGlite local não invalida automaticamente esse
tipo de estado em conexões já abertas. Fica registado porque é o tipo de
falha que parece um bug de migração e não é: **sempre que um `ALTER TABLE`
correr com o dev server já a correr há muito tempo, reiniciar o dev server
a seguir.**

Testes: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit` (64/64, 4 novos em
`src/lib/calendar/__tests__/service.test.ts` para `buildEventPatch` — a
única parte pura da reconciliação, o resto exige rede real). Verificado no
browser numa aba nova (sem cache de RSC de antes do restart): `/app/inbox`,
`/app/calendar`, `/app/settings` sem erros de consola.

**Não verificado**: a reconciliação do Calendar e o sync incremental do
Gmail pedem uma segunda mudança feita DIRETAMENTE no Google (editar/apagar
um evento no Google Calendar, ou receber um email novo) para se confirmar
ponta a ponta — isso só o utilizador consegue fazer com a conta real
ligada.

## Fase 7 — Polish da app (2026-09-08)

O redesign de 2026-09-06 tratou da landing e deixou `/app/*` intocada de
propósito. Esta ronda fecha o que o §56 atribui à Fase 7 dentro da app.

### Git arrumado primeiro (Passo 0)

`main` estava parado em `b92e1cd` (2026-09-05) e todo o trabalho das Fases
4-7 vivia em quatro branches locais. Confirmado com `git merge-base
--is-ancestor` que eram uma linha reta sem divergência; `main` avançou por
fast-forward 16 commits e os nomes intermédios (`phase-4-gemini-provider`,
`phase-5-ai-agent`, `phase-6-semantic-search`, `phase-7-landing-redesign`)
foram apagados.

**O push falhou e continua por fazer**: o keychain do macOS tem credenciais
de `FireHorseWM` para um repositório de `JoviNatalli`, e a Google recusa com
`403 Permission denied`. Não é algo que eu possa resolver — passa por
atualizar a credencial (o mesmo PAT que continua por rodar, ver notas
operacionais). `main` local está 16 commits à frente de `origin/main`.

### 1. Navegação mobile (§37) — era uma lacuna funcional

`app-sidebar.tsx` é `hidden ... md:flex`: abaixo de 768px a app não tinha
**nenhuma** forma de mudar de pasta. Não foi a sidebar encolhida; é outra
hierarquia, como o §37 pede:

- barra inferior fixa com os cinco destinos de uso constante (Inbox,
  Tarefas, Agenda, Copiloto, Mais), ao alcance do polegar, com
  `env(safe-area-inset-bottom)` para não ficar por baixo da home indicator
  do iOS;
- drawer (`vaul`, o primitivo `drawer.tsx` já existia — não foi preciso
  criar um `Sheet`) para o resto: pastas menos usadas, labels, briefing,
  definições.

Alvos de toque medidos: 75×55px na barra, 44px mínimo no drawer — acima dos
44×44 das WCAG 2.5.5, com teste E2E a impedir regressão. `main` ganhou
`padding-bottom` em mobile para o fim das listas não ficar escondido.

### 2. Atalhos de teclado (§36)

Só existia `/` e `⌘K`. Novos: `C` (compose), `G` depois `I` (ir para o
Inbox, sequência com janela de 1.2s), e — só com uma conversa aberta — `R`
(responder), `A`/`E` (arquivar), `S` (estrela).

Decisão de arquitetura: um único listener global em `shortcuts-provider.tsx`
em vez de um por componente. Os atalhos de conversa são REGISTADOS pelo
`ThreadDetail` (`useThreadShortcuts`) e limpos quando ele desmonta — só ele
sabe se a conversa é rascunho, está no lixo, ou já está arquivada, e `A`
numa conversa do lixo não pode arquivar nada. O guard `isTypingTarget` foi
reaproveitado do command palette e alargado a `contentEditable`.

A lista em Definições → Atalhos era uma promessa (listava atalhos que não
existiam); agora descreve o que existe, com o âmbito de cada um.

### 3. Acessibilidade (§36) — medido, não estimado

Escrevi um medidor de contraste (OKLCH → sRGB → luminância) para os pares
cor/fundo reais da app. **44 pares medidos, 10 falhavam — todos em tema
claro; o tema escuro estava limpo.** Corrigidos:

| O quê | Antes | Depois |
| --- | --- | --- |
| Iniciais dos avatares (6 cores) | 2.84–4.55:1 | 4.49–5.82:1 (`-700`, âmbar `-800`) |
| Chips de label | 3.33–4.86:1 | 4.67–9.15:1 (`-700`) |
| Badge de prioridade | 2.95–6.69:1 | 4.67–9.15:1 (`-700`) |
| Estrela ativa | 2.15:1 | 3.19:1 (`-600`, mínimo de ícone é 3:1) |
| Ícones dos passos do agente | 2.06–2.37:1 | 3.53–4.86:1 |

O âmbar dos avatares é o único a usar `-800`: com `-700` fica em 4.49:1,
falha por 0.01. Nova medição: **0 falhas em 44 pares.**

Também: quatro botões só-ícone sem nome acessível (menu da conta, enviar ao
copiloto, aplicar labels, notificações) e três alvos de foco que
desapareciam para quem navega por teclado (`opacity-0 group-hover:` sem
`focus-visible:`) — estrela da lista, apagar tarefa, apagar evento.

### 4. Animações (§39)

`src/components/shared/motion.tsx`, separado das primitivas da landing de
propósito: lá o movimento é editorial (700ms); numa inbox que se usa dezenas
de vezes por dia, animação que se nota à segunda vez é atrito. 180ms, só
`transform`/`opacity`, `useReducedMotion` como primeira verificação de cada
primitiva. Aplicado a: emails a entrar na lista (com teto de escalonamento —
sem ele o 40.º email esperava meio segundo), painel de insights, passos do
agente, propostas e cartão de confirmação, indicador da barra mobile.

**`prefers-reduced-motion` verificado a sério pela primeira vez** (na Fase 7
parcial ficou por emular). Aqui apanhei um bug NO TESTE: `test.use({
reducedMotion: "reduce" })` não chegava à página nesta combinação de
Playwright + chrome-headless-shell (`matchMedia(...).matches` continuava
`false`), e o teste passava a verificar o oposto do que dizia. Com
`page.emulateMedia()` explícito a emulação funciona e a app comporta-se
bem: opacidade 1 imediata, `transform: none`, zero animação.

### 5. Performance (§38) — o que NÃO foi feito, e porquê

- **Virtualização de listas: não implementada, por decisão.** Números reais:
  o sync inicial do Gmail está limitado a 30 threads, a base de dados local
  tem 73 no total (3 utilizadores) e a maior caixa tem 30. Virtualizar 30
  linhas seria código morto com custo de manutenção. Passa a valer a pena
  algures acima de ~200 linhas — e o primeiro passo para lá chegar é subir
  o teto do sync, não virtualizar. Mesma lógica de honestidade aplicada ao
  RAG na Fase 6.
- **Debounce: só no modo palavras-chave.** Não havia nenhum (submetia no
  Enter e — pior — no `blur`, o que provocava navegação dupla ao clicar no
  seletor de modo). Agora: 350ms no modo palavras-chave (é um `ilike`
  local); no modo "Significado" continua só no Enter, porque cada pesquisa
  gasta uma chamada de embeddings e escrever uma frase esgotaria quota (§51).
  A assimetria é deliberada.
- **Code splitting: nada a fazer.** O componente pesado (`AgentChatPanel`,
  542 linhas) já está isolado em `/app/ai` pelo route splitting do Next; os
  outros têm 54–161 linhas, onde um `dynamic()` acrescentaria estado de
  carregamento por uns KB. **Tentei atribuir bundles por rota e não
  consegui**: os manifests do Turbopack em `.next/server/app/**` reportam
  todos o mesmo bootstrap partilhado (539KB), sem separar o que é da rota.
  A decisão assenta nos tamanhos dos ficheiros e na estrutura de imports,
  não numa medição por rota — fica dito.

### 6. Testes (§49)

De 16 para **28 E2E** e de 60 para **71 unitários**.

`tests/e2e/ai.spec.ts` (6) — decisão de desenho que muda o que provam: as
chamadas ao modelo acontecem no SERVIDOR, e o `page.route()` do Playwright
não as interceta; mocká-las exigiria uma camada de injeção que só existiria
para os testes. Correm por isso contra o Gemini real, e verificam o
**contrato** do §35: cada fluxo acaba num resultado válido OU numa mensagem
PT-PT — nunca num ecrã partido, erro cru ou spinner eterno. Há uma lista de
padrões de "erro técnico à solta" que falha o teste se algum aparecer.

O teste do agente começou por falhar e **não era bug**: o agente pesquisou,
encontrou só 1 newsletter na inbox (a outra está no lixo) e perguntou em
texto em vez de propor uma ação em massa — exatamente o comportamento certo.
O teste é que assumia ≥2 itens. Reescrito para verificar a invariante que
interessa e é determinista: **em nenhum caminho o email sai do Inbox sem
confirmação explícita** (§18).

`tests/e2e/polish.spec.ts` (12) — deterministas, não tocam no modelo:
navegação a 375px e 768px, alvos de toque ≥44px, drawer, ausência de scroll
horizontal, cada atalho de teclado (incluindo a garantia de que não disparam
dentro de campos de texto), `prefers-reduced-motion`, nomes acessíveis em
todos os botões e ordem de tabulação.

Unitários novos (11): `rate-limit.test.ts` — limites por utilizador e por
regra, janela deslizante, e que o detalhe técnico nunca entra na mensagem
mostrada.

Nota operacional: o binário do Playwright não estava instalado nesta
máquina (`npx playwright install chromium`).

### 7. Segurança (§30) — dois achados reais

- **Não havia rate limiting nenhum.** Agora há, em `src/lib/rate-limit.ts`:
  janela deslizante em memória por utilizador, com limites diferentes por
  superfície (agente 12/min, porque um turno gasta várias chamadas ao
  modelo; pesquisa com IA 20/min; Server Actions de IA 25/min). As
  limitações estão escritas no ficheiro em vez de escondidas: não sobrevive
  a reinícios nem a várias instâncias, e para produção a sério isto é Redis.
  O que resolve mesmo é o risco concreto deste projeto — um cliente com
  sessão válida, ou um bug de UI em loop, a esgotar a quota diária gratuita
  do Gemini em segundos (já aconteceu na Fase 5).
- **A chave da API do Gemini ia no URL** dos embeddings (`?key=...`).
  Mensagens de erro de `fetch`, stack traces e qualquer `console.error` que
  registe o erro em bruto citam o URL — e a chave ficava escrita nos logs.
  Passou para o cabeçalho `x-goog-api-key`. Verificado contra a API real
  depois da mudança (768 dimensões, norma 1.0).

Confirmado (não alterado, já estava certo): o RAG passa o conteúdo dos
emails por `neutralizeDelimiters` tal como a Fase 5 (`buildRagPrompt`
neutraliza assunto, remetente e corpo), e os `console.error` registam o
objeto de erro, nunca o corpo dos emails nem o contexto do RAG.

**Limpeza**: 16 ficheiros duplicados `* 2.ts`/`* 2.tsx` (artefactos de
"manter ambos" do macOS, cópias idênticas, nunca commitados mas compilados
pelo `tsc`) foram apagados depois de confirmado que ninguém os importava.

### 8. Error handling (§35) — auditoria dos caminhos da Fase 6

Todos os caminhos novos seguem o padrão: `mapEmbeddingError` e
`CalendarError` já devolviam `userMessage` PT-PT, e a página do calendário e
a rota do RAG traduzem antes de chegar à UI. Uma lacuna real: o cliente da
pesquisa com IA descartava a mensagem do servidor e mostrava sempre a
genérica — agora mostra a do servidor (rate limit, sessão expirada) quando
existe, como o painel do agente já fazia.

### Fora do âmbito desta fase (documentado, não escondido)

- **Virtualização de listas** — ver ponto 5, com os números que sustentam a
  decisão.
- **Contraste da landing** — já tinha sido medido na Fase 7 parcial (mínimo
  5.31:1); esta ronda mediu só a app.
- **Teste em dispositivo físico**: a navegação mobile foi verificada em
  viewport emulado (375px e 768px, no browser e em Playwright) e por
  medição dos alvos de toque. **Não foi testada num telemóvel real** — o
  brief pedia-o, e problemas de toque que só aparecem em hardware
  (scroll momentum, gestos do drawer a competir com o swipe-back do iOS)
  ficam por confirmar.
- **Persistência das conversas do agente** e **notificações de lembretes**
  continuam por fazer, como desde a Fase 5.

## Notas operacionais que ainda importam

- **PAT do GitHub por rodar E credencial errada no keychain**: um Personal
  Access Token foi partilhado em texto simples numa sessão anterior. Além
  de continuar por rodar (https://github.com/settings/tokens), o keychain
  do macOS tem credenciais de `FireHorseWM` guardadas para `github.com`,
  enquanto o repositório é de `JoviNatalli` — por isso `git push` devolve
  `403 Permission denied`. **`main` local está 16 commits à frente de
  `origin/main` e o push é ação do utilizador.** Para corrigir:
  `git credential-osxkeychain erase` (com `host=github.com` e
  `protocol=https`), ou apagar a entrada "github.com" no Acesso a Porta-
  chaves, e autenticar de novo com o PAT correto no próximo push.
- Atualizar este ficheiro no fim de cada fase (estado, decisões tomadas, o
  que ficou fora do âmbito) — é o que substitui o hand-off manual entre
  sessões.
- **Sempre que um `ALTER TABLE` correr com o dev server já de pé há muito
  tempo, reiniciar o dev server** — o PGlite local não invalida o estado de
  conexões já abertas, e a app dá 500 com a coluna já criada na base de
  dados (aconteceu na Fase 6, ver "Atualização 2026-09-07 (2)").
- O binário do Playwright pode não estar instalado numa máquina nova:
  `npx playwright install chromium`.
