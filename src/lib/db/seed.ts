/**
 * Seed de desenvolvimento — cria o utilizador de demonstração e o dataset
 * fictício de emails/threads/labels usado no "Demo Mode" (spec §47/48).
 *
 * Idempotente: pode correr várias vezes sem duplicar dados — o utilizador
 * demo é reaproveitado e as threads/labels dele são substituídas do zero
 * a cada corrida, para que os timestamps relativos (`hoursAgo`) fiquem
 * sempre atuais.
 *
 * Uso: pnpm db:seed  (o script já carrega .env.local via `tsx --env-file`)
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "./index";
import { users, userPreferences, threads, emails, attachments, labels, threadLabels } from "./schema";
import { DEMO_USER_EMAIL, DEMO_USER_NAME, DEMO_LABELS, DEMO_THREADS } from "./seed-data";

const DEMO_PASSWORD = "demo1234";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEMO_USER_EMAIL))
    .limit(1);

  const userId =
    existing?.id ??
    (
      await db
        .insert(users)
        .values({
          name: DEMO_USER_NAME,
          email: DEMO_USER_EMAIL,
          passwordHash,
        })
        .returning({ id: users.id })
    )[0].id;

  // Garante que o nome/password ficam sempre consistentes com este seed,
  // mesmo que o utilizador já existisse de uma corrida anterior.
  await db
    .update(users)
    .set({ name: DEMO_USER_NAME, passwordHash })
    .where(eq(users.id, userId));

  await db
    .insert(userPreferences)
    .values({
      userId,
      focusAreas: ["work", "projects", "clients"],
      aiAssistanceLevel: "balanced",
      onboardingCompletedAt: new Date(),
    })
    .onConflictDoNothing({ target: userPreferences.userId });

  // Reset do dataset de email deste utilizador (cascade apaga emails,
  // attachments e thread_label associados).
  await db.delete(threads).where(eq(threads.userId, userId));
  await db.delete(labels).where(eq(labels.userId, userId));

  const labelIdByName = new Map<string, string>();
  for (const label of DEMO_LABELS) {
    const [row] = await db
      .insert(labels)
      .values({ userId, name: label.name, color: label.color })
      .returning({ id: labels.id });
    labelIdByName.set(label.name, row.id);
  }

  const now = Date.now();
  let threadCount = 0;
  let emailCount = 0;

  for (const thread of DEMO_THREADS) {
    const lastMessage = thread.messages[thread.messages.length - 1];
    const lastMessageAt = new Date(now - lastMessage.hoursAgo * 60 * 60 * 1000);

    const [threadRow] = await db
      .insert(threads)
      .values({
        userId,
        subject: thread.subject,
        folder: thread.folder,
        isStarred: thread.isStarred ?? false,
        isRead: thread.isRead ?? true,
        priority: thread.priority ?? "medium",
        category: thread.category,
        lastMessageAt,
      })
      .returning({ id: threads.id });
    threadCount += 1;

    for (const label of thread.labels ?? []) {
      const labelId = labelIdByName.get(label);
      if (!labelId) continue;
      await db.insert(threadLabels).values({ threadId: threadRow.id, labelId });
    }

    for (const message of thread.messages) {
      const sentAt = message.draft
        ? null
        : new Date(now - message.hoursAgo * 60 * 60 * 1000);
      const snippet = message.body.replace(/\s+/g, " ").trim().slice(0, 160);

      const [emailRow] = await db
        .insert(emails)
        .values({
          threadId: threadRow.id,
          fromName: message.fromName,
          fromEmail: message.fromEmail,
          to: message.to ?? [],
          cc: message.cc ?? [],
          bcc: [],
          bodyText: message.body,
          snippet,
          sentAt,
        })
        .returning({ id: emails.id });
      emailCount += 1;

      if (message.attachments?.length) {
        await db.insert(attachments).values(
          message.attachments.map((a) => ({
            emailId: emailRow.id,
            fileName: a.fileName,
            fileType: a.fileType,
            fileSizeBytes: a.fileSizeBytes,
          })),
        );
      }
    }
  }

  console.log("✔ Seed concluído.");
  console.log(`  Login demo → ${DEMO_USER_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  ${labelIdByName.size} labels, ${threadCount} threads, ${emailCount} emails.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("✘ Falha no seed:", error);
  process.exit(1);
});
