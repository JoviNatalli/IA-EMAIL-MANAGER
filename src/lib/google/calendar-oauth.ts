/**
 * Autorização incremental do Google Calendar (Fase 6, §21).
 *
 * Fluxo OAuth próprio, à mão, em vez de um segundo provider do Auth.js: o
 * Auth.js trata de AUTENTICAR (quem é o utilizador) e ligar a conta ao
 * arranque da sessão; aqui não se autentica ninguém — já há sessão — só se
 * pede uma autorização adicional a uma API. Enfiar isto no `signIn` traria
 * de volta o bug de account-linking da Fase 3 (ver master-spec, decisões da
 * Fase 3) e obrigaria a passar pelo ecrã de login outra vez.
 */
import "server-only";

import { CALENDAR_OAUTH_SCOPES } from "./scopes";

const AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo";

/** Cookie com o `state` do OAuth — defesa CSRF (spec §30). */
export const CALENDAR_STATE_COOKIE = "nuvoly.calendar_oauth_state";

export function calendarRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/google/calendar/callback`;
}

export function requireGoogleClient(): { clientId: string; clientSecret: string } {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET em falta no servidor.");
  }
  return { clientId, clientSecret };
}

export function buildCalendarAuthUrl(state: string): string {
  const { clientId } = requireGoogleClient();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: calendarRedirectUri(),
    response_type: "code",
    scope: CALENDAR_OAUTH_SCOPES.join(" "),
    // `offline` + `consent` para garantir refresh_token: sem ele, criar um
    // evento uma hora depois de ligar o calendário falharia (Fase 3 já
    // tinha aprendido isto com o Gmail).
    access_type: "offline",
    prompt: "consent",
    // Mantém os scopes do Gmail que o utilizador já tenha concedido, em vez
    // de os substituir por este.
    include_granted_scopes: "true",
    state,
  });
  return `${AUTHORIZE_ENDPOINT}?${params}`;
}

export interface CalendarTokenGrant {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  scope: string | null;
  tokenType: string | null;
  googleUserId: string;
}

export async function exchangeCalendarCode(code: string): Promise<CalendarTokenGrant> {
  const { clientId, clientSecret } = requireGoogleClient();

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: calendarRedirectUri(),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Troca de código OAuth falhou (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
  };

  // O `sub` identifica a conta Google concreta; é a chave que a tabela
  // `account` do Auth.js exige (`providerAccountId`) e o que permite dizer
  // ao utilizador QUE conta é que ele ligou.
  const userinfo = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  if (!userinfo.ok) {
    throw new Error(`Não foi possível identificar a conta Google (${userinfo.status}).`);
  }
  const profile = (await userinfo.json()) as { sub?: string };
  if (!profile.sub) throw new Error("Resposta de userinfo sem `sub`.");

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
    scope: data.scope ?? null,
    tokenType: data.token_type ?? null,
    googleUserId: profile.sub,
  };
}

/** Revoga o token no Google — desligar aqui tem de desligar lá também (§32). */
export async function revokeGoogleToken(token: string): Promise<void> {
  await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  }).catch(() => {
    // Falhar a revogar não pode impedir o utilizador de desligar localmente.
  });
}
