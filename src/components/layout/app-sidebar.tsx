"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { primaryNav, secondaryNav } from "@/config/navigation";
import { cn } from "@/lib/utils";

function NavLink({
  href,
  title,
  icon: Icon,
  active,
}: {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{title}</span>
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-svh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-14 items-center px-4">
        <Link href="/app/inbox">
          <Logo />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4">
        <div className="flex flex-col gap-0.5">
          {primaryNav.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </div>

        <div className="flex flex-col gap-0.5">
          <p className="px-2.5 pb-1 text-xs font-medium text-sidebar-foreground/50">
            Productivity
          </p>
          {secondaryNav.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <NavLink
          href="/app/settings"
          title="Settings"
          icon={Settings}
          active={pathname.startsWith("/app/settings")}
        />
      </div>
    </aside>
  );
}
