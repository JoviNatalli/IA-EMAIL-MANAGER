/**
 * Camada de abstração de provider de IA (spec §4) — o resto da app nunca
 * importa `@anthropic-ai/sdk` nem `@google/genai` diretamente, só este
 * módulo. Trocar de provider/modelo é mudar `AI_DEFAULT_PROVIDER` no
 * ambiente, não reescrever `lib/ai/*` nem as Server Actions que o
 * consomem.
 *
 * Dois providers implementados: Anthropic e Google (Gemini). Ver
 * docs/status.md "Decisão de provider de IA" — Google é o ativo por
 * agora (tier gratuito, objetivo de custo zero de portfólio); Anthropic
 * fica pronto a reativar só mudando a env var, assim que houver crédito.
 * `OPENAI_API_KEY` já existe em `.env.example` para um terceiro provider
 * futuro; pedi-lo hoje lança `AIProviderNotConfiguredError` em vez de
 * simular uma resposta — nunca fabricar uma capacidade de IA que não existe.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ApiError as GoogleApiError, GoogleGenAI } from "@google/genai";
import { z, type ZodType } from "zod";

import { AIError, AIProviderNotConfiguredError } from "./errors";
import { resolveModel, type AITaskTier } from "./models";

export type AIProviderName = "anthropic" | "google";

export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateObjectParams<T> {
  tier: AITaskTier;
  /** Instruções de sistema — nunca conteúdo de email (spec §31). */
  system: string;
  messages: AIChatMessage[];
  schema: ZodType<T>;
  maxTokens?: number;
}

export interface StreamTextParams {
  tier: AITaskTier;
  system: string;
  messages: AIChatMessage[];
  maxTokens?: number;
}

export interface AIProvider {
  readonly name: AIProviderName;
  /** Structured output validado — nunca texto livre parseado à mão (spec §22/§58). */
  generateObject<T>(params: GenerateObjectParams<T>): Promise<T>;
  /** Streaming de texto para a AI Chat (spec §25, §34). */
  streamText(params: StreamTextParams): AsyncGenerator<string, void, void>;
}

// ── Anthropic ────────────────────────────────────────────────────────────

function mapAnthropicError(error: unknown): AIError {
  if (error instanceof Anthropic.AuthenticationError) {
    return new AIError("Chave de API da Anthropic inválida.", {
      userMessage: "A IA não está disponível de momento (credenciais inválidas). Tente mais tarde.",
      cause: error,
    });
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new AIError("Rate limit da Anthropic atingido.", {
      userMessage: "A IA está sobrecarregada de momento. Tente novamente daqui a pouco.",
      cause: error,
    });
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new AIError("Falha de ligação à Anthropic.", {
      userMessage: "Não foi possível contactar o serviço de IA. Verifique a sua ligação e tente novamente.",
      cause: error,
    });
  }
  if (error instanceof Anthropic.APIError) {
    return new AIError(`Erro da API Anthropic (${error.status}): ${error.message}`, {
      userMessage: "Ocorreu um erro ao falar com a IA. Tente novamente.",
      cause: error,
    });
  }
  if (error instanceof AIError) return error;
  return new AIError("Erro desconhecido no provider de IA (Anthropic).", {
    userMessage: "Ocorreu um erro inesperado na IA. Tente novamente.",
    cause: error,
  });
}

class AnthropicProvider implements AIProvider {
  readonly name = "anthropic" as const;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateObject<T>({ tier, system, messages, schema, maxTokens = 4096 }: GenerateObjectParams<T>): Promise<T> {
    try {
      const response = await this.client.messages.parse({
        model: resolveModel(this.name, tier),
        max_tokens: maxTokens,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        output_config: { format: zodOutputFormat(schema) },
      });

      if (response.parsed_output === null) {
        throw new AIError("A IA devolveu uma resposta que não passou a validação do schema.", {
          userMessage: "Não foi possível interpretar a resposta da IA. Tente novamente.",
        });
      }
      return response.parsed_output;
    } catch (error) {
      throw mapAnthropicError(error);
    }
  }

  async *streamText({ tier, system, messages, maxTokens = 2048 }: StreamTextParams): AsyncGenerator<string, void, void> {
    try {
      const stream = this.client.messages.stream({
        model: resolveModel(this.name, tier),
        max_tokens: maxTokens,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield event.delta.text;
        }
      }
      // Força o consumo completo do stream (erros de rede podem só surgir aqui).
      await stream.finalMessage();
    } catch (error) {
      throw mapAnthropicError(error);
    }
  }
}

// ── Google (Gemini) ─────────────────────────────────────────────────────

