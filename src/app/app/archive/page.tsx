import { Archive } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function ArchivePage() {
  return (
    <EmptyState
      icon={Archive}
      title="O arquivo está vazio."
      description="Emails arquivados (manualmente ou por comando de IA) aparecerão aqui a partir da Fase 2."
    />
  );
}
