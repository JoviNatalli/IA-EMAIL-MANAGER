import { Trash2 } from "lucide-react";

import { MailShell } from "@/components/mail/mail-shell";

export default async function TrashThreadPage({
  params,
}: PageProps<"/app/trash/[threadId]">) {
  const { threadId } = await params;
  return (
    <MailShell
      scope={{ type: "folder", folder: "trash" }}
      basePath="/app/trash"
      title="Trash"
      threadId={threadId}
      emptyIcon={Trash2}
      emptyTitle="O lixo está vazio."
      emptyDescription="Emails movidos para o lixo aparecem aqui antes de serem apagados definitivamente."
    />
  );
}
