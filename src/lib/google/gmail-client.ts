import "server-only";

import { GmailError } from "./errors";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

// ── Tipos mínimos da Gmail API que realmente usamos ────────────────────────
// (a API devolve muito mais campos; só se tipa o que é lido, spec §58.)

export interface GmailMessagePart {
  mimeType?: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
}

export interface GmailThread {
  id: string;
  historyId?: string;
  messages?: GmailMessage[];
}

export interface GmailThreadListItem {
  id: string;
  historyId?: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: "system" | "user";
}

export interface GmailProfile {
  emailAddress: string;
  historyId: string;
}

function friendlyMessageFor(status: number): { userMessage: string; needsReconnect: boolean } {
  if (status === 401) {
    return {
      userMessage: "A sua sessão Gmail expirou. Ligue a conta novamente em Definições → Contas.",
      needsReconnect: true,
    };
  }
  if (status === 403) {
    return {
      userMessage:
        "O Google recusou este pedido (permissões insuficientes). Ligue a conta novamente para conceder todos os acessos pedidos.",
      needsReconnect: true,
    };
  }
  if (status === 429) {
    return {
      userMessage: "Demasiados pedidos ao Gmail agora. Aguarde um momento e tente novamente.",
      needsReconnect: false,
    };
  }
  if (status >= 500) {
    return { userMessage: "O Gmail está indisponível agora. Tente novamente daqui a pouco.", needsReconnect: false };
  }
  return { userMessage: "Não foi possível completar a operação no Gmail.", needsReconnect: false };
}

async function gmailFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${GMAIL_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (cause) {
    throw new GmailError("Falha de rede ao chamar a Gmail API.", {
      userMessage: "Não foi possível ligar ao Gmail agora. Verifique a sua ligação e tente novamente.",
      cause,
    });
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const { userMessage, needsReconnect } = friendlyMessageFor(response.status);
    throw new GmailError(`Gmail API ${path} → ${response.status}: ${body}`, {
      userMessage,
      needsReconnect,
    });
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function getProfile(accessToken: string): Promise<GmailProfile> {
  return gmailFetch<GmailProfile>(accessToken, "/profile");
}

export async function listLabels(accessToken: string): Promise<GmailLabel[]> {
  const { labels } = await gmailFetch<{ labels: GmailLabel[] }>(accessToken, "/labels");
  return labels ?? [];
}

/** Lista os ids das threads mais recentes (sem o conteúdo — um pedido por thread é preciso para isso). */
export async function listThreadIds(
  accessToken: string,
  options: { maxResults?: number; pageToken?: string; q?: string } = {},
): Promise<{ threads: GmailThreadListItem[]; nextPageToken?: string }> {
  const params = new URLSearchParams();
  params.set("maxResults", String(options.maxResults ?? 30));
  if (options.pageToken) params.set("pageToken", options.pageToken);
  if (options.q) params.set("q", options.q);

  const data = await gmailFetch<{ threads?: GmailThreadListItem[]; nextPageToken?: string }>(
    accessToken,
    `/threads?${params.toString()}`,
  );
  return { threads: data.threads ?? [], nextPageToken: data.nextPageToken };
}

export async function getThread(accessToken: string, threadId: string): Promise<GmailThread> {
  return gmailFetch<GmailThread>(accessToken, `/threads/${threadId}?format=full`);
}

export async function modifyMessage(
  accessToken: string,
  messageId: string,
  body: { addLabelIds?: string[]; removeLabelIds?: string[] },
): Promise<void> {
  await gmailFetch(accessToken, `/messages/${messageId}/modify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function trashMessage(accessToken: string, messageId: string): Promise<void> {
  await gmailFetch(accessToken, `/messages/${messageId}/trash`, { method: "POST" });
}

export async function untrashMessage(accessToken: string, messageId: string): Promise<void> {
  await gmailFetch(accessToken, `/messages/${messageId}/untrash`, { method: "POST" });
}

/** Apagar definitivamente (spec: irreversível — só chamado a partir de uma ação já confirmada pelo utilizador na UI). */
export async function deleteMessagePermanently(accessToken: string, messageId: string): Promise<void> {
  await gmailFetch(accessToken, `/messages/${messageId}`, { method: "DELETE" });
}

export async function sendRawMessage(
  accessToken: string,
  raw: string,
  threadId?: string,
): Promise<GmailMessage> {
  return gmailFetch<GmailMessage>(accessToken, "/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw, ...(threadId ? { threadId } : {}) }),
  });
}

export interface GmailDraft {
  id: string;
  message: GmailMessage;
}

export async function createDraft(accessToken: string, raw: string, threadId?: string): Promise<GmailDraft> {
  return gmailFetch<GmailDraft>(accessToken, "/drafts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: { raw, ...(threadId ? { threadId } : {}) } }),
  });
}

export async function updateDraft(
  accessToken: string,
  draftId: string,
  raw: string,
  threadId?: string,
): Promise<GmailDraft> {
  return gmailFetch<GmailDraft>(accessToken, `/drafts/${draftId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: { raw, ...(threadId ? { threadId } : {}) } }),
  });
}

export async function sendDraft(accessToken: string, draftId: string): Promise<GmailMessage> {
  return gmailFetch<GmailMessage>(accessToken, "/drafts/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: draftId }),
  });
}
