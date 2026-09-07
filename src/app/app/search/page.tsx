import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AIError, AIProviderNotConfiguredError } from "@/lib/ai/errors";
import { listThreads } from "@/lib/emails/queries";
import { semanticSearch } from "@/lib/search/semantic";
import { SearchView, type SemanticResult } from "@/components/mail/search-view";

export default async function SearchPage({ searchParams }: PageProps<"/app/search">) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { q, mode } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const semantic = mode === "semantic";

  let results: Awaited<ReturnType<typeof listThreads>> = [];
  let semanticResults: SemanticResult[] = [];
  let semanticError: string | null = null;

  if (query.trim()) {
    if (semantic) {
      try {
        const found = await semanticSearch(session.user.id, query);
        semanticResults = found.threads;
      } catch (error) {
        // A pesquisa semântica depende de um serviço externo (embeddings) —
        // quando ele falha, a página continua a funcionar em modo palavras
        // -chave em vez de rebentar inteira (§35).
        semanticError =
          error instanceof AIProviderNotConfiguredError || error instanceof AIError
            ? error.userMessage
            : "Não foi possível pesquisar por significado agora. Tente novamente.";
        if (!(error instanceof AIError)) console.error("[search] erro não mapeado:", error);
      }
    } else {
      results = await listThreads(session.user.id, { type: "search", query });
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <SearchView
        query={query}
        semantic={semantic}
        results={results}
        semanticResults={semanticResults}
        semanticError={semanticError}
        currentUserEmail={session.user.email ?? ""}
      />
    </div>
  );
}
