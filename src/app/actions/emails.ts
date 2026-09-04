"use server";

/**
 * Server Actions de email (Fase 2). Sem IA, sem Gmail real — "enviar" é
 * simulado (marca a mensagem como enviada e move a thread para Sent),
 * como o resto do Demo Mode (spec §47). Todas revalidam a sessão aqui
 * dentro (nunca confiar só no proxy — spec §18/§30) e verificam que o
 * recurso pertence ao utilizador antes de tocar nele.
 */
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  emails,
  labelColorEnum,
  labels,
  threadLabels,
  threads,
} from "@/lib/db/schema";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Não autenticado.");
  }
  return session.user.id;
}

async function requireOwnThread(userId: string, threadId: string) {
  const thread = await db.query.threads.findFirst({
    where: and(eq(threads.id, threadId), eq(threads.userId, userId)),
  });
  if (!thread) throw new Error("Thread não encontrada.");
  return thread;
}

function revalidateMail() {
  revalidatePath("/app", "layout");
}

// ── Estado de leitura / estrela / pasta ────────────────────────────────

export async function toggleThreadStar(threadId: string, isStarred: boolean) {
  const userId = await requireUserId();
  await requireOwnThread(userId, threadId);
  await db.update(threads).set({ isStarred }).where(eq(threads.id, threadId));
  revalidateMail();
}

export async function setThreadRead(threadId: string, isRead: boolean) {
  const userId = await requireUserId();
  await requireOwnThread(userId, threadId);
  await db.update(threads).set({ isRead }).where(eq(threads.id, threadId));
  revalidateMail();
}

type MovableFolder = "inbox" | "archive" | "trash";

export async function moveThread(threadId: string, folder: MovableFolder) {
  const userId = await requireUserId();
  const thread = await requireOwnThread(userId, threadId);
  if (thread.folder === "drafts") {
    throw new Error("Um rascunho não pode ser movido — descarte-o ou envie-o.");
  }
  await db.update(threads).set({ folder }).where(eq(threads.id, threadId));
  revalidateMail();
}

export async function deleteThreadForever(threadId: string) {
  const userId = await requireUserId();
  const thread = await requireOwnThread(userId, threadId);
  if (thread.folder !== "trash") {
    throw new Error("Só é possível apagar definitivamente a partir do Trash.");
  }
  await db.delete(threads).where(eq(threads.id, threadId));
  revalidateMail();
}

// ── Labels ───────────────────────────────────────────────────────────

const labelInputSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório.").max(40),
  color: z.enum(labelColorEnum.enumValues),
});

export async function createLabel(input: z.infer<typeof labelInputSchema>) {
  const userId = await requireUserId();
  const parsed = labelInputSchema.parse(input);
  const [row] = await db
    .insert(labels)
    .values({ userId, name: parsed.name, color: parsed.color })
    .returning({ id: labels.id });
  revalidateMail();
  return row;
}

export async function renameLabel(labelId: string, name: string) {
  const userId = await requireUserId();
  const parsed = labelInputSchema.shape.name.parse(name);
  const [label] = await db
    .select({ id: labels.id })
    .from(labels)
    .where(and(eq(labels.id, labelId), eq(labels.userId, userId)));
  if (!label) throw new Error("Label não encontrada.");
  await db.update(labels).set({ name: parsed }).where(eq(labels.id, labelId));
  revalidateMail();
}

export async function deleteLabel(labelId: string) {
  const userId = await requireUserId();
  const [label] = await db
    .select({ id: labels.id })
    .from(labels)
    .where(and(eq(labels.id, labelId), eq(labels.userId, userId)));
  if (!label) throw new Error("Label não encontrada.");
  await db.delete(labels).where(eq(labels.id, labelId));
  revalidateMail();
}