/**
 * A API do Gemini devolve erros como JSON *dentro* de `error.message`
 * (string), não como campos estruturados no objeto de erro — confirmado
 * empiricamente (`ApiError.message` é literalmente o corpo JSON da
 * resposta HTTP). Isto inclui o caso de chave inválida, que vem com
 * status HTTP 400 (não 401/403) e `reason: "API_KEY_INVALID"` lá dentro —
 * por isso nunca basta olhar para `status` sozinho.
 */
function parseGoogleErrorBody(message: string): { status?: string; reason?: string; quotaId?: string } {
  try {
    const parsed = JSON.parse(message) as {
      error?: {
        status?: string;
        details?: { reason?: string; violations?: { quotaId?: string }[] }[];
      };
    };
    const details = parsed.error?.details ?? [];
    return {
      status: parsed.error?.status,
      reason: details.find((d) => d.reason)?.reason,
      quotaId: details.flatMap((d) => d.violations ?? []).find((v) => v.quotaId)?.quotaId,
    };
  } catch {
    return {};
  }
}

function mapGoogleError(error: unknown): AIError {
  if (error instanceof GoogleApiError) {
    const { reason, quotaId } = parseGoogleErrorBody(error.message);

    if (error.status === 429 || reason === "RATE_LIMIT_EXCEEDED") {
      // A Gemini API usa o mesmo status 429/RESOURCE_EXHAUSTED tanto para
      // um limite por minuto (transitório) como por DIA (só se resolve
      // amanhã) — confirmado empiricamente que `quotaId` distingue os dois
      // (`GenerateRequestsPerDayPerProjectPerModel-FreeTier` vs. variantes
      // "PerMinute"). Nunca dizer "tente já a seguir" quando é diário.
      const isDailyQuota = quotaId?.includes("PerDay") ?? false;
      return new AIError(`Rate limit do tier gratuito do Gemini atingido (quotaId: ${quotaId ?? "desconhecido"}).`, {
        userMessage: isDailyQuota
          ? "Atingiu o limite diário gratuito da IA para este modelo. Tente novamente amanhã."
          : "A IA está sobrecarregada de momento (limite do plano gratuito). Tente novamente daqui a pouco.",
        cause: error,
      });
    }
    if (reason === "API_KEY_INVALID" || error.status === 401 || error.status === 403) {
      return new AIError("Chave de API do Google (Gemini) inválida.", {
        userMessage: "A IA não está disponível de momento (credenciais inválidas). Tente mais tarde.",
        cause: error,
      });
    }
    if (error.status >= 500) {
      return new AIError(`Erro do servidor Gemini (${error.status}).`, {
        userMessage: "O serviço de IA está indisponível de momento. Tente novamente.",
        cause: error,
      });
    }
    return new AIError(`Erro da API Gemini (${error.status}): ${error.message}`, {
      userMessage: "Ocorreu um erro ao falar com a IA. Tente novamente.",
      cause: error,
    });
  }
  if (error instanceof AIError) return error;
  return new AIError("Erro desconhecido no provider de IA (Google).", {
    userMessage: "Ocorreu um erro inesperado na IA. Tente novamente.",
    cause: error,
  });
}

function toGoogleContents(messages: AIChatMessage[]): { role: "user" | "model"; parts: { text: string }[] }[] {
  // Gemini usa "model" onde a nossa interface (e a Anthropic) usa "assistant".
  return messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
}

/**
 * `thinkingConfig` só é aceite pelos modelos "flash" completos — confirmado
 * empiricamente que `gemini-3.5-flash-lite` devolve 400 INVALID_ARGUMENT
 * só por o campo estar presente (mesmo com `thinkingBudget: 0`), enquanto
 * `gemini-3.5-flash` aceita-o normalmente. Detetar pelo nome do modelo em
 * vez de pela tier evita reintroduzir este 400 silenciosamente se o
 * routing mudar no futuro.
 */
function thinkingConfigFor(model: string): { thinkingConfig: { thinkingBudget: number } } | Record<string, never> {
  return model.includes("lite") ? {} : { thinkingConfig: { thinkingBudget: 0 } };
}

/**
 * Retry com backoff para 503 (UNAVAILABLE) e 429 (rate limit) — confirmado
 * empiricamente em 2026-09-05 que o tier gratuito do Gemini devolve 503
 * "high demand" de forma intermitente e transitória em `gemini-flash-latest`
 * (~1 em cada 3 pedidos numa amostra pequena, sem relação com o schema:
 * o mesmo pedido repetido teve sucesso logo a seguir). Sem isto, o
 * utilizador via um erro amigável mas real com bastante frequência para
 * algo que uma segunda tentativa resolve na maioria das vezes. Só 2
 * tentativas extra e backoff curto — nunca queremos mascarar uma falha
 * persistente atrás de retries longos.
 */
