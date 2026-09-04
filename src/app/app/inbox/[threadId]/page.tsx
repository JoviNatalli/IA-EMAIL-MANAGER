import { Inbox } from "lucide-react";

import { MailShell } from "@/components/mail/mail-shell";

export default async function InboxThreadPage({
  params,
}: PageProps<"/app/inbox/[threadId]">) {
  const { threadId } = await params;
  return (
    <MailShell
      scope={{ type: "folder", folder: "inbox" }}
      basePath="/app/inbox"
      title="Inbox"
      threadId={threadId}
      emptyIcon={Inbox}
      emptyTitle="Sem emails novos."
      emptyDescription="A tua inbox está limpa por agora."
    />
  );
}
