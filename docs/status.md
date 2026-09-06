# Nuvoly — estado do projeto (para retomar com Claude Code)

> Ler isto + `docs/master-spec.md` completo antes de começar qualquer fase nova.
> Regra do projeto: avançar fase a fase, verificar qualidade/tipos/lint e testar
> manualmente no fim de cada fase antes de passar à seguinte (master-spec §56).

## Estado (2026-09-06)

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
  abaixo. Falta a validação final do utilizador para a dar por fechada.
- **Fase 7 (parcial) — redesign visual da landing + refresh de tokens
  (2026-09-06).** Reordenação deliberada, decidida com o utilizador: o §60 do
  master-spec põe UX e qualidade visual acima da integração de IA, e a
  primeira impressão da landing pesa muito num projeto de portfólio. Ver
  "Fase 7 (parcial)" abaixo.
- **Fase 6 (semantic search/RAG, Gmail incremental): não iniciada — é o
  próximo trabalho**, retomada depois deste redesign.
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

## Fase 7 (parcial) — redesign visual da landing (2026-09-06)

Âmbito deliberadamente estreito: **só a landing page e os tokens**. A UX da
app não foi tocada.

- **Direção estética**: "editorial signal" — editorial suíço com precisão de
  terminal. A landing é sempre escura (classe `.landing`, que re-escopa os
  MESMOS custom properties da app, não um segundo sistema de tokens); o
  produto aparece como o trabalho iluminado por cima da tinta.
- **Tipografia**: par novo só na landing — Instrument Serif (display, serifa
  de alto contraste), Archivo (corpo) e JetBrains Mono (rótulos e números).
  A app mantém Geist: numa lista densa de emails continua a ser a mais
  legível, e trocar por trocar só a tornaria pior. Tudo auto-hospedado via
  `next/font` (sem pedidos a terceiros, sem CLS).
- **Narrativa em seis momentos** (impacto → contexto → demonstração → prova →
  diferenciação → conversão), com a secção "produto" em sticky storytelling:
  a superfície do produto muda conforme a capacidade que está a ser lida.
  Nova secção `difference.tsx`; `product-preview.tsx` passou a ter quatro
  estados (triagem, insights, rascunho, confirmação).
- **Motion**: `framer-motion` (já era dependência, não usada até agora).
  Reveals de scroll, entrada palavra a palavra no título, parallax subtil e
  CTAs magnéticos — em `motion-primitives.tsx`, todos com `useReducedMotion`.
- **Honestidade dos dados fictícios** (spec §8/§13): a secção de prova e a de
  preços abrem com um aviso visível ("cenário ilustrativo", "valores
  ilustrativos") e cada citação está marcada como "exemplo fictício". Nada
  fica escondido num tooltip.
- **Refresh de tokens** (`globals.css`), propagado à app: `--radius`
  0.625rem → 0.5rem (menos arredondado, mais editorial) e `--primary`
  ligeiramente mais saturado nos dois temas. Mais nada mudou de cor.

### Bugs reais encontrados a verificar (e corrigidos)

1. **Sem JavaScript a landing ficava em branco.** O `framer-motion` escreve o
   `opacity: 0` inicial já no HTML do servidor, portanto sem JS ninguém
   dispara a animação e o texto ficava invisível — não sem animação:
   invisível. Corrigido com um `<noscript>` em `layout.tsx` que devolve
   `[data-reveal]` ao estado final.
2. **Contraste abaixo do mínimo na coluna riscada da secção "Diferença"**
   (3.34:1, medido). Passou a usar a cor completa de `muted-foreground`
   (6.14:1) — continua a ler-se como secundária pelo risco, não pela cor.
3. **Aviso do rodapé a 12px** — subido para 13px com `leading-relaxed`: um
   aviso de honestidade tem de ser confortável de ler.
4. **Header preso ao `useScroll` do framer-motion** — passou a listener nativo
   de `scroll`, que não depende de `requestAnimationFrame` e por isso não
   fica preso no estado inicial quando o separador volta de segundo plano.

### Verificação: o que foi e o que NÃO foi confirmado

Feito e passado: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit` (38 testes,
sem regressão); contraste medido em código (canvas + WCAG) na landing e em
`/app/inbox` nos dois temas — todos os textos ≥ 4.5:1 depois das correções;
fontes corretas aplicadas; sem overflow horizontal a 375px, 768px, 1024px e
1440px; conteúdo completo no DOM.

**Não confirmado visualmente**: a meio da sessão o painel do browser ficou
escondido (`document.visibilityState === "hidden"`), estado em que o Chrome
não pinta nem dispara eventos de scroll — medi zero eventos. Logo, ficaram
por ver com os próprios olhos: o comportamento do header no scroll, os
reveals, a troca sticky da secção "produto" e o aspeto geral abaixo do hero
(só o hero foi visto renderizado). O `prefers-reduced-motion` está garantido
por código (`useReducedMotion` em todas as primitivas + bloco `@media` global
no `globals.css`) mas também não foi emulado no browser. **Fica para o
utilizador confirmar a olho.**

### Fora do âmbito (não é esquecimento)

- **UX da app intocada**: nenhuma mudança em `components/mail`, `ai`,
  `dashboard`, `tasks`, `calendar` — só herdaram os tokens.
- **Contrastes fracos que já existiam na app** e que este trabalho não
  introduziu nem corrigiu (medidos em `/app/inbox`, tema claro): iniciais dos
  avatares (2.85–3.63:1), chips de label (3.31:1) e badge de prioridade
  (3.91:1). Vêm de cores da paleta Tailwind escritas nos componentes, não dos
  tokens. Ficam para a passagem de acessibilidade da Fase 7 completa.
- **Sem imagens/vídeo**: a landing é 100% tipografia, CSS e SVG inline — não
  há assets a otimizar nem lazy loading a fazer.

## Notas operacionais que ainda importam

- **PAT do GitHub por rodar**: um Personal Access Token foi partilhado em
  texto simples numa sessão anterior e reutilizado várias vezes para
  pushes. Rodar/revogar em https://github.com/settings/tokens assim que
  possível, se ainda não foi feito.
- Ao fechar a Fase 4 e a Fase 5, atualizar este ficheiro (estado, decisões
  de execução tomadas, o que ficou fora do âmbito) — é o que substitui o
  hand-off manual entre sessões.
