/**
 * Criação de eventos de calendário (Fase 6, §21).
 *
 * Uma única porta para os dois chamadores — a Server Action do botão
 * "Adicionar ao calendário" e a ferramenta do agente. O que ela garante:
 * a linha local é SEMPRE criada, e o Google é escrito por cima quando o
 * utilizador ligou o calendário.
 *
 * A ordem importa. O evento local é gravado primeiro: se a chamada ao Google
 * falhar (quota, rede, autorização revogada), o utilizador fica com o evento
 * na app e uma mensagem a dizer que não foi para o Google — em vez de perder
 * as duas coisas. O contrário (Google primeiro) deixaria eventos órfãos lá
 * fora se a gravação local falhasse.
 */
import "server-only";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { calendarEvents, calendarSync } from "@/lib/db/schema";
import { CalendarError } from "@/lib/google/calendar-errors";
import {
  deleteCalendarEventById,
  insertCalendarEvent,
  listCalendarChanges,
  listUpcomingCalendarEvents,
  type CalendarChangeEvent,
  type RemoteCalendarEvent,
} from "@/lib/google/calendar-client";
import { getValidCalendarAccessToken, hasCalendarLinked } from "@/lib/google/tokens";
import { getUserTimeZone } from "@/lib/users/preferences";

export interface CreateCalendarEventInput {
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  sourceThreadId: string | null;
}

export interface CreateCalendarEventResult {
  id: string;
  /** `null` quando o evento ficou só local. */
  googleHtmlLink: string | null;
  /** Mensagem PT-PT quando o Google recusou — o evento local existe na mesma. */
  googleError: string | null;
}

/**
 * Fuso usado ao escrever no Google.
 *
 * Preferido: o do UTILIZADOR (`TimeZoneSync` reporta-o do browser para
 * `user_preference.time_zone`, Fase 6). Sem ele — sessão nova, ainda não
 * reportou — cai no fuso do servidor. Não desloca eventos (as datas vão
 * como instantes ISO, absolutos), só decide em que fuso o Google os mostra.
 */
async function displayTimeZone(userId: string): Promise<string> {
  const stored = await getUserTimeZone(userId);
  return stored ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
}

export async function createCalendarEventForUser(
  userId: string,
  input: CreateCalendarEventInput,
): Promise<CreateCalendarEventResult> {
  const [row] = await db
    .insert(calendarEvents)
    .values({
      userId,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.location,
      sourceThreadId: input.sourceThreadId,
    })
    .returning({ id: calendarEvents.id });

  if (!(await hasCalendarLinked(userId))) {
    return { id: row.id, googleHtmlLink: null, googleError: null };
  }

  try {
    const accessToken = await getValidCalendarAccessToken(userId);
    const event = await insertCalendarEvent(
      accessToken,
      {
        title: input.title,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        location: input.location,
        sourceNote: "Criado a partir do Nuvoly.",
      },
      await displayTimeZone(userId),
    );

    await db
      .update(calendarEvents)
      .set({ googleEventId: event.id, googleHtmlLink: event.htmlLink })
      .where(eq(calendarEvents.id, row.id));

    return { id: row.id, googleHtmlLink: event.htmlLink || null, googleError: null };
  } catch (error) {
    const message =
      error instanceof CalendarError
        ? error.userMessage
        : "Não foi possível criar o evento no Google Calendar.";
    if (!(error instanceof CalendarError)) {
      console.error("[calendar] erro não mapeado ao criar evento:", error);
    }
    return { id: row.id, googleHtmlLink: null, googleError: message };
  }
}

export interface GoogleOnlyEventsResult {
  events: RemoteCalendarEvent[];
  /** PT-PT quando a leitura falha — a UI mostra os locais na mesma. */
  error: string | null;
}

/**
 * Lê os próximos eventos do Google Calendar que NÃO foram criados pelo
 * Nuvoly — para não duplicar na lista o que já aparece como evento local.
 *
 * `excludeGoogleEventIds` vem de quem chama (os `googleEventId` já
 * guardados localmente) em vez de esta função ir à base de dados: assim o
 * `/app/calendar` só faz uma leitura de `calendar_event`, e esta função fica
 * livre de decidir sozinha o que é "duplicado" sem depender de outra tabela.
 */
export async function listGoogleOnlyEventsForUser(
  userId: string,
  excludeGoogleEventIds: ReadonlySet<string>,
): Promise<GoogleOnlyEventsResult> {
  if (!(await hasCalendarLinked(userId))) return { events: [], error: null };

  try {
    const accessToken = await getValidCalendarAccessToken(userId);
    const remote = await listUpcomingCalendarEvents(accessToken, {
      timeMin: new Date(),
      maxResults: 50,
    });
    return {
      events: remote.filter((event) => !excludeGoogleEventIds.has(event.id)),
      error: null,
    };
  } catch (error) {
    const message =
      error instanceof CalendarError
        ? error.userMessage
        : "Não foi possível ler o Google Calendar agora.";
    if (!(error instanceof CalendarError)) {
      console.error("[calendar] erro não mapeado ao ler eventos:", error);
    }
    return { events: [], error: message };
  }
}

/** Apaga diretamente um evento que só existe no Google (sem linha local). */
export async function deleteGoogleOnlyEventForUser(
  userId: string,
  googleEventId: string,
): Promise<{ error: string | null }> {
  try {
    const accessToken = await getValidCalendarAccessToken(userId);
    await deleteCalendarEventById(accessToken, googleEventId);
    return { error: null };
  } catch (error) {
    const message =
      error instanceof CalendarError
        ? error.userMessage
        : "Não foi possível remover o evento no Google Calendar.";
    if (!(error instanceof CalendarError)) {
      console.error("[calendar] erro não mapeado ao apagar evento remoto:", error);
    }
    return { error: message };
  }
}

