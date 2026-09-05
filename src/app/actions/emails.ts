"use server";

/**
 * Server Actions de email (Fase 2). Sem IA, sem Gmail real — "enviar" é
 * simulado (marca a mensagem como enviada e move a thread para Sent),
 * como o resto do Demo Mode (spec §47). Todas revalidam a sessão aqui
 * dentro (nunca confiar só no proxy — spec §18/§30) e verificam que o
 * recurso pertence ao utilizador antes de tocar nele.
 */
import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
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
import { GmailError } from "@/lib/google/errors";
import {
  createDraft as createGmailDraft,
  deleteMessagePermanently,
  modifyMessage,
  sendDraft as sendGmailDraftById,
  sendRawMessage,
  trashMessage,
  untrashMessage,
  updateDraft as updateGmailDraft,
} from "@/lib/google/gmail-client";
import { buildRawMimeMessage } from "@/lib/google/mime";
import { syncSingleGmailThread } from "@/lib/google/sync";
import { getValidGoogleAccessToken, hasGoogleAccountLinked } from "@/lib/google/tokens";

export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Não autenticado.");
  }
  return session.user.id;
}

export async function requireOwnThread(userId: string, threadId: string) {
  const thread = await db.query.threads.findFirst({
    where: and(eq(threads.id, threadId), eq(threads.userId, userId)),
  });
  if (!thread) throw new Error("Thread não encontrada.");
  return thread;
}

function revalidateMail() {
  revalidatePath("/app", "layout");
}

// ── Fase 3: propagação para a conta Gmail real ─────────────────────────
//
// Threads com `source === "gmail"` espelham uma conversa real — qualquer
// ação do utilizador que a mude (estrela, lido, arquivar, labels) devia
// idealmente refletir-se também lá. Duas filosofias diferentes, por
// severidade (spec §35 — nunca um erro técnico cru; e nunca fingir que uma
// ação destrutiva teve sucesso quando não teve):
//   - "Leve"/reversível (estrela, lido, arquivar/restaurar, labels
//     importadas): aplica-se sempre localmente primeiro (otimista); a
//     propagação ao Gmail é best-effort — uma falha fica só registada
//     (consola do servidor), corrigível com "Sincronizar agora" em
//     Definições → Contas, sem interromper o utilizador a meio de um clique.
//   - Destrutivo/consequente (mover para o lixo, apagar definitivamente,
//     enviar/responder): chama-se o Gmail PRIMEIRO; só se tiver sucesso é
//     que o estado local é alterado. Uma falha aqui é lançada como erro e
//     mostrada ao utilizador — nunca fica a parecer que resultou.

function gmailUserMessage(error: unknown, fallback: string): string {
  return error instanceof GmailError ? error.userMessage : fallback;
}

async function getThreadGmailMessageIds(threadId: string): Promise<string[]> {
  const rows = await db
    .select({ gmailMessageId: emails.gmailMessageId })
    .from(emails)
    .where(eq(emails.threadId, threadId));
  return rows.map((r) => r.gmailMessageId).filter((id): id is string => !!id);
}

type OwnedThread = NonNullable<Awaited<ReturnType<typeof requireOwnThread>>>;

async function propagateToGmailBestEffort(
  userId: string,
  thread: OwnedThread,
  mutate: (accessToken: string, gmailMessageIds: string[]) => Promise<void>,
): Promise<void> {
  if (thread.source !== "gmail" || !thread.gmailThreadId) return;
  const gmailThreadId = thread.gmailThreadId;
  try {
    const accessToken = await getValidGoogleAccessToken(userId);
    const gmailMessageIds = await getThreadGmailMessageIds(thread.id);
    await mutate(accessToken, gmailMessageIds);
    await syncSingleGmailThread(userId, gmailThreadId);
  } catch (error) {
    console.error("[gmail] falha ao propagar ação (best-effort):", error);
  }
}

// ── Estado de leitura / estrela / pasta ────────────────────────────────

