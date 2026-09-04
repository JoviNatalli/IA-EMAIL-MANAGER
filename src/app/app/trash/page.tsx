import { Trash2 } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function TrashPage() {
  return (
    <EmptyState
      icon={Trash2}
      title="O lixo está vazio."
      description="Ações destrutivas em massa exigem sempre confirmação explícita (spec §18) — nunca são executadas automaticamente pela IA."
    />
  );
}
