"use client";

/**
 * AI Agent (spec §16-18, §25) — comandos em linguagem natural com tool
 * calling. Mostra os passos à medida que acontecem (§34), as propostas de
 * tarefas/reuniões com botão (§20/§21) e, para ações sensíveis, um cartão de
 * confirmação com a contagem de itens afetados (§18).
 */
import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bot,
  CalendarPlus,
  Check,
  CheckSquare,
  Loader2,
  Send,
  ShieldAlert,
  User,
  X,
} from "lucide-react";

import {
  cancelAgentAction,
  confirmAgentAction,
  createCalendarEventFromProposal,
  createTaskFromProposal,
} from "@/app/actions/agent";
import { Button } from "@/components/ui/button";
import { ListItemIn, PanelIn } from "@/components/shared/motion";
import { Textarea } from "@/components/ui/textarea";
import type { AgentUiPayload } from "@/lib/ai/tools";
import { cn } from "@/lib/utils";

const TOOL_LABEL: Record<string, string> = {
  searchEmails: "A pesquisar emails",
  findEmailsBySender: "A procurar por remetente",
  findEmailsByDate: "A procurar por data",
  getThread: "A ler a conversa",
  getEmail: "A ler a mensagem",
  summarizeThread: "A resumir a conversa",
  markAsRead: "A marcar como lida",
  starEmail: "A alterar estrelas",
  archiveEmail: "A arquivar",
  addLabel: "A aplicar label",
  removeLabel: "A remover label",
  createDraft: "A criar rascunho",
  sendEmail: "A preparar envio",
  replyToThread: "A preparar resposta",
  createTask: "A criar tarefa",
  createReminder: "A criar lembrete",
  createCalendarEvent: "A adicionar ao calendário",
  extractTasks: "A procurar tarefas no email",
  detectMeetings: "A procurar reuniões no email",
  listTasks: "A ler as tarefas",
};

interface AgentStep {
  tool: string;
  done: boolean;
  ok: boolean;
  summary?: string;
}

interface PendingConfirmation {
  actionId: string;
  toolName: string;
  summary: string;
  affectedCount: number;
  resolution?: { ok: boolean; message: string };
}

interface AssistantTurn {
  role: "assistant";
  text: string;
  steps: AgentStep[];
  proposals: AgentUiPayload[];
  confirmation?: PendingConfirmation;
  error?: string;
  /**
   * Nota enviada ao modelo no turno seguinte, além do texto visível.
   *
   * Um turno que acaba em pedido de confirmação não produz texto nenhum, e
   * sem isto o histórico ficava a parecer que o pedido do utilizador nunca
   * foi tratado — o modelo voltava a propor a MESMA ação a seguir (foi
   * exatamente o que aconteceu no primeiro teste manual).
   */
  historyNote?: string;
}

type Turn = { role: "user"; text: string } | AssistantTurn;

const SUGGESTIONS = [
  "Que emails preciso de responder primeiro?",
  "Procura emails sobre faturas e resume-os",
  "Arquiva os emails de newsletter",
];

