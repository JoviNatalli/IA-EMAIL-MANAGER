"use client";

import {
  Archive,
  Bot,
  CheckSquare,
  FileEdit,
  Inbox,
  PenSquare,
  Search,
  Send,
  Settings,
  Sparkles,
  Star,
  Tag,
  Trash2,
  TriangleAlert,
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
import { useCompose } from "@/components/mail/compose-provider";

/**
 * ⌘K (spec §40). Navegação + ações do shell de email (Fase 2). Ações
 * dependentes de IA (perguntar sobre a mensagem atual, resumir, etc.)
 * entram na Fase 4.
 */
export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const { open: openCompose } = useCompose();
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
        <CommandGroup heading="Ações">
          <CommandItem
            onSelect={() => {
              setOpen(false);
              openCompose();
            }}
          >
            <PenSquare />
            Novo email
            <CommandShortcut>C</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/app/search")}>
            <Search />
            Pesquisar emails
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navegar">
          <CommandItem onSelect={() => go("/app/inbox")}>
            <Inbox />
            Inbox
            <CommandShortcut>G I</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/app/important")}>
            <TriangleAlert />
            Important
          </CommandItem>
          <CommandItem onSelect={() => go("/app/starred")}>
            <Star />
            Starred
          </CommandItem>
          <CommandItem onSelect={() => go("/app/sent")}>
            <Send />
            Sent
          </CommandItem>
          <CommandItem onSelect={() => go("/app/drafts")}>
            <FileEdit />
            Drafts
          </CommandItem>
          <CommandItem onSelect={() => go("/app/archive")}>
            <Archive />
            Archive
          </CommandItem>
          <CommandItem onSelect={() => go("/app/trash")}>
            <Trash2 />
            Trash
          </CommandItem>
          <CommandItem onSelect={() => go("/app/labels")}>
            <Tag />
            Labels
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
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Definições">
          <CommandItem onSelect={() => go("/app/settings")}>
            <Settings />
            Definições
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
