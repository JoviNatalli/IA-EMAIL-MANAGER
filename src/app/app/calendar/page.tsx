import { redirect } from "next/navigation";
import { Calendar } from "lucide-react";

import { auth } from "@/auth";
import { EmptyState } from "@/components/shared/empty-state";
import { CalendarList } from "@/components/calendar/calendar-list";
import { listGoogleOnlyEventsForUser } from "@/lib/calendar/service";
import { listCalendarEvents } from "@/lib/emails/productivity-queries";
import { hasCalendarLinked } from "@/lib/google/tokens";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [events, calendarConnected] = await Promise.all([
    listCalendarEvents(session.user.id),
    hasCalendarLinked(session.user.id),
  ]);

  // Só lê o Google quando há ligação — sem isto seria uma chamada à API só
  // para descobrir o que já se sabia (não está ligado). Os eventos já
  // criados a partir do Nuvoly ficam excluídos, para não aparecerem em
  // duplicado (um como card local, outro como card "só no Google").
  const localGoogleEventIds = new Set(
    events.flatMap((e) => (e.googleEventId ? [e.googleEventId] : [])),
  );
  const { events: remoteEvents, error: remoteError } = calendarConnected
    ? await listGoogleOnlyEventsForUser(session.user.id, localGoogleEventIds)
    : { events: [], error: null };

  if (events.length === 0 && remoteEvents.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Sem reuniões guardadas."
        description={
          calendarConnected
            ? "Pede ao copiloto para detetar reuniões num email e adiciona as que interessarem — vão também para o teu Google Calendar."
            : "Pede ao copiloto para detetar reuniões num email e adiciona as que interessarem. Liga o Google Calendar em Definições → Contas para os eventos irem também para lá."
        }
      />
    );
  }

  return (
    <CalendarList
      events={events}
      remoteEvents={remoteEvents}
      remoteError={remoteError}
      calendarConnected={calendarConnected}
    />
  );
}
