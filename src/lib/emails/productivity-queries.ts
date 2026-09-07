/**
 * Leituras de tarefas, lembretes e eventos (Fase 5). Tudo escopado por
 * `userId` já validado pelo chamador (Server Component), como em
 * `queries.ts`.
 */
import { and, asc, desc, eq, gte } from "drizzle-orm";

import { db } from "@/lib/db";
import { calendarEvents, reminders, tasks } from "@/lib/db/schema";

export interface TaskItem {
  id: string;
  title: string;
  dueDate: Date | null;
  isDone: boolean;
  sourceThreadId: string | null;
  createdAt: Date;
}

export async function listTasks(userId: string): Promise<TaskItem[]> {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      isDone: tasks.isDone,
      sourceThreadId: tasks.sourceThreadId,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(asc(tasks.isDone), asc(tasks.dueDate), desc(tasks.createdAt));
  return rows;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  sourceThreadId: string | null;
  /** Link do evento no Google Calendar — `null` quando ficou só local. */
  googleHtmlLink: string | null;
}

export async function listCalendarEvents(userId: string): Promise<CalendarEventItem[]> {
  return db
    .select({
      id: calendarEvents.id,
      title: calendarEvents.title,
      startsAt: calendarEvents.startsAt,
      endsAt: calendarEvents.endsAt,
      location: calendarEvents.location,
      sourceThreadId: calendarEvents.sourceThreadId,
      googleHtmlLink: calendarEvents.googleHtmlLink,
    })
    .from(calendarEvents)
    .where(eq(calendarEvents.userId, userId))
    .orderBy(asc(calendarEvents.startsAt));
}

export async function countOpenTasks(userId: string): Promise<number> {
  const rows = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.isDone, false)));
  return rows.length;
}

export async function countUpcomingEvents(userId: string): Promise<number> {
  const rows = await db
    .select({ id: calendarEvents.id })
    .from(calendarEvents)
    .where(and(eq(calendarEvents.userId, userId), gte(calendarEvents.startsAt, new Date())));
  return rows.length;
}

export async function listUpcomingReminders(userId: string) {
  return db
    .select({ id: reminders.id, title: reminders.title, remindAt: reminders.remindAt })
    .from(reminders)
    .where(eq(reminders.userId, userId))
    .orderBy(asc(reminders.remindAt))
    .limit(20);
}
