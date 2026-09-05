"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Send, Trash2 } from "lucide-react";

import { discardDraft, saveDraft, sendDraft } from "@/app/actions/emails";
import { ComposeAiToolbar } from "@/components/ai/compose-ai-toolbar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCompose, type ComposeInitial } from "@/components/mail/compose-provider";
import type { EmailParticipant } from "@/lib/db/schema";

const AUTOSAVE_DELAY_MS = 1200;

function parseParticipants(raw: string): EmailParticipant[] {
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((email) => ({ name: null, email }));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Dialog sempre montado; o formulário interno remonta (via `key`) a cada `open()`. */
export function ComposeDialog() {
  const { isOpen, initial, sessionKey, close } = useCompose();

  return (
    <Dialog open={isOpen} onOpenChange={(next) => !next && close()}>
      <DialogContent className="flex max-w-2xl flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Novo email</DialogTitle>
        </DialogHeader>
        <ComposeForm key={sessionKey} initial={initial} onClose={close} />
      </DialogContent>
    </Dialog>
  );
}

function ComposeForm({
  initial,
  onClose,
}: {
  initial: ComposeInitial | null;
  onClose: () => void;
}) {
  const [to, setTo] = React.useState(() => (initial?.to ?? []).map((p) => p.email).join(", "));
  const [cc, setCc] = React.useState(() => (initial?.cc ?? []).map((p) => p.email).join(", "));
  const [showCc, setShowCc] = React.useState(() => (initial?.cc?.length ?? 0) > 0);
  const [subject, setSubject] = React.useState(() => initial?.subject ?? "");
  const [body, setBody] = React.useState(() => initial?.body ?? "");
  const [draftThreadId, setDraftThreadId] = React.useState(() => initial?.threadId);
  const [isSending, setIsSending] = React.useState(false);
  const [isSavingLabel, setIsSavingLabel] = React.useState(false);

  const draftThreadIdRef = React.useRef(draftThreadId);

  const buildPayload = React.useCallback(
    () => ({
      threadId: draftThreadIdRef.current,
      to: parseParticipants(to),
      cc: parseParticipants(cc),
      bcc: [],
      subject,
      body,
    }),
    [to, cc, subject, body],
  );

  // Autosave: guarda como rascunho ~1.2s depois da última alteração.
  React.useEffect(() => {
    const hasContent = to.trim() || subject.trim() || body.trim();
    if (!hasContent) return;

    const timer = setTimeout(async () => {
      setIsSavingLabel(true);
      try {
        const result = await saveDraft(buildPayload());
        draftThreadIdRef.current = result.threadId;
        setDraftThreadId(result.threadId);
      } catch {
        // Autosave falhado é silencioso — o utilizador ainda pode enviar/tentar de novo.
      } finally {
        setIsSavingLabel(false);
      }
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [to, cc, subject, body, buildPayload]);

  async function handleSend() {
    const recipients = parseParticipants(to);
    if (recipients.length === 0 || !recipients.every((r) => EMAIL_RE.test(r.email))) {
      toast.error("Indica pelo menos um destinatário com email válido.");
      return;
    }
    setIsSending(true);
    try {
      await sendDraft(buildPayload());
      toast.success("Email enviado.", {
        description: "Modo demo — a mensagem foi guardada em Sent, sem envio real.",
      });
      onClose();
    } catch {
      toast.error("Não foi possível enviar. Tenta novamente.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleDiscard() {
    const id = draftThreadIdRef.current;
    onClose();
    if (id) {
      try {
        await discardDraft(id);
      } catch {
        // silencioso — o rascunho fica órfão mas inofensivo.
      }
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <span className="w-12 shrink-0 text-sm text-muted-foreground">Para</span>
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="nome@exemplo.com, outro@exemplo.com"
            className="h-8 flex-1 border-0 px-0 shadow-none focus-visible:ring-0"
          />
          {!showCc && (
            <button
              type="button"
              onClick={() => setShowCc(true)}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
            >
              Cc
            </button>
          )}
        </div>

        {showCc && (
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <span className="w-12 shrink-0 text-sm text-muted-foreground">Cc</span>
            <Input
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@exemplo.com"
              className="h-8 flex-1 border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        )}

        <div className="flex items-center gap-2 border-b border-border pb-2">
          <span className="w-12 shrink-0 text-sm text-muted-foreground">Assunto</span>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-8 flex-1 border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escreve a tua mensagem..."
          className="min-h-56 resize-none border-0 px-0 shadow-none focus-visible:ring-0"
        />

        <ComposeAiToolbar body={body} onChangeSubject={setSubject} onChangeBody={setBody} />
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">
          {isSavingLabel ? "A guardar rascunho..." : draftThreadId ? "Rascunho guardado" : ""}
        </span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleDiscard}>
            <Trash2 className="size-4" />
            Descartar
          </Button>
          <Button type="button" size="sm" onClick={handleSend} disabled={isSending}>
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Enviar
          </Button>
        </div>
      </div>
    </>
  );
}
