"use client";

import * as React from "react";

import type { EmailParticipant } from "@/lib/db/schema";

export interface ComposeInitial {
  threadId?: string;
  to?: EmailParticipant[];
  cc?: EmailParticipant[];
  subject?: string;
  body?: string;
}

type ComposeContextValue = {
  isOpen: boolean;
  initial: ComposeInitial | null;
  /** Muda a cada `open()` — usado para reiniciar o estado interno do dialog mesmo que os campos sejam iguais. */
  sessionKey: number;
  open: (initial?: ComposeInitial) => void;
  close: () => void;
};

const ComposeContext = React.createContext<ComposeContextValue | null>(null);

export function ComposeProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [initial, setInitial] = React.useState<ComposeInitial | null>(null);
  const [sessionKey, setSessionKey] = React.useState(0);

  const open = React.useCallback((next?: ComposeInitial) => {
    setInitial(next ?? null);
    setSessionKey((k) => k + 1);
    setIsOpen(true);
  }, []);

  const close = React.useCallback(() => setIsOpen(false), []);

  const value = React.useMemo(
    () => ({ isOpen, initial, sessionKey, open, close }),
    [isOpen, initial, sessionKey, open, close],
  );

  return <ComposeContext.Provider value={value}>{children}</ComposeContext.Provider>;
}

export function useCompose() {
  const ctx = React.useContext(ComposeContext);
  if (!ctx) {
    throw new Error("useCompose deve ser usado dentro de <ComposeProvider>");
  }
  return ctx;
}
