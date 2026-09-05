"use client";

/** Smart Reply (spec §15) — sugestões rápidas, geradas sob pedido. */
import * as React from "react";
import { Loader2, Zap } from "lucide-react";

import { getQuickReplies } from "@/app/actions/ai";
import { Button } from "@/components/ui/button";

export function QuickReplies({ threadId, onPick }: { threadId: string; onPick: (text: string) => void }) {
  const [replies, setReplies] = React.useState<string[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFetch() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getQuickReplies(threadId);
      setReplies(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro.");
    } finally {
      setIsLoading(false);
    }
  }

  if (replies === null) {
    return (
      <Button variant="ghost" size="sm" onClick={handleFetch} disabled={isLoading} className="text-muted-foreground">
        {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
        Smart Reply
        {error && <span className="text-destructive">— {error}</span>}
      </Button>
    );
  }

  if (replies.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {replies.map((reply, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(reply)}
          className="rounded-full border border-border bg-accent/30 px-3 py-1 text-xs text-foreground transition-colors hover:bg-accent"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}
