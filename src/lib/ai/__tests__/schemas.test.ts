/**
 * Unit — structured outputs de IA (spec §22/§23/§58). Simula respostas de
 * LLM (boas e más) e verifica que a validação Zod aceita/rejeita como
 * esperado. Nunca confiar no output do LLM sem isto passar primeiro.
 */
import { describe, expect, it } from "vitest";

import {
  composeActionResultSchema,
  emailClassificationSchema,
  emailSummarySchema,
  quickRepliesSchema,
  replyDraftSchema,
} from "../schemas";

describe("emailClassificationSchema", () => {
  it("aceita uma classificação válida", () => {
    const result = emailClassificationSchema.safeParse({
      category: "finance",
      priority: "high",
      requiresReply: true,
      intent: "Pedido de pagamento em atraso",
      sentiment: "negative",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita uma categoria fora do enum permitido (nunca texto livre)", () => {
    const result = emailClassificationSchema.safeParse({
      category: "spam-inventado",
      priority: "high",
      requiresReply: true,
      intent: "x",
      sentiment: "negative",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita uma prioridade que não seja low/medium/high (nunca a fórmula interna)", () => {
    const result = emailClassificationSchema.safeParse({
      category: "work",
      priority: "urgent-9.5",
      requiresReply: true,
      intent: "x",
      sentiment: "neutral",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita quando falta um campo obrigatório", () => {
    const result = emailClassificationSchema.safeParse({
      category: "work",
      priority: "low",
      // requiresReply em falta
      intent: "x",
      sentiment: "neutral",
    });
    expect(result.success).toBe(false);
  });
});

describe("emailSummarySchema", () => {
  it("aceita hasEnoughInformation=false sem summary detalhado (nunca inventar — spec §13)", () => {
    const result = emailSummarySchema.safeParse({
      hasEnoughInformation: false,
      summary: "Não há informação suficiente para resumir esta conversa.",
      keyPoints: [],
      suggestedAction: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejeita mais de 5 keyPoints", () => {
    const result = emailSummarySchema.safeParse({
      hasEnoughInformation: true,
      summary: "resumo",
      keyPoints: ["1", "2", "3", "4", "5", "6"],
      suggestedAction: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("quickRepliesSchema", () => {
  it("rejeita mais de 3 sugestões", () => {
    const result = quickRepliesSchema.safeParse({ replies: ["a", "b", "c", "d"] });
    expect(result.success).toBe(false);
  });

  it("rejeita zero sugestões", () => {
    const result = quickRepliesSchema.safeParse({ replies: [] });
    expect(result.success).toBe(false);
  });
});

describe("replyDraftSchema / composeActionResultSchema", () => {
  it("aceita um corpo de resposta simples", () => {
    expect(replyDraftSchema.safeParse({ body: "Obrigado, confirmo a reunião." }).success).toBe(true);
  });

  it("rejeita objeto sem o campo `text`", () => {
    expect(composeActionResultSchema.safeParse({ result: "abc" }).success).toBe(false);
  });
});