export function AgentChatPanel() {
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [input, setInput] = React.useState("");
  const [isRunning, setIsRunning] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  function updateAssistant(update: (turn: AssistantTurn) => AssistantTurn) {
    setTurns((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (!last || last.role !== "assistant") return prev;
      copy[copy.length - 1] = update(last);
      return copy;
    });
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isRunning) return;

    // O histórico enviado ao servidor é só texto (ver nota em lib/ai/agent.ts).
    const history = [
      ...turns.map((t) => ({
        role: t.role,
        content: t.role === "user" ? t.text : [t.text, t.historyNote].filter(Boolean).join("\n"),
      })),
      { role: "user" as const, content: trimmed },
    ].filter((m) => m.content.trim().length > 0);

    setTurns((prev) => [
      ...prev,
      { role: "user", text: trimmed },
      { role: "assistant", text: "", steps: [], proposals: [] },
    ]);
    setInput("");
    setIsRunning(true);

    try {
      const response = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Não foi possível falar com o assistente.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) handleEvent(JSON.parse(line));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ocorreu um erro no assistente.";
      updateAssistant((turn) => ({ ...turn, error: message }));
    } finally {
      setIsRunning(false);
      updateAssistant((turn) => ({ ...turn, steps: turn.steps.map((s) => ({ ...s, done: true })) }));
    }
  }

  function handleEvent(event: Record<string, unknown>) {
    const type = event.type as string;

    if (type === "step") {
      const tool = event.tool as string;
      updateAssistant((turn) => ({ ...turn, steps: [...turn.steps, { tool, done: false, ok: true }] }));
      return;
    }
    if (type === "step_result") {
      const tool = event.tool as string;
      updateAssistant((turn) => {
        const steps = [...turn.steps];
        for (let i = steps.length - 1; i >= 0; i -= 1) {
          if (steps[i].tool === tool && !steps[i].done) {
            steps[i] = { ...steps[i], done: true, ok: event.ok as boolean, summary: event.summary as string };
            break;
          }
        }
        return { ...turn, steps };
      });
      return;
    }
    if (type === "ui") {
      updateAssistant((turn) => ({ ...turn, proposals: [...turn.proposals, event.payload as AgentUiPayload] }));
      return;
    }
    if (type === "text") {
      updateAssistant((turn) => ({ ...turn, text: event.text as string }));
      return;
    }
    if (type === "confirm") {
      const summary = event.summary as string;
      updateAssistant((turn) => ({
        ...turn,
        confirmation: {
          actionId: event.actionId as string,
          toolName: event.toolName as string,
          summary,
          affectedCount: event.affectedCount as number,
        },
        historyNote: `[A aplicação mostrou ao utilizador um pedido de confirmação para: ${summary} — não voltes a propor esta ação.]`,
      }));
      return;
    }
    if (type === "error") {
      updateAssistant((turn) => ({ ...turn, error: event.message as string }));
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
        {turns.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-4 pt-16 text-center">
            <Bot className="size-8 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-medium text-foreground">Copiloto Nuvoly</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Pede em linguagem natural. Consigo pesquisar, ler, resumir, arquivar, etiquetar, criar rascunhos e
                tarefas — e peço sempre confirmação antes de enviar seja o que for.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-accent/30 px-3 py-1.5 text-xs text-foreground hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {turns.map((turn, i) =>
              turn.role === "user" ? (
                <div key={i} className="flex flex-row-reverse gap-2.5">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent">
                    <User className="size-3.5" />
                  </div>
                  <div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
                    {turn.text}
                  </div>
                </div>
              ) : (
                <AssistantBubble
                  key={i}
                  turn={turn}
                  isRunning={isRunning && i === turns.length - 1}
                  onResolveConfirmation={(resolution) =>
                    setTurns((prev) => {
                      const copy = [...prev];
                      const target = copy[i];
                      if (target?.role !== "assistant" || !target.confirmation) return prev;
                      copy[i] = {
                        ...target,
                        confirmation: { ...target.confirmation, resolution },
                        historyNote: `[O utilizador ${resolution.ok ? "confirmou" : "cancelou"} a ação: ${resolution.message}]`,
                      };
                      return copy;
                    })
                  }
                />
              ),
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border p-3 md:p-4">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ex.: arquiva as newsletters desta semana"
            className="min-h-11 flex-1 resize-none"
            disabled={isRunning}
          />
          <Button
            size="icon"
            onClick={() => send(input)}
            disabled={isRunning || !input.trim()}
            aria-label="Enviar mensagem ao copiloto"
          >
            {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AssistantBubble({
  turn,
  isRunning,
  onResolveConfirmation,
}: {
  turn: AssistantTurn;
  isRunning: boolean;
  onResolveConfirmation: (resolution: { ok: boolean; message: string }) => void;
}) {
  return (
    <div className="flex gap-2.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent">
        <Bot className="size-3.5" />
      </div>
      <div className="flex min-w-0 max-w-[85%] flex-col gap-2">
        {turn.steps.length > 0 && (
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 px-3 py-2">
            {turn.steps.map((step, i) => (
              <ListItemIn key={i} index={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                {!step.done ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : step.ok ? (
                  <Check className="size-3 text-emerald-600 dark:text-emerald-500" />
                ) : (
                  <AlertTriangle className="size-3 text-amber-700 dark:text-amber-500" />
                )}
                <span>{TOOL_LABEL[step.tool] ?? step.tool}</span>
                {step.summary && <span className="truncate opacity-70">— {step.summary}</span>}
              </ListItemIn>
            ))}
          </div>
        )}

        {turn.text && (
          <div className="whitespace-pre-wrap rounded-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed text-foreground">
            {turn.text}
          </div>
        )}

        {turn.text === "" && isRunning && turn.steps.length === 0 && (
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          </div>
        )}

        {turn.proposals.map((payload, i) => (
          <PanelIn key={i}>
            <ProposalCard payload={payload} />
          </PanelIn>
        ))}

        {turn.confirmation && (
          <PanelIn>
            <ConfirmationCard confirmation={turn.confirmation} onResolve={onResolveConfirmation} />
          </PanelIn>
        )}

        {turn.error && (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="size-3.5" /> {turn.error}
          </p>
        )}
      </div>
    </div>
  );
}

/** Spec §18 — confirmação explícita, com a contagem de itens afetados. */
function ConfirmationCard({
  confirmation,
  onResolve,
}: {
  confirmation: PendingConfirmation;
  onResolve: (resolution: { ok: boolean; message: string }) => void;
}) {
  const [isPending, setIsPending] = React.useState(false);

  if (confirmation.resolution) {
    return (
      <p
        className={cn(
          "rounded-lg border px-3 py-2 text-xs",
          confirmation.resolution.ok
            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
            : "border-border bg-muted/30 text-muted-foreground",
        )}
      >
        {confirmation.resolution.message}
      </p>
    );
  }

  async function resolve(confirm: boolean) {
    setIsPending(true);
    try {
      const result = confirm
        ? await confirmAgentAction(confirmation.actionId)
        : await cancelAgentAction(confirmation.actionId);
      onResolve(result);
      if (!result.ok) toast.error(result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível concluir a ação.";
      onResolve({ ok: false, message });
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2.5">
      <div className="flex items-start gap-2 text-sm text-foreground">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-500" />
        <div>
          <p className="font-medium">Confirmação necessária</p>
          <p className="text-xs text-muted-foreground">{confirmation.summary}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Itens afetados: <span className="font-medium text-foreground">{confirmation.affectedCount}</span>
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => resolve(false)} disabled={isPending}>
          <X className="size-3.5" />
          Cancelar
        </Button>
        <Button size="sm" onClick={() => resolve(true)} disabled={isPending}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          Confirmar
        </Button>
      </div>
    </div>
  );
}

/** Spec §20/§21 — propostas nunca são criadas sem um clique. */
function ProposalCard({ payload }: { payload: AgentUiPayload }) {
  const [created, setCreated] = React.useState<Set<number>>(new Set());
  const [pendingIndex, setPendingIndex] = React.useState<number | null>(null);

  async function create(
    index: number,
    run: () => Promise<void | { googleError?: string | null }>,
    successMessage: string,
  ) {
    setPendingIndex(index);
    try {
      const result = await run();
      setCreated((prev) => new Set(prev).add(index));
      // O evento foi mesmo criado localmente; o Google é que recusou. Dizer
      // "adicionado" e calar isso seria mentir sobre onde ele está (§13).
      if (result?.googleError) toast.warning(result.googleError);
      else toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar.");
    } finally {
      setPendingIndex(null);
    }
  }

  if (payload.type === "taskProposals") {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-3 py-2.5">
        <p className="text-xs font-medium text-foreground">Tarefas detetadas</p>
        {payload.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate text-foreground">
              {item.title}
              {item.dueDate && (
                <span className="ml-1.5 text-xs text-muted-foreground">até {item.dueDate.slice(0, 10)}</span>
              )}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={created.has(i) || pendingIndex === i}
              onClick={() => create(i, () => createTaskFromProposal(item), "Tarefa criada.")}
            >
              {pendingIndex === i ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : created.has(i) ? (
                <Check className="size-3.5" />
              ) : (
                <CheckSquare className="size-3.5" />
              )}
              {created.has(i) ? "Criada" : "Criar tarefa"}
            </Button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-3 py-2.5">
      <p className="text-xs font-medium text-foreground">Reuniões detetadas</p>
      {payload.items.map((item, i) => (
        <div key={i} className="flex items-center justify-between gap-2 text-sm">
          <span className="min-w-0 truncate text-foreground">
            {item.title}
            <span className="ml-1.5 text-xs text-muted-foreground">
              {new Date(item.startsAt).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}
              {item.location ? ` · ${item.location}` : ""}
            </span>
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={created.has(i) || pendingIndex === i}
            onClick={() => create(i, () => createCalendarEventFromProposal(item), "Adicionado ao calendário.")}
          >
            {pendingIndex === i ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : created.has(i) ? (
              <Check className="size-3.5" />
            ) : (
              <CalendarPlus className="size-3.5" />
            )}
            {created.has(i) ? "Adicionada" : "Adicionar"}
          </Button>
        </div>
      ))}
    </div>
  );
}
