"use client";

import {
  Archive,
  Bot,
  CheckSquare,
  Inbox,
  PenSquare,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useCommandPalette } from "@/components/layout/command-palette-provider";

/**
 * ⌘K (spec §40). Fase 1: navegação + ações que já existem no shell. Ações
 * dependentes de dados de email (archive selected, mark as read, ask AI
 * sobre a mensagem atual) entram nas Fases 2 e 4.
 */
export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Pesquisar ou executar um comando..." />
      <CommandList>
        <CommandEmpty>Sem resultados.</CommandEmpty>
        <CommandGroup heading="Navegar">
          <CommandItem onSelect={() => go("/app/inbox")}>
            <Inbox />
            Inbox
            <CommandShortcut>G I</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/app/archive")}>
            <Archive />
            Archive
          </CommandItem>
          <CommandItem onSelect={() => go("/app/tasks")}>
            <CheckSquare />
            Tasks
          </CommandItem>
          <CommandItem onSelect={() => go("/app/ai")}>
            <Bot />
            AI Assistant
          </CommandItem>
          <CommandItem onSelect={() => go("/app/briefing")}>
            <Sparkles />
            Daily Briefing
          </CommandItem>
          <CommandItem onSelect={() => go("/app/search")}>
            <Search />
            Search
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Ações">
          <CommandItem disabled>
            <PenSquare />
            Compose email
            <CommandShortcut>C · Fase 2</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/app/settings")}>
            <Settings />
            Definições
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
