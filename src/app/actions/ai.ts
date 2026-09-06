"use server";

/**
 * Server Actions de IA (Fase 4 — spec §12-27, §42, §51-59). Pipeline sempre:
 * carregar dados do próprio utilizador da BD (nunca confiar em conteúdo de
 * email vindo do cliente) → prompt → LLM → validação Zod → gravar/devolver.
 * Nenhuma ação aqui executa mudanças na inbox (enviar, apagar, mover) — só
 * lê e sugere; isso mantém-se assim até à Fase 5 (tool calling).
 */
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { aiAnalysis, emails, threads } from "@/lib/db/schema";
import { requireOwnThread, requireUserId } from "@/app/actions/emails";
import { AIError, AIProviderNotConfiguredError } from "@/lib/ai/errors";
import {
  buildClassificationPrompt,
  buildComposeActionPrompt,
  buildComposeDraftPrompt,
  buildQuickRepliesPrompt,
  buildReplyPrompt,
  buildSummaryPrompt,
  type ThreadMessageInput,
} from "@/lib/ai/prompts";
import { getAIProvider } from "@/lib/ai/provider";
import {
  composeActionResultSchema,
  emailClassificationSchema,
  emailDraftSchema,
  emailSummarySchema,
  quickRepliesSchema,
  replyDraftSchema,
  type ComposeAction,
  type ReplyLength,
  type ReplyTone,
} from "@/lib/ai/schemas";
import { resolveModel } from "@/lib/ai/models";
import { collectBriefingData, generateBriefingText } from "@/lib/ai/briefing";

function aiUserMessage(error: unknown, fallback: string): string {
  if (error instanceof AIError) return error.userMessage;
  return fallback;
}

async function loadThreadMessages(threadId: string): Promise<{ subject: string; messages: ThreadMessageInput[] }> {
  const thread = await db.query.threads.findFirst({ where: eq(threads.id, threadId) });
  if (!thread) throw new Error("Thread não encontrada.");
  const rows = await db
    .select({ fromName: emails.fromName, fromEmail: emails.fromEmail, bodyText: emails.bodyText, sentAt: emails.sentAt })
    .from(emails)
    .where(eq(emails.threadId, threadId))
    .orderBy(desc(emails.createdAt));
  return { subject: thread.subject, messages: rows.reverse() };
}

export interface ThreadAnalysis {
  category: string;
  priority: "low" | "medium" | "high";
  requiresReply: boolean;
  intent: string;
  sentiment: string;
  hasEnoughInformation: boolean;
  summary: string;
  keyPoints: string[];
  suggestedAction: string | null;
  updatedAt: Date;
}

/** Lê a análise já em cache (spec §51 — nunca recalcular sem pedido explícito). */
export async function getCachedAnalysis(threadId: string): Promise<ThreadAnalysis | null> {
  const userId = await requireUserId();
  await requireOwnThread(userId, threadId);
  const row = await db.query.aiAnalysis.findFirst({ where: eq(aiAnalysis.threadId, threadId) });
  if (!row) return null;
  return {
    category: row.category,
    priority: row.priority,
    requiresReply: row.requiresReply,
    intent: row.intent,
    sentiment: row.sentiment,
    hasEnoughInformation: row.hasEnoughInformation,
    summary: row.summary,
    keyPoints: row.keyPoints,
    suggestedAction: row.suggestedAction,
    updatedAt: row.updatedAt,
  };
}

/**
 * "Analisar com IA" — botão explícito no thread (nunca automático em cada
 * abertura, spec §51). Classificação (modelo pequeno) e resumo (modelo
 * médio) correm em paralelo — spec §52 model routing.
 */
export async function analyzeThread(threadId: string): Promise<ThreadAnalysis> {
  const userId = await requireUserId();
  await requireOwnThread(userId, threadId);
  const { subject, messages } = await loadThreadMessages(threadId);
  if (messages.length === 0) {
    throw new Error("Esta conversa não tem mensagens para analisar.");
  }

  try {
    const provider = getAIProvider();
    const [classification, summary] = await Promise.all([
      provider.generateObject({
        tier: "classify",
        ...buildClassificationPrompt(subject, messages),
        schema: emailClassificationSchema,
        maxTokens: 512,
      }),
      provider.generateObject({
        tier: "summarize",
        ...buildSummaryPrompt(subject, messages),
        schema: emailSummarySchema,
        maxTokens: 1024,
      }),
    ]);

    const now = new Date();
    await db
      .insert(aiAnalysis)
      .values({
        threadId,
        category: classification.category,
        priority: classification.priority,
        requiresReply: classification.requiresReply,
        intent: classification.intent,
        sentiment: classification.sentiment,
        hasEnoughInformation: summary.hasEnoughInformation,
        summary: summary.summary,
        keyPoints: summary.keyPoints,
        suggestedAction: summary.suggestedAction,
        model: resolveModel(provider.name, "summarize"),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: aiAnalysis.threadId,
        set: {
          category: classification.category,
          priority: classification.priority,
          requiresReply: classification.requiresReply,
          intent: classification.intent,
          sentiment: classification.sentiment,
          hasEnoughInformation: summary.hasEnoughInformation,
          summary: summary.summary,
          keyPoints: summary.keyPoints,
          suggestedAction: summary.suggestedAction,
          model: resolveModel(provider.name, "summarize"),
          updatedAt: now,
        },
      });

    revalidatePath("/app", "layout");

    return {
      category: classification.category,
      priority: classification.priority,
      requiresReply: classification.requiresReply,
      intent: classification.intent,
      sentiment: classification.sentiment,
      hasEnoughInformation: summary.hasEnoughInformation,
      summary: summary.summary,
      keyPoints: summary.keyPoints,
      suggestedAction: summary.suggestedAction,
      updatedAt: now,
    };
  } catch (error) {
    if (error instanceof AIProviderNotConfiguredError) throw new Error(error.userMessage);
    throw new Error(aiUserMessage(error, "Não foi possível analisar esta conversa com IA. Tente novamente."));
  }
}

