"use client";

/**
 * Atalhos de teclado da app (Fase 7, spec §36).
 *
 * Um único listener global, não um por componente: dois `keydown` no
 * `document` a competir pela mesma tecla é a forma mais rápida de ter
 * atalhos que funcionam num ecrã e não noutro.
 *
 * Os atalhos globais (`C`, `G I`) vivem aqui. Os que só fazem sentido com
 * uma conversa aberta (`R`, `A`/`E`, `S`) são REGISTADOS pelo componente que
 * os sabe executar (`ThreadDetail`, via `useThreadShortcuts`) e limpos
 * quando ele desmonta — assim carregar `A` numa página sem conversa aberta
 * não faz nada, em vez de arquivar a conversa errada.
 */
import * as React from "react";
import { useRouter } from "next/navigation";

import { useCompose } from "@/components/mail/compose-provider";

/** Ações que dependem de uma conversa aberta. */
export interface ThreadShortcutHandlers {
  onReply?: () => void;
  onArchive?: () => void;
  onStar?: () => void;
}

type ShortcutsContextValue = {
  register: (handlers: ThreadShortcutHandlers) => void;
  unregister: () => void;
};

const ShortcutsContext = React.createContext<ShortcutsContextValue | null>(null);

/**
 * Um atalho nunca pode disparar enquanto o utilizador escreve.
 *
 * `contentEditable` entra na lista porque o compose e o editor de resposta
 * podem passar a usá-lo — verificar só INPUT/TEXTAREA deixava esse buraco
 * aberto. Mesma ideia do guard que já existia no command palette.
 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    target.isContentEditable
  );
}

/** Janela para completar uma sequência tipo `G` depois `I`. */
const SEQUENCE_TIMEOUT_MS = 1200;

export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { open: openCompose } = useCompose();
  const handlersRef = React.useRef<ThreadShortcutHandlers>({});

  const value = React.useMemo<ShortcutsContextValue>(
    () => ({
      register: (handlers) => {
        handlersRef.current = handlers;
      },
      unregister: () => {
        handlersRef.current = {};
      },
    }),
    [],
  );

  React.useEffect(() => {
    // `pendingPrefix` guarda o `G` de uma sequência `G I`. Fica em ref
    // implícita (variável do efeito) porque não afeta nada renderizado.
    let pendingPrefix: string | null = null;
    let prefixTimer: ReturnType<typeof setTimeout> | undefined;

    function clearPrefix() {
      pendingPrefix = null;
      if (prefixTimer) clearTimeout(prefixTimer);
    }

    function onKeyDown(event: KeyboardEvent) {
      // Um atalho com modificador é do sistema ou do browser (⌘K é tratado
      // no command palette) — nunca nosso.
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      const key = event.key.toLowerCase();

      if (pendingPrefix === "g") {
        clearPrefix();
        if (key === "i") {
          event.preventDefault();
          router.push("/app/inbox");
        }
        return;
      }

      switch (key) {
        case "g":
          // Não faz nada sozinho: espera pela segunda tecla.
          pendingPrefix = "g";
          prefixTimer = setTimeout(clearPrefix, SEQUENCE_TIMEOUT_MS);
          break;
        case "c":
          event.preventDefault();
          openCompose();
          break;
        case "r":
          if (handlersRef.current.onReply) {
            event.preventDefault();
            handlersRef.current.onReply();
          }
          break;
        case "a":
        case "e":
          if (handlersRef.current.onArchive) {
            event.preventDefault();
            handlersRef.current.onArchive();
          }
          break;
        case "s":
          if (handlersRef.current.onStar) {
            event.preventDefault();
            handlersRef.current.onStar();
          }
          break;
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (prefixTimer) clearTimeout(prefixTimer);
    };
  }, [router, openCompose]);

  return <ShortcutsContext.Provider value={value}>{children}</ShortcutsContext.Provider>;
}

/**
 * Liga as ações da conversa aberta aos atalhos globais.
 *
 * `handlers` costuma ser recriado a cada render; guardamos numa ref e
 * registamos de novo a cada render em vez de exigir `useCallback` a quem
 * chama — o custo é uma atribuição, e evita atalhos presos a closures
 * antigas (que arquivariam a conversa anterior).
 */
export function useThreadShortcuts(handlers: ThreadShortcutHandlers) {
  const ctx = React.useContext(ShortcutsContext);
  const latest = React.useRef(handlers);

  // Sem dependências de propósito: corre depois de cada render e mantém a
  // ref sempre com as closures atuais. Escrever a ref durante o render seria
  // mais direto, mas o React proíbe-o (e o lint apanha).
  React.useEffect(() => {
    latest.current = handlers;
  });

  React.useEffect(() => {
    if (!ctx) return;
    ctx.register({
      onReply: () => latest.current.onReply?.(),
      onArchive: () => latest.current.onArchive?.(),
      onStar: () => latest.current.onStar?.(),
    });
    return () => ctx.unregister();
  }, [ctx]);
}
