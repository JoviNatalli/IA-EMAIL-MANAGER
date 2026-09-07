"use server";

/**
 * Server Actions da ligação ao Google Calendar (Fase 6, §21).
 *
 * Ligar é um redirect OAuth (`/api/google/calendar/connect`), não uma Server
 * Action — o browser tem de sair da app e voltar. Aqui fica só o que é
 * possível fazer com a ligação já feita: desligá-la.
 */
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { deleteGoogleOnlyEventForUser } from "@/lib/calendar/service";
import { revokeGoogleToken } from "@/lib/google/calendar-oauth";
import { CALENDAR_PROVIDER } from "@/lib/google/tokens";

export async function disconnectCalendar(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");
  const userId = session.user.id;

  const [account] = await db
    .select({ refresh_token: accounts.refresh_token, access_token: accounts.access_token })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, CALENDAR_PROVIDER)))
    .limit(1);

  // Revogar no Google antes de apagar localmente: desligar aqui e deixar a
  // autorização viva lá seria dar ao utilizador uma sensação falsa de
  // controlo (spec §32).
  const token = account?.refresh_token ?? account?.access_token;
  if (token) await revokeGoogleToken(token);

  await db
    .delete(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, CALENDAR_PROVIDER)));

  // Os eventos já criados no Google ficam lá — são do utilizador, não da
  // app. As referências locais é que deixam de fazer sentido manter.
  revalidatePath("/app/settings");
  revalidatePath("/app/calendar");
}

/**
 * Apaga um evento que existe SÓ no Google (não foi criado pelo Nuvoly, não
 * tem linha em `calendar_event`) diretamente pelo id da API. `deleteCalendarEvent`
 * em `actions/agent.ts` continua a ser para eventos com linha local.
 */
export async function deleteRemoteCalendarEvent(googleEventId: string): Promise<{ error: string | null }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");

  const result = await deleteGoogleOnlyEventForUser(session.user.id, z.string().min(1).parse(googleEventId));
  revalidatePath("/app/calendar");
  return result;
}
