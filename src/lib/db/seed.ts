/**
 * Seed de desenvolvimento — cria o utilizador de demonstração usado no
 * "Demo Mode" (spec §47/48). Os emails/threads/tarefas fictícios entram na
 * Fase 2; aqui garantimos apenas que o login funciona out-of-the-box.
 *
 * Uso: pnpm db:seed  (o script já carrega .env.local via `node --env-file`)
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "./index";
import { users, userPreferences } from "./schema";

const DEMO_EMAIL = "demo@mailmind.app";
const DEMO_PASSWORD = "demo1234";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEMO_EMAIL))
    .limit(1);

  const userId =
    existing?.id ??
    (
      await db
        .insert(users)
        .values({
          name: "Demo User",
          email: DEMO_EMAIL,
          passwordHash,
        })
        .returning({ id: users.id })
    )[0].id;

  await db
    .insert(userPreferences)
    .values({
      userId,
      focusAreas: ["work", "projects", "clients"],
      aiAssistanceLevel: "balanced",
      onboardingCompletedAt: new Date(),
    })
    .onConflictDoNothing({ target: userPreferences.userId });

  console.log("✔ Seed concluído.");
  console.log(`  Login demo → ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  process.exit(0);
}

main().catch((error) => {
  console.error("✘ Falha no seed:", error);
  process.exit(1);
});