export async function toggleThreadStar(threadId: string, isStarred: boolean) {
  const userId = await requireUserId();
  const thread = await requireOwnThread(userId, threadId);
  await db.update(threads).set({ isStarred }).where(eq(threads.id, threadId));
  await propagateToGmailBestEffort(userId, thread, async (accessToken, gmailMessageIds) => {
    await Promise.all(
      gmailMessageIds.map((id) =>
        modifyMessage(accessToken, id, isStarred ? { addLabelIds: ["STARRED"] } : { removeLabelIds: ["STARRED"] }),
      ),
    );
  });
  revalidateMail();
}

export async function setThreadRead(threadId: string, isRead: boolean) {
  const userId = await requireUserId();
  const thread = await requireOwnThread(userId, threadId);
  await db.update(threads).set({ isRead }).where(eq(threads.id, threadId));
  await propagateToGmailBestEffort(userId, thread, async (accessToken, gmailMessageIds) => {
    await Promise.all(
      gmailMessageIds.map((id) =>
        modifyMessage(accessToken, id, isRead ? { removeLabelIds: ["UNREAD"] } : { addLabelIds: ["UNREAD"] }),
      ),
    );
  });
  revalidateMail();
}

type MovableFolder = "inbox" | "archive" | "trash";

export async function moveThread(threadId: string, folder: MovableFolder) {
  const userId = await requireUserId();
  const thread = await requireOwnThread(userId, threadId);
  if (thread.folder === "drafts") {
    throw new Error("Um rascunho não pode ser movido — descarte-o ou envie-o.");
  }

  // Mover para o lixo é visível na conta Gmail real do utilizador — falha de
  // forma explícita em vez de mover só localmente sem avisar (ao contrário
  // de arquivar/restaurar, tratados como best-effort abaixo).
  if (thread.source === "gmail" && thread.gmailThreadId && folder === "trash") {
    try {
      const accessToken = await getValidGoogleAccessToken(userId);
      const gmailMessageIds = await getThreadGmailMessageIds(thread.id);
      await Promise.all(gmailMessageIds.map((id) => trashMessage(accessToken, id)));
      await syncSingleGmailThread(userId, thread.gmailThreadId);
    } catch (error) {
      throw new Error(gmailUserMessage(error, "Não foi possível mover esta conversa para o lixo no Gmail."));
    }
    revalidateMail();
    return;
  }

  const previousFolder = thread.folder;
  await db.update(threads).set({ folder }).where(eq(threads.id, threadId));

  await propagateToGmailBestEffort(userId, thread, async (accessToken, gmailMessageIds) => {
    if (folder === "inbox") {
      if (previousFolder === "trash") {
        await Promise.all(gmailMessageIds.map((id) => untrashMessage(accessToken, id)));
      }
      await Promise.all(gmailMessageIds.map((id) => modifyMessage(accessToken, id, { addLabelIds: ["INBOX"] })));
    } else if (folder === "archive") {
      await Promise.all(gmailMessageIds.map((id) => modifyMessage(accessToken, id, { removeLabelIds: ["INBOX"] })));
    }
  });

  revalidateMail();
}

