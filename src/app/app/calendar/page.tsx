import { Calendar } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function CalendarPage() {
  return (
    <EmptyState
      icon={Calendar}
      title="Sem reuniões detetadas."
      description="A deteção de reuniões em emails e a integração com Google Calendar (spec §21) chegam na Fase 6."
    />
  );
}
