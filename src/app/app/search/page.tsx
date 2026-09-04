import { Search } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function SearchPage() {
  return (
    <EmptyState
      icon={Search}
      title="Pesquisa por operadores e semântica."
      description="from:, subject:, has:attachment e pesquisa semântica (spec §24) ficam disponíveis assim que houver emails para indexar, na Fase 2/6."
    />
  );
}
