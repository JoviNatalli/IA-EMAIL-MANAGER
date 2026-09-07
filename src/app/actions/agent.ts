"use server";

/**
 * Server Actions do agente (Fase 5).
 *
 * Confirmação de ações sensíveis (spec §18) e criação de tarefas/eventos a
 * partir das propostas mostradas na UI (spec §20/§21 — só com clique).
 * Tudo revalida a sessão aqui dentro e escopa por `userId`: o cliente nunca
 * envia mais do que ids e os campos que ele próprio vê no ecrã.
 */
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { tasks, threads } from "@/lib/db/schema";
import {
  createCalendarEventForUser,
  deleteCalendarEventForUser,
} from "@/lib/calendar/service";
import { executePendingAction, rejectPendingAction, type PendingActionResult } from "@/lib/ai/agent";
import type { ToolContext } from "@/lib/ai/tools";

async function requireToolContext(): Promise<ToolContext> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");
  return {
    userId: session.user.id,
    userEmail: session.user.email ?? "",
    userName: session.user.name ?? null,
  };
}

const idSchema = z.string().uuid();

/** O utilizador clicou em "Confirmar" numa ação proposta pelo agente. */
export async function confirmAgentAction(actionId: string): Promise<PendingActionResult> {
  const ctx = await requireToolContext();
  const result = await executePendingAction(ctx, idSchema.parse(actionId));
  revalidatePath("/app", "layout");
  return result;
}

export async function cancelAgentAction(actionId: string): Promise<PendingActionResult> {
  const ctx = await requireToolContext();
  return rejectPendingAction(ctx, idSchema.parse(actionId));
}

// ── Propostas → criação (spec §20/§21) ──────────────────────────────────

const optionalIsoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Data inválida.")
  .nullable()
  .optional();

const taskProposalSchema = z.object({
  title: z.string().trim().min(1).max(160),
  dueDate: optionalIsoDate,
  sourceThreadId: idSchema.nullable().optional(),
});

const meetingProposalSchema = z.object({
  title: z.string().trim().min(1).max(160),
  startsAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Data inválida."),
  endsAt: optionalIsoDate,
  location: z.string().max(160).nullable().optional(),
  sourceThreadId: idSchema.nullable().optional(),
});

/** Um `sourceThreadId` que veio do cliente só é aceite se for mesmo dele. */
async function resolveOwnThreadId(userId: string, threadId?: string | null): Promise<string | null> {
  if (!threadId) return null;
  const row = await db.query.threads.findFirst({
    where: and(eq(threads.id, threadId), eq(threads.userId, userId)),
    columns: { id: true },
  });
  return row?.id ?? null;
}

export async function createTaskFromProposal(input: z.infer<typeof taskProposalSchema>) {
  const ctx = await requireToolContext();
  const parsed = taskProposalSchema.parse(input);
  const sourceThreadId = await resolveOwnThreadId(ctx.userId, parsed.sourceThreadId);

  await db.insert(tasks).values({
    userId: ctx.userId,
    title: parsed.title,
    dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
    sourceThreadId,
  });
  revalidatePath("/app", "layout");
}

export async function createCalendarEventFromProposal(
  input: z.infer<typeof meetingProposalSchema>,
): Promise<{ googleHtmlLink: string | null; googleError: string | null }> {
  const ctx = await requireToolContext();
  const parsed = meetingProposalSchema.parse(input);
  const sourceThreadId = await resolveOwnThreadId(ctx.userId, parsed.sourceThreadId);

  const result = await createCalendarEventForUser(ctx.userId, {
    title: parsed.title,
    startsAt: new Date(parsed.startsAt),
    endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
    location: parsed.location ?? null,
    sourceThreadId,
  });
  revalidatePath("/app", "layout");
  return { googleHtmlLink: result.googleHtmlLink, googleError: result.googleError };
}

// ── Tarefas e eventos: gestão manual ────────────────────────────────────

export async function setTaskDone(taskId: string, isDone: boolean) {
  const ctx = await requireToolContext();
  await db
    .update(tasks)
    .set({ isDone, completedAt: isDone ? new Date() : null })
    .where(and(eq(tasks.id, idSchema.parse(taskId)), eq(tasks.userId, ctx.userId)));
  revalidatePath("/app", "layout");
}

export async function deleteTask(taskId: string) {
  const ctx = await requireToolContext();
  await db.delete(tasks).where(and(eq(tasks.id, idSchema.parse(taskId)), eq(tasks.userId, ctx.userId)));
  revalidatePath("/app", "layout");
}

export async function deleteCalendarEvent(eventId: string): Promise<{ googleError: string | null }> {
  const ctx = await requireToolContext();
  const result = await deleteCalendarEventForUser(ctx.userId, idSchema.parse(eventId));
  revalidatePath("/app", "layout");
  return result;
}
