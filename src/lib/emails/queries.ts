/**
 * Leituras de email (Fase 2). Tudo aqui assume `userId` já autenticado e
 * validado pelo chamador (Server Component ou Server Action) — nunca
 * confiar num `userId` vindo do cliente.
 */
import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  attachments,
  emails,
  labels,
  threadLabels,
  threads,
  type EmailParticipant,
} from "@/lib/db/schema";
import type { ThreadCategoryEnum, ThreadFolderEnum, ThreadPriorityEnum } from "./types";

export type ThreadScope =
  | { type: "folder"; folder: ThreadFolderEnum }
  | { type: "starred" }
  | { type: "important" }
  | { type: "label"; labelId: string }
  | { type: "search"; query: string };

export interface ThreadLabelInfo {
  id: string;
  name: string;
  color: string;
}

export interface ThreadListItem {
  id: string;
  subject: string;
  folder: ThreadFolderEnum;
  isStarred: boolean;
  isRead: boolean;
  priority: ThreadPriorityEnum;
  category: ThreadCategoryEnum | null;
  lastMessageAt: Date;
  messageCount: number;
  hasAttachments: boolean;
  labels: ThreadLabelInfo[];
  lastMessage: {
    fromName: string | null;
    fromEmail: string;
    snippet: string;
    sentAt: Date | null;
  };
}

export interface ThreadMessage {
  id: string;
  fromName: string | null;
  fromEmail: string;
  to: EmailParticipant[];
  cc: EmailParticipant[];
  bcc: EmailParticipant[];
  bodyText: string;
  snippet: string;
  sentAt: Date | null;
  createdAt: Date;
  attachments: { id: string; fileName: string; fileType: string; fileSizeBytes: number }[];
}

export interface ThreadDetail {
  id: string;
  subject: string;
  folder: ThreadFolderEnum;
  isStarred: boolean;
  isRead: boolean;
  priority: ThreadPriorityEnum;
  category: ThreadCategoryEnum | null;
  lastMessageAt: Date;
  labels: ThreadLabelInfo[];
  messages: ThreadMessage[];
}

function toListItem(row: {
  id: string;
  subject: string;
  folder: ThreadFolderEnum;
  isStarred: boolean;
  isRead: boolean;
  priority: ThreadPriorityEnum;
  category: ThreadCategoryEnum | null;
  lastMessageAt: Date;
  emails: {
    fromName: string | null;
    fromEmail: string;
    snippet: string;
    sentAt: Date | null;
    createdAt: Date;
    attachments: unknown[];
  }[];
  threadLabels: { label: { id: string; name: string; color: string } }[];
}): ThreadListItem {
  const orderedEmails = [...row.emails].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const last = orderedEmails[orderedEmails.length - 1];

  return {
    id: row.id,
    subject: row.subject,
    folder: row.folder,
    isStarred: row.isStarred,
    isRead: row.isRead,
    priority: row.priority,
    category: row.category,
    lastMessageAt: row.lastMessageAt,
    messageCount: orderedEmails.length,
    hasAttachments: orderedEmails.some((e) => e.attachments.length > 0),
    labels: row.threadLabels.map((tl) => tl.label),
    lastMessage: {
      fromName: last?.fromName ?? null,
      fromEmail: last?.fromEmail ?? "",
      snippet: last?.snippet ?? "",
      sentAt: last?.sentAt ?? null,
    },
  };
}

const listWith = {
  emails: { with: { attachments: true } },
  threadLabels: { with: { label: true } },
} as const;

export async function listThreads(
  userId: string,
  scope: ThreadScope,
): Promise<ThreadListItem[]> {
  if (scope.type === "search") {
    return searchThreads(userId, scope.query);
  }

  if (scope.type === "label") {
    const rows = await db.query.threadLabels.findMany({
      where: eq(threadLabels.labelId, scope.labelId),
      with: { thread: { with: listWith } },
    });
    return rows
      .map((r) => r.thread)
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
      .map(toListItem);
  }

  const where =
    scope.type === "folder"
      ? and(eq(threads.userId, userId), eq(threads.folder, scope.folder))
      : scope.type === "starred"
        ? and(eq(threads.userId, userId), eq(threads.isStarred, true), inArray(threads.folder, ["inbox", "sent", "archive", "drafts"]))
        : /* important */ and(
            eq(threads.userId, userId),
            eq(threads.priority, "high"),
            eq(threads.folder, "inbox"),
          );

  const rows = await db.query.threads.findMany({
    where,
    orderBy: [desc(threads.lastMessageAt)],
    with: listWith,
  });

  return rows.map(toListItem);
}

