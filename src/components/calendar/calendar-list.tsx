"use client";

/**
 * Eventos detetados em emails e guardados pelo utilizador (spec §21).
 * Guardados localmente — a sincronização com o Google Calendar não está
 * implementada, e a UI diz isso em vez de dar a entender que está.
 */
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Clock, Mail, MapPin, Trash2 } from "lucide-react";

import { deleteCalendarEvent } from "@/app/actions/agent";
import { Button } from "@/components/ui/button";
import type { CalendarEventItem } from "@/lib/emails/productivity-queries";

export function CalendarList({ events }: { events: CalendarEventItem[] }) {
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
        await deleteCalendarEvent(eventId);
        toast.success("Evento removido.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Ocorreu um erro.");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-6">
      <p className="text-xs text-muted-foreground">
        Guardado no Nuvoly. A sincronização com o Google Calendar ainda não está implementada.
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
