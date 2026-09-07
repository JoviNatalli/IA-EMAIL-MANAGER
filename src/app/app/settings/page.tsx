import { redirect } from "next/navigation";
import { and, count, eq, isNotNull } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { accounts, calendarEvents, gmailSync, threads } from "@/lib/db/schema";
import { CALENDAR_PROVIDER } from "@/lib/google/tokens";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { CalendarConnectionCard } from "@/components/settings/calendar-connection";
import { GmailConnectionCard } from "@/components/settings/gmail-connection";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

/**
 * Atalhos reais (spec §36) — implementados em `shortcuts-provider.tsx` e no
 * `command-palette-provider.tsx`. Esta lista era uma promessa até à Fase 7;
 * agora descreve o que existe mesmo, incluindo o âmbito de cada um (os de
 * conversa só funcionam com uma conversa aberta).
 */
const shortcuts: { keys: string; label: string; scope?: string }[] = [
  { keys: "⌘ K", label: "Command palette" },
  { keys: "/", label: "Pesquisar" },
  { keys: "C", label: "Escrever email" },
  { keys: "G depois I", label: "Ir para o Inbox" },
  { keys: "R", label: "Responder", scope: "conversa aberta" },
  { keys: "A / E", label: "Arquivar", scope: "conversa aberta" },
  { keys: "S", label: "Estrela", scope: "conversa aberta" },
];

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { name, email } = session.user;
  const userId = session.user.id;

  const [googleAccount] = await db
    .select({ providerAccountId: accounts.providerAccountId })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")));

  const [syncState] = await db.select().from(gmailSync).where(eq(gmailSync.userId, userId));

  const [{ gmailThreadCount }] = await db
    .select({ gmailThreadCount: count() })
    .from(threads)
    .where(and(eq(threads.userId, userId), eq(threads.source, "gmail")));

  const [calendarAccount] = await db
    .select({ providerAccountId: accounts.providerAccountId })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, CALENDAR_PROVIDER)));

  const [{ eventCount }] = await db
    .select({ eventCount: count() })
    .from(calendarEvents)
    .where(eq(calendarEvents.userId, userId));

  const [{ syncedEventCount }] = await db
    .select({ syncedEventCount: count() })
    .from(calendarEvents)
    .where(and(eq(calendarEvents.userId, userId), isNotNull(calendarEvents.googleEventId)));

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-lg font-semibold text-foreground">Definições</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Conta, IA, notificações e aparência.
      </p>

      <Tabs defaultValue="account" className="mt-8">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
          <TabsTrigger value="account">Conta</TabsTrigger>
          <TabsTrigger value="connected">Contas</TabsTrigger>
          <TabsTrigger value="ai">IA</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
          <TabsTrigger value="shortcuts">Atalhos</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback className="text-base">
                {(name ?? email ?? "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{name}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="settings-name">Nome</Label>
              <Input id="settings-name" defaultValue={name ?? ""} className="mt-1.5" disabled />
            </div>
            <div>
              <Label htmlFor="settings-email">Email</Label>
              <Input id="settings-email" defaultValue={email ?? ""} className="mt-1.5" disabled />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Edição de perfil chega numa fase de polish — os dados acima vêm
            diretamente da sessão autenticada.
          </p>
        </TabsContent>

        <TabsContent value="connected" className="mt-6 flex flex-col gap-4">
          <GmailConnectionCard
            connected={!!googleAccount}
            email={googleAccount ? email ?? null : null}
            syncStatus={syncState?.status ?? null}
            lastSyncedAt={syncState?.lastSyncedAt ?? null}
            lastError={syncState?.lastError ?? null}
            threadCount={gmailThreadCount}
          />
          <CalendarConnectionCard
            connected={!!calendarAccount}
            eventCount={eventCount}
            syncedEventCount={syncedEventCount}
          />
        </TabsContent>

        <TabsContent value="ai" className="mt-6 flex flex-col gap-4">
          <SettingsPlaceholderRow
            title="Nível de assistência da IA"
            description="Minimal / Balanced / Proactive — definido no onboarding, editável aqui a partir da Fase 4."
          />
          <SettingsPlaceholderRow
            title="Process emails with AI"
            description="Controla se o conteúdo dos emails é enviado ao provider de IA (spec §32)."
          />
          <SettingsPlaceholderRow
            title="Store AI conversations"
            description="Guardar o histórico do AI Assistant para melhorar sugestões futuras."
          />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <SettingsPlaceholderRow
            title="Notificações"
            description="Urgent emails, meeting detectado, draft pronto, sync concluído (spec §43) — chega com os dados reais da Fase 2+."
          />
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <AppearanceSection />
        </TabsContent>

        <TabsContent value="shortcuts" className="mt-6">
          <div className="divide-y divide-border rounded-lg border border-border">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.keys}
                className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
              >
                <span className="min-w-0 text-muted-foreground">
                  {shortcut.label}
                  {shortcut.scope && (
                    <span className="ml-1.5 text-xs text-muted-foreground/80">
                      · {shortcut.scope}
                    </span>
                  )}
                </span>
                <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Os atalhos nunca disparam enquanto escreve num campo de texto.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingsPlaceholderRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
