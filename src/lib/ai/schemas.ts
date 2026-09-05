/**
 * Structured outputs de IA (spec §22/§23/§58) — toda resposta de IA que vira
 * dado estruturado passa por um destes schemas Zod antes de tocar em UI ou
 * base de dados. Nunca parsear texto livre à mão.
 */
import { z } from "zod";

// Categorias (spec §22) — conjunto próprio da análise de IA, distinto do
// `threadCategoryEnum` legado do seed da Fase 2 (ver nota em `schema.ts`).
export const AI_CATEGORIES = [
  "work",
  "personal",
  "finance",
  "shopping",
  "social",
  "newsletter",
  "meetings",
  "important",
  "promotional",
] as const;

export const AI_PRIORITIES = ["low", "medium", "high"] as const;
export const AI_SENTIMENTS = ["positive", "neutral", "negative"] as const;

/**
 * Categorização + prioridade (spec §22/§23): `{category, priority,
 * requires_reply, intent, sentiment}`. A fórmula interna de prioridade
 * nunca é exposta — o LLM devolve diretamente High/Medium/Low, não os
 * fatores que a compõem.
 */
export const emailClassificationSchema = z.object({
  category: z.enum(AI_CATEGORIES),
  priority: z.enum(AI_PRIORITIES),
  requiresReply: z.boolean(),
  intent: z.string().max(200).describe("Uma frase curta a descrever a intenção do email."),
  sentiment: z.enum(AI_SENTIMENTS),
});
export type EmailClassification = z.infer<typeof emailClassificationSchema>;

/**
 * AI Summary (spec §13) — `hasEnoughInformation: false` é a forma explícita
 * de dizer "não invento": usada quando a thread não tem corpo de texto
 * suficiente para resumir com confiança.
 */
export const emailSummarySchema = z.object({
  hasEnoughInformation: z.boolean(),
  summary: z.string().max(600),
  keyPoints: z.array(z.string().max(160)).max(5),
  suggestedAction: z.string().max(200).nullable(),
});
export type EmailSummary = z.infer<typeof emailSummarySchema>;

// Tom (spec §14) e comprimento da resposta gerada.
export const REPLY_TONES = ["professional", "friendly", "concise", "formal", "casual", "empathetic"] as const;
export const REPLY_LENGTHS = ["short", "medium", "detailed"] as const;
export type ReplyTone = (typeof REPLY_TONES)[number];
export type ReplyLength = (typeof REPLY_LENGTHS)[number];

/** AI Reply Generator (spec §14) — resposta dentro de uma thread existente. */
export const replyDraftSchema = z.object({
  body: z.string().max(6000),
});
export type ReplyDraft = z.infer<typeof replyDraftSchema>;

/** Smart Reply (spec §15) — sugestões curtas, prontas a enviar sem edição. */
export const quickRepliesSchema = z.object({
  replies: z.array(z.string().max(120)).min(1).max(3),
});
export type QuickReplies = z.infer<typeof quickRepliesSchema>;

/** AI Compose (spec §42) — email novo gerado a partir de instrução livre. */
export const emailDraftSchema = z.object({
  subject: z.string().max(150),
  body: z.string().max(6000),
});
export type EmailDraft = z.infer<typeof emailDraftSchema>;

// AI Compose actions (spec §41/§42) sobre um texto já escrito.
export const COMPOSE_ACTIONS = [
  "improve",
  "shorten",
  "professional",
  "friendlier",
  "translate",
  "continue",
] as const;
export type ComposeAction = (typeof COMPOSE_ACTIONS)[number];

export const composeActionResultSchema = z.object({
  text: z.string().max(8000),
});
export type ComposeActionResult = z.infer<typeof composeActionResultSchema>;
