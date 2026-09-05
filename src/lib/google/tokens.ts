import "server-only";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { GmailError, GmailNotConnectedError } from "./errors";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
// Renova um pouco antes de expirar de facto, para não arriscar uma chamada à
// Gmail API a meio com um token que expira nesse instante.
const EXPIRY_BUFFER_SECONDS = 60;

/**
 * Devolve um access_token do Google válido para este utilizador, renovando-o
 * via refresh_token quando necessário (e persistindo o novo token na tabela
 * `account` — a mesma que o `DrizzleAdapter` usa). Nunca devolve nem regista
 * o token em logs (spec §30).
 */
export async function getValidGoogleAccessToken(userId: string): Promise<string> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")))
    .limit(1);

  if (!account) {
    throw new GmailNotConnectedError();
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const isExpired =
    !account.access_token || !account.expires_at || account.expires_at - EXPIRY_BUFFER_SECONDS <= nowSeconds;

  if (!isExpired && account.access_token) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    throw new GmailError("Token expirado sem refresh_token disponível.", {
      userMessage: "A ligação à sua conta Gmail expirou. Ligue a conta novamente em Definições → Contas.",
      needsReconnect: true,
    });
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    throw new GmailError("AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET em falta no servidor.", {
      userMessage: "Integração Gmail mal configurada no servidor. Contacte o suporte.",
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
    throw new GmailError(`Falha ao renovar token Google (${response.status}): ${body}`, {
      userMessage: isRevoked
        ? "O acesso à sua conta Gmail foi revogado. Ligue a conta novamente em Definições → Contas."
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
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")));

  return data.access_token;
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
