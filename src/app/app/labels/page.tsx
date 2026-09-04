import { Tag } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function LabelsPage() {
  return (
    <EmptyState
      icon={Tag}
      title="Sem labels criadas."
      description="A categorização automática por IA (Work, Personal, Finance, ...) chega na Fase 4 — mas pode sempre criar labels manuais a partir da Fase 2."
    />
  );
}
