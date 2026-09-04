import { Archive } from "lucide-react";

import { MailShell } from "@/components/mail/mail-shell";

export default async function ArchiveThreadPage({
  params,
}: PageProps<"/app/archive/[threadId]">) {
  const { threadId } = await params;
  return (
    <MailShell
      scope={{ type: "folder", folder: "archive" }}
      basePath="/app/archive"
      title="Archive"
      threadId={threadId}
      emptyIcon={Archive}
      emptyTitle="Sem emails arquivados."
      emptyDescription="Arquiva um email para o tirares da inbox sem o apagar."
    />
  );
}
