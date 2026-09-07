"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { disconnectCalendar } from "@/app/actions/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Mensagens do retorno OAuth — o callback só passa um código, nunca texto. */
const CALLBACK_MESSAGES: Record<string, { text: string; tone: "success" | "error" }> = {
  connected: { text: "Google Calendar ligado.", tone: "success" },
  cancelled: { text: "Autorização cancelada — o calendário não foi ligado.", tone: "error" },
  invalid: { text: "Pedido de autorização inválido. Tente ligar novamente.", tone: "error" },
  error: { text: "Não foi possível ligar o Google Calendar. Tente novamente.", tone: "error" },
};

export function CalendarConnectionCard({
  connected,
  eventCount,
  syncedEventCount,
}: {
  connected: boolean;
  eventCount: number;
  syncedEventCount: number;
}) {
  const params = useSearchParams();
  const status = params.get("calendar");
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const message = status ? CALLBACK_MESSAGES[status] : undefined;

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-muted">
            <CalendarDays className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Google Calendar</p>
            <p className="text-xs text-muted-foreground">
              {connected
                ? "Os eventos criados aqui aparecem também no seu calendário."
                : "Autorização separada da do Gmail — pedida só quando a liga."}
            </p>
          </div>
        </div>
        <Badge variant="outline">{connected ? "Ligado" : "Não ligado"}</Badge>
      </div>

      {message && (
        <p
          className={
            message.tone === "success"
              ? "mt-4 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-foreground"
              : "mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          }
        >
          {message.text}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          {eventCount === 0
            ? "Ainda sem eventos."
            : connected
              ? `${syncedEventCount} de ${eventCount} evento(s) também no Google Calendar. Os anteriores à ligação ficaram só no Nuvoly.`
              : `${eventCount} evento(s) guardados apenas no Nuvoly.`}
        </p>

        {connected ? (
          <div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isDisconnecting}
              onClick={async () => {
                setIsDisconnecting(true);
                try {
                  await disconnectCalendar();
                  toast.success("Google Calendar desligado. Os eventos já criados lá continuam no seu calendário.");
                } catch {
                  toast.error("Não foi possível desligar agora. Tente novamente.");
                } finally {
                  setIsDisconnecting(false);
                }
              }}
            >
              {isDisconnecting && <Loader2 className="size-4 animate-spin" />}
              Desligar
            </Button>
          </div>
        ) : (
          <div>
            <Button size="sm" variant="secondary" asChild>
              <a href="/api/google/calendar/connect">Ligar Google Calendar</a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
