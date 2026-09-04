import { Sparkles } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function BriefingPage() {
  return (
    <EmptyState
      icon={Sparkles}
      title="O seu resumo diário aparece aqui."
      description="O Daily AI Briefing (spec §19) é gerado a partir de dados reais de inbox — chega na Fase 4, depois da categorização e prioridade estarem prontas."
    />
  );
}
