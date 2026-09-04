"use client";

import { Bell, Search } from "lucide-react";

import { useCommandPalette } from "@/components/layout/command-palette-provider";
import { NavUserMenu } from "@/components/layout/nav-user-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AppTopbar({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
  const { setOpen } = useCommandPalette();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/50"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Pesquisar emails, tarefas...</span>
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" disabled>
              <Bell className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notificações — Fase 2</TooltipContent>
        </Tooltip>
        <ThemeToggle />
        <NavUserMenu name={user.name} email={user.email} image={user.image} />
      </div>
    </header>
  );
}
