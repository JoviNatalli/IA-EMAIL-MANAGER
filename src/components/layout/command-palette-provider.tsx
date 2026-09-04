"use client";

import * as React from "react";

type CommandPaletteContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CommandPaletteContext =
  React.createContext<CommandPaletteContextValue | null>(null);

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isTypingTarget =
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA"].includes(event.target.tagName);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (event.key === "/" && !isTypingTarget) {
        event.preventDefault();
        setOpen(true);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = React.useMemo(() => ({ open, setOpen }), [open]);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const ctx = React.useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error(
      "useCommandPalette deve ser usado dentro de <CommandPaletteProvider>",
    );
  }
  return ctx;
}