export async function setThreadLabel(threadId: string, labelId: string, apply: boolean) {
  const userId = await requireUserId();
  await requireOwnThread(userId, threadId);
  const [label] = await db
    .select({ id: labels.id })
    .from(labels)
    .where(and(eq(labels.id, labelId), eq(labels.userId, userId)));
  if (!label) throw new Error("Label não encontrada.");

  if (apply) {
    await db
      .insert(threadLabels)
      .values({ threadId, labelId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(threadLabels)
      .where(and(eq(threadLabels.threadId, threadId), eq(threadLabels.labelId, labelId)));
  }
  revalidateMail();
}

// ── Compose / Draft / Send ──────────────────────────────────────────────

const participantSchema = z.object({
  name: z.string().trim().nullable(),
  email: z.string().trim().email("Endereço de email inválido."),
});

const composeSchema = z.object({
  threadId: z.string().uuid().optional(),
  to: z.array(participantSchema).max(50),
  cc: z.array(participantSchema).max(50).default([]),
  bcc: z.array(participantSchema).max(50).default([]),
  subject: z.string().trim().max(300).default(""),
  body: z.string().max(20000).default(""),
});

export type ComposeInput = z.infer<typeof composeSchema>;

/** Cria ou atualiza um rascunho (thread em `drafts` com uma única mensagem). */
export async function saveDraft(input: ComposeInput): Promise<{ threadId: string }> {
  const userId = await requireUserId();
  const parsed = composeSchema.parse(input);
  const snippet = parsed.body.replace(/\s+/g, " ").trim().slice(0, 160);
  const subject = parsed.subject || "(sem assunto)";

  if (parsed.threadId) {
    const thread = await requireOwnThread(userId, parsed.threadId);
    if (thread.folder !== "drafts") {
      throw new Error("Só é possível editar rascunhos.");
    }
    const [message] = await db
      .select({ id: emails.id })
      .from(emails)
      .where(eq(emails.threadId, thread.id))
      .limit(1);

    await db.update(threads).set({ subject, lastMessageAt: new Date() }).where(eq(threads.id, thread.id));
    if (message) {
      await db
        .update(emails)
        .set({ to: parsed.to, cc: parsed.cc, bcc: parsed.bcc, bodyText: parsed.body, snippet })
        .where(eq(emails.id, message.id));
    }
    revalidateMail();
    return { threadId: thread.id };
  }

  const [thread] = await db
    .insert(threads)
    .values({
      userId,
      subject,
      folder: "drafts",
      priority: "low",
      isRead: true,
      lastMessageAt: new Date(),
    })
    .returning({ id: threads.id });

  const session = await auth();
  await db.insert(emails).values({
    threadId: thread.id,
    fromName: session?.user?.name ?? null,
    fromEmail: session?.user?.email ?? "",
    to: parsed.to,
    cc: parsed.cc,
    bcc: parsed.bcc,
    bodyText: parsed.body,
    snippet,
    sentAt: null,
  });

  revalidateMail();
  return { threadId: thread.id };
}

export async function discardDraft(threadId: string) {
  const userId = await requireUserId();
  const thread = await requireOwnThread(userId, threadId);
  if (thread.folder !== "drafts") throw new Error("Só é possível descartar rascunhos.");
  await db.delete(threads).where(eq(threads.id, threadId));
  revalidateMail();
}

/** "Envia" um rascunho: marca a mensagem como enviada e move a thread para Sent (simulado — sem Gmail real). */
export async function sendDraft(input: ComposeInput): Promise<{ threadId: string }> {
  const { threadId } = await saveDraft(input);
  const userId = await requireUserId();
  const thread = await requireOwnThread(userId, threadId);

  const [message] = await db
    .select({ id: emails.id })
    .from(emails)
    .where(eq(emails.threadId, thread.id))
    .limit(1);
  if (!message) throw new Error("Rascunho sem mensagem.");

  const now = new Date();
  await db.update(emails).set({ sentAt: now }).where(eq(emails.id, message.id));
  await db
    .update(threads)
    .set({ folder: "sent", isRead: true, lastMessageAt: now })
    .where(eq(threads.id, thread.id));

  revalidateMail();
  return { threadId: thread.id };
}

const replySchema = z.object({
  threadId: z.string().uuid(),
  to: z.array(participantSchema).min(1),
  cc: z.array(participantSchema).max(50).default([]),
  body: z.string().trim().min(1, "Escreva uma resposta.").max(20000),
});

/** Reply/Reply-all: acrescenta uma mensagem enviada à thread existente. */
export async function sendReply(input: z.infer<typeof replySchema>) {
  const userId = await requireUserId();
  const parsed = replySchema.parse(input);
  const thread = await requireOwnThread(userId, parsed.threadId);
  if (thread.folder === "drafts" || thread.folder === "trash") {
    throw new Error("Não é possível responder a partir desta pasta.");
  }

  const session = await auth();
  const now = new Date();
  const snippet = parsed.body.replace(/\s+/g, " ").trim().slice(0, 160);

  await db.insert(emails).values({
    threadId: thread.id,
    fromName: session?.user?.name ?? null,
    fromEmail: session?.user?.email ?? "",
    to: parsed.to,
    cc: parsed.cc,
    bcc: [],
    bodyText: parsed.body,
    snippet,
    sentAt: now,
  });

  await db.update(threads).set({ isRead: true, lastMessageAt: now }).where(eq(threads.id, thread.id));
  revalidateMail();
}
