import { Star } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function StarredPage() {
  return (
    <EmptyState
      icon={Star}
      title="Ainda sem emails marcados."
      description="Assim que a inbox tiver dados (Fase 2), marque emails com S para os encontrar aqui rapidamente."
    />
  );
}
