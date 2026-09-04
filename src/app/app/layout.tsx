import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { CommandPaletteProvider } from "@/components/layout/command-palette-provider";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  // O `proxy.ts` já faz a checagem otimista; esta é a checagem real,
  // por trás da qual os Server Components/Actions desta árvore confiam
  // (spec §18/§30 — nunca autorizar só pelo proxy).
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <CommandPaletteProvider>
      <div className="flex h-svh overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar user={session.user} />
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      <CommandPalette />
    </CommandPaletteProvider>
  );
}
