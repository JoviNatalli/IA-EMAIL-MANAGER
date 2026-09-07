"use client";

import { PenSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ListItemIn } from "@/components/shared/motion";
import { ThreadListItem } from "@/components/mail/thread-list-item";
import { useCompose } from "@/components/mail/compose-provider";
import type { ThreadListItem as ThreadListItemData } from "@/lib/emails/queries";
import { cn } from "@/lib/utils";

export function ThreadList({
  title,
  items,
  basePath,
  selectedThreadId,
  currentUserEmail,
  emptyState,
  className,
}: {
  title: string;
  items: ThreadListItemData[];
  basePath: string;
  selectedThreadId?: string;
  currentUserEmail: string;
  /** Pré-renderizado no server (MailShell) — um elemento de componente não
   * pode atravessar a fronteira server→client como prop, só JSX já resolvido. */
  emptyState: React.ReactNode;
  className?: string;
}) {
  const { open: openCompose } = useCompose();

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "conversa" : "conversas"}
          </p>
        </div>
        <Button size="icon" variant="ghost" onClick={() => openCompose()} aria-label="Novo email">
          <PenSquare className="size-4" />
        </Button>
      </div>

      {items.length === 0 ? (
        emptyState
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.map((thread, index) => (
            <ListItemIn key={thread.id} index={index}>
              <ThreadListItem
                thread={thread}
                href={`${basePath}/${thread.id}`}
                active={thread.id === selectedThreadId}
                currentUserEmail={currentUserEmail}
              />
            </ListItemIn>
          ))}
        </div>
      )}
    </div>
  );
}
