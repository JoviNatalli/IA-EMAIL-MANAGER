import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { listLabels } from "@/lib/emails/queries";
import { LabelsManager } from "@/components/mail/labels-manager";

export default async function LabelsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const labels = await listLabels(session.user.id);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <LabelsManager labels={labels} />
    </div>
  );
}
