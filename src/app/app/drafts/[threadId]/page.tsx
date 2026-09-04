import { FileEdit } from "lucide-react";

import { MailShell } from "@/components/mail/mail-shell";

export default async function DraftsThreadPage({
  params,
}: PageProps<"/app/drafts/[threadId]">) {
  const { threadId } = await params;
  return (
    <MailShell
      scope={{ type: "folder", folder: "drafts" }}
      basePath="/app/drafts"
      title="Drafts"
      threadId={threadId}
      emptyIcon={FileEdit}
      emptyTitle="Sem rascunhos."
      emptyDescription="Emails que comeces a escrever ficam guardados aqui automaticamente."
    />
  );
}
