"use client";

/**
 * AI Chat lateral (spec §25-26) — streaming via `/api/ai/chat`. Ainda sem
 * tool calling (Fase 5): só aconselha com o contexto real da inbox.
 */
import * as React from "react";
import { Bot, Loader2, Send, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "O que devo responder primeiro hoje?",
  "Resume o estado da minha inbox.",
  "Tenho alguma coisa urgente por responder?",
];

export function AiChatPanel() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Não foi possível falar com a IA.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });

        const errorMarker = acc.indexOf("[ERRO_IA]");
        if (errorMarker !== -1) {
          setError(acc.slice(errorMarker + "[ERRO_IA]".length));
          acc = acc.slice(0, errorMarker);
        }

        const current = acc;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: current };
          return copy;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro ao falar com a IA.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-4 pt-16 text-center">
            <Bot className="size-8 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-medium text-foreground">Copiloto Nuvoly</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Pergunta sobre a tua inbox. Ainda não executo ações (isso chega numa fase seguinte) — só aconselho.
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
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2.5", m.role === "user" && "flex-row-reverse")}>
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent">
                  {m.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
                </div>
                <div
                  className={cn(
                    "min-w-0 max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground",
                  )}
                >
                  {m.content || (isStreaming && i === messages.length - 1 ? <Loader2 className="size-3.5 animate-spin" /> : null)}
                </div>
              </div>
            ))}
            {error && <p className="text-center text-xs text-destructive">{error}</p>}
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
            placeholder="Pergunta ao copiloto..."
            className="min-h-11 flex-1 resize-none"
            disabled={isStreaming}
          />
          <Button size="icon" onClick={() => send(input)} disabled={isStreaming || !input.trim()}>
            {isStreaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
