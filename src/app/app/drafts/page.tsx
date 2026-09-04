import { FileEdit } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function DraftsPage() {
  return (
    <EmptyState
      icon={FileEdit}
      title="Sem rascunhos."
      description="O compose editor com autosave (spec §41) é construído na Fase 2."
    />
  );
}
