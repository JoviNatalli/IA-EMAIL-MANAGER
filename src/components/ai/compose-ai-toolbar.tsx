"use client";

/** AI Compose actions (spec §41/§42) — sobre o texto já escrito no compose. */
import * as React from "react";
import { Languages, Loader2, Sparkles, Wand2 } from "lucide-react";

import { generateEmailDraft, runComposeAction } from "@/app/actions/ai";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { ComposeAction } from "@/lib/ai/schemas";

const ACTION_LABEL: Record<ComposeAction, string> = {
  improve: "Melhorar escrita",
  shorten: "Tornar mais curto",
  professional: "Mais profissional",
  friendlier: "Mais simpático",
  translate: "Traduzir...",
  continue: "Continuar a escrever",
};

export function ComposeAiToolbar({
  body,
  onChangeSubject,
  onChangeBody,
}: {
  body: string;
  onChangeSubject: (value: string) => void;
  onChangeBody: (value: string) => void;
}) {
  const [pendingAction, setPendingAction] = React.useState<ComposeAction | "draft" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [translateOpen, setTranslateOpen] = React.useState(false);
  const [targetLanguage, setTargetLanguage] = React.useState("inglês");
  const [draftOpen, setDraftOpen] = React.useState(false);
  const [draftInstruction, setDraftInstruction] = React.useState("");

  async function applyAction(action: ComposeAction, language?: string) {
    if (!body.trim()) {
      setError("Escreva algum texto primeiro.");
      return;
    }
    setPendingAction(action);
    setError(null);
    try {
      const result = await runComposeAction(action, body, language);
      onChangeBody(action === "continue" ? `${body}${result}` : result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro.");
    } finally {
      setPendingAction(null);
      setTranslateOpen(false);
    }
  }

  async function handleGenerateDraft() {
    if (!draftInstruction.trim()) return;
    setPendingAction("draft");
    setError(null);
    try {
      const result = await generateEmailDraft(draftInstruction);
      onChangeSubject(result.subject);
      onChangeBody(result.body);
      setDraftOpen(false);
      setDraftInstruction("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro.");
    } finally {
      setPendingAction(null);
    }
  }

  const isBusy = pendingAction !== null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" disabled={isBusy}>
              {isBusy && pendingAction !== "draft" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Ações de IA
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {(Object.keys(ACTION_LABEL) as ComposeAction[]).map((action) => (
              <React.Fragment key={action}>
                <DropdownMenuItem
                  onSelect={(e) => {
                    if (action === "translate") {
                      e.preventDefault();
                      setTranslateOpen(true);
                      return;
                    }
                    void applyAction(action);
                  }}
                >
                  {action === "translate" && <Languages className="size-4" />}
                  {ACTION_LABEL[action]}
                </DropdownMenuItem>
              </React.Fragment>
            ))}
            <DropdownMenuSeparator />
          </DropdownMenuContent>
        </DropdownMenu>

        <Button type="button" variant="ghost" size="sm" onClick={() => setDraftOpen((v) => !v)}>
          <Wand2 className="size-4" />
          Escrever com IA
        </Button>

        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>

      {translateOpen && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
          <Input
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            placeholder="Idioma (ex.: inglês)"
            className="h-8 flex-1"
          />
          <Button type="button" size="sm" onClick={() => applyAction("translate", targetLanguage)} disabled={isBusy}>
            Traduzir
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setTranslateOpen(false)}>
            Cancelar
          </Button>
        </div>
      )}

      {draftOpen && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
          <Input
            value={draftInstruction}
            onChange={(e) => setDraftInstruction(e.target.value)}
            placeholder='Ex.: "Escrever a adiar a reunião de amanhã"'
            className="h-8 flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleGenerateDraft()}
          />
          <Button type="button" size="sm" onClick={handleGenerateDraft} disabled={isBusy || !draftInstruction.trim()}>
            {pendingAction === "draft" ? <Loader2 className="size-4 animate-spin" /> : "Gerar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setDraftOpen(false)}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
