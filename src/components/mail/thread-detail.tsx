"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  ArrowLeft,
  Forward,
  Inbox as InboxIcon,
  Loader2,
  Paperclip,
  Reply,
  ReplyAll,
  Send,
  Sparkles,
  Star,
  Tag,
  Trash2,
} from "lucide-react";

import {
  deleteThreadForever,
  discardDraft,
  moveThread,
  sendReply,
  setThreadLabel,
  setThreadRead,
  toggleThreadStar,
} from "@/app/actions/emails";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { SenderAvatar } from "@/components/mail/sender-avatar";
import { LabelChip, LABEL_DOT_CLASSES } from "@/components/mail/label-chip";
import { useCompose } from "@/components/mail/compose-provider";
import type { ThreadDetail as ThreadDetailData } from "@/lib/emails/queries";
import type { LabelWithCount } from "@/lib/emails/queries";
import {
  formatFileSize,
  formatFullTimestamp,
  formatMailTimestamp,
  participantLabel,
} from "@/lib/emails/format";
import { cn } from "@/lib/utils";

export function ThreadDetailEmpty() {
  return (
    <EmptyState
      icon={InboxIcon}
      title="Seleciona uma conversa"
      description="Escolhe um email da lista para veres o conteúdo aqui."
      className="hidden md:flex"
    />
  );
}

