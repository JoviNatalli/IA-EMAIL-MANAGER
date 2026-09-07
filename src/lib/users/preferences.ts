/**
 * Leitura de preferências do utilizador que vivem fora do fluxo de
 * onboarding (Fase 6). Função pura de acesso a dados — a escrita (Server
 * Action, com validação de input) fica em `src/app/actions/preferences.ts`.
 */
import "server-only";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { userPreferences } from "@/lib/db/schema";

export async function getUserTimeZone(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ timeZone: userPreferences.timeZone })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  return row?.timeZone ?? null;
}
