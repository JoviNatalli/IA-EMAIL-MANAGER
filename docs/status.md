# Nuvoly — estado do projeto (para retomar com Claude Code)

> Ler isto + `docs/master-spec.md` completo antes de começar qualquer fase nova.
> Regra do projeto: avançar fase a fase, verificar qualidade/tipos/lint e testar
> manualmente no fim de cada fase antes de passar à seguinte (master-spec §56).

## Estado (2026-09-05)

- **Fases 1-3: completas e testadas manualmente.** HEAD `60d8846` em
  `main` (https://github.com/JoviNatalli/IA-EMAIL-MANAGER).
- **Fase 4 (IA: resumo, categorização, prioridade, respostas, AI chat) e
  Fase 5 (AI Agent com tool calling): ainda não iniciadas.** É o próximo
  trabalho.
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

## Notas operacionais que ainda importam

- **PAT do GitHub por rodar**: um Personal Access Token foi partilhado em
  texto simples numa sessão anterior e reutilizado várias vezes para
  pushes. Rodar/revogar em https://github.com/settings/tokens assim que
  possível, se ainda não foi feito.
- Ao fechar a Fase 4 e a Fase 5, atualizar este ficheiro (estado, decisões
  de execução tomadas, o que ficou fora do âmbito) — é o que substitui o
  hand-off manual entre sessões.
