import "server-only";

import type { EmailParticipant } from "@/lib/db/schema";
import type { ThreadFolderEnum } from "@/lib/emails/types";
import type { GmailMessage, GmailMessagePart, GmailThread } from "./gmail-client";

// ── Headers ──────────────────────────────────────────────────────────────

function getHeader(payload: GmailMessagePart | undefined, name: string): string | null {
  const header = payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value ?? null;
}

/**
 * Parser simples de listas de participantes ("Nome" <email>, outro@ex.com).
 * Cobre a esmagadora maioria dos headers reais do Gmail sem puxar uma
 * dependência só para isto (spec §58 — não criar código desnecessário).
 */
export function parseParticipants(headerValue: string | null): EmailParticipant[] {
  if (!headerValue) return [];
  const participants: EmailParticipant[] = [];
  // Separa por vírgula, mas não dentro de aspas (nomes como "Silva, João").
  const parts = headerValue.match(/(?:[^,"]|"[^"]*")+/g) ?? [];

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    const angleMatch = part.match(/^(.*)<([^>]+)>$/);
    if (angleMatch) {
      const rawName = angleMatch[1].trim().replace(/^"|"$/g, "");
      const email = angleMatch[2].trim();
      if (email) participants.push({ name: rawName || null, email });
      continue;
    }
    if (part.includes("@")) {
      participants.push({ name: null, email: part });
    }
  }
  return participants;
}

function parseFromHeader(headerValue: string | null): { name: string | null; email: string } {
  const [participant] = parseParticipants(headerValue);
  return participant ?? { name: null, email: "desconhecido@gmail.com" };
}

// ── Corpo da mensagem ────────────────────────────────────────────────────

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extrai o corpo em texto simples de um payload Gmail (pode ser multipart).
 * Preferência: text/plain > text/html (convertido para texto) > vazio.
 * Nunca guardamos/renderizamos HTML de emails — a app só sabe mostrar texto
 * simples (spec §30/§31: conteúdo de email é sempre não confiável).
 */
export function extractBodyText(payload: GmailMessagePart | undefined): string {
  if (!payload) return "";

  let plainText: string | null = null;
  let htmlText: string | null = null;

  function walk(part: GmailMessagePart) {
    if (part.mimeType === "text/plain" && part.body?.data && plainText === null) {
      plainText = decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data && htmlText === null) {
      htmlText = decodeBase64Url(part.body.data);
    }
    for (const child of part.parts ?? []) walk(child);
  }
  walk(payload);

  if (plainText !== null) return (plainText as string).trim();
  if (htmlText !== null) return stripHtml(htmlText as string);
  return "";
}

// ── Thread/mensagem → schema interno ────────────────────────────────────

export interface MappedGmailMessage {
  gmailMessageId: string;
  rfcMessageId: string | null;
  fromName: string | null;
  fromEmail: string;
  to: EmailParticipant[];
  cc: EmailParticipant[];
  bcc: EmailParticipant[];
  bodyText: string;
  snippet: string;
  sentAt: Date;
  labelIds: string[];
}

export interface MappedGmailThread {
  gmailThreadId: string;
  subject: string;
  folder: ThreadFolderEnum;
  isStarred: boolean;
  isRead: boolean;
  lastMessageAt: Date;
  messages: MappedGmailMessage[];
}

function folderFromLabelIds(labelIds: string[]): ThreadFolderEnum {
  if (labelIds.includes("TRASH")) return "trash";
  if (labelIds.includes("DRAFT")) return "drafts";
  if (labelIds.includes("INBOX")) return "inbox";
  if (labelIds.includes("SENT")) return "sent";
  return "archive";
}

export function mapGmailMessage(message: GmailMessage): MappedGmailMessage {
  const payload = message.payload;
  const from = parseFromHeader(getHeader(payload, "From"));
  const labelIds = message.labelIds ?? [];

  return {
    gmailMessageId: message.id,
    rfcMessageId: getHeader(payload, "Message-ID"),
    fromName: from.name,
    fromEmail: from.email,
    to: parseParticipants(getHeader(payload, "To")),
    cc: parseParticipants(getHeader(payload, "Cc")),
    bcc: parseParticipants(getHeader(payload, "Bcc")),
    bodyText: extractBodyText(payload),
    snippet: message.snippet ?? "",
    sentAt: message.internalDate ? new Date(Number(message.internalDate)) : new Date(),
    labelIds,
  };
}

export function mapGmailThread(thread: GmailThread): MappedGmailThread | null {
  const rawMessages = thread.messages ?? [];
  if (rawMessages.length === 0) return null;

  const messages = rawMessages.map(mapGmailMessage);
  const lastMessage = messages[messages.length - 1];
  // União de labelIds de todas as mensagens: uma thread está "por ler" se
  // qualquer mensagem tiver UNREAD, e "com estrela" se qualquer uma tiver
  // STARRED — o mesmo critério que a própria UI do Gmail usa na lista.
  const allLabelIds = new Set(messages.flatMap((m) => m.labelIds));

  const subjectSource = rawMessages[0].payload;
  const subject = getHeader(subjectSource, "Subject") || "(sem assunto)";

  return {
    gmailThreadId: thread.id,
    subject,
    folder: folderFromLabelIds(lastMessage.labelIds),
    isStarred: allLabelIds.has("STARRED"),
    isRead: !allLabelIds.has("UNREAD"),
    lastMessageAt: lastMessage.sentAt,
    messages,
  };
}
