# Nuvoly — case study

Um gestor de email com IA, construído do zero em oito fases. Este documento
é sobre o que correu mal e as decisões que isso obrigou a tomar — o que o
README não conta.

**Links**: [demo ao vivo](DEMO_URL_A_PREENCHER) (entrar com "Explorar demo
sem conta") · [README](./README.md) · [registo de execução por
fase](./docs/status.md)

---

## Problema

Uma caixa de correio profissional não sofre de falta de funcionalidades —
sofre de falta de julgamento. A pessoa abre 40 emails e tem de decidir, um a
um, o que é urgente, o que precisa de resposta, o que é ruído e o que
esconde uma tarefa com prazo. Isso é trabalho cognitivo que se repete todos
os dias e não deixa nada para trás.

A tentação óbvia é colar um chatbot ao lado da inbox. Não resolve: obriga a
descrever num campo de texto aquilo que já se está a ver no ecrã.

## Solução

O Nuvoly põe a IA **dentro** do fluxo de gerir email, não ao lado dele:

- a conversa aberta traz resumo, prioridade, intenção e ação sugerida —
  **quando o utilizador pede**, nunca em cada abertura;
- um copiloto que **age**: pesquisa, lê, arquiva, etiqueta, cria tarefas e
  eventos — e para, sempre, para pedir confirmação antes de qualquer ação
  sensível, mostrando a quantos itens toca;
- pesquisa por significado, não por palavras: "o cliente preocupado com o
  prazo" encontra o email certo mesmo sem nenhuma dessas palavras lá estar.

A regra que atravessa tudo: **nunca fingir uma capacidade**. Se a IA não
tem informação suficiente, diz-o. Se um evento ficou só na app e não foi
para o Google, a UI diz isso. Se o rate limiting não funciona em serverless,
está escrito no README.

## Arquitetura

