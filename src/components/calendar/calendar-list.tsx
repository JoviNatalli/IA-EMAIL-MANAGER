"use client";

/**
 * Eventos de calendário — os que o utilizador criou no Nuvoly (a partir de
 * reuniões detetadas em emails, spec §21) e, quando o Google Calendar está
 * ligado, os que já existiam lá.
 *
 * Cada evento diz onde existe de facto: só no Nuvoly, ou também/só no
 * Google Calendar (com link para lá). Um evento criado antes de o
 * utilizador ligar o calendário fica local para sempre — e a lista mostra
 * isso em vez de deixar a dúvida.
 */
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Clock, ExternalLink, Mail, MapPin, Trash2 } from "lucide-react";

import { deleteCalendarEvent } from "@/app/actions/agent";
import { deleteRemoteCalendarEvent } from "@/app/actions/calendar";
import { Button } from "@/components/ui/button";
import type { CalendarEventItem } from "@/lib/emails/productivity-queries";
import type { RemoteCalendarEvent } from "@/lib/google/calendar-client";

/** Forma comum entre um evento local e um lido diretamente do Google. */
interface DisplayEvent {
  key: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  sourceThreadId: string | null;
  googleHtmlLink: string | null;
  /** `"google"` = existe só no Google, não tem linha em `calendar_event`. */
  kind: "local" | "google";
  /** Id local (uuid) ou id da API do Google, conforme `kind`. */
  removeId: string;
}

export function CalendarList({
  events,
  remoteEvents,
  remoteError,
  calendarConnected,
}: {
  events: CalendarEventItem[];
  remoteEvents: RemoteCalendarEvent[];
  remoteError: string | null;
  calendarConnected: boolean;
}) {
  const [isPending, startTransition] = React.useTransition();

  const merged = React.useMemo<DisplayEvent[]>(() => {
    const local: DisplayEvent[] = events.map((e) => ({
      key: `local:${e.id}`,
      title: e.title,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      location: e.location,
      sourceThreadId: e.sourceThreadId,
      googleHtmlLink: e.googleHtmlLink,
      kind: "local",
      removeId: e.id,
    }));
    const remote: DisplayEvent[] = remoteEvents.map((e) => ({
      key: `google:${e.id}`,
      title: e.title,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      location: e.location,
      sourceThreadId: null,
      googleHtmlLink: e.htmlLink || null,
      kind: "google",
      removeId: e.id,
    }));
    return [...local, ...remote].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }, [events, remoteEvents]);

  const groups = React.useMemo(() => {
    const map = new Map<string, DisplayEvent[]>();
    for (const event of merged) {
      const label = event.startsAt.toLocaleDateString("pt-PT", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      map.set(label, [...(map.get(label) ?? []), event]);
    }
    return [...map.entries()];
  }, [merged]);

  function remove(event: DisplayEvent) {
    startTransition(async () => {
      try {
        const message =
          event.kind === "local"
            ? (await deleteCalendarEvent(event.removeId)).googleError
            : (await deleteRemoteCalendarEvent(event.removeId)).error;
        if (message) toast.warning(message);
        else toast.success("Evento removido.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Ocorreu um erro.");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-6">
      <p className="text-xs text-muted-foreground">
        {calendarConnected
          ? "A mostrar os eventos criados no Nuvoly e os próximos do teu Google Calendar."
          : "Guardado apenas no Nuvoly. Ligue o Google Calendar em Definições → Contas para ver também os eventos de lá."}
      </p>
      {remoteError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {remoteError}
        </p>
      )}

      {groups.map(([label, items]) => (
        <section key={label} className="flex flex-col gap-1.5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</h2>
          {items.map((event) => (
            <div key={event.key} className="group flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{event.title}</p>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {event.startsAt.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                    {event.endsAt
                      ? `–${event.endsAt.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`
                      : ""}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="size-3" />
                      {event.location}
                    </span>
                  )}
                  {event.kind === "google" && <span className="shrink-0">· só no Google</span>}
                </p>
              </div>
              {event.googleHtmlLink && (
                <a
                  href={event.googleHtmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Abrir no Google Calendar"
                  title="No Google Calendar"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              )}
              {event.sourceThreadId && (
                <Link
                  href={`/app/inbox/${event.sourceThreadId}`}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Abrir email de origem"
                >
                  <Mail className="size-3.5" />
                </Link>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
                disabled={isPending}
                onClick={() => remove(event)}
                aria-label="Remover evento"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
