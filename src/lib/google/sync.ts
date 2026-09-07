import "server-only";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { indexPendingEmails } from "@/lib/ai/indexing";
import { emails, gmailSync, labels, threadLabels, threads } from "@/lib/db/schema";
import type { LabelColorEnum } from "@/lib/emails/types";
import { GmailError } from "./errors";
import { getProfile, getThread, listLabels, listThreadIds, type GmailLabel } from "./gmail-client";
import { getValidGoogleAccessToken } from "./tokens";
import { mapGmailThread, type MappedGmailThread } from "./mapper";

/** Limite da sincronização inicial — mantém a operação rápida e previsível
 * (uma conta real pode ter milhares de threads; isto é uma demo de
 * portefólio, não um sync completo de produção — documentado no README). */
const INITIAL_SYNC_THREAD_LIMIT = 30;

const LABEL_PALETTE: LabelColorEnum[] = ["slate", "blue", "green", "amber", "purple", "rose"];

function colorForLabelName(name: string): LabelColorEnum {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return LABEL_PALETTE[hash % LABEL_PALETTE.length];
}

async function setSyncStatus(
  userId: string,
  patch: { status: "idle" | "syncing" | "error"; lastError?: string | null; touchLastSyncedAt?: boolean },
) {
  await db
    .insert(gmailSync)
    .values({
      userId,
      status: patch.status,
      lastError: patch.lastError ?? null,
      lastSyncedAt: patch.touchLastSyncedAt ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: gmailSync.userId,
      set: {
        status: patch.status,
        lastError: patch.lastError ?? null,
        ...(patch.touchLastSyncedAt ? { lastSyncedAt: new Date() } : {}),
        updatedAt: new Date(),
      },
    });
}

/**
 * Importa as labels "user" do Gmail (ignora as de sistema — INBOX, SENT,
 * STARRED, etc., que já são representadas por `folder`/`isStarred`) e
 * devolve um mapa gmailLabelId → id local, para associar threads às labels
 * certas.
 */
async function importGmailLabels(userId: string, accessToken: string): Promise<Map<string, string>> {
  const gmailLabels = await listLabels(accessToken);
  const userLabels: GmailLabel[] = gmailLabels.filter((l) => l.type === "user");

  const existing = await db
    .select({ id: labels.id, gmailLabelId: labels.gmailLabelId })
    .from(labels)
    .where(eq(labels.userId, userId));
  const byGmailId = new Map(existing.filter((l) => l.gmailLabelId).map((l) => [l.gmailLabelId as string, l.id]));

  for (const label of userLabels) {
    if (byGmailId.has(label.id)) continue;
    const [row] = await db
      .insert(labels)
      .values({ userId, name: label.name, color: colorForLabelName(label.name), gmailLabelId: label.id })
      .returning({ id: labels.id });
    byGmailId.set(label.id, row.id);
  }

  return byGmailId;
}

/** Upsert de uma thread já mapeada (thread + mensagens + labels) — usado tanto pela sincronização inicial como para refrescar uma única thread depois de uma mutação (enviar, responder, aplicar label, etc.). */
export async function upsertMappedThread(
  userId: string,
  mapped: MappedGmailThread,
  labelIdByGmailId: Map<string, string>,
): Promise<string> {
  const [existingThread] = await db
    .select({ id: threads.id })
    .from(threads)
    .where(and(eq(threads.userId, userId), eq(threads.gmailThreadId, mapped.gmailThreadId)))
    .limit(1);

  let threadId: string;
  if (existingThread) {
    threadId = existingThread.id;
    await db
      .update(threads)
      .set({
        subject: mapped.subject,
        folder: mapped.folder,
        isStarred: mapped.isStarred,
        isRead: mapped.isRead,
        lastMessageAt: mapped.lastMessageAt,
        source: "gmail",
      })
      .where(eq(threads.id, threadId));
  } else {
    const [row] = await db
      .insert(threads)
      .values({
        userId,
        subject: mapped.subject,
        folder: mapped.folder,
        isStarred: mapped.isStarred,
        isRead: mapped.isRead,
        priority: "medium",
        lastMessageAt: mapped.lastMessageAt,
        source: "gmail",
        gmailThreadId: mapped.gmailThreadId,
      })
      .returning({ id: threads.id });
    threadId = row.id;
  }

  for (const message of mapped.messages) {
    const [existingEmail] = await db
      .select({ id: emails.id })
      .from(emails)
      .where(eq(emails.gmailMessageId, message.gmailMessageId))
      .limit(1);

    const values = {
      threadId,
      fromName: message.fromName,
      fromEmail: message.fromEmail,
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      bodyText: message.bodyText,
      snippet: message.snippet,
      sentAt: message.sentAt,
      gmailMessageId: message.gmailMessageId,
      rfcMessageId: message.rfcMessageId,
      gmailLabelIds: message.labelIds,
    };

    if (existingEmail) {
      await db.update(emails).set(values).where(eq(emails.id, existingEmail.id));
    } else {
      await db.insert(emails).values(values);
    }
  }

  // Reconcilia as labels de origem Gmail (aplica as presentes nalguma
  // mensagem, remove as que deixaram de estar) — só para labels importadas
  // (`gmailLabelId` preenchido); labels criadas só localmente nunca são
  // tocadas aqui, mesmo que a thread seja "gmail".
  const labelIdsPresentInThread = new Set(mapped.messages.flatMap((m) => m.labelIds));
  for (const [gmailLabelId, localLabelId] of labelIdByGmailId) {
    if (labelIdsPresentInThread.has(gmailLabelId)) {
      await db.insert(threadLabels).values({ threadId, labelId: localLabelId }).onConflictDoNothing();
    } else {
      await db
        .delete(threadLabels)
        .where(and(eq(threadLabels.threadId, threadId), eq(threadLabels.labelId, localLabelId)));
    }
  }

  return threadId;
}

