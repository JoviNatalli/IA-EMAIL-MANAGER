"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { ThreadListItem } from "@/components/mail/thread-list-item";
import type { ThreadListItem as ThreadListItemData } from "@/lib/emails/queries";
import type { ThreadFolderEnum } from "@/lib/emails/types";
import { cn } from "@/lib/utils";

export type SemanticResult = ThreadListItemData & { score: number; passage: string };

const FOLDER_BASE_PATH: Record<ThreadFolderEnum, string> = {
  inbox: "/app/inbox",
  sent: "/app/sent",
  drafts: "/app/drafts",
  archive: "/app/archive",
  trash: "/app/trash",
};

/** O excerto indexado começa pelo cabeçalho que a indexação lhe colou. */
function passageBody(passage: string): string {
  const [, ...rest] = passage.split("\n\n");
  return (rest.join("\n\n") || passage).replace(/\s+/g, " ").trim();
}

export function SearchView({
  query,
  semantic,
  results,
  semanticResults,
  semanticError,
  currentUserEmail,
}: {
  query: string;
  semantic: boolean;
  results: ThreadListItemData[];
  semanticResults: SemanticResult[];
  semanticError: string | null;
  currentUserEmail: string;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(query);
  // A resposta guarda a pergunta a que responde. Assim que a pesquisa muda,
  // a chave deixa de bater certo e a resposta antiga desaparece sozinha —
  // mostrar uma resposta ao lado dos resultados errados seria pior do que
  // não mostrar nenhuma.
  const [answerFor, setAnswerFor] = React.useState<{ key: string; text: string } | null>(null);
  const [answering, setAnswering] = React.useState(false);
  const answerKey = `${semantic ? "s" : "k"}:${query}`;
  const answer = answerFor?.key === answerKey ? answerFor.text : "";

  function submit(next: string, nextSemantic = semantic) {
    const params = new URLSearchParams();
    if (next.trim()) params.set("q", next.trim());
    if (nextSemantic) params.set("mode", "semantic");
    router.push(`/app/search${params.toString() ? `?${params}` : ""}`);
  }

  async function askAI() {
    const key = answerKey;
    const fail = () =>
      setAnswerFor({ key, text: "Não foi possível responder agora. Tente novamente." });

    setAnswering(true);
    setAnswerFor(null);
    try {
      const response = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok || !response.body) {
        fail();
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        const text = decoder.decode(chunk, { stream: true });
        setAnswerFor((current) =>
          current?.key === key ? { key, text: current.text + text } : { key, text },
        );
      }
    } catch {
      fail();
    } finally {
      setAnswering(false);
    }
  }

  const hasQuery = query.trim().length > 0;
  const list = semantic ? semanticResults : results;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Search</h1>
        <p className="text-sm text-muted-foreground">
          {semantic
            ? "Pesquisa por significado: descreve o que procuras, mesmo sem saber as palavras exatas do email."
            : "Pesquisa por assunto, remetente ou conteúdo — encontra as palavras tal como foram escritas."}
        </p>
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit(value)}
          onBlur={() => submit(value)}
          placeholder={semantic ? "Ex.: o cliente que estava preocupado com o prazo" : "Pesquisar emails..."}
          className="h-10 pl-9"
        />
      </div>

      <div
        role="group"
        aria-label="Modo de pesquisa"
        className="flex w-fit gap-1 rounded-lg border border-border p-1"
      >
        {[
          { label: "Palavras-chave", active: !semantic, next: false },
          { label: "Significado", active: semantic, next: true },
        ].map((tab) => (
          <button
            key={tab.label}
            type="button"
            aria-pressed={tab.active}
            onClick={() => submit(value, tab.next)}
            className={cn(
              "cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors",
              tab.active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {semanticError ? (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {semanticError}
        </p>
      ) : null}

      {semantic && hasQuery && list.length > 0 ? (
        <div className="rounded-lg border border-border p-3">
          {answer ? (
            <p className="text-sm whitespace-pre-wrap text-foreground">{answer}</p>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Quer uma resposta a partir destes emails?
              </p>
              <Button size="sm" variant="outline" onClick={askAI} disabled={answering}>
                {answering ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {answering ? "A responder..." : "Responder com IA"}
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {!hasQuery ? (
        <EmptyState icon={Search} title="Escreve para pesquisar" description="Os resultados aparecem aqui." />
      ) : list.length === 0 && !semanticError ? (
        <EmptyState
          icon={Search}
          title="Sem resultados."
          description={
            semantic
              ? `Nenhum email suficientemente relacionado com "${query}".`
              : `Não encontrámos nada para "${query}".`
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {semantic
            ? semanticResults.map((thread) => (
                <div key={thread.id} className="overflow-hidden rounded-lg border border-border">
                  <ThreadListItem
                    thread={thread}
                    href={`${FOLDER_BASE_PATH[thread.folder]}/${thread.id}`}
                    active={false}
                    currentUserEmail={currentUserEmail}
                  />
                  <p className="border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {Math.round(thread.score * 100)}% de proximidade
                    </span>{" "}
                    · {passageBody(thread.passage).slice(0, 180)}
                  </p>
                </div>
              ))
            : null}
          {!semantic ? (
            <div className="overflow-hidden rounded-lg border border-border">
              {results.map((thread) => (
                <ThreadListItem
                  key={thread.id}
                  thread={thread}
                  href={`${FOLDER_BASE_PATH[thread.folder]}/${thread.id}`}
                  active={false}
                  currentUserEmail={currentUserEmail}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