async function withGoogleRetry<T>(run: () => Promise<T>): Promise<T> {
  const maxAttempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const retryable = error instanceof GoogleApiError && (error.status === 503 || error.status === 429);
      if (!retryable || attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
  throw lastError;
}

class GoogleProvider implements AIProvider {
  readonly name = "google" as const;
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateObject<T>({ tier, system, messages, schema, maxTokens = 4096 }: GenerateObjectParams<T>): Promise<T> {
    try {
      const model = resolveModel(this.name, tier);
      const response = await withGoogleRetry(() =>
        this.client.models.generateContent({
          model,
          contents: toGoogleContents(messages),
          config: {
            systemInstruction: system,
            responseMimeType: "application/json",
            // JSON Schema puro (gerado do schema Zod original) — o SDK
            // aceita-o diretamente em `responseJsonSchema` desde a v1.9.0.
            responseJsonSchema: z.toJSONSchema(schema),
            maxOutputTokens: maxTokens,
            // Thinking desligado onde suportado (spec §51 — sem raciocínio
            // complexo nesta fase, controlar token budget). Confirmado
            // empiricamente que os modelos Gemini 3.x "flash" pensam por
            // default e consomem `maxOutputTokens` a fazê-lo (chegámos a
            // ver 613 tokens de "thinking" para 84 de resposta) — sem
            // isto, uma resposta podia ficar cortada a meio sem erro
            // nenhum. Ver `thinkingConfigFor` para o porquê do "lite".
            ...thinkingConfigFor(model),
          },
        }),
      );

      const text = response.text;
      if (!text) {
        throw new AIError("A IA (Gemini) devolveu uma resposta vazia.", {
          userMessage: "Não foi possível obter uma resposta da IA. Tente novamente.",
        });
      }

      // Nunca confiar cegamente no structured output, mesmo com schema
      // (spec §58) — validar sempre com o Zod original antes de devolver.
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch (parseError) {
        throw new AIError("A IA (Gemini) devolveu um JSON inválido.", {
          userMessage: "Não foi possível interpretar a resposta da IA. Tente novamente.",
          cause: parseError,
        });
      }

      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        throw new AIError(`A resposta da IA (Gemini) não passou a validação do schema: ${parsed.error.message}`, {
          userMessage: "Não foi possível interpretar a resposta da IA. Tente novamente.",
          cause: parsed.error,
        });
      }
      return parsed.data;
    } catch (error) {
      throw mapGoogleError(error);
    }
  }

  async *streamText({ tier, system, messages, maxTokens = 2048 }: StreamTextParams): AsyncGenerator<string, void, void> {
    try {
      // O retry só cobre o estabelecimento do stream (o pedido inicial);
      // uma falha a meio da iteração já não é seguro reenviar (podíamos
      // duplicar texto já entregue ao utilizador).
      const model = resolveModel(this.name, tier);
      const stream = await withGoogleRetry(() =>
        this.client.models.generateContentStream({
          model,
          contents: toGoogleContents(messages),
          config: { systemInstruction: system, maxOutputTokens: maxTokens, ...thinkingConfigFor(model) },
        }),
      );
      let finishReason: string | undefined;
      for await (const chunk of stream) {
        if (chunk.text) yield chunk.text;
        finishReason = chunk.candidates?.[0]?.finishReason;
      }
      // Defesa extra contra truncagem silenciosa (spec §35 — nunca deixar
      // parecer que a resposta terminou normalmente quando não terminou).
      if (finishReason === "MAX_TOKENS") {
        yield "\n\n[A resposta foi cortada por atingir o limite de tamanho.]";
      }
    } catch (error) {
      throw mapGoogleError(error);
    }
  }
}

// ── Resolução do provider ativo ─────────────────────────────────────────

let cachedProvider: AIProvider | null = null;

/** Lê `AI_DEFAULT_PROVIDER` do ambiente e devolve o provider correspondente já configurado. */
export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;

  const provider = process.env.AI_DEFAULT_PROVIDER || "anthropic";

  if (provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new AIProviderNotConfiguredError("anthropic");
    cachedProvider = new AnthropicProvider(apiKey);
    return cachedProvider;
  }

  if (provider === "google") {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new AIProviderNotConfiguredError("google");
    cachedProvider = new GoogleProvider(apiKey);
    return cachedProvider;
  }

  // OpenAI: interface preparada (spec §4), implementação por fazer quando
  // for o provider escolhido — nunca simular a resposta.
  throw new AIProviderNotConfiguredError(provider);
}
