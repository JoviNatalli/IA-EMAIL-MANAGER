/**
 * Cliente da Google Calendar API v3 (Fase 6, §21).
 *
 * `fetch` direto, sem o SDK `googleapis`, pela mesma razão do
 * `gmail-client.ts` da Fase 3: são dois endpoints, e o SDK traz megabytes de
 * código gerado e um modelo de auth próprio para não fazer mais nada.
 */
import "server-only";

import { CalendarError } from "./calendar-errors";

const API_BASE = "https://www.googleapis.com/calendar/v3";
/** `primary` é o calendário principal da conta — não precisa de ser descoberto. */
const CALENDAR_ID = "primary";
/** Sem hora de fim, um evento dura isto. */
const DEFAULT_DURATION_MINUTES = 60;

export interface CalendarEventInput {
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  /** Aparece na descrição do evento — diz de onde veio, sem citar o email. */
  sourceNote?: string | null;
}

export interface GoogleCalendarEvent {
  id: string;
  htmlLink: string;
}

export interface RemoteCalendarEvent {
  id: string;
  title: string;
  startsAt: Date;
  /** `null` para eventos de dia inteiro (a API dá `date`, não `dateTime`). */
  endsAt: Date | null;
  location: string | null;
  htmlLink: string;
}

interface GoogleEventTime {
  dateTime?: string;
  date?: string;
}

interface GoogleEventPayload {
  id?: string;
  status?: string;
  summary?: string;
  location?: string;
  htmlLink?: string;
  start?: GoogleEventTime;
  end?: GoogleEventTime;
}

interface CalendarApiError {
  error?: { message?: string; errors?: { reason?: string }[] };
}

/**
 * Traduz a resposta de erro da API para algo que o utilizador possa agir.
 *
 * O 403 é o caso que interessa distinguir: quando o utilizador ligou o
 * calendário mas o consentimento não incluiu o scope de escrita, a API
 * responde 403 e a única saída é voltar a autorizar — dizer "tente
 * novamente" mandava-o repetir uma coisa que nunca vai funcionar.
 */
export function mapCalendarError(status: number, payload: CalendarApiError): CalendarError {
  const detail = payload.error?.message ?? "sem detalhe";
  const reasons = (payload.error?.errors ?? []).map((e) => e.reason).filter(Boolean);

  if (status === 401) {
    return new CalendarError(`Calendar 401: ${detail}`, {
      userMessage: "O acesso ao Google Calendar expirou. Ligue-o novamente em Definições → Contas.",
      needsReconnect: true,
    });
  }
  if (status === 403 && reasons.some((r) => r === "insufficientPermissions")) {
    return new CalendarError(`Calendar 403 (scope insuficiente): ${detail}`, {
      userMessage:
        "A autorização dada ao Google Calendar não permite criar eventos. Volte a ligá-lo em Definições → Contas e aceite o pedido de acesso ao calendário.",
      needsReconnect: true,
    });
  }
  if (status === 403 || status === 429) {
    return new CalendarError(`Calendar ${status}: ${detail}`, {
      userMessage: "O Google recusou o pedido por excesso de utilização. Tente novamente daqui a pouco.",
    });
  }
  if (status === 404) {
    return new CalendarError(`Calendar 404: ${detail}`, {
      userMessage: "Esse evento já não existe no Google Calendar.",
    });
  }
  if (status >= 500) {
    return new CalendarError(`Calendar ${status}: ${detail}`, {
      userMessage: "O Google Calendar está indisponível de momento. Tente novamente daqui a pouco.",
    });
  }
  return new CalendarError(`Calendar ${status}: ${detail}`, {
    userMessage: "Não foi possível criar o evento no Google Calendar.",
  });
}

