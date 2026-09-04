"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { ThreadListItem } from "@/components/mail/thread-list-item";
import type { ThreadListItem as ThreadListItemData } from "@/lib/emails/queries";
import type { ThreadFolderEnum } from "@/lib/emails/types";

const FOLDER_BASE_PATH: Record<ThreadFolderEnum, string> = {
  inbox: "/app/inbox",
  sent: "/app/sent",
  drafts: "/app/drafts",
  archive: "/app/archive",
  trash: "/app/trash",
};

export function SearchView({
  query,
  results,
  currentUserEmail,
}: {
  query: string;
  results: ThreadListItemData[];
  currentUserEmail: string;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(query);

  function submit(next: string) {
    const params = new URLSearchParams();
    if (next.trim()) params.set("q", next.trim());
    router.push(`/app/search${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Search</h1>
        <p className="text-sm text-muted-foreground">
          Pesquisa por assunto, remetente ou conteúdo. Pesquisa semântica chega na Fase 6.
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
          placeholder="Pesquisar emails..."
          className="h-10 pl-9"
        />
      </div>

      {!query.trim() ? (
        <EmptyState icon={Search} title="Escreve para pesquisar" description="Os resultados aparecem aqui." />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Sem resultados."
          description={`Não encontrámos nada para "${query}".`}
        />
      ) : (
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
      )}
    </div>
  );
}
