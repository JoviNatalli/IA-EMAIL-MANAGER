import { Star } from "lucide-react";

import { MailShell } from "@/components/mail/mail-shell";

export default async function StarredThreadPage({
  params,
}: PageProps<"/app/starred/[threadId]">) {
  const { threadId } = await params;
  return (
    <MailShell
      scope={{ type: "starred" }}
      basePath="/app/starred"
      title="Starred"
      threadId={threadId}
      emptyIcon={Star}
      emptyTitle="Sem emails com estrela."
      emptyDescription="Marca um email com estrela para o encontrares rapidamente aqui."
    />
  );
}
