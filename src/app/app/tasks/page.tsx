import { CheckSquare } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function TasksPage() {
  return (
    <EmptyState
      icon={CheckSquare}
      title="Nenhuma tarefa por agora."
      description="A extração automática de tarefas a partir de emails (spec §20) chega na Fase 5, junto com o tool calling da IA."
    />
  );
}
