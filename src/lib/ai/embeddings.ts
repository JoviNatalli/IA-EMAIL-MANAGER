/**
 * Embeddings (Fase 6, spec §27).
 *
 * Vive FORA da interface `AIProvider` de propósito: nem o SDK da Anthropic
 * nem o `@google/genai` expõem embeddings pela mesma porta por onde passam
 * as conversas, e enfiar `embed()` no `AIProvider` obrigaria a Anthropic a
 * declarar uma capacidade que não tem. Aqui é uma chamada REST direta à
 * Gemini API, com o mesmo tratamento de erros do resto da casa (§35).
 *
 * Modelo FIXO, nunca um alias: a Fase 4 já ensinou que os aliases "-latest"
 * mudam de geração — e de quota — sem aviso. Trocar de modelo de embedding
 * invalida todos os vetores já gravados (por isso o modelo fica registado em
 * cada linha de `email_embedding`).
 */
import { AIError, AIProviderNotConfiguredError } from "./errors";

/** `gemini-embedding-001`: estável, com tier gratuito confirmado em 2026-09-07. */
export const EMBEDDING_MODEL = "gemini-embedding-001";

/**
 * 768 e não as 3072 por omissão: os índices do pgvector não aceitam vetores
 * tão largos, e a qualidade que se perde a truncar (o modelo é treinado com
 * Matryoshka) não se nota a esta escala de dados.
 */
export const EMBEDDING_DIMENSIONS = 768;

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * O Gemini afina o vetor conforme o uso: o mesmo texto indexado e
 * pesquisado tem representações diferentes de propósito. Usar o task type
 * errado degrada a pesquisa em silêncio.
 */
export type EmbeddingTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

interface EmbedResponse {
  embeddings?: { values: number[] }[];
  embedding?: { values: number[] };
  error?: { message?: string; status?: string };
}

function requireApiKey(): string {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new AIProviderNotConfiguredError("google");
  return key;
}

/**
 * Normaliza para norma 1. Ao truncar de 3072 para 768 o vetor deixa de vir
 * normalizado, e a distância de cosseno do pgvector conta com isso.
 */
function normalize(values: number[]): number[] {
  const norm = Math.hypot(...values);
  if (!norm || !Number.isFinite(norm)) {
    throw new AIError("Embedding devolvido pelo Gemini é inválido (norma zero).", {
      userMessage: "Não foi possível preparar a pesquisa semântica. Tente novamente.",
    });
  }
  return values.map((value) => value / norm);
}

function mapEmbeddingError(status: number, message: string): AIError {
  if (status === 429) {
    return new AIError(`Rate limit nos embeddings do Gemini: ${message}`, {
      userMessage: "A indexação está a atingir o limite do plano gratuito. Tente novamente daqui a pouco.",
    });
  }
  if (status === 400 && /API_KEY_INVALID|API key not valid/i.test(message)) {
    return new AIError("Chave de API do Google inválida (embeddings).", {
      userMessage: "A pesquisa semântica não está disponível (credenciais inválidas).",
    });
  }
  if (status >= 500) {
    return new AIError(`Servidor de embeddings indisponível (${status}): ${message}`, {
      userMessage: "O serviço de pesquisa semântica está indisponível de momento. Tente novamente.",
    });
  }
  return new AIError(`Erro nos embeddings do Gemini (${status}): ${message}`, {
    userMessage: "Não foi possível preparar a pesquisa semântica. Tente novamente.",
  });
}

/** Limite da API por pedido em lote. */
const MAX_BATCH = 100;

/**
 * Gera embeddings para vários textos de uma vez.
 *
 * Uma chamada em lote por cada 100 textos — indexar email a email gastaria a
 * quota diária do plano gratuito muito antes de a caixa estar toda indexada.
 */
export async function embedTexts(texts: string[], task: EmbeddingTask): Promise<number[][]> {
  if (texts.length === 0) return [];
  const key = requireApiKey();
  const out: number[][] = [];

  for (let start = 0; start < texts.length; start += MAX_BATCH) {
    const slice = texts.slice(start, start + MAX_BATCH);
    // A chave vai em CABEÇALHO, nunca em `?key=` na query string (Fase 7,
    // §30). A Gemini API aceita as duas formas, mas um URL com a chave
    // acaba em sítios que não controlamos: mensagens de erro do `fetch`
    // (que citam o URL), stack traces e qualquer `console.error` que
    // registe o erro em bruto — e aí a chave fica escrita nos logs.
    const response = await fetch(`${ENDPOINT}/${EMBEDDING_MODEL}:batchEmbedContents`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        requests: slice.map((text) => ({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
          taskType: task,
          outputDimensionality: EMBEDDING_DIMENSIONS,
        })),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as EmbedResponse;
    if (!response.ok || payload.error) {
      throw mapEmbeddingError(response.status, payload.error?.message ?? "resposta inesperada");
    }

    const embeddings = payload.embeddings ?? [];
    if (embeddings.length !== slice.length) {
      throw new AIError(
        `O Gemini devolveu ${embeddings.length} embeddings para ${slice.length} textos.`,
        { userMessage: "Não foi possível preparar a pesquisa semântica. Tente novamente." },
      );
    }

    for (const item of embeddings) {
      if (!Array.isArray(item.values) || item.values.length !== EMBEDDING_DIMENSIONS) {
        throw new AIError("Embedding com dimensão inesperada.", {
          userMessage: "Não foi possível preparar a pesquisa semântica. Tente novamente.",
        });
      }
      out.push(normalize(item.values));
    }
  }

  return out;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text], "RETRIEVAL_QUERY");
  return embedding;
}
