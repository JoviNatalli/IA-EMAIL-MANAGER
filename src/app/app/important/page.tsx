import { TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function ImportantPage() {
  return (
    <EmptyState
      icon={TriangleAlert}
      title="Nada urgente por agora."
      description="A deteção de prioridade por IA (spec §23) passa a classificar emails aqui a partir da Fase 4."
    />
  );
}
