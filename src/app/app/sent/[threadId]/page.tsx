import { Send } from "lucide-react";

import { MailShell } from "@/components/mail/mail-shell";

export default async function SentThreadPage({
  params,
}: PageProps<"/app/sent/[threadId]">) {
  const { threadId } = await params;
  return (
    <MailShell
      scope={{ type: "folder", folder: "sent" }}
      basePath="/app/sent"
      title="Sent"
      threadId={threadId}
      emptyIcon={Send}
      emptyTitle="Ainda não enviaste nada."
      emptyDescription="Os emails que enviares aparecem aqui."
    />
  );
}
