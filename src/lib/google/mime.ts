import "server-only";

import type { EmailParticipant } from "@/lib/db/schema";

function formatParticipant(p: EmailParticipant): string {
  return p.name ? `${encodeHeaderValue(p.name)} <${p.email}>` : p.email;
}

/** RFC 2047 encoded-word para headers com acentos (assunto/nome em PT-PT) — ASCII puro passa sem alterações. */
function encodeHeaderValue(value: string): string {
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface OutgoingEmail {
  from: string;
  to: EmailParticipant[];
  cc?: EmailParticipant[];
  bcc?: EmailParticipant[];
  subject: string;
  bodyText: string;
  /** Para respostas: encadeia a mensagem no thread do Gmail e no cliente do destinatário. */
  inReplyToMessageId?: string;
  referencesMessageIds?: string[];
}

/**
 * Constrói uma mensagem RFC 2822 simples (texto plano, UTF-8) e devolve-a já
 * em base64url — o formato que a Gmail API (`messages.send`/`drafts.create`)
 * espera no campo `raw`.
 */
export function buildRawMimeMessage(email: OutgoingEmail): string {
  const headers: string[] = [
    `From: ${email.from}`,
    `To: ${email.to.map(formatParticipant).join(", ")}`,
  ];
  if (email.cc?.length) headers.push(`Cc: ${email.cc.map(formatParticipant).join(", ")}`);
  if (email.bcc?.length) headers.push(`Bcc: ${email.bcc.map(formatParticipant).join(", ")}`);
  headers.push(`Subject: ${encodeHeaderValue(email.subject)}`);
  headers.push("MIME-Version: 1.0");
  headers.push('Content-Type: text/plain; charset="UTF-8"');
  headers.push("Content-Transfer-Encoding: 8bit");
  if (email.inReplyToMessageId) headers.push(`In-Reply-To: ${email.inReplyToMessageId}`);
  if (email.referencesMessageIds?.length) headers.push(`References: ${email.referencesMessageIds.join(" ")}`);

  const raw = `${headers.join("\r\n")}\r\n\r\n${email.bodyText}`;
  return base64UrlEncode(raw);
}
