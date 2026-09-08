# Checklist de deploy — passos que precisam das tuas contas

Tudo o que era código, config e documentação está feito e commitado. Falta
o que exige contas tuas (Neon, Vercel, Google Cloud Console). São ~20
minutos.

Depois de teres o URL de produção, avisa — falta substituir
`DEMO_URL_A_PREENCHER` no `README.md` e no `CASE_STUDY.md`, e correr a
verificação final do Demo Mode contra produção.

---

## 1. Base de dados — Neon (~5 min)

1. Criar conta em [neon.tech](https://neon.tech) (tier gratuito, sem cartão).
2. **Create project** → região Europa (`eu-central-1` ou `eu-west-2`, mais
   perto do que a dos EUA para o teu tempo de resposta).
3. Copiar a connection string **com pooling** — o host tem `-pooler` no
   meio. Está em *Connection Details → Pooled connection*. É importante:
   sem pooling, as funções serverless esgotam as ligações.

   Fica com o aspeto:
   `postgresql://user:pass@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`

4. Correr as migrações e o seed **a partir daqui**, com o `DATABASE_URL` no
   comando (a variável do shell tem precedência sobre o `.env.local`, já
   confirmado):

   ```bash
   cd ~/Desktop/EMAIL-IA/mailmind
   DATABASE_URL="cola-aqui-a-string-com-pooler" pnpm db:migrate
   DATABASE_URL="cola-aqui-a-string-com-pooler" pnpm db:seed
   ```

   A primeira migração cria a extensão `vector` sozinha — não é preciso
   ativar nada no dashboard do Neon.

   **Esperado**: `migrations applied successfully` e depois
   `5 labels, 20 threads, 24 emails.`

---

## 2. Vercel (~5 min)

1. Criar conta em [vercel.com](https://vercel.com) com o GitHub.
2. **Add New → Project** → importar `JoviNatalli/IA-EMAIL-MANAGER`, branch
   `main`. O Next.js é detetado sozinho; não mexer em build settings.
3. **Antes de fazer deploy**, em *Environment Variables*, colar estas seis
   (Production + Preview):

   | Nome | Valor |
   | --- | --- |
   | `DATABASE_URL` | A string com `-pooler` do passo 1 |
   | `AUTH_SECRET` | Correr `npx auth secret` e colar — **novo**, não o do `.env.local` |
   | `AUTH_GOOGLE_ID` | O mesmo do `.env.local` |
   | `AUTH_GOOGLE_SECRET` | O mesmo do `.env.local` |
   | `GOOGLE_GENERATIVE_AI_API_KEY` | O mesmo do `.env.local` |
   | `AI_DEFAULT_PROVIDER` | `google` |

4. **Deploy**. No fim ficas com um URL tipo
   `https://ia-email-manager.vercel.app`.
5. Voltar a *Environment Variables* e acrescentar a sétima, agora que sabes
   o domínio, e **fazer redeploy**:

   | `NEXT_PUBLIC_APP_URL` | `https://<o-teu-domínio>` (sem barra no fim) |

   > Esta é usada para construir o redirect URI do Calendar. Sem ela, o
   > fluxo do calendário aponta para `localhost` em produção.

---

## 3. Google Cloud Console (~5 min)

**Não é o ecrã de ativar APIs** — é o do cliente OAuth. Foi exatamente esta
confusão que já custou um `redirect_uri_mismatch` neste projeto.

1. [console.cloud.google.com](https://console.cloud.google.com) → projeto
   **MailMind** → *Google Auth Platform → Clientes* → abrir o cliente
   **Web application** (o que começa por `1023653557563-`).
2. Em **URIs de redirecionamento autorizados**, clicar *Adicionar URI*
   **duas vezes** e colar (mantendo os de `localhost` que já lá estão):

   ```
   https://<o-teu-domínio>/api/auth/callback/google
   https://<o-teu-domínio>/api/google/calendar/callback
   ```

3. **Salvar**. Pode demorar de 5 minutos a algumas horas a propagar — a
   própria consola avisa disso.

> Isto só é preciso para o login com Google e o Calendar. O **Demo Mode
> funciona sem este passo**, e é o caminho que o link público demonstra.

---

## 4. Verificação (faço eu, assim que me deres o URL)

- Demo Mode ponta a ponta numa janela anónima, contra a base de dados de
  produção: entrar sem conta, AI Insights, gerador de resposta, agente com
  confirmação, pesquisa semântica.
- Substituir `DEMO_URL_A_PREENCHER` no `README.md` e `CASE_STUDY.md`.
- Registar o URL e a data em `docs/status.md`, e fechar a Fase 8.

---

## Se alguma coisa correr mal

| Sintoma | Causa provável |
| --- | --- |
| Build falha com `DATABASE_URL não está definida` | Falta a variável no Vercel, ou não foi marcada para o ambiente certo |
| `prepared statement "s1" does not exist` | Estás a usar a connection string **sem** `-pooler` |
| Login Google dá `redirect_uri_mismatch` | Passo 3 em falta, ou ainda a propagar |
| Fluxo do Calendar redireciona para `localhost` | Falta `NEXT_PUBLIC_APP_URL`, ou faltou o redeploy depois de a acrescentar |
| A app carrega mas a inbox está vazia | O `pnpm db:seed` do passo 1 não correu contra a base de produção |
| Primeiro pedido muito lento | Normal — o tier gratuito do Neon suspende a base por inatividade |
