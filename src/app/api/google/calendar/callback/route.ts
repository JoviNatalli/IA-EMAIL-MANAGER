/**
 * Retorno do consentimento do Google Calendar (Fase 6, §21).
 *
 * Guarda a autorização numa linha própria de `account`
 * (`provider: "google-calendar"`), independente da do Gmail. O utilizador
 * volta sempre a `/app/settings` com um parâmetro que diz o que aconteceu —
 * nunca um ecrã de erro cru (§35).
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { CALENDAR_STATE_COOKIE, exchangeCalendarCode } from "@/lib/google/calendar-oauth";
import { CALENDAR_PROVIDER } from "@/lib/google/tokens";

function settingsUrl(status: string): URL {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL("/app/settings", base);
  url.searchParams.set("calendar", status);
  return url;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const jar = await cookies();
  const expectedState = jar.get(CALENDAR_STATE_COOKIE)?.value;
  jar.delete(CALENDAR_STATE_COOKIE);

  // O utilizador carregou em "Cancelar" no ecrã do Google.
  if (error) return NextResponse.redirect(settingsUrl("cancelled"));

  // State ausente ou diferente = pedido que não começou aqui (§30).
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(settingsUrl("invalid"));
  }

  try {
    const grant = await exchangeCalendarCode(code);

    await db
      .insert(accounts)
      .values({
        userId: session.user.id,
        type: "oauth",
        provider: CALENDAR_PROVIDER,
        providerAccountId: grant.googleUserId,
        access_token: grant.accessToken,
        refresh_token: grant.refreshToken,
        expires_at: grant.expiresAt,
        scope: grant.scope,
        token_type: grant.tokenType,
      })
      .onConflictDoUpdate({
        target: [accounts.provider, accounts.providerAccountId],
        set: {
          userId: session.user.id,
          access_token: grant.accessToken,
          // Uma reautorização pode não devolver refresh_token novo; nesse
          // caso o antigo continua válido e não pode ser apagado.
          ...(grant.refreshToken ? { refresh_token: grant.refreshToken } : {}),
          expires_at: grant.expiresAt,
          scope: grant.scope,
          token_type: grant.tokenType,
        },
      });

    return NextResponse.redirect(settingsUrl("connected"));
  } catch (cause) {
    console.error("[calendar-oauth] falha a ligar o Google Calendar:", cause);
    return NextResponse.redirect(settingsUrl("error"));
  }
}
