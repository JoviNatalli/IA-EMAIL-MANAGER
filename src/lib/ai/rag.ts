/**
 * RAG (Fase 6, spec §27) — a resposta em linguagem natural por cima dos
 * emails que a pesquisa semântica encontrou.
 *
 * Isto é o que finalmente dá consumidor ao `provider.streamText`, que ficou
 * órfão quando a Fase 5 substituiu o chat da Fase 4 pelo agente: aqui o
 * streaming faz sentido outra vez, porque é texto corrido e não um objeto
 * que precisa de estar completo para ser validado.
 */
import "server-only";

import { getAIProvider } from "./provider";
import { buildRagPrompt } from "./prompts";
import { describePassages, type SemanticPassage } from "@/lib/search/semantic";

/** Contexto enviado ao modelo — teto de custo (§51) e de ruído. */
const MAX_PASSAGES = 5;
const MAX_CHARS_PER_PASSAGE = 1200;

/**
 * Responde à pergunta com base nas passagens recuperadas.
 *
 * Sem passagens não há chamada ao modelo: uma resposta gerada sem contexto
 * seria exatamente a invenção que o §13 proíbe, e gastaria quota para dizer
 * "não sei". Quem chama trata o array vazio como "sem resultados".
 */
export async function* streamRagAnswer(
  userId: string,
  question: string,
  passages: SemanticPassage[],
): AsyncGenerator<string, void, void> {
  if (passages.length === 0) return;

  const described = await describePassages(userId, passages.slice(0, MAX_PASSAGES));
  if (described.length === 0) return;

  const provider = getAIProvider();
  const { system, messages } = buildRagPrompt(
    question,
    described.map(({ passage, subject, from }) => ({
      subject,
      from,
      content: passage.content.slice(0, MAX_CHARS_PER_PASSAGE),
    })),
  );

  yield* provider.streamText({ tier: "summarize", system, messages, maxTokens: 1024 });
}
