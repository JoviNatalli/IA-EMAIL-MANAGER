import { TriangleAlert } from "lucide-react";

import { MailShell } from "@/components/mail/mail-shell";

export default async function ImportantThreadPage({
  params,
}: PageProps<"/app/important/[threadId]">) {
  const { threadId } = await params;
  return (
    <MailShell
      scope={{ type: "important" }}
      basePath="/app/important"
      title="Important"
      threadId={threadId}
      emptyIcon={TriangleAlert}
      emptyTitle="Nada marcado como importante."
      emptyDescription="Emails de prioridade alta na tua inbox aparecem aqui."
    />
  );
}