export async function deleteThreadForever(threadId: string) {
  const userId = await requireUserId();
  const thread = await requireOwnThread(userId, threadId);
  if (thread.folder !== "trash") {
    throw new Error("Só é possível apagar definitivamente a partir do Trash.");
  }

  if (thread.source === "gmail" && thread.gmailThreadId) {
    try {
      const accessToken = await getValidGoogleAccessToken(userId);
      const gmailMessageIds = await getThreadGmailMessageIds(thread.id);
      await Promise.all(gmailMessageIds.map((id) => deleteMessagePermanently(accessToken, id)));
    } catch (error) {
      throw new Error(gmailUserMessage(error, "Não foi possível apagar esta conversa no Gmail."));
    }
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
  const thread = await requireOwnThread(userId, threadId);
  const [label] = await db
    .select({ id: labels.id, gmailLabelId: labels.gmailLabelId })
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

  // Só labels importadas do Gmail (`gmailLabelId` preenchido) são propagadas
  // — labels criadas só localmente ainda não têm equivalente lá (ver nota no
  // schema e README "Future Improvements").
  if (label.gmailLabelId) {
    const gmailLabelId = label.gmailLabelId;
    await propagateToGmailBestEffort(userId, thread, async (accessToken, gmailMessageIds) => {
      await Promise.all(
        gmailMessageIds.map((id) =>
          modifyMessage(accessToken, id, apply ? { addLabelIds: [gmailLabelId] } : { removeLabelIds: [gmailLabelId] }),
        ),
      );
    });
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

/**
 * Cria ou atualiza um rascunho (thread em `drafts` com uma única mensagem).
 * Fase 3: se a conta tiver Gmail ligado, o rascunho é também criado/atualizado
 * lá (`users.drafts`) — best-effort (uma falha aqui não deve impedir o
 * utilizador de continuar a escrever; fica só registada).
 */
export async function saveDraft(input: ComposeInput): Promise<{ threadId: string }> {
  const userId = await requireUserId();
  const parsed = composeSchema.parse(input);
  const snippet = parsed.body.replace(/\s+/g, " ").trim().slice(0, 160);
  const subject = parsed.subject || "(sem assunto)";
  const session = await auth();
  const fromEmail = session?.user?.email ?? "";

  if (parsed.threadId) {
    const thread = await requireOwnThread(userId, parsed.threadId);
    if (thread.folder !== "drafts") {
      throw new Error("Só é possível editar rascunhos.");
    }
    const [message] = await db
      .select({ id: emails.id, gmailDraftId: emails.gmailDraftId })
      .from(emails)
      .where(eq(emails.threadId, thread.id))
      .limit(1);

    await db.update(threads).set({ subject, lastMessageAt: new Date() }).where(eq(threads.id, thread.id));
    if (message) {
      await db
        .update(emails)
        .set({ to: parsed.to, cc: parsed.cc, bcc: parsed.bcc, bodyText: parsed.body, snippet })
        .where(eq(emails.id, message.id));

      if (thread.source === "gmail") {
        try {
          const accessToken = await getValidGoogleAccessToken(userId);
          const raw = buildRawMimeMessage({
            from: fromEmail,
            to: parsed.to,
            cc: parsed.cc,
            bcc: parsed.bcc,
            subject,
            bodyText: parsed.body,
          });
          const draft = message.gmailDraftId
            ? await updateGmailDraft(accessToken, message.gmailDraftId, raw, thread.gmailThreadId ?? undefined)
            : await createGmailDraft(accessToken, raw, thread.gmailThreadId ?? undefined);
          await db.update(emails).set({ gmailDraftId: draft.id }).where(eq(emails.id, message.id));
          if (!thread.gmailThreadId) {
            await db
              .update(threads)
              .set({ gmailThreadId: draft.message.threadId })
              .where(eq(threads.id, thread.id));
          }
        } catch (error) {
          console.error("[gmail] falha ao sincronizar rascunho (best-effort):", error);
        }
      }
    }
    revalidateMail();
    return { threadId: thread.id };
  }

  const gmailLinked = await hasGoogleAccountLinked(userId);

  const [thread] = await db
    .insert(threads)
    .values({
      userId,
      subject,
      folder: "drafts",
      priority: "low",
      isRead: true,
      lastMessageAt: new Date(),
      source: gmailLinked ? "gmail" : "demo",
    })
    .returning({ id: threads.id });

  const [email] = await db
    .insert(emails)
    .values({
      threadId: thread.id,
      fromName: session?.user?.name ?? null,
      fromEmail,
      to: parsed.to,
      cc: parsed.cc,
      bcc: parsed.bcc,
      bodyText: parsed.body,
      snippet,
      sentAt: null,
    })
    .returning({ id: emails.id });

  if (gmailLinked) {
    try {
      const accessToken = await getValidGoogleAccessToken(userId);
      const raw = buildRawMimeMessage({ from: fromEmail, to: parsed.to, cc: parsed.cc, bcc: parsed.bcc, subject, bodyText: parsed.body });
      const draft = await createGmailDraft(accessToken, raw);
      await db.update(emails).set({ gmailDraftId: draft.id }).where(eq(emails.id, email.id));
      await db.update(threads).set({ gmailThreadId: draft.message.threadId }).where(eq(threads.id, thread.id));
    } catch (error) {
      console.error("[gmail] falha ao criar rascunho no Gmail (best-effort):", error);
    }
  }

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

/**
 * Envia um rascunho. Com Gmail ligado, envia mesmo pela Gmail API (via
 * `drafts.send` quando já existe um rascunho lá, senão `messages.send`) — só
 * marca como enviado localmente depois de confirmado; sem Gmail ligado,
 * mantém-se o envio simulado da Fase 2 (Demo Mode).
 */
export async function sendDraft(input: ComposeInput): Promise<{ threadId: string }> {
  const { threadId } = await saveDraft(input);
  const userId = await requireUserId();
  const thread = await requireOwnThread(userId, threadId);

  const [message] = await db
    .select({
      id: emails.id,
      gmailDraftId: emails.gmailDraftId,
      to: emails.to,
      cc: emails.cc,
      bcc: emails.bcc,
      bodyText: emails.bodyText,
    })
    .from(emails)
    .where(eq(emails.threadId, thread.id))
    .limit(1);
  if (!message) throw new Error("Rascunho sem mensagem.");

  if (thread.source === "gmail") {
    try {
      const session = await auth();
      const accessToken = await getValidGoogleAccessToken(userId);
      const sent = message.gmailDraftId
        ? await sendGmailDraftById(accessToken, message.gmailDraftId)
        : await sendRawMessage(
            accessToken,
            buildRawMimeMessage({
              from: session?.user?.email ?? "",
              to: message.to,
              cc: message.cc,
              bcc: message.bcc,
              subject: thread.subject,
              bodyText: message.bodyText,
            }),
          );
      // A mensagem local até aqui era só um placeholder do rascunho (sem
      // `gmailMessageId` real). Ressincroniza primeiro (traz a mensagem real
      // do Gmail) e só remove o placeholder depois de confirmado — pela
      // ordem inversa arriscaríamos ficar com a thread vazia se a
      // resincronização falhasse depois de o Gmail já ter enviado o email.
      await syncSingleGmailThread(userId, sent.threadId);
      await db.delete(emails).where(eq(emails.id, message.id));
    } catch (error) {
      throw new Error(gmailUserMessage(error, "Não foi possível enviar este email pelo Gmail."));
    }
    revalidateMail();
    return { threadId: thread.id };
  }

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

/**
 * Reply/Reply-all. Com Gmail ligado numa thread sincronizada, envia mesmo
 * pela Gmail API (encadeada com In-Reply-To/References) — só grava a
 * mensagem localmente depois de confirmado; caso contrário mantém-se o
 * comportamento simulado da Fase 2.
 */
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

  if (thread.source === "gmail" && thread.gmailThreadId) {
    const gmailThreadId = thread.gmailThreadId;
    try {
      const [lastMessage] = await db
        .select({ rfcMessageId: emails.rfcMessageId })
        .from(emails)
        .where(eq(emails.threadId, thread.id))
        .orderBy(desc(emails.sentAt))
        .limit(1);

      const accessToken = await getValidGoogleAccessToken(userId);
      const raw = buildRawMimeMessage({
        from: session?.user?.email ?? "",
        to: parsed.to,
        cc: parsed.cc,
        subject: thread.subject.toLowerCase().startsWith("re:") ? thread.subject : `Re: ${thread.subject}`,
        bodyText: parsed.body,
        inReplyToMessageId: lastMessage?.rfcMessageId ?? undefined,
        referencesMessageIds: lastMessage?.rfcMessageId ? [lastMessage.rfcMessageId] : undefined,
      });
      const sent = await sendRawMessage(accessToken, raw, gmailThreadId);
      await syncSingleGmailThread(userId, sent.threadId);
    } catch (error) {
      throw new Error(gmailUserMessage(error, "Não foi possível enviar esta resposta pelo Gmail."));
    }
    revalidateMail();
    return;
  }

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
