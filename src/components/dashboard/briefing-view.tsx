"use client";

/**
 * Daily AI Briefing (spec §19). As contagens vêm calculadas do servidor e
 * aparecem logo; o texto de IA é gerado só quando o utilizador o pede
 * (spec §51 — nunca uma chamada ao modelo por cada visita à página).
 */
import * as React from "react";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";

import { generateDailyBriefing } from "@/app/actions/ai";
import { Button } from "@/components/ui/button";
import type { BriefingData } from "@/lib/ai/briefing";
import type { DailyBriefing } from "@/lib/ai/schemas";

const STATS: { key: keyof BriefingData; label: string }[] = [
  { key: "unreadCount", label: "Por ler" },
  { key: "importantCount", label: "Importantes" },
  { key: "needsReplyCount", label: "A precisar de resposta" },
  { key: "draftsCount", label: "Rascunhos" },
  { key: "openTaskCount", label: "Tarefas por fazer" },
  { key: "upcomingEventCount", label: "Eventos (7 dias)" },
];

export function BriefingView({ data }: { data: BriefingData }) {
  const [briefing, setBriefing] = React.useState<DailyBriefing | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function generate() {
    setIsLoading(true);
    setError(null);
    try {
      setBriefing(await generateDailyBriefing());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Resumo de hoje</h1>
        <p className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {STATS.map((stat) => (
          <div key={stat.key} className="rounded-lg border border-border bg-card px-3 py-2.5">
            <p className="text-xl font-semibold text-foreground">{data[stat.key] as number}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {data.analysisMissing && (
        <p className="text-xs text-muted-foreground">
          Ainda não analisaste nenhuma conversa com IA — abre um email e usa &quot;Analisar com IA&quot; para o resumo
          ficar mais útil (a contagem de &quot;a precisar de resposta&quot; vem daí).
        </p>
      )}

      {briefing ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm text-foreground">{briefing.headline}</p>
          {briefing.topPriorities.length > 0 && (
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {briefing.topPriorities.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
          {briefing.suggestion && (
            <p className="rounded-md bg-accent/40 px-2.5 py-1.5 text-xs text-foreground">{briefing.suggestion}</p>
          )}
          <Button variant="ghost" size="sm" className="self-end" onClick={generate} disabled={isLoading}>
            {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            Gerar de novo
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            O resumo escrito é gerado a pedido, a partir destes números — nunca de dados inventados.
          </p>
          <Button size="sm" variant="outline" onClick={generate} disabled={isLoading}>
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Gerar resumo
          </Button>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle className="size-3.5" /> {error}
        </p>
      )}
    </div>
  );
}
