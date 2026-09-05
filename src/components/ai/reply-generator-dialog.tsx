"use client";

/** AI Reply Generator (spec §14) — tom + comprimento configuráveis + instrução livre. */
import * as React from "react";
import { Loader2, Wand2 } from "lucide-react";

import { generateReply } from "@/app/actions/ai";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { REPLY_LENGTHS, REPLY_TONES, type ReplyLength, type ReplyTone } from "@/lib/ai/schemas";

const TONE_LABEL: Record<ReplyTone, string> = {
  professional: "Profissional",
  friendly: "Simpático",
  concise: "Conciso",
  formal: "Formal",
  casual: "Casual",
  empathetic: "Empático",
};

const LENGTH_LABEL: Record<ReplyLength, string> = {
  short: "Curta",
  medium: "Média",
  detailed: "Detalhada",
};

export function ReplyGeneratorDialog({
  open,
  onOpenChange,
  threadId,
  onGenerated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string;
  onGenerated: (body: string) => void;
}) {
  const [tone, setTone] = React.useState<ReplyTone>("professional");
  const [length, setLength] = React.useState<ReplyLength>("medium");
  const [instructions, setInstructions] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const body = await generateReply(threadId, { tone, length, instructions: instructions.trim() || undefined });
      onGenerated(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-4" /> Draft reply com IA
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Tom</span>
              <Select value={tone} onValueChange={(v) => setTone(v as ReplyTone)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPLY_TONES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TONE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Comprimento</span>
              <Select value={length} onValueChange={(v) => setLength(v as ReplyLength)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPLY_LENGTHS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {LENGTH_LABEL[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Instruções (opcional)</span>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder='Ex.: "Diz que só consigo na próxima semana"'
              className="min-h-16 resize-none"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button onClick={handleGenerate} disabled={isGenerating} className="self-end">
            {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            Gerar resposta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