async function searchThreads(userId: string, rawQuery: string): Promise<ThreadListItem[]> {
  const query = rawQuery.trim();
  if (!query) return [];
  const pattern = `%${query}%`;

  const matchingEmailThreadIds = await db
    .selectDistinct({ threadId: emails.threadId })
    .from(emails)
    .innerJoin(threads, eq(threads.id, emails.threadId))
    .where(
      and(
        eq(threads.userId, userId),
        or(
          ilike(emails.bodyText, pattern),
          ilike(emails.fromName, pattern),
          ilike(emails.fromEmail, pattern),
          ilike(threads.subject, pattern),
        ),
      ),
    );

  const ids = matchingEmailThreadIds.map((r) => r.threadId);
  if (ids.length === 0) return [];

  const rows = await db.query.threads.findMany({
    where: and(eq(threads.userId, userId), inArray(threads.id, ids)),
    orderBy: [desc(threads.lastMessageAt)],
    with: listWith,
  });

  return rows.map(toListItem).slice(0, 50);
}

export async function getThread(userId: string, threadId: string): Promise<ThreadDetail | null> {
  const row = await db.query.threads.findFirst({
    where: and(eq(threads.id, threadId), eq(threads.userId, userId)),
    with: {
      emails: { with: { attachments: true }, orderBy: [asc(emails.createdAt)] },
      threadLabels: { with: { label: true } },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    subject: row.subject,
    folder: row.folder,
    isStarred: row.isStarred,
    isRead: row.isRead,
    priority: row.priority,
    category: row.category,
    lastMessageAt: row.lastMessageAt,
    labels: row.threadLabels.map((tl) => tl.label),
    messages: row.emails.map((e) => ({
      id: e.id,
      fromName: e.fromName,
      fromEmail: e.fromEmail,
      to: e.to,
      cc: e.cc,
      bcc: e.bcc,
      bodyText: e.bodyText,
      snippet: e.snippet,
      sentAt: e.sentAt,
      createdAt: e.createdAt,
      attachments: e.attachments,
    })),
  };
}

export interface FolderCounts {
  inbox: number;
  important: number;
  starred: number;
  sent: number;
  drafts: number;
  archive: number;
  trash: number;
}

/** Contagens para os badges da sidebar — inbox/important/starred contam não-lidos; as restantes o total. */
export async function getFolderCounts(userId: string): Promise<FolderCounts> {
  const rows = await db
    .select({
      folder: threads.folder,
      isRead: threads.isRead,
      isStarred: threads.isStarred,
      priority: threads.priority,
    })
    .from(threads)
    .where(eq(threads.userId, userId));

  const counts: FolderCounts = {
    inbox: 0,
    important: 0,
    starred: 0,
    sent: 0,
    drafts: 0,
    archive: 0,
    trash: 0,
  };

  for (const row of rows) {
    if (row.folder === "inbox" && !row.isRead) counts.inbox += 1;
    if (row.folder === "inbox" && row.priority === "high" && !row.isRead) counts.important += 1;
    if (row.isStarred && row.folder !== "trash") counts.starred += 1;
    if (row.folder === "sent") counts.sent += 1;
    if (row.folder === "drafts") counts.drafts += 1;
    if (row.folder === "archive") counts.archive += 1;
    if (row.folder === "trash") counts.trash += 1;
  }

  return counts;
}

export interface LabelWithCount {
  id: string;
  name: string;
  color: string;
  threadCount: number;
}

export async function listLabels(userId: string): Promise<LabelWithCount[]> {
  const rows = await db.query.labels.findMany({
    where: eq(labels.userId, userId),
    orderBy: [asc(labels.name)],
    with: { threadLabels: true },
  });
  return rows.map((l) => ({
    id: l.id,
    name: l.name,
    color: l.color,
    threadCount: l.threadLabels.length,
  }));
}

export async function getLabel(userId: string, labelId: string) {
  return db.query.labels.findFirst({
    where: and(eq(labels.id, labelId), eq(labels.userId, userId)),
  });
}

/** Para o painel To/Cc de um Reply — participantes conhecidos (senders já vistos). */
export async function listKnownContacts(userId: string): Promise<EmailParticipant[]> {
  const rows = await db
    .select({ fromName: emails.fromName, fromEmail: emails.fromEmail })
    .from(emails)
    .innerJoin(threads, eq(threads.id, emails.threadId))
    .where(eq(threads.userId, userId));

  const byEmail = new Map<string, EmailParticipant>();
  for (const r of rows) {
    if (!byEmail.has(r.fromEmail)) {
      byEmail.set(r.fromEmail, { name: r.fromName, email: r.fromEmail });
    }
  }
  return Array.from(byEmail.values());
}

export { attachments };