export function ThreadDetail({
  thread,
  basePath,
  currentUserEmail,
  labels,
}: {
  thread: ThreadDetailData;
  basePath: string;
  currentUserEmail: string;
  labels: LabelWithCount[];
}) {
  const router = useRouter();
  const { open: openCompose } = useCompose();
  const [isPending, startTransition] = React.useTransition();
  const [expanded, setExpanded] = React.useState<Set<string>>(
    () => new Set(thread.messages.length ? [thread.messages[thread.messages.length - 1].id] : []),
  );
  const [replyMode, setReplyMode] = React.useState<"reply" | "reply-all" | null>(null);
  const [replyBody, setReplyBody] = React.useState("");
  const [isSendingReply, setIsSendingReply] = React.useState(false);

  const markedReadRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!thread.isRead && markedReadRef.current !== thread.id) {
      markedReadRef.current = thread.id;
      void setThreadRead(thread.id, true);
    }
  }, [thread.id, thread.isRead]);

  const lastMessage = thread.messages[thread.messages.length - 1];
  const isDraft = thread.folder === "drafts";
  const isTrash = thread.folder === "trash";
  const canReply = !isDraft && !isTrash;
  const appliedLabelIds = new Set(thread.labels.map((l) => l.id));

  const otherParticipants = React.useMemo(() => {
    const map = new Map<string, { name: string | null; email: string }>();
    for (const m of thread.messages) {
      if (m.fromEmail !== currentUserEmail) map.set(m.fromEmail, { name: m.fromName, email: m.fromEmail });
      for (const p of [...m.to, ...m.cc]) {
        if (p.email !== currentUserEmail) map.set(p.email, p);
      }
    }
    return Array.from(map.values());
  }, [thread.messages, currentUserEmail]);

  function replyRecipients(mode: "reply" | "reply-all") {
    if (!lastMessage) return { to: [] as { name: string | null; email: string }[], cc: [] };
    const primary =
      lastMessage.fromEmail === currentUserEmail
        ? lastMessage.to
        : [{ name: lastMessage.fromName, email: lastMessage.fromEmail }];
    if (mode === "reply") return { to: primary, cc: [] };
    const ccExtra = otherParticipants.filter((p) => !primary.some((t) => t.email === p.email));
    return { to: primary, cc: ccExtra };
  }

  function runAction(action: () => Promise<void>, successMessage?: string) {
    startTransition(async () => {
      try {
        await action();
        if (successMessage) toast.success(successMessage);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Ocorreu um erro.");
      }
    });
  }

  async function handleSendReply() {
    if (!replyMode || !replyBody.trim()) return;
    const { to, cc } = replyRecipients(replyMode);
    setIsSendingReply(true);
    try {
      await sendReply({ threadId: thread.id, to, cc, body: replyBody });
      setReplyBody("");
      setReplyMode(null);
      toast.success("Resposta enviada.", { description: "Modo demo — sem envio real." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível responder.");
    } finally {
      setIsSendingReply(false);
    }
  }

  function handleForward() {
    if (!lastMessage) return;
    openCompose({
      subject: thread.subject.startsWith("Fwd: ") ? thread.subject : `Fwd: ${thread.subject}`,
      body: `\n\n---------- Mensagem encaminhada ----------\nDe: ${participantLabel({ name: lastMessage.fromName, email: lastMessage.fromEmail })}\nAssunto: ${thread.subject}\n\n${lastMessage.bodyText}`,
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => router.push(basePath)}
          aria-label="Voltar à lista"
        >
          <ArrowLeft className="size-4" />
        </Button>

        {isTrash ? (
          <>
            <ToolbarButton
              icon={InboxIcon}
              label="Restaurar"
              onClick={() => runAction(() => moveThread(thread.id, "inbox"), "Restaurado para o Inbox.")}
              disabled={isPending}
            />
            <ToolbarButton
              icon={Trash2}
              label="Apagar definitivamente"
              destructive
              onClick={() =>
                runAction(async () => {
                  await deleteThreadForever(thread.id);
                  router.push(basePath);
                }, "Apagado definitivamente.")
              }
              disabled={isPending}
            />
          </>
        ) : isDraft ? (
          <>
            <ToolbarButton
              icon={Send}
              label="Continuar a editar"
              onClick={() =>
                openCompose({
                  threadId: thread.id,
                  to: lastMessage?.to,
                  cc: lastMessage?.cc,
                  subject: thread.subject === "(sem assunto)" ? "" : thread.subject,
                  body: lastMessage?.bodyText,
                })
              }
            />
            <ToolbarButton
              icon={Trash2}
              label="Apagar rascunho"
              destructive
              onClick={() =>
                runAction(async () => {
                  await discardDraft(thread.id);
                  router.push(basePath);
                }, "Rascunho apagado.")
              }
              disabled={isPending}
            />
          </>
        ) : (
          <>
            <ToolbarButton
              icon={Star}
              label={thread.isStarred ? "Remover estrela" : "Adicionar estrela"}
              active={thread.isStarred}
              onClick={() => runAction(() => toggleThreadStar(thread.id, !thread.isStarred))}
              disabled={isPending}
            />
            {thread.folder === "archive" ? (
              <ToolbarButton
                icon={InboxIcon}
                label="Mover para Inbox"
                onClick={() => runAction(() => moveThread(thread.id, "inbox"), "Movido para o Inbox.")}
                disabled={isPending}
              />
            ) : (
              <ToolbarButton
                icon={Archive}
                label="Arquivar"
                onClick={() => runAction(() => moveThread(thread.id, "archive"), "Arquivado.")}
                disabled={isPending}
              />
            )}
            <ToolbarButton
              icon={Trash2}
              label="Mover para o lixo"
              onClick={() =>
                runAction(async () => {
                  await moveThread(thread.id, "trash");
                  router.push(basePath);
                }, "Movido para o lixo.")
              }
              disabled={isPending}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isPending}>
                  <Tag className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Labels</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {labels.length === 0 && (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">
                    Ainda não tens labels.
                  </p>
                )}
                {labels.map((label) => (
                  <DropdownMenuCheckboxItem
                    key={label.id}
                    checked={appliedLabelIds.has(label.id)}
                    onCheckedChange={(checked) =>
                      runAction(() => setThreadLabel(thread.id, label.id, checked === true))
                    }
                  >
                    <span className={cn("size-2 rounded-full", LABEL_DOT_CLASSES[label.color as keyof typeof LABEL_DOT_CLASSES] ?? "bg-slate-500")} />
                    {label.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5 md:px-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-lg font-semibold text-balance text-foreground">{thread.subject}</h1>
            <div data-testid="thread-labels" className="flex flex-wrap items-center gap-1.5">
              {thread.labels.map((label) => (
                <LabelChip key={label.id} name={label.name} color={label.color} />
              ))}
            </div>
          </div>

          <AiInsightsPlaceholder />

          <div className="flex flex-col gap-2">
            {thread.messages.map((message, index) => {
              const isLast = index === thread.messages.length - 1;
              const isExpanded = expanded.has(message.id) || isLast;
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isDraft={isDraft}
                  expanded={isExpanded}
                  onToggle={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(message.id)) next.delete(message.id);
                      else next.add(message.id);
                      return next;
                    })
                  }
                />
              );
            })}
          </div>
        </div>
      </div>

      {canReply && (
        <div className="shrink-0 border-t border-border px-4 py-3 md:px-6">
          {replyMode ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                Para: {replyRecipients(replyMode).to.map(participantLabel).join(", ") || "—"}
                {replyRecipients(replyMode).cc.length > 0 &&
                  ` · Cc: ${replyRecipients(replyMode).cc.map(participantLabel).join(", ")}`}
              </p>
              <Textarea
                autoFocus
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Escreve a tua resposta..."
                className="min-h-24 resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setReplyMode(null)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSendReply} disabled={isSendingReply || !replyBody.trim()}>
                  {isSendingReply ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Enviar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setReplyMode("reply")}>
                <Reply className="size-4" />
                Responder
              </Button>
              {otherParticipants.length > 1 && (
                <Button variant="outline" size="sm" onClick={() => setReplyMode("reply-all")}>
                  <ReplyAll className="size-4" />
                  Responder a todos
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleForward}>
                <Forward className="size-4" />
                Reencaminhar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  active,
  destructive,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          disabled={disabled}
          className={cn(active && "text-amber-500", destructive && "hover:text-destructive")}
          aria-label={label}
        >
          <Icon className={cn("size-4", active && "fill-current")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function MessageBubble({
  message,
  isDraft,
  expanded,
  onToggle,
}: {
  message: ThreadDetailData["messages"][number];
  isDraft: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-left transition-colors hover:bg-accent/40"
      >
        <SenderAvatar name={message.fromName} email={message.fromEmail} className="size-7" />
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{participantLabel({ name: message.fromName, email: message.fromEmail })}</span>{" "}
          — {message.snippet}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {message.sentAt ? formatMailTimestamp(message.sentAt) : "Rascunho"}
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 text-left">
        <SenderAvatar name={message.fromName} email={message.fromEmail} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="font-medium text-foreground">{participantLabel({ name: message.fromName, email: message.fromEmail })}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {isDraft
                ? "Rascunho"
                : message.sentAt
                  ? formatFullTimestamp(message.sentAt)
                  : "Rascunho"}
            </span>
          </div>
          {message.to.length > 0 && (
            <p className="truncate text-xs text-muted-foreground">
              para {message.to.map(participantLabel).join(", ")}
              {message.cc.length > 0 && ` · cc ${message.cc.map(participantLabel).join(", ")}`}
            </p>
          )}
        </div>
      </button>

      <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {message.bodyText || <span className="text-muted-foreground italic">Sem conteúdo.</span>}
      </div>

      {message.attachments.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {message.attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs"
            >
              <Paperclip className="size-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground">{a.fileName}</span>
              <span className="text-muted-foreground">{formatFileSize(a.fileSizeBytes)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AiInsightsPlaceholder() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed border-border px-4 py-3">
      <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">AI Insights</span> — resumo, prioridade e
        respostas sugeridas chegam na Fase 4. Esta thread ainda não foi analisada por IA.
      </div>
    </div>
  );
}
