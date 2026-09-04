# AI Email Manager (MailMind) — Master Project Prompt

> Documento de referência: especificação completa fornecida pelo utilizador (JoviGabi) para o desenvolvimento do MailMind. Guardado para consulta em todas as fases futuras. Não editar o conteúdo abaixo — é a fonte da verdade do produto.

## 1. Papel
Atua simultaneamente como Senior Front-end Engineer, Full-stack Engineer, AI/LLM Engineer, Product Designer, UX/UI Designer, Software Architect, QA Engineer e Security Engineer.

Objetivo: construir uma aplicação SaaS profissional chamada **AI Email Manager**, com qualidade de portfólio profissional — não um tutorial, template genérico ou clone básico do Gmail. Produto moderno, sofisticado, rápido, intuitivo e visualmente memorável, com IA profundamente integrada na UX.

## 2. Conceito do Produto
Plataforma inteligente de gestão de emails que conecta a Gmail/Outlook e transforma a inbox numa central de produtividade: visualizar, pesquisar, organizar, categorizar automaticamente, identificar prioridades, resumir conversas, sugerir/gerar respostas, alterar tom, extrair tarefas, identificar reuniões, criar lembretes, gerar resumos diários, interagir via linguagem natural.

Filosofia: **"Don't manage your inbox. Let AI manage it with you."** — a IA é copiloto, não um chatbot separado.

## 3. Objetivo Principal
Demonstrar domínio de React, Next.js, TypeScript, UI/UX, APIs, OAuth, integração Gmail/Outlook, bases de dados, LLMs, streaming, structured outputs, tool calling, pesquisa semântica, arquitetura, segurança e performance — complexidade suficiente para portfólio profissional, desenvolvida incrementalmente.

## 4. Stack Tecnológica
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Next.js Server Actions, Route Handlers, TypeScript, Zod
- **Database**: PostgreSQL + Prisma OU Drizzle (escolher UMA e manter consistência)
- **Auth**: OAuth com Gmail/Google; arquitetura preparada para Microsoft/Outlook depois
- **AI**: Vercel AI SDK (ou equivalente), camada de abstração de provider (OpenAI / Anthropic / Gemini) — trocar de modelo sem reescrever lógica principal
- **Infra**: Vercel, PostgreSQL hosted, object storage se necessário

## 5. Princípios de Design
Evitar: gradientes excessivos, sombras exageradas, cards desnecessários, poluição visual, excesso de cores, aparência de dashboard genérico, componentes gigantes, animações exageradas.

Priorizar: whitespace, tipografia forte, hierarquia visual, microinterações, feedback visual, transições suaves, consistência, acessibilidade, keyboard shortcuts.

Sensação: calma + inteligência + produtividade + sofisticação.

## 6. Direção Visual
Inspiração (sem copiar): Linear, Raycast, Superhuman, Notion, Arc, produtos modernos de AI. Identidade visual própria.

- Nome do produto: **AI Email Manager**
- Brand: **MailMind**
- Tagline: **"Your inbox, intelligently managed."**

## 7. Estrutura da Aplicação
```
/
├── Landing Page
├── /login
├── /onboarding
└── /app
    ├── /inbox
    ├── /starred
    ├── /important
    ├── /sent
    ├── /drafts
    ├── /archive
    ├── /trash
    ├── /labels
    ├── /search
    ├── /tasks
    ├── /calendar
    ├── /ai
    ├── /briefing
    └── /settings
```

## 8. Landing Page
Hero: "Your inbox, intelligently managed. / AI that reads, understands, organizes and helps you respond. / [Get started] [See how it works]"
Incluir: hero animation, product preview, AI interaction demo, features, workflow, testimonials fictícios claramente identificados como exemplos, pricing, FAQ, CTA final. Deve parecer uma startup SaaS real.

## 9. Onboarding
1. Connect email account
2. Preferências: Work / Meetings / Clients / Finance / Personal / Projects
3. AI assistance level: Minimal / Balanced / Proactive
4. Ativar: automatic categorization, priority detection, daily briefing, smart reply suggestions

## 10. Inbox (wireframe)
Sidebar com Inbox, Important, Starred, Sent, Drafts, Archive, Labels, AI Briefing, Tasks. Área principal "Focus" com secção "Needs attention" e lista por data.

## 11. Email List
Cada item: sender, avatar, subject, preview, timestamp, unread state, priority, attachment indicator, AI category, labels.

## 12. Email Detail
Mostrar sender, recipients, timestamp, subject, content, attachments, thread, labels + painel AI Insights: Summary, Intent, Priority, Suggested action, botões [Draft reply] [Create task].

