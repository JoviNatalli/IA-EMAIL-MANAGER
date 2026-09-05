/**
 * Camada de abstração de provider de IA (spec §4) — o resto da app nunca
 * importa `@anthropic-ai/sdk` diretamente, só este módulo. Trocar de
 * provider/modelo é mudar `getAIProvider()`, não reescrever `lib/ai/*` nem
 * as Server Actions que o consomem.
 *
 * Fase 4: só `AnthropicProvider` está implementado (decisão do utilizador —
 * ver docs/status.md). `OPENAI_API_KEY` e `GOOGLE_GENERATIVE_AI_API_KEY` já
 * existem em `.env.example` para quando outro provider for adicionado; até
 * lá, pedir qualquer um deles lança `AIProviderNotConfiguredError` em vez de
 * simular uma resposta — nunca fabricar uma capacidade de IA que não existe.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

import { AIError, AIProviderNotConfiguredError } from "./errors";
import { resolveModel, type AITaskTier } from "./models";

export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateObjectParams<T> {
  tier: AITaskTier;
  /** Instruções de sistema — nunca conteúdo de email (spec §31). */
  system: string;
  messages: AIChatMessage[];
  schema: z.ZodType<T>;
  maxTokens?: number;
}

export interface StreamTextParams {
  tier: AITaskTier;
  system: string;
  messages: AIChatMessage[];
  maxTokens?: number;
}

export interface AIProvider {
  readonly name: string;
  /** Structured output validado — nunca texto livre parseado à mão (spec §22/§58). */
  generateObject<T>(params: GenerateObjectParams<T>): Promise<T>;
  /** Streaming de texto para a AI Chat (spec §25, §34). */
  streamText(params: StreamTextParams): AsyncGenerator<string, void, void>;
}

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
  return new AIError("Erro desconhecido no provider de IA.", {
    userMessage: "Ocorreu um erro inesperado na IA. Tente novamente.",
    cause: error,
  });
}

class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateObject<T>({ tier, system, messages, schema, maxTokens = 4096 }: GenerateObjectParams<T>): Promise<T> {
    try {
      const response = await this.client.messages.parse({
        model: resolveModel(tier),
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
        model: resolveModel(tier),
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

  // OpenAI e Gemini: interface preparada (spec §4), implementação por fazer
  // quando um desses providers for o escolhido — nunca simular a resposta.
  throw new AIProviderNotConfiguredError(provider);
}