Next.js 16 (App Router) com TypeScript strict, Drizzle sobre PostgreSQL com
pgvector, Auth.js v5, e uma camada de abstração própria sobre os SDKs de IA.
Diagramas e detalhe em [README → Arquitetura](./README.md#arquitetura).

Três decisões estruturais:

**O LLM nunca fala com a base de dados.** Devolve o nome de uma ferramenta e
um objeto de argumentos, e isso é tratado como input hostil: validação Zod →
regras de negócio → verificação de posse por `userId` → decisão de
confirmação → execução. As ferramentas que escrevem reutilizam as Server
Actions já existentes, herdando ownership e a propagação para o Gmail, em
vez de duplicarem essa lógica — duplicar era a forma mais fácil de abrir um
buraco entre o que a UI faz e o que o agente faz.

**Conteúdo de email é sempre não confiável.** Vai para o modelo dentro de
blocos `<EMAIL_CONTENT>`/`<TOOL_RESULTS>` com os delimitadores internos
neutralizados. Sem isso, um email com `</EMAIL_CONTENT>` no corpo consegue
sair do bloco de dados e passar por instrução — foi um buraco real,
encontrado e fechado na Fase 5, e tem teste dedicado.

**Provider de IA trocável por variável de ambiente.** A app nunca importa o
SDK de um provider diretamente. Anthropic e Google estão implementados;
trocar não exige tocar em lógica de negócio.

## Arquitetura de IA

O pipeline do agente e o de RAG estão desenhados em
[README → Arquitetura de IA](./README.md#arquitetura-de-ia). O que interessa
aqui é o **porquê** de duas escolhas:

**Embeddings vivem fora da abstração de provider.** A Anthropic não tem
embeddings. Obrigá-la a declarar `embed()` na interface seria criar uma
capacidade a fingir — exatamente o que a app promete não fazer.

**A pesquisa vetorial tem dois cortes de relevância, não um.** Uma pesquisa
vetorial devolve **sempre** os K mais próximos, mesmo quando nada é
relevante: perguntar por "receitas de bolo de chocolate" a uma caixa de
trabalho devolvia, com toda a confiança, os oito emails menos irrelevantes.
Há por isso um corte absoluto **e** um corte relativo ao melhor resultado —
porque a escala desliza com a pergunta: uma pergunta vaga baixa todas as
semelhanças. Ambos os valores saíram de medição, não de intuição.

## Desafios

Seis problemas reais que mudaram o desenho do produto.

### 1. O Auth.js ligava a conta Google ao utilizador errado

A Fase 3 introduziu login com Google. No teste manual, entrar com uma conta
Google enquanto havia uma sessão de demonstração aberta **não criava um
utilizador novo** — associava a conta Google ao utilizador da sessão ativa.
Duas identidades diferentes a partilhar a mesma caixa de correio.

O comportamento é da biblioteca, não um bug do projeto, mas o resultado era
inaceitável. A correção força `signOut` antes de iniciar o fluxo Google,
sempre. Foi encontrado a testar à mão — nenhum teste automatizado o teria
apanhado, porque o cenário exige duas sessões em sequência.

### 2. Um alias de modelo mudou de geração e esgotou a quota a meio

O provider apontava para `gemini-flash-latest`, o que parecia sensato. A
meio da Fase 4 as chamadas começaram a falhar com `RESOURCE_EXHAUSTED`: o
alias tinha passado a apontar para um modelo mais recente cuja quota
gratuita é de **20 pedidos por dia**, e não os milhares do anterior.

Duas conclusões. Primeira: **nunca um alias**, sempre uma versão fixa — vale
para o modelo de conversa e para o de embeddings, onde trocar de versão
invalidaria silenciosamente todos os vetores já guardados. Segunda: a quota
gratuita é por modelo e por dia, o que transforma um 429 em duas coisas
muito diferentes — um limite por minuto que se resolve sozinho, ou um limite
diário que só se resolve amanhã. O provider passou a distinguir os dois e a
ter uma **cadeia de modelos por tarefa**: quando um esgota a quota diária,
passa ao seguinte em vez de deixar a app sem IA.

### 3. Respostas cortadas a meio, sem erro nenhum

O AI Chat cortava respostas a meio de uma frase. Sem exceção, sem 4xx: a
stream terminava normalmente.

A causa: os modelos Gemini 3.x pensam por omissão, e esses tokens de
raciocínio contam para o `maxOutputTokens`. Vimos 864 tokens de pensamento a
consumir um orçamento de 900 — sobrava quase nada para a resposta. Pior, o
caso silencioso: um JSON truncado falhava depois na validação Zod com um
erro que não explicava nada.

Corrigido em três frentes: desligar o *thinking* onde o modelo aceita,
reservar margem extra onde não aceita, e verificar explicitamente
`finishReason === "MAX_TOKENS"` — uma resposta cortada passou a dar erro em
vez de passar por válida.

Detalhe que valeu uma lição à parte: o campo que desliga o *thinking* é
rejeitado por alguns modelos com um 400, só por estar presente. A primeira
correção adivinhava quais pelo nome ("tem 'lite' no nome") e partiu-se assim
que a cadeia de fallback trouxe outro modelo. A versão final não adivinha:
marca em runtime qualquer modelo que recuse e repete o pedido sem a opção.

### 4. O pgvector que não existia na versão certa do Postgres

A Fase 6 precisava de pgvector. A base de dados de desenvolvimento corre em
PGlite, e a partir da versão 0.5 as extensões saíram do pacote principal:
`CREATE EXTENSION vector` falhava. A versão que ainda a trazia embutida é
PostgreSQL 17, e os dados existentes eram PostgreSQL 18 — descer de versão
significava apagar a base de dados.

Isso chegou a ser autorizado. Não foi preciso: existia um pacote que carrega
a extensão como plugin na versão nova. Resultado: PG18 mantido, pgvector a
funcionar, **zero perda de dados**.

A lição é sobre ordem de trabalho, não sobre Postgres — a saída óbvia e
destrutiva estava aprovada e teria funcionado; procurar mais um pouco antes
de a executar poupou a base de dados inteira.

### 5. Ativar a API não é registar o redirect URI

Ligar o Google Calendar falhava com `redirect_uri_mismatch`, mesmo com a
Calendar API já ativada e o URI aparentemente correto.

São **dois ecrãs diferentes** da Google Cloud Console: ativar a API na
*Library* e registar o redirect URI no *cliente OAuth*, em *Credentials*. O
cliente só tinha o URI do login; faltava o do calendário. Erro de
configuração que se apresenta exatamente como um bug de código, e por isso
está documentado no README — vai voltar a acontecer no deploy de produção,
que precisa dos seus próprios URIs.

### 6. A chave de API a caminho dos logs

Na revisão de segurança da Fase 7, a chamada aos embeddings passava a chave
da API na query string (`?key=...`). Parece inofensivo — é o que a
documentação da Google mostra — mas mensagens de erro de rede citam o URL, e
qualquer `console.error` que registe o erro em bruto escreve a chave nos
logs.

Passou para um cabeçalho. Na mesma revisão apareceu a lacuna maior: **não
havia rate limiting nenhum** nas rotas de IA. Um cliente com sessão válida,
ou um bug de UI em loop, esgotava a quota diária do Gemini em segundos — o
que já tinha acontecido a testar o agente.

## Decisões

Decisões em que a opção mais fácil teria sido fingir que o problema não
existia.

**Implementar RAG só depois de provar que é preciso.** A especificação pedia
pesquisa semântica "apenas quando resolver um problema real, não para ter
RAG". Foi medida contra a pesquisa textual, com seis perguntas
deliberadamente parafraseadas — nenhuma usava as palavras dos emails. A
textual devolveu **zero resultados em todas as seis**; a semântica acertou
no primeiro lugar em todas. Uma sétima pergunta sem relação nenhuma
("receitas de bolo de chocolate") devolveu zero nos dois modos, que é o
corte de relevância a fazer o seu trabalho.

**Não virtualizar as listas.** A especificação pede virtualização para
listas grandes. Os números reais: a sincronização traz no máximo 30
conversas, e a maior caixa do projeto tem 30. Virtualizar 30 linhas seria
código morto com custo de manutenção permanente. Fica documentado o
patamar a partir do qual passa a valer a pena — e que o primeiro passo para
lá chegar é subir o limite da sincronização, não virtualizar.

**Debounce na pesquisa por palavras, não na semântica.** Assimetria
deliberada: a pesquisa textual é uma query local e pode correr enquanto se
escreve; cada pesquisa semântica gasta uma chamada de embeddings, e escrever
uma frase inteira com debounce esgotaria quota.

**Rate limiting que não sobrevive a serverless — dito em voz alta.** O
limitador é uma janela deslizante em memória. No Vercel, cada invocação pode
acordar numa instância nova, e o limitador trata-a como o primeiro pedido.
A alternativa era um Redis externo no caminho crítico de uma demonstração.
A decisão foi manter e **escrever a limitação no README**, não só num
documento interno: é a mesma regra de "não fingir uma capacidade que não
existe", aplicada a infraestrutura em vez de IA.

**O Demo Mode é o caminho principal, não o plano B.** O projeto Google
Cloud está em modo *Testing*, onde só test users autenticam. Sair disso
exigiria submeter a app a revisão da Google e passar a pedir acesso ao Gmail
real de desconhecidos. Em vez de esconder a limitação, o link público entra
em Demo Mode com um dataset fictício onde **todas** as funcionalidades de IA
funcionam.

**Não inventar números.** As métricas abaixo são todas verificáveis a correr
o projeto. Não há utilizadores, retenção nem "40% mais rápido" — este
projeto não tem essas coisas, e apresentá-las seria exatamente o que a app
promete que a IA nunca faz.

## Resultados

| | |
| --- | --- |
| Testes unitários | **71** (Vitest) |
| Testes E2E | **28** (Playwright, 3 suites) |
| Contraste WCAG | **44 pares medidos, 0 abaixo do mínimo** (eram 10 antes) |
| Pesquisa semântica vs. textual | **6/6** perguntas parafraseadas: textual 0 resultados, semântica acertou no topo |
| Ferramentas do agente | **21**, todas com schema Zod e política de confirmação |
| Fases entregues | **8**, cada uma com registo de decisões e do que ficou de fora |

**Acessibilidade medida, não estimada.** Escrevi um medidor de contraste
(OKLCH → sRGB → luminância relativa) para os pares cor/fundo reais da app.
Encontrou 10 abaixo do mínimo WCAG AA — todos em tema claro, o escuro estava
limpo. Iniciais de avatares a 2.84:1, ícones de estado do agente a 2.06:1.
Todos corrigidos; nova medição, zero falhas.

**Os testes de IA verificam um contrato, não uma resposta.** As chamadas ao
modelo acontecem no servidor, onde o Playwright não as consegue intercetar,
e mocká-las exigiria uma camada de injeção que só existiria para os testes.
Correm por isso contra o modelo real e verificam o que interessa: cada fluxo
acaba num resultado válido **ou** numa mensagem de erro em português —
nunca num ecrã partido, num erro técnico cru ou num spinner eterno. E a
invariante que mais importa: nenhum email sai do Inbox sem confirmação
explícita.

Um desses testes falhou na primeira execução — e **não era um bug**. O
agente procurou as newsletters, encontrou só uma na caixa de entrada e
perguntou em texto em vez de propor uma ação em massa. Comportamento
correto; o teste é que assumia duas ou mais. Foi reescrito para verificar a
invariante determinista em vez do fraseado do modelo.

## O que ficou por fazer

Por honestidade, e porque um projeto que se diz "completo" raramente é:

- **Outlook/Microsoft Graph** — a camada de acesso a email está abstraída
  para o permitir, mas só o Gmail está implementado
- **Anexos reais** do Gmail não são transferidos; a UI nunca finge tê-los
- **Emails em HTML** são sempre convertidos para texto simples
- **Conversas do agente não persistem** — o histórico perde-se ao recarregar
  a página (as ações pendentes, essas, ficam no servidor)
- **Lembretes não notificam** — são guardados, mas nada os dispara
- **Tokens não são cifrados em repouso**, ficam como o adapter do Auth.js os
  grava
- **Navegação mobile não foi testada em hardware real**, só em viewport
  emulado com os alvos de toque medidos

---

Código: [`JoviNatalli/IA-EMAIL-MANAGER`](https://github.com/JoviNatalli/IA-EMAIL-MANAGER)
