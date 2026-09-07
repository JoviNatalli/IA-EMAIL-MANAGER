import { redirect } from "next/navigation";
import { Calendar } from "lucide-react";

import { auth } from "@/auth";
import { EmptyState } from "@/components/shared/empty-state";
import { CalendarList } from "@/components/calendar/calendar-list";
import { listCalendarEvents } from "@/lib/emails/productivity-queries";
import { hasCalendarLinked } from "@/lib/google/tokens";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [events, calendarConnected] = await Promise.all([
    listCalendarEvents(session.user.id),
    hasCalendarLinked(session.user.id),
  ]);

  if (events.length === 0) {
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

  return <CalendarList events={events} calendarConnected={calendarConnected} />;
}
