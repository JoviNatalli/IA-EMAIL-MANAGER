"use client";

/** Lista de tarefas agrupada por dia (spec §20). */
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Mail, Trash2 } from "lucide-react";

import { deleteTask, setTaskDone } from "@/app/actions/agent";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { TaskItem } from "@/lib/emails/productivity-queries";
import { cn } from "@/lib/utils";

function groupLabel(dueDate: Date | null): string {
  if (!dueDate) return "Sem prazo";
  const today = new Date();
  const target = new Date(dueDate);
  const days = Math.round((target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86_400_000);
  if (days < 0) return "Atrasadas";
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  return new Date(dueDate).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });
}

export function TaskList({ tasks }: { tasks: TaskItem[] }) {
  const [isPending, startTransition] = React.useTransition();

  const groups = React.useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    for (const task of tasks.filter((t) => !t.isDone)) {
      const label = groupLabel(task.dueDate);
      map.set(label, [...(map.get(label) ?? []), task]);
    }
    return [...map.entries()];
  }, [tasks]);

  const done = tasks.filter((t) => t.isDone);

  function run(action: () => Promise<void>, successMessage?: string) {
    startTransition(async () => {
      try {
        await action();
        if (successMessage) toast.success(successMessage);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Ocorreu um erro.");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-6">
      {groups.map(([label, items]) => (
        <section key={label} className="flex flex-col gap-1.5">
          <h2
            className={cn(
              "text-xs font-medium uppercase tracking-wide text-muted-foreground",
              label === "Atrasadas" && "text-destructive",
            )}
          >
            {label}
          </h2>
          {items.map((task) => (
            <TaskRow key={task.id} task={task} disabled={isPending} onRun={run} />
          ))}
        </section>
      ))}

      {done.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Concluídas</h2>
          {done.map((task) => (
            <TaskRow key={task.id} task={task} disabled={isPending} onRun={run} />
          ))}
        </section>
      )}
    </div>
  );
}

function TaskRow({
  task,
  disabled,
  onRun,
}: {
  task: TaskItem;
  disabled: boolean;
  onRun: (action: () => Promise<void>, successMessage?: string) => void;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
      <Checkbox
        checked={task.isDone}
        disabled={disabled}
        onCheckedChange={(checked) => onRun(() => setTaskDone(task.id, checked === true))}
        aria-label={task.isDone ? "Marcar como por fazer" : "Marcar como concluída"}
      />
      <span className={cn("min-w-0 flex-1 truncate text-sm", task.isDone && "text-muted-foreground line-through")}>
        {task.title}
      </span>
      {task.sourceThreadId && (
        <Link
          href={`/app/inbox/${task.sourceThreadId}`}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Abrir email de origem"
        >
          <Mail className="size-3.5" />
        </Link>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
        disabled={disabled}
        onClick={() => onRun(() => deleteTask(task.id), "Tarefa apagada.")}
        aria-label="Apagar tarefa"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
