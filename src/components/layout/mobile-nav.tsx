"use client";

/**
 * Navegação da app em ecrã pequeno (Fase 7, spec §37).
 *
 * Até aqui a `AppSidebar` era `hidden ... md:flex` — abaixo de 768px a app
 * ficava literalmente sem forma de mudar de pasta. Isto não é a sidebar
 * encolhida: é uma hierarquia diferente, como o §37 pede.
 *
 * Duas superfícies, com papéis distintos:
 *  - uma barra inferior fixa com os cinco destinos que se usam a toda a
 *    hora (Inbox, Tarefas, Calendário, Copiloto, e o "Mais"), ao alcance do
 *    polegar;
 *  - um drawer para o resto (pastas menos usadas, labels, briefing,
 *    definições), que seria ruído permanente numa barra de cinco lugares.
 *
 * Alvos de toque de 44px (o mínimo das WCAG 2.5.5 / HIG), não os 32px que
 * chegam ao rato.
 */
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Calendar, CheckSquare, Inbox, Menu, Settings, Sparkles } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { primaryNav, secondaryNav, type NavItem } from "@/config/navigation";
import type { FolderCounts } from "@/lib/emails/queries";
import { cn } from "@/lib/utils";

/** Os quatro destinos fixos da barra inferior; o quinto lugar é o "Mais". */
const BOTTOM_NAV: { title: string; href: string; icon: NavItem["icon"]; countKey?: NavItem["countKey"] }[] = [
  { title: "Inbox", href: "/app/inbox", icon: Inbox, countKey: "inbox" },
  { title: "Tarefas", href: "/app/tasks", icon: CheckSquare },
  { title: "Agenda", href: "/app/calendar", icon: Calendar },
  { title: "Copiloto", href: "/app/ai", icon: Sparkles },
];

export function MobileNav({ counts }: { counts: FolderCounts }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  // O drawer fecha-se sozinho ao navegar: cada link vai dentro de um
  // `DrawerClose asChild` (ver `DrawerLink`). Não é preciso — nem correto —
  // sincronizar isso com um efeito sobre o pathname.
  const inDrawerRoute = ![...BOTTOM_NAV].some((item) => pathname.startsWith(item.href));

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm md:hidden"
      // Respeita a home indicator do iOS — sem isto o último item fica por
      // baixo da barra do sistema e não se consegue tocar.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch">
        {BOTTOM_NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const count = item.countKey ? counts[item.countKey] : undefined;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="relative">
                  <item.icon className="size-5" />
                  {!!count && (
                    <span className="absolute -top-1.5 -right-2 min-w-4 rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground tabular-nums">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </span>
                {item.title}
                {active && (
                  // `layoutId` faz o indicador deslizar entre separadores em
                  // vez de piscar — desligado com reduced motion.
                  <motion.span
                    layoutId={reduced ? undefined : "mobile-nav-indicator"}
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
              </Link>
            </li>
          );
        })}

        <li className="flex-1">
          <Drawer direction="right">
            <DrawerTrigger asChild>
              <button
                type="button"
                className={cn(
                  "relative flex min-h-11 w-full cursor-pointer flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors",
                  inDrawerRoute ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Menu className="size-5" />
                Mais
              </button>
            </DrawerTrigger>

            <DrawerContent className="w-[85%] max-w-xs">
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
                  <Logo />
                </div>
                {/* O Vaul exige título e descrição para o diálogo ter nome
                    acessível; aqui só interessam ao leitor de ecrã. */}
                <DrawerTitle className="sr-only">Navegação</DrawerTitle>
                <DrawerDescription className="sr-only">
                  Pastas de email, produtividade e definições.
                </DrawerDescription>

                <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
                  <DrawerSection items={primaryNav} counts={counts} pathname={pathname} />
                  <DrawerSection
                    label="Produtividade"
                    items={secondaryNav}
                    counts={counts}
                    pathname={pathname}
                  />
                </div>

                <div className="shrink-0 border-t border-border p-3">
                  <DrawerLink
                    href="/app/settings"
                    title="Definições"
                    icon={Settings}
                    active={pathname.startsWith("/app/settings")}
                  />
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </li>
      </ul>
    </nav>
  );
}

function DrawerSection({
  label,
  items,
  counts,
  pathname,
}: {
  label?: string;
  items: NavItem[];
  counts: FolderCounts;
  pathname: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">{label}</p>
      )}
      {items.map((item) => (
        <DrawerLink
          key={item.href}
          href={item.href}
          title={item.title}
          icon={item.icon}
          count={item.countKey ? counts[item.countKey] : undefined}
          active={pathname.startsWith(item.href)}
        />
      ))}
    </div>
  );
}

function DrawerLink({
  href,
  title,
  icon: Icon,
  count,
  active,
}: {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  active: boolean;
}) {
  return (
    <DrawerClose asChild>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          // `min-h-11` = 44px, o alvo de toque mínimo (WCAG 2.5.5).
          "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
          active
            ? "bg-accent text-accent-foreground"
            : "text-foreground/80 hover:bg-accent/60 hover:text-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {!!count && (
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums">
            {count}
          </span>
        )}
      </Link>
    </DrawerClose>
  );
}
