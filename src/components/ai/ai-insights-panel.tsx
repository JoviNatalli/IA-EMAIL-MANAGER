"use client";

/**
 * AI Insights (spec §12) — Summary, Intent, Priority, Suggested action,
 * [Draft reply]. Análise sob pedido explícito do utilizador, nunca
 * automática (spec §51 — controlo de custo); resultado fica em cache
 * (`ai_analysis`) até o utilizador pedir para reanalisar.
 */
import * as React from "react";
import { AlertTriangle, Loader2, RefreshCcw, Sparkles, Wand2 } from "lucide-react";

import { analyzeThread, type ThreadAnalysis } from "@/app/actions/ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABEL, PRIORITY_BADGE_CLASS, PRIORITY_LABEL, SENTIMENT_LABEL } from "@/components/ai/ai-labels";
import { ReplyGeneratorDialog } from "@/components/ai/reply-generator-dialog";
import { PanelIn } from "@/components/shared/motion";
import { cn } from "@/lib/utils";

export function AiInsightsPanel({
  threadId,
  initialAnalysis,
  onDraftReply,
}: {
  threadId: string;
  initialAnalysis: ThreadAnalysis | null;
  onDraftReply: (body: string) => void;
}) {
  const [analysis, setAnalysis] = React.useState(initialAnalysis);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = React.useState(false);

  async function handleAnalyze() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeThread(threadId);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          A analisar com IA...
        </div>
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
          <li>A classificar prioridade e categoria...</li>
          <li>A perceber o contexto e a resumir...</li>
        </ul>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-dashed border-border px-4 py-3">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="flex-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">AI Insights</span> — esta conversa ainda
          não foi analisada.
          {error && (
            <p className="mt-1 flex items-center gap-1 text-destructive">
              <AlertTriangle className="size-3.5" /> {error}
            </p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={handleAnalyze}>
          <Sparkles className="size-4" />
          Analisar com IA
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* O resultado da análise foi PEDIDO pelo utilizador e demora vários
          segundos a chegar — aparecer com um movimento curto marca a
          chegada em vez de o substituir de repente (spec §39). */}
      <PanelIn className="flex flex-col gap-2.5 rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className={cn(PRIORITY_BADGE_CLASS[analysis.priority])}>
              Prioridade {PRIORITY_LABEL[analysis.priority]}
            </Badge>
            <Badge variant="outline">{CATEGORY_LABEL[analysis.category] ?? analysis.category}</Badge>
            <Badge variant="outline">{SENTIMENT_LABEL[analysis.sentiment] ?? analysis.sentiment}</Badge>
            {analysis.requiresReply && <Badge variant="warning">Precisa de resposta</Badge>}
          </div>
          <Button size="sm" variant="ghost" onClick={handleAnalyze} title="Reanalisar">
            <RefreshCcw className="size-3.5" />
          </Button>
        </div>

        <div className="text-sm text-foreground">
          {analysis.hasEnoughInformation ? (
            <p>{analysis.summary}</p>
          ) : (
            <p className="italic text-muted-foreground">
              {analysis.summary || "Não há informação suficiente nesta conversa para um resumo fiável."}
            </p>
          )}
        </div>

        {analysis.keyPoints.length > 0 && (
          <ul className="list-inside list-disc text-xs text-muted-foreground">
            {analysis.keyPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Intenção:</span> {analysis.intent}
        </p>

        {analysis.suggestedAction && (
          <p className="rounded-md bg-accent/40 px-2.5 py-1.5 text-xs text-foreground">
            <span className="font-medium">Sugestão:</span> {analysis.suggestedAction}
          </p>
        )}

        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setReplyDialogOpen(true)}>
            <Wand2 className="size-4" />
            Draft reply com IA
          </Button>
        </div>
      </PanelIn>

      <ReplyGeneratorDialog
        open={replyDialogOpen}
        onOpenChange={setReplyDialogOpen}
        threadId={threadId}
        onGenerated={(body) => {
          onDraftReply(body);
          setReplyDialogOpen(false);
        }}
      />
    </>
  );
}
