import { redirect } from "next/navigation";
import { Tag } from "lucide-react";

import { auth } from "@/auth";
import { getLabel } from "@/lib/emails/queries";
import { MailShell } from "@/components/mail/mail-shell";

export default async function LabelThreadsPage({
  params,
}: PageProps<"/app/labels/[labelId]">) {
  const { labelId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const label = await getLabel(session.user.id, labelId);
  if (!label) redirect("/app/labels");

  return (
    <MailShell
      scope={{ type: "label", labelId }}
      basePath={`/app/labels/${labelId}`}
      title={label.name}
      emptyIcon={Tag}
      emptyTitle="Sem conversas com esta label."
      emptyDescription="Aplica esta label a um email para o veres aqui."
    />
  );
}
