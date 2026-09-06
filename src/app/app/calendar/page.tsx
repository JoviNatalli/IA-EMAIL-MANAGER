import { redirect } from "next/navigation";
import { Calendar } from "lucide-react";

import { auth } from "@/auth";
import { EmptyState } from "@/components/shared/empty-state";
import { CalendarList } from "@/components/calendar/calendar-list";
import { listCalendarEvents } from "@/lib/emails/productivity-queries";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const events = await listCalendarEvents(session.user.id);

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Sem reuniões guardadas."
        description="Pede ao copiloto para detetar reuniões num email e adiciona as que interessarem. A sincronização com o Google Calendar ainda não está feita."
      />
    );
  }

  return <CalendarList events={events} />;
}
