import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { CommandPaletteProvider } from "@/components/layout/command-palette-provider";
import { ComposeDialog } from "@/components/mail/compose-dialog";
import { ComposeProvider } from "@/components/mail/compose-provider";
import { TimeZoneSync } from "@/components/layout/timezone-sync";
import { getUserTimeZone } from "@/lib/users/preferences";
import { getFolderCounts } from "@/lib/emails/queries";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  // O `proxy.ts` já faz a checagem otimista; esta é a checagem real,
  // por trás da qual os Server Components/Actions desta árvore confiam
  // (spec §18/§30 — nunca autorizar só pelo proxy).
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [folderCounts, storedTimeZone] = await Promise.all([
    getFolderCounts(session.user.id),
    getUserTimeZone(session.user.id),
  ]);

  return (
    <ComposeProvider>
      <TimeZoneSync storedTimeZone={storedTimeZone} />
      <CommandPaletteProvider>
        <div className="flex h-svh overflow-hidden bg-background">
          <AppSidebar counts={folderCounts} />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppTopbar user={session.user} />
            <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
        <CommandPalette />
      </CommandPaletteProvider>
      <ComposeDialog />
    </ComposeProvider>
  );
}
