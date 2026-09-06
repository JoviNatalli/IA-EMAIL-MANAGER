/**
 * Leitura de threads para IA + resumo reutilizável.
 *
 * Vive fora de `src/app/actions/ai.ts` porque esse ficheiro é `"use server"`
 * (tudo o que exporta tem de ser uma Server Action) e estas funções são
 * chamadas também pelas ferramentas do agente (Fase 5) e pelo briefing.
 * O `userId` é sempre exigido e filtrado na query — nunca se lê uma thread
 * sem provar que é do utilizador (spec §29/§30).
 */
import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { aiAnalysis, emails, threads } from "@/lib/db/schema";
import { buildSummaryPrompt, type ThreadMessageInput } from "@/lib/ai/prompts";
import { getAIProvider } from "@/lib/ai/provider";
import { emailSummarySchema } from "@/lib/ai/schemas";

export interface ThreadForAI {
  id: string;
  subject: string;
  messages: ThreadMessageInput[];
}

export async function loadThreadForAI(userId: string, threadId: string): Promise<ThreadForAI | null> {
  const thread = await db.query.threads.findFirst({
    where: and(eq(threads.id, threadId), eq(threads.userId, userId)),
  });
  if (!thread) return null;

  const rows = await db
    .select({
      fromName: emails.fromName,
      fromEmail: emails.fromEmail,
      bodyText: emails.bodyText,
      sentAt: emails.sentAt,
    })
    .from(emails)
    .where(eq(emails.threadId, threadId))
    .orderBy(asc(emails.createdAt));

  return { id: thread.id, subject: thread.subject, messages: rows };
}

/** Resumo já calculado pela Fase 4 (spec §51 — não repetir chamadas pagas). */
export async function getCachedThreadSummary(userId: string, threadId: string): Promise<string | null> {
  const thread = await db.query.threads.findFirst({
    where: and(eq(threads.id, threadId), eq(threads.userId, userId)),
    columns: { id: true },
  });
  if (!thread) return null;

  const row = await db.query.aiAnalysis.findFirst({ where: eq(aiAnalysis.threadId, threadId) });
  if (!row) return null;
  if (!row.hasEnoughInformation) {
    return "Não há informação suficiente nesta conversa para um resumo fiável.";
  }
  return row.keyPoints.length > 0 ? `${row.summary}\nPontos: ${row.keyPoints.join(" · ")}` : row.summary;
}

/** Gera um resumo novo (uma chamada ao modelo médio — spec §52). */
export async function summarizeThreadForAgent(userId: string, threadId: string): Promise<string> {
  const thread = await loadThreadForAI(userId, threadId);
  if (!thread) throw new Error("Conversa não encontrada (ou não pertence a este utilizador).");
  if (thread.messages.length === 0) return "Esta conversa não tem mensagens.";

  const provider = getAIProvider();
  const summary = await provider.generateObject({
    tier: "summarize",
    ...buildSummaryPrompt(thread.subject, thread.messages),
    schema: emailSummarySchema,
    maxTokens: 1024,
  });

  if (!summary.hasEnoughInformation) {
    return "Não há informação suficiente nesta conversa para um resumo fiável.";
  }
  return summary.keyPoints.length > 0
    ? `${summary.summary}\nPontos: ${summary.keyPoints.join(" · ")}`
    : summary.summary;
}
