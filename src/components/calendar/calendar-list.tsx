"use client";

/**
 * Eventos detetados em emails e guardados pelo utilizador (spec §21).
 *
 * Cada evento diz onde existe de facto: só no Nuvoly, ou também no Google
 * Calendar (com link para lá). Um evento criado antes de o utilizador ligar
 * o calendário fica local para sempre — e a lista mostra isso em vez de
 * deixar a dúvida.
 */
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Clock, ExternalLink, Mail, MapPin, Trash2 } from "lucide-react";

import { deleteCalendarEvent } from "@/app/actions/agent";
import { Button } from "@/components/ui/button";
import type { CalendarEventItem } from "@/lib/emails/productivity-queries";

export function CalendarList({
  events,
  calendarConnected,
}: {
  events: CalendarEventItem[];
  calendarConnected: boolean;
}) {
  const [isPending, startTransition] = React.useTransition();

  const groups = React.useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    for (const event of events) {
      const label = event.startsAt.toLocaleDateString("pt-PT", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      map.set(label, [...(map.get(label) ?? []), event]);
    }
    return [...map.entries()];
  }, [events]);

  function remove(eventId: string) {
    startTransition(async () => {
      try {
        const result = await deleteCalendarEvent(eventId);
        if (result.googleError) toast.warning(result.googleError);
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
          ? "Os eventos novos são criados também no Google Calendar."
          : "Guardado apenas no Nuvoly. Ligue o Google Calendar em Definições → Contas para os eventos novos irem também para lá."}
      </p>

      {groups.map(([label, items]) => (
        <section key={label} className="flex flex-col gap-1.5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</h2>
          {items.map((event) => (
            <div key={event.id} className="group flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
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
                onClick={() => remove(event.id)}
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