## 13. AI Summary
Resumir email individual ou thread inteira. Nunca inventar informação — se não houver dados suficientes, dizer explicitamente.

## 14. AI Reply Generator
Botão "Draft with AI" com instruções livres do utilizador. Controlar Tone (Professional/Friendly/Concise/Formal/Casual/Empathetic) e Length (Short/Medium/Detailed).

## 15. Smart Reply
Sugestões rápidas contextuais (quick replies).

## 16. AI Email Commands
Interface de comandos em linguagem natural (ex.: "Find all unread emails from John", "Archive all promotional emails").

## 17. Tool Calling
Ferramentas: searchEmails, getEmail, getThread, summarizeThread, createDraft, sendEmail, archiveEmail, markAsRead, starEmail, addLabel, removeLabel, createTask, createReminder, findEmailsByDate, findEmailsBySender. A IA decide quando usar cada uma.

## 18. Ações Confirmáveis
Nunca executar ações destrutivas/sensíveis (enviar, apagar, mover em massa, alterar configurações) sem confirmação explícita do utilizador — mostrar contagem de itens afetados antes.

## 19. Daily AI Briefing
Página com resumo diário: contagem de emails importantes, que precisam resposta, meeting requests, deadlines, top priorities. Botão "Ask AI about my day".

## 20. Task Extraction
Detectar tarefas em emails (ex.: "Send me the final presentation by Friday") → card com título, due date, source, botão [Create task]. Área /tasks agrupada por dia.

## 21. Calendar Intelligence
Detectar menções de reuniões → [Add to calendar]. Arquitetura preparada para integração futura com Google Calendar.

## 22. Smart Categorization
Categorias: Work, Personal, Finance, Shopping, Social, Newsletter, Meetings, Important, Promotional — via structured outputs, ex.: `{category, priority, requires_reply, intent, sentiment}`.

## 23. Priority Score
Priority = sender importance + deadline proximity + requires response + keywords + historical interaction (fórmula interna, não exposta). Mostrar apenas High/Medium/Low.

## 24. Search
Operadores: from:, to:, subject:, after:, before:, has:attachment, is:unread, is:important. Mais pesquisa semântica (ex.: "emails about the client complaining about the deadline" mesmo sem essas palavras exatas).

## 25. AI Chat
Painel lateral com contexto da aplicação (ex.: "You have 7 unanswered important emails today. What should I answer first?").

## 26. AI Context
A IA deve poder usar: email atual, thread atual, emails selecionados, inbox, tarefas, labels, histórico relevante — aplicando "minimum necessary context".

## 27. RAG / Semantic Search
Pipeline: Email → Clean text → Chunk → Embedding → Vector DB. Query → Embedding → Similarity search → Relevant emails → LLM → Answer. Implementar apenas quando resolver um problema real, não "para ter RAG".

## 28. Database — Entidades Principais
User, Account, Email, EmailThread, Label, EmailLabel, Attachment, Task, Reminder, AIConversation, AIMessage, AIToolCall, AIAnalysis, Notification, UserPreference, SyncState.

## 29. Multi-tenancy
Dados isolados por utilizador; toda query deve verificar ownership; nunca permitir acesso a emails de outro utilizador.

## 30. Segurança
OAuth seguro, tokens protegidos, secrets apenas no servidor, validação de inputs, autorização, rate limiting, proteção contra prompt injection, sanitização de HTML de emails, proteção XSS, CSRF quando aplicável, logging seguro. Nunca expor API keys, refresh tokens, dados privados, prompts internos.

## 31. Prompt Injection
Tratar conteúdo de emails como não confiável. Separar claramente: SYSTEM INSTRUCTIONS / USER INSTRUCTIONS / EMAIL CONTENT / TOOL RESULTS. Conteúdo de email nunca deve alterar instruções do sistema.

## 32. Privacidade
Settings com opções explícitas: Process emails with AI / Store AI conversations / Improve suggestions using history — cada uma explicada claramente.

## 33. Realtime
Feedback imediato na UI após qualquer ação da IA (ex.: criar task → DB atualizado → UI atualiza na hora).

## 34. Loading States
Skeletons, streaming, optimistic updates, progress indicators, status indicators. Durante geração AI, mostrar progresso passo a passo (ex.: "Analyzing thread ✓ / Understanding intent ✓ / Drafting response ●").

## 35. Error Handling
Estados claros para: falha de conexão Gmail, falha de API, falha de LLM, timeout, rate limit, resposta inválida, falha de sync. Nunca mostrar erros técnicos crus ao utilizador.

## 36. Acessibilidade
Navegação por teclado, focus states, ARIA labels, contraste, screen reader support, reduced motion, atalhos: C (compose), R (reply), A/E (archive), S (star), / (search), G+I (inbox).

