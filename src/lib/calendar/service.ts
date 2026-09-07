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
import { calendarEvents } from "@/lib/db/schema";
import { CalendarError } from "@/lib/google/calendar-errors";
import {
  deleteCalendarEventById,
  insertCalendarEvent,
  listUpcomingCalendarEvents,
  type RemoteCalendarEvent,
} from "@/lib/google/calendar-client";
import { getValidCalendarAccessToken, hasCalendarLinked } from "@/lib/google/tokens";

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
 * É o do SERVIDOR, não o do utilizador: a app não guarda o fuso de ninguém.
 * Não desloca eventos (as datas vão como instantes ISO, que são absolutos),
 * só decide em que fuso o Google os mostra. Fica anotado como limitação
 * conhecida em vez de fingir que é a preferência do utilizador.
 */
function serverTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
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
      serverTimeZone(),
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
