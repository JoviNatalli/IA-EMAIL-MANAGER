import { redirect } from "next/navigation";
import { CheckSquare } from "lucide-react";

import { auth } from "@/auth";
import { EmptyState } from "@/components/shared/empty-state";
import { TaskList } from "@/components/tasks/task-list";
import { listTasks } from "@/lib/emails/productivity-queries";

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tasks = await listTasks(session.user.id);

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="Nenhuma tarefa por agora."
        description="Pede ao copiloto para procurar tarefas num email (ou para criar uma) e elas aparecem aqui — nunca são criadas sem o teu clique."
      />
    );
  }

  return <TaskList tasks={tasks} />;
}