/** Só os campos que a mudança do Google realmente traz — nunca apaga um título com `null`. */
export function buildEventPatch(
  change: Pick<CalendarChangeEvent, "title" | "startsAt" | "endsAt" | "location">,
): Partial<{ title: string; startsAt: Date; endsAt: Date | null; location: string | null }> {
  const patch: ReturnType<typeof buildEventPatch> = {};
  if (change.title) patch.title = change.title;
  if (change.startsAt) {
    patch.startsAt = change.startsAt;
    patch.endsAt = change.endsAt;
  }
  patch.location = change.location;
  return patch;
}

export interface ReconcileResult {
  /** Eventos locais atualizados para bater certo com o Google. */
  updated: number;
  /** Eventos locais removidos porque foram apagados/cancelados no Google. */
  removed: number;
  error: string | null;
}

/**
 * Reconcilia os eventos que o Nuvoly criou com o estado atual no Google
 * (spec §21) — editar ou apagar um evento do lado do Google, sem passar
 * pela app, deixava a linha local desatualizada até alguém mexer nos dois
 * lados à mão.
 *
 * Usa `syncToken` (guardado em `calendar_sync`, mesmo padrão do `historyId`
 * do Gmail): só lê o que mudou, não o calendário inteiro. Eventos que não
 * são nossos (sem `googleEventId` correspondente) são ignorados aqui — esses
 * aparecem em `/app/calendar` pela leitura "só no Google", que não precisa
 * de reconciliação porque não tem estado local para divergir.
 */
export async function reconcileCalendarForUser(userId: string): Promise<ReconcileResult> {
  if (!(await hasCalendarLinked(userId))) return { updated: 0, removed: 0, error: null };

  const [state] = await db.select().from(calendarSync).where(eq(calendarSync.userId, userId)).limit(1);

  try {
    const accessToken = await getValidCalendarAccessToken(userId);
    let changes = await listCalendarChanges(accessToken, state?.syncToken ?? undefined);

    if ("expired" in changes) {
      // syncToken fora de validade (a API não documenta por quanto tempo
      // fica bom) — recomeça com um novo baseline, tal como o historyId do
      // Gmail quando sai da janela de retenção.
      changes = await listCalendarChanges(accessToken, undefined);
      if ("expired" in changes) {
        throw new CalendarError("Google Calendar devolveu 410 mesmo sem syncToken.", {
          userMessage: "Não foi possível confirmar o estado do Google Calendar agora.",
        });
      }
    }

    let updated = 0;
    let removed = 0;

    for (const change of changes.events) {
      const [local] = await db
        .select({ id: calendarEvents.id })
        .from(calendarEvents)
        .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.googleEventId, change.id)))
        .limit(1);
      if (!local) continue;

      if (change.cancelled) {
        await db.delete(calendarEvents).where(eq(calendarEvents.id, local.id));
        removed += 1;
        continue;
      }

      await db.update(calendarEvents).set(buildEventPatch(change)).where(eq(calendarEvents.id, local.id));
      updated += 1;
    }

    await db
      .insert(calendarSync)
      .values({ userId, syncToken: changes.nextSyncToken, lastSyncedAt: new Date() })
      .onConflictDoUpdate({
        target: calendarSync.userId,
        set: { syncToken: changes.nextSyncToken, lastSyncedAt: new Date(), lastError: null, updatedAt: new Date() },
      });

    return { updated, removed, error: null };
  } catch (error) {
    const message =
      error instanceof CalendarError
        ? error.userMessage
        : "Não foi possível reconciliar o Google Calendar agora.";
    if (!(error instanceof CalendarError)) {
      console.error("[calendar] erro não mapeado na reconciliação:", error);
    }
    await db
      .insert(calendarSync)
      .values({ userId, lastError: message })
      .onConflictDoUpdate({ target: calendarSync.userId, set: { lastError: message, updatedAt: new Date() } });
    return { updated: 0, removed: 0, error: message };
  }
}

/**
 * Apaga o evento localmente e, se existir lá, também no Google.
 *
 * Falhar no Google não impede o apagamento local — mas é dito, para o
 * utilizador não ficar com um evento fantasma no telemóvel sem saber porquê.
 */
export async function deleteCalendarEventForUser(
  userId: string,
  eventId: string,
): Promise<{ googleError: string | null }> {
  const [event] = await db
    .select({ id: calendarEvents.id, googleEventId: calendarEvents.googleEventId })
    .from(calendarEvents)
    .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)))
    .limit(1);

  if (!event) return { googleError: null };

  let googleError: string | null = null;
  if (event.googleEventId) {
    try {
      const accessToken = await getValidCalendarAccessToken(userId);
      await deleteCalendarEventById(accessToken, event.googleEventId);
    } catch (error) {
      googleError =
        error instanceof CalendarError
          ? error.userMessage
          : "O evento foi removido do Nuvoly, mas não do Google Calendar.";
      if (!(error instanceof CalendarError)) {
        console.error("[calendar] erro não mapeado ao apagar evento:", error);
      }
    }
  }

  await db
    .delete(calendarEvents)
    .where(and(eq(calendarEvents.id, event.id), eq(calendarEvents.userId, userId)));

  return { googleError };
}
