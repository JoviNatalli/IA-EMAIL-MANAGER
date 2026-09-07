import "server-only";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { CalendarError, CalendarNotConnectedError } from "./calendar-errors";
import { GmailError, GmailNotConnectedError } from "./errors";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
// Renova um pouco antes de expirar de facto, para não arriscar uma chamada à
// Gmail API a meio com um token que expira nesse instante.
const EXPIRY_BUFFER_SECONDS = 60;

/**
 * Fase 6: o Gmail e o Calendar são DUAS ligações independentes, guardadas em
 * duas linhas de `account` com `provider` diferente. Renová-las é o mesmo
 * fluxo OAuth; o que muda é a linha a ler e a mensagem de erro que o
 * utilizador vê (§35 — nunca "falhou o refresh do token").
 */
interface TokenSource {
  /** Valor da coluna `provider` na tabela `account`. */
  provider: string;
  fail(message: string, options: { userMessage: string; needsReconnect?: boolean }): Error;
  notConnected(): Error;
  /** Onde o utilizador vai resolver isto, para a mensagem ser acionável. */
  reconnectHint: string;
}

const GMAIL_SOURCE: TokenSource = {
  provider: "google",
  fail: (message, options) => new GmailError(message, options),
  notConnected: () => new GmailNotConnectedError(),
  reconnectHint: "a sua conta Gmail",
};

/**
 * O Calendar tem `provider: "google-calendar"` — uma linha só dele.
 *
 * Assim o utilizador pode ligar o calendário sem ligar o Gmail (e desligar um
 * sem perder o outro), e o scope extra nunca aparece no ecrã de login.
 */
export const CALENDAR_PROVIDER = "google-calendar";

const CALENDAR_SOURCE: TokenSource = {
  provider: CALENDAR_PROVIDER,
  fail: (message, options) => new CalendarError(message, options),
  notConnected: () => new CalendarNotConnectedError(),
  reconnectHint: "o Google Calendar",
};

async function getValidAccessToken(userId: string, source: TokenSource): Promise<string> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, source.provider)))
    .limit(1);

  if (!account) {
    throw source.notConnected();
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const isExpired =
    !account.access_token || !account.expires_at || account.expires_at - EXPIRY_BUFFER_SECONDS <= nowSeconds;

  if (!isExpired && account.access_token) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    throw source.fail("Token expirado sem refresh_token disponível.", {
      userMessage: `A ligação a ${source.reconnectHint} expirou. Ligue novamente em Definições → Contas.`,
      needsReconnect: true,
    });
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    throw source.fail("AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET em falta no servidor.", {
      userMessage: "Integração Google mal configurada no servidor. Contacte o suporte.",
    });
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const isRevoked = response.status === 400 || response.status === 401;
    throw source.fail(`Falha ao renovar token Google (${response.status}): ${body}`, {
      userMessage: isRevoked
        ? `O acesso a ${source.reconnectHint} foi revogado. Ligue novamente em Definições → Contas.`
        : "Não foi possível comunicar com o Google agora. Tente novamente daqui a pouco.",
      needsReconnect: isRevoked,
    });
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
    // O Google só devolve um novo refresh_token em alguns casos — mantém-se
    // o antigo quando ele não vem na resposta.
    refresh_token?: string;
  };

  const newExpiresAt = Math.floor(Date.now() / 1000) + data.expires_in;

  await db
    .update(accounts)
    .set({
      access_token: data.access_token,
      expires_at: newExpiresAt,
      refresh_token: data.refresh_token ?? account.refresh_token,
      token_type: data.token_type ?? account.token_type,
      scope: data.scope ?? account.scope,
    })
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, source.provider)));

  return data.access_token;
}

/**
 * Devolve um access_token do Google válido para o Gmail deste utilizador,
 * renovando-o via refresh_token quando necessário (e persistindo o novo token
 * na tabela `account` — a mesma que o `DrizzleAdapter` usa). Nunca devolve
 * nem regista o token em logs (spec §30).
 */
export function getValidGoogleAccessToken(userId: string): Promise<string> {
  return getValidAccessToken(userId, GMAIL_SOURCE);
}

/** O mesmo, para a ligação separada do Google Calendar (Fase 6, §21). */
export function getValidCalendarAccessToken(userId: string): Promise<string> {
  return getValidAccessToken(userId, CALENDAR_SOURCE);
}

/** Verifica (sem lançar) se este utilizador tem uma conta Google ligada. */
export async function hasGoogleAccountLinked(userId: string): Promise<boolean> {
  const [account] = await db
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")))
    .limit(1);
  return !!account;
}

/** Verifica (sem lançar) se o Google Calendar está ligado. */
export async function hasCalendarLinked(userId: string): Promise<boolean> {
  const [account] = await db
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, CALENDAR_PROVIDER)))
    .limit(1);
  return !!account;
}
