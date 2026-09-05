"use client";

import { useActionState, useTransition } from "react";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { signInWithGoogle } from "@/app/actions/auth";
import { disconnectGmailAccount, triggerGmailSync, type GmailSyncActionState } from "@/app/actions/gmail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const initialSyncState: GmailSyncActionState = { status: "idle" };

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return `há ${days} d`;
}

export function GmailConnectionCard({
  connected,
  email,
  syncStatus,
  lastSyncedAt,
  lastError,
  threadCount,
}: {
  connected: boolean;
  email: string | null;
  syncStatus: "idle" | "syncing" | "error" | null;
  lastSyncedAt: Date | null;
  lastError: string | null;
  threadCount: number;
}) {
  const [syncState, syncAction, isSyncPending] = useActionState(async (_: GmailSyncActionState) => {
    const result = await triggerGmailSync();
    if (result.status === "success") {
      toast.success(`Sincronização concluída — ${result.threadsSynced} conversas.`);
    } else if (result.status === "error") {
      toast.error(result.message);
    }
    return result;
  }, initialSyncState);

  const [isDisconnecting, startDisconnect] = useTransition();

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-muted">
            <Mail className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Gmail</p>
            <p className="text-xs text-muted-foreground">
              {connected ? email : "Sincronização real via Gmail API (OAuth)"}
            </p>
          </div>
        </div>
        {connected ? (
          <Badge variant={syncStatus === "error" ? "destructive" : "outline"}>
            {syncStatus === "error" ? "Erro na sincronização" : "Ligado"}
          </Badge>
        ) : (
          <Badge variant="outline">Não ligado</Badge>
        )}
      </div>

      {connected && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            {threadCount > 0
              ? `${threadCount} conversas sincronizadas${lastSyncedAt ? ` · última sincronização ${formatRelative(lastSyncedAt)}` : ""}.`
              : "Ainda sem conversas sincronizadas."}{" "}
            A sincronização inicial traz as últimas 30 conversas — ver README.
          </p>
          {syncStatus === "error" && lastError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {lastError}
            </p>
          )}
          {syncState.status === "error" && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {syncState.message}
            </p>
          )}
          <div className="flex gap-2">
            <form action={syncAction}>
              <Button type="submit" size="sm" variant="secondary" disabled={isSyncPending}>
                {isSyncPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Sincronizar agora
              </Button>
            </form>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isDisconnecting}
              onClick={() =>
                startDisconnect(async () => {
                  await disconnectGmailAccount();
                  toast.success("Conta Gmail desligada. As conversas já sincronizadas foram mantidas.");
                })
              }
            >
              {isDisconnecting && <Loader2 className="size-4 animate-spin" />}
              Desligar
            </Button>
          </div>
        </div>
      )}

      {!connected && (
        <form action={signInWithGoogle} className="mt-4 border-t border-border pt-4">
          <Button type="submit" size="sm" variant="secondary">
            Ligar conta Gmail
          </Button>
        </form>
      )}
    </div>
  );
}
