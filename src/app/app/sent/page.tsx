import { Send } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function SentPage() {
  return (
    <EmptyState
      icon={Send}
      title="Nenhum email enviado ainda."
      description="O envio real (via Gmail API) chega na Fase 3, junto com o compose editor da Fase 2."
    />
  );
}
