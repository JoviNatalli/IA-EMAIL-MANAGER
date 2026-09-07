/**
 * Início do fluxo de autorização do Google Calendar (Fase 6, §21).
 */
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { buildCalendarAuthUrl, CALENDAR_STATE_COOKIE } from "@/lib/google/calendar-oauth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const state = randomBytes(32).toString("hex");
  const jar = await cookies();
  jar.set(CALENDAR_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(buildCalendarAuthUrl(state));
}