/** Refresca uma única thread a partir do Gmail — chamado depois de qualquer ação que mude o estado real (enviar, responder, estrela, arquivar, labels). */
export async function syncSingleGmailThread(userId: string, gmailThreadId: string): Promise<string> {
  const accessToken = await getValidGoogleAccessToken(userId);
  const [thread, labelMap] = await Promise.all([
    getThread(accessToken, gmailThreadId),
    importGmailLabels(userId, accessToken),
  ]);
  const mapped = mapGmailThread(thread);
  if (!mapped) {
    throw new GmailError(`Thread ${gmailThreadId} sem mensagens.`, {
      userMessage: "Não foi possível confirmar o estado desta conversa no Gmail.",
    });
  }
  return upsertMappedThread(userId, mapped, labelMap);
}

export interface SyncResult {
  threadsSynced: number;
}

/**
 * Sincronização inicial (ou "sincronizar agora" manual): importa as labels do
 * utilizador e as últimas `INITIAL_SYNC_THREAD_LIMIT` threads da conta Gmail
 * ligada. Guarda o `historyId` para uma futura sincronização incremental
 * (fora do âmbito desta fase — ver README "Future Improvements").
 */
export async function runInitialGmailSync(userId: string): Promise<SyncResult> {
  await setSyncStatus(userId, { status: "syncing" });

  try {
    const accessToken = await getValidGoogleAccessToken(userId);
    const labelMap = await importGmailLabels(userId, accessToken);
    const { threads: threadRefs } = await listThreadIds(accessToken, { maxResults: INITIAL_SYNC_THREAD_LIMIT });

    let synced = 0;
    for (const ref of threadRefs) {
      const thread = await getThread(accessToken, ref.id);
      const mapped = mapGmailThread(thread);
      if (!mapped) continue;
      await upsertMappedThread(userId, mapped, labelMap);
      synced += 1;
    }

    const profile = await getProfile(accessToken);
    await db
      .update(gmailSync)
      .set({ historyId: profile.historyId })
      .where(eq(gmailSync.userId, userId));
    await setSyncStatus(userId, { status: "idle", touchLastSyncedAt: true });

    // Indexação para pesquisa semântica (Fase 6): deliberadamente DEPOIS de
    // o sync estar dado como concluído e sem `await` a bloquear o resultado.
    // Indexar 30 threads são vários segundos de chamadas de embeddings, e um
    // sync que funcionou não pode parecer falhado — nem falhar de verdade —
    // por causa de uma quota de embeddings esgotada. A pesquisa semântica
    // indexa o que faltar quando for usada.
    void indexPendingEmails(userId).catch((error) => {
      console.error("[sync] indexação semântica falhou (será retomada na próxima pesquisa):", error);
    });

    return { threadsSynced: synced };
  } catch (error) {
    const userMessage =
      error instanceof GmailError ? error.userMessage : "Não foi possível sincronizar o Gmail agora.";
    await setSyncStatus(userId, { status: "error", lastError: userMessage });
    throw error;
  }
}