async function calendarFetch(
  accessToken: string,
  path: string,
  init: RequestInit,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch (cause) {
    throw new CalendarError("Falha de rede a contactar o Google Calendar.", {
      userMessage: "Não foi possível contactar o Google Calendar. Verifique a ligação e tente novamente.",
      cause,
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as CalendarApiError;
    throw mapCalendarError(response.status, payload);
  }
  return response;
}

/**
 * Cria um evento no calendário principal do utilizador.
 *
 * O fuso horário vai explícito: sem `timeZone`, o Google interpreta a data
 * no fuso do calendário e um evento marcado para as 15h pode aparecer noutra
 * hora — o tipo de erro que só se descobre quando alguém falta à reunião.
 */
export async function insertCalendarEvent(
  accessToken: string,
  input: CalendarEventInput,
  timeZone: string,
): Promise<GoogleCalendarEvent> {
  const endsAt =
    input.endsAt ?? new Date(input.startsAt.getTime() + DEFAULT_DURATION_MINUTES * 60_000);

  const response = await calendarFetch(accessToken, `/calendars/${CALENDAR_ID}/events`, {
    method: "POST",
    body: JSON.stringify({
      summary: input.title,
      location: input.location ?? undefined,
      description: input.sourceNote ?? undefined,
      start: { dateTime: input.startsAt.toISOString(), timeZone },
      end: { dateTime: endsAt.toISOString(), timeZone },
    }),
  });

  const event = (await response.json()) as Partial<GoogleCalendarEvent>;
  if (!event.id) {
    throw new CalendarError("Google Calendar respondeu sem id de evento.", {
      userMessage: "Não foi possível confirmar a criação do evento no Google Calendar.",
    });
  }
  return { id: event.id, htmlLink: event.htmlLink ?? "" };
}

/** `dateTime` para eventos com hora; `date` (dia inteiro) vira meia-noite local. */
function parseGoogleEventTime(time: GoogleEventTime | undefined): Date | null {
  if (!time) return null;
  if (time.dateTime) return new Date(time.dateTime);
  if (time.date) return new Date(`${time.date}T00:00:00`);
  return null;
}

/**
 * Lista os próximos eventos do calendário principal.
 *
 * `singleEvents: true` expande eventos recorrentes em ocorrências
 * individuais — sem isto, uma reunião semanal apareceria como UMA linha
 * com a data da primeira ocorrência, nunca as seguintes.
 */
export async function listUpcomingCalendarEvents(
  accessToken: string,
  { timeMin, maxResults = 50 }: { timeMin: Date; maxResults?: number },
): Promise<RemoteCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    maxResults: String(maxResults),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const response = await calendarFetch(
    accessToken,
    `/calendars/${CALENDAR_ID}/events?${params}`,
    { method: "GET" },
  );

  const payload = (await response.json()) as { items?: GoogleEventPayload[] };
  const items = payload.items ?? [];

  return items.flatMap((item): RemoteCalendarEvent[] => {
    // "cancelled" fica na resposta (para sincronização incremental, que não
    // usamos) — mostrá-lo seria exibir uma reunião que já não existe.
    if (!item.id || item.status === "cancelled") return [];
    const startsAt = parseGoogleEventTime(item.start);
    if (!startsAt) return [];
    return [
      {
        id: item.id,
        title: item.summary ?? "(sem título)",
        startsAt,
        endsAt: parseGoogleEventTime(item.end),
        location: item.location ?? null,
        htmlLink: item.htmlLink ?? "",
      },
    ];
  });
}

export interface CalendarChangeEvent {
  id: string;
  /** `true` = o evento foi apagado (ou a ocorrência cancelada) no Google. */
  cancelled: boolean;
  title: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  location: string | null;
}

export interface CalendarChangesResult {
  events: CalendarChangeEvent[];
  /** Ponto de partida para a PRÓXIMA chamada de reconciliação. */
  nextSyncToken: string;
}

/**
 * Lê o que mudou no calendário desde `syncToken` — ou, sem token, faz a
 * primeira leitura completa só para estabelecer o ponto de partida
 * (spec §21, reconciliação).
 *
 * Um `syncToken` não pode ser combinado com `timeMin`/`timeMax`/`orderBy` —
 * a API rejeita o pedido — por isso esta função nunca aceita esses filtros;
 * é uma leitura de MUDANÇAS, não de "próximos eventos" (isso é
 * `listUpcomingCalendarEvents`).
 *
 * Um `syncToken` expirado (a API não documenta por quanto tempo fica válido)
 * responde **410 Gone**; devolvemos `{ expired: true }` para o chamador
 * recomeçar com um novo baseline, tal como o `historyId` do Gmail.
 */
export async function listCalendarChanges(
  accessToken: string,
  syncToken?: string,
): Promise<CalendarChangesResult | { expired: true }> {
  const events: CalendarChangeEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  do {
    const params = new URLSearchParams({ singleEvents: "true", maxResults: "250" });
    if (syncToken) params.set("syncToken", syncToken);
    if (pageToken) params.set("pageToken", pageToken);

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/calendars/${CALENDAR_ID}/events?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (cause) {
      throw new CalendarError("Falha de rede a ler alterações do Google Calendar.", {
        userMessage: "Não foi possível contactar o Google Calendar. Verifique a ligação e tente novamente.",
        cause,
      });
    }

    if (response.status === 410) return { expired: true };
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as CalendarApiError;
      throw mapCalendarError(response.status, payload);
    }

    const payload = (await response.json()) as {
      items?: GoogleEventPayload[];
      nextPageToken?: string;
      nextSyncToken?: string;
    };

    for (const item of payload.items ?? []) {
      if (!item.id) continue;
      events.push({
        id: item.id,
        cancelled: item.status === "cancelled",
        title: item.summary ?? null,
        startsAt: parseGoogleEventTime(item.start),
        endsAt: parseGoogleEventTime(item.end),
        location: item.location ?? null,
      });
    }
    if (payload.nextSyncToken) nextSyncToken = payload.nextSyncToken;
    pageToken = payload.nextPageToken;
  } while (pageToken);

  if (!nextSyncToken) {
    throw new CalendarError("Google Calendar não devolveu nextSyncToken.", {
      userMessage: "Não foi possível confirmar o estado do Google Calendar.",
    });
  }

  return { events, nextSyncToken };
}

/** Apaga um evento. Um evento já apagado no Google não é erro para o utilizador. */
export async function deleteCalendarEventById(accessToken: string, eventId: string): Promise<void> {
  try {
    await calendarFetch(accessToken, `/calendars/${CALENDAR_ID}/events/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
    });
  } catch (error) {
    if (error instanceof CalendarError && error.message.startsWith("Calendar 404")) return;
    throw error;
  }
}