/** AI Reply Generator (spec §14). */
export async function generateReply(
  threadId: string,
  options: { tone: ReplyTone; length: ReplyLength; instructions?: string },
): Promise<string> {
  const userId = await requireUserId();
  await requireOwnThread(userId, threadId);
  const { subject, messages } = await loadThreadMessages(threadId);
  if (messages.length === 0) throw new Error("Esta conversa não tem mensagens para responder.");

  const session = await auth();

  try {
    const provider = getAIProvider();
    const result = await provider.generateObject({
      tier: "compose",
      ...buildReplyPrompt(subject, messages, { ...options, userName: session?.user?.name ?? null }),
      schema: replyDraftSchema,
      maxTokens: 1024,
    });
    return result.body;
  } catch (error) {
    if (error instanceof AIProviderNotConfiguredError) throw new Error(error.userMessage);
    throw new Error(aiUserMessage(error, "Não foi possível gerar uma resposta com IA. Tente novamente."));
  }
}

/** Smart Reply / quick replies (spec §15). */
export async function getQuickReplies(threadId: string): Promise<string[]> {
  const userId = await requireUserId();
  await requireOwnThread(userId, threadId);
  const { subject, messages } = await loadThreadMessages(threadId);
  if (messages.length === 0) return [];

  try {
    const provider = getAIProvider();
    const result = await provider.generateObject({
      tier: "classify",
      ...buildQuickRepliesPrompt(subject, messages),
      schema: quickRepliesSchema,
      maxTokens: 256,
    });
    return result.replies;
  } catch (error) {
    if (error instanceof AIProviderNotConfiguredError) throw new Error(error.userMessage);
    throw new Error(aiUserMessage(error, "Não foi possível gerar sugestões de resposta."));
  }
}

/** AI Compose actions (spec §41/§42) — opera sobre texto ainda não guardado. */
export async function runComposeAction(action: ComposeAction, text: string, targetLanguage?: string): Promise<string> {
  await requireUserId();
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Escreva algum texto antes de usar uma ação de IA.");
  if (action !== "continue" && trimmed.length < 3) {
    throw new Error("O texto é demasiado curto para esta ação.");
  }

  try {
    const provider = getAIProvider();
    const result = await provider.generateObject({
      tier: "compose",
      ...buildComposeActionPrompt(action, trimmed, targetLanguage),
      schema: composeActionResultSchema,
      maxTokens: 2048,
    });
    return result.text;
  } catch (error) {
    if (error instanceof AIProviderNotConfiguredError) throw new Error(error.userMessage);
    throw new Error(aiUserMessage(error, "Não foi possível aplicar esta ação de IA. Tente novamente."));
  }
}

/** AI Compose — gerar email completo a partir de instrução livre (spec §42). */
export async function generateEmailDraft(instruction: string): Promise<{ subject: string; body: string }> {
  const trimmed = instruction.trim();
  if (!trimmed) throw new Error("Descreva o email que quer escrever.");
  const session = await auth();
  await requireUserId();

  try {
    const provider = getAIProvider();
    return await provider.generateObject({
      tier: "compose",
      ...buildComposeDraftPrompt(trimmed, session?.user?.name ?? null),
      schema: emailDraftSchema,
      maxTokens: 1024,
    });
  } catch (error) {
    if (error instanceof AIProviderNotConfiguredError) throw new Error(error.userMessage);
    throw new Error(aiUserMessage(error, "Não foi possível gerar o email com IA. Tente novamente."));
  }
}

/** Daily AI Briefing (spec §19) — uma chamada, por cima de contagens reais. */
export async function generateDailyBriefing() {
  const userId = await requireUserId();
  const data = await collectBriefingData(userId);
  try {
    return await generateBriefingText(data);
  } catch (error) {
    if (error instanceof AIProviderNotConfiguredError) throw new Error(error.userMessage);
    throw new Error(aiUserMessage(error, "Não foi possível gerar o resumo diário. Tente novamente."));
  }
}
