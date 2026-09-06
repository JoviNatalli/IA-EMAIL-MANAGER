/**
 * Daily AI Briefing (spec §19).
 *
 * Decisão de âmbito: implementado na Fase 5 e não na 6 porque só agora
 * existem os dados que o tornam útil (tarefas, eventos e a marca
 * `requiresReply` da análise da Fase 4) — fazê-lo antes seria repetir
 * contagens que a sidebar já mostra.
 *
 * Os NÚMEROS e os destaques são calculados aqui, em SQL, não pelo modelo. O
 * LLM só escreve o texto por cima deles (uma chamada), e o prompt proíbe-o
 * de inventar contagens. Assim o briefing nunca "alucina" que há 5 emails
 * urgentes quando há 1.
 */
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { aiAnalysis, calendarEvents, tasks, threads } from "@/lib/db/schema";
import { getFolderCounts } from "@/lib/emails/queries";
import { buildBriefingPrompt } from "./prompts";
import { getAIProvider } from "./provider";
import { dailyBriefingSchema, type DailyBriefing } from "./schemas";

export interface BriefingData {
  unreadCount: number;
  importantCount: number;
  needsReplyCount: number;
  draftsCount: number;
  openTaskCount: number;
  upcomingEventCount: number;
  highlights: string[];
  /** `true` quando ainda não há análises de IA para dar contexto real. */
  analysisMissing: boolean;
}

export async function collectBriefingData(userId: string): Promise<BriefingData> {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 86_400_000);

  const [counts, userThreads, openTasks, upcomingEvents] = await Promise.all([
    getFolderCounts(userId),
    db.query.threads.findMany({
      where: and(eq(threads.userId, userId), inArray(threads.folder, ["inbox"])),
      orderBy: [desc(threads.lastMessageAt)],
      columns: { id: true, subject: true, isRead: true },
      limit: 50,
    }),
    db
      .select({ title: tasks.title, dueDate: tasks.dueDate })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.isDone, false)))
      .orderBy(tasks.dueDate)
      .limit(5),
    db
      .select({ title: calendarEvents.title, startsAt: calendarEvents.startsAt })
      .from(calendarEvents)
      .where(
        and(eq(calendarEvents.userId, userId), gte(calendarEvents.startsAt, now), lte(calendarEvents.startsAt, in7Days)),
      )
      .orderBy(calendarEvents.startsAt)
      .limit(5),
  ]);

  const threadIds = userThreads.map((t) => t.id);
  const analyses = threadIds.length
    ? await db.query.aiAnalysis.findMany({ where: inArray(aiAnalysis.threadId, threadIds) })
    : [];
  const bySubject = new Map(userThreads.map((t) => [t.id, t.subject]));

  const needsReply = analyses.filter((a) => a.requiresReply);
  const highlights: string[] = [
    ...analyses
      .filter((a) => a.priority === "high")
      .slice(0, 4)
      .map((a) => `Prioridade alta: "${bySubject.get(a.threadId) ?? "(sem assunto)"}" — ${a.intent}`),
    ...openTasks.map(
      (t) => `Tarefa por fazer: ${t.title}${t.dueDate ? ` (prazo ${t.dueDate.toISOString().slice(0, 10)})` : ""}`,
    ),
    ...upcomingEvents.map((e) => `Evento: ${e.title} em ${e.startsAt.toISOString().slice(0, 16).replace("T", " ")}`),
  ];

  return {
    unreadCount: counts.inbox,
    importantCount: counts.important,
    needsReplyCount: needsReply.length,
    draftsCount: counts.drafts,
    openTaskCount: openTasks.length,
    upcomingEventCount: upcomingEvents.length,
    highlights,
    analysisMissing: analyses.length === 0,
  };
}

export async function generateBriefingText(data: BriefingData): Promise<DailyBriefing> {
  const provider = getAIProvider();
  return provider.generateObject({
    tier: "summarize",
    ...buildBriefingPrompt({ now: new Date(), ...data }),
    schema: dailyBriefingSchema,
    maxTokens: 900,
  });
}