## 37. Responsive Design
Desktop: experiência completa. Tablet: sidebar adaptada. Mobile: navegação inferior/drawer — realmente utilizável em mobile.

## 38. Performance
Server Components quando apropriado, lazy loading, code splitting, virtualization para listas grandes, caching, pagination, debounced search, otimização de imagens, evitar re-renders desnecessários. Inbox rápida com milhares de emails.

## 39. Animações
Framer Motion de forma subtil (email entrando na lista, sidebar transitions, modal, AI panel, toast, status updates, command palette) — nunca por estética pura.

## 40. Command Palette
⌘K com: Search emails, Compose email, Ask AI, Open tasks, Open briefing, Archive selected, Mark as read.

## 41. Compose Email
Campos To/Cc/Bcc/Subject/Message. AI actions: Improve writing, Make shorter, Make more professional, Make friendlier, Translate, Continue writing. Autosave de drafts.

## 42. AI Compose
Gerar email completo a partir de instrução livre (ex.: "Write an email about: rescheduling tomorrow's meeting"). Utilizador sempre pode editar antes de enviar.

## 43. Notifications
Ex.: "AI found 3 urgent emails.", "Meeting detected tomorrow.", "Your draft is ready.", "Email sync completed."

## 44. Settings
Account, Connected accounts (Gmail/Outlook), AI (modelo/comportamento/privacidade), Notifications, Appearance (Light/Dark/System), Keyboard shortcuts.

## 45. Dark Mode
Desenhado cuidadosamente (não apenas inverter cores) — contraste, hierarquia, estados, borders, hover, focus.

## 46. Empty States
Elegantes, ex.: "You're all caught up. No emails need your attention. ✨ Enjoy the quiet."

## 47. Demo Mode
Não depender exclusivamente de Gmail real para demonstrar a app. Emails fictícios realistas — recrutador consegue explorar sem conectar conta real.

## 48. Seed Data
Dataset fictício: emails, threads, attachments, labels, tasks, meetings, AI analyses — realista mas sem informação pessoal real.

## 49. Testes
Unit (email parsing, categorization, priority calculation, AI output validation), Integration (auth, DB, email sync, AI tools), E2E (login → inbox → abrir email → resumir com AI → gerar reply → editar → salvar draft).

## 50. Observability
Logging estruturado: AI latency, token usage, failed tool calls, email sync, API errors. Nunca guardar conteúdo sensível desnecessário em logs.

## 51. AI Cost Control
Limitar contexto, cache de análises, modelos pequenos para classificação, modelos grandes só para tarefas complexas, evitar chamadas duplicadas, controlar token budget.

## 52. AI Model Routing
Classificação simples → modelo pequeno/barato. Resumo de email → modelo médio. Raciocínio complexo → modelo avançado. Provider/modelo configurável.

## 53. Design System (componentes)
Button, Input, Avatar, Badge, Tooltip, Modal, Drawer, Dropdown, Tabs, Toast, CommandPalette, EmailList, EmailRow, EmailThread, AIMessage, AIInsight, AIAction, TaskCard, Sidebar, Topbar.

## 54. Component Architecture
```
components/
├── ui/
├── email/
├── ai/
├── dashboard/
├── tasks/
├── calendar/
└── layout/
```
Separar UI, business logic, data access, AI logic.

## 55. Project Structure
```
src/
├── app/
├── components/
├── lib/
│   ├── ai/
│   ├── auth/
│   ├── email/
│   ├── db/
│   ├── search/
│   └── utils/
├── server/
├── hooks/
├── types/
└── config/
```
Não colocar toda a lógica dentro de componentes React.

## 56. Development Strategy — Fases
- **Phase 1 — Foundation**: Next.js, TypeScript, Tailwind, design system, authentication, database, layout.
- **Phase 2 — Email**: demo emails, inbox, email detail, threads, search, labels, compose.
- **Phase 3 — Gmail**: OAuth, Gmail API, synchronization, send, drafts.
- **Phase 4 — AI**: summarization, categorization, priority, reply generation, AI assistant.
- **Phase 5 — AI Agents**: tool calling, actions, task creation, intelligent search, confirmation flows.
- **Phase 6 — Advanced**: semantic search, RAG, daily briefing, calendar intelligence, model routing.
- **Phase 7 — Polish**: animations, responsive, accessibility, performance, tests, security, error handling.
- **Phase 8 — Portfolio**: landing page, demo mode, screenshots, documentation, architecture diagram, case study.

**Regra do utilizador**: começar pela Phase 1. Após cada fase, verificar qualidade do código, testar a aplicação, e só então avançar. Sinalizar quando for o momento de passar o trabalho para o Claude Code.

