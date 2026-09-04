import { redirect } from "next/navigation";
import { Mail } from "lucide-react";

import { auth } from "@/auth";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const shortcuts: [string, string][] = [
  ["C", "Compose email"],
  ["R", "Reply"],
  ["A / E", "Archive"],
  ["S", "Star"],
  ["/", "Search / Command palette"],
  ["G depois I", "Ir para Inbox"],
  ["⌘ K", "Command palette"],
];

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { name, email } = session.user;

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

        <TabsContent value="connected" className="mt-6">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                <Mail className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Gmail</p>
                <p className="text-xs text-muted-foreground">
                  Integração OAuth real — Fase 3
                </p>
              </div>
            </div>
            <Badge variant="outline">Não ligado</Badge>
          </div>
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
            {shortcuts.map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span className="text-muted-foreground">{label}</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                  {key}
                </kbd>
              </div>
            ))}
          </div>
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
