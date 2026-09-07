"use server";

/**
 * Preferências do utilizador que não pertencem ao onboarding (Fase 6).
 */
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/db/schema";

const timeZoneSchema = z.string().min(1).max(100);

/**
 * Guarda o fuso IANA (ex. "Europe/Lisbon") reportado pelo browser.
 *
 * Chamada uma vez por sessão pelo `TimeZoneSync` no layout da app — nunca
 * confiamos num fuso vindo de outro sítio, e nunca inferimos um a partir do
 * IP ou de qualquer coisa do servidor (§30, dados do utilizador vêm do
 * próprio utilizador).
 */
export async function setUserTimeZone(timeZone: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const parsed = timeZoneSchema.safeParse(timeZone);
  if (!parsed.success) return;

  // `Intl.DateTimeFormat` valida o fuso ao construir — um valor inventado
  // (não vindo mesmo do browser) lança aqui em vez de ficar gravado.
  try {
    Intl.DateTimeFormat(undefined, { timeZone: parsed.data });
  } catch {
    return;
  }

  await db
    .insert(userPreferences)
    .values({ userId: session.user.id, timeZone: parsed.data })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { timeZone: parsed.data, updatedAt: new Date() },
    });
}