## 57. MVP (se o projeto ficar demasiado grande)
Authentication, Demo inbox, Email detail, Search, AI summary, AI reply, AI categorization, AI priority, AI chat, Draft system. Gmail e funcionalidades avançadas depois.

## 58. Regras de Implementação
Não criar código desnecessário; não duplicar lógica; TypeScript strict; evitar `any` sem justificação; validar dados externos; nunca confiar no output do LLM sem validação; usar Zod para outputs estruturados; separar server/client logic; não expor secrets; não colocar API keys no frontend; componentes reutilizáveis; manter acessibilidade e performance; código legível; documentar decisões arquiteturais importantes.

## 59. Comportamento do LLM
Nunca assumir que o LLM está correto. Pipeline: LLM → Schema validation → Business rules → Permission check → Tool execution. Nunca LLM → Database diretamente sem validação.

## 60. Qualidade do Produto
Prioridade: 1) UX, 2) qualidade visual, 3) qualidade técnica, 4) AI integration, 5) performance, 6) segurança, 7) documentação. Resultado deve parecer "uma startup de AI poderia lançar isto", não "um estudante seguiu um tutorial".

## 61. Portfolio Case Study
Documentar no final: Problem, Solution, Architecture (diagrama), AI Architecture (LLM, tool calling, structured outputs, RAG, model routing), Challenges, Decisions, Results (métricas quando disponíveis).

## 62. README
Deve conter: descrição, Features, Tech Stack, Architecture, AI Architecture, Database, Security, Local Development, Environment Variables, Testing, Deployment, Future Improvements, Screenshots, Demo.

## 63. Resultado Final
Aparência premium, excelente UX, frontend moderno, arquitetura full-stack, IA real integrada (AI Agent, tool calling), integração de email, database, auth, segurança, responsive, dark mode, demo mode, documentação. Objetivo: experiência extremamente bem executada, não a maior quantidade de funcionalidades.

## 64. Regra Final (checklist antes de implementar qualquer feature)
- Product Designer: "Isso melhora realmente a experiência?"
- Frontend Engineer: "Isso é rápido, acessível e reutilizável?"
- Backend Engineer: "Isso é seguro e escalável?"
- AI Engineer: "É realmente necessário usar um LLM aqui?"
- Security Engineer: "O que acontece se o utilizador ou o email for malicioso?"
- Portfolio Reviewer: "Esta funcionalidade demonstra uma competência que vale a pena mostrar?"

Só implementar funcionalidades com razão clara.

---

## Decisões de execução (Fase 1, 2026-09-04)

- **ORM escolhido**: Drizzle (leve, type-safe, boa integração com Next.js serverless/edge e com o ecossistema AI SDK).
- **Auth**: Auth.js (NextAuth) v5 — Credentials provider para demo/login na Fase 1; Google provider real entra na Fase 3 junto com Gmail API.
- **Banco de dados (Fase 1)**: PostgreSQL 16 **nativo** no ambiente de desenvolvimento (o Docker Hub não estava acessível a partir do sandbox onde a Fase 1 foi construída — `docker pull postgres` falhou com 403; instalado via `apt`). `DATABASE_URL` é trocável para produção (Neon/Supabase/Railway) sem mudança de código — se preferir Docker localmente, `docker run -e POSTGRES_USER=mailmind -e POSTGRES_PASSWORD=... -e POSTGRES_DB=mailmind -p 5432:5432 postgres:16-alpine` funciona normalmente fora deste sandbox.
- **Design system**: o CLI `shadcn` (`ui.shadcn.com`) também não estava acessível a partir do sandbox; os componentes em `src/components/ui/` foram escritos manualmente seguindo as mesmas convenções (Radix + CVA + `cn()`). `pnpm dlx shadcn@latest add <componente>` deve funcionar normalmente para adicionar novos componentes num ambiente com acesso à internet padrão.
- **Entrega do código**: o plano original era push direto para o repositório GitHub via Personal Access Token fornecido pelo utilizador. O sandbox onde a Fase 1 foi construída tem um proxy de rede próprio que intercepta e reautentica todo o tráfego para `github.com`, e recusou o push porque o repositório `IA-EMAIL-MANAGER` não estava na "authorized repository set" da sessão — o token pessoal foi ignorado independentemente de estar correto. Entrega passou a ser **.zip por fase**, entregue diretamente na conversa; o utilizador decide quando/como publicar no GitHub.
- **Gatilho de handoff para Claude Code**: sinalizar explicitamente ao utilizador quando for o ponto ideal para continuar o desenvolvimento localmente via Claude Code CLI — nomeadamente assim que o código estiver num repositório local/GitHub e a Fase 1 estiver validada (é o caso a partir de agora).
