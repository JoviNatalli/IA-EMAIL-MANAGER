"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Paperclip, Star } from "lucide-react";

import { toggleThreadStar } from "@/app/actions/emails";
import { SenderAvatar } from "@/components/mail/sender-avatar";
import { LabelChip } from "@/components/mail/label-chip";
import type { ThreadListItem as ThreadListItemData } from "@/lib/emails/queries";
import { formatMailTimestamp, participantLabel } from "@/lib/emails/format";
import { cn } from "@/lib/utils";

export function ThreadListItem({
  thread,
  href,
  active,
  currentUserEmail,
}: {
  thread: ThreadListItemData;
  href: string;
  active: boolean;
  currentUserEmail: string;
}) {
  const [isPending, startTransition] = useTransition();
  const unread = !thread.isRead;
  const isOutbound = thread.lastMessage.fromEmail === currentUserEmail;

  return (
    <Link
      href={href}
      className={cn(
        "group flex gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors",
        active ? "bg-accent" : "hover:bg-accent/50",
      )}
    >
      <SenderAvatar name={thread.lastMessage.fromName} email={thread.lastMessage.fromEmail} />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              unread ? "font-semibold text-foreground" : "font-medium text-foreground/90",
            )}
          >
            {isOutbound ? "Tu" : participantLabel({ name: thread.lastMessage.fromName, email: thread.lastMessage.fromEmail })}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatMailTimestamp(thread.lastMessage.sentAt ?? thread.lastMessageAt)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "min-w-0 truncate text-sm",
              unread ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {thread.subject}
          </span>
          {thread.priority === "high" && (
            <span className="size-1.5 shrink-0 rounded-full bg-destructive" title="Prioridade alta" />
          )}
        </div>

        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="min-w-0 flex-1 truncate">{thread.lastMessage.snippet}</span>
          {thread.messageCount > 1 && (
            <span className="shrink-0 rounded bg-muted px-1 text-[10px] font-medium">
              {thread.messageCount}
            </span>
          )}
          {thread.hasAttachments && <Paperclip className="size-3 shrink-0" />}
        </div>

        {thread.labels.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {thread.labels.slice(0, 3).map((label) => (
              <LabelChip key={label.id} name={label.name} color={label.color} />
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startTransition(() => {
            void toggleThreadStar(thread.id, !thread.isStarred);
          });
        }}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center self-start rounded-md text-muted-foreground/50 transition-colors hover:text-amber-500",
          thread.isStarred && "text-amber-500",
          !thread.isStarred && "opacity-0 group-hover:opacity-100",
        )}
        aria-label={thread.isStarred ? "Remover estrela" : "Adicionar estrela"}
      >
        <Star className={cn("size-4", thread.isStarred && "fill-current")} />
      </button>
    </Link>
  );
}
