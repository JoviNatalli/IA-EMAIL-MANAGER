"use server";

/**
 * Server Actions da conta Gmail ligada (Fase 3, Definições → Contas). Ligar
 * a conta em si é feita via `signInWithGoogle` (src/app/actions/auth.ts) —
 * o próprio fluxo OAuth do Auth.js. Isto cobre o que vem depois de ligada:
 * sincronizar e desligar.
 */
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { accounts, gmailSync } from "@/lib/db/schema";
import { GmailError } from "@/lib/google/errors";
import { runGmailSync } from "@/lib/google/sync";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");
  return session.user.id;
}

export type GmailSyncActionState =
  | { status: "idle" }
  | { status: "success"; threadsSynced: number; mode: "full" | "incremental" }
  | { status: "error"; message: string };

/**
 * Decide sozinho entre sync completo e incremental (Fase 6, §3 do README
 * "Future Improvements" original da Fase 3 — `historyId` já era guardado
 * desde então, só não era usado). Primeira sincronização de uma conta, ou
 * histórico fora da janela de retenção do Gmail: completo. Caso contrário,
 * só o que mudou.
 */
export async function triggerGmailSync(): Promise<GmailSyncActionState> {
  const userId = await requireUserId();
  try {
    const result = await runGmailSync(userId);
    revalidatePath("/app", "layout");
    revalidatePath("/app/settings");
    return { status: "success", threadsSynced: result.threadsSynced, mode: result.mode };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof GmailError ? error.userMessage : "Não foi possível sincronizar o Gmail agora.",
    };
  }
}

/**
 * Desliga a conta Gmail localmente (apaga o registo OAuth). As threads já
 * sincronizadas ficam na app tal como estão — não são apagadas — mas deixam
 * de poder ser atualizadas até a conta ser ligada de novo. Não revoga o
 * acesso do lado da Google (isso faz-se em myaccount.google.com/permissions,
 * como a generalidade das apps que ligam contas Google).
 */
export async function disconnectGmailAccount(): Promise<void> {
  const userId = await requireUserId();
  await db.delete(accounts).where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")));
  await db.delete(gmailSync).where(eq(gmailSync.userId, userId));
  revalidatePath("/app/settings");
}
